/**
 * @file Publishing: module implementation. File responsibility: static export publisher.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import path from "node:path";
import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import { AppError } from "../../../platform/http/app-error.js";
import { compileCanonicalToStaticBundle } from "./static-compiler.js";
import type {
  DestinationPublisher,
  PublishDestinationResult,
  VerifyDestinationResult,
} from "./types.js";

/**
 * Digest.
 * @param bytes Bytes supplied to this operation (type: string | Buffer).
 */
const digest = (bytes: string | Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
const receiptName = ".forgestudio-receipt.json";
type ExportReceipt = {
  websiteId: string;
  deploymentId: string;
  version: number;
  files: Array<{
    path: string;
    size: number;
    sha256: string;
    contentType: string;
  }>;
};

/**
 * Inside.
 * @param directory Directory supplied to this operation (type: string).
 * @param file File supplied to this operation (type: string).
 */
function inside(directory: string, file: string): string {
  if (
    !file ||
    file.includes("\\") ||
    file.includes(":") ||
    path.isAbsolute(file) ||
    file
      .split("/")
      .some((segment) => !segment || segment === ".." || segment === ".")
  ) {
    throw new AppError("Invalid export file path.", 422, "INVALID_EXPORT_PATH");
  }
  return path.join(directory, file);
}

/** Local export only. Hosting/CDN delivery is a separate later milestone. */
export class StaticExportPublisher implements DestinationPublisher {
  readonly destinationType = "STATIC";
  /**
   * Constructor.
   * @param baseDirectory Base Directory supplied to this operation. Defaults to path.resolve(process.cwd(), "exports").
   */
  constructor(
    private readonly baseDirectory = path.resolve(process.cwd(), "exports"),
  ) {}

  /**
   * Directory.
   * @param websiteId Identifier of the website whose data is being read or changed.
   * @param deploymentId Deployment Id supplied to this operation (type: string).
   */
  private directory(websiteId: string, deploymentId: string) {
    if (![websiteId, deploymentId].every((id) => /^[a-zA-Z0-9_-]+$/.test(id))) {
      throw new AppError(
        "Invalid export identifier.",
        422,
        "INVALID_EXPORT_PATH",
      );
    }
    return path.join(this.baseDirectory, websiteId, deploymentId);
  }

  /**
   * Publish.
   * @param websiteId Identifier of the website whose data is being read or changed.
   * @param deploymentId Deployment Id supplied to this operation (type: string).
   * @param snapshot Snapshot supplied to this operation (type: any).
   * @param _options Options supplied to this operation (type: any). Defaults to {}.
   */
  async publish(
    websiteId: string,
    deploymentId: string,
    snapshot: any,
    _options: any = {},
  ): Promise<PublishDestinationResult> {
    const destination = this.directory(websiteId, deploymentId);
    const bundle = compileCanonicalToStaticBundle(
      websiteId,
      snapshot.version,
      snapshot,
    );
    const paths = new Set<string>();
    for (const file of bundle.files) {
      inside(destination, file.path);
      if (paths.has(file.path.toLowerCase()) || file.path === receiptName) {
        throw new AppError(
          "Export contains duplicate file paths.",
          422,
          "DUPLICATE_EXPORT_PATH",
        );
      }
      paths.add(file.path.toLowerCase());
    }
    await fs.mkdir(path.dirname(destination), { recursive: true });
    const staging = await fs.mkdtemp(
      path.join(path.dirname(destination), ".staging-"),
    );
    try {
      for (const file of bundle.files) {
        const target = inside(staging, file.path);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, file.content, { flag: "wx" });
      }
      const receipt: ExportReceipt = {
        websiteId,
        deploymentId,
        version: snapshot.version,
        files: bundle.files.map((file) => ({
          path: file.path,
          size: Buffer.byteLength(file.content),
          sha256: digest(file.content),
          contentType: file.contentType,
        })),
      };
      await fs.writeFile(
        path.join(staging, receiptName),
        JSON.stringify(receipt),
        { flag: "wx" },
      );
      // Destination is an immutable operation directory; never overwrite it.
      await fs.rename(staging, destination);
      const verified = await this.verify(websiteId, deploymentId, {
        version: snapshot.version,
      });
      if (!verified.verified)
        throw new AppError(
          "Persisted export failed checksum verification.",
          503,
          "EXPORT_VERIFICATION_FAILED",
        );
      const destinationRef = `/api/v1/websites/${websiteId}/deployments/${deploymentId}/export-download`;
      return {
        success: true,
        destinationType: "STATIC",
        destinationRef,
        filesTransferred: bundle.files.length,
        totalBytes: bundle.totalBytes,
        metadata: {
          filesCount: bundle.files.length,
          pageCount: bundle.pageCount,
          assetCount: bundle.assetCount,
          downloadUrl: destinationRef,
        },
      };
    } finally {
      await fs.rm(staging, { recursive: true, force: true });
    }
  }

  /**
   * Read Export.
   * @param websiteId Identifier of the website whose data is being read or changed.
   * @param deploymentId Deployment Id supplied to this operation (type: string).
   * @param expectedVersion Expected Version supplied to this operation (type: number). Optional; callers may omit it.
   */
  async readExport(
    websiteId: string,
    deploymentId: string,
    expectedVersion?: number,
  ) {
    const directory = this.directory(websiteId, deploymentId);
    const receipt: ExportReceipt = JSON.parse(
      await fs.readFile(path.join(directory, receiptName), "utf8"),
    );
    if (
      receipt.websiteId !== websiteId ||
      receipt.deploymentId !== deploymentId ||
      !Array.isArray(receipt.files) ||
      !receipt.files.length ||
      (expectedVersion !== undefined && receipt.version !== expectedVersion)
    ) {
      throw new AppError(
        "Export receipt does not match the deployment.",
        409,
        "EXPORT_RECEIPT_MISMATCH",
      );
    }
    const files = [];
    for (const file of receipt.files) {
      const content = await fs.readFile(inside(directory, file.path));
      if (content.length !== file.size || digest(content) !== file.sha256) {
        throw new AppError(
          "Export file checksum mismatch.",
          409,
          "EXPORT_CHECKSUM_MISMATCH",
        );
      }
      files.push({
        ...file,
        content: content.toString("base64"),
        encoding: "base64",
      });
    }
    return { version: receipt.version, files };
  }

  /**
   * Verify.
   * @param websiteId Identifier of the website whose data is being read or changed.
   * @param deploymentId Deployment Id supplied to this operation (type: string).
   * @param options Options supplied to this operation (type: any). Defaults to {}.
   */
  async verify(
    websiteId: string,
    deploymentId: string,
    options: any = {},
  ): Promise<VerifyDestinationResult> {
    try {
      const bundle = await this.readExport(
        websiteId,
        deploymentId,
        options.version,
      );
      return {
        verified: true,
        statusCode: 200,
        details: { filesCount: bundle.files.length },
      };
    } catch {
      return {
        verified: false,
        statusCode: 503,
        error: "Export files are missing or failed checksum verification.",
      };
    }
  }

  /**
   * Rollback.
   * @param websiteId Identifier of the website whose data is being read or changed.
   * @param deploymentId Deployment Id supplied to this operation (type: string).
   * @param snapshot Snapshot supplied to this operation (type: any).
   * @param options Options supplied to this operation (type: any). Defaults to {}.
   */
  async rollback(
    websiteId: string,
    deploymentId: string,
    snapshot: any,
    options: any = {},
  ) {
    const result = await this.publish(
      websiteId,
      deploymentId,
      snapshot,
      options,
    );
    return { ...result, restoredVersion: snapshot.version };
  }
}
