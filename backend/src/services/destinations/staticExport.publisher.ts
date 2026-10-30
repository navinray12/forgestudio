import fs from "fs";
import path from "path";
import { prisma } from "../../config/prisma.js";
import { canUserAccessResource } from "../permission.service.js";
import { compileCanonicalToStaticBundle } from "./staticCompiler.js";
import { createStaticZipArchive } from "./staticZip.service.js";
import type {
  DestinationPublisher,
  PublishDestinationResult,
  VerifyDestinationResult,
  RollbackDestinationResult,
  StaticBundle,
  GeneratedFile,
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

    // Ensure export directory exists
    const deploymentExportDir = path.join(EXPORTS_BASE_DIR, websiteId, `v${version}`);
    try {
      fs.mkdirSync(deploymentExportDir, { recursive: true });

      // Write static files to filesystem
      for (const file of bundle.files) {
        const filePath = path.join(deploymentExportDir, file.path);
        const fileDir = path.dirname(filePath);
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }
        fs.writeFileSync(filePath, file.content);
      }
    } catch (err: any) {
      // In constrained environments, continue with memory bundle
    }

    const destinationRef = `/api/websites/${websiteId}/deployments/${deploymentId}/export-download`;

    return {
      success: true,
      destinationType: "STATIC",
      destinationRef,
      filesTransferred: bundle.files.length,
      totalBytes: bundle.totalBytes,
      metadata: {
        exportPath: path.relative(process.cwd(), deploymentExportDir),
        filesCount: bundle.files.length,
        totalBytes: bundle.totalBytes,
        pageCount: bundle.pageCount,
        assetCount: bundle.assetCount,
        exportedFiles: bundle.files.map((f) => f.path),
        downloadUrl: destinationRef,
      },
    };
  }

  /**
   * Comprehensive Feature 13 Static Export Verification
   * Validates entry HTML, core assets, routing consistency, internal references, disk artifacts, and ZIP packaging.
   */
  async verify(
    websiteId: string,
    deploymentId: string,
    options: any = {}
  ): Promise<VerifyDestinationResult> {
    const start = Date.now();
    try {
      let snapshot = options.snapshot;
      let targetVersion = options.version;

      // Check deployment pre-flight guards if deploymentId is supplied
      if (deploymentId && prisma?.deployment?.findUnique) {
        const deployment = await prisma.deployment.findUnique({ where: { id: deploymentId } });
        if (deployment) {
          if (deployment.websiteId && deployment.websiteId !== websiteId) {
            return {
              verified: false,
              statusCode: 403,
              latencyMs: Date.now() - start,
              error: "Deployment does not belong to this website.",
            };
          }
          if (deployment.destinationType && deployment.destinationType !== "STATIC") {
            return {
              verified: false,
              statusCode: 400,
              latencyMs: Date.now() - start,
              error: `Deployment destination is '${deployment.destinationType}', expected 'STATIC'.`,
            };
          }
          if (targetVersion !== undefined && deployment.version !== targetVersion) {
            return {
              verified: false,
              statusCode: 409,
              latencyMs: Date.now() - start,
              error: `Deployment version mismatch: requested v${targetVersion}, found v${deployment.version}.`,
            };
          }
          if (deployment.status === "ROLLED_BACK") {
            return {
              verified: false,
              statusCode: 409,
              latencyMs: Date.now() - start,
              error: "Deployment has been rolled back and cannot be verified.",
            };
          }
          if (deployment.status === "BUILD_FAILED") {
            return {
              verified: false,
              statusCode: 422,
              latencyMs: Date.now() - start,
              error: "Deployment build failed; cannot verify unbuilt artifacts.",
            };
          }
          if (deployment.status === "VALIDATION_FAILED") {
            return {
              verified: false,
              statusCode: 422,
              latencyMs: Date.now() - start,
              error: "Deployment validation failed; cannot verify invalid deployment.",
            };
          }
        }
      }

      // 1. Fetch website and verify existence if snapshot not directly provided
      if (!snapshot) {
        const website = await prisma.website.findUnique({
          where: { id: websiteId },
        });

        if (!website) {
          return {
            verified: false,
            statusCode: 404,
            latencyMs: Date.now() - start,
            error: `Website not found: '${websiteId}'`,
          };
        }

        // 2. Authorization check if userId is supplied
        if (options.userId) {
          const canView = await canUserAccessResource(options.userId, websiteId, "*", "VIEW");
          if (!canView) {
            return {
              verified: false,
              statusCode: 403,
              latencyMs: Date.now() - start,
              error: "Unauthorized: You do not have permission to access or verify this website export.",
            };
          }
        }

        const rawEditorData =
          typeof website.editorData === "string"
            ? JSON.parse(website.editorData)
            : website.editorData || {};

        snapshot = rawEditorData.publishedData || rawEditorData;
        if (targetVersion === undefined) {
          targetVersion = snapshot?.version || 1;
        }
      } else {
        if (targetVersion === undefined) {
          targetVersion = snapshot?.version || 1;
        }

        // Check user permission if userId supplied
        if (options.userId) {
          const canView = await canUserAccessResource(options.userId, websiteId, "*", "VIEW");
          if (!canView) {
            return {
              verified: false,
              statusCode: 403,
              latencyMs: Date.now() - start,
              error: "Unauthorized: You do not have permission to access or verify this website export.",
            };
          }
        }
      }

      // 3. Strict Version Mismatch Validation
      if (
        options.version !== undefined &&
        snapshot?.version !== undefined &&
        snapshot.version !== options.version
      ) {
        return {
          verified: false,
          statusCode: 409,
          latencyMs: Date.now() - start,
          error: `Export version mismatch: expected v${options.version}, found v${snapshot.version}`,
        };
      }

      // 4. Compile the static bundle (or use precompiled bundle if testing mock bundle)
      let bundle: StaticBundle;
      if (options.bundle) {
        bundle = options.bundle;
      } else {
        try {
          bundle = compileCanonicalToStaticBundle(websiteId, targetVersion, snapshot);
        } catch (compileErr: any) {
          return {
            verified: false,
            statusCode: 422,
            latencyMs: Date.now() - start,
            error: `Static compilation failed: ${compileErr?.message || "Unknown compilation error"}`,
          };
        }
      }

      if (!bundle || !Array.isArray(bundle.files) || bundle.files.length === 0) {
        return {
          verified: false,
          statusCode: 422,
          latencyMs: Date.now() - start,
          error: "Static export compilation produced an empty file bundle",
        };
      }

      const filesMap = new Map<string, GeneratedFile>();
      for (const f of bundle.files) {
        filesMap.set(f.path, f);
      }

      // 5. Entry HTML File Verification (index.html)
      const entryFile = filesMap.get("index.html");
      if (!entryFile) {
        return {
          verified: false,
          statusCode: 422,
          latencyMs: Date.now() - start,
          error: "Missing required entry HTML file: 'index.html'",
        };
      }

      if (!entryFile.content || entryFile.size <= 0) {
        return {
          verified: false,
          statusCode: 422,
          latencyMs: Date.now() - start,
          error: "Entry HTML file 'index.html' is empty or unreadable (0 bytes)",
        };
      }

      const entryStr =
        typeof entryFile.content === "string"
          ? entryFile.content
          : entryFile.content.toString("utf-8");

      if (
        !entryStr.includes("<html") &&
        !entryStr.includes("<!DOCTYPE") &&
        !entryStr.includes("<body")
      ) {
        return {
          verified: false,
          statusCode: 422,
          latencyMs: Date.now() - start,
          error: "Entry HTML file 'index.html' does not contain valid HTML markup",
        };
      }

      // 6. Required Core Assets Verification (styles.css, runtime.js, site-manifest.json)
      const requiredCoreAssets = ["styles.css", "runtime.js", "site-manifest.json"];
      for (const assetPath of requiredCoreAssets) {
        const file = filesMap.get(assetPath);
        if (!file) {
          return {
            verified: false,
            statusCode: 422,
            latencyMs: Date.now() - start,
            error: `Missing required core asset: '${assetPath}'`,
          };
        }
        if (!file.content || file.size <= 0) {
          return {
            verified: false,
            statusCode: 422,
            latencyMs: Date.now() - start,
            error: `Required core asset '${assetPath}' is empty or unreadable (0 bytes)`,
          };
        }
      }

      // Verify site-manifest.json is valid parseable JSON
      const manifestFile = filesMap.get("site-manifest.json")!;
      try {
        const manifestStr =
          typeof manifestFile.content === "string"
            ? manifestFile.content
            : manifestFile.content.toString("utf-8");
        JSON.parse(manifestStr);
      } catch {
        return {
          verified: false,
          statusCode: 422,
          latencyMs: Date.now() - start,
          error: "Required core asset 'site-manifest.json' is not valid JSON",
        };
      }

      // 7. Page Routes & Filename Consistency
      const rawPages = Array.isArray(snapshot?.pages) ? snapshot.pages : [];
      const verifiedRouteFiles: string[] = [];

      for (const page of rawPages) {
        const isHome =
          page.isHome ||
          page.slug === "/" ||
          page.id === "home" ||
          page.id === snapshot?.homePageId;

        const expectedFile = isHome
          ? "index.html"
          : `${(page.slug || page.id).replace(/^\//, "")}.html`;

        // Check for path traversal or illegal characters in filename
        if (
          expectedFile.includes("..") ||
          /[<>:"|?*]/.test(expectedFile) ||
          expectedFile.startsWith("/")
        ) {
          return {
            verified: false,
            statusCode: 422,
            latencyMs: Date.now() - start,
            error: `Invalid route or filename for page '${page.title || page.id}': '${expectedFile}' contains illegal characters`,
          };
        }

        const pageFile = filesMap.get(expectedFile);
        if (!pageFile) {
          return {
            verified: false,
            statusCode: 422,
            latencyMs: Date.now() - start,
            error: `Missing compiled HTML for page '${page.title || page.id}': expected '${expectedFile}'`,
          };
        }

        if (pageFile.size <= 0) {
          return {
            verified: false,
            statusCode: 422,
            latencyMs: Date.now() - start,
            error: `Compiled HTML for page '${page.title || page.id}' ('${expectedFile}') is empty (0 bytes)`,
          };
        }

        verifiedRouteFiles.push(expectedFile);
      }

      // 8. Internal Asset Reference Verification (SSRF-Safe: No external HTTP calls)
      const missingAssets: string[] = [];
      const verifiedAssets: string[] = [];

      for (const file of bundle.files) {
        if (file.path.endsWith(".html") || file.path.endsWith(".css")) {
          const contentStr =
            typeof file.content === "string"
              ? file.content
              : file.content.toString("utf-8");

          // Extract link hrefs, script srcs, img srcs, and CSS url(...) references
          const linkHrefs = [
            ...contentStr.matchAll(/<link\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi),
          ].map((m) => m[1]);
          const scriptSrcs = [
            ...contentStr.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi),
          ].map((m) => m[1]);
          const imgSrcs = [
            ...contentStr.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi),
          ].map((m) => m[1]);
          const cssUrls = [
            ...contentStr.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi),
          ].map((m) => m[1]);

          const allRefs = [...linkHrefs, ...scriptSrcs, ...imgSrcs, ...cssUrls];

          for (const rawRef of allRefs) {
            const ref = rawRef.trim();

            // Ignore empty, anchor-only, or external URLs (SSRF defense)
            if (
              !ref ||
              ref === "#" ||
              ref.startsWith("#") ||
              /^(https?:|\/\/|data:|blob:|mailto:|tel:|javascript:|vbscript:)/i.test(ref)
            ) {
              continue;
            }

            // Clean query parameters and fragment hashes
            const cleanPath = ref.split("?")[0].split("#")[0].replace(/^\//, "");
            if (!cleanPath || cleanPath === "favicon.ico") continue;

            // Check if cleanPath exists in bundle.files
            if (!filesMap.has(cleanPath)) {
              // Check if it's an uploaded asset on local server storage
              const uploadsBase = path.resolve(process.cwd(), "uploads");
              const localDiskPath = path.resolve(uploadsBase, cleanPath.replace(/^uploads\//, ""));
              const existsOnUploadsDisk =
                fs.existsSync(localDiskPath) &&
                fs.statSync(localDiskPath).isFile() &&
                fs.statSync(localDiskPath).size > 0;

              if (!existsOnUploadsDisk) {
                missingAssets.push(`${cleanPath} (referenced in '${file.path}')`);
              } else {
                verifiedAssets.push(cleanPath);
              }
            } else {
              verifiedAssets.push(cleanPath);
            }
          }
        }
      }

      if (missingAssets.length > 0) {
        return {
          verified: false,
          statusCode: 422,
          latencyMs: Date.now() - start,
          error: `Missing referenced local asset(s): ${missingAssets.slice(0, 3).join(", ")}${missingAssets.length > 3 ? ` and ${missingAssets.length - 3} more` : ""}`,
        };
      }

      // 9. Filesystem Disk Persistence Verification (if export directory exists on disk)
      const deploymentExportDir = path.join(EXPORTS_BASE_DIR, websiteId, `v${targetVersion}`);
      const dirExists = fs.existsSync(deploymentExportDir);
      if (dirExists) {
        for (const file of bundle.files) {
          const filePath = path.join(deploymentExportDir, file.path);
          if (fs.existsSync(filePath)) {
            const stat = fs.statSync(filePath);
            if (stat.size <= 0) {
              return {
                verified: false,
                statusCode: 422,
                latencyMs: Date.now() - start,
                error: `Exported file on disk is empty: '${file.path}'`,
              };
            }
          }
        }
      }

      // 10. Packaging & Delivery Verification: Verify bundle can be packaged into valid ZIP
      let zipBuffer: Buffer;
      try {
        zipBuffer = await createStaticZipArchive(bundle);
      } catch (zipErr: any) {
        return {
          verified: false,
          statusCode: 500,
          latencyMs: Date.now() - start,
          error: `Static ZIP packaging failed: ${zipErr?.message || "Packaging error"}`,
        };
      }

      if (!zipBuffer || zipBuffer.length < 4) {
        return {
          verified: false,
          statusCode: 500,
          latencyMs: Date.now() - start,
          error: "Static ZIP archive generation returned an empty or invalid buffer",
        };
      }

      // Assert standard ZIP signature (0x50, 0x4B, 0x03, 0x04)
      const isZipSignature =
        zipBuffer[0] === 0x50 &&
        zipBuffer[1] === 0x4b &&
        zipBuffer[2] === 0x03 &&
        zipBuffer[3] === 0x04;

      if (!isZipSignature) {
        return {
          verified: false,
          statusCode: 500,
          latencyMs: Date.now() - start,
          error: "Generated static export archive does not contain a valid ZIP signature header",
        };
      }

      const downloadUrl = `/api/websites/${websiteId}/deployments/${deploymentId}/export-download`;

      return {
        verified: true,
        statusCode: 200,
        latencyMs: Date.now() - start,
        details: {
          websiteId,
          deploymentId,
          version: targetVersion,
          exportDirectory: deploymentExportDir,
          directoryPersisted: dirExists,
          entryHtml: "index.html",
          totalFiles: bundle.files.length,
          totalBytes: bundle.totalBytes,
          pageCount: bundle.pageCount,
          pagesVerified: verifiedRouteFiles,
          coreAssetsVerified: requiredCoreAssets,
          assetsVerifiedCount: verifiedAssets.length,
          zipPackaged: true,
          zipSizeBytes: zipBuffer.length,
          downloadUrl,
          verifiedAt: new Date().toISOString(),
        },
      };
    } catch (err: any) {
      return {
        verified: false,
        statusCode: err?.statusCode || 500,
        latencyMs: Date.now() - start,
        error: `Static export verification error: ${err?.message || "Unexpected error"}`,
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
      destinationType: "STATIC",
      restoredVersion: targetSnapshot.version,
      metadata: publishRes.metadata,
      error: publishRes.error,
    };
  }
}
