import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { prisma } from "../src/config/prisma.js";
import {
  publishWebsite,
} from "../src/services/publishing.service.js";
import {
  getTrustedPublicOrigin,
  constructAbsolutePublicUrl,
} from "../src/utils/publicUrl.js";
import { InternalPublisher } from "../src/services/destinations/internal.publisher.js";
import {
  SftpPublisher,
  setSftpClientFactory,
  type ISftpTransportClient,
} from "../src/services/destinations/sftp.publisher.js";
import { StaticExportPublisher } from "../src/services/destinations/staticExport.publisher.js";
import { WordPressPublisher } from "../src/services/destinations/wordpress.publisher.js";
import { destinationRegistry } from "../src/services/destinations/registry.js";

dotenv.config();

function logPass(title: string, details?: string) {
  console.log(`  ✓ [PASS] ${title}${details ? ` - ${details}` : ""}`);
}

function logFail(title: string, error: any) {
  console.error(`  ✗ [FAIL] ${title}:`, error);
}

async function runDestinationVerificationAndUrlSuite() {
  console.log("\n==================================================================");
  console.log("  P0 DESTINATION VERIFICATION & PUBLIC URL TEST SUITE             ");
  console.log("  ISSUES 21, 22, 24                                               ");
  console.log("==================================================================\n");

  const origAuditLog = (prisma as any).auditLog;
  (prisma as any).auditLog = { create: async () => ({}) };

  let passed = 0;
  let failed = 0;

  async function runCase(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      logPass(name);
      passed++;
    } catch (err: any) {
      logFail(name, err);
      failed++;
    }
  }

  const testUserId = "00000000-0000-0000-0000-000000000001";
  const testSiteId = "00000000-0000-0000-0000-000000000099";

  function createTxMock(overrides: {
    siteVersion?: number;
    siteEditorData?: any;
    siteStatus?: string;
    onSiteUpdate?: (data: any) => void;
    onDeploymentUpdate?: (data: any) => void;
  } = {}) {
    let ver = overrides.siteVersion ?? 1;
    let ed = overrides.siteEditorData ?? {
      homePageId: "p1",
      pages: [
        {
          id: "p1",
          name: "Home",
          slug: "/",
          isHome: true,
          elements: [{ id: "e1", type: "heading", content: "Test Site" }],
        },
      ],
      elements: [{ id: "e1", type: "heading", content: "Test Site" }],
    };
    let st = overrides.siteStatus ?? "DRAFT";

    const deploymentMock = {
      findFirst: async () => ({ version: 1 }),
      findMany: async () => [],
      create: async (args: any) => ({
        id: "dep_mock_1",
        websiteId: testSiteId,
        status: args.data?.status || "QUEUED",
        version: args.data?.version || 1,
        environment: "PRODUCTION",
        ...args.data,
      }),
      update: async (args: any) => {
        if (overrides.onDeploymentUpdate) overrides.onDeploymentUpdate(args.data);
        return {
          id: args.where?.id || "dep_mock_1",
          websiteId: testSiteId,
          status: args.data?.status,
          ...args.data,
        };
      },
    };

    return {
      websiteRevision: {
        findFirst: async () => ({ version: 1 }),
        create: async (args: any) => ({
          id: "rev_mock_1",
          version: 2,
          ...args.data,
        }),
        count: async () => 1,
      },
      website: {
        findUnique: async () => ({
          id: testSiteId,
          version: ver,
          editorData: ed,
          status: st,
          slug: "test-site",
          name: "Test Site",
          userId: testUserId,
          workspaceId: "ws-1",
          collaborators: [],
          workspace: { id: "ws-1", role: "ADMIN", members: [] },
          updatedAt: new Date(),
        }),
        updateMany: async (args: any) => {
          if (overrides.onSiteUpdate) overrides.onSiteUpdate(args.data);
          ver = args.data.version || ver + 1;
          if (args.data.editorData) ed = args.data.editorData;
          if (args.data.status) st = args.data.status;
          return { count: 1 };
        },
      },
      deployment: deploymentMock,
      user: {
        findUnique: async () => ({ id: testUserId, email: "user@forgestudio.test" }),
      },
      auditLog: {
        create: async () => ({}),
      },
    };
  }

  // =========================================================================
  // ISSUE 21 TESTS: STRICT DESTINATION RESULT VALIDATION
  // =========================================================================
  console.log("\n--- ISSUE 21: Strict Destination Result Validation ---");

  await runCase("21.1: Reject destination result when success: false", async () => {
    let deploymentStatus = "";
    const fakePublisher = {
      destinationType: "STATIC" as const,
      publish: async () => ({
        success: false,
        destinationType: "STATIC" as const,
        error: { message: "Disk full or IO error writing static files" },
      }),
      verify: async () => ({ verified: true, statusCode: 200, latencyMs: 1 }),
      rollback: async () => ({ success: true, destinationType: "STATIC" as const }),
    };

    destinationRegistry.register(fakePublisher);

    const orig$transaction = prisma.$transaction;
    const origFindUnique = prisma.website.findUnique;
    const origUpdateMany = prisma.website.updateMany;
    const origDeployment = (prisma as any).deployment;

    try {
      const mockTx = createTxMock({
        onDeploymentUpdate: (data) => {
          if (data.status) deploymentStatus = data.status;
        },
      });
      (prisma as any).$transaction = async (cb: any) => cb(mockTx);
      (prisma as any).website.findUnique = mockTx.website.findUnique;
      (prisma as any).website.updateMany = mockTx.website.updateMany;
      (prisma as any).deployment = mockTx.deployment;

      let errorThrown: any = null;
      try {
        await publishWebsite(testSiteId, testUserId, {
          destinationType: "STATIC",
        });
      } catch (err) {
        errorThrown = err;
      }

      assert(errorThrown, "Expected publishWebsite to throw when publisher returns success: false");
      assert.strictEqual(errorThrown.status || errorThrown.statusCode, 502);
      assert.strictEqual(errorThrown.code, "DESTINATION_PUBLISH_FAILED");
      assert.strictEqual(deploymentStatus, "DEPLOY_FAILED");
    } finally {
      (prisma as any).$transaction = orig$transaction;
      (prisma as any).website.findUnique = origFindUnique;
      (prisma as any).website.updateMany = origUpdateMany;
      (prisma as any).deployment = origDeployment;
      destinationRegistry.register(new StaticExportPublisher());
    }
  });

  await runCase("21.2: Reject malformed or null destination publish result", async () => {
    let deploymentStatus = "";
    const fakePublisher = {
      destinationType: "SFTP" as const,
      publish: async () => null as any,
      verify: async () => ({ verified: true, statusCode: 200, latencyMs: 1 }),
      rollback: async () => ({ success: true, destinationType: "SFTP" as const }),
    };

    destinationRegistry.register(fakePublisher);

    const orig$transaction = prisma.$transaction;
    const origFindUnique = prisma.website.findUnique;
    const origUpdateMany = prisma.website.updateMany;
    const origDeployment = (prisma as any).deployment;
    const origSftpFind = (prisma as any).sftpConnection?.findFirst;

    (prisma as any).sftpConnection = {
      findFirst: async () => ({
        id: "sftp-1",
        websiteId: testSiteId,
        host: "sftp.test",
        username: "user",
        remotePath: "/var/www",
        isActive: true,
      }),
    };

    try {
      const mockTx = createTxMock({
        onDeploymentUpdate: (data) => {
          if (data.status) deploymentStatus = data.status;
        },
      });
      (prisma as any).$transaction = async (cb: any) => cb(mockTx);
      (prisma as any).website.findUnique = mockTx.website.findUnique;
      (prisma as any).website.updateMany = mockTx.website.updateMany;
      (prisma as any).deployment = mockTx.deployment;

      let errorThrown: any = null;
      try {
        await publishWebsite(testSiteId, testUserId, {
          destinationType: "SFTP",
        });
      } catch (err) {
        errorThrown = err;
      }

      assert(errorThrown, "Expected publishWebsite to throw on null publishResult");
      assert.strictEqual(errorThrown.code, "DESTINATION_RESULT_INVALID");
      assert.strictEqual(deploymentStatus, "DEPLOY_FAILED");
    } finally {
      (prisma as any).$transaction = orig$transaction;
      (prisma as any).website.findUnique = origFindUnique;
      (prisma as any).website.updateMany = origUpdateMany;
      (prisma as any).deployment = origDeployment;
      if (origSftpFind) (prisma as any).sftpConnection.findFirst = origSftpFind;
      destinationRegistry.register(new SftpPublisher());
    }
  });

  await runCase("21.3: Reject destination type mismatch in publish result", async () => {
    let deploymentStatus = "";
    const fakePublisher = {
      destinationType: "STATIC" as const,
      publish: async () => ({
        success: true,
        destinationType: "SFTP" as const, // Mismatched type!
        destinationRef: "sftp://host/path",
      }),
      verify: async () => ({ verified: true, statusCode: 200, latencyMs: 1 }),
      rollback: async () => ({ success: true, destinationType: "STATIC" as const }),
    };

    destinationRegistry.register(fakePublisher);

    const orig$transaction = prisma.$transaction;
    const origFindUnique = prisma.website.findUnique;
    const origUpdateMany = prisma.website.updateMany;
    const origDeployment = (prisma as any).deployment;

    try {
      const mockTx = createTxMock({
        onDeploymentUpdate: (data) => {
          if (data.status) deploymentStatus = data.status;
        },
      });
      (prisma as any).$transaction = async (cb: any) => cb(mockTx);
      (prisma as any).website.findUnique = mockTx.website.findUnique;
      (prisma as any).website.updateMany = mockTx.website.updateMany;
      (prisma as any).deployment = mockTx.deployment;

      let errorThrown: any = null;
      try {
        await publishWebsite(testSiteId, testUserId, {
          destinationType: "STATIC",
        });
      } catch (err) {
        errorThrown = err;
      }

      assert(errorThrown, "Expected publishWebsite to throw on mismatched destinationType");
      assert.strictEqual(errorThrown.code, "DESTINATION_TYPE_MISMATCH");
      assert.strictEqual(deploymentStatus, "DEPLOY_FAILED");
    } finally {
      (prisma as any).$transaction = orig$transaction;
      (prisma as any).website.findUnique = origFindUnique;
      (prisma as any).website.updateMany = origUpdateMany;
      (prisma as any).deployment = origDeployment;
      destinationRegistry.register(new StaticExportPublisher());
    }
  });

  await runCase("21.4: Reject publish result missing destinationRef", async () => {
    let deploymentStatus = "";
    const fakePublisher = {
      destinationType: "STATIC" as const,
      publish: async () => ({
        success: true,
        destinationType: "STATIC" as const,
        destinationRef: "", // empty destinationRef
      }),
      verify: async () => ({ verified: true, statusCode: 200, latencyMs: 1 }),
      rollback: async () => ({ success: true, destinationType: "STATIC" as const }),
    };

    destinationRegistry.register(fakePublisher);

    const orig$transaction = prisma.$transaction;
    const origFindUnique = prisma.website.findUnique;
    const origUpdateMany = prisma.website.updateMany;
    const origDeployment = (prisma as any).deployment;

    try {
      const mockTx = createTxMock({
        onDeploymentUpdate: (data) => {
          if (data.status) deploymentStatus = data.status;
        },
      });
      (prisma as any).$transaction = async (cb: any) => cb(mockTx);
      (prisma as any).website.findUnique = mockTx.website.findUnique;
      (prisma as any).website.updateMany = mockTx.website.updateMany;
      (prisma as any).deployment = mockTx.deployment;

      let errorThrown: any = null;
      try {
        await publishWebsite(testSiteId, testUserId, {
          destinationType: "STATIC",
        });
      } catch (err) {
        errorThrown = err;
      }

      assert(errorThrown, "Expected publishWebsite to throw when destinationRef is missing");
      assert.strictEqual(errorThrown.code, "DESTINATION_REF_MISSING");
      assert.strictEqual(deploymentStatus, "DEPLOY_FAILED");
    } finally {
      (prisma as any).$transaction = orig$transaction;
      (prisma as any).website.findUnique = origFindUnique;
      (prisma as any).website.updateMany = origUpdateMany;
      (prisma as any).deployment = origDeployment;
      destinationRegistry.register(new StaticExportPublisher());
    }
  });

  await runCase("21.5: StaticExportPublisher does NOT swallow filesystem write errors", async () => {
    const publisher = new StaticExportPublisher();
    const origWriteFileSync = fs.writeFileSync;

    // Simulate filesystem write error (e.g. disk full / EACCES)
    (fs as any).writeFileSync = () => {
      throw new Error("EACCES: permission denied, write");
    };

    try {
      const result = await publisher.publish(
        "test-site-err",
        "dep-err-1",
        {
          version: 1,
          homePageId: "home",
          pages: [{ id: "home", elements: [] }],
        }
      );

      assert.strictEqual(result.success, false, "Static publisher must return success: false when write fails");
      assert(result.error, "Result must contain error details");
      assert.strictEqual(result.destinationType, "STATIC");
    } finally {
      (fs as any).writeFileSync = origWriteFileSync;
    }
  });

  // =========================================================================
  // ISSUE 22 TESTS: MEANINGFUL DESTINATION CONTENT VERIFICATION
  // =========================================================================
  console.log("\n--- ISSUE 22: Meaningful Destination Content Verification ---");

  await runCase("22.1: InternalPublisher verify succeeds for matching published version", async () => {
    const publisher = new InternalPublisher();
    const result = await publisher.verify(testSiteId, "dep-1", {
      version: 2,
      publicWebsiteResolver: async (id: string) => ({
        id,
        status: "PUBLISHED",
        editorData: {
          version: 2,
          publishing: { version: 2, status: "PUBLISHED" },
          pages: [{ id: "home", title: "Home" }],
        },
      }),
    });

    assert.strictEqual(result.verified, true);
    assert.strictEqual(result.statusCode, 200);
    assert.strictEqual(result.details?.verificationType, "PUBLIC_HTTP_ANONYMOUS_DELIVERY");
  });

  await runCase("22.2: InternalPublisher verify fails when public website returns 404 or not published", async () => {
    const publisher = new InternalPublisher();
    const result = await publisher.verify(testSiteId, "dep-1", {
      version: 2,
      publicWebsiteResolver: async () => null,
    });

    assert.strictEqual(result.verified, false);
    assert.strictEqual(result.statusCode, 404);
    assert(result.error?.includes("unavailable or not in PUBLISHED state"));
  });

  await runCase("22.3: InternalPublisher verify fails when published version mismatches", async () => {
    const publisher = new InternalPublisher();
    const result = await publisher.verify(testSiteId, "dep-1", {
      version: 5,
      publicWebsiteResolver: async (id: string) => ({
        id,
        status: "PUBLISHED",
        editorData: {
          publishing: { version: 4 }, // Stale version!
        },
      }),
    });

    assert.strictEqual(result.verified, false);
    assert.strictEqual(result.statusCode, 422);
    assert(result.error?.includes("Public snapshot version mismatch"));
  });

  await runCase("22.4: InternalPublisher verify fails when draft marker leaks to public response", async () => {
    const publisher = new InternalPublisher();
    const result = await publisher.verify(testSiteId, "dep-1", {
      version: 2,
      draftMarker: "SECRET_DRAFT_CONTENT_XYZ",
      publicWebsiteResolver: async (id: string) => ({
        id,
        status: "PUBLISHED",
        editorData: {
          publishing: { version: 2 },
          leakedContent: "SECRET_DRAFT_CONTENT_XYZ",
        },
      }),
    });

    assert.strictEqual(result.verified, false);
    assert.strictEqual(result.statusCode, 422);
    assert(result.error?.includes("draft isolation violation"));
  });

  await runCase("22.5: SftpPublisher verify connects and succeeds when remote files are verified", async () => {
    const publisher = new SftpPublisher();
    const origFindFirst = (prisma as any).sftpConnection?.findFirst;

    (prisma as any).sftpConnection = {
      findFirst: async () => ({
        id: "sftp-conn-1",
        websiteId: testSiteId,
        host: "sftp.example.com",
        username: "deployer",
        remotePath: "/var/www/site",
        port: 22,
        isActive: true,
      }),
    };

    let connected = false;
    let closed = false;

    const mockClient: ISftpTransportClient = {
      connect: async () => { connected = true; },
      mkdir: async () => "/var/www/site",
      put: async () => "/var/www/site/index.html",
      list: async () => [
        { name: "index.html", type: "-", size: 1024 },
        { name: "styles.css", type: "-", size: 512 },
      ],
      end: async () => { closed = true; },
    };

    setSftpClientFactory(() => mockClient);

    try {
      const result = await publisher.verify(testSiteId, "dep-1", {
        version: 1,
      });

      assert.strictEqual(result.verified, true);
      assert.strictEqual(result.statusCode, 200);
      assert.strictEqual(result.details?.verificationType, "REMOTE_FILE_VERIFICATION");
      assert.strictEqual(result.details?.indexVerified, true);
      assert.strictEqual(result.details?.remoteFilesCount, 2);
      assert.strictEqual(connected, true, "SFTP client must connect during verify");
      assert.strictEqual(closed, true, "SFTP client must close connection cleanly");
    } finally {
      setSftpClientFactory(null);
      (prisma as any).sftpConnection.findFirst = origFindFirst;
    }
  });

  await runCase("22.6: SftpPublisher verify fails when remote index.html is missing", async () => {
    const publisher = new SftpPublisher();
    const origFindFirst = (prisma as any).sftpConnection?.findFirst;

    (prisma as any).sftpConnection = {
      findFirst: async () => ({
        id: "sftp-conn-1",
        websiteId: testSiteId,
        host: "sftp.example.com",
        username: "deployer",
        remotePath: "/var/www/site",
        isActive: true,
      }),
    };

    const mockClient: ISftpTransportClient = {
      connect: async () => {},
      mkdir: async () => "",
      put: async () => "",
      list: async () => [
        { name: "other.txt", type: "-", size: 100 },
      ],
      end: async () => {},
    };

    setSftpClientFactory(() => mockClient);

    try {
      const result = await publisher.verify(testSiteId, "dep-1", {
        version: 1,
      });

      assert.strictEqual(result.verified, false);
      assert.strictEqual(result.statusCode, 404);
      assert(result.error?.includes("index.html is missing"));
    } finally {
      setSftpClientFactory(null);
      (prisma as any).sftpConnection.findFirst = origFindFirst;
    }
  });

  await runCase("22.7: SftpPublisher verify fails and redacts credentials when connection fails", async () => {
    const publisher = new SftpPublisher();
    const origFindFirst = (prisma as any).sftpConnection?.findFirst;

    (prisma as any).sftpConnection = {
      findFirst: async () => ({
        id: "sftp-conn-1",
        websiteId: testSiteId,
        host: "sftp.example.com",
        username: "deployer",
        remotePath: "/var/www/site",
        isActive: true,
      }),
    };

    const mockClient: ISftpTransportClient = {
      connect: async () => {
        throw new Error("Auth failed for password=SuperSecretPassword123");
      },
      mkdir: async () => "",
      put: async () => "",
      list: async () => [],
      end: async () => {},
    };

    setSftpClientFactory(() => mockClient);

    try {
      const result = await publisher.verify(testSiteId, "dep-1", {
        version: 1,
        password: "SuperSecretPassword123",
      });

      assert.strictEqual(result.verified, false);
      assert(!result.error?.includes("SuperSecretPassword123"), "Error must redact credentials");
      assert(result.error?.includes("[REDACTED]"), "Error must contain [REDACTED]");
    } finally {
      setSftpClientFactory(null);
      (prisma as any).sftpConnection.findFirst = origFindFirst;
    }
  });

  await runCase("22.8: StaticExportPublisher verify checks directory, index.html existence and non-zero size", async () => {
    const publisher = new StaticExportPublisher();
    const exportsBase = path.resolve(process.cwd(), "exports");
    const tempTestDir = path.join(exportsBase, "test-verify-site", "v1");

    fs.mkdirSync(tempTestDir, { recursive: true });
    fs.writeFileSync(path.join(tempTestDir, "index.html"), "<html><body>Hello Static</body></html>");

    try {
      // 1. Success case
      const resSuccess = await publisher.verify("test-verify-site", "dep-1", { version: 1 });
      assert.strictEqual(resSuccess.verified, true);
      assert.strictEqual(resSuccess.statusCode, 200);

      // 2. Empty index.html case
      fs.writeFileSync(path.join(tempTestDir, "index.html"), "");
      const resEmpty = await publisher.verify("test-verify-site", "dep-1", { version: 1 });
      assert.strictEqual(resEmpty.verified, false);
      assert.strictEqual(resEmpty.statusCode, 422);
      assert(resEmpty.error?.includes("empty (0 bytes)"));

      // 3. Missing index.html case
      fs.unlinkSync(path.join(tempTestDir, "index.html"));
      const resMissing = await publisher.verify("test-verify-site", "dep-1", { version: 1 });
      assert.strictEqual(resMissing.verified, false);
      assert.strictEqual(resMissing.statusCode, 404);
      assert(resMissing.error?.includes("index.html is missing"));
    } finally {
      try {
        fs.rmSync(path.join(exportsBase, "test-verify-site"), { recursive: true, force: true });
      } catch (_) {}
    }
  });

  await runCase("22.9: WordPressPublisher verify checks mapped post and published status", async () => {
    const publisher = new WordPressPublisher();

    const connection = {
      id: "wp-conn-1",
      websiteId: testSiteId,
      siteUrl: "https://myblog.com",
      apiKeyHash: "test-hash",
      status: "CONNECTED",
    };

    const pageMappings = [
      {
        id: "wp-map-1",
        websiteId: testSiteId,
        wpPostId: 42,
        wpPostUrl: "https://myblog.com/test-page",
      },
    ];

    // 1. Published post succeeds
    const resPublish = await publisher.verify(testSiteId, "dep-1", {
      connection,
      pageMappings,
      sendSignedRequest: async () => ({
        id: 42,
        status: "publish",
        content: { rendered: "Hello WordPress" },
      }),
    });

    assert.strictEqual(resPublish.verified, true);
    assert.strictEqual(resPublish.statusCode, 200);
    assert.strictEqual(resPublish.details?.remoteStatus, "publish");

    // 2. Draft post is REJECTED
    const resDraft = await publisher.verify(testSiteId, "dep-1", {
      connection,
      pageMappings,
      sendSignedRequest: async () => ({
        id: 42,
        status: "draft",
        content: { rendered: "Unpublished Draft" },
      }),
    });

    assert.strictEqual(resDraft.verified, false);
    assert.strictEqual(resDraft.statusCode, 422);
    assert(resDraft.error?.includes("Remote WordPress page is 'draft', expected 'publish'"));

    // 3. Missing post (404) is REJECTED
    const resMissing = await publisher.verify(testSiteId, "dep-1", {
      connection,
      pageMappings,
      sendSignedRequest: async () => null,
    });

    assert.strictEqual(resMissing.verified, false);
    assert.strictEqual(resMissing.statusCode, 404);
  });

  // =========================================================================
  // ISSUE 24 TESTS: TRUSTED ABSOLUTE PUBLIC URL
  // =========================================================================
  console.log("\n--- ISSUE 24: Trusted Absolute Public Website URL ---");

  await runCase("24.1: getTrustedPublicOrigin uses configured PUBLIC_ORIGIN", () => {
    const origEnv = { ...process.env };
    try {
      process.env.PUBLIC_ORIGIN = "https://app.forgestudio.com";
      delete process.env.PUBLIC_WEBSITE_URL;
      delete process.env.FRONTEND_URL;

      const origin = getTrustedPublicOrigin();
      assert.strictEqual(origin, "https://app.forgestudio.com");
    } finally {
      process.env = origEnv;
    }
  });

  await runCase("24.2: Production environment rejects localhost and 127.0.0.1", () => {
    const origEnv = { ...process.env };
    try {
      process.env.NODE_ENV = "production";
      process.env.PUBLIC_ORIGIN = "http://localhost:3000";

      const originLocal = getTrustedPublicOrigin();
      assert.strictEqual(originLocal, null, "Must reject localhost in production");

      process.env.PUBLIC_ORIGIN = "http://127.0.0.1:5173";
      const originIp = getTrustedPublicOrigin();
      assert.strictEqual(originIp, null, "Must reject 127.0.0.1 in production");
    } finally {
      process.env = origEnv;
    }
  });

  await runCase("24.3: Production environment does NOT fabricate domain when unconfigured", () => {
    const origEnv = { ...process.env };
    try {
      process.env.NODE_ENV = "production";
      delete process.env.PUBLIC_ORIGIN;
      delete process.env.PUBLIC_WEBSITE_URL;
      delete process.env.FRONTEND_URL;

      const origin = getTrustedPublicOrigin();
      assert.strictEqual(origin, null, "Must return null in production when unconfigured");
    } finally {
      process.env = origEnv;
    }
  });

  await runCase("24.4: constructAbsolutePublicUrl produces valid URL for INTERNAL destination", () => {
    const origEnv = { ...process.env };
    try {
      process.env.PUBLIC_ORIGIN = "https://mysite.forgestudio.io";
      const url = constructAbsolutePublicUrl("INTERNAL", "/site/site-123", "site-123");
      assert.strictEqual(url, "https://mysite.forgestudio.io/site/site-123");
    } finally {
      process.env = origEnv;
    }
  });

  await runCase("24.5: constructAbsolutePublicUrl returns WordPress public URL when valid HTTP", () => {
    const wpUrl = constructAbsolutePublicUrl(
      "WORDPRESS",
      "https://blog.example.com/pages/published-page",
      "site-123"
    );
    assert.strictEqual(wpUrl, "https://blog.example.com/pages/published-page");
  });

  await runCase("24.6: constructAbsolutePublicUrl strictly returns null for SFTP destination", () => {
    const sftpUrl = constructAbsolutePublicUrl(
      "SFTP",
      "sftp://deployer@sftp.example.com:/var/www/html",
      "site-123"
    );
    assert.strictEqual(sftpUrl, null, "SFTP must never return a public HTTP website URL");
  });

  await runCase("24.7: constructAbsolutePublicUrl strictly returns null for STATIC destination", () => {
    const staticUrl = constructAbsolutePublicUrl(
      "STATIC",
      "/exports/site-123/v1",
      "site-123"
    );
    assert.strictEqual(staticUrl, null, "STATIC must never return a public HTTP website URL");
  });

  // Restore prisma.auditLog
  (prisma as any).auditLog = origAuditLog;

  console.log("\n==================================================================");
  console.log(`  RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runDestinationVerificationAndUrlSuite().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
