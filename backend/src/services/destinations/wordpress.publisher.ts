import {
  publishToWordPress,
  verifyWordPressConnection,
  sendSignedWordPressRequest,
} from "../wordpress/connector.service.js";
import { prisma } from "../../config/prisma.js";
import type {
  DestinationPublisher,
  PublishDestinationResult,
  VerifyDestinationResult,
  RollbackDestinationResult,
} from "./types.js";

const db = prisma as any;

export class WordPressPublisher implements DestinationPublisher {
  readonly destinationType = "WORDPRESS";

  async publish(
    websiteId: string,
    deploymentId: string,
    snapshot: any,
    options: any = {}
  ): Promise<PublishDestinationResult> {
    const userId = options.userId || snapshot.publishing?.publishedBy;
    const syncRes = await publishToWordPress(
      websiteId,
      userId,
      deploymentId,
      snapshot
    );

    return {
      success: syncRes.success,
      destinationType: "WORDPRESS",
      destinationRef: syncRes.primaryPageUrl || syncRes.siteUrl,
      filesTransferred: syncRes.syncedPagesCount,
      metadata: {
        siteUrl: syncRes.siteUrl,
        primaryPageUrl: syncRes.primaryPageUrl,
        syncedPagesCount: syncRes.syncedPagesCount,
        syncedMediaCount: syncRes.syncedMediaCount,
        pageMappings: syncRes.pageMappings,
      },
    };
  }

  async verify(
    websiteId: string,
    _deploymentId: string,
    options: any = {}
  ): Promise<VerifyDestinationResult> {
    const start = Date.now();
    try {
      // 1. Check connection record
      const connection =
        options.connection ||
        (await db.wordPressConnection.findUnique({ where: { websiteId } }));

      if (!connection) {
        return {
          verified: false,
          statusCode: 404,
          latencyMs: Date.now() - start,
          error: "No WordPress connection configured for this website",
          details: {
            destinationType: "WORDPRESS",
            verificationType: "REMOTE_CONTENT_VERIFIED",
          },
        };
      }

      if (connection.status !== "CONNECTED") {
        return {
          verified: false,
          statusCode: 400,
          latencyMs: Date.now() - start,
          error: `WordPress connection is '${connection.status}', must be 'CONNECTED'`,
          details: {
            destinationType: "WORDPRESS",
            connectionStatus: connection.status,
            verificationType: "REMOTE_CONTENT_VERIFIED",
          },
        };
      }

      // 2. Check page mappings
      let mappings: any[] = options.pageMappings;
      if (!mappings || !Array.isArray(mappings) || mappings.length === 0) {
        if (db?.wordPressPageMapping?.findMany) {
          mappings = await db.wordPressPageMapping.findMany({ where: { websiteId } });
        } else {
          mappings = [];
        }
      }

      if (!mappings || mappings.length === 0) {
        return {
          verified: false,
          statusCode: 404,
          latencyMs: Date.now() - start,
          error: "No mapped WordPress pages found to verify for this website",
          details: {
            destinationType: "WORDPRESS",
            verificationType: "REMOTE_CONTENT_VERIFIED",
          },
        };
      }

      // Target mapping: primary page or first mapped page
      const targetMapping = mappings[0];
      const targetPostId = targetMapping.wpPostId || targetMapping.wordpressPageId;

      if (!targetPostId) {
        return {
          verified: false,
          statusCode: 422,
          latencyMs: Date.now() - start,
          error: "Mapped WordPress post ID is invalid or missing",
          details: {
            destinationType: "WORDPRESS",
            verificationType: "REMOTE_CONTENT_VERIFIED",
          },
        };
      }

      // 3. Query remote post directly from WordPress
      let remotePage: any = null;
      if (typeof options.sendSignedRequest === "function") {
        remotePage = await options.sendSignedRequest(
          connection.siteUrl,
          `/pages/${targetPostId}`,
          "GET",
          connection.apiKeyHash
        );
      } else {
        remotePage = await sendSignedWordPressRequest(
          connection.siteUrl,
          `/pages/${targetPostId}`,
          "GET",
          connection.apiKeyHash
        );
      }

      if (!remotePage || (!remotePage.id && remotePage.id !== targetPostId)) {
        return {
          verified: false,
          statusCode: 404,
          latencyMs: Date.now() - start,
          error: `Mapped remote WordPress page ${targetPostId} was not found (404)`,
          details: {
            destinationType: "WORDPRESS",
            targetPostId,
            verificationType: "REMOTE_CONTENT_VERIFIED",
          },
        };
      }

      // 4. Verify published status (Issue 22: Must be published, reject draft/trash)
      const remoteStatus = String(remotePage.status || "").toLowerCase();
      if (remoteStatus !== "publish" && remoteStatus !== "published") {
        return {
          verified: false,
          statusCode: 422,
          latencyMs: Date.now() - start,
          error: `Remote WordPress page is '${remoteStatus}', expected 'publish'`,
          details: {
            destinationType: "WORDPRESS",
            targetPostId,
            remoteStatus,
            verificationType: "REMOTE_CONTENT_VERIFIED",
          },
        };
      }

      // 5. Verify content/marker if expectedContent is supplied
      if (options.expectedContent !== undefined) {
        const remoteContent = remotePage.content?.rendered || remotePage.content || "";
        if (!String(remoteContent).includes(String(options.expectedContent))) {
          return {
            verified: false,
            statusCode: 422,
            latencyMs: Date.now() - start,
            error: "Remote WordPress page content does not match expected published content",
            details: {
              destinationType: "WORDPRESS",
              targetPostId,
              verificationType: "REMOTE_CONTENT_VERIFIED",
            },
          };
        }
      }

      return {
        verified: true,
        statusCode: 200,
        latencyMs: Date.now() - start,
        details: {
          destinationType: "WORDPRESS",
          expectedVersion: options.version,
          actualResource: targetMapping.wpPostUrl || `${connection.siteUrl}/?p=${targetPostId}`,
          remotePostId: targetPostId,
          remoteStatus,
          siteUrl: connection.siteUrl,
          verificationType: "REMOTE_CONTENT_VERIFIED",
        },
      };
    } catch (err: any) {
      // Redact any potential credentials in error messages
      const sanitizedMsg = (err?.message || String(err))
        .replace(/api[_-]?key[=:][^&\s]+/gi, "apiKey=[REDACTED]")
        .replace(/password[=:][^&\s]+/gi, "password=[REDACTED]");

      return {
        verified: false,
        statusCode: err.statusCode || 502,
        latencyMs: Date.now() - start,
        error: `WordPress remote verification failed: ${sanitizedMsg}`,
        details: {
          destinationType: "WORDPRESS",
          verificationType: "REMOTE_CONTENT_VERIFIED",
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
      destinationType: "WORDPRESS",
      restoredVersion: targetSnapshot.version,
      metadata: publishRes.metadata,
      error: publishRes.error,
    };
  }
}
