import { AppError } from "../platform/http/app-error.js";

// Private IPv4 ranges (RFC 1918 & link-local / loopback / metadata)
function isPrivateOrLoopbackIp(ip: string): boolean {
  // Check loopback & unspecified
  if (
    ip === "127.0.0.1" ||
    ip === "0.0.0.0" ||
    ip === "::1" ||
    ip === "0:0:0:0:0:0:0:1" ||
    ip === "::"
  ) {
    return true;
  }

  // Check IPv4 segments
  const parts = ip.split(".").map((n) => parseInt(n, 10));
  if (parts.length === 4 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
    const [a, b] = parts;

    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;

    // 10.0.0.0/8 (Private)
    if (a === 10) return true;

    // 172.16.0.0/12 (Private)
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.168.0.0/16 (Private)
    if (a === 192 && b === 168) return true;

    // 169.254.0.0/16 (Link-local / AWS / GCP / Azure metadata: 169.254.169.254)
    if (a === 169 && b === 254) return true;

    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;
  }

  // Check IPv6 private / link-local / unique-local
  const lower = ip.toLowerCase();
  if (
    lower.startsWith("fe80:") ||
    lower.startsWith("fc00:") ||
    lower.startsWith("fd00:")
  ) {
    return true;
  }

  return false;
}

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "local",
  "loopback",
  "metadata.google.internal",
  "instance-data",
  "metadata",
]);

/**
 * Validates whether an external target URL is safe from SSRF attacks.
 */
export function isSafeUrl(urlStr: string): { safe: boolean; reason?: string } {
  if (!urlStr || typeof urlStr !== "string") {
    return { safe: false, reason: "URL must be a non-empty string" };
  }

  // Allow override for local development / test mock suites if explicitly opted-in
  if (process.env.ALLOW_LOCAL_WEBHOOKS === "true") {
    try {
      const parsed = new URL(urlStr);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return { safe: false, reason: `Invalid protocol: ${parsed.protocol}. Only http: and https: are permitted.` };
      }
      return { safe: true };
    } catch {
      return { safe: false, reason: "Malformed URL" };
    }
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return { safe: false, reason: "Malformed URL" };
  }

  // Check protocol
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      safe: false,
      reason: `Unsupported protocol: ${parsed.protocol}. Only HTTP and HTTPS are permitted.`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Strip brackets from IPv6 hostnames like [::1]
  const cleanHostname = hostname.replace(/^\[|\]$/g, "");

  // Check against known blocked hostnames
  if (BLOCKED_HOSTNAMES.has(cleanHostname)) {
    return { safe: false, reason: `Access to blocked host "${cleanHostname}" is forbidden.` };
  }

  // Check if domain ends with .internal, .local, or .localdomain
  if (
    cleanHostname.endsWith(".internal") ||
    cleanHostname.endsWith(".local") ||
    cleanHostname.endsWith(".localdomain")
  ) {
    return { safe: false, reason: `Access to internal domain "${cleanHostname}" is forbidden.` };
  }

  // Check if IP is loopback or private subnet
  if (isPrivateOrLoopbackIp(cleanHostname)) {
    return {
      safe: false,
      reason: `Target address "${cleanHostname}" resolves to a private or loopback subnet.`,
    };
  }

  return { safe: true };
}

/**
 * Asserts that a URL is safe; throws an AppError (400) if unsafe.
 */
export function validateSafeUrl(urlStr: string, fieldName = "URL"): void {
  const check = isSafeUrl(urlStr);
  if (!check.safe) {
    throw new AppError(
      `${fieldName} failed security validation: ${check.reason}`,
      400,
      "SSRF_VALIDATION_FAILED"
    );
  }
}
