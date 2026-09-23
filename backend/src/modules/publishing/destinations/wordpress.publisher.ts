/**
 * @file Publishing: module implementation. File responsibility: wordpress publisher.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import {
  publishToWordPress,
  verifyWordPressConnection,
} from "../../wordpress-connections/connector.service.js";
import type {
  DestinationPublisher,
  PublishDestinationResult,
  VerifyDestinationResult,
  RollbackDestinationResult,
} from "./types.js";

export class WordPressPublisher implements DestinationPublisher {
  readonly destinationType = "WORDPRESS";

  /**
   * Publish.
   * @param websiteId Identifier of the website whose data is being read or changed.
   * @param deploymentId Deployment Id supplied to this operation (type: string).
   * @param snapshot Snapshot supplied to this operation (type: any).
   * @param options Options supplied to this operation (type: any). Defaults to {}.
   */
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

  /**
   * Verify.
   * @param websiteId Identifier of the website whose data is being read or changed.
   * @param _deploymentId Deployment Id supplied to this operation (type: string).
   * @param options Options supplied to this operation (type: any). Defaults to {}.
   */
  async verify(
    websiteId: string,
    _deploymentId: string,
    options: any = {}
  ): Promise<VerifyDestinationResult> {
    const userId = options.userId;
    const start = Date.now();
    try {
      const verifyRes = await verifyWordPressConnection(websiteId, userId);
      const latencyMs = Date.now() - start;
      return {
        verified: verifyRes.status === "CONNECTED",
        statusCode: 200,
        latencyMs,
        details: {
          siteUrl: verifyRes.siteUrl,
          wpVersion: verifyRes.wpVersion,
          pluginVersion: verifyRes.pluginVersion,
        },
      };
    } catch (err: any) {
      return {
        verified: false,
        statusCode: err.statusCode || 500,
        latencyMs: Date.now() - start,
        error: err.message,
      };
    }
  }

  /**
   * Rollback.
   * @param websiteId Identifier of the website whose data is being read or changed.
   * @param targetDeploymentId Target Deployment Id supplied to this operation (type: string).
   * @param targetSnapshot Target Snapshot supplied to this operation (type: any).
   * @param options Options supplied to this operation (type: any). Defaults to {}.
   */
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
