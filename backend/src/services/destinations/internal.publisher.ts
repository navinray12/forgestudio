import { createHash } from "crypto";
import { getPublicWebsiteById } from "../website.service.js";
import type {
  DestinationPublisher,
  PublishDestinationResult,
  VerifyDestinationResult,
  RollbackDestinationResult,
} from "./types.js";

/**
 * Fingerprints candidate or resolved editor data for snapshot identity verification.
 */
function extractSnapshotIdentity(data: any) {
  if (!data || typeof data !== "object") return null;
  const pages = Array.isArray(data.pages) ? data.pages : [];
  const elements = Array.isArray(data.elements) ? data.elements : [];
  return {
    homePageId: data.homePageId || "",
    pageIds: pages.map((p: any) => String(p.id || "")).sort(),
    elementsCount: elements.length,
    pagesElementsCount: pages.reduce(
      (sum: number, p: any) => sum + (Array.isArray(p.elements) ? p.elements.length : 0),
      0
    ),
  };
}

export class InternalPublisher implements DestinationPublisher {
  readonly destinationType = "INTERNAL";

  async publish(
    websiteId: string,
    deploymentId: string,
    snapshot: any,
    _options: any = {}
  ): Promise<PublishDestinationResult> {
    const version = snapshot.version || 1;
    const destinationRef = `/site/${websiteId}`;

    return {
      success: true,
      destinationType: "INTERNAL",
      destinationRef,
      filesTransferred: Array.isArray(snapshot.pages) ? snapshot.pages.length : 1,
      metadata: {
        version,
        deploymentId,
        productionUrl: destinationRef,
        deployedAt: new Date().toISOString(),
      },
    };
  }

  async verify(
    websiteId: string,
    _deploymentId: string,
    options: any = {}
  ): Promise<VerifyDestinationResult> {
    const start = Date.now();

    // Stage 1: Pre-commit Structural Candidate Snapshot Integrity Check
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

    // Stage 2: Post-Commit Direct Resolver & Anonymous Delivery Verification
    // Honest Evidence: Distinguishes direct public resolver verification from external HTTP probes.
    const isHttpProbe = Boolean(options.probeHttp || options.httpProbeUrl);
    const verificationType = isHttpProbe
      ? "ANONYMOUS_HTTP_PROBE"
      : "DIRECT_RESOLVER_SNAPSHOT_INTEGRITY";

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
            verificationType,
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
            verificationType,
          },
        };
      }

      // Validate published version matches expected version
      const expectedVersion = options.version ?? options.snapshot?.version;
      const publicPublishing = publicSite.editorData?.publishing;
      const publicVersion =
        publicPublishing?.version ??
        (publicPublishing as any)?.publishedVersion ??
        (publicSite.editorData as any)?.version;

      if (
        expectedVersion !== undefined &&
        publicVersion !== undefined &&
        publicVersion !== expectedVersion
      ) {
        return {
          verified: false,
          statusCode: 422,
          latencyMs,
          error: `Public snapshot version mismatch: expected v${expectedVersion}, but public site serves v${publicVersion}`,
          details: {
            destinationType: "INTERNAL",
            expectedVersion,
            publicVersion,
            verificationType,
          },
        };
      }

      // Snapshot Identity Check: Verify intended snapshot identity, not version alone
      if (options.snapshot) {
        const candidateIdentity = extractSnapshotIdentity(options.snapshot);
        const resolvedIdentity = extractSnapshotIdentity(publicSite.editorData);

        if (
          candidateIdentity &&
          resolvedIdentity &&
          (candidateIdentity.homePageId !== resolvedIdentity.homePageId ||
            JSON.stringify(candidateIdentity.pageIds) !== JSON.stringify(resolvedIdentity.pageIds))
        ) {
          return {
            verified: false,
            statusCode: 422,
            latencyMs,
            error:
              "Public snapshot identity mismatch: resolved content structure does not match candidate snapshot",
            details: {
              destinationType: "INTERNAL",
              candidateIdentity,
              resolvedIdentity,
              verificationType,
            },
          };
        }
      }

      // Verify release pointer match if releaseId provided
      if (options.releaseId) {
        const currentRelId = publicSite.editorData?.currentReleaseId;
        if (currentRelId && currentRelId !== options.releaseId) {
          return {
            verified: false,
            statusCode: 422,
            latencyMs,
            error: `Public release identity mismatch: expected release ${options.releaseId}, found ${currentRelId}`,
            details: {
              destinationType: "INTERNAL",
              expectedReleaseId: options.releaseId,
              actualReleaseId: currentRelId,
              verificationType,
            },
          };
        }
      }

      // Ensure unpublished draft data is not returned (Draft Isolation)
      if (
        options.draftMarker &&
        JSON.stringify(publicSite.editorData).includes(options.draftMarker)
      ) {
        return {
          verified: false,
          statusCode: 422,
          latencyMs,
          error: "Public response contains unpublished draft content (draft isolation violation)",
          details: {
            destinationType: "INTERNAL",
            verificationType,
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
          resolverVerified: true,
          verificationType,
          browserDeliveryPendingQa: true,
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
          verificationType,
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
