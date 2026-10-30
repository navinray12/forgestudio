/**
 * Phase 19: Module 19.2 — Real ACME / Let's Encrypt Certificate Provider
 *
 * Implements the CertificateProvider interface using the official acme-client library.
 *
 * Requirements:
 * - Let's Encrypt staging by default for safe testing.
 * - Production Let's Encrypt only enabled when ALLOW_ACME_PRODUCTION=true and ACME_ENVIRONMENT=production.
 * - Persistent secure storage of ACME account key and domain private keys outside of editorData and uploads.
 * - HTTP-01 challenge coordination with acmeChallengeStore.
 * - Strict verification: will never issue certificates for unverified domains.
 * - Fails safely if required configuration is missing; never creates fake certificates.
 */

import fs from "fs";
import path from "path";
import * as acme from "acme-client";
import { X509Certificate } from "crypto";
import { prisma } from "../../config/prisma.js";
import {
  type CertificateProvider,
  type CertificateOrderRequest,
  type CertificateOrderResult,
} from "./certificateProvider.interface.js";
import { acmeChallengeStore, getSecureSslStorageDir } from "./acmeChallengeStore.js";
import {
  saveDomainCertificateFiles,
  validateCertificateAndPrivateKey,
  getIngressAdapter,
} from "./ingressCertificate.service.js";

export interface AcmeProviderConfig {
  enabled?: boolean;
  environment?: "staging" | "production";
  allowProduction?: boolean;
  directoryUrl?: string;
  contactEmail?: string;
  storageDir?: string;
  /** Injected ACME client for testing */
  injectedClient?: any;
}

export class AcmeCertificateProvider implements CertificateProvider {
  public readonly name = "AcmeCertificateProvider";
  private config: AcmeProviderConfig;
  private cachedAccountKey: string | null = null;
  private clientInstance: any = null;

  constructor(customConfig?: AcmeProviderConfig) {
    this.config = {
      enabled: customConfig?.enabled ?? process.env.ACME_ENABLED === "true",
      environment: (customConfig?.environment ?? process.env.ACME_ENVIRONMENT ?? "staging") as
        | "staging"
        | "production",
      allowProduction: customConfig?.allowProduction ?? process.env.ALLOW_ACME_PRODUCTION === "true",
      directoryUrl: customConfig?.directoryUrl ?? process.env.ACME_DIRECTORY_URL,
      contactEmail: customConfig?.contactEmail ?? process.env.ACME_CONTACT_EMAIL,
      storageDir: customConfig?.storageDir ?? getSecureSslStorageDir(),
      injectedClient: customConfig?.injectedClient,
    };
  }

  /**
   * Resolves the ACME Directory URL with staging safeguard:
   * Production is rejected unless ALLOW_ACME_PRODUCTION=true is explicitly configured.
   */
  public getDirectoryUrl(): { url: string; isProduction: boolean; error?: string } {
    if (this.config.directoryUrl) {
      const isProd =
        this.config.directoryUrl.includes("acme-v02.api.letsencrypt.org") &&
        !this.config.directoryUrl.includes("staging");
      if (isProd && !this.config.allowProduction) {
        return {
          url: this.config.directoryUrl,
          isProduction: true,
          error:
            "Production ACME directory requires ALLOW_ACME_PRODUCTION=true safeguard to prevent CA rate limit exhaustion.",
        };
      }
      return { url: this.config.directoryUrl, isProduction: isProd };
    }

    if (this.config.environment === "production") {
      if (!this.config.allowProduction) {
        return {
          url: acme.directory.letsencrypt.production,
          isProduction: true,
          error:
            "Production ACME environment requires ALLOW_ACME_PRODUCTION=true safeguard to prevent CA rate limit exhaustion.",
        };
      }
      return { url: acme.directory.letsencrypt.production, isProduction: true };
    }

    // Default to staging
    return { url: acme.directory.letsencrypt.staging, isProduction: false };
  }

  public isConfigured(): boolean {
    if (!this.config.enabled) {
      return false;
    }
    const dirInfo = this.getDirectoryUrl();
    if (dirInfo.error) {
      return false;
    }
    return Boolean(this.config.contactEmail && this.config.contactEmail.includes("@"));
  }

  /**
   * Loads or creates a persistent ACME account private key (RSA 2048)
   * stored securely in restricted filesystem storage (mode 0o600).
   */
  private async getOrCreateAccountKey(): Promise<string> {
    if (this.cachedAccountKey) {
      return this.cachedAccountKey;
    }

    const keyPath = path.join(this.config.storageDir!, "acme_account_key.pem");
    if (fs.existsSync(keyPath)) {
      this.cachedAccountKey = fs.readFileSync(keyPath, "utf-8");
      return this.cachedAccountKey;
    }

    // Generate new RSA private key using acme.crypto
    const newKeyBuffer = await acme.crypto.createPrivateKey();
    const newKeyPem = newKeyBuffer.toString();

    // Ensure directory exists with 0o700
    if (!fs.existsSync(this.config.storageDir!)) {
      fs.mkdirSync(this.config.storageDir!, { recursive: true, mode: 0o700 });
    }

    fs.writeFileSync(keyPath, newKeyPem, { mode: 0o600 });
    this.cachedAccountKey = newKeyPem;
    return newKeyPem;
  }

  /**
   * Initializes or returns the ACME client instance.
   */
  private async getClient(): Promise<any> {
    if (this.config.injectedClient) {
      return this.config.injectedClient;
    }

    if (this.clientInstance) {
      return this.clientInstance;
    }

    const dirInfo = this.getDirectoryUrl();
    if (dirInfo.error) {
      throw new Error(dirInfo.error);
    }

    const accountKey = await this.getOrCreateAccountKey();

    const client = new acme.Client({
      directoryUrl: dirInfo.url,
      accountKey,
    });

    // Ensure account registration with Certificate Authority
    try {
      await client.createAccount({
        termsOfServiceAgreed: true,
        contact: [`mailto:${this.config.contactEmail}`],
      });
    } catch (err: any) {
      // If account already exists (HTTP 200 or existing), acme-client handles it
      console.log(`[AcmeProvider] Account registration note: ${err?.message || "Registered"}`);
    }

    this.clientInstance = client;
    return client;
  }

  /**
   * Requests a real certificate from ACME / Let's Encrypt using HTTP-01 challenge.
   */
  public async requestCertificate(order: CertificateOrderRequest): Promise<CertificateOrderResult> {
    const domain = order.domain.toLowerCase().trim();
    const websiteId = order.websiteId;

    // 1. Fail safely if ACME is not configured or disabled
    if (!this.config.enabled) {
      return {
        status: "FAILED",
        errorCode: "ACME_NOT_CONFIGURED",
        failureReason:
          "ACME provider is disabled. Enable via ACME_ENABLED=true and configure ACME_CONTACT_EMAIL.",
      };
    }

    const dirInfo = this.getDirectoryUrl();
    if (dirInfo.error) {
      return {
        status: "FAILED",
        errorCode: "INVALID_ACME_CONFIG",
        failureReason: dirInfo.error,
      };
    }

    if (!this.config.contactEmail || !this.config.contactEmail.includes("@")) {
      return {
        status: "FAILED",
        errorCode: "MISSING_CONTACT_EMAIL",
        failureReason: "ACME_CONTACT_EMAIL must be set to a valid email address for certificate authority notices.",
      };
    }

    // 2. DNS-01 not supported check
    if (order.challengeType === "dns-01") {
      return {
        status: "FAILED",
        errorCode: "DNS01_NOT_SUPPORTED",
        failureReason:
          "DNS-01 challenge is not supported because no automated DNS provider integration (Cloudflare/Route53) is configured.",
      };
    }

    // 3. Strict Pre-requisite: Verify domain ownership in database
    try {
      const website = await prisma.website.findUnique({
        where: { id: websiteId },
      });

      if (!website) {
        return {
          status: "FAILED",
          errorCode: "WEBSITE_NOT_FOUND",
          failureReason: "Website record not found for certificate order.",
        };
      }

      const customDomains: any[] = Array.isArray((website.editorData as any)?.customDomains)
        ? (website.editorData as any).customDomains
        : [];

      const record = customDomains.find((d) => d.domain.toLowerCase() === domain);
      if (!record) {
        return {
          status: "FAILED",
          errorCode: "DOMAIN_NOT_FOUND",
          failureReason: `Domain '${domain}' is not registered to website '${websiteId}'.`,
        };
      }

      if (record.status !== "active") {
        return {
          status: "FAILED",
          errorCode: "DOMAIN_NOT_VERIFIED",
          failureReason: "Cannot issue ACME SSL certificate for a domain whose DNS ownership is not verified.",
        };
      }
    } catch (dbErr: any) {
      return {
        status: "FAILED",
        errorCode: "DATABASE_ERROR",
        failureReason: `Database verification failed: ${dbErr.message}`,
      };
    }

    // 4. Contact ACME Certificate Authority & Process Order
    try {
      const client = await this.getClient();

      // a. Create order with CA
      const acmeOrder = await client.createOrder({
        identifiers: [{ type: "dns", value: domain }],
      });

      // b. Fetch authorizations
      const authorizations = await client.getAuthorizations(acmeOrder);
      if (!authorizations || authorizations.length === 0) {
        return {
          status: "FAILED",
          errorCode: "NO_AUTHORIZATIONS",
          failureReason: "Certificate Authority returned no authorizations for domain.",
        };
      }

      // c. Locate HTTP-01 challenge
      const auth = authorizations[0];
      const challenge = (auth.challenges || []).find((c: any) => c.type === "http-01");

      if (!challenge) {
        return {
          status: "FAILED",
          errorCode: "NO_HTTP01_CHALLENGE",
          failureReason: "Certificate Authority did not provide an HTTP-01 challenge.",
        };
      }

      // d. Compute challenge key authorization
      const keyAuthorization = await client.getChallengeKeyAuthorization(challenge);

      // e. Register in challenge store so GET /.well-known/acme-challenge/:token can serve it
      acmeChallengeStore.registerChallenge({
        token: challenge.token,
        keyAuthorization,
        domain,
        websiteId,
      });

      // f. Inform CA that challenge is ready to be validated
      await client.completeChallenge(challenge);

      // g. Wait for CA validation
      await client.waitForValidStatus(challenge);

      // h. Generate domain private key and CSR
      const [domainKeyBuffer, csrBuffer] = await acme.crypto.createCsr({
        commonName: domain,
      });

      const domainKeyPem = domainKeyBuffer.toString();

      // i. Finalize order with CSR
      await client.finalizeOrder(acmeOrder, csrBuffer);

      // j. Download issued certificate chain PEM
      const certChainPem = await client.getCertificate(acmeOrder);

      // k. Cleanup completed challenge
      acmeChallengeStore.completeChallenge(challenge.token);

      // l. Validate issued certificate and key before saving
      const validation = validateCertificateAndPrivateKey(domain, certChainPem, domainKeyPem);
      if (!validation.valid) {
        return {
          status: "FAILED",
          errorCode: validation.errorCode || "CERTIFICATE_VALIDATION_FAILED",
          failureReason: `Issued certificate validation failed: ${validation.reason}`,
        };
      }

      // m. Save to persistent secure disk storage (mode 0o600 for key)
      saveDomainCertificateFiles(domain, certChainPem, domainKeyPem);

      const x509 = new X509Certificate(certChainPem);

      // n. Ingress Delivery Adapter check
      const ingressAdapter = getIngressAdapter();
      let ingressStatus: "INSTALLED" | "INGRESS_NOT_CONFIGURED" | "INSTALLATION_FAILED" = "INGRESS_NOT_CONFIGURED";
      let ingressError: string | undefined;

      if (ingressAdapter.isConfigured()) {
        const installRes = await ingressAdapter.install({
          domain,
          websiteId,
          certPem: certChainPem,
          privateKeyPem: domainKeyPem,
        });
        if (installRes.success) {
          ingressStatus = "INSTALLED";
        } else {
          ingressStatus = "INSTALLATION_FAILED";
          ingressError = installRes.error;
        }
      } else {
        ingressError =
          "No hosting ingress (Caddy/Nginx) is configured to receive and serve TLS certificates on port 443.";
      }

      return {
        status: "ISSUED",
        certificate: {
          issuer: x509.issuer,
          expiresAt: new Date(x509.validTo).toISOString(),
          fingerprint: x509.fingerprint256.replace(/:/g, "").toLowerCase(),
          serialNumber: x509.serialNumber,
          rawCertificatePem: certChainPem,
        },
        ingressStatus,
        ingressMessage: ingressError,
      };
    } catch (acmeErr: any) {
      console.error(`[AcmeProvider] Order failed for domain ${domain}:`, acmeErr?.message || acmeErr);
      return {
        status: "FAILED",
        errorCode: "ACME_ORDER_FAILED",
        failureReason: `Let's Encrypt / ACME challenge or issuance failed: ${acmeErr?.message || "Unknown error"}`,
      };
    }
  }

  public async renewCertificate(domain: string, websiteId: string): Promise<CertificateOrderResult> {
    return this.requestCertificate({
      domain,
      websiteId,
      challengeType: "http-01",
    });
  }
}
