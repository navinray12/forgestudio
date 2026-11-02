import assert from "node:assert";
import dotenv from "dotenv";
import { prisma } from "../src/config/prisma.js";
import { AppError } from "../src/utils/app-error.js";
import {
  getPublicWebsiteById,
} from "../src/services/website.service.js";
import {
  publishWebsite,
  instantRollbackRelease,
  recordWebsiteRelease,
} from "../src/services/publishing.service.js";

dotenv.config();

function logPass(title: string, details?: string) {
  console.log(`  ✓ [PASS] ${title}${details ? ` - ${details}` : ""}`);
}

function logFail(title: string, error: any) {
  console.error(`  ✗ [FAIL] ${title}:`, error);
}

async function runPublishingSecuritySuite() {
  console.log("\n==================================================================");
  console.log("  P0 PUBLISHING SECURITY & CONCURRENCY STABILIZATION TEST SUITE   ");
  console.log("  ISSUES 16, 17, 18, 19, 20, 23                                    ");
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

  // Helper to construct a base mock transaction
  function createTxMock(overrides: {
    siteVersion?: number;
    siteEditorData?: any;
    siteStatus?: string;
    onSiteUpdate?: (data: any) => void;
    onDeploymentUpdate?: (data: any) => void;
    failFinalization?: boolean;
  } = {}) {
    let ver = overrides.siteVersion ?? 1;
    let ed = overrides.siteEditorData ?? {};
    let st = overrides.siteStatus ?? "DRAFT";

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
        findUnique: async () => {
          if (overrides.failFinalization) {
            throw new Error("Simulated database failure during release finalization");
          }
          return {
            id: testSiteId,
            version: ver,
            editorData: ed,
            status: st,
            updatedAt: new Date(),
          };
        },
        updateMany: async (args: any) => {
          if (overrides.failFinalization) {
            throw new Error("Simulated database failure during release finalization");
          }
          if (overrides.onSiteUpdate) overrides.onSiteUpdate(args.data);
          ver = args.data.version || ver + 1;
          ed = args.data.editorData || ed;
          st = args.data.status || st;
          return { count: 1 };
        },
      },
      deployment: {
        update: async (args: any) => {
          if (overrides.onDeploymentUpdate) overrides.onDeploymentUpdate(args.data);
          return {
            id: args.where?.id || "dep_1",
            status: args.data.status,
            ...args.data,
          };
        },
      },
    };
  }

  // =========================================================================
  // ISSUE 16 & 17: REMOVE PUBLIC DRAFT FALLBACK & AUTHORITATIVE DB STATUS
  // =========================================================================

  await runCase("1. Issue 17: DB status DRAFT with JSON status PUBLISHED fails closed (404)", async () => {
    const origFindFirst = prisma.website.findFirst;
    try {
      (prisma.website.findFirst as any) = async () => ({
        id: testSiteId,
        userId: testUserId,
        name: "Inconsistent Site",
        slug: "inconsistent-site",
        status: "DRAFT", // DB says DRAFT
        editorData: {
          publishing: { status: "PUBLISHED" }, // Misleading JSON metadata
          elements: [{ id: "el-draft", type: "heading", content: "Secret Draft" }],
        },
        customCodeSnippets: [],
      });

      let threw = false;
      let caughtErr: any = null;
      try {
        await getPublicWebsiteById(testSiteId);
      } catch (err) {
        threw = true;
        caughtErr = err;
      }

      assert.strictEqual(threw, true, "Must fail closed on DB status DRAFT");
      assert.strictEqual(caughtErr.statusCode, 404);
      assert.strictEqual(caughtErr.code, "NOT_FOUND");
    } finally {
      prisma.website.findFirst = origFindFirst;
    }
  });

  await runCase("2. Issue 16: DB status PUBLISHED but no published snapshot fails closed (404)", async () => {
    const origFindFirst = prisma.website.findFirst;
    try {
      (prisma.website.findFirst as any) = async () => ({
        id: testSiteId,
        userId: testUserId,
        name: "Missing Snapshot Site",
        slug: "missing-snapshot",
        status: "PUBLISHED",
        editorData: {
          // No currentReleaseId, no releases, no publishedData
          elements: [{ id: "el-draft", type: "heading", content: "Unpublished Draft" }],
        },
        customCodeSnippets: [],
      });

      let threw = false;
      let caughtErr: any = null;
      try {
        await getPublicWebsiteById(testSiteId);
      } catch (err) {
        threw = true;
        caughtErr = err;
      }

      assert.strictEqual(threw, true, "Must reject request when snapshot is missing");
      assert.strictEqual(caughtErr.statusCode, 404);
      assert.strictEqual(caughtErr.code, "NOT_FOUND");
    } finally {
      prisma.website.findFirst = origFindFirst;
    }
  });

  await runCase("3. Issue 16: Broken release pointer fails closed without falling back to draft (404)", async () => {
    const origFindFirst = prisma.website.findFirst;
    try {
      (prisma.website.findFirst as any) = async () => ({
        id: testSiteId,
        userId: testUserId,
        name: "Broken Pointer Site",
        slug: "broken-pointer",
        status: "PUBLISHED",
        editorData: {
          currentReleaseId: "rel_missing_123",
          releases: [
            { releaseId: "rel_other_456", isActive: false, snapshotData: { pages: [] } },
          ],
          // Should NEVER fall back to working draft
          elements: [{ id: "el-secret-draft", type: "heading", content: "Unpublished Working Draft" }],
        },
        customCodeSnippets: [],
      });

      let threw = false;
      let caughtErr: any = null;
      try {
        await getPublicWebsiteById(testSiteId);
      } catch (err) {
        threw = true;
        caughtErr = err;
      }

      assert.strictEqual(threw, true, "Must reject request on broken release pointer");
      assert.strictEqual(caughtErr.statusCode, 404);
      assert.strictEqual(caughtErr.code, "NOT_FOUND");
    } finally {
      prisma.website.findFirst = origFindFirst;
    }
  });

  // =========================================================================
  // ISSUE 18: FAIL CLOSED ON CORRUPT PUBLISHED JSON
  // =========================================================================

  await runCase("4. Issue 18: Corrupt null release snapshotData fails closed (404)", async () => {
    const origFindFirst = prisma.website.findFirst;
    try {
      (prisma.website.findFirst as any) = async () => ({
        id: testSiteId,
        userId: testUserId,
        name: "Corrupt Snapshot Site",
        slug: "corrupt-snapshot",
        status: "PUBLISHED",
        editorData: {
          currentReleaseId: "rel_1",
          releases: [
            { releaseId: "rel_1", isActive: true, snapshotData: null },
          ],
          elements: [{ id: "el-draft", type: "heading", content: "Working Draft" }],
        },
        customCodeSnippets: [],
      });

      let threw = false;
      let caughtErr: any = null;
      try {
        await getPublicWebsiteById(testSiteId);
      } catch (err) {
        threw = true;
        caughtErr = err;
      }

      assert.strictEqual(threw, true, "Must fail closed on null snapshot");
      assert.strictEqual(caughtErr.statusCode, 404);
      assert.strictEqual(caughtErr.code, "NOT_FOUND");
    } finally {
      prisma.website.findFirst = origFindFirst;
    }
  });

  await runCase("5. Issue 18: Array snapshot instead of object fails closed (404)", async () => {
    const origFindFirst = prisma.website.findFirst;
    try {
      (prisma.website.findFirst as any) = async () => ({
        id: testSiteId,
        userId: testUserId,
        name: "Array Snapshot Site",
        slug: "array-snapshot",
        status: "PUBLISHED",
        editorData: {
          currentReleaseId: "rel_1",
          releases: [
            { releaseId: "rel_1", isActive: true, snapshotData: ["corrupt", "array"] },
          ],
          elements: [{ id: "el-draft", type: "heading", content: "Working Draft" }],
        },
        customCodeSnippets: [],
      });

      let threw = false;
      let caughtErr: any = null;
      try {
        await getPublicWebsiteById(testSiteId);
      } catch (err) {
        threw = true;
        caughtErr = err;
      }

      assert.strictEqual(threw, true, "Must fail closed on array snapshot");
      assert.strictEqual(caughtErr.statusCode, 404);
      assert.strictEqual(caughtErr.code, "NOT_FOUND");
    } finally {
      prisma.website.findFirst = origFindFirst;
    }
  });

  await runCase("6. Issue 18: Malformed JSON snapshot string fails closed (404)", async () => {
    const origFindFirst = prisma.website.findFirst;
    try {
      (prisma.website.findFirst as any) = async () => ({
        id: testSiteId,
        userId: testUserId,
        name: "Malformed String Site",
        slug: "malformed-str",
        status: "PUBLISHED",
        editorData: {
          currentReleaseId: "rel_1",
          releases: [
            { releaseId: "rel_1", isActive: true, snapshotData: "{ malformed json: true" },
          ],
          elements: [{ id: "el-draft", type: "heading", content: "Working Draft" }],
        },
        customCodeSnippets: [],
      });

      let threw = false;
      let caughtErr: any = null;
      try {
        await getPublicWebsiteById(testSiteId);
      } catch (err) {
        threw = true;
        caughtErr = err;
      }

      assert.strictEqual(threw, true, "Must fail closed on malformed JSON snapshot string");
      assert.strictEqual(caughtErr.statusCode, 404);
      assert.strictEqual(caughtErr.code, "NOT_FOUND");
    } finally {
      prisma.website.findFirst = origFindFirst;
    }
  });

  await runCase("7. Issue 18: Intentionally empty page is preserved and NOT treated as corrupt", async () => {
    const origFindFirst = prisma.website.findFirst;
    try {
      const validEmptySnapshot = {
        pages: [{ id: "p1", name: "Home", slug: "/", elements: [] }],
        homePageId: "p1",
      };

      (prisma.website.findFirst as any) = async () => ({
        id: testSiteId,
        userId: testUserId,
        name: "Empty Page Site",
        slug: "empty-page",
        status: "PUBLISHED",
        editorData: {
          currentReleaseId: "rel_empty",
          releases: [
            { releaseId: "rel_empty", isActive: true, snapshotData: validEmptySnapshot },
          ],
          elements: [{ id: "draft-el", type: "heading", content: "Draft" }],
        },
        customCodeSnippets: [],
      });

      const res = await getPublicWebsiteById(testSiteId);
      assert.strictEqual(res.status, "PUBLISHED");
      assert.deepStrictEqual(res.editorData.pages[0].elements, []);
    } finally {
      prisma.website.findFirst = origFindFirst;
    }
  });

  await runCase("8. Issue 16: Valid published snapshot rendered; working draft edits are NOT leaked", async () => {
    const origFindFirst = prisma.website.findFirst;
    try {
      const publishedSnapshot = {
        pages: [{ id: "p1", name: "Home", slug: "/", elements: [{ id: "pub-1", type: "text", content: "Live Published Content" }] }],
        homePageId: "p1",
      };

      (prisma.website.findFirst as any) = async () => ({
        id: testSiteId,
        userId: testUserId,
        name: "Live Site",
        slug: "live-site",
        status: "PUBLISHED",
        editorData: {
          currentReleaseId: "rel_v1",
          releases: [
            { releaseId: "rel_v1", isActive: true, snapshotData: publishedSnapshot },
          ],
          // Working draft has been edited after publication!
          pages: [{ id: "p1", name: "Home", slug: "/", elements: [{ id: "pub-1", type: "text", content: "Unpublished Work in Progress" }] }],
          elements: [{ id: "draft-only", type: "heading", content: "Secret Unreleased Feature" }],
          backups: [{ id: "bk-1", label: "Secret Internal Backup" }],
        },
        customCodeSnippets: [],
      });

      const publicDto = await getPublicWebsiteById(testSiteId);

      // Verify published content is served
      assert.strictEqual(publicDto.editorData.pages[0].elements[0].content, "Live Published Content");

      // Verify draft modifications are NOT leaked
      const allText = JSON.stringify(publicDto);
      assert.strictEqual(allText.includes("Unpublished Work in Progress"), false, "Draft edits must not leak");
      assert.strictEqual(allText.includes("Secret Unreleased Feature"), false, "Draft elements must not leak");
      assert.strictEqual(allText.includes("Secret Internal Backup"), false, "Backups must not leak");

      // Verify DTO does not leak private draft fields
      assert.strictEqual((publicDto as any).backups, undefined);
      assert.strictEqual((publicDto.editorData as any).backups, undefined);
    } finally {
      prisma.website.findFirst = origFindFirst;
    }
  });

  await runCase("9. Issue 17: Safe legacy fallback contract works when no release architecture exists", async () => {
    const origFindFirst = prisma.website.findFirst;
    try {
      const legacyPublishedSnapshot = {
        pages: [{ id: "leg-1", name: "Legacy Home", slug: "/", elements: [{ id: "el-leg", type: "heading", content: "Legacy Published" }] }],
      };

      (prisma.website.findFirst as any) = async () => ({
        id: testSiteId,
        userId: testUserId,
        name: "Legacy Site",
        slug: "legacy-site",
        status: "PUBLISHED",
        editorData: {
          // No currentReleaseId, no releases array
          publishedData: legacyPublishedSnapshot,
          elements: [{ id: "draft-el", type: "text", content: "Legacy Draft" }],
        },
        customCodeSnippets: [],
      });

      const res = await getPublicWebsiteById(testSiteId);
      assert.strictEqual(res.status, "PUBLISHED");
      assert.strictEqual(res.editorData.pages[0].elements[0].content, "Legacy Published");
    } finally {
      prisma.website.findFirst = origFindFirst;
    }
  });

  // =========================================================================
  // ISSUE 19: CONCURRENCY-SAFE PRE-PUBLISH BACKUP
  // =========================================================================

  await runCase("10. Issue 19: CAS conflict during pre-publish backup is rejected with 409", async () => {
    const origFindUnique = prisma.website.findUnique;
    const origFindMany = prisma.website.findMany;
    const origUpdateMany = prisma.website.updateMany;
    const origDeployment = (prisma as any).deployment;

    try {
      (prisma.website.findUnique as any) = async () => ({
        id: testSiteId,
        userId: testUserId,
        name: "Test Site",
        slug: "test-site",
        status: "DRAFT",
        version: 2,
        editorData: {
          pages: [{ id: "p1", name: "Home", slug: "/", elements: [{ id: "el-1", type: "heading" }] }],
          homePageId: "p1",
        },
      });

      (prisma.website.findMany as any) = async () => [];
      (prisma as any).deployment = {
        findMany: async () => [],
        create: async (args: any) => ({
          id: "dep_1",
          version: 1,
          status: args.data.status,
        }),
        update: async (args: any) => ({
          id: "dep_1",
          status: args.data.status,
        }),
      };

      // Simulate concurrent write: updateMany returns count: 0 (CAS failed!)
      (prisma.website.updateMany as any) = async () => ({ count: 0 });

      let threw = false;
      let caughtErr: any = null;
      try {
        await publishWebsite(testSiteId, testUserId, {
          environment: "PRODUCTION",
        });
      } catch (err) {
        threw = true;
        caughtErr = err;
      }

      assert.strictEqual(threw, true, "Must throw 409 when pre-publish backup CAS detects concurrent change");
      assert.strictEqual(caughtErr.statusCode, 409);
      assert.strictEqual(caughtErr.code, "CONCURRENCY_CONFLICT");
    } finally {
      prisma.website.findUnique = origFindUnique;
      prisma.website.findMany = origFindMany;
      prisma.website.updateMany = origUpdateMany;
      (prisma as any).deployment = origDeployment;
    }
  });

  // =========================================================================
  // ISSUE 20: VERSION-AWARE CAS ON PUBLISH & DRAFT PRESERVATION
  // =========================================================================

  await runCase("11. Issue 20: Stale revision publish rejected with 409 CONCURRENCY_CONFLICT", async () => {
    const origFindUnique = prisma.website.findUnique;
    try {
      (prisma.website.findUnique as any) = async () => ({
        id: testSiteId,
        userId: testUserId,
        name: "Stale Publish Site",
        slug: "stale-publish",
        status: "DRAFT",
        version: 5, // DB is at version 5
        editorData: {
          pages: [{ id: "p1", name: "Home", slug: "/", elements: [{ id: "el-1", type: "heading" }] }],
          homePageId: "p1",
        },
      });

      let threw = false;
      let caughtErr: any = null;
      try {
        // Client sent stale expectedVersion 3
        await publishWebsite(testSiteId, testUserId, {
          expectedVersion: 3,
        });
      } catch (err) {
        threw = true;
        caughtErr = err;
      }

      assert.strictEqual(threw, true, "Stale expectedVersion must throw 409");
      assert.strictEqual(caughtErr.statusCode, 409);
      assert.strictEqual(caughtErr.code, "CONCURRENCY_CONFLICT");
      assert.ok(caughtErr.message.includes("stale website revision"), "Message indicates stale revision");
      assert.ok(caughtErr.message.includes("5"), "Message reports actual version 5");
    } finally {
      prisma.website.findUnique = origFindUnique;
    }
  });

  await runCase("12. Issue 20: Concurrent draft save while publish in progress is preserved after publish succeeds", async () => {
    const origFindUnique = prisma.website.findUnique;
    const origFindFirst = prisma.website.findFirst;
    const origUpdateMany = prisma.website.updateMany;
    const origTransaction = prisma.$transaction;
    const origDeployment = (prisma as any).deployment;

    try {
      let liveDbVersion = 1;
      let liveEditorData: any = {
        pages: [{ id: "p1", name: "Home", slug: "/", elements: [{ id: "el-1", type: "heading", content: "Initial Draft" }] }],
        homePageId: "p1",
      };

      (prisma.website.findUnique as any) = async () => ({
        id: testSiteId,
        userId: testUserId,
        name: "Concurrency Site",
        slug: "concurrency-site",
        status: "DRAFT",
        version: liveDbVersion,
        editorData: liveEditorData,
        updatedAt: new Date(),
      });

      (prisma.website.findFirst as any) = async () => ({
        id: testSiteId,
        userId: testUserId,
        name: "Concurrency Site",
        slug: "concurrency-site",
        status: "PUBLISHED",
        version: liveDbVersion,
        editorData: liveEditorData,
        customCodeSnippets: [],
      });

      (prisma as any).deployment = {
        findMany: async () => [],
        create: async () => ({ id: "dep_c1", version: 1, status: "QUEUED" }),
        update: async (args: any) => ({ id: "dep_c1", status: args.data.status }),
      };

      (prisma.website.updateMany as any) = async () => ({ count: 1 });

      // Mock transaction execution
      (prisma.$transaction as any) = async (callback: any) => {
        // SIMULATE: While publish was in progress, a concurrent user saved a new draft edit!
        liveDbVersion = liveDbVersion + 1;
        liveEditorData = {
          ...liveEditorData,
          pages: [{ id: "p1", name: "Home", slug: "/", elements: [{ id: "el-concurrent", type: "heading", content: "Newer Concurrent Draft Edit" }] }],
        };

        const txMock = createTxMock({
          siteVersion: liveDbVersion,
          siteEditorData: liveEditorData,
          siteStatus: "DRAFT",
          onSiteUpdate: (data) => {
            liveEditorData = data.editorData;
            liveDbVersion = data.version;
          },
        });
        return await callback(txMock);
      };

      const candidateSnapshotToPublish = {
        pages: [{ id: "p1", name: "Home", slug: "/", elements: [{ id: "el-1", type: "heading", content: "Candidate Snapshot V1" }] }],
        homePageId: "p1",
      };

      const result = await publishWebsite(testSiteId, testUserId, {
        editorData: candidateSnapshotToPublish,
        environment: "DEVELOPMENT",
      });

      assert.strictEqual(result.status, "PUBLISHED");

      // VERIFY ISSUE 20 INVARIANT:
      // Working draft retained newer edits ("Newer Concurrent Draft Edit")
      assert.strictEqual(
        liveEditorData.pages[0].elements[0].content,
        "Newer Concurrent Draft Edit",
        "Working draft must NOT be overwritten by publish candidate snapshot!"
      );

      // Authoritative publishedData received candidateSnapshot
      assert.strictEqual(
        liveEditorData.publishedData.pages[0].elements[0].content,
        "Candidate Snapshot V1",
        "Authoritative publishedData must match candidate snapshot exactly!"
      );
    } finally {
      prisma.website.findUnique = origFindUnique;
      prisma.website.findFirst = origFindFirst;
      prisma.website.updateMany = origUpdateMany;
      prisma.$transaction = origTransaction;
      (prisma as any).deployment = origDeployment;
    }
  });

  // =========================================================================
  // ISSUE 23: RELEASE-PERSISTENCE GATING FOR PUBLISHED STATUS
  // =========================================================================

  await runCase("13. Issue 23: Release record / DB failure prevents PUBLISHED deployment status (internal -> DEPLOY_FAILED)", async () => {
    const origFindUnique = prisma.website.findUnique;
    const origFindFirst = prisma.website.findFirst;
    const origTransaction = prisma.$transaction;
    const origUpdateMany = prisma.website.updateMany;
    const origDeployment = (prisma as any).deployment;

    let deploymentFinalStatus = "";

    try {
      (prisma.website.findUnique as any) = async () => ({
        id: testSiteId,
        userId: testUserId,
        name: "Fail Release Site",
        slug: "fail-release",
        status: "DRAFT",
        version: 1,
        editorData: {
          pages: [{ id: "p1", name: "Home", slug: "/", elements: [{ id: "el-1", type: "heading" }] }],
          homePageId: "p1",
        },
      });

      (prisma as any).deployment = {
        findMany: async () => [],
        create: async () => ({ id: "dep_fail_1", version: 1, status: "QUEUED" }),
        update: async (args: any) => {
          deploymentFinalStatus = args.data.status;
          return { id: "dep_fail_1", status: args.data.status };
        },
      };

      (prisma.website.updateMany as any) = async () => ({ count: 1 });

      let txCalls = 0;
      (prisma.$transaction as any) = async (cb: any) => {
        txCalls++;
        if (txCalls === 1) {
          // createRevision call succeeds
          return { id: "rev_fail_1", version: 2 };
        }
        // Second transaction: release finalization fails!
        throw new Error("DB Disk Full during release persistence");
      };

      let threw = false;
      try {
        await publishWebsite(testSiteId, testUserId, {
          destinationType: "INTERNAL",
          environment: "DEVELOPMENT",
        });
      } catch (err) {
        threw = true;
      }

      assert.strictEqual(threw, true, "Must throw on release persistence failure");
      assert.strictEqual(
        deploymentFinalStatus,
        "DEPLOY_FAILED",
        "Deployment MUST NOT be marked PUBLISHED if release persistence fails; must be DEPLOY_FAILED"
      );
    } finally {
      prisma.website.findUnique = origFindUnique;
      prisma.website.findFirst = origFindFirst;
      prisma.$transaction = origTransaction;
      prisma.website.updateMany = origUpdateMany;
      (prisma as any).deployment = origDeployment;
    }
  });

  await runCase("14. Issue 23: External deploy success + DB release failure transitions deployment to RECONCILIATION_REQUIRED", async () => {
    const origFindUnique = prisma.website.findUnique;
    const origFindFirst = prisma.website.findFirst;
    const origTransaction = prisma.$transaction;
    const origUpdateMany = prisma.website.updateMany;
    const origDeployment = (prisma as any).deployment;

    let deploymentFinalStatus = "";

    try {
      (prisma.website.findUnique as any) = async () => ({
        id: testSiteId,
        userId: testUserId,
        name: "External Site",
        slug: "external-site",
        status: "DRAFT",
        version: 1,
        editorData: {
          pages: [{ id: "p1", name: "Home", slug: "/", elements: [{ id: "el-1", type: "heading" }] }],
          homePageId: "p1",
        },
      });

      (prisma as any).deployment = {
        findMany: async () => [],
        create: async () => ({ id: "dep_ext_1", version: 1, status: "QUEUED" }),
        update: async (args: any) => {
          deploymentFinalStatus = args.data.status;
          return { id: "dep_ext_1", status: args.data.status };
        },
      };

      (prisma.website.updateMany as any) = async () => ({ count: 1 });

      let txCalls = 0;
      (prisma.$transaction as any) = async (cb: any) => {
        txCalls++;
        if (txCalls === 1) {
          // createRevision call succeeds
          return { id: "rev_ext_1", version: 2 };
        }
        // Second transaction: release finalization fails!
        throw new Error("PostgreSQL connection lost during release finalization");
      };

      let threw = false;
      try {
        await publishWebsite(testSiteId, testUserId, {
          destinationType: "STATIC",
          environment: "DEVELOPMENT",
        });
      } catch (err) {
        threw = true;
      }

      assert.strictEqual(threw, true);
      assert.strictEqual(
        deploymentFinalStatus,
        "RECONCILIATION_REQUIRED",
        "External deploy with DB finalization failure MUST transition to RECONCILIATION_REQUIRED"
      );
    } finally {
      prisma.website.findUnique = origFindUnique;
      prisma.website.findFirst = origFindFirst;
      prisma.$transaction = origTransaction;
      prisma.website.updateMany = origUpdateMany;
      (prisma as any).deployment = origDeployment;
    }
  });

  await runCase("15. Issue 23: Full happy path publish returns matching releaseId and deploymentId", async () => {
    const origFindUnique = prisma.website.findUnique;
    const origFindFirst = prisma.website.findFirst;
    const origTransaction = prisma.$transaction;
    const origUpdateMany = prisma.website.updateMany;
    const origDeployment = (prisma as any).deployment;

    try {
      let currentVersion = 1;
      let recordedStatus = "DRAFT";
      let recordedEditorData: any = {
        pages: [{ id: "p1", name: "Home", slug: "/", elements: [{ id: "el-1", type: "heading", content: "Happy Content" }] }],
        homePageId: "p1",
      };

      (prisma.website.findUnique as any) = async () => ({
        id: testSiteId,
        userId: testUserId,
        name: "Happy Site",
        slug: "happy-site",
        status: recordedStatus,
        version: currentVersion,
        editorData: recordedEditorData,
        updatedAt: new Date(),
      });

      (prisma.website.findFirst as any) = async () => ({
        id: testSiteId,
        userId: testUserId,
        name: "Happy Site",
        slug: "happy-site",
        status: "PUBLISHED",
        version: currentVersion,
        editorData: recordedEditorData,
        customCodeSnippets: [],
      });

      (prisma as any).deployment = {
        findMany: async () => [],
        create: async () => ({ id: "dep_happy_1", version: 1, status: "QUEUED" }),
        update: async (args: any) => ({ id: "dep_happy_1", status: args.data.status }),
      };

      (prisma.website.updateMany as any) = async (args: any) => {
        recordedStatus = args.data.status || recordedStatus;
        recordedEditorData = args.data.editorData || recordedEditorData;
        currentVersion = args.data.version || currentVersion + 1;
        return { count: 1 };
      };

      (prisma.$transaction as any) = async (cb: any) => {
        const txMock = createTxMock({
          siteVersion: currentVersion,
          siteEditorData: recordedEditorData,
          siteStatus: recordedStatus,
          onSiteUpdate: (data) => {
            recordedStatus = data.status;
            recordedEditorData = data.editorData;
            currentVersion = data.version;
          },
        });
        return await cb(txMock);
      };

      const result = await publishWebsite(testSiteId, testUserId, {
        environment: "DEVELOPMENT",
      });

      assert.strictEqual(result.status, "PUBLISHED");
      assert.strictEqual(result.deploymentId, "dep_happy_1");
      assert.ok(result.releaseId, "Must return valid releaseId");
      assert.ok(result.releaseId?.startsWith("rel_"), "releaseId starts with rel_");
      assert.strictEqual(recordedStatus, "PUBLISHED");
      assert.strictEqual(recordedEditorData.currentReleaseId, result.releaseId);
      assert.strictEqual(recordedEditorData.releases[0].releaseId, result.releaseId);
      assert.strictEqual(recordedEditorData.releases[0].isActive, true);
    } finally {
      prisma.website.findUnique = origFindUnique;
      prisma.website.findFirst = origFindFirst;
      prisma.$transaction = origTransaction;
      prisma.website.updateMany = origUpdateMany;
      (prisma as any).deployment = origDeployment;
    }
  });

  await runCase("16. Issue 23: Rollback to non-existent release fails (404) and leaves active release unchanged", async () => {
    const origFindUnique = prisma.website.findUnique;
    const origUpdateMany = prisma.website.updateMany;

    try {
      const activeReleaseId = "rel_active_initial";
      let savedEditorData: any = {
        currentReleaseId: activeReleaseId,
        releases: [
          { releaseId: activeReleaseId, isActive: true, snapshotData: { pages: [] } },
        ],
      };

      (prisma.website.findUnique as any) = async () => ({
        id: testSiteId,
        userId: testUserId,
        status: "PUBLISHED",
        version: 3,
        editorData: savedEditorData,
      });

      let threw = false;
      let caughtErr: any = null;
      try {
        await instantRollbackRelease(testSiteId, "rel_nonexistent", testUserId);
      } catch (err) {
        threw = true;
        caughtErr = err;
      }

      assert.strictEqual(threw, true);
      assert.strictEqual(caughtErr.statusCode, 404);
      assert.strictEqual(savedEditorData.currentReleaseId, activeReleaseId, "Active release pointer must remain untouched");
    } finally {
      prisma.website.findUnique = origFindUnique;
      prisma.website.updateMany = origUpdateMany;
    }
  });

  console.log("\n==================================================================");
  console.log(`  TARGETED TESTS COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================\n");

  (prisma as any).auditLog = origAuditLog;
  if (failed > 0) {
    process.exit(1);
  }
}

runPublishingSecuritySuite().catch((err) => {
  console.error("Fatal test suite crash:", err);
  process.exit(1);
});
