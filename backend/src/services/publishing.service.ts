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
import { compileCanonicalToStaticBundle } from "./destinations/staticCompiler.js";
import { isApprovedSnapshotMatch } from "./approval.service.js";

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

  // Approval Workflow Gating (Optional, backwards compatible)
  let claimedApprovalId: string | null = null;
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

      // Verify that candidate content strictly matches the approved review snapshot
      if (!isApprovedSnapshotMatch(approvedRequest.snapshot, candidateData)) {
        throw new AppError(
          "Publishing rejected: Current editor content differs from the approved review snapshot.",
          400,
          "SNAPSHOT_MISMATCH"
        );
      }

      // Atomically claim the approval to prevent concurrent replay / race conditions
      const claimResult = await db.publishApprovalRequest.updateMany({
        where: { id: approvedRequest.id, status: "APPROVED" },
        data: { status: "CONSUMING" },
      });

      if (claimResult.count === 0) {
        throw new AppError(
          "This approval request is currently being published or has already been consumed.",
          409,
          "APPROVAL_ALREADY_IN_USE"
        );
      }

      claimedApprovalId = approvedRequest.id;
    }
  }

  let deployment: any = null;

  try {
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
    deployment = await createDeploymentRecord({
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

    // 5. State Machine: BUILDING
    await updateDeploymentStatus(deployment.id, "BUILDING");

    const activePageId = candidateData.activePageId || candidateData.homePageId || "";
    const canonicalPageElements = Array.isArray(candidateData.elements) ? candidateData.elements : [];
    const canonicalPages = Array.isArray(candidateData.pages) ? candidateData.pages : [];

    // Feature 12: Validate build completion and artifact generation
    try {
      const buildBundle = compileCanonicalToStaticBundle(websiteId, nextVersion, {
        ...candidateData,
        elements: canonicalPageElements,
        pages: canonicalPages,
      });

      if (!buildBundle || !Array.isArray(buildBundle.files) || buildBundle.files.length === 0) {
        throw new Error("Build compilation produced an empty file bundle");
      }
      const hasHtml = buildBundle.files.some((f) => f.path.endsWith(".html") && f.size > 0);
      if (!hasHtml) {
        throw new Error("Build compilation produced no readable HTML artifacts");
      }
    } catch (buildErr: any) {
      deployment = await updateDeploymentStatus(deployment.id, "BUILD_FAILED", {
        error: {
          code: "BUILD_COMPILATION_FAILED",
          message: buildErr?.message || "Build compilation failed",
        },
        completedAt: new Date(),
      });
      throw new AppError(
        `Build compilation failed: ${buildErr?.message || "Failed to compile site structure"}`,
        400,
        "BUILD_FAILED"
      );
    }

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
        pageMappings: wpResult.pageMappings,
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

    const publisher = destinationRegistry.getPublisher(destinationType);
    const verifyResult = await publisher.verify(websiteId, deployment.id, {
      version: nextVersion,
      liveUrl: destinationRef,
      userId,
    });

    if (!verifyResult.verified) {
      deployment = await updateDeploymentStatus(deployment.id, "VERIFICATION_FAILED", {
        error: {
          code: "DESTINATION_VERIFICATION_FAILED",
          message: verifyResult.error || "Destination verification check failed",
          statusCode: verifyResult.statusCode,
          latencyMs: verifyResult.latencyMs,
        },
        completedAt: new Date(),
      });
      throw new AppError(
        `Deployment verification failed: ${verifyResult.error || "Destination could not be verified"}`,
        500,
        "VERIFICATION_FAILED"
      );
    }

    // 9. REVISION LINKAGE: Create durable PUBLISH/RESTORE revision & link to deployment
    // Invariant: If revision creation/linkage fails, enter RECONCILIATION_REQUIRED state
    const isRollback = Boolean(options.metadata?.isRollback || options.metadata?.rollbackFromDeploymentId);
    const rolledBackVersion = options.metadata?.rolledBackVersion;
    const revDesc = isRollback
      ? `Website rolled back to v${rolledBackVersion} (v${nextVersion})`
      : `Website published (v${nextVersion})`;
    const revType = isRollback ? "RESTORE" : "PUBLISH";

    let publishRevision: any = null;
    try {
      publishRevision = await createRevision(websiteId, userId, {
        description: revDesc,
        revisionType: revType,
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

    // If an approval was claimed for this publish operation, mark it CONSUMED atomically
    if (claimedApprovalId) {
      await db.publishApprovalRequest.updateMany({
        where: { id: claimedApprovalId },
        data: { status: "CONSUMED" },
      });

      try {
        await db.auditLog.create({
          data: {
            userId,
            action: "PUBLISH_APPROVAL_CONSUMED",
            targetResource: `website:${websiteId}`,
            details: {
              requestId: claimedApprovalId,
              deploymentId: deployment.id,
              version: nextVersion,
            },
          },
        });
      } catch (_) {}
    }

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
      notes: options.metadata?.notes || (isRollback ? `Rollback to v${rolledBackVersion} (v${nextVersion})` : `Release v${nextVersion} published`),
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
    // Revert claimed approval if deployment failed prior to successful PUBLISHED state
    if (claimedApprovalId) {
      try {
        await db.publishApprovalRequest.updateMany({
          where: { id: claimedApprovalId, status: "CONSUMING" },
          data: { status: "APPROVED" },
        });
      } catch (_) {}
    }
    // If deployment has not entered a terminal failure state yet, mark DEPLOY_FAILED
    if (
      deployment?.id &&
      deployment?.status !== "VALIDATION_FAILED" &&
      deployment?.status !== "VERIFICATION_FAILED" &&
      deployment?.status !== "RECONCILIATION_REQUIRED" &&
      deployment?.status !== "BUILD_FAILED" &&
      error?.code !== "BUILD_FAILED" &&
      error?.code !== "VERIFICATION_FAILED" &&
      error?.code !== "RECONCILIATION_REQUIRED" &&
      error?.code !== "VALIDATION_FAILED"
    ) {
      try {
        await updateDeploymentStatus(deployment.id, "DEPLOY_FAILED", {
          error: { code: error?.code || "DEPLOY_FAILED", message: error?.message || "Publishing failed" },
          completedAt: new Date(),
        });
      } catch (persistenceError) {
        console.error("Could not record deployment failure", { deploymentId: deployment.id });
      }
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

  let list: any[] = [];
  if (db?.deployment?.findMany) {
    list = await db.deployment.findMany({
      where: { websiteId },
      orderBy: { createdAt: "desc" },
      include: {
        creator: { select: { id: true, fullName: true, email: true } },
      },
    });
  } else {
    const rows: any[] = await prisma.$queryRaw`
      SELECT d.*, u."fullName" as "creatorName", u.email as "creatorEmail"
      FROM deployments d
      LEFT JOIN users u ON d."createdBy" = u.id
      WHERE d."websiteId" = ${websiteId}::uuid
      ORDER BY d."createdAt" DESC
    `;

    list = rows.map((r) => ({
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

  return list.map((d: any) => ({
    ...d,
    metadata: sanitizeDeploymentData(d.metadata),
    error: sanitizeDeploymentData(d.error),
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

  return {
    ...deployment,
    metadata: sanitizeDeploymentData(deployment.metadata),
    error: sanitizeDeploymentData(deployment.error),
  };
}

/**
 * Idempotently verify an existing deployment without creating duplicate deployment records.
 */
export async function verifyDeployment(
  websiteId: string,
  deploymentId: string,
  userId: string
) {
  // Authorization: PUBLISH permission required to trigger verification
  await getWebsiteById(websiteId, userId);
  const canPublish = await canUserAccessResource(userId, websiteId, "*", "PUBLISH");
  if (!canPublish) {
    throw new AppError("You do not have permission to verify deployments for this website.", 403, "FORBIDDEN");
  }

  const deployment = await getDeploymentById(websiteId, deploymentId, userId);

  // Pre-flight lifecycle checks: terminal non-verifiable states
  if (deployment.status === "ROLLED_BACK") {
    throw new AppError("Deployment has been rolled back and cannot be verified.", 409, "INVALID_STATE_TRANSITION");
  }
  if (deployment.status === "BUILD_FAILED") {
    throw new AppError("Deployment build failed; cannot verify unbuilt deployment.", 422, "INVALID_STATE_TRANSITION");
  }
  if (deployment.status === "VALIDATION_FAILED") {
    throw new AppError("Deployment validation failed; cannot verify invalid deployment.", 422, "INVALID_STATE_TRANSITION");
  }
  if (deployment.status === "DEPLOY_FAILED" || deployment.status === "DEPLOYMENT_FAILED") {
    throw new AppError("Deployment failed during transmission; cannot verify un-deployed deployment.", 422, "INVALID_STATE_TRANSITION");
  }

  // 1. Persist intermediate state: VERIFYING so concurrent inspectors see active verification
  const verifyingDeployment = await updateDeploymentStatus(deployment.id, "VERIFYING", {
    completedAt: null,
  });
  const preVerifyUpdatedAt = verifyingDeployment?.updatedAt
    ? new Date(verifyingDeployment.updatedAt)
    : new Date();

  let verifyResult: any;
  try {
    const publisher = destinationRegistry.getPublisher(deployment.destinationType || "INTERNAL");
    verifyResult = await publisher.verify(websiteId, deployment.id, {
      version: deployment.version,
      liveUrl: deployment.destinationRef,
      userId,
    });
  } catch (err: any) {
    // Invariant: intermediate states must never be left indefinitely after handled failures
    const errorMsg = err?.message || "Unhandled verification error";
    const failureStatus = "VERIFICATION_FAILED";
    await updateDeploymentStatus(deployment.id, failureStatus, {
      completedAt: new Date(),
      error: {
        code: "DESTINATION_VERIFICATION_EXCEPTION",
        message: errorMsg,
      },
    });
    return {
      success: false,
      verified: false,
      deploymentId: deployment.id,
      status: failureStatus,
      destinationType: deployment.destinationType,
      statusCode: err?.statusCode || 500,
      latencyMs: 0,
      error: errorMsg,
    };
  }

  const existingMetadata =
    typeof deployment.metadata === "string"
      ? JSON.parse(deployment.metadata)
      : (deployment.metadata || {});

  const updatedMetadata = {
    ...existingMetadata,
    verification: {
      verifiedAt: new Date().toISOString(),
      latencyMs: verifyResult.latencyMs,
      statusCode: verifyResult.statusCode,
      details: verifyResult.details,
      error: verifyResult.error || null,
    },
  };

  if (verifyResult.verified) {
    const newStatus = "PUBLISHED";
    await updateDeploymentStatus(deployment.id, newStatus, {
      metadata: updatedMetadata,
      error: null,
      completedAt: new Date(),
      ifNotNewerThan: preVerifyUpdatedAt,
    });
    return {
      success: true,
      verified: true,
      deploymentId: deployment.id,
      status: newStatus,
      destinationType: deployment.destinationType,
      statusCode: verifyResult.statusCode || 200,
      latencyMs: verifyResult.latencyMs,
      details: verifyResult.details,
    };
  } else {
    const newStatus = "VERIFICATION_FAILED";
    await updateDeploymentStatus(deployment.id, newStatus, {
      metadata: updatedMetadata,
      error: {
        code: "DESTINATION_VERIFICATION_FAILED",
        message: verifyResult.error,
        statusCode: verifyResult.statusCode,
      },
      completedAt: new Date(),
      ifNotNewerThan: preVerifyUpdatedAt,
    });
    return {
      success: false,
      verified: false,
      deploymentId: deployment.id,
      status: newStatus,
      destinationType: deployment.destinationType,
      statusCode: verifyResult.statusCode || 500,
      latencyMs: verifyResult.latencyMs,
      error: verifyResult.error,
    };
  }
}

/**
 * Retry or recover a failed deployment (BUILD_FAILED, DEPLOY_FAILED, VERIFICATION_FAILED).
 * Re-runs the appropriate pipeline steps idempotently and updates the existing deployment.
 */
export async function retryDeployment(
  websiteId: string,
  deploymentId: string,
  userId: string
) {
  // Authorization: PUBLISH permission required
  await getWebsiteById(websiteId, userId);
  const canPublish = await canUserAccessResource(userId, websiteId, "*", "PUBLISH");
  if (!canPublish) {
    throw new AppError("You do not have permission to retry deployments for this website.", 403, "FORBIDDEN");
  }

  const deployment = await getDeploymentById(websiteId, deploymentId, userId);

  // Terminal non-retriable states
  if (deployment.status === "ROLLED_BACK") {
    throw new AppError("Deployment has been rolled back and cannot be retried.", 409, "INVALID_STATE_TRANSITION");
  }

  // If already published, verify idempotently and return active status
  if (deployment.status === "PUBLISHED") {
    const verif = await verifyDeployment(websiteId, deployment.id, userId);
    return {
      success: true,
      verified: verif.verified,
      deploymentId: deployment.id,
      status: "PUBLISHED",
      version: deployment.version,
      environment: deployment.environment,
      destinationType: deployment.destinationType,
      statusCode: verif.statusCode || 200,
      latencyMs: verif.latencyMs || 0,
      details: verif.details,
    };
  }

  // If failure was strictly at destination verification stage, re-verify directly
  if (deployment.status === "VERIFICATION_FAILED") {
    const verif = await verifyDeployment(websiteId, deployment.id, userId);
    return {
      success: verif.verified,
      verified: verif.verified,
      deploymentId: deployment.id,
      status: verif.status,
      version: deployment.version,
      environment: deployment.environment,
      destinationType: deployment.destinationType,
      statusCode: verif.statusCode,
      latencyMs: verif.latencyMs,
      details: verif.details,
      error: verif.error,
    };
  }

  // For BUILD_FAILED, DEPLOY_FAILED, or intermediate failed states:
  const website = await getWebsiteById(websiteId, userId);
  const rawEditorData =
    typeof website.editorData === "string"
      ? JSON.parse(website.editorData)
      : website.editorData || {};
  const candidateData = rawEditorData.publishedData || rawEditorData;

  const canonicalPageElements = Array.isArray(candidateData.elements) ? candidateData.elements : [];
  const canonicalPages = Array.isArray(candidateData.pages) ? candidateData.pages : [];

  // Step 1: Re-build if build failed
  if (deployment.status === "BUILD_FAILED" || deployment.status === "VALIDATION_FAILED") {
    await updateDeploymentStatus(deployment.id, "BUILDING", { error: null });
    try {
      const buildBundle = compileCanonicalToStaticBundle(websiteId, deployment.version, {
        ...candidateData,
        elements: canonicalPageElements,
        pages: canonicalPages,
      });
      if (!buildBundle || !Array.isArray(buildBundle.files) || buildBundle.files.length === 0) {
        throw new Error("Build compilation produced an empty file bundle");
      }
      const hasHtml = buildBundle.files.some((f) => f.path.endsWith(".html") && f.size > 0);
      if (!hasHtml) {
        throw new Error("Build compilation produced no readable HTML artifacts");
      }
    } catch (buildErr: any) {
      await updateDeploymentStatus(deployment.id, "BUILD_FAILED", {
        error: {
          code: "BUILD_COMPILATION_FAILED",
          message: buildErr?.message || "Build compilation failed",
        },
        completedAt: new Date(),
      });
      return {
        success: false,
        verified: false,
        deploymentId: deployment.id,
        status: "BUILD_FAILED",
        version: deployment.version,
        environment: deployment.environment,
        destinationType: deployment.destinationType,
        statusCode: 422,
        error: buildErr?.message || "Build compilation failed",
      };
    }
  }

  // Step 2: Destination deployment
  await updateDeploymentStatus(deployment.id, "PROCESSING");
  await updateDeploymentStatus(deployment.id, "DEPLOYING", { error: null });

  let destinationRef = deployment.destinationRef || `/site/${websiteId}`;

  try {
    const destinationType = deployment.destinationType || "INTERNAL";
    if (destinationType === "INTERNAL") {
      const publishingMeta = {
        status: "PUBLISHED",
        publishedAt: new Date().toISOString(),
        version: deployment.version,
        publishedVersion: deployment.version,
        publishedBy: userId,
      };
      const updatedEditorData = {
        ...candidateData,
        publishedData: candidateData,
        publishing: publishingMeta,
      };
      if (db?.website?.update) {
        await db.website.update({
          where: { id: websiteId },
          data: { status: "PUBLISHED", editorData: updatedEditorData },
        });
      }
    } else if (destinationType === "WORDPRESS") {
      const wpResult = await publishToWordPress(websiteId, userId, deployment.id, candidateData);
      destinationRef = wpResult.primaryPageUrl || wpResult.siteUrl;
    }
  } catch (deployErr: any) {
    await updateDeploymentStatus(deployment.id, "DEPLOY_FAILED", {
      error: { code: "DEPLOY_TRANSMISSION_FAILED", message: deployErr?.message || "Deployment transmission failed" },
      completedAt: new Date(),
    });
    return {
      success: false,
      verified: false,
      deploymentId: deployment.id,
      status: "DEPLOY_FAILED",
      version: deployment.version,
      environment: deployment.environment,
      destinationType: deployment.destinationType,
      statusCode: 502,
      error: deployErr?.message || "Deployment transmission failed",
    };
  }

  // Step 3: Destination verification
  const verifResult = await verifyDeployment(websiteId, deployment.id, userId);
  return {
    success: verifResult.verified,
    verified: verifResult.verified,
    deploymentId: deployment.id,
    status: verifResult.status,
    version: deployment.version,
    environment: deployment.environment,
    destinationType: deployment.destinationType,
    statusCode: verifResult.statusCode,
    latencyMs: verifResult.latencyMs,
    details: verifResult.details,
    error: verifResult.error,
  };
}

/**
 * Safe Rollback Foundation.
 * Re-deploys a previously successful deployment snapshot.
 *
 * Invariant: Never mutates or deletes historical revisions.
 * Creates an additive deployment and revision event!
 */
export async function rollbackDeployment(websiteId: string, targetDeploymentId: string, userId: string) {
  // 1. Authorization: check workspace ownership/access and PUBLISH/ROLLBACK capability
  const website = await getWebsiteById(websiteId, userId);
  const canPublish = await canUserAccessResource(userId, websiteId, "*", "PUBLISH");
  if (!canPublish) {
    throw new AppError("You do not have permission to rollback deployments.", 403, "FORBIDDEN");
  }

  // 2. Retrieve target deployment and ensure it exists on this website
  const targetDeployment = await getDeploymentById(websiteId, targetDeploymentId, userId);
  if (!targetDeployment) {
    throw new AppError("Target deployment not found.", 404, "NOT_FOUND");
  }

  // 3. Status Gate: only successfully PUBLISHED deployments can be rolled back to
  if (targetDeployment.status !== "PUBLISHED") {
    throw new AppError(
      `Cannot rollback to deployment with status '${targetDeployment.status}'. Only successfully PUBLISHED deployments can be restored.`,
      400,
      "INVALID_STATE"
    );
  }

  // 4. Identify currently active deployment and prevent rolling back to already active deployment
  const currentActiveDeployment = await db.deployment.findFirst({
    where: {
      websiteId,
      status: "PUBLISHED",
    },
    orderBy: { version: "desc" },
  });

  if (currentActiveDeployment && currentActiveDeployment.id === targetDeployment.id) {
    throw new AppError("Target deployment is already the active deployment.", 400, "ALREADY_ACTIVE");
  }

  // 5. Concurrency Guard: reject if a deployment or rollback pipeline is actively in progress
  const activeDeploying = await db.deployment.findFirst({
    where: {
      websiteId,
      status: { in: ["QUEUED", "BUILDING", "PROCESSING", "DEPLOYING", "VERIFYING"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (activeDeploying) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (activeDeploying.createdAt > fiveMinutesAgo) {
      throw new AppError(
        `A deployment or rollback is already in progress (status: ${activeDeploying.status}, v${activeDeploying.version}). Please wait for it to complete.`,
        409,
        "DEPLOYMENT_IN_PROGRESS"
      );
    }
  }

  // 6. Destination Capability Validation
  const destinationType = targetDeployment.destinationType || "INTERNAL";
  try {
    const destinationPublisher = destinationRegistry.getPublisher(destinationType);
    if (!destinationPublisher) {
      throw new AppError(`Rollback is not supported for destination type '${destinationType}'.`, 400, "UNSUPPORTED_DESTINATION");
    }
  } catch (destErr: any) {
    throw new AppError(
      destErr.message || `Rollback is not supported for destination type '${destinationType}'.`,
      400,
      "UNSUPPORTED_DESTINATION"
    );
  }

  // Destination-specific configuration verification
  if (destinationType === "SFTP") {
    const sftpConfig = await db.sftpConnection.findFirst({ where: { websiteId, isActive: true } });
    if (!sftpConfig) {
      throw new AppError(
        "SFTP configuration not found or active for this website. Cannot execute rollback.",
        400,
        "SFTP_CONFIG_MISSING"
      );
    }
  } else if (destinationType === "WORDPRESS") {
    const wpConn = await db.wordPressConnection.findUnique({ where: { websiteId } });
    if (!wpConn || wpConn.status !== "CONNECTED") {
      throw new AppError(
        "WordPress connection is not active or verified. Cannot execute rollback.",
        400,
        "WORDPRESS_NOT_CONNECTED"
      );
    }
  }

  // 7. Retrieve historical candidate snapshot from durable source revision
  let snapshotToRestore: any = null;
  if (targetDeployment.sourceRevisionId) {
    const rev = await getRevisionById(websiteId, targetDeployment.sourceRevisionId, userId);
    snapshotToRestore = rev?.data;
  }

  if (!snapshotToRestore) {
    throw new AppError("Target deployment snapshot is missing or unavailable.", 400, "MISSING_SNAPSHOT");
  }

  // 8. Execute additive publish with restored target snapshot
  const rollbackResult = await publishWebsite(websiteId, userId, {
    editorData: snapshotToRestore,
    environment: targetDeployment.environment || "PRODUCTION",
    destinationType: destinationType,
    metadata: {
      isRollback: true,
      rollbackFromDeploymentId: targetDeployment.id,
      rolledBackVersion: targetDeployment.version,
      notes: `Rolled back to v${targetDeployment.version}`,
    },
  });

  // 9. Upon successful rollback completion, retire the superseded previous active deployment to 'ROLLED_BACK'
  if (rollbackResult.status === "PUBLISHED" && currentActiveDeployment && currentActiveDeployment.id !== rollbackResult.deploymentId) {
    try {
      await updateDeploymentStatus(currentActiveDeployment.id, "ROLLED_BACK", {
        metadata: {
          ...(currentActiveDeployment.metadata || {}),
          rolledBackAt: new Date().toISOString(),
          supersededByDeploymentId: rollbackResult.deploymentId,
          supersededByVersion: rollbackResult.version,
        },
      });
    } catch (retireErr) {
      console.warn("Could not transition superseded deployment to ROLLED_BACK:", retireErr);
    }
  }

  // 10. Audit Logging and Secret Redaction
  try {
    await recordAuditLog({
      userId,
      action: "DEPLOYMENT_ROLLBACK",
      targetResource: `website:${websiteId}:deployment:${rollbackResult.deploymentId}`,
      details: {
        websiteId,
        newDeploymentId: rollbackResult.deploymentId,
        newVersion: rollbackResult.version,
        rolledBackFromDeploymentId: targetDeployment.id,
        rolledBackVersion: targetDeployment.version,
        destinationType,
      },
    });
  } catch (auditErr) {
    console.warn("Audit log warning on rollback:", auditErr);
  }

  return sanitizeDeploymentData({
    ...rollbackResult,
    isRollback: true,
    rolledBackVersion: targetDeployment.version,
    previousActiveVersion: currentActiveDeployment?.version || null,
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
        error: data.error ? sanitizeDeploymentData(data.error) : null,
        completedAt: data.completedAt || null,
      },
    });
  }

  const errorJson = data.error ? JSON.stringify(sanitizeDeploymentData(data.error)) : null;
  const rows: any[] = await prisma.$queryRaw`
    INSERT INTO deployments (id, "websiteId", version, status, environment, "destinationType", error, "createdBy", "completedAt", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), ${data.websiteId}::uuid, ${data.version}, ${data.status}, ${data.environment}, ${data.destinationType}, ${errorJson}::jsonb, ${data.createdBy}::uuid, ${data.completedAt}, NOW(), NOW())
    RETURNING *
  `;
  return rows[0];
}

export const VALID_DEPLOYMENT_STATUSES = [
  "QUEUED",
  "VALIDATING",
  "BUILDING",
  "PROCESSING",
  "DEPLOYING",
  "VERIFYING",
  "PUBLISHED",
  "RECONCILIATION_REQUIRED",
  "VALIDATION_FAILED",
  "BUILD_FAILED",
  "DEPLOY_FAILED",
  "DEPLOYMENT_FAILED",
  "VERIFICATION_FAILED",
  "ROLLED_BACK",
] as const;

export type DeploymentStatus = (typeof VALID_DEPLOYMENT_STATUSES)[number];

const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  QUEUED: ["BUILDING", "VALIDATING", "PROCESSING", "DEPLOYING", "VERIFYING", "BUILD_FAILED", "DEPLOY_FAILED", "DEPLOYMENT_FAILED", "VALIDATION_FAILED"],
  VALIDATING: ["BUILDING", "VALIDATION_FAILED", "BUILD_FAILED", "DEPLOY_FAILED", "DEPLOYMENT_FAILED"],
  BUILDING: ["PROCESSING", "DEPLOYING", "BUILD_FAILED"],
  PROCESSING: ["DEPLOYING", "DEPLOY_FAILED", "DEPLOYMENT_FAILED", "BUILD_FAILED"],
  DEPLOYING: ["VERIFYING", "DEPLOY_FAILED", "DEPLOYMENT_FAILED"],
  VERIFYING: ["PUBLISHED", "VERIFICATION_FAILED", "RECONCILIATION_REQUIRED", "VERIFYING"],
  PUBLISHED: ["VERIFYING", "ROLLED_BACK", "RECONCILIATION_REQUIRED", "PUBLISHED"],
  VERIFICATION_FAILED: ["VERIFYING", "PUBLISHED", "VERIFICATION_FAILED", "ROLLED_BACK"],
  RECONCILIATION_REQUIRED: ["PUBLISHED", "VERIFYING", "ROLLED_BACK", "RECONCILIATION_REQUIRED"],
  BUILD_FAILED: ["BUILDING", "BUILD_FAILED"],
  DEPLOY_FAILED: ["DEPLOYING", "BUILDING", "DEPLOY_FAILED", "VERIFYING"],
  DEPLOYMENT_FAILED: ["DEPLOYING", "BUILDING", "DEPLOYMENT_FAILED", "VERIFYING"],
  VALIDATION_FAILED: ["VALIDATING", "BUILDING", "VALIDATION_FAILED"],
  ROLLED_BACK: ["ROLLED_BACK"],
};

export function isValidDeploymentTransition(currentStatus: string, nextStatus: string): boolean {
  if (currentStatus === nextStatus) return true;
  const normCurrent = currentStatus === "DEPLOYMENT_FAILED" ? "DEPLOY_FAILED" : currentStatus;
  const normNext = nextStatus === "DEPLOYMENT_FAILED" ? "DEPLOY_FAILED" : nextStatus;
  if (normCurrent === normNext) return true;

  const allowed = ALLOWED_STATUS_TRANSITIONS[normCurrent];
  if (!allowed) {
    return false;
  }
  return allowed.includes(normNext) || allowed.includes(nextStatus);
}

export function sanitizeDeploymentData(obj: any, depth = 0): any {
  if (!obj || typeof obj !== "object" || depth > 8) return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeDeploymentData(item, depth + 1));
  }
  const SENSITIVE_KEYS = [
    "password",
    "passwordhash",
    "apikey",
    "apikeyhash",
    "secret",
    "clientsecret",
    "token",
    "authorization",
    "privatekey",
    "privatekeypassphrase",
    "auth",
    "credentials",
    "access_token",
    "refresh_token",
  ];
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive))) {
      cleaned[key] = "[REDACTED]";
    } else if (typeof value === "string") {
      let strVal = value;
      if (strVal.includes("Bearer ")) {
        strVal = strVal.replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/g, "Bearer [REDACTED]");
      }
      strVal = strVal.replace(/(password|secret|apikey|token|privatekey)\s*[:=]\s*["']?([^"'\s,;]+)["']?/gi, "$1: [REDACTED]");
      strVal = strVal.replace(/((?:sftp|postgres|mysql|http|https):\/\/[^:\s]+:)([^@\s]+)(@)/gi, "$1[REDACTED]$3");
      cleaned[key] = strVal;
    } else {
      cleaned[key] = sanitizeDeploymentData(value, depth + 1);
    }
  }
  return cleaned;
}

export async function updateDeploymentStatus(
  deploymentId: string,
  status: string,
  extra: {
    completedAt?: Date | null;
    destinationRef?: string;
    sourceRevisionId?: string | null;
    metadata?: any;
    error?: any;
    ifNotNewerThan?: Date;
    skipTransitionCheck?: boolean;
  } = {}
) {
  const normalizedStatus = status === "DEPLOYMENT_FAILED" ? "DEPLOY_FAILED" : status;

  // Verify state transition validity
  if (!extra.skipTransitionCheck) {
    let currentDeployment: any = null;
    if (db?.deployment?.findUnique) {
      currentDeployment = await db.deployment.findUnique({ where: { id: deploymentId } });
    } else {
      const rows: any[] = await prisma.$queryRaw`
        SELECT id, status, "updatedAt" FROM deployments WHERE id = ${deploymentId}::uuid
      `;
      currentDeployment = rows[0];
    }

    if (currentDeployment) {
      if (extra.ifNotNewerThan && currentDeployment.updatedAt) {
        const curTime = new Date(currentDeployment.updatedAt).getTime();
        const maxTime = new Date(extra.ifNotNewerThan).getTime();
        if (curTime > maxTime) {
          // Newer update took precedence
          return currentDeployment;
        }
      }

      if (!isValidDeploymentTransition(currentDeployment.status, normalizedStatus)) {
        throw new AppError(
          `Invalid deployment status transition from '${currentDeployment.status}' to '${normalizedStatus}'.`,
          409,
          "INVALID_STATE_TRANSITION"
        );
      }
    }
  }

  const isTerminal = [
    "PUBLISHED",
    "BUILD_FAILED",
    "DEPLOY_FAILED",
    "DEPLOYMENT_FAILED",
    "VERIFICATION_FAILED",
    "VALIDATION_FAILED",
    "ROLLED_BACK",
  ].includes(normalizedStatus);

  const finalCompletedAt =
    extra.completedAt !== undefined
      ? extra.completedAt
      : isTerminal
      ? new Date()
      : null;

  const sanitizedMetadata = extra.metadata !== undefined ? sanitizeDeploymentData(extra.metadata) : undefined;
  const sanitizedError = extra.error !== undefined ? sanitizeDeploymentData(extra.error) : undefined;

  if (db?.deployment?.update) {
    return await db.deployment.update({
      where: { id: deploymentId },
      data: {
        status: normalizedStatus,
        completedAt: finalCompletedAt,
        ...(extra.destinationRef !== undefined ? { destinationRef: extra.destinationRef } : {}),
        ...(extra.sourceRevisionId !== undefined ? { sourceRevisionId: extra.sourceRevisionId } : {}),
        ...(sanitizedMetadata !== undefined ? { metadata: sanitizedMetadata } : {}),
        ...(sanitizedError !== undefined ? { error: sanitizedError } : {}),
      },
    });
  }

  const metaJson = sanitizedMetadata ? JSON.stringify(sanitizedMetadata) : null;
  const errJson = sanitizedError ? JSON.stringify(sanitizedError) : null;

  const rows: any[] = await prisma.$queryRaw`
    UPDATE deployments
    SET status = ${normalizedStatus},
        "completedAt" = ${finalCompletedAt},
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
