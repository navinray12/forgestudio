/**
 * @file Publishing: module implementation. File responsibility: types.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
/**
 * ForgeStudio Destination Publisher Types
 * Authoritative destination abstraction for production deployments
 */

export type DestinationType = "INTERNAL" | "WORDPRESS" | "SFTP" | "STATIC";

export interface GeneratedFile {
  path: string;
  content: string | Buffer;
  size: number;
  contentType: string;
}

export interface StaticBundle {
  websiteId: string;
  version: number;
  files: GeneratedFile[];
  totalBytes: number;
  pageCount: number;
  assetCount: number;
  generatedAt: string;
}

export interface PublishDestinationResult {
  success: boolean;
  destinationType: DestinationType;
  destinationRef?: string;
  filesTransferred?: number;
  totalBytes?: number;
  metadata?: Record<string, any>;
  error?: any;
}

export interface VerifyDestinationResult {
  verified: boolean;
  statusCode?: number;
  latencyMs?: number;
  error?: string;
  details?: Record<string, any>;
}

export interface RollbackDestinationResult {
  success: boolean;
  destinationType: DestinationType;
  restoredVersion: number;
  metadata?: Record<string, any>;
  error?: any;
}

export interface DestinationPublisher {
  readonly destinationType: DestinationType;
  publish(
    websiteId: string,
    deploymentId: string,
    snapshot: any,
    options?: any
  ): Promise<PublishDestinationResult>;

  verify(
    websiteId: string,
    deploymentId: string,
    options?: any
  ): Promise<VerifyDestinationResult>;

  rollback?(
    websiteId: string,
    targetDeploymentId: string,
    targetSnapshot: any,
    options?: any
  ): Promise<RollbackDestinationResult>;
}
