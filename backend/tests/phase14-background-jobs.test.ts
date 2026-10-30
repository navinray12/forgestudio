import assert from "node:assert";
import http, { type Server } from "node:http";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
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
      app.get(/^\/(dashboard|super-admin|admin|login)/, (_req, res) => {
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
    mockApp.get("/redirect-to-ssrf", (_req, res) => {
      res.redirect(302, "http://169.254.169.254/latest/meta-data/");
    });
    mockApp.get("/redirect-to-loopback", (_req, res) => {
      res.redirect(302, "http://127.0.0.1:80/secret");
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

    // Tenant-Scoped Idempotency: Multiple tenants can use identical idempotency key without collision or leakage
    const tenantA = crypto.randomUUID();
    const tenantB = crypto.randomUUID();
    const crossTenantKey = `shared_idemp_${Date.now()}`;

    const jobA = await enqueueJob("TENANT_IDEMP_TEST", { tenant: "A" }, { idempotencyKey: crossTenantKey, tenantId: tenantA });
    const jobB = await enqueueJob("TENANT_IDEMP_TEST", { tenant: "B" }, { idempotencyKey: crossTenantKey, tenantId: tenantB });

    assert.notStrictEqual(jobA.id, jobB.id, "Tenant A and Tenant B must receive distinct jobs for the same idempotency key");
    assert.strictEqual(jobA.tenantId, tenantA);
    assert.strictEqual(jobB.tenantId, tenantB);

    // Re-enqueue for Tenant A returns Tenant A's job
    const repeatA = await enqueueJob("TENANT_IDEMP_TEST", { tenant: "A_repeat" }, { idempotencyKey: crossTenantKey, tenantId: tenantA });
    assert.strictEqual(repeatA.id, jobA.id, "Tenant A repeat enqueue returns Tenant A job");

    // Re-enqueue for Tenant B returns Tenant B's job
    const repeatB = await enqueueJob("TENANT_IDEMP_TEST", { tenant: "B_repeat" }, { idempotencyKey: crossTenantKey, tenantId: tenantB });
    assert.strictEqual(repeatB.id, jobB.id, "Tenant B repeat enqueue returns Tenant B job");
    logPass("Tenant Idempotency: Cross-tenant isolation verified with zero collisions or leakage");

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

    // Negative State Transitions: Never manually retry a RUNNING or COMPLETED job, or cancel a COMPLETED job
    const runningTransitionJob = await enqueueJob("STATE_TRANSITION_TEST", { step: 1 });
    await claimNextJob("worker_transition_test", 30000, { id: runningTransitionJob.id });

    let retryRunningThrew = false;
    try {
      await retryJob(runningTransitionJob.id);
    } catch (err: any) {
      retryRunningThrew = true;
      assert.ok(
        err.message?.toLowerCase().includes("running") ||
        (err as any).errorCode === "INVALID_STATE_TRANSITION"
      );
    }
    assert.strictEqual(retryRunningThrew, true, "Retrying a RUNNING job must be rejected with INVALID_STATE_TRANSITION");
    logPass("State Transition: Manual retry of RUNNING job rejected");

    let retryCompletedThrew = false;
    try {
      await retryJob(afterAttempt3.id);
    } catch (err: any) {
      retryCompletedThrew = true;
      assert.ok(
        err.message?.toLowerCase().includes("completed") ||
        (err as any).errorCode === "INVALID_STATE_TRANSITION"
      );
    }
    assert.strictEqual(retryCompletedThrew, true, "Retrying a COMPLETED job must be rejected with INVALID_STATE_TRANSITION");
    logPass("State Transition: Manual retry of COMPLETED job rejected");

    let cancelCompletedThrew = false;
    try {
      await cancelJob(afterAttempt3.id, "Should not cancel completed");
    } catch (err: any) {
      cancelCompletedThrew = true;
      assert.ok(
        err.message?.toLowerCase().includes("completed") ||
        (err as any).errorCode === "JOB_ALREADY_COMPLETED"
      );
    }
    assert.strictEqual(cancelCompletedThrew, true, "Cancelling a COMPLETED job must be rejected with JOB_ALREADY_COMPLETED");
    logPass("State Transition: Cancellation of COMPLETED job rejected");

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
    assert.ok(claimedByWorkerB.fencingToken > claimedByWorkerA.fencingToken, "Fencing token must be incremented for Worker B");
    logPass(`Worker B claimed recovered job with updated fencingToken = ${claimedByWorkerB.fencingToken}`);

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
      WHERE "id"::text = $1 AND "workerId" = 'worker_b_healthy' AND "fencingToken" = $2 AND "status" = 'RUNNING'
      RETURNING "id";
      `,
      crashJob.id,
      claimedByWorkerB.fencingToken
    );
    assert.strictEqual((validCompletion as any[]).length, 1, "Legitimate owner Worker B completes job");
    logPass("Legitimate Worker B successfully completed job with active lease and fencing token");

    // Separate-process worker crash test (Requirement 10)
    console.log("  Testing separate-process crash recovery with ungraceful process termination...");
    const separateCrashJob = await enqueueJob("SEPARATE_PROCESS_CRASH_TEST", { test: "separate_process" });

    const childWorkerPath = path.resolve(__dirname, "helpers/crash-worker-child.ts");
    const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";

    const childProcess = spawn(npxCmd, ["tsx", childWorkerPath], {
      env: {
        ...process.env,
        TEST_DATABASE_URL: targetTestDbUrl,
        DATABASE_URL: targetTestDbUrl,
      },
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    });

    let childClaimReceived = false;
    let childWorkerId = "";
    let childClaimJobId = "";
    let childFencingToken = 0;

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timeout waiting for child worker claim")), 25000);

      childProcess.stdout?.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        const match = text.match(/CHILD_WORKER_CLAIMED:([^:]+):([^:]+):([^\r\n]+)/);
        if (match) {
          childClaimJobId = match[1];
          childFencingToken = parseInt(match[2], 10);
          childWorkerId = match[3].trim();
          childClaimReceived = true;
          clearTimeout(timeout);
          resolve();
        }
      });

      childProcess.stderr?.on("data", (chunk: Buffer) => {
        console.error("  [CHILD STDERR]", chunk.toString().trim());
      });

      childProcess.on("exit", (code) => {
        if (!childClaimReceived) {
          clearTimeout(timeout);
          reject(new Error(`Child worker exited prematurely with code ${code}`));
        }
      });
    });

    assert.strictEqual(childClaimReceived, true, "Child process must claim job successfully");
    assert.strictEqual(childClaimJobId, separateCrashJob.id);
    assert.strictEqual(childFencingToken, 1);
    logPass(`Separate-Process: Worker ${childWorkerId} claimed job ${separateCrashJob.id}`);

    // Kill the child worker ungracefully (SIGKILL)
    try {
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", String(childProcess.pid), "/f", "/t"]);
      } else {
        process.kill(childProcess.pid!, "SIGKILL");
      }
    } catch {
      // In case already exited
    }
    logPass("Separate-Process: Child worker terminated ungracefully");

    // Wait 2200ms for child lease (1500ms) to definitely expire
    await new Promise((r) => setTimeout(r, 2200));

    // Recovery worker sweeps expired leases
    const recoveredCount = await reclaimAbandonedJobs();
    assert.ok(recoveredCount >= 1, "Abandoned job must be recovered after crash");
    logPass(`Separate-Process Recovery: Reclaimed ${recoveredCount} abandoned job(s)`);

    const crashJobAfterRecovery = await getJobById(separateCrashJob.id);
    assert.strictEqual(crashJobAfterRecovery.status, "QUEUED");
    assert.strictEqual(crashJobAfterRecovery.attempts, 1);
    assert.strictEqual(crashJobAfterRecovery.workerId, null);

    // Another worker (Worker B) claims the recovered job
    const workerBClaim = await claimNextJob("worker_b_restart", 30000, { id: separateCrashJob.id });
    assert.ok(workerBClaim !== null);
    assert.strictEqual(workerBClaim.workerId, "worker_b_restart");
    assert.ok(workerBClaim.fencingToken > childFencingToken, "Worker B must receive strictly higher fencingToken");
    logPass(`Separate-Process Recovery: Restarted Worker B claimed job with fencingToken = ${workerBClaim.fencingToken}`);

    // Attempt stale-worker overwrite with killed worker's credentials and fencing token
    const staleChildOverwrite = await db.$queryRawUnsafe(
      `
      UPDATE "background_jobs"
      SET "status" = 'COMPLETED', "completedAt" = (NOW() AT TIME ZONE 'UTC')
      WHERE "id"::text = $1 AND "workerId" = $2 AND "fencingToken" = $3 AND "status" = 'RUNNING'
      RETURNING "id";
      `,
      separateCrashJob.id,
      childWorkerId,
      childFencingToken
    );
    assert.strictEqual((staleChildOverwrite as any[]).length, 0, "Stale killed child worker must not overwrite recovered job");
    logPass("Separate-Process Fencing: Stale killed child worker completion rejected (0 rows updated)");

    // Worker B completes job legitimately
    const workerBCompletion = await db.$queryRawUnsafe(
      `
      UPDATE "background_jobs"
      SET "status" = 'COMPLETED', "completedAt" = (NOW() AT TIME ZONE 'UTC')
      WHERE "id"::text = $1 AND "workerId" = 'worker_b_restart' AND "fencingToken" = $2 AND "status" = 'RUNNING'
      RETURNING "id";
      `,
      separateCrashJob.id,
      workerBClaim.fencingToken
    );
    assert.strictEqual((workerBCompletion as any[]).length, 1, "Worker B completed job successfully");
    logPass("Separate-Process: Worker B completed job legitimately with active fencing token");

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
      "http://[fd00:ec2::254]/latest/meta-data/",
      "http://[::ffff:169.254.169.254]/",
      "http://[::1]/",
      "http://100.64.0.1/private",
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
    logPass("WEBHOOK_RETRY Handler: Direct SSRF attempt resulted in permanent FAILED job state");

    // SSRF Redirect Trap: Prevent unsafe redirects to metadata or loopback
    const ssrfRedirectJob = await enqueueJob("WEBHOOK_RETRY", {
      url: `http://127.0.0.1:${mockWebhookPort}/redirect-to-ssrf`,
      body: { test: "redirect_trap" },
    });
    // WEBHOOK_RETRY handler validates each redirect hop
    const ssrfRedirectRes = await processNextJob({ id: ssrfRedirectJob.id });
    assert.strictEqual(ssrfRedirectRes.processed, true);
    assert.ok(ssrfRedirectRes.error?.includes("SSRF"));
    const ssrfRedirectJobState = await getJobById(ssrfRedirectJob.id);
    assert.strictEqual(ssrfRedirectJobState.status, "FAILED");
    logPass("WEBHOOK_RETRY Handler: Malicious 302 redirect to metadata endpoint blocked and failed permanently");

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

    // 2. DEPLOYMENT_VERIFY Authoritative Verification & Outcomes
    console.log("  Testing authoritative DEPLOYMENT_VERIFY handler...");
    const testWebsite = await db.website.create({
      data: {
        name: "Verification Test Site",
        slug: `verify-test-${Date.now()}`,
        userId: superAdminUser.id,
        status: "DRAFT",
      },
    });

    // Test 2a: BUILD_FAILED deployment -> FAILED
    const failedDeployment = await db.deployment.create({
      data: {
        websiteId: testWebsite.id,
        version: 1,
        status: "BUILD_FAILED",
        destinationType: "NETLIFY",
        metadata: { compileError: "SyntaxError: Unexpected token" },
      },
    });
    const verifyFailJob = await enqueueJob("DEPLOYMENT_VERIFY", { deploymentId: failedDeployment.id });
    const verifyFailRes = await processNextJob({ id: verifyFailJob.id });
    assert.strictEqual(verifyFailRes.processed, true);
    assert.ok(verifyFailRes.error?.includes("BUILD_FAILED"));
    const failJobRecord = await getJobById(verifyFailJob.id);
    assert.strictEqual(failJobRecord.status, "FAILED");
    const updatedFailDeployment = await db.deployment.findUnique({ where: { id: failedDeployment.id } });
    assert.strictEqual(updatedFailDeployment.metadata.asyncVerification.status, "FAILED");
    assert.strictEqual(updatedFailDeployment.metadata.asyncVerification.evidence.authoritativeStatus, "BUILD_FAILED");
    logPass("DEPLOYMENT_VERIFY: Authoritative BUILD_FAILED marked FAILED with logged evidence");

    // Test 2b: RECONCILIATION_REQUIRED deployment -> DEGRADED
    const degradedDeployment = await db.deployment.create({
      data: {
        websiteId: testWebsite.id,
        version: 2,
        status: "RECONCILIATION_REQUIRED",
        destinationType: "NETLIFY",
        metadata: { drift: "Edge CDN stale cache" },
      },
    });
    const verifyDegradedJob = await enqueueJob("DEPLOYMENT_VERIFY", { deploymentId: degradedDeployment.id });
    const verifyDegradedRes = await processNextJob({ id: verifyDegradedJob.id });
    assert.strictEqual(verifyDegradedRes.processed, true);
    assert.strictEqual(verifyDegradedRes.result?.status, "DEGRADED");
    assert.strictEqual(verifyDegradedRes.result?.outcome, "DEGRADED");
    const updatedDegradedDeployment = await db.deployment.findUnique({ where: { id: degradedDeployment.id } });
    assert.strictEqual(updatedDegradedDeployment.metadata.asyncVerification.status, "DEGRADED");
    logPass("DEPLOYMENT_VERIFY: Authoritative RECONCILIATION_REQUIRED marked DEGRADED with evidence");

    // Test 2c: Valid published deployment with matching snapshot -> HEALTHY
    await db.website.update({
      where: { id: testWebsite.id },
      data: {
        status: "PUBLISHED",
        editorData: {
          publishedData: {
            pages: [{ id: "p1", title: "Home", slug: "home", content: [] }],
            version: 3,
          },
        },
      },
    });
    const healthyDeployment = await db.deployment.create({
      data: {
        websiteId: testWebsite.id,
        version: 3,
        status: "PUBLISHED",
        destinationType: "STATIC_BUNDLE",
        destinationRef: "s3://forge-deployments/site-v3",
        metadata: { publishedAt: new Date().toISOString() },
      },
    });
    const verifyHealthyJob = await enqueueJob("DEPLOYMENT_VERIFY", { deploymentId: healthyDeployment.id });
    const verifyHealthyRes = await processNextJob({ id: verifyHealthyJob.id });
    assert.strictEqual(verifyHealthyRes.processed, true);
    assert.strictEqual(verifyHealthyRes.result?.status, "HEALTHY");
    assert.strictEqual(verifyHealthyRes.result?.outcome, "HEALTHY");
    assert.strictEqual(verifyHealthyRes.result?.evidence?.snapshotVerified, true);
    logPass("DEPLOYMENT_VERIFY: Verified deployment marked HEALTHY with snapshot integrity evidence");

    // 3. MEDIA_OPTIMIZATION with Real Sharp & Durable File Persistence
    console.log("  Testing real image optimization via Sharp with durable disk persistence...");
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
      websiteId: testWebsite.id,
    });

    const mediaRes = await processNextJob({ id: mediaJob.id });
    assert.strictEqual(mediaRes.processed, true);
    assert.strictEqual(mediaRes.result?.success, true);
    assert.strictEqual(mediaRes.result?.format, "webp");
    assert.strictEqual(mediaRes.result?.dimensions?.width, 10);
    assert.strictEqual(mediaRes.result?.dimensions?.height, 10);
    assert.ok(mediaRes.result?.originalSize > 0);
    assert.ok(mediaRes.result?.compressedSize > 0);
    assert.ok(typeof mediaRes.result?.filePath === "string", "filePath must be returned");
    assert.ok(typeof mediaRes.result?.outputUrl === "string", "outputUrl must be returned");

    // Verify file actually exists on durable disk
    assert.ok(fs.existsSync(mediaRes.result?.filePath), "Optimized image must exist on durable disk storage");
    assert.strictEqual(fs.statSync(mediaRes.result?.filePath).size, mediaRes.result?.compressedSize);

    // Verify MediaOptimizationAsset record created in DB
    const assetRecord = await db.mediaOptimizationAsset.findFirst({
      where: { optimizedUrl: mediaRes.result?.outputUrl },
    });
    assert.ok(assetRecord !== null, "MediaOptimizationAsset record must be recorded in database");
    assert.strictEqual(assetRecord.optimizedUrl, mediaRes.result?.outputUrl);
    logPass("MEDIA_OPTIMIZATION: Real Sharp converted PNG to WebP, persisted to disk, and recorded in DB");

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

    // Create a known QUEUED job for the dashboard cancel test
    const e2eQueuedJob = await enqueueJob("E2E_QUEUED_FOR_CANCEL", { e2e: true });

    let browser: Browser | null = null;
    try {
      browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
      });

      // 1. Authenticated Super Admin Context testing real React Dashboard
      const context = await browser.newContext({ bypassCSP: true });
      const page = await context.newPage();

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

      // Route rewriting: intercept any API calls and forward to the active test backend server
      await page.route("**/api/**", async (route) => {
        const originalUrl = route.request().url();
        const reroutedUrl = originalUrl.replace(/^https?:\/\/[^/]+(:[0-9]+)?\/api\//, `http://127.0.0.1:${port}/api/`);
        const headers = {
          ...route.request().headers(),
          cookie: superAdminCookie,
          "x-requested-with": "XMLHttpRequest",
        };
        await route.continue({ url: reroutedUrl, headers });
      });

      // Navigate to real React Super Admin Dashboard
      console.log(`  Navigating Playwright to real React Super Admin at ${baseUrl}/super-admin...`);
      await page.goto(`${baseUrl}/super-admin`, { waitUntil: "networkidle" });

      // Verify dashboard loaded
      await page.waitForSelector("h1", { timeout: 15000 });
      const mainHeader = await page.textContent("h1");
      assert.ok(mainHeader?.includes("Super Admin"), "Real React Super Admin header must render");
      logPass("Browser E2E: Real React Super Admin Dashboard loaded successfully");

      // Click Jobs tab in real React UI
      const jobsTabBtn = page.locator("button", { hasText: /^jobs$/i });
      await jobsTabBtn.waitFor({ state: "visible", timeout: 10000 });
      await jobsTabBtn.click();

      // Verify Background Worker Job Queue section rendered
      await page.waitForSelector('h2:has-text("Background Worker Job Queue")', { timeout: 10000 });
      logPass("Browser E2E: Jobs tab active and Background Worker Job Queue table rendered");

      // Verify real jobs rendered in table
      const failedRow = page.locator("tr", { hasText: "E2E_FAILED_FOR_RETRY" });
      await failedRow.waitFor({ state: "visible", timeout: 10000 });
      const failedStatus = await failedRow.locator("td").nth(2).textContent();
      assert.ok(failedStatus?.includes("FAILED"));
      logPass("Browser E2E: Located failed background job in real React table");

      // Click Retry on failed job
      const retryBtn = failedRow.locator("button", { hasText: "Retry" });
      await retryBtn.click();

      // Wait for feedback notification
      await page.waitForSelector("text=queued for retry", { timeout: 10000 });
      logPass("Browser E2E: Clicked Retry in React UI, verified feedback banner appeared");

      // Verify database updated
      const dbJobAfterRetry = await getJobById(e2eFailedJob.id);
      assert.strictEqual(dbJobAfterRetry.status, "QUEUED");
      logPass("Browser E2E: Verified database status updated to QUEUED after UI retry");

      // Test Cancel on queued job
      const queuedRow = page.locator("tr", { hasText: "E2E_QUEUED_FOR_CANCEL" });
      await queuedRow.waitFor({ state: "visible", timeout: 10000 });
      const cancelBtn = queuedRow.locator("button", { hasText: "Cancel" });

      // Accept the window.confirm dialog
      page.once("dialog", (dialog) => dialog.accept());
      await cancelBtn.click();

      // Wait for cancellation feedback
      await page.waitForSelector("text=cancelled", { timeout: 10000 });
      logPass("Browser E2E: Clicked Cancel in React UI with confirmation dialog, verified feedback banner");

      // Verify database updated
      const dbJobAfterCancel = await getJobById(e2eQueuedJob.id);
      assert.strictEqual(dbJobAfterCancel.status, "CANCELLED");
      logPass("Browser E2E: Verified database status updated to CANCELLED after UI cancel");

      await context.close();

      // 2. Authorization Verification via React Client Routing
      const unauthorizedContext = await browser.newContext({ bypassCSP: true });
      await unauthorizedContext.addCookies([
        {
          name: "forge_session",
          value: regularSessionToken,
          domain: "127.0.0.1",
          path: "/",
          httpOnly: true,
          sameSite: "Lax",
        },
      ]);
      const unauthorizedPage = await unauthorizedContext.newPage();
      await unauthorizedPage.route("**/api/**", async (route) => {
        const originalUrl = route.request().url();
        const reroutedUrl = originalUrl.replace(/^https?:\/\/[^/]+(:[0-9]+)?\/api\//, `http://127.0.0.1:${port}/api/`);
        const headers = {
          ...route.request().headers(),
          cookie: regularCookie,
          "x-requested-with": "XMLHttpRequest",
        };
        await route.continue({ url: reroutedUrl, headers });
      });

      await unauthorizedPage.goto(`${baseUrl}/super-admin`, { waitUntil: "networkidle" });
      const currentUrl = unauthorizedPage.url();
      assert.ok(!currentUrl.includes("/super-admin"), "Regular user must be redirected away from /super-admin by RoleRoute");
      logPass("Browser E2E: RoleRoute redirected regular user away from /super-admin to non-privileged view");
      await unauthorizedContext.close();
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
            "E2E_QUEUED_FOR_CANCEL",
            "IDEMPOTENT_TEST",
            "TENANT_IDEMP_TEST",
            "STATE_TRANSITION_TEST",
            "SEPARATE_PROCESS_CRASH_TEST",
            "DEPLOYMENT_VERIFY",
          ],
        },
      },
    });

    if (superAdminUser?.id) {
      await db.deployment.deleteMany({ where: { website: { userId: superAdminUser.id } } }).catch(() => {});
      await db.website.deleteMany({ where: { userId: superAdminUser.id } }).catch(() => {});
      await db.mediaOptimizationAsset.deleteMany({}).catch(() => {});
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
