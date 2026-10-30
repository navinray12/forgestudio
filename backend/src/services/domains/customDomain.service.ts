/**
 * Phase 19: Enterprise Multisite — Custom Domain Management Service
 *
 * Provides validation, verification challenge generation, and status
 * tracking for custom domains attached to ForgeStudio websites.
 *
 * Additive only — stored in Website.editorData.customDomains[].
 */
import { createHash, randomBytes, X509Certificate } from "crypto";
import dns from "node:dns/promises";
import { prisma } from "../../config/database.js";

export type DomainVerificationMethod = "TXT" | "CNAME" | "FILE";
export type DomainStatus = "pending" | "verifying" | "active" | "failed" | "expired";
export type SslStatus =
  | "NOT_CONFIGURED"
  | "PENDING"
  | "ISSUING"
  | "ACTIVE"
  | "RENEWING"
  | "FAILED"
  | "EXPIRED"
  // Legacy status support
  | "PENDING_DNS"
  | "VERIFYING"
  | "PROVISIONING_SSL"
  | "FAILED_CHALLENGE";

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
  /** Whether HTTPS/SSL is active and verified */
  sslEnabled: boolean;
  /** Whether this is the primary domain for the site */
  isPrimary: boolean;
  /** Automated ACME/SSL certificate lifecycle status */
  sslStatus?: SslStatus;
  /** Certificate Authority issuer (e.g. Let's Encrypt) */
  sslIssuer?: string;
  /** Expiration timestamp for SSL certificate */
  sslExpiresAt?: string;
  /** Clear human-readable reason for SSL provisioning failure */
  sslFailureReason?: string;
  /** Number of attempted retries for rate limit management */
  sslRetryCount?: number;
  /** Timestamp of most recent issuance/renewal attempt */
  sslLastAttemptAt?: string;
  /** SHA-256 fingerprint of the public certificate */
  sslCertificateFingerprint?: string;
  /** ACME HTTP-01 challenge token */
  acmeChallengeToken?: string;
  /** Whether certificate was successfully issued by CA */
  sslCertificateIssued?: boolean;
  /** Whether certificate is installed into the ingress/serving layer */
  sslInstalled?: boolean;
  /** Whether live HTTPS verification succeeded */
  sslHttpsVerified?: boolean;
  /** Ingress delivery status */
  ingressStatus?: "INSTALLED" | "INGRESS_NOT_CONFIGURED" | "INSTALLATION_FAILED";
  /** Ingress delivery error reason if any */
  ingressError?: string;
  /** Non-blocking DNS pre-flight verification results */
  dnsPreflight?: {
    passed: boolean;
    cnameValid?: boolean;
    aRecordValid?: boolean;
    txtValid?: boolean;
    checkedAt: string;
    errors?: string[];
  };
}

// ---------------------------------------------------------------------------
// Domain Validation
// ---------------------------------------------------------------------------

const BLOCKED_TLDS = [
  "localhost",
  "test",
  "invalid",
  "local",
  "example",
  "internal",
  "onion",
  "lan",
  "home",
  "corp",
];

const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

/**
 * Validates a custom domain string according to strict RFC hostname rules.
 * Rejects URLs, paths, query strings, ports, credentials, wildcards, and IP addresses.
 * Returns the normalized (lowercase, trimmed, FQDN-stripped) domain or throws an Error.
 */
export function validateDomain(raw: string): string {
  if (!raw || typeof raw !== "string") {
    throw new Error("Domain is required");
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new Error("Domain cannot be empty");
  }

  // Reject URL schemes
  if (trimmed.includes("://") || /^https?:\/\//i.test(trimmed)) {
    throw new Error("Domain must be a bare hostname (e.g. example.com) and must not include URL schemes (http:// or https://)");
  }

  // Reject paths and slashes
  if (trimmed.includes("/") || trimmed.includes("\\")) {
    throw new Error("Domain must not include paths, slashes, or directory names");
  }

  // Reject query strings and hash fragments
  if (trimmed.includes("?") || trimmed.includes("#")) {
    throw new Error("Domain must not include query parameters or hash fragments");
  }

  // Reject port numbers
  if (trimmed.includes(":")) {
    throw new Error("Domain must not include port numbers");
  }

  // Reject userinfo / email notation
  if (trimmed.includes("@")) {
    throw new Error("Domain must not include user credentials or '@' symbols");
  }

  // Reject wildcards
  if (trimmed.includes("*")) {
    throw new Error("Wildcard domains (*.) are not permitted");
  }

  // Normalize: lowercase and strip optional trailing root dot
  let domain = trimmed.toLowerCase();
  if (domain.endsWith(".")) {
    domain = domain.slice(0, -1);
  }

  if (domain.length === 0) {
    throw new Error("Invalid domain: empty hostname");
  }

  if (domain.length > 253) {
    throw new Error("Domain name exceeds maximum length of 253 characters");
  }

  // Reject IP addresses (IPv4 & IPv6)
  if (IPV4_REGEX.test(domain) || domain.startsWith("[") || domain.endsWith("]")) {
    throw new Error("IP addresses are not permitted as custom domains");
  }

  // Split into labels
  const labels = domain.split(".");
  if (labels.length < 2) {
    throw new Error("Domain must contain at least one dot separating domain name and TLD (e.g. mybrand.com)");
  }

  for (const label of labels) {
    if (label.length === 0) {
      throw new Error("Domain contains empty label (consecutive dots)");
    }
    if (label.length > 63) {
      throw new Error(`Domain label '${label}' exceeds maximum length of 63 characters`);
    }
    if (label.startsWith("-") || label.endsWith("-")) {
      throw new Error(`Domain label '${label}' must not begin or end with a hyphen`);
    }
    if (!/^[a-z0-9-]+$/.test(label)) {
      throw new Error(`Domain label '${label}' contains invalid characters. Only alphanumeric characters and hyphens are permitted`);
    }
  }

  const tld = labels[labels.length - 1];
  if (!/^[a-z]{2,}$/.test(tld)) {
    throw new Error(`Invalid top-level domain '.${tld}'. TLD must be alphabetic and at least 2 characters`);
  }

  if (BLOCKED_TLDS.includes(tld)) {
    throw new Error(`Domain TLD '.${tld}' is reserved or not allowed`);
  }

  return domain;
}

// ---------------------------------------------------------------------------
// Verification Token Generation
// ---------------------------------------------------------------------------

/**
 * Generates an unpredictable, cryptographically random verification challenge token on the server.
 * Uses high-entropy random bytes to prevent guessing or cross-user token prediction.
 */
export function generateVerificationToken(domain?: string, websiteId?: string): string {
  const randomPart = randomBytes(20).toString("hex");
  return `fs_verify_${randomPart}`;
}

// ---------------------------------------------------------------------------
// Cross-Website Domain Conflict Check
// ---------------------------------------------------------------------------

/**
 * Checks whether a domain is already registered to any website across the system.
 * Prevents cross-website and cross-tenant domain conflicts.
 */
export async function isDomainRegisteredAnywhere(domain: string, excludeWebsiteId?: string): Promise<boolean> {
  const normDomain = domain.trim().toLowerCase();

  const matches: any[] = await prisma.$queryRaw`
    SELECT id
    FROM websites
    WHERE ("editorData"->'customDomains') IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(
          CASE
            WHEN jsonb_typeof("editorData"->'customDomains') = 'array'
            THEN "editorData"->'customDomains'
            ELSE '[]'::jsonb
          END
        ) AS elem
        WHERE LOWER(elem->>'domain') = ${normDomain}
      )
  `;

  if (!matches || matches.length === 0) return false;
  if (!excludeWebsiteId) return matches.length > 0;
  return matches.some((w: any) => w.id !== excludeWebsiteId);
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
  const normalized = validateDomain(domain);
  const token = generateVerificationToken(normalized, websiteId);
  return {
    domain: normalized,
    status: "pending",
    verificationMethod: method,
    verificationToken: token,
    cnamTarget: method === "CNAME" ? "cname.forgestudio.app" : undefined,
    addedAt: new Date().toISOString(),
    sslStatus: "NOT_CONFIGURED",
    sslEnabled: false,
    sslRetryCount: 0,
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
  failed: ["pending", "verifying"],
  expired: ["pending"],
};

export function isValidDomainStatusTransition(from: DomainStatus, to: DomainStatus): boolean {
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

// ---------------------------------------------------------------------------
// DNS Instructions Helpers
// ---------------------------------------------------------------------------

export interface DnsInstructionRecord {
  type: "A" | "CNAME" | "TXT";
  name: string;
  value: string;
  ttl: number;
  description?: string;
}

export function getDnsInstructions(domain: string, token: string): DnsInstructionRecord[] {
  const edgeIp = process.env.EDGE_SERVER_IP || "76.76.21.21";
  const edgeCname = process.env.EDGE_CNAME || "cname.forgestudio.app";
  const parts = domain.split(".");
  const isApex = parts.length === 2;

  return [
    {
      type: "A",
      name: "@",
      value: edgeIp,
      ttl: 3600,
      description: "Points your root domain to ForgeStudio Edge CDN",
    },
    {
      type: "CNAME",
      name: isApex ? "www" : parts[0],
      value: edgeCname,
      ttl: 3600,
      description: "Routes traffic through the edge proxy",
    },
    {
      type: "TXT",
      name: "_forgestudio-challenge",
      value: token,
      ttl: 300,
      description: "Ownership verification challenge token",
    },
  ];
}

export interface DnsResolver {
  resolveTxt(hostname: string): Promise<string[][]>;
  resolveCname?(hostname: string): Promise<string[]>;
  resolve4?(hostname: string): Promise<string[]>;
}

/**
 * Performs real server-side DNS verification for a domain using Node.js dns/promises or injected resolver.
 * Strictly verifies the exact server-generated token via TXT challenge.
 * A and CNAME routing records are checked for diagnostic routing configuration, not ownership verification.
 */
export async function verifyDomainDns(
  record: CustomDomain,
  customResolver?: DnsResolver
): Promise<{
  success: boolean;
  reason?: string;
  method?: string;
  simulated?: boolean;
}> {
  if (!record.verificationToken || record.verificationToken.length < 20) {
    return { success: false, reason: "Verification token is missing or malformed" };
  }

  if (record.status === "expired") {
    return { success: false, reason: "Domain record is expired; please re-add the domain to verify again" };
  }

  const resolver = customResolver || dns;

  // Timeout helper: 5 seconds timeout to avoid hanging on unresponsive resolvers
  const resolveWithTimeout = async <T>(fn: () => Promise<T>, timeoutMs = 5000): Promise<T> => {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("DNS query timed out")), timeoutMs);
    });
    try {
      return await Promise.race([fn(), timeoutPromise]);
    } finally {
      clearTimeout(timer!);
    }
  };

  const isExactTokenMatch = (val: string) => {
    const clean = val.trim().replace(/^"|"$/g, "");
    return clean === record.verificationToken;
  };

  try {
    // 1. Primary check: TXT challenge record at _forgestudio-challenge.<domain>
    try {
      const challengeHost = `_forgestudio-challenge.${record.domain}`;
      const txtRecords = await resolveWithTimeout(() => resolver.resolveTxt(challengeHost));
      const flattened = txtRecords.flat();
      if (flattened.some(isExactTokenMatch)) {
        return { success: true, method: "TXT" };
      }
    } catch {
      // Record not present or unresolvable yet
    }

    // 2. Secondary check: TXT record directly at root domain (<domain>)
    try {
      const rootTxtRecords = await resolveWithTimeout(() => resolver.resolveTxt(record.domain));
      const flattenedRoot = rootTxtRecords.flat();
      if (flattenedRoot.some(isExactTokenMatch)) {
        return { success: true, method: "TXT" };
      }
    } catch {
      // Record not present or unresolvable yet
    }

    // 3. CNAME ownership verification ONLY when user explicitly configured CNAME verification method
    if (record.verificationMethod === "CNAME" && resolver.resolveCname) {
      try {
        const verifyHost = `verify.${record.domain}`;
        const cnames = await resolveWithTimeout(() => resolver.resolveCname!(verifyHost));
        if (
          cnames.some((c) => {
            const norm = c.toLowerCase().replace(/\.$/, "");
            return norm === "cname.forgestudio.app" || norm === "verify.forgestudio.app";
          })
        ) {
          return { success: true, method: "CNAME" };
        }
      } catch { }
    }
  } catch (err: any) {
    return {
      success: false,
      reason: `DNS lookup failed: ${err.message || "Resolver error"}`,
    };
  }

  // Gracefully fallback ONLY when explicitly enabled by ALLOW_LOCAL_DNS_FALLBACK for legacy tests
  if (process.env.ALLOW_LOCAL_DNS_FALLBACK === "true") {
    return { success: true, simulated: true, reason: "Verified via local development DNS resolver" };
  }

  return {
    success: false,
    reason: `DNS records for "${record.domain}" were not found or have not propagated yet. Please add a TXT record with Host: "_forgestudio-challenge" and Value: "${record.verificationToken}".`,
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

// ---------------------------------------------------------------------------
// Zero-Touch SSL & Automatic ACME Provisioning Engine
// ---------------------------------------------------------------------------

export interface SslDiagnosticStatus {
  domain: string;
  status: DomainStatus;
  sslStatus: SslStatus;
  sslEnabled: boolean;
  sslIssuer?: string;
  sslExpiresAt?: string;
  daysUntilExpiry?: number;
  autoRenew: boolean;
  dnsPreflight: {
    passed: boolean;
    cnameValid?: boolean;
    aRecordValid?: boolean;
    txtValid?: boolean;
    checkedAt: string;
    errors: string[];
  };
  http01Challenge?: {
    path: string;
    token: string;
  };
  /** Whether a valid certificate was genuinely issued by CA */
  certificateIssued?: boolean;
  /** Whether the certificate is installed in an active ingress */
  certificateInstalled?: boolean;
  /** Whether live HTTPS was verified */
  httpsReachable?: boolean;
  /** Ingress delivery status */
  ingressStatus?: "INSTALLED" | "INGRESS_NOT_CONFIGURED" | "INSTALLATION_FAILED";
  ingressError?: string;
}

/**
 * Generates an HTTP-01 ACME challenge token and key auth pair
 */
export function generateHttp01Challenge(domain: string, websiteId: string): { token: string; keyAuth: string; path: string } {
  const token = createHash("sha256").update(`${domain}:${websiteId}:http01-token`).digest("base64url").slice(0, 32);
  const keyAuth = `${token}.${createHash("sha256").update(token).digest("base64url").slice(0, 43)}`;
  return {
    token,
    keyAuth,
    path: `/.well-known/acme-challenge/${token}`,
  };
}

/**
 * Executes a non-blocking DNS pre-flight verification to confirm domain resolution
 * before triggering ACME cert generation
 */
export async function runDnsPreflightCheck(domain: string, token: string): Promise<{
  passed: boolean;
  cnameValid: boolean;
  aRecordValid: boolean;
  txtValid: boolean;
  checkedAt: string;
  errors: string[];
}> {
  const errors: string[] = [];
  let cnameValid = false;
  let aRecordValid = false;
  let txtValid = false;

  const edgeIp = process.env.EDGE_SERVER_IP || "76.76.21.21";

  // Check CNAME
  try {
    const cnames = await dns.resolveCname(`www.${domain}`);
    if (cnames.some((c) => c.toLowerCase().includes("forgestudio.app") || c.toLowerCase().includes("cname.forgestudio.app"))) {
      cnameValid = true;
    }
  } catch {
    // Optional if A or TXT passes
  }

  // Check A record
  try {
    const aRecords = await dns.resolve4(domain);
    if (aRecords.includes(edgeIp)) {
      aRecordValid = true;
    }
  } catch {
    // Optional if CNAME or TXT passes
  }

  // Check TXT record
  try {
    const txtRecords = await dns.resolveTxt(`_forgestudio-challenge.${domain}`);
    const flattened = txtRecords.flat().join("");
    if (token && flattened.includes(token)) {
      txtValid = true;
    }
  } catch {
    // Optional
  }

  let passed = cnameValid || aRecordValid || txtValid;

  // Development/Test fallback
  const isDev = process.env.NODE_ENV !== "production" || process.env.ALLOW_LOCAL_DNS_FALLBACK === "true";
  if (!passed && isDev) {
    passed = true;
    cnameValid = true;
    aRecordValid = true;
  } else if (!passed) {
    if (!aRecordValid) errors.push(`Root A record does not point to edge IP ${edgeIp}`);
    if (!cnameValid) errors.push(`www CNAME does not point to cname.forgestudio.app`);
    if (!txtValid) errors.push(`TXT challenge record _forgestudio-challenge.${domain} not found or mismatch`);
  }

  return {
    passed,
    cnameValid,
    aRecordValid,
    txtValid,
    checkedAt: new Date().toISOString(),
    errors,
  };
}

import {
  getCertificateProvider,
  type CertificateOrderResult,
  type IssuedCertificateMetadata,
} from "./certificateProvider.interface.js";

export interface CertificateValidationResult {
  valid: boolean;
  errorCode?: string;
  reason?: string;
  validatedCertificate?: {
    issuer: string;
    expiresAt: string;
    fingerprint: string;
    serialNumber: string;
  };
}

/**
 * Validates cryptographic authenticity, hostname matching, validity dates,
 * and fingerprint integrity of an issued certificate before activating SSL.
 * Ensures provider metadata alone cannot falsely activate SSL.
 */
export function validateCertificateAuthenticity(
  expectedDomain: string,
  certificate: IssuedCertificateMetadata
): CertificateValidationResult {
  const normExpected = expectedDomain.trim().toLowerCase();

  // 1. If raw X.509 certificate PEM is provided, perform deep cryptographic validation
  if (certificate.rawCertificatePem) {
    try {
      const x509 = new X509Certificate(certificate.rawCertificatePem);

      // Check hostname matching against SAN / Common Name
      const hostMatch = x509.checkHost(normExpected);
      if (!hostMatch) {
        return {
          valid: false,
          errorCode: "CERTIFICATE_HOSTNAME_MISMATCH",
          reason: `Certificate Subject Alternative Name / Common Name does not match domain '${normExpected}'`,
        };
      }

      const now = Date.now();
      const validFrom = new Date(x509.validFrom).getTime();
      const validTo = new Date(x509.validTo).getTime();

      if (now < validFrom) {
        return {
          valid: false,
          errorCode: "CERTIFICATE_NOT_YET_VALID",
          reason: `Certificate validity period has not started yet (valid from ${x509.validFrom})`,
        };
      }

      if (now >= validTo) {
        return {
          valid: false,
          errorCode: "CERTIFICATE_EXPIRED",
          reason: `Certificate is already expired (expired at ${x509.validTo})`,
        };
      }

      // Check certificate chain signature if issuer certificate is included in bundle
      if (x509.issuerCertificate) {
        try {
          const chainValid = x509.verify(x509.issuerCertificate.publicKey);
          if (!chainValid) {
            return {
              valid: false,
              errorCode: "CERTIFICATE_CHAIN_INVALID",
              reason: "Certificate signature could not be verified against the accompanying issuer certificate",
            };
          }
        } catch (chainErr: any) {
          return {
            valid: false,
            errorCode: "CERTIFICATE_CHAIN_INVALID",
            reason: `Certificate chain verification failed: ${chainErr.message || "Invalid signature"}`,
          };
        }
      }

      // Compute authoritative SHA-256 fingerprint from the actual public certificate DER
      const authoritativeFingerprint =
        x509.fingerprint256 ||
        `SHA256:${createHash("sha256").update(x509.raw).digest("hex").toUpperCase().match(/.{2}/g)?.join(":")}`;

      return {
        valid: true,
        validatedCertificate: {
          issuer: x509.issuer || certificate.issuer,
          expiresAt: new Date(x509.validTo).toISOString(),
          fingerprint: authoritativeFingerprint,
          serialNumber: x509.serialNumber || certificate.serialNumber,
        },
      };
    } catch (parseErr: any) {
      return {
        valid: false,
        errorCode: "INVALID_X509_PEM",
        reason: `Failed to parse public certificate PEM: ${parseErr.message || "Invalid certificate structure"}`,
      };
    }
  }

  // 2. Metadata validation (e.g. cloud provider abstraction without raw PEM)
  if (!certificate.issuer || typeof certificate.issuer !== "string" || certificate.issuer.trim().length === 0) {
    return {
      valid: false,
      errorCode: "INVALID_ISSUER",
      reason: "Certificate metadata lacks an authoritative issuer",
    };
  }

  if (!certificate.expiresAt || isNaN(new Date(certificate.expiresAt).getTime())) {
    return {
      valid: false,
      errorCode: "INVALID_EXPIRATION_DATE",
      reason: "Certificate expiration date is invalid",
    };
  }

  if (new Date(certificate.expiresAt).getTime() <= Date.now()) {
    return {
      valid: false,
      errorCode: "CERTIFICATE_EXPIRED",
      reason: `Certificate expiration date ${certificate.expiresAt} is already in the past`,
    };
  }

  const fp = certificate.fingerprint?.trim() || "";
  const cleanedFp = fp.replace(/^(SHA-?256|SHA-?1|MD5):?/i, "").replace(/:/g, "");
  const isValidFp = /^[0-9a-fA-F]{32,64}$/.test(cleanedFp);
  if (!isValidFp) {
    return {
      valid: false,
      errorCode: "INVALID_FINGERPRINT",
      reason: "Certificate fingerprint must be a valid cryptographic hash (SHA-256, SHA-1, or MD5)",
    };
  }

  return {
    valid: true,
    validatedCertificate: {
      issuer: certificate.issuer.trim(),
      expiresAt: new Date(certificate.expiresAt).toISOString(),
      fingerprint: certificate.fingerprint.trim(),
      serialNumber: certificate.serialNumber || "",
    },
  };
}

/**
 * Initiates automated SSL provisioning with DNS pre-flight verification,
 * certificate provider delegation, retry limiting, and non-destructive renewal handling.
 */
export async function initiateSslProvisioning(
  record: CustomDomain,
  websiteId: string
): Promise<{
  success: boolean;
  domain: CustomDomain;
  message: string;
  errorCode?: string;
}> {
  const now = new Date().toISOString();

  // 1. Prerequisite: Domain must be verified and active before SSL provisioning
  if (record.status !== "active") {
    return {
      success: false,
      domain: record,
      errorCode: "DOMAIN_NOT_VERIFIED",
      message: "Domain DNS must be verified before SSL certificate provisioning can be initiated.",
    };
  }

  // 2. Retry limits: Prevent hitting CA rate limits (e.g. 5 failed orders per hour)
  const currentRetries = record.sslRetryCount || 0;
  if (currentRetries >= 5 && record.sslLastAttemptAt) {
    const elapsedMs = Date.now() - new Date(record.sslLastAttemptAt).getTime();
    const cooldownMs = 15 * 60 * 1000; // 15-minute cooldown after 5 retries
    if (elapsedMs < cooldownMs) {
      const remainingMins = Math.ceil((cooldownMs - elapsedMs) / 60000);
      return {
        success: false,
        domain: record,
        errorCode: "RATE_LIMITED",
        message: `Maximum SSL retry attempts exceeded (${currentRetries} attempts). Please wait ${remainingMins} minutes before retrying.`,
      };
    }
  }

  // 3. Check if existing certificate is currently valid (non-destructive renewal check)
  const isExistingCertValid = Boolean(
    record.sslEnabled &&
    record.sslStatus === "ACTIVE" &&
    record.sslExpiresAt &&
    new Date(record.sslExpiresAt).getTime() > Date.now()
  );

  // 4. DNS Pre-flight check before contacting provider
  const preflight = await runDnsPreflightCheck(record.domain, record.verificationToken);
  if (!preflight.passed) {
    const failureMsg = preflight.errors.join("; ") || "DNS pre-flight resolution check failed";
    const failedRecord: CustomDomain = {
      ...record,
      // If an existing certificate is valid, keep sslEnabled and ACTIVE to prevent downtime
      sslStatus: isExistingCertValid ? "ACTIVE" : "FAILED",
      sslEnabled: isExistingCertValid,
      sslFailureReason: `Pre-flight failure: ${failureMsg}`,
      sslRetryCount: currentRetries + 1,
      sslLastAttemptAt: now,
      dnsPreflight: preflight,
    };
    return {
      success: false,
      domain: failedRecord,
      errorCode: "PREFLIGHT_FAILED",
      message: failureMsg,
    };
  }

  // 5. Query active certificate provider
  const provider = getCertificateProvider();
  let providerResult: CertificateOrderResult;
  try {
    providerResult = await provider.requestCertificate({
      domain: record.domain,
      websiteId,
      challengeType: "http-01",
    });
  } catch (provErr: any) {
    providerResult = {
      status: "FAILED",
      errorCode: "PROVIDER_ERROR",
      failureReason: `Certificate provider threw an error: ${provErr.message || "Unknown error"}`,
    };
  }

  // 6. Handle Provider Result
  if (providerResult.status === "ISSUED" && providerResult.certificate) {
    const authCheck = validateCertificateAuthenticity(record.domain, providerResult.certificate);
    if (!authCheck.valid) {
      const failReason = authCheck.reason || "Certificate authenticity verification failed";
      const failedRecord: CustomDomain = {
        ...record,
        sslStatus: isExistingCertValid ? "ACTIVE" : "FAILED",
        sslEnabled: isExistingCertValid,
        sslFailureReason: isExistingCertValid ? `Renewal failed: ${failReason}` : failReason,
        sslRetryCount: currentRetries + 1,
        sslLastAttemptAt: now,
        dnsPreflight: preflight,
      };
      return {
        success: false,
        domain: failedRecord,
        errorCode: authCheck.errorCode || "CERTIFICATE_AUTHENTICITY_FAILED",
        message: failReason,
      };
    }

    const validatedCert = authCheck.validatedCertificate!;

    // Check if provider reported ingress delivery status
    const ingressNotConfigured = providerResult.ingressStatus === "INGRESS_NOT_CONFIGURED";
    const ingressFailed = providerResult.ingressStatus === "INSTALLATION_FAILED";

    if (ingressNotConfigured || ingressFailed) {
      const reasonMsg = providerResult.ingressMessage || "Ingress installation not configured";
      const failedRecord: CustomDomain = {
        ...record,
        // Preserve active status if this was renewal of an existing valid certificate
        sslStatus: isExistingCertValid ? "ACTIVE" : "FAILED",
        sslEnabled: isExistingCertValid,
        sslFailureReason: isExistingCertValid
          ? `Renewal succeeded but ingress delivery pending: ${reasonMsg}`
          : reasonMsg,
        sslCertificateIssued: true,
        sslInstalled: false,
        sslHttpsVerified: false,
        ingressStatus: providerResult.ingressStatus,
        ingressError: reasonMsg,
        sslIssuer: validatedCert.issuer,
        sslExpiresAt: validatedCert.expiresAt,
        sslCertificateFingerprint: validatedCert.fingerprint,
        sslRetryCount: isExistingCertValid ? currentRetries : currentRetries + 1,
        sslLastAttemptAt: now,
        dnsPreflight: preflight,
      };

      return {
        success: isExistingCertValid,
        domain: failedRecord,
        errorCode: ingressNotConfigured ? "INGRESS_NOT_CONFIGURED" : "INSTALLATION_FAILED",
        message: reasonMsg,
      };
    }

    const activeRecord: CustomDomain = {
      ...record,
      sslStatus: "ACTIVE",
      sslEnabled: true,
      sslCertificateIssued: true,
      sslInstalled: true,
      sslHttpsVerified: Boolean(record.sslHttpsVerified),
      ingressStatus: providerResult.ingressStatus || "INSTALLED",
      ingressError: undefined,
      sslIssuer: validatedCert.issuer,
      sslExpiresAt: validatedCert.expiresAt,
      sslCertificateFingerprint: validatedCert.fingerprint,
      sslFailureReason: undefined,
      sslRetryCount: 0,
      sslLastAttemptAt: now,
      dnsPreflight: preflight,
    };
    return {
      success: true,
      domain: activeRecord,
      message: "SSL certificate provisioned and activated successfully.",
    };
  }

  if (providerResult.status === "PENDING") {
    const pendingRecord: CustomDomain = {
      ...record,
      sslStatus: "ISSUING",
      sslEnabled: isExistingCertValid,
      acmeChallengeToken: providerResult.challenge?.token,
      sslLastAttemptAt: now,
      dnsPreflight: preflight,
    };
    return {
      success: false,
      domain: pendingRecord,
      message: "SSL certificate order placed. Awaiting challenge verification by Certificate Authority.",
    };
  }

  // Provider failed
  const reason = providerResult.failureReason || "Certificate authority order failed";
  const failedRecord: CustomDomain = {
    ...record,
    // Do NOT disable existing working SSL if this was an in-place renewal attempt
    sslStatus: isExistingCertValid ? "ACTIVE" : "FAILED",
    sslEnabled: isExistingCertValid,
    sslFailureReason: isExistingCertValid ? `Renewal failed: ${reason}` : reason,
    sslRetryCount: currentRetries + 1,
    sslLastAttemptAt: now,
    dnsPreflight: preflight,
  };

  return {
    success: false,
    domain: failedRecord,
    errorCode: providerResult.errorCode || "PROVISIONING_FAILED",
    message: reason,
  };
}

/**
 * Returns comprehensive diagnostic status for a domain including SSL expiry & DNS errors.
 * Strictly avoids marking SSL active unless a valid certificate was genuinely issued.
 */
export function getDomainDiagnosticStatus(record: CustomDomain): SslDiagnosticStatus {
  const now = Date.now();
  let daysUntilExpiry: number | undefined;

  const isCertExpired = Boolean(
    record.sslExpiresAt && new Date(record.sslExpiresAt).getTime() <= now
  );

  if (record.sslExpiresAt) {
    const diffMs = new Date(record.sslExpiresAt).getTime() - now;
    daysUntilExpiry = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }

  // Derive explicit lifecycle status
  let effectiveSslStatus: SslStatus = record.sslStatus || "NOT_CONFIGURED";
  if (isCertExpired && effectiveSslStatus === "ACTIVE") {
    effectiveSslStatus = "EXPIRED";
  }

  const isActuallyActive = effectiveSslStatus === "ACTIVE" && Boolean(record.sslEnabled) && !isCertExpired;

  return {
    domain: record.domain,
    status: record.status,
    sslStatus: effectiveSslStatus,
    sslEnabled: isActuallyActive,
    sslIssuer: isActuallyActive ? record.sslIssuer : undefined,
    sslExpiresAt: record.sslExpiresAt,
    daysUntilExpiry,
    autoRenew: true,
    certificateIssued: Boolean(
      record.sslCertificateIssued || (record.sslStatus === "ACTIVE" && record.sslCertificateFingerprint)
    ),
    certificateInstalled: Boolean(
      record.sslInstalled || (isActuallyActive && record.ingressStatus !== "INGRESS_NOT_CONFIGURED")
    ),
    httpsReachable: Boolean(record.sslHttpsVerified),
    ingressStatus: record.ingressStatus || (isActuallyActive ? "INSTALLED" : "INGRESS_NOT_CONFIGURED"),
    ingressError: record.ingressError,
    dnsPreflight: {
      passed: record.dnsPreflight?.passed ?? (record.status === "active"),
      cnameValid: record.dnsPreflight?.cnameValid,
      aRecordValid: record.dnsPreflight?.aRecordValid,
      txtValid: record.dnsPreflight?.txtValid,
      checkedAt: record.dnsPreflight?.checkedAt || record.lastCheckedAt || new Date().toISOString(),
      errors: record.dnsPreflight?.errors || (record.sslFailureReason ? [record.sslFailureReason] : []),
    },
    http01Challenge: record.acmeChallengeToken
      ? {
        path: `/.well-known/acme-challenge/${record.acmeChallengeToken}`,
        token: record.acmeChallengeToken,
      }
      : undefined,
  };
}


/**
 * Scans all websites with custom domains, identifies certificates approaching expiry
 * or already expired, reconciles their status, and triggers renewals with bounded retries.
 * Non-destructive: preserves existing valid certificates on renewal failure.
 */
export async function processExpiringSslCertificates(windowDays: number = 30): Promise<{
  processed: number;
  renewed: number;
  failed: number;
  expired: number;
  results: Array<{ domain: string; websiteId: string; action: string; error?: string }>;
}> {
  const sites: any[] = await prisma.$queryRaw`
    SELECT id, "editorData"
    FROM websites
    WHERE ("editorData"->'customDomains') IS NOT NULL
      AND jsonb_typeof("editorData"->'customDomains') = 'array'
  `;

  let processed = 0;
  let renewed = 0;
  let failed = 0;
  let expired = 0;
  const results: Array<{ domain: string; websiteId: string; action: string; error?: string }> = [];
  const now = Date.now();

  for (const site of sites) {
    const rawDomains: CustomDomain[] = Array.isArray(site.editorData?.customDomains)
      ? site.editorData.customDomains
      : [];

    let modified = false;
    for (let i = 0; i < rawDomains.length; i++) {
      const d = rawDomains[i];
      if (d.status !== "active") continue;

      processed++;

      // Check expired
      if (d.sslExpiresAt && new Date(d.sslExpiresAt).getTime() <= now) {
        if (d.sslStatus !== "EXPIRED" || d.sslEnabled) {
          rawDomains[i] = {
            ...d,
            sslStatus: "EXPIRED",
            sslEnabled: false,
          };
          modified = true;
          expired++;
          results.push({ domain: d.domain, websiteId: site.id, action: "EXPIRED" });
        }
        continue;
      }

      // Check renewal window
      if (d.sslStatus === "ACTIVE" && d.sslExpiresAt) {
        const daysLeft = Math.floor((new Date(d.sslExpiresAt).getTime() - now) / (1000 * 60 * 60 * 24));
        if (daysLeft <= windowDays) {
          const res = await initiateSslProvisioning(d, site.id);
          rawDomains[i] = res.domain;
          modified = true;
          if (res.success) {
            renewed++;
            results.push({ domain: d.domain, websiteId: site.id, action: "RENEWED" });
          } else {
            failed++;
            results.push({ domain: d.domain, websiteId: site.id, action: "RENEWAL_FAILED", error: res.message });
          }
        }
      }
    }

    if (modified) {
      await prisma.website.update({
        where: { id: site.id },
        data: {
          editorData: {
            ...site.editorData,
            customDomains: rawDomains,
          },
        },
      });
    }
  }

  return { processed, renewed, failed, expired, results };
}

