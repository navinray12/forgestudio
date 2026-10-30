/**
 * Phase 19: Module 19.2 — SSL Certificate Provider Interface
 *
 * Defines the contract for automated SSL/TLS certificate providers
 * (e.g., Let's Encrypt / ACME v2, Cloudflare SSL, or Injected Test Providers).
 *
 * Ensures security: private keys and internal secrets are NEVER returned
 * through this interface or exposed to clients.
 */

import { AcmeCertificateProvider } from "./acmeCertificateProvider.service.js";

export interface CertificateOrderRequest {
  domain: string;
  websiteId: string;
  challengeType: "http-01" | "dns-01";
}

export interface IssuedCertificateMetadata {
  issuer: string;
  expiresAt: string; // ISO 8601
  fingerprint: string; // SHA-256 fingerprint of the public cert
  serialNumber: string;
  /** Optional raw X.509 PEM certificate for cryptographic authenticity and SAN verification */
  rawCertificatePem?: string;
}

export interface CertificateOrderResult {
  status: "ISSUED" | "PENDING" | "FAILED";
  certificate?: IssuedCertificateMetadata;
  challenge?: {
    token: string;
    path: string;
    keyAuthorization: string;
  };
  failureReason?: string;
  errorCode?: string;
  retryAfterSeconds?: number;
  ingressStatus?: "INSTALLED" | "INGRESS_NOT_CONFIGURED" | "INSTALLATION_FAILED";
  ingressMessage?: string;
}

export interface CertificateProvider {
  readonly name: string;
  isConfigured(): boolean;
  requestCertificate(order: CertificateOrderRequest): Promise<CertificateOrderResult>;
  renewCertificate?(domain: string, websiteId: string): Promise<CertificateOrderResult>;
  revokeCertificate?(domain: string): Promise<{ success: boolean; reason?: string }>;
}

/**
 * Default Unconfigured Provider:
 * Safely fails closed when production ACME / edge infrastructure is not configured.
 * Never fabricates fake certificates.
 */
export class UnconfiguredCertificateProvider implements CertificateProvider {
  public readonly name = "UnconfiguredCertificateProvider";

  public isConfigured(): boolean {
    return false;
  }

  public async requestCertificate(order: CertificateOrderRequest): Promise<CertificateOrderResult> {
    return {
      status: "FAILED",
      errorCode: "PROVIDER_NOT_CONFIGURED",
      failureReason:
        "SSL certificate provider is not configured. Production Let's Encrypt / ACME requires EDGE_ROUTER_ENABLED and ACME_DIRECTORY_URL.",
    };
  }
}

let activeProvider: CertificateProvider | null = null;

/**
 * Returns the currently active certificate provider.
 * Automatically initializes AcmeCertificateProvider if ACME_ENABLED=true.
 */
export function getCertificateProvider(): CertificateProvider {
  if (activeProvider) {
    return activeProvider;
  }

  if (process.env.ACME_ENABLED === "true") {
    activeProvider = new AcmeCertificateProvider();
    return activeProvider;
  }

  activeProvider = new UnconfiguredCertificateProvider();
  return activeProvider;
}

/**
 * Sets or overrides the certificate provider (used for test isolation or production bootstrap).
 */
export function setCertificateProvider(provider: CertificateProvider | null): void {
  activeProvider = provider;
}

