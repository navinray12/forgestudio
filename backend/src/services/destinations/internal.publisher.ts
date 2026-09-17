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
    _deploymentId: string,
    _options: any = {}
  ): Promise<VerifyDestinationResult> {
    const start = Date.now();
    const website = await db.website.findUnique({ where: { id: websiteId } });
    const latencyMs = Date.now() - start;

    if (!website || website.status !== "PUBLISHED") {
      return {
        verified: false,
        statusCode: 404,
        latencyMs,
        error: "Website is not marked PUBLISHED in database",
      };
    }

    const rawData =
      typeof website.editorData === "string"
        ? JSON.parse(website.editorData)
        : website.editorData;

    if (!rawData?.publishedData) {
      return {
        verified: false,
        statusCode: 500,
        latencyMs,
        error: "publishedData snapshot missing in database",
      };
    }

    return {
      verified: true,
      statusCode: 200,
      latencyMs,
      details: {
        status: website.status,
        publishedVersion: rawData.publishedData.version,
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
