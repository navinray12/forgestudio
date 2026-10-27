export interface DeploymentRelease {
  releaseId: string;
  websiteId: string;
  deployHash: string;
  environment: "PRODUCTION" | "STAGING";
  snapshotDataUrl?: string;
  snapshotData?: any;
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
