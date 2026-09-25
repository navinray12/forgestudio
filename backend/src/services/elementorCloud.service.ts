import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { recordAuditLog } from "./audit.service.js";

const db = prisma as any;

export interface ElementorCloudBundle {
  id: string;
  websiteId: string;
  name: string;
  primaryDomain: string;
  wpVersion: string;
  elementorVersion: string;
  sslActive: boolean;
  backupPolicy: {
    enabled: boolean;
    frequency: string;
    retainDays: number;
  };
  securityStatus: "CLEAN" | "WARNING" | "CRITICAL";
  cdnActive: boolean;
  status: "PROVISIONING" | "ACTIVE" | "SUSPENDED" | "TERMINATED";
  createdAt: string;
  updatedAt: string;
}

/**
 * Provision a new Elementor Cloud Website managed hosting bundle (X-804).
 */
export async function createElementorCloudBundle(
  userId: string,
  input: { name: string; domain?: string }
): Promise<ElementorCloudBundle> {
  const name = input.name?.trim();
  if (!name) {
    throw new AppError("Website name is required for Elementor Cloud bundle", 400, "BAD_REQUEST");
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const primaryDomain = input.domain?.trim() || `${slug}.elementorcloud.forge`;

  // 1. Create Website record in Database
  const website = await db.website.create({
    data: {
      name,
      slug,
      userId,
      status: "PUBLISHED",
      editorData: {
        version: 1,
        pages: [
          {
            id: "page_home",
            name: "Home",
            slug: "home",
            isHome: true,
            title: `${name} — Managed Elementor Cloud Site`,
          },
        ],
        hostingConfig: {
          elementorCloud: true,
          wpVersion: "6.4.3",
          elementorVersion: "3.19.0",
          sslActive: true,
          cdn: { cloudflareEnabled: true },
          siteLock: { enabled: false },
          privacy: { noIndex: false, maintenanceMode: false },
          backupPolicy: { enabled: true, cronExpression: "0 2 * * *", retainCount: 14, trigger: "scheduled" },
        },
      },
    },
  });

  const bundle: ElementorCloudBundle = {
    id: `ecb_${website.id.slice(0, 8)}`,
    websiteId: website.id,
    name: website.name,
    primaryDomain,
    wpVersion: "6.4.3",
    elementorVersion: "3.19.0 Pro",
    sslActive: true,
    backupPolicy: {
      enabled: true,
      frequency: "Daily at 02:00 UTC",
      retainDays: 14,
    },
    securityStatus: "CLEAN",
    cdnActive: true,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await recordAuditLog({
    userId,
    action: "ELEMENTOR_CLOUD_BUNDLE_PROVISIONED",
    targetResource: `website:${website.id}`,
    details: { bundleId: bundle.id, primaryDomain },
  });

  return bundle;
}

/**
 * Get details of an Elementor Cloud Website bundle.
 */
export async function getElementorCloudBundle(websiteId: string, userId: string): Promise<ElementorCloudBundle> {
  const website = await db.website.findUnique({ where: { id: websiteId } });
  if (!website) {
    throw new AppError("Elementor Cloud Website bundle not found", 404, "NOT_FOUND");
  }

  if (website.userId !== userId) {
    throw new AppError("Unauthorized access to website bundle", 403, "FORBIDDEN");
  }

  const editorData = typeof website.editorData === "string"
    ? JSON.parse(website.editorData)
    : (website.editorData || {});
  const hostingConfig = editorData.hostingConfig || {};

  return {
    id: `ecb_${website.id.slice(0, 8)}`,
    websiteId: website.id,
    name: website.name,
    primaryDomain: `${website.slug}.elementorcloud.forge`,
    wpVersion: hostingConfig.wpVersion || "6.4.3",
    elementorVersion: hostingConfig.elementorVersion || "3.19.0 Pro",
    sslActive: hostingConfig.sslActive ?? true,
    backupPolicy: {
      enabled: hostingConfig.backupPolicy?.enabled ?? true,
      frequency: "Daily at 02:00 UTC",
      retainDays: hostingConfig.backupPolicy?.retainCount ?? 14,
    },
    securityStatus: hostingConfig.lastSecurityAudit?.status || "CLEAN",
    cdnActive: hostingConfig.cdn?.cloudflareEnabled ?? true,
    status: "ACTIVE",
    createdAt: website.createdAt ? new Date(website.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: website.updatedAt ? new Date(website.updatedAt).toISOString() : new Date().toISOString(),
  };
}
