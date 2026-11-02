/**
 * ForgeStudio Trusted Public URL Construction & Origin Validation
 * Strictly enforces trusted origin rules, avoids untrusted Host headers,
 * and distinguishes internal public routes from external destinations.
 */

/**
 * Resolves the trusted public origin for public website links.
 * Strictly avoids untrusted request Host headers and avoids localhost in production.
 * In production, strictly requires HTTPS.
 */
export function getTrustedPublicOrigin(): string | null {
  const envOrigin =
    process.env.PUBLIC_ORIGIN ||
    process.env.PUBLIC_WEBSITE_URL ||
    process.env.FRONTEND_URL;

  if (!envOrigin || typeof envOrigin !== "string" || !envOrigin.trim()) {
    if (process.env.NODE_ENV === "production") {
      return null; // Do not fabricate a domain in production
    }
    return "http://localhost:5173"; // Local development fallback
  }

  const trimmed = envOrigin.trim().replace(/\/+$/, "");
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    const isLocal =
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "::1" ||
      parsed.hostname.endsWith(".local");

    if (process.env.NODE_ENV === "production" && isLocal) {
      return null; // Disallow localhost in production
    }

    if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
      return null; // Production public links strictly require HTTPS
    }

    return parsed.origin;
  } catch {
    return null;
  }
}

/**
 * Constructs the trusted absolute public URL for a verified published website.
 *
 * Rules:
 * - INTERNAL: Combines trusted public origin with /site/:websiteId.
 * - WORDPRESS: Uses the remote WordPress post URL if valid HTTP/HTTPS.
 * - SFTP: Returns null (SFTP is a file-transfer protocol, not an HTTP public website).
 * - STATIC: Returns null (static export is a downloadable ZIP, not an anonymously hosted website).
 */
export function constructAbsolutePublicUrl(
  destinationType: string,
  destinationRef: string,
  websiteId: string,
  _slug?: string
): string | null {
  const normType = String(destinationType || "").toUpperCase();

  if (normType === "INTERNAL") {
    const origin = getTrustedPublicOrigin();
    if (!origin) return null;
    return `${origin}/site/${websiteId}`;
  }

  if (normType === "WORDPRESS") {
    if (
      destinationRef &&
      typeof destinationRef === "string" &&
      (destinationRef.startsWith("http://") || destinationRef.startsWith("https://"))
    ) {
      try {
        const parsed = new URL(destinationRef);
        return parsed.href;
      } catch {
        return null;
      }
    }
    return null;
  }

  // SFTP and STATIC do not have an anonymous public HTTP website URL
  return null;
}
