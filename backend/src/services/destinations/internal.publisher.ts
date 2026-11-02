import { prisma } from "../../config/prisma.js";
import { getPublicWebsiteById } from "../website.service.js";
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
    _options: any = {}
  ): Promise<PublishDestinationResult> {
    const website = await db.website.findUnique({ where: { id: websiteId } });
    if (!website) {
      return {
        success: false,
        destinationType: "INTERNAL",
        error: { message: "Website not found" },
      };
    }

    return {
      success: true,
      destinationType: "INTERNAL",
      destinationRef: `/site/${websiteId}`,
      metadata: {
        version: snapshot?.version,
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

    // Stage 1: Pre-commit snapshot integrity verification
    if (options.stage === "PRE_COMMIT") {
      const snap = options.snapshot;
      const isValid =
        snap &&
        typeof snap === "object" &&
        !Array.isArray(snap) &&
        (Array.isArray(snap.pages) || Array.isArray(snap.elements));

      return {
        verified: Boolean(isValid),
        statusCode: isValid ? 200 : 422,
        latencyMs: Date.now() - start,
        error: isValid ? undefined : "Candidate snapshot is structurally invalid before release",
        details: {
          destinationType: "INTERNAL",
          stage: "PRE_COMMIT",
          verificationType: "CANDIDATE_SNAPSHOT_INTEGRITY",
        },
      };
    }

    // Stage 2: Anonymous Public HTTP Delivery Verification (Issue 22)
    // Strictly requires NO authenticated user session; exercises the public resolver directly!
    try {
      const resolver =
        typeof options.publicWebsiteResolver === "function"
          ? options.publicWebsiteResolver
          : getPublicWebsiteById;
      const publicSite = await resolver(websiteId);
      const latencyMs = Date.now() - start;

      if (!publicSite || publicSite.status !== "PUBLISHED") {
        return {
          verified: false,
          statusCode: 404,
          latencyMs,
          error: "Public website is unavailable or not in PUBLISHED state",
          details: {
            destinationType: "INTERNAL",
            websiteId,
            verificationType: "PUBLIC_HTTP_ANONYMOUS_DELIVERY",
          },
        };
      }

      // Validate public site belongs to requested website
      if (publicSite.id !== websiteId && publicSite.slug !== websiteId) {
        return {
          verified: false,
          statusCode: 422,
          latencyMs,
          error: `Public delivery mismatch: requested website '${websiteId}', but received '${publicSite.id}'`,
          details: {
            destinationType: "INTERNAL",
            websiteId,
            returnedId: publicSite.id,
            verificationType: "PUBLIC_HTTP_ANONYMOUS_DELIVERY",
          },
        };
      }

      // Validate published version matches expected version
      const expectedVersion = options.version ?? options.snapshot?.version;
      const publicPublishing = publicSite.editorData?.publishing;
      const publicVersion = publicPublishing?.version ?? (publicPublishing as any)?.publishedVersion ?? (publicSite.editorData as any)?.version;

      if (expectedVersion !== undefined && publicVersion !== undefined && publicVersion !== expectedVersion) {
        return {
          verified: false,
          statusCode: 422,
          latencyMs,
          error: `Public snapshot version mismatch: expected v${expectedVersion}, but public site serves v${publicVersion}`,
          details: {
            destinationType: "INTERNAL",
            expectedVersion,
            publicVersion,
            verificationType: "PUBLIC_HTTP_ANONYMOUS_DELIVERY",
          },
        };
      }

      // Ensure unpublished draft data is not returned
      if (options.draftMarker && JSON.stringify(publicSite.editorData).includes(options.draftMarker)) {
        return {
          verified: false,
          statusCode: 422,
          latencyMs,
          error: "Public response contains unpublished draft content (draft isolation violation)",
          details: {
            destinationType: "INTERNAL",
            verificationType: "PUBLIC_HTTP_ANONYMOUS_DELIVERY",
          },
        };
      }

      return {
        verified: true,
        statusCode: 200,
        latencyMs,
        details: {
          destinationType: "INTERNAL",
          expectedVersion,
          actualResource: `/site/${websiteId}`,
          publicDeliveryVerified: true,
          verificationType: "PUBLIC_HTTP_ANONYMOUS_DELIVERY",
        },
      };
    } catch (err: any) {
      return {
        verified: false,
        statusCode: err.statusCode || 404,
        latencyMs: Date.now() - start,
        error: `Anonymous public website delivery failed: ${err?.message || "Website unavailable"}`,
        details: {
          destinationType: "INTERNAL",
          websiteId,
          verificationType: "PUBLIC_HTTP_ANONYMOUS_DELIVERY",
        },
      };
    }
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
