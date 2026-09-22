import { AppError } from "./app-error.js";
import { isSafeUrl, validateSafeUrl } from "./ssrf.validator.js";

/**
 * F-439: SSRF Guard
 * Rejects loopback (127.0.0.1, ::1), RFC1918 private subnets (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16),
 * link-local (169.254.0.0/16), and cloud metadata (169.254.169.254, metadata.google.internal).
 *
 * Throws AppError(400, 'SSRF_BLOCKED') if unsafe.
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

export { isSafeUrl, validateSafeUrl };
