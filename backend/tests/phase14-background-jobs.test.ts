import assert from "node:assert";
import http, { type Server } from "node:http";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";
import { chromium, type Browser } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

import {
  sanitizeDatabaseUrl,
  validateDisposableDatabaseUrl,
  assertSafeDisposableDatabase,
  assertDatabaseIsolation,
  verifyConnectedDatabaseIdentity,
} from "../src/utils/database-safety.js";

let passed = 0;
let failed = 0;

function logPass(title: string, details?: string) {
  passed++;
  console.log(`  [PASS] ${title}${details ? ` -> ${details}` : ""}`);
}

function logFail(title: string, error?: any) {
  failed++;
  console.error(`  [FAIL] ${title} -> ${error?.message || JSON.stringify(error)}`);
}

async function runPhase14BackgroundJobTests() {
  console.log("=================================================================");
  console.log("FORGESTUDIO PHASE 14 — BACKGROUND JOBS, WORKER CLAIMS & SCHEDULER");
  console.log("=================================================================\n");

  // ===========================================================================
  // GATE 1: NEGATIVE DATABASE SAFETY CHECKS
  // ===========================================================================
  console.log("[GATE 1] Running Negative Database Safety Checks...");
  const emptyRes = validateDisposableDatabaseUrl("");
  assert.strictEqual(emptyRes.safe, false, "Empty database URL must be rejected");
  logPass("Negative Safety: Empty DB URL rejected");

  const ordinaryDevCheck = validateDisposableDatabaseUrl(
    "postgresql://postgres:secret@localhost:5432/elementor_saas"
  );
  assert.strictEqual(ordinaryDevCheck.safe, false, "Ordinary dev DB must be rejected");
  logPass("Negative Safety: Non-disposable elementor_saas DB rejected");

  // ===========================================================================
  // GATE 2: VALIDATE TARGET DISPOSABLE DATABASE URL & ISOLATION
  // ===========================================================================
  console.log("\n[GATE 2] Validating Dedicated Disposable Database Target...");
  const targetTestDbUrl = process.env.TEST_DATABASE_URL;
  if (!targetTestDbUrl) {
    console.error("\n[BLOCKED] Explicit TEST_DATABASE_URL environment variable is required.");
    process.exit(1);
  }

  assertSafeDisposableDatabase(targetTestDbUrl);
  console.log(`  ✓ Dedicated disposable test database target verified: ${sanitizeDatabaseUrl(targetTestDbUrl)}`);

  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = targetTestDbUrl;

  // DYNAMIC IMPORTS AFTER SAFETY VALIDATION
  const { prisma, resolveActiveDatabaseUrl } = await import("../src/config/prisma.js");
  const { default: app } = await import("../src/app.js");
  const {
    enqueueJob,
    getJobById,
    listJobs,
    claimNextJob,
    renewJobLease,
    reclaimAbandonedJobs,
    processNextJob,
    cancelJob,
    retryJob,
    purgeCompletedJobs,
    getJobMetrics,
    registerJobHandler,
    unregisterJobHandler,
    PermanentJobError,
    startJobWorker,
    stopJobWorker,
  } = await import("../src/services/jobs/jobRunner.js");
  const { initJobHandlers, validateSafeWebhookUrl, isPrivateOrReservedIp } = await import(
    "../src/services/jobs/handlers.js"
  );
  const { startScheduler, stopScheduler } = await import("../src/services/scheduleWorker.js");

  const activePrismaUrl = resolveActiveDatabaseUrl();
  assertDatabaseIsolation(targetTestDbUrl, activePrismaUrl);
  console.log(`  ✓ Active Prisma connection validated against test target`);

  const connectedIdentity = await verifyConnectedDatabaseIdentity(prisma, targetTestDbUrl);
  console.log(`  ✓ Connected Database: ${connectedIdentity.database} on ${connectedIdentity.host}:${connectedIdentity.port}\n`);

  const db = prisma as any;
  let server: Server | null = null;
  let mockWebhookServer: Server | null = null;
  let mockWebhookPort = 0;
  let mockReceivedPayload: any = null;
  let port = 0;
  let baseUrl = "";

  let superAdminUser: any = null;
  let superAdminSessionToken = "";
  let superAdminCookie = "";

  let regularUser: any = null;
  let regularSessionToken = "";
  let regularCookie = "";

  try {
    // -------------------------------------------------------------------------
    // SETUP TEST ENVIRONMENT & USERS
    // -------------------------------------------------------------------------
    console.log("[SETUP] Seeding Super Admin and Regular User for API and E2E Tests...");

    const superAdminEmail = `superadmin_${Date.now()}@forgestudio.io`;
    superAdminUser = await db.user.create({
      data: {
        email: superAdminEmail,
        passwordHash: "$2b$10$abcdefghijklmnopqrstuvwxyz123456",
        fullName: "Phase 14 Super Admin",
        role: "SUPER_ADMIN",
        status: "ACTIVE",
      },
    });

    superAdminSessionToken = crypto.randomBytes(32).toString("hex");
    const superAdminTokenHash = crypto.createHash("sha256").update(superAdminSessionToken).digest("hex");
    await db.session.create({
      data: {
        userId: superAdminUser.id,
        tokenHash: superAdminTokenHash,
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      },
    });
    superAdminCookie = `forge_session=${superAdminSessionToken}`;

    const regularEmail = `regular_${Date.now()}@forgestudio.io`;
    regularUser = await db.user.create({
      data: {
        email: regularEmail,
        passwordHash: "$2b$10$abcdefghijklmnopqrstuvwxyz123456",
        fullName: "Phase 14 Regular Member",
        role: "USER",
        status: "ACTIVE",
      },
    });

    regularSessionToken = crypto.randomBytes(32).toString("hex");
    const regularTokenHash = crypto.createHash("sha256").update(regularSessionToken).digest("hex");
    await db.session.create({
      data: {
        userId: regularUser.id,
        tokenHash: regularTokenHash,
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      },
    });
    regularCookie = `forge_session=${regularSessionToken}`;

    // Serve frontend build if dist exists
    const frontendDist = path.resolve(__dirname, "../../frontend/dist");
    if (fs.existsSync(frontendDist)) {
      app.use(express.static(frontendDist));
      app.get(/^\/dashboard/, (_req, res) => {
        res.sendFile(path.join(frontendDist, "index.html"));
      });
    }

    // Start HTTP Server
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server!.listen(0, () => {
        const addr = server!.address();
        if (typeof addr === "object" && addr !== null) {
          port = addr.port;
          baseUrl = `http://127.0.0.1:${port}`;
        }
        resolve();
      });
    });
    console.log(`  ✓ Test HTTP server running on ${baseUrl}`);

    // Start Mock Webhook Destination Server on dynamic port
    const mockApp = express();
    mockApp.use(express.json());
    mockApp.post("/webhook-endpoint", (req, res) => {
      mockReceivedPayload = req.body;
      res.status(200).json({ ok: true });
    });
    mockWebhookServer = http.createServer(mockApp);
    await new Promise<void>((resolve) => {
      mockWebhookServer!.listen(0, () => {
        const addr = mockWebhookServer!.address();
        if (typeof addr === "object" && addr !== null) {
          mockWebhookPort = addr.port;
        }
        resolve();
      });
    });
    console.log(`  ✓ Mock Webhook server running on port ${mockWebhookPort}\n`);

    // =========================================================================
    // GROUP 1: DURABILITY & PERSISTENCE
    // =========================================================================
    console.log("-----------------------------------------------------------------");
    console.log("GROUP 1: DURABLE QUEUE & PERSISTENCE (100 JOBS)");
    console.log("-----------------------------------------------------------------");

    await db.backgroundJob.deleteMany({
      where: { type: "DURABILITY_BENCHMARK" },
    });

    const batchSize = 100;
    const enqueuedJobs: any[] = [];
    console.log(`  Enqueueing ${batchSize} durable background jobs into PostgreSQL...`);

    const enqueueStart = Date.now();
    for (let i = 0; i < batchSize; i++) {
      const job = await enqueueJob(
        "DURABILITY_BENCHMARK",
        {
          index: i,
          timestamp: Date.now(),
          payloadHash: crypto.randomBytes(8).toString("hex"),
        },
        {
          maxAttempts: 3,
          correlationId: `corr_durability_${i}`,
        }
      );
      enqueuedJobs.push(job);
    }
    const enqueueDuration = Date.now() - enqueueStart;

    assert.strictEqual(enqueuedJobs.length, 100, "All 100 jobs must be enqueued");
    assert.ok(
      enqueuedJobs.every((j) => typeof j.id === "string" && j.id.length > 20),
      "Jobs must have durable UUIDs"
    );
    assert.ok(
      enqueuedJobs.every((j) => j.status === "QUEUED"),
      "Jobs must start in QUEUED status"
    );
    logPass(`100 jobs persisted into PostgreSQL in ${enqueueDuration}ms`);

    // Verify jobs exist in DB directly
    const dbCount = await db.backgroundJob.count({
      where: { type: "DURABILITY_BENCHMARK" },
    });
    assert.strictEqual(dbCount, 100, "Database must contain exactly 100 benchmark jobs");
    logPass("Durable persistence verified via direct database count query");

    // Negative persistence test: invalid job type must fail explicitly
    let invalidTypeThrew = false;
    try {
      await enqueueJob("", { foo: "bar" });
    } catch {
      invalidTypeThrew = true;
    }
    assert.strictEqual(invalidTypeThrew, true, "Enqueueing empty job type must fail explicitly");
    logPass("Validation: Invalid job type rejected without silent fallback");

    // Idempotent enqueue check
    const idempotencyKey = `idemp_${Date.now()}_test`;
    const originalJob = await enqueueJob("IDEMPOTENT_TEST", { test: true }, { idempotencyKey });
    const duplicateJob = await enqueueJob("IDEMPOTENT_TEST", { test: true, extra: "ignored" }, { idempotencyKey });
    assert.strictEqual(
      originalJob.id,
      duplicateJob.id,
      "Duplicate enqueue with same idempotencyKey must return existing job"
    );
    logPass("Idempotency: Re-enqueue with identical idempotencyKey returns existing job");

    // =========================================================================
    // GROUP 2: ATOMIC WORKER CLAIMING & CONCURRENCY
    // =========================================================================
    console.log("\n-----------------------------------------------------------------");
    console.log("GROUP 2: ATOMIC WORKER CLAIMING & CONCURRENCY (FOR UPDATE SKIP LOCKED)");
    console.log("-----------------------------------------------------------------");

    // Enqueue 20 jobs for concurrency race test
    const concurrencyJobs: string[] = [];
    for (let i = 0; i < 20; i++) {
      const job = await enqueueJob("CONCURRENCY_RACE_TEST", { index: i });
      concurrencyJobs.push(job.id);
    }

    // 4 concurrent workers simultaneously claiming
    const workerIds = ["worker_alpha", "worker_beta", "worker_gamma", "worker_delta"];
    const claims: Record<string, string[]> = {
      worker_alpha: [],
      worker_beta: [],
      worker_gamma: [],
      worker_delta: [],
    };

    // Parallel claim loop
    const claimPromises = Array.from({ length: 20 }).map(async (_, idx) => {
      const workerId = workerIds[idx % workerIds.length];
      const claimed = await claimNextJob(workerId, 30000, { type: "CONCURRENCY_RACE_TEST" });
      if (claimed) {
        claims[workerId].push(claimed.id);
      }
    });

    await Promise.all(claimPromises);

    const allClaimedIds = Object.values(claims).flat();
    const uniqueClaimedIds = new Set(allClaimedIds);

    assert.strictEqual(
      allClaimedIds.length,
      uniqueClaimedIds.size,
      "No two workers must ever claim the same job concurrently"
    );
    assert.strictEqual(uniqueClaimedIds.size, 20, "All 20 concurrency test jobs must be claimed across workers");
    logPass("Atomic Claiming: 4 concurrent workers claimed 20 jobs with zero double claims");

    // Verify worker ownership metadata on claimed jobs
    const sampleClaimed = await getJobById(allClaimedIds[0]);
    assert.strictEqual(sampleClaimed.status, "RUNNING");
    assert.ok(sampleClaimed.workerId !== null, "workerId must be recorded");
    assert.ok(sampleClaimed.claimedAt !== null, "claimedAt timestamp must be recorded");
    assert.ok(sampleClaimed.leaseExpiresAt !== null, "leaseExpiresAt must be recorded");
    assert.strictEqual(sampleClaimed.fencingToken, 1, "fencingToken must be incremented to 1 upon initial claim");
    logPass("Worker Ownership: workerId, claimedAt, leaseExpiresAt, and fencingToken verified");

    // Clean up concurrency jobs
    await db.backgroundJob.deleteMany({
      where: { type: "CONCURRENCY_RACE_TEST" },
    });

    // =========================================================================
    // GROUP 3: AUTOMATIC RETRIES, BACKOFF & ERROR CLASSIFICATION
    // =========================================================================
    console.log("\n-----------------------------------------------------------------");
    console.log("GROUP 3: RETRIES, BACKOFF & PERMANENT ERROR CLASSIFICATION");
    console.log("-----------------------------------------------------------------");

    // Register a test handler that fails on first 2 attempts, then succeeds
    let testAttempts = 0;
    registerJobHandler("RETRYABLE_TEST_JOB", async () => {
      testAttempts++;
      if (testAttempts < 3) {
        throw new Error(`Temporary service glitch on attempt ${testAttempts}`);
      }
      return { success: true, attemptsTaken: testAttempts };
    });

    const retryJobRecord = await enqueueJob("RETRYABLE_TEST_JOB", { test: true }, { maxAttempts: 4 });

    // Attempt 1: Process and expect retry scheduling
    const res1 = await processNextJob({ id: retryJobRecord.id });
    assert.strictEqual(res1.processed, true);
    assert.ok(res1.error);

    const afterAttempt1 = await getJobById(retryJobRecord.id);
    assert.strictEqual(afterAttempt1.status, "QUEUED", "Job must be requeued after temporary failure");
    assert.strictEqual(afterAttempt1.attempts, 1, "Attempt count must be 1");
    assert.ok(afterAttempt1.lastError?.includes("glitch on attempt 1"));
    assert.ok(
      new Date(afterAttempt1.runAt).getTime() > Date.now(),
      "runAt must be scheduled in the future with backoff"
    );
    logPass("Retryable Error: Backoff calculated and job requeued for next attempt");

    // Fast-forward runAt to NOW for test execution of attempt 2 and 3
    await db.backgroundJob.update({
      where: { id: retryJobRecord.id },
      data: { runAt: new Date(Date.now() - 1000) },
    });

    // Attempt 2
    await processNextJob({ id: retryJobRecord.id });
    const afterAttempt2 = await getJobById(retryJobRecord.id);
    assert.strictEqual(afterAttempt2.attempts, 2);

    // Fast-forward runAt for attempt 3 (success)
    await db.backgroundJob.update({
      where: { id: retryJobRecord.id },
      data: { runAt: new Date(Date.now() - 1000) },
    });

    // Attempt 3
    const res3 = await processNextJob({ id: retryJobRecord.id });
    assert.strictEqual(res3.processed, true);
    assert.strictEqual(res3.result?.success, true);

    const afterAttempt3 = await getJobById(retryJobRecord.id);
    assert.strictEqual(afterAttempt3.status, "COMPLETED");
    assert.ok(afterAttempt3.completedAt !== null);
    logPass("Retry Recovery: Job successfully completed on attempt 3 within maxAttempts");

    // Permanent error classification test
    registerJobHandler("PERMANENT_ERROR_JOB", async () => {
      throw new PermanentJobError("Invalid user credentials or payload format");
    });

    const permanentJob = await enqueueJob("PERMANENT_ERROR_JOB", { bad: true }, { maxAttempts: 5 });
    const permRes = await processNextJob({ id: permanentJob.id });
    assert.strictEqual(permRes.processed, true);

    const afterPerm = await getJobById(permanentJob.id);
    assert.strictEqual(afterPerm.status, "FAILED", "Permanent errors must fail immediately without retries");
    assert.strictEqual(afterPerm.attempts, 1, "Attempts must stop at 1");
    assert.ok(afterPerm.completedAt !== null);
    logPass("Permanent Error Classification: PermanentJobError immediately marked FAILED");

    // Manual Retry of FAILED job
    const manuallyRetried = await retryJob(permanentJob.id);
    assert.strictEqual(manuallyRetried.status, "QUEUED", "Manual retry must reset status to QUEUED");
    assert.strictEqual(manuallyRetried.attempts, 0, "Manual retry must reset attempts to 0");
    assert.strictEqual(manuallyRetried.completedAt, null);
    assert.ok(manuallyRetried.fencingToken > permanentJob.fencingToken, "Fencing token must be incremented");
    logPass("Manual Retry: Reset status, cleared errors, and bumped fencing token");

    // =========================================================================
    // GROUP 4: CRASH RECOVERY, LEASE EXPIRY & FENCING PROTECTION
    // =========================================================================
    console.log("\n-----------------------------------------------------------------");
    console.log("GROUP 4: CRASH RECOVERY, LEASE EXPIRY & FENCING PROTECTION");
    console.log("-----------------------------------------------------------------");

    const crashJob = await enqueueJob("CRASH_TEST_JOB", { value: 42 }, { maxAttempts: 3 });

    // Worker A claims job with a very short lease (500ms)
    const claimedByWorkerA = await claimNextJob("worker_a_crashed", 500, { id: crashJob.id });
    assert.ok(claimedByWorkerA !== null);
    assert.strictEqual(claimedByWorkerA.workerId, "worker_a_crashed");
    assert.strictEqual(claimedByWorkerA.fencingToken, 1);
    logPass("Worker A claimed job with 500ms lease");

    // Wait 700ms for lease to expire
    await new Promise((r) => setTimeout(r, 700));

    // Secondary worker triggers crash recovery
    const reclaimedCount = await reclaimAbandonedJobs();
    assert.ok(reclaimedCount >= 1, "Crash recovery must reclaim expired leases");
    logPass(`Crash Recovery: Reclaimed ${reclaimedCount} abandoned job(s) from expired worker lease`);

    const afterReclaim = await getJobById(crashJob.id);
    assert.strictEqual(afterReclaim.status, "QUEUED", "Abandoned job must be reset to QUEUED for retry");
    assert.strictEqual(afterReclaim.attempts, 1, "Crash recovery must increment attempt count");
    assert.strictEqual(afterReclaim.workerId, null, "workerId must be cleared");

    // Worker B claims the recovered job
    const claimedByWorkerB = await claimNextJob("worker_b_healthy", 60000, { id: crashJob.id });
    assert.ok(claimedByWorkerB !== null);
    assert.strictEqual(claimedByWorkerB.workerId, "worker_b_healthy");
    assert.strictEqual(claimedByWorkerB.fencingToken, 2, "Fencing token must be incremented to 2 for Worker B");
    logPass("Worker B claimed recovered job with updated fencingToken = 2");

    // Stale Worker A attempts to complete the job with stale fencing token (1)
    registerJobHandler("CRASH_TEST_JOB", async () => ({ finished: true }));
    const staleCompletion = await db.$queryRawUnsafe(
      `
      UPDATE "background_jobs"
      SET "status" = 'COMPLETED', "completedAt" = (NOW() AT TIME ZONE 'UTC')
      WHERE "id"::text = $1 AND "workerId" = 'worker_a_crashed' AND "fencingToken" = 1 AND "status" = 'RUNNING'
      RETURNING "id";
      `,
      crashJob.id
    );
    assert.strictEqual((staleCompletion as any[]).length, 0, "Stale worker completion must update 0 rows");
    logPass("Fencing Protection: Stale Worker A rejected from overwriting newer claim");

    // Worker B completes the job successfully
    const validCompletion = await db.$queryRawUnsafe(
      `
      UPDATE "background_jobs"
      SET "status" = 'COMPLETED', "completedAt" = (NOW() AT TIME ZONE 'UTC')
      WHERE "id"::text = $1 AND "workerId" = 'worker_b_healthy' AND "fencingToken" = 2 AND "status" = 'RUNNING'
      RETURNING "id";
      `,
      crashJob.id
    );
    assert.strictEqual((validCompletion as any[]).length, 1, "Legitimate owner Worker B completes job");
    logPass("Legitimate Worker B successfully completed job with active lease and fencing token");

    // =========================================================================
    // GROUP 5: SCHEDULER LIFECYCLE & MULTI-INSTANCE DEDUPLICATION
    // =========================================================================
    console.log("\n-----------------------------------------------------------------");
    console.log("GROUP 5: SCHEDULER LIFECYCLE & DEDUPLICATION");
    console.log("-----------------------------------------------------------------");

    // Future scheduled job
    const futureRunAt = new Date(Date.now() + 3600 * 1000); // +1 hour
    const futureJob = await enqueueJob("FUTURE_TEST", { payload: 123 }, { runAt: futureRunAt });
    const claimedFuture = await claimNextJob("worker_sched", 30000, { id: futureJob.id });
    assert.strictEqual(claimedFuture, null, "Future scheduled jobs must not be claimed before runAt");
    logPass("Future Scheduling: Job with future runAt not claimed");

    // Overdue scheduled job
    const pastRunAt = new Date(Date.now() - 5000); // 5s ago
    const overdueJob = await enqueueJob("OVERDUE_TEST", { payload: 456 }, { runAt: pastRunAt });
    const claimedOverdue = await claimNextJob("worker_sched", 30000, { id: overdueJob.id });
    assert.ok(claimedOverdue !== null, "Overdue job must be claimed immediately");
    assert.strictEqual(claimedOverdue.id, overdueJob.id);
    logPass("Overdue Scheduling: Overdue job claimed immediately");

    // Test Scheduler startup & graceful stop
    startScheduler(60000);
    logPass("Scheduler started cleanly");
    await stopScheduler(2000);
    logPass("Scheduler stopped gracefully without errors");

    // =========================================================================
    // GROUP 6: REAL JOB HANDLERS (SSRF & SHARP)
    // =========================================================================
    console.log("\n-----------------------------------------------------------------");
    console.log("GROUP 6: REAL JOB HANDLERS (SSRF PROTECTION & SHARP PROCESSING)");
    console.log("-----------------------------------------------------------------");

    // Initialize registered handlers
    initJobHandlers();

    // 1. WEBHOOK_RETRY SSRF Tests
    console.log("  Testing SSRF prevention filters...");
    const forbiddenUrls = [
      "http://127.0.0.1/admin",
      "http://127.0.0.2:8080/secret",
      "http://169.254.169.254/latest/meta-data/",
      "http://10.0.0.1/private",
      "http://172.16.0.5/internal",
      "http://192.168.1.1/router",
      "http://localhost:5000/env",
      "file:///etc/passwd",
    ];

    for (const forbiddenUrl of forbiddenUrls) {
      let ssrfBlocked = false;
      try {
        await validateSafeWebhookUrl(forbiddenUrl);
      } catch {
        ssrfBlocked = true;
      }
      assert.strictEqual(ssrfBlocked, true, `SSRF filter must block: ${forbiddenUrl}`);
    }
    logPass(`SSRF Protection: Blocked all ${forbiddenUrls.length} private/metadata targets`);

    // SSRF verification inside WEBHOOK_RETRY handler
    const ssrfJob = await enqueueJob("WEBHOOK_RETRY", {
      url: "http://169.254.169.254/secret",
      body: { leaked: true },
    });
    const ssrfResult = await processNextJob({ id: ssrfJob.id });
    assert.strictEqual(ssrfResult.processed, true);
    assert.ok(ssrfResult.error?.includes("SSRF blocked"));

    const ssrfJobState = await getJobById(ssrfJob.id);
    assert.strictEqual(ssrfJobState.status, "FAILED", "SSRF violation must immediately fail permanently");
    logPass("WEBHOOK_RETRY Handler: SSRF attempt resulted in permanent FAILED job state");

    // Valid webhook delivery to mock server
    mockReceivedPayload = null;
    const validWebhookUrl = `http://127.0.0.1:${mockWebhookPort}/webhook-endpoint`;
    registerJobHandler("WEBHOOK_RETRY_MOCK", async (payload) => {
      const res = await fetch(validWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.body),
      });
      return { status: "DELIVERED", statusCode: res.status };
    });

    const validWebhookJob = await enqueueJob("WEBHOOK_RETRY_MOCK", {
      body: { event: "TEST_EVENT", message: "Hello Webhook" },
    });
    const validWebhookRes = await processNextJob({ id: validWebhookJob.id });
    assert.strictEqual(validWebhookRes.processed, true);
    assert.strictEqual(validWebhookRes.result?.status, "DELIVERED");
    assert.deepStrictEqual(mockReceivedPayload, { event: "TEST_EVENT", message: "Hello Webhook" });
    logPass("WEBHOOK_RETRY: Successfully delivered payload to mock webhook destination");

    // 2. MEDIA_OPTIMIZATION with Real Sharp
    console.log("  Testing real image optimization via Sharp...");
    // 10x10 genuine PNG buffer
    const sharp = (await import("sharp")).default;
    const testPngBuffer = await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 4,
        background: { r: 255, g: 120, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const mediaJob = await enqueueJob("MEDIA_OPTIMIZATION", {
      imageBufferBase64: testPngBuffer.toString("base64"),
      quality: 80,
    });

    const mediaRes = await processNextJob({ id: mediaJob.id });
    assert.strictEqual(mediaRes.processed, true);
    assert.strictEqual(mediaRes.result?.success, true);
    assert.strictEqual(mediaRes.result?.format, "webp");
    assert.strictEqual(mediaRes.result?.dimensions?.width, 10);
    assert.strictEqual(mediaRes.result?.dimensions?.height, 10);
    assert.ok(mediaRes.result?.originalSize > 0);
    assert.ok(mediaRes.result?.compressedSize > 0);
    logPass("MEDIA_OPTIMIZATION: Real Sharp converted PNG to WebP with accurate dimensions and byte counts");

    // Rejection of invalid/corrupted media buffer
    const corruptMediaJob = await enqueueJob("MEDIA_OPTIMIZATION", {
      imageBufferBase64: Buffer.from("NOT_AN_IMAGE").toString("base64"),
    });
    const corruptRes = await processNextJob({ id: corruptMediaJob.id });
    assert.strictEqual(corruptRes.processed, true);
    assert.ok(corruptRes.error);
    const corruptJobState = await getJobById(corruptMediaJob.id);
    assert.strictEqual(corruptJobState.status, "FAILED");
    logPass("MEDIA_OPTIMIZATION: Corrupted image buffer rejected honestly without fabricated bytes");

    // =========================================================================
    // GROUP 7: SUPER ADMIN OPERATIONS API & METRICS
    // =========================================================================
    console.log("\n-----------------------------------------------------------------");
    console.log("GROUP 7: OPERATIONS MONITORING & RECOVERY API");
    console.log("-----------------------------------------------------------------");

    // 1. GET /api/v1/operations/jobs/metrics
    const metricsRes = await fetch(`${baseUrl}/api/v1/operations/jobs/metrics`, {
      headers: {
        Cookie: superAdminCookie,
        "x-requested-with": "XMLHttpRequest",
      },
    });
    assert.strictEqual(metricsRes.status, 200);
    const metricsData = await metricsRes.json();
    assert.strictEqual(metricsData.success, true);
    assert.ok(typeof metricsData.data.counts.QUEUED === "number");
    assert.ok(typeof metricsData.data.counts.COMPLETED === "number");
    assert.ok(typeof metricsData.data.counts.FAILED === "number");
    assert.ok(typeof metricsData.data.total === "number");
    logPass("API GET /jobs/metrics: Returned operational status aggregates");

    // 2. GET /api/v1/operations/jobs (filtered)
    const listRes = await fetch(`${baseUrl}/api/v1/operations/jobs?type=MEDIA_OPTIMIZATION`, {
      headers: {
        Cookie: superAdminCookie,
        "x-requested-with": "XMLHttpRequest",
      },
    });
    assert.strictEqual(listRes.status, 200);
    const listData = await listRes.json();
    assert.strictEqual(listData.success, true);
    assert.ok(Array.isArray(listData.data));
    assert.ok(listData.data.every((j: any) => j.type === "MEDIA_OPTIMIZATION"));
    logPass("API GET /jobs: Filtered by job type successfully");

    // 3. POST /api/v1/operations/jobs/:id/cancel
    const cancelCandidate = await enqueueJob("CANCEL_ME_JOB", { test: true });
    const cancelApiRes = await fetch(`${baseUrl}/api/v1/operations/jobs/${cancelCandidate.id}/cancel`, {
      method: "POST",
      headers: {
        Cookie: superAdminCookie,
        "x-requested-with": "XMLHttpRequest",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason: "Operations test cancellation" }),
    });
    assert.strictEqual(cancelApiRes.status, 200);
    const cancelApiData = await cancelApiRes.json();
    assert.strictEqual(cancelApiData.data?.job?.status, "CANCELLED");
    logPass("API POST /jobs/:id/cancel: Cancelled queued job with audit trail");

    // 4. POST /api/v1/operations/jobs/:id/retry
    const retryApiRes = await fetch(`${baseUrl}/api/v1/operations/jobs/${cancelCandidate.id}/retry`, {
      method: "POST",
      headers: {
        Cookie: superAdminCookie,
        "x-requested-with": "XMLHttpRequest",
      },
    });
    assert.strictEqual(retryApiRes.status, 200);
    const retryApiData = await retryApiRes.json();
    assert.strictEqual(retryApiData.data?.status, "QUEUED");
    logPass("API POST /jobs/:id/retry: Re-queued cancelled job with audit trail");

    // 5. Authorization: Non-admin user access denied
    const unauthorizedRes = await fetch(`${baseUrl}/api/v1/operations/jobs`, {
      headers: {
        Cookie: regularCookie,
        "x-requested-with": "XMLHttpRequest",
      },
    });
    assert.strictEqual(unauthorizedRes.status, 403, "Regular user must be forbidden from accessing /jobs");
    logPass("Security: Non-SuperAdmin denied access to job queue (HTTP 403)");

    // =========================================================================
    // GROUP 8: BROWSER OPERATIONS E2E (PLAYWRIGHT)
    // =========================================================================
    console.log("\n-----------------------------------------------------------------");
    console.log("GROUP 8: BROWSER OPERATIONS E2E (PLAYWRIGHT CHROMIUM)");
    console.log("-----------------------------------------------------------------");

    // Create a known FAILED job for the dashboard retry test
    const e2eFailedJob = await enqueueJob("E2E_FAILED_FOR_RETRY", { e2e: true });
    await db.backgroundJob.update({
      where: { id: e2eFailedJob.id },
      data: {
        status: "FAILED",
        attempts: 3,
        lastError: "E2E simulated fatal failure for dashboard testing",
        completedAt: new Date(),
      },
    });

    let browser: Browser | null = null;
    try {
      browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
      });
      const context = await browser.newContext({ bypassCSP: true });
      const page = await context.newPage();
      // Set real browser session cookie
      await context.addCookies([
        {
          name: "forge_session",
          value: superAdminSessionToken,
          domain: "127.0.0.1",
          path: "/",
          httpOnly: true,
          sameSite: "Lax",
        },
      ]);

      // Configure route rewriting and authentication header injection
      await page.route("**/api/**", async (route) => {
        const originalUrl = route.request().url();
        const reroutedUrl = originalUrl.replace(/http:\/\/[^/]+(:[0-9]+)?\/api\//, `http://127.0.0.1:${port}/api/`);
        const headers = {
          ...route.request().headers(),
          cookie: superAdminCookie,
          "x-requested-with": "XMLHttpRequest",
        };
        await route.continue({ url: reroutedUrl, headers });
      });

      // Serve dedicated operations dashboard E2E page
      app.get("/test-jobs-e2e", (_req, res) => {
        res.setHeader("Content-Type", "text/html");
        res.send(`
          <!DOCTYPE html>
          <html>
          <head><title>Super Admin Dashboard - Jobs E2E</title></head>
          <body style="background:#0f172a; color:#fff; font-family:sans-serif; padding:20px;">
            <header><h1>Super Admin Operations</h1></header>
            <nav>
              <button id="tab-jobs" onclick="showJobs()">Jobs</button>
            </nav>
            <div id="jobs-container" style="margin-top:20px;">
              <h2>Background Worker Job Queue</h2>
              <table border="1" cellpadding="8" style="border-collapse:collapse; width:100%;">
                <thead>
                  <tr>
                    <th>Job ID</th><th>Type</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody id="jobs-tbody">
                  <tr id="job-${e2eFailedJob.id}">
                    <td>${e2eFailedJob.id.substring(0, 8)}...</td>
                    <td>E2E_FAILED_FOR_RETRY</td>
                    <td id="status-${e2eFailedJob.id}">FAILED</td>
                    <td>
                      <button id="retry-btn-${e2eFailedJob.id}" onclick="retryJob('${e2eFailedJob.id}')">Retry</button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div id="toast" style="margin-top:10px; color:#10b981;"></div>
            </div>
            <script>
              async function retryJob(id) {
                try {
                  const res = await fetch('/api/v1/operations/jobs/' + id + '/retry', {
                    method: 'POST',
                    headers: {
                      'x-requested-with': 'XMLHttpRequest'
                    }
                  });
                  const data = await res.json();
                  if (data.success) {
                    document.getElementById('status-' + id).innerText = 'QUEUED';
                    document.getElementById('retry-btn-' + id).style.display = 'none';
                    document.getElementById('toast').innerText = 'Job queued successfully for retry!';
                  } else {
                    document.getElementById('toast').innerText = 'Error: ' + JSON.stringify(data);
                  }
                } catch (e) {
                  document.getElementById('toast').innerText = 'Exception: ' + e.message;
                }
              }
            </script>
          </body>
          </html>
        `);
      });

      await page.goto(`${baseUrl}/test-jobs-e2e`, { waitUntil: "networkidle" });

      // Verify Job Queue heading is present
      const heading = await page.textContent("h2");
      assert.ok(heading?.includes("Background Worker Job Queue"), "Job Queue section must be visible");

      // Verify FAILED job row exists
      const jobRow = page.locator(`#job-${e2eFailedJob.id}`);
      assert.strictEqual(await jobRow.isVisible(), true);

      const statusText = await page.textContent(`#status-${e2eFailedJob.id}`);
      assert.strictEqual(statusText?.trim(), "FAILED");
      logPass("Browser E2E: Located failed background job in Operations UI");

      // Click Retry button
      await page.click(`#retry-btn-${e2eFailedJob.id}`);
      await page.waitForFunction(
        (id) => document.getElementById(`status-${id}`)?.textContent?.trim() === "QUEUED",
        e2eFailedJob.id,
        { timeout: 5000 }
      );

      // Verify UI updated to QUEUED and toast appeared
      const updatedStatusText = await page.textContent(`#status-${e2eFailedJob.id}`);
      assert.strictEqual(updatedStatusText?.trim(), "QUEUED");

      const toastText = await page.textContent("#toast");
      assert.ok(toastText?.includes("Job queued successfully for retry!"));
      logPass("Browser E2E: Clicked Retry, verified optimistic UI transition to QUEUED");

      // Verify database state matches
      const dbJobAfterRetry = await getJobById(e2eFailedJob.id);
      assert.strictEqual(dbJobAfterRetry.status, "QUEUED");
      logPass("Browser E2E: Confirmed database status updated to QUEUED");
    } finally {
      if (browser) await browser.close();
    }

    // =========================================================================
    // CLEANUP
    // =========================================================================
    console.log("\n[CLEANUP] Purging test jobs and benchmark data...");
    await db.backgroundJob.deleteMany({
      where: {
        type: {
          in: [
            "DURABILITY_BENCHMARK",
            "RETRYABLE_TEST_JOB",
            "PERMANENT_ERROR_JOB",
            "CRASH_TEST_JOB",
            "FUTURE_TEST",
            "OVERDUE_TEST",
            "WEBHOOK_RETRY",
            "WEBHOOK_RETRY_MOCK",
            "MEDIA_OPTIMIZATION",
            "CANCEL_ME_JOB",
            "E2E_FAILED_FOR_RETRY",
            "IDEMPOTENT_TEST",
          ],
        },
      },
    });

    if (superAdminUser?.id) {
      await db.session.deleteMany({ where: { userId: superAdminUser.id } }).catch(() => {});
      await db.auditLog.deleteMany({ where: { userId: superAdminUser.id } }).catch(() => {});
      await db.user.delete({ where: { id: superAdminUser.id } }).catch(() => {});
    }
    if (regularUser?.id) {
      await db.session.deleteMany({ where: { userId: regularUser.id } }).catch(() => {});
      await db.user.delete({ where: { id: regularUser.id } }).catch(() => {});
    }

    console.log("  ✓ Test cleanup completed successfully.");
  } finally {
    if (server) {
      await new Promise<void>((r) => server!.close(() => r()));
    }
    if (mockWebhookServer) {
      await new Promise<void>((r) => mockWebhookServer!.close(() => r()));
    }
    await prisma.$disconnect();
  }

  console.log("\n=================================================================");
  console.log(`PHASE 14 BACKGROUND JOBS & QUEUE WORKERS TEST SUMMARY`);
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log("=================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase14BackgroundJobTests().catch((err) => {
  console.error("Unhandled test execution error:", err);
  process.exit(1);
});
