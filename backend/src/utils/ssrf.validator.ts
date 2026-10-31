import { AppError } from "./app-error.js";
import dns from "node:dns/promises";
import dnsCallback from "node:dns";
import net from "node:net";
import http from "node:http";
import https from "node:https";

// =============================================================================
// Comprehensive IP Ranges & Subnet Validation (RFC 1918, 3927, 6598, 5771, 1112)
// =============================================================================

/**
 * Checks if a canonical IPv4 address is in private, loopback, link-local,
 * shared, multicast, broadcast, or reserved subnets.
 */
function isRestrictedIpv4(ip: string): boolean {
  const parts = ip.split(".").map((n) => parseInt(n, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IPv4 is treated as restricted
  }

  const [a, b, c] = parts;

  // 0.0.0.0/8 (Current network / default route)
  if (a === 0) return true;

  // 10.0.0.0/8 (Private RFC 1918)
  if (a === 10) return true;

  // 100.64.0.0/10 (Shared address space / Carrier-grade NAT RFC 6598)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 100.100.100.200 (Alibaba Cloud ECS metadata endpoint)
  if (a === 100 && b === 100 && c === 100) return true;

  // 127.0.0.0/8 (Loopback RFC 1122)
  if (a === 127) return true;

  // 169.254.0.0/16 (Link-local / Cloud metadata: AWS, Azure, GCP, DO, Oracle RFC 3927)
  if (a === 169 && b === 254) return true;

  // 172.16.0.0/12 (Private RFC 1918)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments RFC 6890)
  if (a === 192 && b === 0 && c === 0) return true;

  // 192.0.2.0/24 (TEST-NET-1 documentation RFC 5737)
  if (a === 192 && b === 0 && c === 2) return true;

  // 192.168.0.0/16 (Private RFC 1918)
  if (a === 192 && b === 168) return true;

  // 198.18.0.0/15 (Benchmarking RFC 2544)
  if (a === 198 && (b === 18 || b === 19)) return true;

  // 198.51.100.0/24 (TEST-NET-2 documentation RFC 5737)
  if (a === 198 && b === 51 && c === 100) return true;

  // 203.0.113.0/24 (TEST-NET-3 documentation RFC 5737)
  if (a === 203 && b === 0 && c === 113) return true;

  // 224.0.0.0/4 (Multicast RFC 5771)
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 (Reserved RFC 1112)
  if (a >= 240) return true;

  // 255.255.255.255 (Limited Broadcast)
  if (a === 255 && b === 255 && c === 255 && parts[3] === 255) return true;

  return false;
}

/**
 * Expands and parses an IPv6 address into 16 individual byte values (0-255).
 * Returns null if the address is not a valid IPv6 string.
 */
function parseIpv6Bytes(ipStr: string): number[] | null {
  // Strip optional scope/zone id e.g. fe80::1%eth0 or %251
  const clean = ipStr.toLowerCase().replace(/%.*$/, "").replace(/^\[|\]$/g, "");

  // Check for IPv4-mapped IPv6 e.g. ::ffff:192.0.2.128
  const lastColon = clean.lastIndexOf(":");
  let ipv4Tail: number[] | null = null;
  let baseStr = clean;

  if (lastColon !== -1) {
    const candidateV4 = clean.slice(lastColon + 1);
    if (candidateV4.includes(".")) {
      const v4Parts = candidateV4.split(".").map((n) => parseInt(n, 10));
      if (v4Parts.length === 4 && v4Parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
        ipv4Tail = v4Parts;
        baseStr = clean.slice(0, lastColon);
      }
    }
  }

  // Split on "::"
  const doubleColonParts = baseStr.split("::");
  if (doubleColonParts.length > 2) return null; // Invalid IPv6

  let leftSegments: string[] = [];
  let rightSegments: string[] = [];

  if (doubleColonParts[0]) {
    leftSegments = doubleColonParts[0].split(":").filter(Boolean);
  }
  if (doubleColonParts.length === 2 && doubleColonParts[1]) {
    rightSegments = doubleColonParts[1].split(":").filter(Boolean);
  }

  const expectedWords = 8 - (ipv4Tail ? 2 : 0);
  const totalWords = leftSegments.length + rightSegments.length;

  if (doubleColonParts.length === 1 && totalWords !== expectedWords) {
    return null;
  }
  if (doubleColonParts.length === 2 && totalWords > expectedWords) {
    return null;
  }

  const missingZeros = expectedWords - totalWords;
  const words: number[] = [];

  for (const s of leftSegments) {
    const val = parseInt(s, 16);
    if (isNaN(val) || val < 0 || val > 0xffff) return null;
    words.push(val);
  }

  for (let i = 0; i < missingZeros; i++) {
    words.push(0);
  }

  for (const s of rightSegments) {
    const val = parseInt(s, 16);
    if (isNaN(val) || val < 0 || val > 0xffff) return null;
    words.push(val);
  }

  if (ipv4Tail) {
    words.push((ipv4Tail[0] << 8) | ipv4Tail[1]);
    words.push((ipv4Tail[2] << 8) | ipv4Tail[3]);
  }

  if (words.length !== 8) return null;

  const bytes: number[] = [];
  for (const w of words) {
    bytes.push((w >> 8) & 0xff);
    bytes.push(w & 0xff);
  }

  return bytes;
}

/**
 * Checks if an IPv6 address belongs to private, loopback, link-local,
 * multicast, documentation, or cloud metadata subnets.
 */
function isRestrictedIpv6(ip: string): boolean {
  const bytes = parseIpv6Bytes(ip);
  if (!bytes) {
    // Fallback syntactic checks for common patterns
    const lower = ip.toLowerCase().replace(/^\[|\]$/g, "");
    if (lower === "::1" || lower === "::" || lower.startsWith("fe80:") || lower.startsWith("fc00:") || lower.startsWith("fd00:")) {
      return true;
    }
    return false;
  }

  // ::/128 (Unspecified)
  const isAllZero = bytes.every((b) => b === 0);
  if (isAllZero) return true;

  // ::1/128 (Loopback)
  const isLoopback = bytes.slice(0, 15).every((b) => b === 0) && bytes[15] === 1;
  if (isLoopback) return true;

  // IPv4-mapped IPv6 (::ffff:0:0/96, bytes 0..9 are 0, bytes 10..11 are 0xff)
  const isV4Mapped =
    bytes.slice(0, 10).every((b) => b === 0) &&
    bytes[10] === 0xff &&
    bytes[11] === 0xff;
  if (isV4Mapped) {
    const mappedIpv4 = `${bytes[12]}.${bytes[13]}.${bytes[14]}.${bytes[15]}`;
    return isRestrictedIpv4(mappedIpv4);
  }

  // IPv4-compatible IPv6 (::0:0/96, deprecated RFC 4291)
  const isV4Compatible =
    bytes.slice(0, 12).every((b) => b === 0) &&
    !isLoopback &&
    !isAllZero;
  if (isV4Compatible) {
    const compatIpv4 = `${bytes[12]}.${bytes[13]}.${bytes[14]}.${bytes[15]}`;
    return isRestrictedIpv4(compatIpv4);
  }

  // 64:ff9b::/96 (IPv4/IPv6 translation well-known prefix RFC 6052)
  if (
    bytes[0] === 0x00 &&
    bytes[1] === 0x64 &&
    bytes[2] === 0xff &&
    bytes[3] === 0x9b &&
    bytes.slice(4, 12).every((b) => b === 0)
  ) {
    const nat64Ipv4 = `${bytes[12]}.${bytes[13]}.${bytes[14]}.${bytes[15]}`;
    return isRestrictedIpv4(nat64Ipv4);
  }

  // fe80::/10 (Link-local unicast RFC 4291: 1111 1110 10xx xxxx)
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) {
    return true;
  }

  // fc00::/7 (Unique local address RFC 4193: 1111 110x xxxx xxxx -> fc00::/8 and fd00::/8)
  if ((bytes[0] & 0xfe) === 0xfc) {
    return true;
  }

  // ff00::/8 (Multicast RFC 4291)
  if (bytes[0] === 0xff) {
    return true;
  }

  // 2001:db8::/32 (Documentation RFC 3849)
  if (bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] === 0x0d && bytes[3] === 0xb8) {
    return true;
  }

  // 2001::/32 (Teredo tunneling encapsulating private IPv4)
  if (bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] === 0x00 && bytes[3] === 0x00) {
    return true;
  }

  // 2002::/16 (6to4 tunneling: 2002:V4::)
  if (bytes[0] === 20 && bytes[1] === 0x02) {
    const v4 = `${bytes[2]}.${bytes[3]}.${bytes[4]}.${bytes[5]}`;
    if (isRestrictedIpv4(v4)) return true;
  }

  // fd00:ec2::254 (AWS IMDSv2 IPv6 metadata)
  const isAwsIpv6Metadata =
    bytes[0] === 0xfd &&
    bytes[1] === 0x00 &&
    bytes[2] === 0x0e &&
    bytes[3] === 0xc2 &&
    bytes.slice(4, 14).every((b) => b === 0) &&
    bytes[14] === 0x02 &&
    bytes[15] === 0x54;
  if (isAwsIpv6Metadata) return true;

  return false;
}

/**
 * Universal IP restriction check. Handles both IPv4 and IPv6 strings.
 */
export function isPrivateOrLoopbackIp(ip: string): boolean {
  if (!ip || typeof ip !== "string") return false;
  const clean = ip.trim().toLowerCase().replace(/^\[|\]$/g, "");

  const version = net.isIP(clean);
  if (version === 4) {
    return isRestrictedIpv4(clean);
  }
  if (version === 6) {
    return isRestrictedIpv6(clean);
  }

  // In case of non-standard formats (e.g., dotted IPv4 parts or IPv4-mapped hex)
  if (clean.includes(".")) {
    const parts = clean.split(".");
    if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
      return isRestrictedIpv4(clean);
    }
  }

  if (clean.includes(":")) {
    return isRestrictedIpv6(clean);
  }

  return false;
}

// Blocked hostnames, domains, and cloud metadata identifiers
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "local",
  "loopback",
  "ip6-localhost",
  "ip6-loopback",
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
  "metadata",
  "169.254.169.254",
  "100.100.100.200",
  "kubernetes.default",
  "kubernetes.default.svc",
]);

const BLOCKED_DOMAIN_SUFFIXES = [
  ".internal",
  ".local",
  ".localdomain",
  ".localhost",
  ".lan",
  ".home",
  ".corp",
  ".cluster.local",
  ".svc.cluster.local",
];

// =============================================================================
// URL Validation Functions (Sync & Async)
// =============================================================================

/**
 * Syntactically validates whether a URL string is safe from SSRF attacks without DNS lookup.
 * Protects against invalid schemes, localhost, blocked hostnames, and known private IP notations.
 */
export function isSafeUrl(urlStr: string): { safe: boolean; reason?: string } {
  if (!urlStr || typeof urlStr !== "string") {
    return { safe: false, reason: "URL must be a non-empty string" };
  }

  const trimmed = urlStr.trim();
  if (!trimmed) {
    return { safe: false, reason: "URL must be a non-empty string" };
  }

  // Allow override for local development / test mock suites if explicitly opted-in
  if (process.env.ALLOW_LOCAL_WEBHOOKS === "true") {
    try {
      const parsed = new URL(trimmed);
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
    parsed = new URL(trimmed);
  } catch {
    return { safe: false, reason: "Malformed URL" };
  }

  // Check protocol: only http: and https: allowed
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      safe: false,
      reason: `Unsupported protocol: ${parsed.protocol}. Only HTTP and HTTPS are permitted.`,
    };
  }

  // Disallow user credentials embedded in URL (e.g. http://user:pass@evil.com)
  if (parsed.username || parsed.password) {
    return {
      safe: false,
      reason: "URLs with embedded user credentials are not permitted.",
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname) {
    return { safe: false, reason: "URL hostname cannot be empty." };
  }

  // Strip brackets from IPv6 hostnames like [::1]
  const cleanHostname = hostname.replace(/^\[|\]$/g, "");

  // Check against known blocked hostnames
  if (BLOCKED_HOSTNAMES.has(cleanHostname)) {
    return { safe: false, reason: `Access to blocked host "${cleanHostname}" is forbidden.` };
  }

  // Check against blocked domain suffixes
  for (const suffix of BLOCKED_DOMAIN_SUFFIXES) {
    if (cleanHostname.endsWith(suffix)) {
      return { safe: false, reason: `Access to internal domain "${cleanHostname}" is forbidden.` };
    }
  }

  // Single-label hostnames without dots or colons are internal or unqualified
  if (!cleanHostname.includes(".") && !cleanHostname.includes(":")) {
    return { safe: false, reason: `Target host "${cleanHostname}" is an internal or unqualified host name.` };
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
 * Asynchronously validates URL with hostname DNS resolution to defend against
 * DNS rebinding and private domains resolving to restricted internal subnets.
 */
export async function isSafeUrlAsync(
  urlStr: string,
  options?: { resolveDns?: boolean }
): Promise<{ safe: boolean; reason?: string }> {
  // 1. Run synchronous syntax & IP checks first
  const syncCheck = isSafeUrl(urlStr);
  if (!syncCheck.safe) {
    return syncCheck;
  }

  if (process.env.ALLOW_LOCAL_WEBHOOKS === "true") {
    return { safe: true };
  }

  if (options?.resolveDns === false) {
    return { safe: true };
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr.trim());
  } catch {
    return { safe: false, reason: "Malformed URL" };
  }

  const cleanHostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  // If already an IP address, synchronous check is sufficient
  if (net.isIP(cleanHostname)) {
    return { safe: true };
  }

  // 2. Perform DNS lookup for all A and AAAA records
  try {
    const addresses = await dns.lookup(cleanHostname, { all: true, verbatim: true });
    if (!addresses || addresses.length === 0) {
      return { safe: false, reason: `Hostname "${cleanHostname}" could not be resolved.` };
    }

    for (const record of addresses) {
      if (isPrivateOrLoopbackIp(record.address)) {
        return {
          safe: false,
          reason: `Hostname "${cleanHostname}" resolves to restricted IP "${record.address}".`,
        };
      }
    }
  } catch (err: any) {
    return {
      safe: false,
      reason: `DNS resolution failed for "${cleanHostname}": ${err?.message || "Lookup error"}`,
    };
  }

  return { safe: true };
}

/**
 * Asserts that a URL is safe synchronously; throws AppError (400) if unsafe.
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

/**
 * Asserts that a URL is safe asynchronously (including DNS resolution); throws AppError (400) if unsafe.
 */
export async function validateSafeUrlAsync(
  urlStr: string,
  fieldName = "URL",
  options?: { resolveDns?: boolean }
): Promise<void> {
  const check = await isSafeUrlAsync(urlStr, options);
  if (!check.safe) {
    throw new AppError(
      `${fieldName} failed security validation: ${check.reason}`,
      400,
      "SSRF_VALIDATION_FAILED"
    );
  }
}

/**
 * Synchronous assertion matching ssrf.guard format.
 */
export function assertSafeUrl(url: string, context = "Target URL"): void {
  if (!url || typeof url !== "string") {
    throw new AppError(`${context} must be a valid, non-empty URL string.`, 400, "SSRF_BLOCKED");
  }

  const check = isSafeUrl(url);
  if (!check.safe) {
    throw new AppError(
      `${context} blocked by SSRF security policy: ${check.reason || "Destination IP or hostname is restricted."}`,
      400,
      "SSRF_BLOCKED"
    );
  }
}

/**
 * Asynchronous assertion matching ssrf.guard format with DNS resolution.
 */
export async function assertSafeUrlAsync(url: string, context = "Target URL"): Promise<void> {
  if (!url || typeof url !== "string") {
    throw new AppError(`${context} must be a valid, non-empty URL string.`, 400, "SSRF_BLOCKED");
  }

  const check = await isSafeUrlAsync(url);
  if (!check.safe) {
    throw new AppError(
      `${context} blocked by SSRF security policy: ${check.reason || "Destination IP or hostname is restricted."}`,
      400,
      "SSRF_BLOCKED"
    );
  }
}

// =============================================================================
// Webhook URL Validation
// =============================================================================

/**
 * Validates webhook endpoint URL format.
 * - Rejects email addresses (e.g. raja@gmail.com) and malformed strings.
 * - Accepts only valid absolute https:// URLs (and http:// only if explicitly permitted by security policy).
 */
export function validateWebhookUrl(urlStr: string): { valid: boolean; reason?: string } {
  if (!urlStr || typeof urlStr !== "string") {
    return { valid: false, reason: "Webhook URL is required" };
  }

  const trimmed = urlStr.trim();
  if (!trimmed) {
    return { valid: false, reason: "Webhook URL is required" };
  }

  // Reject email addresses or strings lacking protocol scheme
  if (trimmed.includes("@") && !trimmed.includes("://")) {
    return { valid: false, reason: "Enter a valid webhook URL starting with https://" };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, reason: "Enter a valid webhook URL starting with https://" };
  }

  if (!parsed.hostname || parsed.hostname.trim() === "") {
    return { valid: false, reason: "Enter a valid webhook URL starting with https://" };
  }

  const isHttpPermitted =
    process.env.ALLOW_LOCAL_WEBHOOKS === "true" ||
    process.env.ALLOW_HTTP_WEBHOOKS === "true" ||
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "test";

  if (parsed.protocol === "https:") {
    return { valid: true };
  }

  if (parsed.protocol === "http:") {
    if (isHttpPermitted) {
      return { valid: true };
    }
    return { valid: false, reason: "Enter a valid webhook URL starting with https://" };
  }

  return { valid: false, reason: "Enter a valid webhook URL starting with https://" };
}

/**
 * Asserts that a webhook endpoint URL has valid format.
 * Throws AppError(400, "INVALID_WEBHOOK_URL") if invalid.
 */
export function assertValidWebhookUrl(urlStr: string): void {
  const check = validateWebhookUrl(urlStr);
  if (!check.valid) {
    throw new AppError(
      check.reason || "Enter a valid webhook URL starting with https://",
      400,
      "INVALID_WEBHOOK_URL"
    );
  }
}

// =============================================================================
// Safe HTTP Fetch Client with Redirect Validation
// =============================================================================

export interface SafeFetchOptions extends RequestInit {
  maxRedirects?: number;
  timeoutMs?: number;
  resolveDns?: boolean;
}

/**
 * Low-level transport that pins socket resolution to validated IPs,
 * completely preventing DNS rebinding / TOCTOU attacks at connection time.
 */
function executeSafeRequest(
  targetUrl: string,
  init: SafeFetchOptions,
  signal: AbortSignal
): Promise<Response> {
  return new Promise((resolve, reject) => {
    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return reject(new AppError("Invalid target URL", 400, "SSRF_VALIDATION_FAILED"));
    }

    const transport = parsed.protocol === "https:" ? https : http;
    const reqHeaders: Record<string, string> = {};

    if (init.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((val, key) => {
          reqHeaders[key] = val;
        });
      } else if (Array.isArray(init.headers)) {
        for (const [key, val] of init.headers) {
          reqHeaders[key] = val;
        }
      } else {
        Object.assign(reqHeaders, init.headers);
      }
    }

    const cleanHostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    const isDirectIp = net.isIP(cleanHostname) !== 0;

    const reqOpts: http.RequestOptions = {
      method: init.method || "GET",
      headers: reqHeaders,
      lookup: (hostname: string, opts: any, cb: (err: any, address?: any, family?: any) => void) => {
        // Direct IPs do not require DNS lookup
        if (isDirectIp) {
          if (isPrivateOrLoopbackIp(cleanHostname) && process.env.ALLOW_LOCAL_WEBHOOKS !== "true") {
            return cb(new AppError(`Access to restricted IP address "${cleanHostname}" is blocked.`, 400, "SSRF_VALIDATION_FAILED"));
          }
          const family = net.isIP(cleanHostname);
          if (opts && opts.all) {
            return cb(null, [{ address: cleanHostname, family }]);
          }
          return cb(null, cleanHostname, family);
        }

        // Hostname resolution: resolve and inspect every IP at connection time
        dnsCallback.lookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
          if (err) return cb(err);
          if (!addresses || addresses.length === 0) {
            return cb(new AppError(`DNS lookup returned no records for "${hostname}".`, 400, "SSRF_VALIDATION_FAILED"));
          }

          if (process.env.ALLOW_LOCAL_WEBHOOKS !== "true") {
            for (const record of addresses) {
              if (isPrivateOrLoopbackIp(record.address)) {
                return cb(
                  new AppError(
                    `SSRF Defense: Hostname "${hostname}" resolves to restricted IP "${record.address}".`,
                    400,
                    "SSRF_VALIDATION_FAILED"
                  )
                );
              }
            }
          }

          if (opts && opts.all) {
            cb(null, addresses);
          } else {
            cb(null, addresses[0].address, addresses[0].family);
          }
        });
      },
    };

    let settled = false;
    const req = transport.request(parsed, reqOpts, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        if (settled) return;
        settled = true;

        const resHeaders = new Headers();
        for (const [k, v] of Object.entries(res.headers)) {
          if (Array.isArray(v)) {
            v.forEach((item) => resHeaders.append(k, item));
          } else if (v !== undefined) {
            resHeaders.set(k, v);
          }
        }

        const bodyBuf = Buffer.concat(chunks);
        const webRes = new Response(bodyBuf, {
          status: res.statusCode || 200,
          statusText: res.statusMessage,
          headers: resHeaders,
        });

        resolve(webRes);
      });

      res.on("error", (err) => {
        if (!settled) {
          settled = true;
          reject(err);
        }
      });
    });

    const onAbort = () => {
      req.destroy();
      if (!settled) {
        settled = true;
        reject(new AppError("Request aborted or timed out", 400, "REQUEST_ABORTED"));
      }
    };

    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });

    req.on("error", (err: any) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });

    if (init.body) {
      if (typeof init.body === "string" || Buffer.isBuffer(init.body)) {
        req.write(init.body);
      } else if (typeof (init.body as any).text === "function") {
        (init.body as any).text().then((str: string) => {
          req.write(str);
          req.end();
        }).catch(reject);
        return;
      }
    }

    req.end();
  });
}

/**
 * Performs a server-side HTTP request that is guaranteed safe from SSRF attacks,
 * including DNS rebinding protection and strict validation of all redirect hops.
 */
export async function safeFetch(
  input: string | URL,
  init?: SafeFetchOptions
): Promise<Response> {
  const initialUrlStr = typeof input === "string" ? input : input.toString();
  const maxRedirects = init?.maxRedirects ?? 5;
  const timeoutMs = init?.timeoutMs ?? 10000;
  const redirectMode = init?.redirect ?? "follow";

  let currentUrl = initialUrlStr;
  let hops = 0;
  const visitedUrls = new Set<string>();

  while (hops <= maxRedirects) {
    // 1. Enforce SSRF validation on the target URL (initial or redirected)
    await validateSafeUrlAsync(currentUrl, "Target URL", { resolveDns: init?.resolveDns });
    visitedUrls.add(currentUrl);

    // 2. Prepare request options with manual redirect handling and timeout
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    const mergedSignal = init?.signal
      ? anySignal([init.signal, controller.signal])
      : controller.signal;

    try {
      const fetchOpts: SafeFetchOptions = {
        ...init,
        redirect: "manual",
        signal: mergedSignal,
      };

      const response = await executeSafeRequest(currentUrl, fetchOpts, mergedSignal);
      clearTimeout(timeoutHandle);

      // If manual redirect requested or not a redirect status, return immediately
      if (redirectMode === "manual" || response.status < 300 || response.status >= 400) {
        return response;
      }

      // If redirect: "error" was requested, fail on redirect
      if (redirectMode === "error") {
        throw new AppError(
          `Redirect encountered when redirect mode was 'error' (HTTP ${response.status})`,
          400,
          "SSRF_REDIRECT_ERROR"
        );
      }

      // 3. Handle redirect safely
      hops++;
      if (hops > maxRedirects) {
        throw new AppError(
          `Maximum redirect limit (${maxRedirects}) exceeded`,
          400,
          "SSRF_TOO_MANY_REDIRECTS"
        );
      }

      const locationHeader = response.headers.get("location");
      if (!locationHeader) {
        return response;
      }

      const nextUrl = new URL(locationHeader, currentUrl).toString();

      // Loop detection
      if (visitedUrls.has(nextUrl)) {
        throw new AppError("Redirect loop detected", 400, "SSRF_REDIRECT_LOOP");
      }

      currentUrl = nextUrl;
      // Loop continues with new URL validated at step 1 and socket lookup at step 2
    } catch (err: any) {
      clearTimeout(timeoutHandle);
      if (err instanceof AppError) throw err;
      throw new AppError(
        `Failed to execute safe HTTP request: ${err?.message || "Network error"}`,
        400,
        "FETCH_FAILED"
      );
    }
  }

  throw new AppError("Maximum redirect hops exceeded", 400, "SSRF_TOO_MANY_REDIRECTS");
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const sig of signals) {
    if (sig.aborted) {
      controller.abort();
      return controller.signal;
    }
    sig.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}
