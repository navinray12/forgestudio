/**
 * Phase 19: Enterprise Multisite — Custom Domain Management Service
 *
 * Provides validation, verification challenge generation, and status
 * tracking for custom domains attached to ForgeStudio websites.
 *
 * Additive only — stored in Website.editorData.customDomains[].
 */
import { createHash } from "crypto";


export type DomainVerificationMethod = "TXT" | "CNAME" | "FILE";
export type DomainStatus = "pending" | "verifying" | "active" | "failed" | "expired";

export interface CustomDomain {
  /** The domain itself, e.g. "shop.example.com" */
  domain: string;
  /** Current verification status */
  status: DomainStatus;
  /** Verification method chosen by user */
  verificationMethod: DomainVerificationMethod;
  /** The token/value the user must add to DNS or host as a file */
  verificationToken: string;
  /** For CNAME method: the target they should point to */
  cnamTarget?: string;
  /** ISO timestamp of when verification was last attempted */
  lastCheckedAt?: string;
  /** ISO timestamp of when the domain was first added */
  addedAt: string;
  /** ISO timestamp of when the domain became active */
  verifiedAt?: string;
  /** Whether HTTPS/SSL is being provisioned */
  sslEnabled: boolean;
  /** Whether this is the primary domain for the site */
  isPrimary: boolean;
}

// ---------------------------------------------------------------------------
// Domain Validation
// ---------------------------------------------------------------------------

const DOMAIN_REGEX = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63})*\.[A-Za-z]{2,}$/;
const BLOCKED_TLDS = ["localhost", "test", "invalid", "local", "example"];

/**
 * Validates a custom domain string.
 * Returns the normalised (lowercase, trimmed) domain or throws an Error.
 */
export function validateDomain(raw: string): string {
  if (!raw || typeof raw !== "string") {
    throw new Error("Domain is required");
  }
  const domain = raw.trim().toLowerCase().replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  if (!DOMAIN_REGEX.test(domain)) {
    throw new Error(`Invalid domain format: "${domain}"`);
  }
  const tld = domain.split(".").pop()!;
  if (BLOCKED_TLDS.includes(tld)) {
    throw new Error(`Domain TLD ".${tld}" is not allowed`);
  }
  if (domain.length > 253) {
    throw new Error("Domain name exceeds 253 character limit");
  }
  return domain;
}

// ---------------------------------------------------------------------------
// Verification Token Generation
// ---------------------------------------------------------------------------

/**
 * Generates a deterministic verification token for a domain + websiteId pair.
 * Uses crypto to produce a URL-safe base64 token.
 */
export function generateVerificationToken(domain: string, websiteId: string): string {
  const raw = `${domain}:${websiteId}:forgestudio-verify`;
  return createHash("sha256").update(raw).digest("base64url").slice(0, 40);
}

// ---------------------------------------------------------------------------
// Domain Record Factory
// ---------------------------------------------------------------------------

/**
 * Creates a new CustomDomain record ready for insertion.
 */
export function createDomainRecord(
  domain: string,
  websiteId: string,
  method: DomainVerificationMethod = "TXT",
  isPrimary = false
): CustomDomain {
  const token = generateVerificationToken(domain, websiteId);
  return {
    domain,
    status: "pending",
    verificationMethod: method,
    verificationToken: token,
    cnamTarget: method === "CNAME" ? `verify.forgestudio.app` : undefined,
    addedAt: new Date().toISOString(),
    sslEnabled: false,
    isPrimary,
  };
}

// ---------------------------------------------------------------------------
// Verification Status Machine
// ---------------------------------------------------------------------------

const VALID_STATUS_TRANSITIONS: Record<DomainStatus, DomainStatus[]> = {
  pending: ["verifying", "failed"],
  verifying: ["active", "failed"],
  active: ["expired", "failed"],
  failed: ["pending"],
  expired: ["pending"],
};

export function isValidDomainStatusTransition(from: DomainStatus, to: DomainStatus): boolean {
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Simulates a DNS lookup verification check.
 * In production this would perform real DNS queries; here it runs
 * a lightweight heuristic based on the token being well-formed.
 */
export function simulateVerificationCheck(record: CustomDomain): {
  success: boolean;
  reason?: string;
} {
  // The token must be present and at least 32 chars (healthy sha256 slice)
  if (!record.verificationToken || record.verificationToken.length < 32) {
    return { success: false, reason: "Verification token is malformed" };
  }

  // Expired domains cannot be re-verified without going through pending first
  if (record.status === "expired") {
    return { success: false, reason: "Domain record is expired; re-add the domain to verify again" };
  }

  // In test/dev mode we treat the presence of a valid token as success
  return { success: true };
}

// ---------------------------------------------------------------------------
// Domain List Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the primary active domain from a list, or undefined.
 */
export function getPrimaryDomain(domains: CustomDomain[]): CustomDomain | undefined {
  return domains.find((d) => d.isPrimary && d.status === "active");
}

/**
 * Ensures only one domain can be marked as primary.
 */
export function setOnePrimary(domains: CustomDomain[], targetDomain: string): CustomDomain[] {
  return domains.map((d) => ({ ...d, isPrimary: d.domain === targetDomain }));
}
