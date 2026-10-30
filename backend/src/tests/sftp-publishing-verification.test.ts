import { prisma } from "../config/prisma.js";
import { publishWebsite, getWebsiteDeployments, verifyDeployment } from "../services/publishing.service.js";
import { createWebsite } from "../services/website.service.js";
import { SftpPublisher, setSftpClientFactory, ISftpTransportClient } from "../services/destinations/sftp.publisher.js";
import { InternalPublisher } from "../services/destinations/internal.publisher.js";
import { StaticExportPublisher } from "../services/destinations/staticExport.publisher.js";

const db = prisma as any;

function assert(condition: any, testName: string, detail?: string) {
  if (Boolean(condition)) {
    console.log(`[PASS] ${testName}`);
    return true;
  } else {
    console.error(`[FAIL] ${testName}${detail ? ` - Detail: ${detail}` : ""}`);
    return false;
  }
}

// Mock SFTP transport helper to configure mock behaviors
class MockSftpTransport implements ISftpTransportClient {
  public files: Map<string, { size: number; type: string; content?: string }> = new Map();
  public connectShouldFail: Error | null = null;
  public listShouldFail: Error | null = null;
  public getShouldFail: Error | null = null;
  public connected: boolean = false;
  public ended: boolean = false;

  constructor(initialFiles?: Array<{ path: string; size: number; type?: string; content?: string }>) {
    if (initialFiles) {
      for (const f of initialFiles) {
        this.files.set(f.path, {
          size: f.size,
          type: f.type || "-",
          content: f.content !== undefined ? f.content : "<!DOCTYPE html><html><body>Test</body></html>",
        });
      }
    }
  }

  async connect(_config: any): Promise<any> {
    if (this.connectShouldFail) {
      throw this.connectShouldFail;
    }
    this.connected = true;
    return true;
  }

  async mkdir(_remotePath: string, _recursive?: boolean): Promise<string> {
    return _remotePath;
  }

  async put(input: Buffer | string, remoteFilePath: string): Promise<string> {
    const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
    this.files.set(remoteFilePath, {
      size: buf.length,
      type: "-",
      content: buf.toString("utf8"),
    });
    return remoteFilePath;
  }

  async list(remotePath: string): Promise<any[]> {
    if (this.listShouldFail) {
      throw this.listShouldFail;
    }

    const cleanDir = remotePath.replace(/\/+$/, "");
    const results: any[] = [];
    const directNames = new Set<string>();

    for (const [fullPath, meta] of this.files.entries()) {
      if (fullPath.startsWith(cleanDir + "/")) {
        const sub = fullPath.substring(cleanDir.length + 1);
        const slashIdx = sub.indexOf("/");
        if (slashIdx === -1) {
          // Direct file in this dir
          if (!directNames.has(sub)) {
            directNames.add(sub);
            results.push({
              name: sub,
              type: meta.type,
              size: meta.size,
              modifyTime: Date.now(),
            });
          }
        } else {
          // Subdirectory
          const dirName = sub.substring(0, slashIdx);
          if (!directNames.has(dirName)) {
            directNames.add(dirName);
            results.push({
              name: dirName,
              type: "d",
              size: 4096,
              modifyTime: Date.now(),
            });
          }
        }
      }
    }
    return results;
  }

  async get(remoteFilePath: string): Promise<Buffer> {
    if (this.getShouldFail) {
      throw this.getShouldFail;
    }
    const item = this.files.get(remoteFilePath);
    if (!item) {
      throw new Error(`No such file: ${remoteFilePath}`);
    }
    return Buffer.from(item.content || "");
  }

  async end(): Promise<void> {
    this.ended = true;
    this.connected = false;
  }
}

async function runSftpPublishingVerificationTests() {
  console.log("=================================================");
  console.log("FEATURE 14 — SFTP PUBLISHING VERIFICATION TESTS");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function record(result: boolean) {
    if (result) passed++;
    else failed++;
  }

  const sftpPublisher = new SftpPublisher();

  let ownerUser: any = null;
  let foreignUser: any = null;
  let validWebsite: any = null;
  let sftpDeployment: any = null;

  try {
    // 1. Setup isolated test users and website
    ownerUser = await db.user.create({
      data: {
        email: `owner_sftp_${Date.now()}@forgestudio.dev`,
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
        fullName: "SFTP Owner",
        role: "USER",
      },
    });

    foreignUser = await db.user.create({
      data: {
        email: `foreign_sftp_${Date.now()}@forgestudio.dev`,
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
        fullName: "Foreign User",
        role: "USER",
      },
    });

    validWebsite = await createWebsite({
      name: "SFTP Portfolio Site",
      slug: `sftp-site-${Date.now()}`,
      userId: ownerUser.id,
      editorData: {
        version: 1,
        pages: [
          {
            id: "page-home",
            name: "Home",
            slug: "/",
            isHome: true,
            elements: [
              { id: "h1", type: "heading", content: "Welcome to SFTP Studio" },
              { id: "p1", type: "paragraph", content: "Reliable SFTP verification" },
            ],
          },
          {
            id: "page-about",
            name: "About Us",
            slug: "/about",
            elements: [
              { id: "h2", type: "heading", content: "About Us" },
            ],
          },
        ],
      },
    });

    // Setup active SFTP connection
    await db.sftpConnection.create({
      data: {
        websiteId: validWebsite.id,
        host: "sftp.testserver.org",
        port: 22,
        username: "deploy_user",
        remotePath: "/var/www/html",
        isActive: true,
      },
    });

    // Create a base SFTP deployment record in QUEUED status
    sftpDeployment = await db.deployment.create({
      data: {
        websiteId: validWebsite.id,
        version: 1,
        status: "QUEUED",
        environment: "PRODUCTION",
        destinationType: "SFTP",
        destinationRef: "sftp://deploy_user@sftp.testserver.org:/var/www/html",
        createdBy: ownerUser.id,
      },
    });

    // -------------------------------------------------------------
    // Test 1: Successful verification with mocked SFTP transport
    // -------------------------------------------------------------
    const mockTransport = new MockSftpTransport([
      { path: "/var/www/html/index.html", size: 1250, content: "<!DOCTYPE html><html><body>Home</body></html>" },
      { path: "/var/www/html/about.html", size: 980, content: "<!DOCTYPE html><html><body>About</body></html>" },
      { path: "/var/www/html/styles.css", size: 450, content: "body { margin: 0; }" },
      { path: "/var/www/html/runtime.js", size: 320, content: "console.log('runtime');" },
      { path: "/var/www/html/site-manifest.json", size: 210, content: '{"name":"SFTP Portfolio Site"}' },
    ]);

    setSftpClientFactory(() => mockTransport);

    const test1Res = await sftpPublisher.verify(validWebsite.id, sftpDeployment.id, {
      userId: ownerUser.id,
    });

    const updatedDep1 = await db.deployment.findUnique({ where: { id: sftpDeployment.id } });

    record(
      assert(
        test1Res.verified === true &&
        test1Res.statusCode === 200 &&
        test1Res.details?.verifiedFilesCount === 5 &&
        updatedDep1?.status === "PUBLISHED" &&
        updatedDep1?.error === null &&
        updatedDep1?.metadata?.verificationDetails?.remotePath === "/var/www/html" &&
        mockTransport.ended === true,
        "Test 1: Successful verification with mocked SFTP transport marks deployment PUBLISHED and closes connection safely",
        JSON.stringify(test1Res)
      )
    );

    // -------------------------------------------------------------
    // Test 2: Missing required remote files returns 422 and VERIFICATION_FAILED
    // -------------------------------------------------------------
    const mockMissingTransport = new MockSftpTransport([
      { path: "/var/www/html/index.html", size: 1250 },
      // styles.css is missing!
      { path: "/var/www/html/runtime.js", size: 320 },
      { path: "/var/www/html/site-manifest.json", size: 210 },
      { path: "/var/www/html/about.html", size: 980 },
    ]);

    setSftpClientFactory(() => mockMissingTransport);

    const test2Res = await sftpPublisher.verify(validWebsite.id, sftpDeployment.id, {
      userId: ownerUser.id,
    });

    const updatedDep2 = await db.deployment.findUnique({ where: { id: sftpDeployment.id } });

    record(
      assert(
        test2Res.verified === false &&
        test2Res.statusCode === 422 &&
        test2Res.error?.includes("styles.css") &&
        updatedDep2?.status === "VERIFICATION_FAILED" &&
        mockMissingTransport.ended === true,
        "Test 2: Missing required remote file ('styles.css') returns 422 and updates status to VERIFICATION_FAILED",
        JSON.stringify(test2Res)
      )
    );

    // -------------------------------------------------------------
    // Test 3: Empty (0-byte) remote files returns 422
    // -------------------------------------------------------------
    const mockEmptyTransport = new MockSftpTransport([
      { path: "/var/www/html/index.html", size: 0, content: "" }, // 0 bytes empty file!
      { path: "/var/www/html/about.html", size: 980 },
      { path: "/var/www/html/styles.css", size: 450 },
      { path: "/var/www/html/runtime.js", size: 320 },
      { path: "/var/www/html/site-manifest.json", size: 210 },
    ]);

    setSftpClientFactory(() => mockEmptyTransport);

    const test3Res = await sftpPublisher.verify(validWebsite.id, sftpDeployment.id, {
      userId: ownerUser.id,
    });

    const updatedDep3 = await db.deployment.findUnique({ where: { id: sftpDeployment.id } });

    record(
      assert(
        test3Res.verified === false &&
        test3Res.statusCode === 422 &&
        test3Res.error?.includes("0 bytes") &&
        updatedDep3?.status === "VERIFICATION_FAILED",
        "Test 3: Empty (0-byte) remote file ('index.html') returns 422 and marks deployment VERIFICATION_FAILED",
        JSON.stringify(test3Res)
      )
    );

    // -------------------------------------------------------------
    // Test 4: Corrupt / non-HTML content returns 422
    // -------------------------------------------------------------
    const mockCorruptTransport = new MockSftpTransport([
      { path: "/var/www/html/index.html", size: 50, content: "CORRUPTED_BINARY_PAYLOAD_WITHOUT_HTML" },
      { path: "/var/www/html/about.html", size: 980 },
      { path: "/var/www/html/styles.css", size: 450 },
      { path: "/var/www/html/runtime.js", size: 320 },
      { path: "/var/www/html/site-manifest.json", size: 210 },
    ]);

    setSftpClientFactory(() => mockCorruptTransport);

    const test4Res = await sftpPublisher.verify(validWebsite.id, sftpDeployment.id, {
      userId: ownerUser.id,
    });

    record(
      assert(
        test4Res.verified === false &&
        test4Res.statusCode === 422 &&
        test4Res.error?.toLowerCase().includes("valid html"),
        "Test 4: Non-HTML index.html content returns 422 CORRUPT_REMOTE_CONTENT error",
        JSON.stringify(test4Res)
      )
    );

    // -------------------------------------------------------------
    // Test 5: Connection failure / timeout returns 504 / 502
    // -------------------------------------------------------------
    const mockTimeoutTransport = new MockSftpTransport();
    mockTimeoutTransport.connectShouldFail = new Error("ETIMEDOUT: Connection timed out after 15000ms");

    setSftpClientFactory(() => mockTimeoutTransport);

    const test5Res = await sftpPublisher.verify(validWebsite.id, sftpDeployment.id, {
      userId: ownerUser.id,
    });

    record(
      assert(
        test5Res.verified === false &&
        (test5Res.statusCode === 504 || test5Res.statusCode === 502) &&
        test5Res.error?.includes("SFTP connection failed"),
        "Test 5: Connection timeout accurately returns 504/502 and fails safely",
        JSON.stringify(test5Res)
      )
    );

    // -------------------------------------------------------------
    // Test 6: Authentication failure returns 401
    // -------------------------------------------------------------
    const mockAuthFailTransport = new MockSftpTransport();
    mockAuthFailTransport.connectShouldFail = new Error("All configured authentication methods failed (denied)");

    setSftpClientFactory(() => mockAuthFailTransport);

    const test6Res = await sftpPublisher.verify(validWebsite.id, sftpDeployment.id, {
      userId: ownerUser.id,
    });

    record(
      assert(
        test6Res.verified === false &&
        test6Res.statusCode === 401 &&
        test6Res.error?.toLowerCase().includes("authentication"),
        "Test 6: Authentication failure accurately returns 401 status code",
        JSON.stringify(test6Res)
      )
    );

    // -------------------------------------------------------------
    // Test 7: Permission denied on remote directory returns 403
    // -------------------------------------------------------------
    const mockPermDeniedTransport = new MockSftpTransport();
    mockPermDeniedTransport.listShouldFail = new Error("Permission denied (EACCES) on remote path");

    setSftpClientFactory(() => mockPermDeniedTransport);

    const test7Res = await sftpPublisher.verify(validWebsite.id, sftpDeployment.id, {
      userId: ownerUser.id,
    });

    record(
      assert(
        test7Res.verified === false &&
        test7Res.statusCode === 403 &&
        test7Res.error?.toLowerCase().includes("permission denied"),
        "Test 7: Permission denied on remote directory returns 403 status code",
        JSON.stringify(test7Res)
      )
    );

    // -------------------------------------------------------------
    // Test 8: Non-existent remote directory returns 404
    // -------------------------------------------------------------
    const mockNotFoundTransport = new MockSftpTransport();
    mockNotFoundTransport.listShouldFail = new Error("No such file or directory (ENOENT)");

    setSftpClientFactory(() => mockNotFoundTransport);

    const test8Res = await sftpPublisher.verify(validWebsite.id, sftpDeployment.id, {
      userId: ownerUser.id,
    });

    record(
      assert(
        test8Res.verified === false &&
        test8Res.statusCode === 404 &&
        test8Res.error?.toLowerCase().includes("remote directory"),
        "Test 8: Non-existent remote directory returns 404 status code",
        JSON.stringify(test8Res)
      )
    );

    // -------------------------------------------------------------
    // Test 9: Unsafe remote path with directory traversal rejected with 400
    // -------------------------------------------------------------
    await db.sftpConnection.updateMany({
      where: { websiteId: validWebsite.id },
      data: { remotePath: "/var/www/../../etc/passwd" },
    });

    const test9Res = await sftpPublisher.verify(validWebsite.id, sftpDeployment.id, {
      userId: ownerUser.id,
    });

    // Restore safe remote path
    await db.sftpConnection.updateMany({
      where: { websiteId: validWebsite.id },
      data: { remotePath: "/var/www/html" },
    });

    record(
      assert(
        test9Res.verified === false &&
        test9Res.statusCode === 400 &&
        test9Res.error?.includes("traversal"),
        "Test 9: Directory traversal in remotePath is strictly rejected with 400",
        JSON.stringify(test9Res)
      )
    );

    // -------------------------------------------------------------
    // Test 10: Website and deployment ownership / RBAC violations return 403
    // -------------------------------------------------------------
    setSftpClientFactory(() => mockTransport);

    const test10Res = await sftpPublisher.verify(validWebsite.id, sftpDeployment.id, {
      userId: foreignUser.id, // Unrelated user without permissions
    });

    record(
      assert(
        test10Res.verified === false &&
        test10Res.statusCode === 403 &&
        test10Res.error?.toLowerCase().includes("insufficient permissions"),
        "Test 10: Unauthorized user cannot verify deployment (403 Forbidden)",
        JSON.stringify(test10Res)
      )
    );

    // -------------------------------------------------------------
    // Test 11: Version mismatch rejection returns 409 Conflict
    // -------------------------------------------------------------
    const test11Res = await sftpPublisher.verify(validWebsite.id, sftpDeployment.id, {
      userId: ownerUser.id,
      version: 99, // Mismatched version
    });

    record(
      assert(
        test11Res.verified === false &&
        test11Res.statusCode === 409 &&
        test11Res.error?.includes("mismatch"),
        "Test 11: Deployment version mismatch returns 409 Conflict",
        JSON.stringify(test11Res)
      )
    );

    // -------------------------------------------------------------
    // Test 12: Rolled-back deployment rejection returns 409
    // -------------------------------------------------------------
    await db.deployment.update({
      where: { id: sftpDeployment.id },
      data: { status: "ROLLED_BACK" },
    });

    const test12Res = await sftpPublisher.verify(validWebsite.id, sftpDeployment.id, {
      userId: ownerUser.id,
    });

    record(
      assert(
        test12Res.verified === false &&
        test12Res.statusCode === 409 &&
        test12Res.error?.includes("rolled back"),
        "Test 12: Rolled-back deployment verification is rejected with 409",
        JSON.stringify(test12Res)
      )
    );

    // -------------------------------------------------------------
    // Test 13: Build-failed deployment rejection returns 422
    // -------------------------------------------------------------
    await db.deployment.update({
      where: { id: sftpDeployment.id },
      data: { status: "BUILD_FAILED" },
    });

    const test13Res = await sftpPublisher.verify(validWebsite.id, sftpDeployment.id, {
      userId: ownerUser.id,
    });

    record(
      assert(
        test13Res.verified === false &&
        test13Res.statusCode === 422 &&
        test13Res.error?.includes("build failed"),
        "Test 13: Build-failed deployment verification is rejected with 422",
        JSON.stringify(test13Res)
      )
    );

    // -------------------------------------------------------------
    // Test 14: Idempotent repeated verification without duplicate deployment records
    // -------------------------------------------------------------
    await db.deployment.update({
      where: { id: sftpDeployment.id },
      data: { status: "QUEUED" },
    });

    const depCountBefore = await db.deployment.count({ where: { websiteId: validWebsite.id } });

    // Run verification pass 1
    const pass1 = await sftpPublisher.verify(validWebsite.id, sftpDeployment.id, { userId: ownerUser.id });
    const depCountMiddle = await db.deployment.count({ where: { websiteId: validWebsite.id } });

    // Run verification pass 2 (retry / repeated check)
    const pass2 = await sftpPublisher.verify(validWebsite.id, sftpDeployment.id, { userId: ownerUser.id });
    const depCountAfter = await db.deployment.count({ where: { websiteId: validWebsite.id } });

    const depRecordFinal = await db.deployment.findUnique({ where: { id: sftpDeployment.id } });

    record(
      assert(
        pass1.verified === true &&
        pass2.verified === true &&
        depCountBefore === depCountMiddle &&
        depCountMiddle === depCountAfter &&
        depRecordFinal?.version === 1 &&
        depRecordFinal?.status === "PUBLISHED",
        "Test 14: Repeated verification is idempotent: updates status in place with 0 duplicate records and preserves version",
        `Count: ${depCountAfter}, Version: ${depRecordFinal?.version}`
      )
    );

    // -------------------------------------------------------------
    // Test 15: No secrets exposed in errors, details, or metadata
    // -------------------------------------------------------------
    const sensitiveSecret = "super_secret_ssh_key_9988776655";
    const mockSecretLeakTransport = new MockSftpTransport();
    mockSecretLeakTransport.connectShouldFail = new Error(`Connection failed using private key ${sensitiveSecret}`);

    setSftpClientFactory(() => mockSecretLeakTransport);

    const test15Res = await sftpPublisher.verify(validWebsite.id, sftpDeployment.id, {
      userId: ownerUser.id,
      privateKey: sensitiveSecret,
    });

    const depWithMetadata = await db.deployment.findUnique({ where: { id: sftpDeployment.id } });
    const serializedDep = JSON.stringify(depWithMetadata);
    const serializedResult = JSON.stringify(test15Res);

    record(
      assert(
        !serializedResult.includes(sensitiveSecret) &&
        !serializedDep.includes(sensitiveSecret) &&
        test15Res.error?.includes("[REDACTED]"),
        "Test 15: Secrets (passwords, private keys) are fully redacted and never exposed in errors or metadata",
        test15Res.error
      )
    );

    // -------------------------------------------------------------
    // Test 16: Configuration-only verification (when deploymentId is empty)
    // -------------------------------------------------------------
    setSftpClientFactory(() => mockTransport);

    const test16Res = await sftpPublisher.verify(validWebsite.id, "", {
      userId: ownerUser.id,
    });

    record(
      assert(
        test16Res.verified === true &&
        test16Res.statusCode === 200 &&
        test16Res.details?.status === "CONFIG_VERIFIED" &&
        test16Res.details?.host === "sftp.testserver.org",
        "Test 16: Configuration-only verification (empty deploymentId) verifies SFTP host and remote directory accessibility",
        JSON.stringify(test16Res)
      )
    );

    // -------------------------------------------------------------
    // Test 17: Service-level verifyDeployment routing works for SFTP
    // -------------------------------------------------------------
    // Set deployment to QUEUED again
    await db.deployment.update({
      where: { id: sftpDeployment.id },
      data: { status: "QUEUED", error: null },
    });

    const serviceResult = await verifyDeployment(validWebsite.id, sftpDeployment.id, ownerUser.id);
    const serviceDep = await db.deployment.findUnique({ where: { id: sftpDeployment.id } });

    record(
      assert(
        serviceResult.verified === true &&
        serviceDep?.status === "PUBLISHED" &&
        serviceResult.details?.destinationType === "SFTP",
        "Test 17: Service-level verifyDeployment seamlessly dispatches to SFTP verification engine and updates DB",
        JSON.stringify(serviceResult)
      )
    );

    // -------------------------------------------------------------
    // Test 18: Regressions — Feature 12 & Feature 13 Publishers
    // -------------------------------------------------------------
    const internalPublisher = new InternalPublisher();
    const staticPublisher = new StaticExportPublisher();

    const internalDep = await db.deployment.create({
      data: {
        websiteId: validWebsite.id,
        version: 1,
        status: "QUEUED",
        environment: "PRODUCTION",
        destinationType: "INTERNAL",
        createdBy: ownerUser.id,
      },
    });

    await internalPublisher.publish(validWebsite.id, internalDep.id, {
      version: 1,
      ...validWebsite.editorData,
    });

    const internalRes = await internalPublisher.verify(validWebsite.id, internalDep.id, {
      userId: ownerUser.id,
      version: 1,
    });

    // Create a static deployment for static publisher check
    const staticDep = await db.deployment.create({
      data: {
        websiteId: validWebsite.id,
        version: 1,
        status: "QUEUED",
        environment: "PRODUCTION",
        destinationType: "STATIC",
        createdBy: ownerUser.id,
        metadata: {
          snapshot: validWebsite.editorData,
        },
      },
    });

    const staticRes = await staticPublisher.verify(validWebsite.id, staticDep.id, {
      userId: ownerUser.id,
    });

    record(
      assert(
        internalRes.verified === true &&
        internalRes.statusCode === 200 &&
        staticRes.verified === true &&
        staticRes.statusCode === 200,
        "Test 18: Regression guard — Feature 12 (Internal) and Feature 13 (Static Export) verification pass without issues",
        `Internal: ${internalRes.statusCode}, Static: ${staticRes.statusCode}`
      )
    );

  } catch (error: any) {
    console.error("FATAL ERROR in test execution:", error);
    record(false);
  } finally {
    // Reset sftp client factory
    setSftpClientFactory(null);

    // Cleanup test data
    try {
      if (validWebsite) {
        await db.deployment.deleteMany({ where: { websiteId: validWebsite.id } });
        await db.sftpConnection.deleteMany({ where: { websiteId: validWebsite.id } });
        await db.website.delete({ where: { id: validWebsite.id } });
      }
      if (ownerUser) {
        await db.user.delete({ where: { id: ownerUser.id } });
      }
      if (foreignUser) {
        await db.user.delete({ where: { id: foreignUser.id } });
      }
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr);
    }
  }

  console.log("\n=================================================");
  console.log(`SFTP VERIFICATION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runSftpPublishingVerificationTests();
