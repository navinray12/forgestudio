/**
 * Phase 19: Module 19.4 — Ingress Certificate Delivery & Cryptographic Validation Adapter
 *
 * Validates domain certificates against their private keys and securely delivers
 * them to the hosting ingress layer (e.g., Caddy, Nginx, or Kubernetes edge).
 *
 * Guardrails:
 * - Never marks SSL ACTIVE if no real ingress is configured to serve HTTPS.
 * - Distinguishes between Certificate Issuance, Ingress Installation, and Live HTTPS Verification.
 * - Validates Domain/SAN match, validity period, and cryptographic keypair matching.
 * - Private keys are stored in restricted filesystem storage (mode 0o600) and NEVER returned in API responses.
 */

import fs from "fs";
import path from "path";
import crypto, { X509Certificate } from "crypto";
import { getSecureSslStorageDir } from "./acmeChallengeStore.js";

export interface KeyPairValidationResult {
  valid: boolean;
  errorCode?: string;
  reason?: string;
  issuer?: string;
  expiresAt?: string;
  fingerprint?: string;
}

export interface IngressInstallationResult {
  success: boolean;
  installed: boolean;
  status: "INSTALLED" | "INGRESS_NOT_CONFIGURED" | "INSTALLATION_FAILED" | "VALIDATION_FAILED";
  error?: string;
  installedAt?: string;
}

export interface IngressDeliveryAdapter {
  readonly name: string;
  isConfigured(): boolean;
  install(params: {
    domain: string;
    websiteId: string;
    certPem: string;
    privateKeyPem: string;
  }): Promise<IngressInstallationResult>;
  verifyHttpsHandshake?(domain: string): Promise<{ reachable: boolean; error?: string }>;
}

// ---------------------------------------------------------------------------
// Secure Private Key & Certificate Storage (Mode 0o700 / 0o600)
// ---------------------------------------------------------------------------

export function getDomainCertsDir(domain: string): string {
  const cleanDomain = domain.toLowerCase().trim().replace(/[^a-z0-9.-]/g, "_");
  const dir = path.join(getSecureSslStorageDir(), "certs", cleanDomain);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  return dir;
}

/**
 * Saves certificate chain and private key to persistent secure disk storage.
 * Enforces file permissions: 0o600 (owner read/write only).
 */
export function saveDomainCertificateFiles(
  domain: string,
  certPem: string,
  privateKeyPem: string
): { certPath: string; keyPath: string } {
  const dir = getDomainCertsDir(domain);
  const certPath = path.join(dir, "fullchain.pem");
  const keyPath = path.join(dir, "privkey.pem");

  // Atomic write for certificate
  const tempCert = `${certPath}.tmp.${Date.now()}`;
  fs.writeFileSync(tempCert, certPem.trim() + "\n", { mode: 0o644 });
  fs.renameSync(tempCert, certPath);

  // Atomic write for private key with restricted permissions
  const tempKey = `${keyPath}.tmp.${Date.now()}`;
  fs.writeFileSync(tempKey, privateKeyPem.trim() + "\n", { mode: 0o600 });
  fs.renameSync(tempKey, keyPath);

  return { certPath, keyPath };
}

export function getDomainCertificatePrivateKey(domain: string): string | null {
  try {
    const keyPath = path.join(getDomainCertsDir(domain), "privkey.pem");
    if (fs.existsSync(keyPath)) {
      return fs.readFileSync(keyPath, "utf-8");
    }
  } catch {
    // Ignore read errors
  }
  return null;
}

export function getDomainCertificateChain(domain: string): string | null {
  try {
    const certPath = path.join(getDomainCertsDir(domain), "fullchain.pem");
    if (fs.existsSync(certPath)) {
      return fs.readFileSync(certPath, "utf-8");
    }
  } catch {
    // Ignore read errors
  }
  return null;
}

// ---------------------------------------------------------------------------
// Cryptographic Validation: Domain/SAN, Expiration, Key-Pair Matching
// ---------------------------------------------------------------------------

/**
 * Validates that:
 * 1. Certificate is a valid X.509 PEM.
 * 2. Domain matches the Subject Common Name or Subject Alternative Names (SAN).
 * 3. Certificate is currently valid (not expired, not premature).
 * 4. The provided private key cryptographically matches the certificate's public key.
 */
export function validateCertificateAndPrivateKey(
  domain: string,
  certPem: string,
  privateKeyPem: string
): KeyPairValidationResult {
  const normDomain = domain.toLowerCase().trim();

  // 1. Parse X.509 Certificate
  let x509: X509Certificate;
  try {
    x509 = new X509Certificate(certPem);
  } catch (err: any) {
    return {
      valid: false,
      errorCode: "INVALID_X509_PEM",
      reason: `Malformed X.509 certificate PEM: ${err.message || "Parse error"}`,
    };
  }

  // 2. Validate Domain SAN / CN Match
  const subjectStr = x509.subject || "";
  const sanStr = x509.subjectAltName || "";
  const cnMatch = subjectStr.match(/CN=([^,\n/]+)/i);
  const commonName = cnMatch ? cnMatch[1].trim().toLowerCase() : "";

  const altNames: string[] = sanStr
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.startsWith("DNS:"))
    .map((s) => s.substring(4).toLowerCase());

  const allNames = new Set<string>();
  if (commonName) allNames.add(commonName);
  for (const alt of altNames) allNames.add(alt);

  const domainMatches =
    allNames.has(normDomain) ||
    allNames.has(`*.${normDomain}`) ||
    Array.from(allNames).some((pattern) => {
      if (pattern.startsWith("*.")) {
        const root = pattern.substring(2);
        return normDomain.endsWith(`.${root}`);
      }
      return false;
    });

  if (!domainMatches) {
    return {
      valid: false,
      errorCode: "DOMAIN_MISMATCH",
      reason: `Certificate Common Name/SAN ([${Array.from(allNames).join(", ")}]) does not match domain '${normDomain}'`,
    };
  }

  // 3. Validity period check
  const now = Date.now();
  const validFrom = new Date(x509.validFrom).getTime();
  const validTo = new Date(x509.validTo).getTime();

  if (now > validTo) {
    return {
      valid: false,
      errorCode: "CERTIFICATE_EXPIRED",
      reason: `Certificate expired on ${x509.validTo}`,
    };
  }

  if (now < validFrom) {
    return {
      valid: false,
      errorCode: "CERTIFICATE_NOT_YET_VALID",
      reason: `Certificate is not valid until ${x509.validFrom}`,
    };
  }

  // 4. Private Key Cryptographic Match Check
  try {
    const privKeyObj = crypto.createPrivateKey(privateKeyPem);
    const pubFromPriv = crypto.createPublicKey(privKeyObj);
    const privSpki = pubFromPriv.export({ type: "spki", format: "pem" });

    const certSpki = x509.publicKey.export({ type: "spki", format: "pem" });

    if (privSpki !== certSpki) {
      return {
        valid: false,
        errorCode: "KEY_PAIR_MISMATCH",
        reason: "Certificate public key does not match the provided private key",
      };
    }
  } catch (err: any) {
    return {
      valid: false,
      errorCode: "INVALID_PRIVATE_KEY",
      reason: `Private key validation failed: ${err.message || "Invalid private key"}`,
    };
  }

  const fingerprint = x509.fingerprint256.replace(/:/g, "").toLowerCase();

  return {
    valid: true,
    issuer: x509.issuer,
    expiresAt: new Date(validTo).toISOString(),
    fingerprint,
  };
}

// ---------------------------------------------------------------------------
// Ingress Delivery Adapters
// ---------------------------------------------------------------------------

/**
 * Default adapter when no Caddy, Nginx, or Kubernetes ingress is present.
 * Reports accurately that no ingress is available to receive or serve the certificate.
 */
export class UnconfiguredIngressAdapter implements IngressDeliveryAdapter {
  public readonly name = "UnconfiguredIngressAdapter";

  public isConfigured(): boolean {
    return false;
  }

  public async install(_params: {
    domain: string;
    websiteId: string;
    certPem: string;
    privateKeyPem: string;
  }): Promise<IngressInstallationResult> {
    return {
      success: false,
      installed: false,
      status: "INGRESS_NOT_CONFIGURED",
      error:
        "No hosting ingress (Caddy/Nginx) configured in this environment. Certificate is saved to secure storage but cannot be actively served on port 443.",
    };
  }
}

/**
 * Directory / File Ingress Adapter:
 * Used when EDGE_INGRESS_ENABLED=true and INGRESS_CERT_DIR is defined.
 * Copies the validated cert and key atomically into the ingress directory.
 */
export class DirectoryIngressAdapter implements IngressDeliveryAdapter {
  public readonly name = "DirectoryIngressAdapter";
  private certDir: string;

  constructor(certDir: string) {
    this.certDir = path.resolve(certDir);
  }

  public isConfigured(): boolean {
    return Boolean(this.certDir && fs.existsSync(this.certDir));
  }

  public async install(params: {
    domain: string;
    websiteId: string;
    certPem: string;
    privateKeyPem: string;
  }): Promise<IngressInstallationResult> {
    try {
      const targetDir = path.join(this.certDir, params.domain.toLowerCase().trim());
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true, mode: 0o700 });
      }

      const certFile = path.join(targetDir, "fullchain.pem");
      const keyFile = path.join(targetDir, "privkey.pem");

      // Atomic write
      const tmpCert = `${certFile}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpCert, params.certPem.trim() + "\n", { mode: 0o644 });
      fs.renameSync(tmpCert, certFile);

      const tmpKey = `${keyFile}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpKey, params.privateKeyPem.trim() + "\n", { mode: 0o600 });
      fs.renameSync(tmpKey, keyFile);

      return {
        success: true,
        installed: true,
        status: "INSTALLED",
        installedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        success: false,
        installed: false,
        status: "INSTALLATION_FAILED",
        error: `Failed to install certificate to ingress directory: ${err.message}`,
      };
    }
  }
}

let activeIngressAdapter: IngressDeliveryAdapter = new UnconfiguredIngressAdapter();

export function getIngressAdapter(): IngressDeliveryAdapter {
  // If environment specifies an ingress directory and edge ingress is enabled:
  if (
    process.env.EDGE_INGRESS_ENABLED === "true" &&
    process.env.INGRESS_CERT_DIR &&
    activeIngressAdapter instanceof UnconfiguredIngressAdapter
  ) {
    activeIngressAdapter = new DirectoryIngressAdapter(process.env.INGRESS_CERT_DIR);
  }
  return activeIngressAdapter;
}

export function setIngressAdapter(adapter: IngressDeliveryAdapter | null): void {
  activeIngressAdapter = adapter || new UnconfiguredIngressAdapter();
}
