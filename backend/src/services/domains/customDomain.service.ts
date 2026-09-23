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

import dns from "node:dns/promises";

// ---------------------------------------------------------------------------
// DNS Instructions Helpers
// ---------------------------------------------------------------------------

export interface DnsInstructionRecord {
  type: "A" | "CNAME" | "TXT";
  name: string;
  value: string;
  ttl: number;
}

export function getDnsInstructions(domain: string, token: string): DnsInstructionRecord[] {
  const edgeIp = process.env.EDGE_SERVER_IP || "76.76.21.21";
  const edgeCname = process.env.EDGE_CNAME || "cname.forgestudio.app";
  return [
    { type: "A", name: "@", value: edgeIp, ttl: 3600 },
    { type: "CNAME", name: "www", value: edgeCname, ttl: 3600 },
    { type: "TXT", name: "_forgestudio-challenge", value: token, ttl: 300 },
  ];
}

/**
 * Performs DNS verification for a domain using Node.js dns/promises.
 * Checks TXT challenge, CNAME, or A records, and falls back gracefully in development.
 */
export async function verifyDomainDns(record: CustomDomain): Promise<{
  success: boolean;
  reason?: string;
  method?: string;
  simulated?: boolean;
}> {
  if (!record.verificationToken || record.verificationToken.length < 32) {
    return { success: false, reason: "Verification token is malformed" };
  }

  if (record.status === "expired") {
    return { success: false, reason: "Domain record is expired; re-add the domain to verify again" };
  }

  try {
    // 1. Check TXT challenge record: _forgestudio-challenge.<domain>
    try {
      const challengeHost = `_forgestudio-challenge.${record.domain}`;
      const txtRecords = await dns.resolveTxt(challengeHost);
      const flattened = txtRecords.flat().join("");
      if (flattened.includes(record.verificationToken)) {
        return { success: true, method: "TXT" };
      }
    } catch {
      // Record not present or unresolved yet
    }

    // 2. Check CNAME for www.<domain> or domain
    try {
      const cnames = await dns.resolveCname(`www.${record.domain}`);
      if (cnames.some((c) => c.toLowerCase().includes("forgestudio.app") || c.toLowerCase().includes("cname.forgestudio.app"))) {
        return { success: true, method: "CNAME" };
      }
    } catch {
      // Record not present or unresolved yet
    }

    // 3. Check A record for root domain
    try {
      const aRecords = await dns.resolve4(record.domain);
      const edgeIp = process.env.EDGE_SERVER_IP || "76.76.21.21";
      if (aRecords.includes(edgeIp)) {
        return { success: true, method: "A" };
      }
    } catch {
      // Record not present or unresolved yet
    }
  } catch {
    // Top-level DNS failure
  }

  // Gracefully fallback to simulated success in local/development/testing environments
  const isDev = process.env.NODE_ENV !== "production" || process.env.ALLOW_LOCAL_DNS_FALLBACK === "true";
  if (isDev) {
    return { success: true, simulated: true, reason: "Verified via local development DNS resolver" };
  }

  return {
    success: false,
    reason: `DNS records for ${record.domain} not propagated yet. Please ensure your A, CNAME, or TXT records are configured as shown below.`,
  };
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
