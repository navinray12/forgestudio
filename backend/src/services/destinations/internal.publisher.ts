import { prisma } from "../../config/prisma.js";
import type {
  DestinationPublisher,
  PublishDestinationResult,
  VerifyDestinationResult,
  RollbackDestinationResult,
} from "./types.js";

const db = prisma as any;

export class InternalPublisher implements DestinationPublisher {
  readonly destinationType = "INTERNAL";

  async publish(
    websiteId: string,
    deploymentId: string,
    snapshot: any,
    options: any = {}
  ): Promise<PublishDestinationResult> {
    const website = await db.website.findUnique({ where: { id: websiteId } });
    if (!website) {
      return {
        success: false,
        destinationType: "INTERNAL",
        error: { message: "Website not found" },
      };
    }

    const currentEditorData =
      typeof website.editorData === "string"
        ? JSON.parse(website.editorData)
        : website.editorData || {};

    const updatedEditorData = {
      ...currentEditorData,
      publishedData: snapshot,
      publishing: {
        status: "PUBLISHED",
        publishedAt: new Date().toISOString(),
        version: snapshot.version,
      },
    };

    await db.website.update({
      where: { id: websiteId },
      data: {
        editorData: updatedEditorData,
        status: "PUBLISHED",
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      destinationType: "INTERNAL",
      destinationRef: `/site/${websiteId}`,
      metadata: {
        version: snapshot.version,
        deploymentId,
        productionUrl: `/site/${websiteId}`,
      },
    };
  }

  async verify(
    websiteId: string,
    deploymentId: string,
    options: any = {}
  ): Promise<VerifyDestinationResult> {
    const start = Date.now();
    const targetVersion = options.version;

    // Check deployment pre-flight guards if deploymentId is supplied and is valid UUID
    const isUuid = Boolean(deploymentId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(deploymentId));
    if (isUuid && db?.deployment?.findUnique) {
      try {
        const deployment = await db.deployment.findUnique({ where: { id: deploymentId } });
        if (deployment) {
          if (deployment.websiteId && deployment.websiteId !== websiteId) {
            return {
              verified: false,
              statusCode: 403,
              latencyMs: Date.now() - start,
              error: "Deployment does not belong to this website.",
            };
          }
          if (deployment.destinationType && deployment.destinationType !== "INTERNAL") {
            return {
              verified: false,
              statusCode: 400,
              latencyMs: Date.now() - start,
            error: `Deployment destination is '${deployment.destinationType}', expected 'INTERNAL'.`,
            };
          }
          if (targetVersion !== undefined && deployment.version !== targetVersion) {
            return {
              verified: false,
              statusCode: 409,
              latencyMs: Date.now() - start,
              error: `Published version mismatch: requested v${targetVersion}, found deployment v${deployment.version}.`,
            };
          }
          if (deployment.status === "ROLLED_BACK") {
            return {
              verified: false,
              statusCode: 409,
              latencyMs: Date.now() - start,
              error: "Deployment has been rolled back and cannot be verified.",
            };
          }
          if (deployment.status === "BUILD_FAILED") {
            return {
              verified: false,
              statusCode: 422,
              latencyMs: Date.now() - start,
              error: "Deployment build failed; cannot verify unbuilt artifacts.",
            };
          }
          if (deployment.status === "VALIDATION_FAILED") {
            return {
              verified: false,
              statusCode: 422,
              latencyMs: Date.now() - start,
              error: "Deployment validation failed; cannot verify invalid deployment.",
            };
          }
        }
      } catch (_) {
        // Fallback to website-level verification if deployment query fails
      }
    }

    // 1. Verify Website exists and status is PUBLISHED in DB
    const website = await db.website.findUnique({ where: { id: websiteId } });
    const latencyMs = Date.now() - start;

    if (!website) {
      return {
        verified: false,
        statusCode: 404,
        latencyMs,
        error: "Website not found in database",
      };
    }

    if (website.status !== "PUBLISHED") {
      return {
        verified: false,
        statusCode: 400,
        latencyMs,
        error: `Website status is '${website.status}', expected 'PUBLISHED'`,
      };
    }

    // 2. Verify publishedData snapshot is durable and non-empty
    const rawData =
      typeof website.editorData === "string"
        ? JSON.parse(website.editorData)
        : website.editorData;

    if (!rawData?.publishedData) {
      return {
        verified: false,
        statusCode: 500,
        latencyMs,
        error: "publishedData snapshot missing in website editorData",
      };
    }

    const publishedSnapshot = rawData.publishedData;
    const publishedVer = publishedSnapshot.version || publishedSnapshot.publishing?.version;

    if (targetVersion && publishedVer !== targetVersion) {
      return {
        verified: false,
        statusCode: 409,
        latencyMs,
        error: `Published version mismatch: live snapshot has v${publishedVer}, expected v${targetVersion}`,
      };
    }

    // 3. Verify HTML & Page artifacts within the snapshot
    const pages = Array.isArray(publishedSnapshot.pages) ? publishedSnapshot.pages : [];
    const elements = Array.isArray(publishedSnapshot.elements) ? publishedSnapshot.elements : [];

    if (pages.length === 0 && elements.length === 0) {
      return {
        verified: false,
        statusCode: 500,
        latencyMs,
        error: "Published snapshot contains no pages or elements to render",
      };
    }

    // 4. Verify public runtime accessibility via getPublicWebsiteById
    try {
      const { getPublicWebsiteById } = await import("../website.service.js");
      const publicWebsite = await getPublicWebsiteById(websiteId);
      if (!publicWebsite || publicWebsite.status !== "PUBLISHED") {
        return {
          verified: false,
          statusCode: 502,
          latencyMs: Date.now() - start,
          error: "Public runtime endpoint did not return active published status",
        };
      }
    } catch (pubErr: any) {
      return {
        verified: false,
        statusCode: pubErr.statusCode || 500,
        latencyMs: Date.now() - start,
        error: `Public runtime verification failed: ${pubErr?.message || "Unavailable"}`,
      };
    }

    const liveUrl = `/site/${websiteId}`;

    return {
      verified: true,
      statusCode: 200,
      latencyMs: Date.now() - start,
      details: {
        websiteId,
        deploymentId,
        status: website.status,
        version: publishedVer,
        pagesCount: pages.length,
        liveUrl,
        verifiedAt: new Date().toISOString(),
      },
    };
  }

  async rollback(
    websiteId: string,
    targetDeploymentId: string,
    targetSnapshot: any,
    options: any = {}
  ): Promise<RollbackDestinationResult> {
    const publishRes = await this.publish(
      websiteId,
      targetDeploymentId,
      targetSnapshot,
      options
    );

    return {
      success: publishRes.success,
      destinationType: "INTERNAL",
      restoredVersion: targetSnapshot.version,
      metadata: publishRes.metadata,
      error: publishRes.error,
    };
  }
}
