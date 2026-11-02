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
  console.log("  P0 DESTINATION VERIFICATION, REVISION & PUBLIC URL TEST SUITE   ");
  console.log("  ISSUES 21, 22, 24 & INTEGRATION CORRECTIONS 1, 2, 3, 4          ");
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
  // CORRECTION 1 TESTS: REQUIRE SAFE PUBLISH REVISION
  // =========================================================================
  console.log("\n--- CORRECTION 1: Require Safe Publish Revision ---");

  await runCase("C1.1: Missing expectedVersion when editorData is supplied is rejected with 400 INVALID_REVISION", async () => {
    const origFindUnique = prisma.website.findUnique;
    try {
      (prisma.website.findUnique as any) = async () => ({
        id: testSiteId,
        userId: testUserId,
        name: "Test Site",
        slug: "test-site",
        status: "DRAFT",
        version: 2,
        editorData: { pages: [{ id: "p1", name: "Home", isHome: true, elements: [] }] },
      });

      let threw = false;
      let caughtErr: any = null;
      try {
        await publishWebsite(testSiteId, testUserId, {
          editorData: { homePageId: "p1", pages: [{ id: "p1", name: "Home", elements: [] }] },
        });
      } catch (err) {
        threw = true;
        caughtErr = err;
      }

      assert.strictEqual(threw, true, "Must throw when editorData supplied without expectedVersion");
      assert.strictEqual(caughtErr?.statusCode, 400);
      assert.strictEqual(caughtErr?.code, "INVALID_REVISION");
      assert.ok(caughtErr?.message.includes("requires a valid persisted expectedVersion"));
    } finally {
      prisma.website.findUnique = origFindUnique;
    }
  });

  await runCase("C1.2: Invalid expectedVersion (NaN or <= 0) is rejected with 400 INVALID_REVISION", async () => {
    const origFindUnique = prisma.website.findUnique;
    try {
      (prisma.website.findUnique as any) = async () => ({
        id: testSiteId,
        userId: testUserId,
        name: "Test Site",
        slug: "test-site",
        status: "DRAFT",
        version: 2,
        editorData: { pages: [{ id: "p1", name: "Home", isHome: true, elements: [] }] },
      });

      let threw = false;
      let caughtErr: any = null;
      try {
        await publishWebsite(testSiteId, testUserId, {
          editorData: { homePageId: "p1", pages: [{ id: "p1", name: "Home", elements: [] }] },
          expectedVersion: -1,
        });
      } catch (err) {
        threw = true;
        caughtErr = err;
      }

      assert.strictEqual(threw, true);
      assert.strictEqual(caughtErr?.statusCode, 400);
      assert.strictEqual(caughtErr?.code, "INVALID_REVISION");
    } finally {
      prisma.website.findUnique = origFindUnique;
    }
  });

  await runCase("C1.3: Stale expectedVersion is rejected with 409 CONCURRENCY_CONFLICT", async () => {
    const origFindUnique = prisma.website.findUnique;
    try {
      (prisma.website.findUnique as any) = async () => ({
        id: testSiteId,
        userId: testUserId,
        name: "Test Site",
        slug: "test-site",
        status: "DRAFT",
        version: 5,
        editorData: { pages: [{ id: "p1", name: "Home", isHome: true, elements: [] }] },
      });

      let threw = false;
      let caughtErr: any = null;
      try {
        await publishWebsite(testSiteId, testUserId, {
          editorData: { homePageId: "p1", pages: [{ id: "p1", name: "Home", elements: [] }] },
          expectedVersion: 4,
        });
      } catch (err) {
        threw = true;
        caughtErr = err;
      }

      assert.strictEqual(threw, true);
      assert.strictEqual(caughtErr?.statusCode, 409);
      assert.strictEqual(caughtErr?.code, "CONCURRENCY_CONFLICT");
      assert.ok(caughtErr?.message.includes("stale website revision"));
    } finally {
      prisma.website.findUnique = origFindUnique;
    }
  });

  await runCase("C1.4: Concurrent editor save during publish pipeline is rejected at final transaction with 409", async () => {
    const origFindUnique = prisma.website.findUnique;
    const origTransaction = prisma.$transaction;
    const origDeployment = (prisma as any).deployment;

    try {
      let liveVersion = 1;
      let liveEditorData = {
        homePageId: "p1",
        pages: [{ id: "p1", name: "Home", isHome: true, elements: [{ id: "e1", type: "heading", content: "Original" }] }],
      };

      (prisma.website.findUnique as any) = async () => ({
        id: testSiteId,
        userId: testUserId,
        name: "Test Site",
        slug: "test-site",
        status: "DRAFT",
        version: liveVersion,
        editorData: liveEditorData,
      });

      (prisma as any).deployment = {
        findMany: async () => [],
        create: async () => ({ id: "dep_c1", version: 1, status: "QUEUED" }),
        update: async (args: any) => ({ id: "dep_c1", status: args.data.status }),
      };

      (prisma.$transaction as any) = async (cb: any) => {
        liveVersion = 5;
        liveEditorData = {
          ...liveEditorData,
          pages: [{ id: "p1", name: "Home", isHome: true, elements: [{ id: "e2", type: "heading", content: "Intervening Concurrent Edit" }] }],
        };

        const txMock = createTxMock({
          siteVersion: liveVersion,
          siteEditorData: liveEditorData,
        });
        return await cb(txMock);
      };

      let threw = false;
      let caughtErr: any = null;
      try {
        await publishWebsite(testSiteId, testUserId, {
          editorData: {
            homePageId: "p1",
            pages: [{ id: "p1", name: "Home", isHome: true, elements: [{ id: "e1", type: "heading", content: "Published" }] }],
          },
          expectedVersion: 1,
          environment: "DEVELOPMENT",
        });
      } catch (err) {
        threw = true;
        caughtErr = err;
      }

      assert.strictEqual(threw, true);
      assert.strictEqual(caughtErr?.statusCode, 409);
      assert.strictEqual(caughtErr?.code, "CONCURRENCY_CONFLICT");
      assert.ok(caughtErr?.message.includes("concurrent modification during deployment"));
    } finally {
      prisma.website.findUnique = origFindUnique;
      prisma.$transaction = origTransaction;
      (prisma as any).deployment = origDeployment;
    }
  });

  await runCase("C1.5: Valid revision publish succeeds and increments site version with CAS", async () => {
    const origFindUnique = prisma.website.findUnique;
    const origFindFirst = prisma.website.findFirst;
    const origTransaction = prisma.$transaction;
    const origDeployment = (prisma as any).deployment;

    try {
      let currentVersion = 1;
      let currentEditorData = {
        homePageId: "p1",
        pages: [{ id: "p1", name: "Home", isHome: true, elements: [{ id: "e1", type: "heading", content: "Candidate" }] }],
      };

      (prisma.website.findUnique as any) = async () => ({
        id: testSiteId,
        userId: testUserId,
        name: "Test Site",
        slug: "test-site",
        status: "DRAFT",
        version: currentVersion,
        editorData: currentEditorData,
      });

      (prisma.website.findFirst as any) = async () => ({
        id: testSiteId,
        userId: testUserId,
        name: "Test Site",
        slug: "test-site",
        status: "PUBLISHED",
        version: currentVersion,
        editorData: currentEditorData,
        customCodeSnippets: [],
      });

      (prisma as any).deployment = {
        findMany: async () => [],
        create: async () => ({ id: "dep_valid_1", version: 1, status: "QUEUED" }),
        update: async (args: any) => ({ id: "dep_valid_1", status: args.data.status }),
      };

      (prisma.$transaction as any) = async (cb: any) => {
        const txMock = createTxMock({
          siteVersion: currentVersion,
          siteEditorData: currentEditorData,
          onSiteUpdate: (data) => {
            currentVersion = data.version;
            currentEditorData = data.editorData;
          },
        });
        return await cb(txMock);
      };

      const result = await publishWebsite(testSiteId, testUserId, {
        editorData: currentEditorData,
        expectedVersion: 1,
        environment: "DEVELOPMENT",
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.status, "PUBLISHED");
      assert.strictEqual(result.siteVersion, 2, "Site version must increment from 1 to 2");
    } finally {
      prisma.website.findUnique = origFindUnique;
      prisma.website.findFirst = origFindFirst;
      prisma.$transaction = origTransaction;
      (prisma as any).deployment = origDeployment;
    }
  });

  // =========================================================================
  // CORRECTION 2 TESTS: REPAIR SFTP EXPECTED-FILE VERIFICATION
  // =========================================================================
  console.log("\n--- CORRECTION 2: Repair SFTP Expected-File Verification ---");

  await runCase("C2.1: SFTP verify fails when nested asset is missing", async () => {
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
      list: async (dirPath: string) => {
        if (dirPath.endsWith("/assets")) {
          return [];
        }
        return [{ name: "index.html", type: "-", size: 1024 }];
      },
      end: async () => {},
    };

    setSftpClientFactory(() => mockClient);

    try {
      const result = await publisher.verify(testSiteId, "dep-1", {
        manifest: [
          { path: "index.html", size: 1024 },
          { path: "assets/styles.css", size: 512 },
        ],
      });

      assert.strictEqual(result.verified, false);
      assert.strictEqual(result.statusCode, 404);
      assert.ok(result.error?.includes("missing expected files"));
      assert.ok(result.error?.includes("assets/styles.css"));
    } finally {
      setSftpClientFactory(null);
      (prisma as any).sftpConnection.findFirst = origFindFirst;
    }
  });

  await runCase("C2.2: SFTP verify fails when remote file is truncated or corrupt (size mismatch)", async () => {
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
      list: async (dirPath: string) => {
        if (dirPath.endsWith("/assets")) {
          return [{ name: "styles.css", type: "-", size: 200 }];
        }
        return [{ name: "index.html", type: "-", size: 1024 }];
      },
      end: async () => {},
    };

    setSftpClientFactory(() => mockClient);

    try {
      const result = await publisher.verify(testSiteId, "dep-1", {
        manifest: [
          { path: "index.html", size: 1024 },
          { path: "assets/styles.css", size: 512 },
        ],
      });

      assert.strictEqual(result.verified, false);
      assert.strictEqual(result.statusCode, 422);
      assert.ok(result.error?.includes("corrupted or truncated files"));
      assert.ok(result.error?.includes("expected 512 bytes, got 200 bytes"));
    } finally {
      setSftpClientFactory(null);
      (prisma as any).sftpConnection.findFirst = origFindFirst;
    }
  });

  await runCase("C2.3: SFTP verify succeeds when all nested files exist and match sizes", async () => {
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
      list: async (dirPath: string) => {
        if (dirPath.endsWith("/assets")) {
          return [{ name: "styles.css", type: "-", size: 512 }];
        }
        return [
          { name: "index.html", type: "-", size: 1024 },
          { name: "assets", type: "d", size: 4096 },
        ];
      },
      end: async () => {},
    };

    setSftpClientFactory(() => mockClient);

    try {
      const result = await publisher.verify(testSiteId, "dep-1", {
        manifest: [
          { path: "index.html", size: 1024 },
          { path: "assets/styles.css", size: 512 },
        ],
      });

      assert.strictEqual(result.verified, true);
      assert.strictEqual(result.statusCode, 200);
      assert.strictEqual(result.details?.verifiedFileCount, 2);
    } finally {
      setSftpClientFactory(null);
      (prisma as any).sftpConnection.findFirst = origFindFirst;
    }
  });

  // =========================================================================
  // CORRECTION 3 TESTS: STRICT WORDPRESS CONTENT IDENTITY
  // =========================================================================
  console.log("\n--- CORRECTION 3: Strict WordPress Content Identity ---");

  await runCase("C3.1: WordPress verify fails when remote post ID does not equal mapped post ID", async () => {
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
        forgePageId: "p1",
        wpPostId: 42,
        wpPostUrl: "https://myblog.com/test-page",
      },
    ];

    const result = await publisher.verify(testSiteId, "dep-1", {
      connection,
      pageMappings,
      sendSignedRequest: async () => ({
        id: 99,
        status: "publish",
        content: { rendered: "Content" },
      }),
    });

    assert.strictEqual(result.verified, false);
    assert.strictEqual(result.statusCode, 422);
    assert.ok(result.error?.includes("Remote WordPress post ID mismatch"));
    assert.ok(result.error?.includes("Expected 42, but remote post has ID 99"));
  });

  await runCase("C3.2: WordPress verify fails when remote content does not contain expected release marker", async () => {
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
        forgePageId: "p1",
        wpPostId: 42,
        wpPostUrl: "https://myblog.com/test-page",
      },
    ];

    const result = await publisher.verify(testSiteId, "dep-1", {
      connection,
      pageMappings,
      releaseMarker: "fs-release-dep-expected-123",
      sendSignedRequest: async () => ({
        id: 42,
        status: "publish",
        content: { rendered: "Stale content from earlier deployment" },
      }),
    });

    assert.strictEqual(result.verified, false);
    assert.strictEqual(result.statusCode, 422);
    assert.ok(result.error?.includes("stale or unrelated content detected"));
  });

  await runCase("C3.3: WordPress verify validates EVERY mapped page across multi-page site", async () => {
    const publisher = new WordPressPublisher();

    const connection = {
      id: "wp-conn-1",
      websiteId: testSiteId,
      siteUrl: "https://myblog.com",
      apiKeyHash: "test-hash",
      status: "CONNECTED",
    };

    const pageMappings = [
      { forgePageId: "p1", wpPostId: 42, wpPostUrl: "https://myblog.com/home" },
      { forgePageId: "p2", wpPostId: 43, wpPostUrl: "https://myblog.com/about" },
    ];

    const resultFail = await publisher.verify(testSiteId, "dep-1", {
      connection,
      pageMappings,
      sendSignedRequest: async (_url: string, endpoint: string) => {
        if (endpoint.includes("/42")) {
          return { id: 42, status: "publish", content: { rendered: "Home" } };
        }
        return { id: 43, status: "draft", content: { rendered: "About Draft" } };
      },
    });

    assert.strictEqual(resultFail.verified, false);
    assert.strictEqual(resultFail.statusCode, 422);
    assert.ok(resultFail.error?.includes("page 43 is 'draft'"));

    const resultPass = await publisher.verify(testSiteId, "dep-1", {
      connection,
      pageMappings,
      sendSignedRequest: async (_url: string, endpoint: string) => {
        if (endpoint.includes("/42")) {
          return { id: 42, status: "publish", content: { rendered: "Home" } };
        }
        return { id: 43, status: "publish", content: { rendered: "About" } };
      },
    });

    assert.strictEqual(resultPass.verified, true);
    assert.strictEqual(resultPass.details?.verifiedPagesCount, 2);
  });

  // =========================================================================
  // CORRECTION 4 TESTS: HONEST INTERNAL/URL VERIFICATION EVIDENCE
  // =========================================================================
  console.log("\n--- CORRECTION 4: Honest Internal/URL Verification Evidence ---");

  await runCase("C4.1: Internal verify labels direct resolver check honestly as DIRECT_RESOLVER_SNAPSHOT_INTEGRITY", async () => {
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
    assert.strictEqual(result.details?.verificationType, "DIRECT_RESOLVER_SNAPSHOT_INTEGRITY");
    assert.strictEqual(result.details?.browserDeliveryPendingQa, true);
  });

  await runCase("C4.2: Internal verify fails when snapshot structural identity mismatches candidate", async () => {
    const publisher = new InternalPublisher();
    const result = await publisher.verify(testSiteId, "dep-1", {
      version: 2,
      snapshot: {
        version: 2,
        homePageId: "p1",
        pages: [{ id: "p1", elements: [] }, { id: "p2", elements: [] }],
      },
      publicWebsiteResolver: async (id: string) => ({
        id,
        status: "PUBLISHED",
        editorData: {
          version: 2,
          publishing: { version: 2, status: "PUBLISHED" },
          homePageId: "p1",
          pages: [{ id: "p1", elements: [] }, { id: "p-unexpected", elements: [] }],
        },
      }),
    });

    assert.strictEqual(result.verified, false);
    assert.strictEqual(result.statusCode, 422);
    assert.ok(result.error?.includes("Public snapshot identity mismatch"));
  });

  await runCase("C4.3: Production public origin rejects non-HTTPS URL", () => {
    const origEnv = { ...process.env };
    try {
      process.env.NODE_ENV = "production";
      process.env.PUBLIC_ORIGIN = "http://insecure-domain.com";

      const origin = getTrustedPublicOrigin();
      assert.strictEqual(origin, null, "Production origin must strictly reject non-HTTPS URLs");
    } finally {
      process.env = origEnv;
    }
  });

  await runCase("C4.4: Production public origin accepts valid HTTPS URL", () => {
    const origEnv = { ...process.env };
    try {
      process.env.NODE_ENV = "production";
      process.env.PUBLIC_ORIGIN = "https://secure-domain.com";

      const origin = getTrustedPublicOrigin();
      assert.strictEqual(origin, "https://secure-domain.com");
    } finally {
      process.env = origEnv;
    }
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
