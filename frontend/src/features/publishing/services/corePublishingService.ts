import type { DeploymentRecord } from "../../../pages/editor/types";
import type { PublishApiResponse, ValidationApiResponse } from "./publishing.types";
import { requestPublishingJson } from "./publishingHttp";

export const corePublishingService = {
  validateWebsite(websiteId: string, editorData?: unknown, apiUrl?: string): Promise<ValidationApiResponse> {
    return requestPublishingJson(`/api/websites/${websiteId}/validate-publish`, {
      method: "POST",
      body: JSON.stringify({ editorData }),
    }, "Failed to validate website before publishing", apiUrl);
  },

  publishWebsite(
    websiteId: string,
    options: {
      editorData?: unknown;
      environment?: "PRODUCTION" | "STAGING" | "DEVELOPMENT";
      destinationType?: "INTERNAL" | "WORDPRESS" | "STATIC";
      metadata?: Record<string, unknown>;
    } = {},
    apiUrl?: string,
  ): Promise<PublishApiResponse> {
    return requestPublishingJson(`/api/websites/${websiteId}/publish`, {
      method: "POST",
      body: JSON.stringify(options),
    }, "Failed to execute website publishing", apiUrl);
  },

  async getDeployments(websiteId: string, apiUrl?: string): Promise<DeploymentRecord[]> {
    const data = await requestPublishingJson<{ deployments?: DeploymentRecord[] }>(
      `/api/websites/${websiteId}/deployments`, { method: "GET" },
      "Failed to fetch deployment history", apiUrl,
    );
    return data.deployments || [];
  },

  rollbackDeployment(websiteId: string, deploymentId: string, apiUrl?: string): Promise<PublishApiResponse> {
    return requestPublishingJson(`/api/websites/${websiteId}/deployments/${deploymentId}/rollback`, {
      method: "POST",
    }, "Failed to initiate deployment rollback", apiUrl);
  },
};
