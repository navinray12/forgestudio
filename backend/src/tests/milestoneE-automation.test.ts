import { prisma } from "../config/prisma.js";
import app from "../app.js";
import {
  registerJobHandler,
  enqueueJob,
  processNextJob,
  getJobById,
  listJobs,
} from "../services/jobs/jobRunner.js";
import { initJobHandlers } from "../services/jobs/handlers.js";
import {
  schedulePublish,
  promoteDeployment,
  publishWebsite,
} from "../services/publishing.service.js";
import {
  getSystemHealth,
  recordOperationalAlert,
  getOperationalAlerts,
  clearOperationalAlerts,
} from "../services/monitoring.service.js";
import { createWebsite } from "../services/website.service.js";
import { queryAuditLogs } from "../services/audit.service.js";
import type { Server } from "http";

const db = prisma as any;

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`, details || "");
    failed++;
  }
}

async function runMilestoneETests() {
  console.log("=================================================");
  console.log("RUNNING FORGESTUDIO MILESTONE E VERIFICATION SUITE");
  console.log("Automation & Operations (Master Phase 10)");
  console.log("=================================================\n");

  let server: any = null;
  let port = 0;
  let baseUrl = "";

  let ownerUser: any = null;
  let otherUser: any = null;
  let testWebsite: any = null;
  let testWebsite2: any = null;
  let stagingDeploymentId = "";

  try {
    // 0. Setup Table & Users
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS background_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(100) NOT NULL,
        payload JSONB DEFAULT '{}',
        status VARCHAR(50) NOT NULL DEFAULT 'QUEUED',
        attempts INTEGER NOT NULL DEFAULT 0,
        "maxAttempts" INTEGER NOT NULL DEFAULT 3,
        "lastError" VARCHAR(2000),
        "runAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "startedAt" TIMESTAMP WITH TIME ZONE,
        "completedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    ownerUser = await db.user.create({
      data: {
        email: `ops-owner-${Date.now()}@example.com`,
        fullName: "Operations Owner",
        status: "ACTIVE",
      },
    });

    otherUser = await db.user.create({
      data: {
        email: `ops-other-${Date.now()}@example.com`,
        fullName: "Operations Other",
        status: "ACTIVE",
      },
    });

    testWebsite = await createWebsite({
      name: "Ops Test Site",
      slug: `ops-test-${Date.now()}`,
      userId: ownerUser.id,
      editorData: {
        pages: [{ id: "home", name: "Home", slug: "/", elements: [] }],
      },
    });

    testWebsite2 = await createWebsite({
      name: "Ops Test Site 2",
      slug: `ops-test-2-${Date.now()}`,
      userId: otherUser.id,
      editorData: {
        pages: [{ id: "home", name: "Home", slug: "/", elements: [] }],
      },
    });

    // Start ephemeral server
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server!.address() as any;
        port = addr.port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // 1. Initialize Built-in Handlers
    initJobHandlers();

    // ==========================================
    // TEST 1: Background Job Lifecycle (Enqueue & Process)
    // ==========================================
    console.log("--- Test 1: Background Job Lifecycle ---");
    let customTaskExecuted = false;
    registerJobHandler("TEST_SIMPLE_TASK", async (payload) => {
      customTaskExecuted = true;
      return { received: payload.val, processedAt: new Date().toISOString() };
    });

    const job1 = await enqueueJob("TEST_SIMPLE_TASK", { val: 42 });
    assert(
      job1 !== null && job1.status === "QUEUED" && job1.type === "TEST_SIMPLE_TASK",
      "T1.1: enqueueJob creates a job in QUEUED status"
    );

    const proc1 = await processNextJob();
    const refreshedJob1 = await getJobById(job1.id);

    assert(
      proc1.processed === true &&
        customTaskExecuted === true &&
        refreshedJob1?.status === "COMPLETED" &&
        refreshedJob1?.completedAt !== null,
      "T1.2: processNextJob executes handler and updates status to COMPLETED"
    );

    // ==========================================
    // TEST 2: Job Retry with Exponential Backoff
    // ==========================================
    console.log("\n--- Test 2: Job Retry & Backoff ---");
    let attemptsCount = 0;
    registerJobHandler("TEST_RETRY_TASK", async () => {
      attemptsCount++;
      if (attemptsCount < 3) {
        throw new Error(`Transient network failure attempt ${attemptsCount}`);
      }
      return { success: true, finalAttempt: attemptsCount };
    });

    const retryJob = await enqueueJob("TEST_RETRY_TASK", {}, { maxAttempts: 3 });

    // Attempt 1: Should fail and requeue with backoff
    await processNextJob();
    const jobAfterAttempt1 = await getJobById(retryJob.id);
    assert(
      jobAfterAttempt1?.attempts === 1 &&
        jobAfterAttempt1?.status === "QUEUED" &&
        jobAfterAttempt1?.lastError?.includes("attempt 1") &&
        new Date(jobAfterAttempt1.runAt).getTime() > Date.now(),
      "T2.1: Failed attempt increments counter and computes future backoff runAt"
    );

    async function forceJobDue(jobId: string) {
      if (jobId.startsWith("mem_")) {
        const memJ = await getJobById(jobId);
        if (memJ) memJ.runAt = new Date(Date.now() - 1000);
      } else {
        try {
          await (prisma as any).backgroundJob.update({
            where: { id: jobId },
            data: { runAt: new Date(Date.now() - 1000) },
          });
        } catch {
          await db.$executeRawUnsafe(
            `UPDATE background_jobs SET "runAt" = NOW() - INTERVAL '1 second' WHERE id = '${jobId}'::uuid`
          );
        }
      }
    }

    // Force runAt to NOW and process Attempt 2:
    await forceJobDue(jobAfterAttempt1.id);

    await processNextJob();
    const jobAfterAttempt2 = await getJobById(retryJob.id);
    assert(
      jobAfterAttempt2?.attempts === 2 && jobAfterAttempt2?.status === "QUEUED",
      "T2.2: Second failed attempt updates attempt counter"
    );

    // Force runAt to NOW and process Attempt 3: Succeeds!
    await forceJobDue(jobAfterAttempt2.id);

    await processNextJob();
    const jobAfterAttempt3 = await getJobById(retryJob.id);
    assert(
      jobAfterAttempt3?.status === "COMPLETED" && jobAfterAttempt3?.attempts === 2,
      "T2.3: Final retry succeeds and marks job COMPLETED"
    );

    // ==========================================
    // TEST 3: Max Attempts Exhaustion
    // ==========================================
    console.log("\n--- Test 3: Max Attempts Exhaustion ---");
    registerJobHandler("TEST_ALWAYS_FAIL", async () => {
      throw new Error("Permanent fatal error");
    });

    const failJob = await enqueueJob("TEST_ALWAYS_FAIL", {}, { maxAttempts: 1 });
    await processNextJob();

    const exhaustedJob = await getJobById(failJob.id);
    assert(
      exhaustedJob?.status === "FAILED" &&
        exhaustedJob?.attempts === 1 &&
        exhaustedJob?.lastError?.includes("Permanent fatal error"),
      "T3.1: Job exceeding maxAttempts transitions to FAILED status"
    );

    // ==========================================
    // TEST 4: Built-in Handlers (MEDIA_OPTIMIZATION & DEPLOYMENT_VERIFY)
    // ==========================================
    console.log("\n--- Test 4: Built-in Handlers ---");
    const mediaJob = await enqueueJob("MEDIA_OPTIMIZATION", {
      assetUrl: "https://example.com/hero.png",
      originalSize: 1000000,
    });
    const mediaProc = await processNextJob();

    assert(
      mediaProc.processed === true &&
        mediaProc.result?.savingsPercent === "35%" &&
        mediaProc.result?.compressedSize === 650000,
      "T4.1: MEDIA_OPTIMIZATION handler calculates compression metrics"
    );

    // Initial publish for verification test
    const pubRes = await publishWebsite(testWebsite.id, ownerUser.id, {
      environment: "PRODUCTION",
      destinationType: "INTERNAL",
    });

    const verifyJob = await enqueueJob("DEPLOYMENT_VERIFY", {
      deploymentId: pubRes.deploymentId,
      websiteId: testWebsite.id,
    });
    const verifyProc = await processNextJob();

    const verifiedDeployment = await db.deployment.findUnique({
      where: { id: pubRes.deploymentId },
    });

    assert(
      verifyProc.processed === true &&
        verifyProc.result?.status === "HEALTHY" &&
        verifiedDeployment?.metadata?.asyncVerification?.status === "HEALTHY",
      "T4.2: DEPLOYMENT_VERIFY handler performs async health verification and records metadata"
    );

    // ==========================================
    // TEST 5: Scheduled Deployments
    // ==========================================
    console.log("\n--- Test 5: Scheduled Deployments ---");
    const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour in future

    const schedRes = await schedulePublish(testWebsite.id, ownerUser.id, {
      publishAt: futureDate,
      environment: "PRODUCTION",
      destinationType: "INTERNAL",
    });

    assert(
      schedRes.success === true &&
        schedRes.status === "SCHEDULED" &&
        Boolean(schedRes.scheduledJobId),
      "T5.1: schedulePublish enqueues future SCHEDULED_PUBLISH job"
    );

    // Check AuditLog for publish schedule
    const schedLogs = await queryAuditLogs({
      userId: ownerUser.id,
      action: "PUBLISH_SCHEDULED",
    });
    assert(
      schedLogs.logs.length >= 1,
      "T5.2: Audit log PUBLISH_SCHEDULED durably recorded"
    );

    // Trigger scheduled job by forcing runAt to past
    await forceJobDue(schedRes.scheduledJobId);

    const scheduledProc = await processNextJob();
    assert(
      scheduledProc.processed === true &&
        scheduledProc.result?.success === true &&
        scheduledProc.result?.status === "PUBLISHED",
      "T5.3: Scheduled job triggers publishWebsite and produces PUBLISHED deployment when runAt arrives"
    );

    // ==========================================
    // TEST 6: Staging-to-Production Promotion Pipeline
    // ==========================================
    console.log("\n--- Test 6: Staging to Production Promotion ---");
    // Publish a clean STAGING deployment
    const stagingPub = await publishWebsite(testWebsite.id, ownerUser.id, {
      environment: "STAGING",
      destinationType: "INTERNAL",
    });
    stagingDeploymentId = stagingPub.deploymentId;

    assert(
      stagingPub.status === "PUBLISHED" && stagingPub.environment === "STAGING",
      "T6.1: Prerequisite STAGING deployment successfully created"
    );

    // Validation error 1: non-existent deployment
    let nonExistentFailed = false;
    try {
      await promoteDeployment(testWebsite.id, "00000000-0000-0000-0000-000000000000", ownerUser.id);
    } catch {
      nonExistentFailed = true;
    }
    assert(nonExistentFailed, "T6.2: Promotion rejects non-existent staging deployment");

    // Validation error 2: mismatch website
    let mismatchFailed = false;
    try {
      await promoteDeployment(testWebsite2.id, stagingDeploymentId, ownerUser.id);
    } catch {
      mismatchFailed = true;
    }
    assert(mismatchFailed, "T6.3: Promotion rejects deployment belonging to another website");

    // Validation error 3: unauthorized user
    let unauthFailed = false;
    try {
      await promoteDeployment(testWebsite.id, stagingDeploymentId, otherUser.id);
    } catch {
      unauthFailed = true;
    }
    assert(unauthFailed, "T6.4: Unauthorized user cannot promote deployments (403)");

    // Valid Promotion
    const promoRes = await promoteDeployment(testWebsite.id, stagingDeploymentId, ownerUser.id);

    assert(
      promoRes.success === true &&
        promoRes.status === "PUBLISHED" &&
        promoRes.environment === "PRODUCTION" &&
        promoRes.promotedFrom === stagingDeploymentId &&
        promoRes.version > stagingPub.version,
      "T6.5: Valid promoteDeployment creates new PRODUCTION deployment with monotonic version and promotedFrom linkage"
    );

    // Verify audit log for promotion
    const promoLogs = await queryAuditLogs({
      userId: ownerUser.id,
      action: "DEPLOYMENT_PROMOTED",
    });
    assert(
      promoLogs.logs.length >= 1,
      "T6.6: Audit log DEPLOYMENT_PROMOTED durably recorded"
    );

    // ==========================================
    // TEST 7: Monitoring & Operations Status API
    // ==========================================
    console.log("\n--- Test 7: Monitoring & Operations API ---");
    clearOperationalAlerts();

    // Alert Dispatcher Test
    const alert1 = await recordOperationalAlert(
      "WARNING",
      "job_runner",
      "High queue volume detected",
      { queueDepth: 45 }
    );
    const alert2 = await recordOperationalAlert(
      "CRITICAL",
      "cluster_manager",
      "Disk volume approaching capacity",
      { freeSpaceMb: 120 }
    );

    const activeAlerts = getOperationalAlerts();
    const criticalAlerts = getOperationalAlerts(10, "CRITICAL");

    assert(
      activeAlerts.length === 2 &&
        criticalAlerts.length === 1 &&
        criticalAlerts[0].message === "Disk volume approaching capacity",
      "T7.1: Operational Alert Dispatcher records, buffers, and filters alerts"
    );

    // System Health Telemetry Test
    const health = await getSystemHealth();
    assert(
      health.status === "HEALTHY" &&
        health.database.connected === true &&
        health.database.latencyMs >= 0 &&
        typeof health.system.uptimeSeconds === "number" &&
        health.system.memory.heapUsedMb > 0,
      "T7.2: getSystemHealth() returns complete telemetry for DB, system resources, and queues"
    );

    // HTTP Endpoint Test
    const httpHealthRes = await fetch(`${baseUrl}/api/operations/health`);
    const httpHealthJson = await httpHealthRes.json();

    assert(
      httpHealthRes.status === 200 &&
        httpHealthJson.success === true &&
        httpHealthJson.status === "HEALTHY" &&
        httpHealthJson.database?.connected === true,
      "T7.3: GET /api/operations/health HTTP endpoint returns 200 with HEALTHY status"
    );
  } catch (err: any) {
    console.error("FATAL ERROR in Milestone E tests:", err);
    failed++;
  } finally {
    // Teardown
    if (testWebsite?.id) {
      await db.website.deleteMany({ where: { id: testWebsite.id } }).catch(() => {});
    }
    if (testWebsite2?.id) {
      await db.website.deleteMany({ where: { id: testWebsite2.id } }).catch(() => {});
    }
    if (ownerUser?.id) {
      await db.user.deleteMany({ where: { id: ownerUser.id } }).catch(() => {});
    }
    if (otherUser?.id) {
      await db.user.deleteMany({ where: { id: otherUser.id } }).catch(() => {});
    }
    if (server) {
      const s = server;
      await new Promise<void>((resolve) => s.close(() => resolve()));
    }
  }

  console.log("\n=================================================");
  console.log(`MILESTONE E RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runMilestoneETests().catch((err) => {
  console.error("Unhandled test error:", err);
  process.exit(1);
});
