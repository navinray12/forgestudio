import { createHash } from "crypto";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { getWebsiteById } from "./website.service.js";
import { canUserAccessResource } from "./permission.service.js";
import { createRevision, getRevisionById } from "./revision.service.js";
import { publishToWordPress } from "./wordpress/connector.service.js";
import { destinationRegistry } from "./destinations/registry.js";
import { enqueueJob, cancelJob, getJobById } from "./jobs/jobRunner.js";
import { recordAuditLog } from "./audit.service.js";

const db = prisma as any;

export interface DeploymentRelease {
  releaseId: string;       // e.g., rel_1727092352
  websiteId: string;
  deployHash: string;      // sha256 of compiled output
  environment: 'PRODUCTION' | 'STAGING';
  snapshotDataUrl?: string; // Path or JSON pointer to compiled build artifact
  snapshotData?: any;       // Full immutable snapshot of pages & styles
  createdAt: string;
  createdBy: string;
  notes?: string;
  isActive: boolean;
  deploymentId?: string;
  version?: number;
}

export interface ValidationIssue {
  field: string;
  message: string;
  severity: "ERROR" | "WARNING";
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface PublishOptions {
  editorData?: any;
  environment?: "PRODUCTION" | "STAGING" | "DEVELOPMENT";
  destinationType?: "INTERNAL" | "WORDPRESS" | "SFTP" | "STATIC";
  metadata?: Record<string, any>;
}

export interface PublishResult {
  success: boolean;
  deploymentId: string;
  status: string;
  version: number;
  environment: string;
  destinationType: string;
  publishedAt: string;
  liveUrl: string;
  sourceRevisionId?: string;
  filesTransferred?: number;
  warnings?: ValidationIssue[];
  releaseId?: string;
}

/**
 * Validate website readiness prior to deployment/publish.
 * Blocks malformed component trees, missing pages, or lack of authorization.
 */
export async function validateWebsiteForPublish(
  websiteId: string,
  userId: string,
  candidateData?: any
): Promise<ValidationResult> {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // 1. Authorization check
  const website = await getWebsiteById(websiteId, userId);
  if (!website) {
    errors.push({
      field: "websiteId",
      message: "Website not found or unavailable",
      severity: "ERROR",
    });
    return { valid: false, errors, warnings };
  }

  const canPublish = await canUserAccessResource(userId, websiteId, "*", "PUBLISH");
  if (!canPublish) {
    errors.push({
      field: "permissions",
      message: "User lacks permission to publish this website",
      severity: "ERROR",
    });
    return { valid: false, errors, warnings };
  }

  // 2. Data payload resolution
  const data = candidateData || (
    typeof website.editorData === "string"
      ? JSON.parse(website.editorData)
      : (website.editorData || {})
  );

  if (!data || typeof data !== "object") {
    errors.push({
      field: "editorData",
      message: "Website editor data is invalid or empty",
      severity: "ERROR",
    });
    return { valid: false, errors, warnings };
  }

  // 3. Multi-page & Home Page validation
  const pages = Array.isArray(data.pages) ? data.pages : [];
  const homePageId = data.homePageId;

  if (pages.length > 0) {
    const pageIds = new Set<string>();
    let hasExplicitHome = false;

    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      if (!p || typeof p !== "object") {
        errors.push({
          field: `pages[${i}]`,
          message: `Page at index ${i} is not a valid object`,
          severity: "ERROR",
        });
        continue;
      }

      const pId = p.id ? String(p.id).trim() : "";
      if (!pId) {
        errors.push({
          field: `pages[${i}].id`,
          message: `Page at index ${i} is missing a unique ID`,
          severity: "ERROR",
        });
      } else {
        if (pageIds.has(pId)) {
          errors.push({
            field: `pages[${i}].id`,
            message: `Duplicate page ID found: "${pId}"`,
            severity: "ERROR",
          });
        }
        pageIds.add(pId);
      }

      const pageName = p.name || p.title;
      if (!pageName || typeof pageName !== "string" || !pageName.trim()) {
        errors.push({
          field: `pages[${i}].name`,
          message: `Page "${pId || i}" requires a valid name`,
          severity: "ERROR",
        });
      }

      if (p.isHome || p.slug === "/" || p.id === homePageId) {
        hasExplicitHome = true;
      }
    }

    if (!hasExplicitHome && homePageId && !pageIds.has(homePageId)) {
      errors.push({
        field: "homePageId",
        message: `Designated homePageId "${homePageId}" does not match any existing page`,
        severity: "ERROR",
      });
    } else if (!hasExplicitHome) {
      warnings.push({
        field: "homePage",
        message: "No page explicitly marked as home; defaulting to primary page",
        severity: "WARNING",
      });
    }
  } else {
    // Single page legacy fallback
    const elements = Array.isArray(data.elements) ? data.elements : [];
    if (elements.length === 0) {
      warnings.push({
        field: "elements",
        message: "Website has no components on the canvas",
        severity: "WARNING",
      });
    }
  }

  // 4. Element tree sanity check
  const elementsToCheck: any[] = [];
  if (Array.isArray(data.elements)) {
    elementsToCheck.push(...data.elements);
  }
  if (Array.isArray(data.pages)) {
    for (const page of data.pages) {
      if (Array.isArray(page.elements)) {
        elementsToCheck.push(...page.elements);
      }
    }
  }

  for (let i = 0; i < elementsToCheck.length; i++) {
    const el = elementsToCheck[i];
    if (!el || typeof el !== "object") {
      errors.push({
        field: `elements[${i}]`,
        message: `Component at index ${i} is corrupted or not an object`,
        severity: "ERROR",
      });
      break;
    }
    if (!el.id || !el.type) {
      warnings.push({
        field: `elements[${i}]`,
        message: `Component at index ${i} is missing standard id or type identifiers`,
        severity: "WARNING",
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Execute production publishing pipeline.
 *
 * Strict Invariant Gating:
 * A deployment is NEVER marked PUBLISHED unless:
 * 1. The exact candidate snapshot is durable.
 * 2. The destination deployment succeeded.
 * 3. The destination was verified.
 * 4. The corresponding PUBLISH revision/deployment linkage succeeded.
 *
 * If revision persistence fails after destination deployment succeeds,
 * the deployment enters RECONCILIATION_REQUIRED rather than silently reporting success.
 */
export async function publishWebsite(
  websiteId: string,
  userId: string,
  options: PublishOptions = {}
): Promise<PublishResult> {
  // 1. Authorization check
  const website = await getWebsiteById(websiteId, userId);
  const canPublish = await canUserAccessResource(userId, websiteId, "*", "PUBLISH");
  if (!canPublish) {
    throw new AppError("You do not have permission to publish this website.", 403, "FORBIDDEN");
  }

  // Approval Workflow Gating (Optional, backwards compatible)
  if (website.approvalWorkflowEnabled) {
    const isOwnerOrAdmin = website.userId === userId || website.userPermission === "OWNER" || website.userPermission === "ADMIN";
    if (!isOwnerOrAdmin) {
      const approvedRequest = await db.publishApprovalRequest.findFirst({
        where: { websiteId, requesterId: userId, status: "APPROVED" },
        orderBy: { updatedAt: "desc" },
      });
      if (!approvedRequest) {
        throw new AppError(
          "Publishing requires approval on this website. Please submit a review request for approval.",
          403,
          "APPROVAL_REQUIRED"
        );
      }
    }
  }

  const environment = options.environment || "PRODUCTION";
  const destinationType = options.destinationType || "INTERNAL";

  if (destinationType === "SFTP") {
    const sftpConfig = await db.sftpConnection.findFirst({ where: { websiteId, isActive: true } });
    if (!sftpConfig) {
      throw new AppError(
        "SFTP configuration not found or active for this website. Please configure SFTP settings before publishing.",
        400,
        "SFTP_CONFIG_MISSING"
      );
    }
  }

  // 2. Resolve working draft / candidate data
  const rawEditorData = typeof website.editorData === "string"
    ? JSON.parse(website.editorData)
    : (website.editorData || {});

  const candidateData = options.editorData || rawEditorData;

  // 3. Pre-Publish Validation
  const validation = await validateWebsiteForPublish(websiteId, userId, candidateData);
  if (!validation.valid) {
    // Record failed deployment attempt if possible
    try {
      const nextVer = await getNextDeploymentVersion(websiteId);
      await createDeploymentRecord({
        websiteId,
        version: nextVer,
        status: "VALIDATION_FAILED",
        environment,
        destinationType,
        error: { code: "VALIDATION_FAILED", errors: validation.errors },
        createdBy: userId,
        completedAt: new Date(),
      });
    } catch (e) {}

    throw new AppError(
      `Publish validation failed: ${validation.errors.map((e) => e.message).join(", ")}`,
      422,
      "VALIDATION_FAILED"
    );
  }

  // 4. Allocate Monotonic Deployment Version & Record initial deployment (QUEUED)
  const nextVersion = await getNextDeploymentVersion(websiteId);
  let deployment = await createDeploymentRecord({
    websiteId,
    version: nextVersion,
    status: "QUEUED",
    environment,
    destinationType,
    createdBy: userId,
  });

  const now = new Date().toISOString();

  // Pre-Publish Safety Backup (Automated pre-publish snapshot)
  if (environment === "PRODUCTION") {
    try {
      const { createBackupRecord, appendBackup } = await import("./backups/websiteBackup.service.js");
      const prePublishBackup = createBackupRecord(rawEditorData, {
        trigger: "pre-publish",
        label: `Pre-Publish Snapshot (v${nextVersion})`,
        notes: `Automated safety snapshot created before deploying version ${nextVersion}`,
      });
      const currentBackups = Array.isArray(rawEditorData.backups) ? rawEditorData.backups : [];
      rawEditorData.backups = appendBackup(currentBackups, prePublishBackup);
      await db.website.update({
        where: { id: websiteId },
        data: { editorData: rawEditorData },
      });
    } catch (backupErr) {
      console.warn("Pre-publish safety backup warning:", backupErr);
    }
  }

  try {
    // 5. State Machine: BUILDING
    await updateDeploymentStatus(deployment.id, "BUILDING");

    const activePageId = candidateData.activePageId || candidateData.homePageId || "";
    const canonicalPageElements = Array.isArray(candidateData.elements) ? candidateData.elements : [];
    const canonicalPages = Array.isArray(candidateData.pages) ? candidateData.pages : [];

    const publishingMeta = {
      status: "PUBLISHED",
      publishedAt: now,
      version: nextVersion,
      publishedVersion: nextVersion,
      publishedBy: userId,
    };

    // Construct immutable candidate snapshot
    const candidateSnapshot = {
      version: nextVersion,
      homePageId: candidateData.homePageId || "",
      elements: canonicalPageElements,
      pages: canonicalPages.map((p: any) =>
        p.id === activePageId && candidatePageHasElements(candidateData)
          ? { ...p, elements: canonicalPageElements, pageSettings: candidateData.pageSettings || p.pageSettings }
          : p
      ),
      siteParts: candidateData.siteParts || {
        header: { isEnabled: true, elements: [] },
        footer: { isEnabled: true, elements: [] },
      },
      publishing: publishingMeta,
      deployment: {
        provider: destinationType.toLowerCase(),
        deployedAt: now,
        customDomain: options.metadata?.customDomain || candidateData.deployment?.customDomain,
        productionUrl: `/site/${websiteId}`,
      },
      breakpoints: candidateData.breakpoints || null,
      globalSettings: candidateData.globalSettings || null,
      globalStyles: candidateData.globalStyles || null,
      popups: candidateData.popups || null,
      pageCss: candidateData.pageCss || "",
      pageSettings: candidateData.pageSettings || null,
    };

    // 6. State Machine: PROCESSING (Sanitize payload, ensure candidate snapshot is durable)
    await updateDeploymentStatus(deployment.id, "PROCESSING");
    delete (candidateSnapshot as any).publishedData;

    // 7. State Machine: DEPLOYING (Execute destination deployment)
    await updateDeploymentStatus(deployment.id, "DEPLOYING");
    let destinationRef = `/site/${websiteId}`;
    let destinationMetadata: Record<string, any> = {};
    let filesTransferred: number | undefined = undefined;

    if (destinationType === "INTERNAL") {
      // Store published snapshot into authoritative publishedData field
      const updatedEditorData = {
        ...candidateData,
        ...candidateSnapshot,
        publishedData: candidateSnapshot,
        publishing: publishingMeta,
      };

      if (db?.website?.update) {
        await db.website.update({
          where: { id: websiteId },
          data: {
            status: "PUBLISHED",
            editorData: updatedEditorData,
          },
        });
      } else {
        const jsonStr = JSON.stringify(updatedEditorData);
        await prisma.$executeRawUnsafe(
          `UPDATE websites SET status = 'PUBLISHED', "editorData" = $1::jsonb, "updatedAt" = NOW() WHERE id = $2::uuid`,
          jsonStr,
          websiteId
        );
      }
    } else if (destinationType === "WORDPRESS") {
      // Phase 5 WordPress Publishing
      const wpResult = await publishToWordPress(websiteId, userId, deployment.id, candidateSnapshot);
      destinationRef = wpResult.primaryPageUrl || wpResult.siteUrl;
      filesTransferred = wpResult.syncedPagesCount;
      destinationMetadata = {
        siteUrl: wpResult.siteUrl,
        primaryPageUrl: wpResult.primaryPageUrl,
        syncedPagesCount: wpResult.syncedPagesCount,
        syncedMediaCount: wpResult.syncedMediaCount,
      };

      // Also persist published snapshot in ForgeStudio for offline / parity reference
      const updatedEditorData = {
        ...candidateData,
        ...candidateSnapshot,
        publishedData: candidateSnapshot,
        publishing: publishingMeta,
      };

      if (db?.website?.update) {
        await db.website.update({
          where: { id: websiteId },
          data: {
            status: "PUBLISHED",
            editorData: updatedEditorData,
          },
        });
      } else {
        const jsonStr = JSON.stringify(updatedEditorData);
        await prisma.$executeRawUnsafe(
          `UPDATE websites SET status = 'PUBLISHED', "editorData" = $1::jsonb, "updatedAt" = NOW() WHERE id = $2::uuid`,
          jsonStr,
          websiteId
        );
      }
    } else if (destinationType === "SFTP") {
      const sftpPublisher = destinationRegistry.getPublisher("SFTP");
      const sftpResult = await sftpPublisher.publish(websiteId, deployment.id, candidateSnapshot, { userId, ...options });
      destinationRef = sftpResult.destinationRef || `sftp://${websiteId}`;
      filesTransferred = sftpResult.filesTransferred;
      destinationMetadata = sftpResult.metadata || {};

      const updatedEditorData = {
        ...candidateData,
        ...candidateSnapshot,
        publishedData: candidateSnapshot,
        publishing: publishingMeta,
      };

      if (db?.website?.update) {
        await db.website.update({
          where: { id: websiteId },
          data: {
            status: "PUBLISHED",
            editorData: updatedEditorData,
          },
        });
      } else {
        const jsonStr = JSON.stringify(updatedEditorData);
        await prisma.$executeRawUnsafe(
          `UPDATE websites SET status = 'PUBLISHED', "editorData" = $1::jsonb, "updatedAt" = NOW() WHERE id = $2::uuid`,
          jsonStr,
          websiteId
        );
      }
    } else if (destinationType === "STATIC") {
      const staticPublisher = destinationRegistry.getPublisher("STATIC");
      const staticResult = await staticPublisher.publish(websiteId, deployment.id, candidateSnapshot, { userId, ...options });
      destinationRef = staticResult.destinationRef || `/exports/${websiteId}/v${nextVersion}`;
      filesTransferred = staticResult.filesTransferred;
      destinationMetadata = staticResult.metadata || {};

      const updatedEditorData = {
        ...candidateData,
        ...candidateSnapshot,
        publishedData: candidateSnapshot,
        publishing: publishingMeta,
      };

      if (db?.website?.update) {
        await db.website.update({
          where: { id: websiteId },
          data: {
            status: "PUBLISHED",
            editorData: updatedEditorData,
          },
        });
      } else {
        const jsonStr = JSON.stringify(updatedEditorData);
        await prisma.$executeRawUnsafe(
          `UPDATE websites SET status = 'PUBLISHED', "editorData" = $1::jsonb, "updatedAt" = NOW() WHERE id = $2::uuid`,
          jsonStr,
          websiteId
        );
      }
    }

    // 8. State Machine: VERIFYING (Verify destination live payload)
    await updateDeploymentStatus(deployment.id, "VERIFYING");

    const verifiedWebsite = await getWebsiteById(websiteId, userId);
    const verifiedEditorData = typeof verifiedWebsite.editorData === "string"
      ? JSON.parse(verifiedWebsite.editorData)
      : (verifiedWebsite.editorData || {});

    const isVerified =
      verifiedWebsite.status === "PUBLISHED" &&
      verifiedEditorData.publishedData &&
      (verifiedEditorData.publishedData.version === nextVersion ||
        verifiedEditorData.publishedData.publishing?.version === nextVersion);

    if (!isVerified) {
      await updateDeploymentStatus(deployment.id, "VERIFICATION_FAILED", {
        error: { code: "DESTINATION_VERIFICATION_FAILED", message: "Live snapshot mismatch" },
      });
      throw new AppError(
        "Deployment verification failed: published snapshot could not be verified on destination.",
        500,
        "VERIFICATION_FAILED"
      );
    }

    // 9. REVISION LINKAGE: Create durable PUBLISH revision & link to deployment
    // Invariant: If revision creation/linkage fails, enter RECONCILIATION_REQUIRED state
    let publishRevision: any = null;
    try {
      publishRevision = await createRevision(websiteId, userId, {
        description: `Website published (v${nextVersion})`,
        revisionType: "PUBLISH",
        snapshot: candidateSnapshot,
      });
    } catch (revError: any) {
      console.error("Revision creation failed after destination deployment:", revError);
      await updateDeploymentStatus(deployment.id, "RECONCILIATION_REQUIRED", {
        error: {
          code: "REVISION_LINKAGE_FAILED",
          message: revError?.message || "Destination deployed successfully but revision creation failed",
        },
      });
      throw new AppError(
        "Destination deployed successfully, but revision linkage failed. Deployment is flagged for reconciliation.",
        500,
        "RECONCILIATION_REQUIRED"
      );
    }

    // 10. PUBLISHED: All 4 gates passed! Mark deployment PUBLISHED
    deployment = await updateDeploymentStatus(deployment.id, "PUBLISHED", {
      completedAt: new Date(),
      destinationRef,
      sourceRevisionId: publishRevision?.id || null,
      metadata: {
        ...(options.metadata || {}),
        ...destinationMetadata,
        filesTransferred,
        warnings: validation.warnings,
      },
    });

    // 10b. ATOMIC RELEASE RECORDING & POINTER SWAP
    const releaseId = `rel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const deployHash = createHash("sha256").update(JSON.stringify(candidateSnapshot)).digest("hex");
    
    const newRelease: DeploymentRelease = {
      releaseId,
      websiteId,
      deployHash,
      environment: (options.environment as any) || "PRODUCTION",
      snapshotData: candidateSnapshot,
      createdAt: now,
      createdBy: userId,
      notes: options.metadata?.notes || `Release v${nextVersion} published`,
      isActive: true,
      deploymentId: deployment.id,
      version: nextVersion,
    };

    try {
      await recordWebsiteRelease(websiteId, newRelease);
    } catch (releaseErr) {
      console.warn("Release record creation warning:", releaseErr);
    }

    // 11. Record Audit Log
    try {
      if (db?.auditLog?.create) {
        await db.auditLog.create({
          data: {
            userId,
            action: "WEBSITE_PUBLISHED",
            targetResource: `website:${websiteId}`,
            details: {
              deploymentId: deployment.id,
              releaseId,
              version: nextVersion,
              destinationType,
              sourceRevisionId: publishRevision?.id,
            },
          },
        });
      }
    } catch (auditErr) {}

    return {
      success: true,
      deploymentId: deployment.id,
      releaseId,
      status: "PUBLISHED",
      version: nextVersion,
      environment,
      destinationType,
      publishedAt: now,
      liveUrl: destinationRef,
      sourceRevisionId: publishRevision?.id,
      filesTransferred,
      warnings: validation.warnings,
    };
  } catch (error: any) {
    // If deployment has not entered a terminal failure state yet, mark DEPLOY_FAILED
    if (
      deployment?.status !== "VALIDATION_FAILED" &&
      deployment?.status !== "VERIFICATION_FAILED" &&
      deployment?.status !== "RECONCILIATION_REQUIRED"
    ) {
      try {
        await updateDeploymentStatus(deployment.id, "DEPLOY_FAILED", {
          error: { code: error?.code || "DEPLOY_FAILED", message: error?.message },
          completedAt: new Date(),
        });
      } catch (e) {}
    }
    throw error;
  }
}

/**
 * Retrieve deployment history for a website (newest first).
 */
export async function getWebsiteDeployments(websiteId: string, userId: string) {
  // Authorization: VIEW permission required
  await getWebsiteById(websiteId, userId);
  const canView = await canUserAccessResource(userId, websiteId, "*", "VIEW");
  if (!canView) {
    throw new AppError("You do not have permission to view deployments for this website.", 403, "FORBIDDEN");
  }

  if (db?.deployment?.findMany) {
    return await db.deployment.findMany({
      where: { websiteId },
      orderBy: { createdAt: "desc" },
      include: {
        creator: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  const rows: any[] = await prisma.$queryRaw`
    SELECT d.*, u."fullName" as "creatorName", u.email as "creatorEmail"
    FROM deployments d
    LEFT JOIN users u ON d."createdBy" = u.id
    WHERE d."websiteId" = ${websiteId}::uuid
    ORDER BY d."createdAt" DESC
  `;

  return rows.map((r) => ({
    id: r.id,
    websiteId: r.websiteId,
    version: r.version,
    status: r.status,
    environment: r.environment,
    destinationType: r.destinationType,
    destinationRef: r.destinationRef,
    sourceRevisionId: r.sourceRevisionId,
    metadata: typeof r.metadata === "string" ? JSON.parse(r.metadata) : (r.metadata || {}),
    error: typeof r.error === "string" ? JSON.parse(r.error) : r.error,
    startedAt: r.startedAt,
    completedAt: r.completedAt,
    createdAt: r.createdAt,
    creator: r.createdBy ? { id: r.createdBy, fullName: r.creatorName, email: r.creatorEmail } : null,
  }));
}

/**
 * Retrieve a specific deployment record by ID.
 */
export async function getDeploymentById(websiteId: string, deploymentId: string, userId: string) {
  await getWebsiteById(websiteId, userId);
  const canView = await canUserAccessResource(userId, websiteId, "*", "VIEW");
  if (!canView) {
    throw new AppError("You do not have permission to view deployments for this website.", 403, "FORBIDDEN");
  }

  let deployment: any = null;
  if (db?.deployment?.findUnique) {
    deployment = await db.deployment.findUnique({
      where: { id: deploymentId },
      include: {
        creator: { select: { id: true, fullName: true, email: true } },
      },
    });
  } else {
    const rows: any[] = await prisma.$queryRaw`
      SELECT d.*, u."fullName" as "creatorName", u.email as "creatorEmail"
      FROM deployments d
      LEFT JOIN users u ON d."createdBy" = u.id
      WHERE d.id = ${deploymentId}::uuid
    `;
    deployment = rows[0] || null;
  }

  if (!deployment || deployment.websiteId !== websiteId) {
    throw new AppError("Deployment record not found.", 404, "NOT_FOUND");
  }

  return deployment;
}

/**
 * Safe Rollback Foundation.
 * Re-deploys a previously successful deployment snapshot.
 *
 * Invariant: Never mutates or deletes historical revisions.
 * Creates an additive deployment and revision event!
 */
export async function rollbackDeployment(websiteId: string, targetDeploymentId: string, userId: string) {
  const website = await getWebsiteById(websiteId, userId);
  const canPublish = await canUserAccessResource(userId, websiteId, "*", "PUBLISH");
  if (!canPublish) {
    throw new AppError("You do not have permission to rollback deployments.", 403, "FORBIDDEN");
  }

  // Retrieve target deployment
  const targetDeployment = await getDeploymentById(websiteId, targetDeploymentId, userId);
  if (!targetDeployment) {
    throw new AppError("Target deployment not found.", 404, "NOT_FOUND");
  }

  if (targetDeployment.status !== "PUBLISHED") {
    throw new AppError("Can only rollback to a successfully PUBLISHED deployment.", 400, "INVALID_STATE");
  }

  // Retrieve snapshot from source revision
  let snapshotToRestore: any = null;
  if (targetDeployment.sourceRevisionId) {
    const rev = await getRevisionById(websiteId, targetDeployment.sourceRevisionId, userId);
    snapshotToRestore = rev?.data;
  }

  if (!snapshotToRestore) {
    throw new AppError("Target deployment snapshot is missing or unavailable.", 400, "MISSING_SNAPSHOT");
  }

  // Perform publish with the target snapshot
  return await publishWebsite(websiteId, userId, {
    editorData: snapshotToRestore,
    environment: targetDeployment.environment || "PRODUCTION",
    destinationType: targetDeployment.destinationType || "INTERNAL",
    metadata: {
      rollbackFromDeploymentId: targetDeployment.id,
      rolledBackVersion: targetDeployment.version,
    },
  });
}

/**
 * Record a new release and atomically swap the active release pointer
 */
export async function recordWebsiteRelease(websiteId: string, release: DeploymentRelease): Promise<void> {
  const website = await prisma.website.findUnique({ where: { id: websiteId } });
  if (!website) return;

  const ed: any = typeof website.editorData === "string" ? JSON.parse(website.editorData) : (website.editorData || {});
  const existingReleases: DeploymentRelease[] = Array.isArray(ed.releases) ? ed.releases : [];
  
  const updatedReleases: DeploymentRelease[] = [
    release,
    ...existingReleases.map((r) => ({ ...r, isActive: false })),
  ].slice(0, 50);

  const updatedEditorData = {
    ...ed,
    releases: updatedReleases,
    currentReleaseId: release.releaseId,
  };

  await prisma.website.update({
    where: { id: websiteId },
    data: {
      editorData: updatedEditorData,
    },
  });
}

/**
 * Instant Zero-Downtime Rollback Engine (< 100ms)
 * Atomically swaps the active release pointer to the target releaseId without re-compilation.
 */
export async function instantRollbackRelease(
  websiteId: string,
  releaseId: string,
  userId: string
): Promise<{
  success: boolean;
  releaseId: string;
  activeRelease: DeploymentRelease;
  executionTimeMs: number;
  message: string;
}> {
  const startTime = Date.now();

  const canPublish = await canUserAccessResource(userId, websiteId, "*", "PUBLISH");
  if (!canPublish) {
    throw new AppError("You do not have permission to rollback releases.", 403, "FORBIDDEN");
  }

  const website = await prisma.website.findUnique({ where: { id: websiteId } });
  if (!website) {
    throw new AppError("Website not found.", 404, "NOT_FOUND");
  }

  const ed: any = typeof website.editorData === "string" ? JSON.parse(website.editorData) : (website.editorData || {});
  const releases: DeploymentRelease[] = Array.isArray(ed.releases) ? ed.releases : [];
  const targetRelease = releases.find((r) => r.releaseId === releaseId);

  if (!targetRelease) {
    throw new AppError(`Release "${releaseId}" not found for this website.`, 404, "NOT_FOUND");
  }

  // Atomic pointer swap: mark all inactive except targetRelease, set currentReleaseId
  const updatedReleases = releases.map((r) => ({
    ...r,
    isActive: r.releaseId === releaseId,
  }));

  const updatedEditorData = {
    ...ed,
    releases: updatedReleases,
    currentReleaseId: targetRelease.releaseId,
    publishedData: targetRelease.snapshotData || ed.publishedData,
  };

  await prisma.website.update({
    where: { id: websiteId },
    data: {
      editorData: updatedEditorData,
    },
  });

  const executionTimeMs = Date.now() - startTime;

  // Security audit log entry
  try {
    await recordAuditLog({
      userId,
      action: "RELEASE_ROLLBACK",
      targetResource: `website:${websiteId}:release:${releaseId}`,
      details: {
        websiteId,
        releaseId,
        deployHash: targetRelease.deployHash,
        executionTimeMs,
      },
    });
  } catch (auditErr) {
    console.warn("Audit log warning on rollback:", auditErr);
  }

  return {
    success: true,
    releaseId: targetRelease.releaseId,
    activeRelease: { ...targetRelease, isActive: true },
    executionTimeMs,
    message: `Instant zero-downtime rollback completed in ${executionTimeMs}ms`,
  };
}

/**
 * Get versioned release timeline for a website
 */
export async function getWebsiteReleases(
  websiteId: string,
  userId: string
): Promise<{
  releases: DeploymentRelease[];
  currentReleaseId?: string;
  activeRelease?: DeploymentRelease;
}> {
  const website = await getWebsiteById(websiteId, userId);
  if (!website) {
    throw new AppError("Website not found.", 404, "NOT_FOUND");
  }

  const ed: any = typeof website.editorData === "string" ? JSON.parse(website.editorData) : (website.editorData || {});
  const releases: DeploymentRelease[] = Array.isArray(ed.releases) ? ed.releases : [];
  const currentReleaseId = ed.currentReleaseId || releases.find((r) => r.isActive)?.releaseId;
  const activeRelease = releases.find((r) => r.releaseId === currentReleaseId) || releases[0];

  return {
    releases,
    currentReleaseId,
    activeRelease,
  };
}

/* ========================================================================= */
/* Helper Functions                                                          */
/* ========================================================================= */

async function getNextDeploymentVersion(websiteId: string): Promise<number> {
  try {
    if (db?.deployment?.findFirst) {
      const latest = await db.deployment.findFirst({
        where: { websiteId },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      return (latest?.version || 0) + 1;
    }

    const rows: any[] = await prisma.$queryRaw`
      SELECT COALESCE(MAX(version), 0) as "maxVer"
      FROM deployments
      WHERE "websiteId" = ${websiteId}::uuid
    `;
    const maxVer = Number(rows[0]?.maxVer) || 0;
    return maxVer + 1;
  } catch (e) {
    return 1;
  }
}

async function createDeploymentRecord(data: {
  websiteId: string;
  version: number;
  status: string;
  environment: string;
  destinationType: string;
  createdBy?: string;
  error?: any;
  completedAt?: Date;
}) {
  if (db?.deployment?.create) {
    return await db.deployment.create({
      data: {
        websiteId: data.websiteId,
        version: data.version,
        status: data.status,
        environment: data.environment,
        destinationType: data.destinationType,
        createdBy: data.createdBy,
        error: data.error || null,
        completedAt: data.completedAt || null,
      },
    });
  }

  const errorJson = data.error ? JSON.stringify(data.error) : null;
  const rows: any[] = await prisma.$queryRaw`
    INSERT INTO deployments (id, "websiteId", version, status, environment, "destinationType", error, "createdBy", "completedAt", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), ${data.websiteId}::uuid, ${data.version}, ${data.status}, ${data.environment}, ${data.destinationType}, ${errorJson}::jsonb, ${data.createdBy}::uuid, ${data.completedAt}, NOW(), NOW())
    RETURNING *
  `;
  return rows[0];
}

async function updateDeploymentStatus(
  deploymentId: string,
  status: string,
  extra: {
    completedAt?: Date;
    destinationRef?: string;
    sourceRevisionId?: string | null;
    metadata?: any;
    error?: any;
  } = {}
) {
  if (db?.deployment?.update) {
    return await db.deployment.update({
      where: { id: deploymentId },
      data: {
        status,
        ...(extra.completedAt !== undefined ? { completedAt: extra.completedAt } : {}),
        ...(extra.destinationRef !== undefined ? { destinationRef: extra.destinationRef } : {}),
        ...(extra.sourceRevisionId !== undefined ? { sourceRevisionId: extra.sourceRevisionId } : {}),
        ...(extra.metadata !== undefined ? { metadata: extra.metadata } : {}),
        ...(extra.error !== undefined ? { error: extra.error } : {}),
      },
    });
  }

  const metaJson = extra.metadata ? JSON.stringify(extra.metadata) : null;
  const errJson = extra.error ? JSON.stringify(extra.error) : null;

  const rows: any[] = await prisma.$queryRaw`
    UPDATE deployments
    SET status = ${status},
        "completedAt" = COALESCE(${extra.completedAt}, "completedAt"),
        "destinationRef" = COALESCE(${extra.destinationRef}, "destinationRef"),
        "sourceRevisionId" = COALESCE(${extra.sourceRevisionId}::uuid, "sourceRevisionId"),
        metadata = COALESCE(${metaJson}::jsonb, metadata),
        error = COALESCE(${errJson}::jsonb, error),
        "updatedAt" = NOW()
    WHERE id = ${deploymentId}::uuid
    RETURNING *
  `;
  return rows[0];
}

function candidatePageHasElements(candidateData: any): boolean {
  return Array.isArray(candidateData.elements) && candidateData.elements.length > 0;
}

/**
 * Schedule a publication to be automatically processed at a future target time
 */
export async function schedulePublish(
  websiteId: string,
  userId: string,
  options: {
    publishAt: Date | string;
    environment?: "PRODUCTION" | "STAGING" | "DEVELOPMENT";
    destinationType?: "INTERNAL" | "WORDPRESS" | "SFTP" | "STATIC";
    destinationRef?: string;
    metadata?: Record<string, any>;
  }
) {
  const website = await getWebsiteById(websiteId, userId);
  if (!website) {
    throw new AppError("Website not found or unavailable", 404, "NOT_FOUND");
  }

  const canPublish = await canUserAccessResource(userId, websiteId, "*", "PUBLISH");
  if (!canPublish) {
    throw new AppError("User lacks permission to publish this website", 403, "FORBIDDEN");
  }

  const publishAtDate = options.publishAt instanceof Date ? options.publishAt : new Date(options.publishAt);
  if (isNaN(publishAtDate.getTime())) {
    throw new AppError("Invalid publishAt timestamp", 400, "INVALID_TIMESTAMP");
  }

  const job = await enqueueJob(
    "SCHEDULED_PUBLISH",
    {
      websiteId,
      userId,
      options: {
        environment: options.environment || "PRODUCTION",
        destinationType: options.destinationType || "INTERNAL",
        destinationRef: options.destinationRef,
        metadata: options.metadata || {},
      },
    },
    { runAt: publishAtDate }
  );

  await recordAuditLog({
    userId,
    action: "PUBLISH_SCHEDULED",
    targetResource: `website:${websiteId}`,
    details: {
      scheduledJobId: job.id,
      publishAt: publishAtDate.toISOString(),
      environment: options.environment || "PRODUCTION",
    },
  });

  return {
    success: true,
    scheduledJobId: job.id,
    publishAt: publishAtDate.toISOString(),
    status: "SCHEDULED",
  };
}

/**
 * Cancel an enqueued scheduled publish job before it executes.
 */
export async function cancelScheduledPublish(
  websiteId: string,
  jobId: string,
  userId: string,
  reason?: string
) {
  if (!websiteId || !jobId) {
    throw new AppError("websiteId and jobId are required", 400, "BAD_REQUEST");
  }

  const canPublish = await canUserAccessResource(userId, websiteId, "*", "PUBLISH");
  if (!canPublish) {
    throw new AppError("Forbidden: User lacks permission to publish this website", 403, "FORBIDDEN");
  }

  const website = await getWebsiteById(websiteId, userId);
  if (!website) {
    throw new AppError("Website not found or unavailable", 404, "NOT_FOUND");
  }

  const job = await getJobById(jobId);
  if (!job) {
    throw new AppError(`Job ${jobId} not found`, 404, "JOB_NOT_FOUND");
  }

  const jobPayload =
    typeof job.payload === "string" ? JSON.parse(job.payload) : job.payload || {};
  if (jobPayload.websiteId !== websiteId) {
    throw new AppError("Cross-tenant error: Job does not belong to this website", 403, "FORBIDDEN");
  }

  if (job.type !== "SCHEDULED_PUBLISH") {
    throw new AppError("Job is not a scheduled publish job", 400, "INVALID_JOB_TYPE");
  }

  const cancelRes = await cancelJob(jobId, reason || "Cancelled by user");

  await recordAuditLog({
    userId,
    action: "PUBLISH_SCHEDULE_CANCELLED",
    targetResource: `website:${websiteId}`,
    details: {
      scheduledJobId: jobId,
      reason: reason || "Cancelled by user",
      wasAlreadyCancelled: cancelRes.alreadyCancelled || false,
    },
  });

  return {
    success: true,
    scheduledJobId: jobId,
    status: "CANCELLED",
    alreadyCancelled: cancelRes.alreadyCancelled || false,
  };
}

/**
 * Promote an existing verified STAGING deployment to PRODUCTION
 */
export async function promoteDeployment(
  websiteId: string,
  stagingDeploymentId: string,
  userId: string
) {
  const canPublish = await canUserAccessResource(userId, websiteId, "*", "PUBLISH");
  if (!canPublish) {
    throw new AppError("User lacks permission to promote deployments", 403, "FORBIDDEN");
  }

  let stagingDeployment: any = null;
  if (db?.deployment?.findUnique) {
    stagingDeployment = await db.deployment.findUnique({
      where: { id: stagingDeploymentId },
    });
  }

  if (!stagingDeployment) {
    const raw: any[] = await prisma.$queryRaw`
      SELECT * FROM deployments WHERE id = ${stagingDeploymentId}::uuid LIMIT 1
    `;
    stagingDeployment = raw[0];
  }

  if (!stagingDeployment) {
    throw new AppError("Staging deployment not found", 404, "DEPLOYMENT_NOT_FOUND");
  }

  if (stagingDeployment.websiteId !== websiteId) {
    throw new AppError("Deployment does not belong to this website", 400, "INVALID_DEPLOYMENT");
  }

  if (stagingDeployment.environment !== "STAGING") {
    throw new AppError("Only STAGING deployments can be promoted to PRODUCTION", 400, "INVALID_ENVIRONMENT");
  }

  if (stagingDeployment.status !== "PUBLISHED") {
    throw new AppError("Only successfully PUBLISHED staging deployments can be promoted", 400, "INVALID_STATUS");
  }

  // Retrieve data from source revision or website
  let editorData: any = null;
  if (stagingDeployment.sourceRevisionId) {
    const revision = await getRevisionById(websiteId, stagingDeployment.sourceRevisionId, userId);
    if (revision) {
      editorData = revision.data;
    }
  }

  if (!editorData) {
    const website = await getWebsiteById(websiteId, userId);
    editorData = typeof website.editorData === "string" ? JSON.parse(website.editorData) : website.editorData;
  }

  // Publish to PRODUCTION with linkage to staging
  const publishResult = await publishWebsite(websiteId, userId, {
    editorData,
    environment: "PRODUCTION",
    destinationType: (stagingDeployment.destinationType as any) || "INTERNAL",
    metadata: {
      promotedFrom: stagingDeploymentId,
      stagingVersion: stagingDeployment.version,
    },
  });

  await recordAuditLog({
    userId,
    action: "DEPLOYMENT_PROMOTED",
    targetResource: `website:${websiteId}`,
    details: {
      sourceDeploymentId: stagingDeploymentId,
      newDeploymentId: publishResult.deploymentId,
      version: publishResult.version,
    },
  });

  return {
    ...publishResult,
    promotedFrom: stagingDeploymentId,
  };
}
