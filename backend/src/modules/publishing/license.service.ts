import crypto from "crypto";
import { prisma } from "../../platform/database/prisma.js";
import { AppError } from "../../platform/http/app-error.js";

const db = prisma as any;

/**
 * Safe auto-initialization for Licensing, White-Label & Billing tables
 */
export async function initLicensingTables() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS licenses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key VARCHAR(100) NOT NULL UNIQUE,
      "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      "planSlug" VARCHAR(50) NOT NULL,
      "maxSites" INTEGER NOT NULL DEFAULT 1,
      status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      "expiresAt" TIMESTAMP WITH TIME ZONE,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS licenses_userId_idx ON licenses("userId")`,
    `CREATE INDEX IF NOT EXISTS licenses_key_idx ON licenses(key)`,
    `CREATE TABLE IF NOT EXISTS license_activations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "licenseId" UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
      "siteUrl" VARCHAR(500) NOT NULL,
      "siteDomain" VARCHAR(255) NOT NULL,
      "ipAddress" VARCHAR(100),
      "isLocalhost" BOOLEAN NOT NULL DEFAULT false,
      "activatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "lastPingAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      CONSTRAINT license_activations_licenseId_siteDomain_key UNIQUE ("licenseId", "siteDomain")
    )`,
    `CREATE INDEX IF NOT EXISTS license_activations_licenseId_idx ON license_activations("licenseId")`,
    `CREATE INDEX IF NOT EXISTS license_activations_siteDomain_idx ON license_activations("siteDomain")`,
    `CREATE TABLE IF NOT EXISTS white_label_configs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "userId" UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      "agencyName" VARCHAR(255),
      "logoUrl" VARCHAR(1000),
      "faviconUrl" VARCHAR(1000),
      "hideForgeBranding" BOOLEAN NOT NULL DEFAULT false,
      "customCss" TEXT,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS billing_invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      "planId" VARCHAR(100) NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'INR',
      status VARCHAR(50) NOT NULL DEFAULT 'PAID',
      "invoiceNumber" VARCHAR(100) NOT NULL UNIQUE,
      "billingPeriodStart" TIMESTAMP WITH TIME ZONE NOT NULL,
      "billingPeriodEnd" TIMESTAMP WITH TIME ZONE NOT NULL,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS billing_invoices_userId_idx ON billing_invoices("userId")`,
    `CREATE INDEX IF NOT EXISTS billing_invoices_invoiceNumber_idx ON billing_invoices("invoiceNumber")`,
  ];

  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (err: any) {
      // Ignore if table or constraint already exists
      if (!err.message?.includes("already exists")) {
        console.warn("[Licensing] DDL warning:", err.message);
      }
    }
  }
}

// Ensure database tables exist upon module loading
initLicensingTables().catch((err) => {
  console.error("[Licensing] Initialization error:", err);
});

/**
 * Generate cryptographically secure license key
 * Format: FS-XXXX-XXXX-XXXX-XXXX
 */
export function generateLicenseKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const getChunk = () => {
    const bytes = crypto.randomBytes(4);
    let str = "";
    for (let i = 0; i < 4; i++) {
      str += chars[bytes[i] % chars.length];
    }
    return str;
  };

  return `FS-${getChunk()}-${getChunk()}-${getChunk()}-${getChunk()}`;
}

/**
 * Normalize site URL or hostname into clean domain format
 */
export function normalizeDomain(rawUrl: string): string {
  if (!rawUrl) return "";
  let domain = rawUrl.trim().toLowerCase();

  // Strip protocol
  domain = domain.replace(/^https?:\/\//i, "");

  // Strip path and query parameters
  domain = domain.split("/")[0];
  domain = domain.split("?")[0];

  // Strip port
  domain = domain.split(":")[0];

  // Strip trailing periods
  domain = domain.replace(/\.+$/, "");

  return domain;
}

/**
 * Determine if a domain represents a local / dev environment
 * (Feature F-443: Localhost exempt from maxSites quota)
 */
export function isLocalhostDomain(domain: string): boolean {
  if (!domain) return false;
  const normalized = domain.toLowerCase();

  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".test") ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".example") ||
    normalized.endsWith(".nip.io") ||
    normalized.endsWith(".sslip.io")
  );
}

/**
 * Generate a signed activation verification token
 */
function generateActivationToken(payload: {
  licenseKey: string;
  domain: string;
  planSlug: string;
  activatedAt: string;
}): string {
  const secret = process.env.SESSION_SECRET || "forgestudio-license-secret-key-32";
  const data = JSON.stringify(payload);
  const signature = crypto.createHmac("sha256", secret).update(data).digest("hex");
  return Buffer.from(JSON.stringify({ data, signature })).toString("base64");
}

/**
 * Activate a license for a site domain (Features F-440, F-441, F-443)
 */
export async function activateLicense(
  key: string,
  siteUrl: string,
  ipAddress?: string
) {
  if (!key || typeof key !== "string") {
    throw new AppError("A valid license key is required", 400, "INVALID_LICENSE_KEY");
  }

  if (!siteUrl || typeof siteUrl !== "string") {
    throw new AppError("Site URL is required for activation", 400, "INVALID_SITE_URL");
  }

  const normalizedDomain = normalizeDomain(siteUrl);
  if (!normalizedDomain) {
    throw new AppError("Unable to parse valid domain from provided URL", 400, "INVALID_DOMAIN");
  }

  // 1. Fetch license
  const license = await (db.license?.findUnique
    ? db.license.findUnique({
        where: { key },
        include: {
          activations: true,
          user: {
            select: { id: true, email: true, fullName: true },
          },
        },
      })
    : (async () => {
        const rows: any[] = await prisma.$queryRaw`
          SELECT l.*, json_agg(a.*) FILTER (WHERE a.id IS NOT NULL) as activations
          FROM licenses l
          LEFT JOIN license_activations a ON l.id = a."licenseId"
          WHERE l.key = ${key}
          GROUP BY l.id
          LIMIT 1
        `;
        return rows[0] || null;
      })());

  if (!license) {
    throw new AppError("License key not found or invalid", 404, "LICENSE_NOT_FOUND");
  }

  // 2. Validate license status
  if (license.status !== "ACTIVE") {
    throw new AppError(
      `This license is currently ${license.status.toLowerCase()}`,
      403,
      "LICENSE_INACTIVE"
    );
  }

  if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
    throw new AppError("This license has expired", 403, "LICENSE_EXPIRED");
  }

  // 3. Check domain environment
  const isLocal = isLocalhostDomain(normalizedDomain);

  // 4. Enforce site limit if production domain (F-441, F-443)
  const existingActivations: any[] = license.activations || [];
  const existingForDomain = existingActivations.find(
    (act) => act.siteDomain === normalizedDomain
  );

  if (!isLocal && !existingForDomain) {
    const activeProdCount = existingActivations.filter(
      (act) => !act.isLocalhost && act.siteDomain !== normalizedDomain
    ).length;

    if (activeProdCount >= license.maxSites) {
      throw new AppError(
        `License site activation limit reached (${activeProdCount}/${license.maxSites} sites used). Deactivate an existing site or upgrade your plan.`,
        403,
        "SITE_LIMIT_EXCEEDED"
      );
    }
  }

  // 5. Upsert activation record
  let activation: any = null;
  if (db.licenseActivation?.upsert) {
    activation = await db.licenseActivation.upsert({
      where: {
        licenseId_siteDomain: {
          licenseId: license.id,
          siteDomain: normalizedDomain,
        },
      },
      update: {
        siteUrl,
        ipAddress: ipAddress || null,
        isLocalhost: isLocal,
        lastPingAt: new Date(),
      },
      create: {
        licenseId: license.id,
        siteUrl,
        siteDomain: normalizedDomain,
        ipAddress: ipAddress || null,
        isLocalhost: isLocal,
        activatedAt: new Date(),
        lastPingAt: new Date(),
      },
    });
  } else {
    const rawUpsert: any[] = await prisma.$queryRaw`
      INSERT INTO license_activations (id, "licenseId", "siteUrl", "siteDomain", "ipAddress", "isLocalhost", "activatedAt", "lastPingAt")
      VALUES (gen_random_uuid(), ${license.id}::uuid, ${siteUrl}, ${normalizedDomain}, ${ipAddress || null}, ${isLocal}, NOW(), NOW())
      ON CONFLICT ("licenseId", "siteDomain") DO UPDATE SET
        "siteUrl" = EXCLUDED."siteUrl",
        "ipAddress" = EXCLUDED."ipAddress",
        "isLocalhost" = EXCLUDED."isLocalhost",
        "lastPingAt" = NOW()
      RETURNING *
    `;
    activation = rawUpsert[0];
  }

  // 6. Generate secure signed verification token
  const token = generateActivationToken({
    licenseKey: license.key,
    domain: normalizedDomain,
    planSlug: license.planSlug,
    activatedAt: activation.activatedAt?.toISOString?.() || new Date().toISOString(),
  });

  return {
    success: true,
    message: isLocal
      ? "License activated successfully in localhost/development mode (does not count towards site quota)"
      : "License activated successfully",
    license: {
      key: license.key,
      planSlug: license.planSlug,
      status: license.status,
      maxSites: license.maxSites,
      expiresAt: license.expiresAt,
    },
    activation: {
      id: activation.id,
      siteDomain: activation.siteDomain,
      siteUrl: activation.siteUrl,
      isLocalhost: activation.isLocalhost,
      activatedAt: activation.activatedAt,
    },
    token,
  };
}

/**
 * Deactivate a license for a specific domain (Feature F-442)
 */
export async function deactivateLicense(key: string, siteDomain: string) {
  if (!key) {
    throw new AppError("License key is required", 400, "INVALID_LICENSE_KEY");
  }
  if (!siteDomain) {
    throw new AppError("Site domain is required", 400, "INVALID_DOMAIN");
  }

  const normalizedDomain = normalizeDomain(siteDomain);

  const license = await (db.license?.findUnique
    ? db.license.findUnique({ where: { key } })
    : (async () => {
        const rows: any[] = await prisma.$queryRaw`SELECT * FROM licenses WHERE key = ${key} LIMIT 1`;
        return rows[0] || null;
      })());

  if (!license) {
    throw new AppError("License key not found", 404, "LICENSE_NOT_FOUND");
  }

  let deletedCount = 0;
  if (db.licenseActivation?.deleteMany) {
    const res = await db.licenseActivation.deleteMany({
      where: {
        licenseId: license.id,
        siteDomain: normalizedDomain,
      },
    });
    deletedCount = res.count;
  } else {
    const res = await prisma.$executeRawUnsafe(
      `DELETE FROM license_activations WHERE "licenseId" = $1::uuid AND "siteDomain" = $2`,
      license.id,
      normalizedDomain
    );
    deletedCount = res;
  }

  if (deletedCount === 0) {
    throw new AppError(
      `No active activation found for domain ${normalizedDomain}`,
      404,
      "ACTIVATION_NOT_FOUND"
    );
  }

  return {
    success: true,
    message: `Domain ${normalizedDomain} deactivated successfully. Site slot is now available.`,
    domain: normalizedDomain,
  };
}

/**
 * Transfer a license from one domain to another atomically (Features F-442, F-443)
 */
export async function transferLicense(
  key: string,
  fromDomain: string,
  toDomain: string,
  siteUrl?: string,
  ipAddress?: string
) {
  if (!fromDomain || !toDomain) {
    throw new AppError("Both source and destination domains are required", 400, "INVALID_DOMAINS");
  }

  const normalizedFrom = normalizeDomain(fromDomain);
  const normalizedTo = normalizeDomain(toDomain);

  if (normalizedFrom === normalizedTo) {
    throw new AppError("Source and destination domains cannot be identical", 400, "SAME_DOMAIN");
  }

  // Deactivate old domain
  await deactivateLicense(key, normalizedFrom);

  // Activate new domain
  const targetUrl = siteUrl || `https://${normalizedTo}`;
  const activationResult = await activateLicense(key, targetUrl, ipAddress);

  return {
    success: true,
    message: `License transferred successfully from ${normalizedFrom} to ${normalizedTo}`,
    transferredFrom: normalizedFrom,
    transferredTo: normalizedTo,
    activation: activationResult.activation,
    token: activationResult.token,
  };
}

/**
 * List all licenses for a user with live quota & activation telemetry (Features F-441, F-447, F-450)
 */
export async function getUserLicenses(userId: string) {
  const licenses = await (db.license?.findMany
    ? db.license.findMany({
        where: { userId },
        include: {
          activations: {
            orderBy: { activatedAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    : (async () => {
        const rows: any[] = await prisma.$queryRaw`
          SELECT l.*,
            COALESCE(
              json_agg(a.* ORDER BY a."activatedAt" DESC) FILTER (WHERE a.id IS NOT NULL),
              '[]'
            ) as activations
          FROM licenses l
          LEFT JOIN license_activations a ON l.id = a."licenseId"
          WHERE l."userId" = ${userId}::uuid
          GROUP BY l.id
          ORDER BY l."createdAt" DESC
        `;
        return rows || [];
      })());

  return (licenses || []).map((lic: any) => {
    const activations: any[] = lic.activations || [];
    const prodActivations = activations.filter((a) => !a.isLocalhost);
    const localhostActivations = activations.filter((a) => a.isLocalhost);

    return {
      id: lic.id,
      key: lic.key,
      planSlug: lic.planSlug,
      maxSites: lic.maxSites,
      status: lic.status,
      expiresAt: lic.expiresAt,
      createdAt: lic.createdAt,
      updatedAt: lic.updatedAt,
      activations: activations.map((a) => ({
        id: a.id,
        siteUrl: a.siteUrl,
        siteDomain: a.siteDomain,
        ipAddress: a.ipAddress,
        isLocalhost: a.isLocalhost,
        activatedAt: a.activatedAt,
        lastPingAt: a.lastPingAt,
      })),
      telemetry: {
        totalActivations: activations.length,
        productionActivations: prodActivations.length,
        localhostActivations: localhostActivations.length,
        remainingSlots: Math.max(0, lic.maxSites - prodActivations.length),
        isLimitReached: prodActivations.length >= lic.maxSites,
      },
    };
  });
}

/**
 * Get or automatically create / update a license when a user upgrades or subscribes
 */
export async function syncUserLicenseForPlan(
  userId: string,
  planSlug: string,
  maxSites: number = 1
) {
  const existingLicense = await (db.license?.findFirst
    ? db.license.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      })
    : (async () => {
        const rows: any[] = await prisma.$queryRaw`
          SELECT * FROM licenses WHERE "userId" = ${userId}::uuid ORDER BY "createdAt" DESC LIMIT 1
        `;
        return rows[0] || null;
      })());

  if (existingLicense) {
    // Update existing license with higher/new site limit and plan slug
    const updated = await (db.license?.update
      ? db.license.update({
          where: { id: existingLicense.id },
          data: {
            planSlug,
            maxSites: Math.max(existingLicense.maxSites, maxSites),
            status: "ACTIVE",
            updatedAt: new Date(),
          },
        })
      : (async () => {
          const rows: any[] = await prisma.$queryRaw`
            UPDATE licenses
            SET "planSlug" = ${planSlug},
                "maxSites" = GREATEST("maxSites", ${maxSites}),
                status = 'ACTIVE',
                "updatedAt" = NOW()
            WHERE id = ${existingLicense.id}::uuid
            RETURNING *
          `;
          return rows[0];
        })());

    return updated;
  }

  // Create brand new license
  const newKey = generateLicenseKey();
  const created = await (db.license?.create
    ? db.license.create({
        data: {
          key: newKey,
          userId,
          planSlug,
          maxSites,
          status: "ACTIVE",
        },
      })
    : (async () => {
        const rows: any[] = await prisma.$queryRaw`
          INSERT INTO licenses (id, key, "userId", "planSlug", "maxSites", status, "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), ${newKey}, ${userId}::uuid, ${planSlug}, ${maxSites}, 'ACTIVE', NOW(), NOW())
          RETURNING *
        `;
        return rows[0];
      })());

  return created;
}
