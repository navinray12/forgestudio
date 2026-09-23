/**
 * @file Publishing: module implementation. File responsibility: sftp publisher.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { rejectUnavailableDestination } from "./destination-availability.js";
import type { DestinationPublisher, PublishDestinationResult, VerifyDestinationResult, RollbackDestinationResult } from "./types.js";

/** Intentionally unavailable until uploads, host-key checks and receipts exist. */
export class SftpPublisher implements DestinationPublisher {
  readonly destinationType = "SFTP";
  /**
   * Publish.
   * @param _websiteId Website Id supplied to this operation (type: string).
   * @param _deploymentId Deployment Id supplied to this operation (type: string).
   * @param _snapshot Snapshot supplied to this operation (type: any).
   * @param _options Options supplied to this operation (type: any). Defaults to {}.
   */
  async publish(_websiteId: string, _deploymentId: string, _snapshot: any, _options: any = {}): Promise<PublishDestinationResult> {
    return rejectUnavailableDestination("SFTP");
  }
  /**
   * Verify.
   * @param _websiteId Website Id supplied to this operation (type: string).
   * @param _deploymentId Deployment Id supplied to this operation (type: string).
   * @param _options Options supplied to this operation (type: any). Defaults to {}.
   */
  async verify(_websiteId: string, _deploymentId: string, _options: any = {}): Promise<VerifyDestinationResult> {
    return rejectUnavailableDestination("SFTP");
  }
  /**
   * Rollback.
   * @param _websiteId Website Id supplied to this operation (type: string).
   * @param _deploymentId Deployment Id supplied to this operation (type: string).
   * @param _snapshot Snapshot supplied to this operation (type: any).
   * @param _options Options supplied to this operation (type: any). Defaults to {}.
   */
  async rollback(_websiteId: string, _deploymentId: string, _snapshot: any, _options: any = {}): Promise<RollbackDestinationResult> {
    return rejectUnavailableDestination("SFTP");
  }
}
