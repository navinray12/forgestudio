import fs from "fs";
import path from "path";
import { compileCanonicalToStaticBundle } from "./staticCompiler.js";
import type {
  DestinationPublisher,
  PublishDestinationResult,
  VerifyDestinationResult,
  RollbackDestinationResult,
} from "./types.js";

const EXPORTS_BASE_DIR = path.resolve(process.cwd(), "exports");

export class StaticExportPublisher implements DestinationPublisher {
  readonly destinationType = "STATIC";

  async publish(
    websiteId: string,
    deploymentId: string,
    snapshot: any,
    _options: any = {}
  ): Promise<PublishDestinationResult> {
    const version = snapshot.version || 1;
    const bundle = compileCanonicalToStaticBundle(websiteId, version, snapshot);

    // Issue 21: Failed directory creation or file writing must strictly fail publishing.
    // No memory-only fallback is allowed to claim successful persistence.
    const deploymentExportDir = path.join(EXPORTS_BASE_DIR, websiteId, `v${version}`);

    try {
      fs.mkdirSync(deploymentExportDir, { recursive: true });
    } catch (dirErr: any) {
      return {
        success: false,
        destinationType: "STATIC",
        error: {
          code: "EXPORT_DIRECTORY_CREATE_FAILED",
          message: `Failed to create export directory: ${dirErr?.message || String(dirErr)}`,
        },
      };
    }

    let writtenFilesCount = 0;
    let writtenBytes = 0;
    const exportedFilesList: string[] = [];

    try {
      for (const file of bundle.files) {
        const filePath = path.join(deploymentExportDir, file.path);
        const fileDir = path.dirname(filePath);
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }
        fs.writeFileSync(filePath, file.content);

        const fileSize = Buffer.isBuffer(file.content)
          ? file.content.length
          : Buffer.byteLength(String(file.content), "utf8");

        writtenFilesCount++;
        writtenBytes += fileSize;
        exportedFilesList.push(file.path);
      }
    } catch (writeErr: any) {
      return {
        success: false,
        destinationType: "STATIC",
        error: {
          code: "EXPORT_FILE_WRITE_FAILED",
          message: `Failed to write export bundle file to disk: ${writeErr?.message || String(writeErr)}`,
        },
      };
    }

    // Verify generated output directory exists and all files are persisted on disk
    if (!fs.existsSync(deploymentExportDir) || writtenFilesCount !== bundle.files.length) {
      return {
        success: false,
        destinationType: "STATIC",
        error: {
          code: "EXPORT_VERIFICATION_FAILED",
          message: "Export bundle verification failed: written file count does not match bundle",
        },
      };
    }

    const destinationRef = `/api/websites/${websiteId}/deployments/${deploymentId}/export-download`;

    return {
      success: true,
      destinationType: "STATIC",
      destinationRef,
      filesTransferred: writtenFilesCount,
      totalBytes: writtenBytes,
      metadata: {
        exportPath: path.relative(process.cwd(), deploymentExportDir),
        filesCount: writtenFilesCount,
        totalBytes: writtenBytes,
        pageCount: bundle.pageCount,
        assetCount: bundle.assetCount,
        exportedFiles: exportedFilesList,
        downloadUrl: destinationRef,
      },
    };
  }

  async verify(
    websiteId: string,
    deploymentId: string,
    options: any = {}
  ): Promise<VerifyDestinationResult> {
    const start = Date.now();
    // Issue 22: Use actual expected deployment version, not a guessed default
    const version = options.version ?? options.snapshot?.version;
    if (version === undefined || version === null) {
      return {
        verified: false,
        statusCode: 400,
        latencyMs: Date.now() - start,
        error: "Missing deployment version for static export verification",
        details: {
          destinationType: "STATIC",
          verificationType: "LOCAL_ARTIFACT_PRESENCE",
        },
      };
    }

    const deploymentExportDir = path.join(EXPORTS_BASE_DIR, websiteId, `v${version}`);
    if (!fs.existsSync(deploymentExportDir)) {
      return {
        verified: false,
        statusCode: 404,
        latencyMs: Date.now() - start,
        error: `Static export directory not found: ${deploymentExportDir}`,
        details: {
          destinationType: "STATIC",
          expectedVersion: version,
          exportDirectory: deploymentExportDir,
          verificationType: "LOCAL_ARTIFACT_PRESENCE",
        },
      };
    }

    // Verify essential entry-point: index.html
    const indexHtmlPath = path.join(deploymentExportDir, "index.html");
    if (!fs.existsSync(indexHtmlPath)) {
      return {
        verified: false,
        statusCode: 404,
        latencyMs: Date.now() - start,
        error: `Entry-point file index.html is missing in static export: ${deploymentExportDir}`,
        details: {
          destinationType: "STATIC",
          expectedVersion: version,
          exportDirectory: deploymentExportDir,
          verificationType: "LOCAL_ARTIFACT_PRESENCE",
        },
      };
    }

    let indexStats: fs.Stats;
    try {
      indexStats = fs.statSync(indexHtmlPath);
    } catch (e: any) {
      return {
        verified: false,
        statusCode: 500,
        latencyMs: Date.now() - start,
        error: `Could not inspect index.html stats: ${e?.message || String(e)}`,
        details: {
          destinationType: "STATIC",
          expectedVersion: version,
          verificationType: "LOCAL_ARTIFACT_PRESENCE",
        },
      };
    }

    if (indexStats.size === 0) {
      return {
        verified: false,
        statusCode: 422,
        latencyMs: Date.now() - start,
        error: "Entry-point index.html is empty (0 bytes)",
        details: {
          destinationType: "STATIC",
          expectedVersion: version,
          exportDirectory: deploymentExportDir,
          verificationType: "LOCAL_ARTIFACT_PRESENCE",
        },
      };
    }

    // Verify any specific expected files
    const expectedFiles: string[] = options.expectedFiles || options.files || [];
    const missingFiles: string[] = [];
    for (const f of expectedFiles) {
      const p = path.join(deploymentExportDir, f);
      if (!fs.existsSync(p) || fs.statSync(p).size === 0) {
        missingFiles.push(f);
      }
    }

    if (missingFiles.length > 0) {
      return {
        verified: false,
        statusCode: 422,
        latencyMs: Date.now() - start,
        error: `Static export is missing expected files or contains zero-byte files: ${missingFiles.join(", ")}`,
        details: {
          destinationType: "STATIC",
          expectedVersion: version,
          exportDirectory: deploymentExportDir,
          missingFiles,
          verificationType: "LOCAL_ARTIFACT_PRESENCE",
        },
      };
    }

    return {
      verified: true,
      statusCode: 200,
      latencyMs: Date.now() - start,
      details: {
        destinationType: "STATIC",
        expectedVersion: version,
        actualResource: deploymentExportDir,
        exportDirectory: deploymentExportDir,
        entryPoint: "index.html",
        entryPointSize: indexStats.size,
        verificationType: "LOCAL_ARTIFACT_PRESENCE", // Explicitly proves durable artifact, not an anonymously hosted website!
        downloadUrl: `/api/websites/${websiteId}/deployments/${deploymentId}/export-download`,
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
      destinationType: "STATIC",
      restoredVersion: targetSnapshot.version,
      metadata: publishRes.metadata,
      error: publishRes.error,
    };
  }
}
