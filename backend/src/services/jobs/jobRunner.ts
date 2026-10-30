import crypto from "crypto";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/app-error.js";

export type JobType =
  | "SCHEDULED_PUBLISH"
  | "DEPLOYMENT_VERIFY"
  | "WEBHOOK_RETRY"
  | "MEDIA_OPTIMIZATION"
  | "WORDPRESS_PUBLISH"
  | "WORDPRESS_FORM_SYNC"
  | "WORDPRESS_SEO_SYNC"
  | "WORDPRESS_ANALYTICS_SYNC"
  | "WORDPRESS_MENU_SYNC"
  | "WORDPRESS_WEBHOOK_DELIVERY"
  | string;

export type JobStatus =
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface EnqueueJobOptions {
  runAt?: Date;
  maxAttempts?: number;
  idempotencyKey?: string;
  correlationId?: string;
  tenantId?: string;
  websiteId?: string;
}

export type JobHandler = (payload: any, job: any) => Promise<any>;

// Registered in-process handlers
const handlers: Map<string, JobHandler> = new Map();

// Default worker identifier for this process
export const DEFAULT_WORKER_ID =
  process.env.WORKER_ID || `worker_${process.pid}_${crypto.randomUUID().slice(0, 8)}`;

let workerInterval: NodeJS.Timeout | null = null;
let isShuttingDown = false;
let inFlightJobCount = 0;

export function registerJobHandler(type: string, handler: JobHandler) {
  handlers.set(type, handler);
}

export function unregisterJobHandler(type: string) {
  handlers.delete(type);
}

/**
 * Permanent error indicator to immediately fail without retries
 */
export class PermanentJobError extends Error {
  public readonly isPermanent = true;
  constructor(message: string) {
    super(message);
    this.name = "PermanentJobError";
  }
}

/**
 * Enqueue a job into PostgreSQL durable queue.
 * Strictly persists to database. Never falls back to memory.
 */
export async function enqueueJob(
  type: string,
  payload: any,
  options: EnqueueJobOptions = {}
) {
  if (!type || typeof type !== "string") {
    throw new AppError("Job type must be a valid non-empty string", 400, "INVALID_JOB_TYPE");
  }

  const runAt = options.runAt || new Date();
  const maxAttempts = options.maxAttempts ?? 3;
  const correlationId = options.correlationId || crypto.randomUUID();

  // 1. Idempotency Check: if idempotencyKey is provided, return existing job scoped to tenant
  if (options.idempotencyKey) {
    const existing = await (prisma as any).backgroundJob.findFirst({
      where: {
        idempotencyKey: options.idempotencyKey,
        tenantId: options.tenantId || null,
      },
    });
    if (existing) {
      return existing;
    }
  }

  // 2. Strict Durable Insertion into PostgreSQL
  try {
    const job = await (prisma as any).backgroundJob.create({
      data: {
        type,
        payload: payload || {},
        status: "QUEUED",
        attempts: 0,
        maxAttempts,
        runAt,
        idempotencyKey: options.idempotencyKey || null,
        correlationId,
        tenantId: options.tenantId || null,
        websiteId: options.websiteId || null,
        fencingToken: 0,
      },
    });
    return job;
  } catch (err: any) {
    // If concurrent insert raced on tenant-scoped idempotencyKey, return the existing record
    if (options.idempotencyKey && (err?.code === "P2002" || err?.message?.includes("idempotencyKey"))) {
      const existing = await (prisma as any).backgroundJob.findFirst({
        where: {
          idempotencyKey: options.idempotencyKey,
          tenantId: options.tenantId || null,
        },
      });
      if (existing) return existing;
    }

    // Fail explicitly: no in-memory fake durability
    throw new AppError(
      `Failed to enqueue durable background job into database: ${err?.message || err}`,
      503,
      "DURABLE_QUEUE_UNAVAILABLE"
    );
  }
}

export async function getJobById(jobId: string) {
  if (!jobId) return null;
  return await (prisma as any).backgroundJob.findUnique({
    where: { id: jobId },
  });
}

export async function listJobs(filters: {
  type?: string;
  status?: string;
  tenantId?: string;
  websiteId?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const limit = Math.min(Math.max(filters.limit || 50, 1), 200);
  const skip = filters.offset || 0;

  const where: any = {};
  if (filters.type) where.type = filters.type;
  if (filters.status) where.status = filters.status;
  if (filters.tenantId) where.tenantId = filters.tenantId;
  if (filters.websiteId) where.websiteId = filters.websiteId;

  return await (prisma as any).backgroundJob.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    skip,
  });
}

/**
 * Cancel an eligible job atomically.
 * Only jobs in QUEUED or RUNNING states can be cancelled.
 * Completed jobs are strictly rejected.
 */
export async function cancelJob(
  jobId: string,
  reason?: string
): Promise<{ success: boolean; job: any; alreadyCancelled?: boolean }> {
  if (!jobId) {
    throw new AppError("jobId is required to cancel job", 400, "INVALID_JOB_ID");
  }

  const existing = await getJobById(jobId);
  if (!existing) {
    throw new AppError(`Job ${jobId} not found`, 404, "JOB_NOT_FOUND");
  }

  if (existing.status === "CANCELLED") {
    return { success: true, job: existing, alreadyCancelled: true };
  }
  if (existing.status === "COMPLETED") {
    throw new AppError("Cannot cancel job that has already completed", 400, "JOB_ALREADY_COMPLETED");
  }

  const cancelReason = reason ? `Cancelled: ${reason}` : "Cancelled by operator";

  // Conditional atomic state update: strictly transitions from QUEUED or RUNNING to CANCELLED
  const rows: any[] = await prisma.$queryRawUnsafe(
    `
    UPDATE "background_jobs"
    SET
      "status" = 'CANCELLED',
      "lastError" = $1,
      "completedAt" = (NOW() AT TIME ZONE 'UTC'),
      "workerId" = NULL,
      "fencingToken" = "fencingToken" + 1,
      "updatedAt" = (NOW() AT TIME ZONE 'UTC')
    WHERE "id"::text = $2
      AND "status" IN ('QUEUED', 'RUNNING')
    RETURNING *;
    `,
    cancelReason,
    jobId
  );

  if (rows.length === 0) {
    const latest = await getJobById(jobId);
    if (latest?.status === "CANCELLED") {
      return { success: true, job: latest, alreadyCancelled: true };
    }
    if (latest?.status === "COMPLETED") {
      throw new AppError("Cannot cancel job that has already completed", 400, "JOB_ALREADY_COMPLETED");
    }
    throw new AppError(`Cannot cancel job ${jobId} in status: ${latest?.status}`, 400, "INVALID_STATE_TRANSITION");
  }

  return { success: true, job: rows[0] };
}

/**
 * Retry an existing failed or cancelled job.
 * RUNNING or COMPLETED jobs are strictly forbidden from being manually retried.
 * Performs a conditional atomic update to eliminate race conditions.
 */
export async function retryJob(jobId: string) {
  if (!jobId) {
    throw new AppError("jobId is required", 400, "INVALID_JOB_ID");
  }

  const existing = await getJobById(jobId);
  if (!existing) {
    throw new AppError(`Job ${jobId} not found`, 404, "JOB_NOT_FOUND");
  }

  if (existing.status === "RUNNING") {
    throw new AppError(
      "Cannot retry a RUNNING job. It is currently being processed by an active worker.",
      400,
      "INVALID_STATE_TRANSITION"
    );
  }
  if (existing.status === "COMPLETED") {
    throw new AppError(
      "Cannot retry a job that has already completed successfully",
      400,
      "INVALID_STATE_TRANSITION"
    );
  }

  // Conditional atomic update: strictly transitions from FAILED or CANCELLED to QUEUED
  const rows: any[] = await prisma.$queryRawUnsafe(
    `
    UPDATE "background_jobs"
    SET
      "status" = 'QUEUED',
      "attempts" = 0,
      "lastError" = NULL,
      "runAt" = (NOW() AT TIME ZONE 'UTC'),
      "completedAt" = NULL,
      "workerId" = NULL,
      "fencingToken" = "fencingToken" + 1,
      "updatedAt" = (NOW() AT TIME ZONE 'UTC')
    WHERE "id"::text = $1
      AND "status" IN ('FAILED', 'CANCELLED')
    RETURNING *;
    `,
    jobId
  );

  if (rows.length === 0) {
    const latest = await getJobById(jobId);
    if (latest?.status === "RUNNING") {
      throw new AppError(
        "Cannot retry a RUNNING job. It is currently being processed by an active worker.",
        400,
        "INVALID_STATE_TRANSITION"
      );
    }
    if (latest?.status === "COMPLETED") {
      throw new AppError("Cannot retry a job that has already completed successfully", 400, "INVALID_STATE_TRANSITION");
    }
    return latest;
  }

  return rows[0];
}

export async function purgeCompletedJobs(): Promise<{ purgedCount: number }> {
  const result = await (prisma as any).backgroundJob.deleteMany({
    where: {
      status: { in: ["COMPLETED", "CANCELLED"] },
    },
  });
  return { purgedCount: result.count || 0 };
}

/**
 * Atomically claim the next eligible job using PostgreSQL FOR UPDATE SKIP LOCKED
 */
export async function claimNextJob(
  workerId: string = DEFAULT_WORKER_ID,
  leaseDurationMs: number = 60000,
  filter?: { id?: string; type?: string }
): Promise<any | null> {
  const filterId = filter?.id || null;
  const filterType = filter?.type || null;

  const rows: any[] = await prisma.$queryRawUnsafe(
    `
    WITH candidate AS (
      SELECT id FROM "background_jobs"
      WHERE "status" = 'QUEUED'
        AND "runAt" <= (NOW() AT TIME ZONE 'UTC') + INTERVAL '1 second'
        AND ($1::text IS NULL OR "id"::text = $1)
        AND ($2::text IS NULL OR "type" = $2)
      ORDER BY "runAt" ASC, "createdAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "background_jobs"
    SET
      "status" = 'RUNNING',
      "startedAt" = (NOW() AT TIME ZONE 'UTC'),
      "claimedAt" = (NOW() AT TIME ZONE 'UTC'),
      "heartbeatAt" = (NOW() AT TIME ZONE 'UTC'),
      "leaseExpiresAt" = (NOW() AT TIME ZONE 'UTC') + ($3 || ' milliseconds')::interval,
      "workerId" = $4,
      "fencingToken" = "fencingToken" + 1,
      "updatedAt" = (NOW() AT TIME ZONE 'UTC')
    FROM candidate
    WHERE "background_jobs"."id" = candidate.id
    RETURNING "background_jobs".*;
    `,
    filterId,
    filterType,
    leaseDurationMs,
    workerId
  );

  return rows.length > 0 ? rows[0] : null;
}

/**
 * Renew worker lease & heartbeat during execution
 */
export async function renewJobLease(
  jobId: string,
  workerId: string,
  fencingToken: number,
  extensionMs: number = 60000
): Promise<boolean> {
  const rows: any[] = await prisma.$queryRawUnsafe(
    `
    UPDATE "background_jobs"
    SET
      "heartbeatAt" = (NOW() AT TIME ZONE 'UTC'),
      "leaseExpiresAt" = (NOW() AT TIME ZONE 'UTC') + ($1 || ' milliseconds')::interval,
      "updatedAt" = (NOW() AT TIME ZONE 'UTC')
    WHERE "id"::text = $2
      AND "workerId" = $3
      AND "fencingToken" = $4
      AND "status" = 'RUNNING'
    RETURNING "id";
    `,
    extensionMs,
    jobId,
    workerId,
    fencingToken
  );

  return rows.length > 0;
}

/**
 * Reclaim abandoned jobs whose worker lease has expired
 */
export async function reclaimAbandonedJobs(): Promise<number> {
  try {
    const rows: any[] = await prisma.$queryRawUnsafe(
      `
      UPDATE "background_jobs"
      SET
        "status" = CASE WHEN "attempts" + 1 >= "maxAttempts" THEN 'FAILED' ELSE 'QUEUED' END,
        "attempts" = "attempts" + 1,
        "lastError" = CASE 
          WHEN "attempts" + 1 >= "maxAttempts" THEN 'Crash recovery: worker lease expired and max attempts exceeded'
          ELSE 'Crash recovery: worker lease expired, requeued for retry'
        END,
        "completedAt" = CASE WHEN "attempts" + 1 >= "maxAttempts" THEN (NOW() AT TIME ZONE 'UTC') ELSE NULL END,
        "workerId" = NULL,
        "fencingToken" = "fencingToken" + 1,
        "runAt" = (NOW() AT TIME ZONE 'UTC'),
        "updatedAt" = (NOW() AT TIME ZONE 'UTC')
      WHERE "status" = 'RUNNING' AND "leaseExpiresAt" < (NOW() AT TIME ZONE 'UTC')
      RETURNING "id";
      `
    );
    return rows.length;
  } catch (err: any) {
    console.error("[JobWorker] Abandoned job recovery error:", err?.message || err);
    return 0;
  }
}

/**
 * Process next job from queue with atomic claiming and lease management.
 *
 * Invariant Note:
 * External side effects (e.g. webhooks, third-party provider mutations) require idempotency
 * and cooperative cancellation, because dispatched network side-effects cannot be rolled back
 * solely via database transactions if a worker crashes or loses its lease mid-flight.
 */
export async function processNextJob(
  filter?: { id?: string; type?: string },
  workerId: string = DEFAULT_WORKER_ID,
  leaseDurationMs: number = 60000
): Promise<{ processed: boolean; job?: any; result?: any; error?: any; staleOrStolen?: boolean }> {
  if (isShuttingDown && !filter?.id) {
    return { processed: false, error: "Worker is shutting down" };
  }

  // 1. Reclaim any expired abandoned jobs first
  await reclaimAbandonedJobs();

  // 2. Atomic claim using FOR UPDATE SKIP LOCKED
  const job = await claimNextJob(workerId, leaseDurationMs, filter);
  if (!job) {
    return { processed: false };
  }

  inFlightJobCount++;

  // 3. Setup periodic heartbeat / lease renewal during handler execution
  let leaseLost = false;
  const heartbeatIntervalMs = Math.max(1000, Math.floor(leaseDurationMs / 3));
  let renewalTimer: NodeJS.Timeout | null = setInterval(async () => {
    try {
      const renewed = await renewJobLease(job.id, workerId, job.fencingToken, leaseDurationMs);
      if (!renewed) {
        leaseLost = true;
        console.warn(`[JobWorker ${workerId}] Lost lease for job ${job.id} (fencingToken ${job.fencingToken})`);
      }
    } catch (heartbeatErr: any) {
      console.error(`[JobWorker ${workerId}] Heartbeat renewal error for job ${job.id}:`, heartbeatErr?.message || heartbeatErr);
    }
  }, heartbeatIntervalMs);

  const cleanupTimer = () => {
    if (renewalTimer) {
      clearInterval(renewalTimer);
      renewalTimer = null;
    }
  };

  const handler = handlers.get(job.type);
  if (!handler) {
    cleanupTimer();
    const errMsg = `No handler registered for job type: ${job.type}`;
    await markJobFailed(job, workerId, errMsg, true);
    inFlightJobCount = Math.max(0, inFlightJobCount - 1);
    return { processed: true, job, error: errMsg };
  }

  try {
    // 4. Verify job was not cancelled right before executing
    const current = await getJobById(job.id);
    if (current?.status === "CANCELLED") {
      cleanupTimer();
      inFlightJobCount = Math.max(0, inFlightJobCount - 1);
      return { processed: true, job: current, result: { cancelled: true } };
    }

    // 5. Execute handler
    const result = await handler(job.payload, job);

    // 6. Double check cancellation during execution
    const postExec = await getJobById(job.id);
    if (postExec?.status === "CANCELLED") {
      cleanupTimer();
      inFlightJobCount = Math.max(0, inFlightJobCount - 1);
      return { processed: true, job: postExec, result: { cancelled: true } };
    }

    cleanupTimer();

    // 7. Check if heartbeat reported lease loss during execution
    if (leaseLost) {
      inFlightJobCount = Math.max(0, inFlightJobCount - 1);
      return {
        processed: true,
        job,
        result,
        staleOrStolen: true,
        error: "Worker lost ownership lease during execution",
      };
    }

    // 8. Atomic complete with fencing token & worker verification
    const completed = await markJobCompleted(job, workerId);
    inFlightJobCount = Math.max(0, inFlightJobCount - 1);

    if (!completed) {
      // Lease expired or fencing token changed - worker lost ownership
      return {
        processed: true,
        job,
        result,
        staleOrStolen: true,
        error: "Worker lost ownership lease before completing job",
      };
    }

    return { processed: true, job, result };
  } catch (err: any) {
    cleanupTimer();
    const isPermanent =
      err instanceof PermanentJobError ||
      err?.isPermanent === true ||
      err?.statusCode === 400 ||
      err?.statusCode === 401 ||
      err?.statusCode === 403 ||
      err?.statusCode === 404 ||
      err?.message?.includes("SSRF") ||
      err?.message?.includes("not found");

    const errMsg = err?.message || String(err);
    await markJobFailed(job, workerId, errMsg, isPermanent);
    inFlightJobCount = Math.max(0, inFlightJobCount - 1);
    return { processed: true, job, error: errMsg };
  }
}

/**
 * Mark job completed with fencing protection
 */
async function markJobCompleted(job: any, workerId: string): Promise<boolean> {
  const rows: any[] = await prisma.$queryRawUnsafe(
    `
    UPDATE "background_jobs"
    SET
      "status" = 'COMPLETED',
      "completedAt" = (NOW() AT TIME ZONE 'UTC'),
      "updatedAt" = (NOW() AT TIME ZONE 'UTC')
    WHERE "id"::text = $1
      AND "workerId" = $2
      AND "fencingToken" = $3
      AND "status" = 'RUNNING'
    RETURNING "id";
    `,
    job.id,
    workerId,
    job.fencingToken
  );

  return rows.length > 0;
}

/**
 * Mark job failed with exponential backoff & jitter or terminal failure
 */
async function markJobFailed(
  job: any,
  workerId: string,
  errorMsg: string,
  isPermanent: boolean
): Promise<boolean> {
  const currentAttempts = job.attempts || 0;
  const nextAttempts = currentAttempts + 1;
  const maxAttempts = job.maxAttempts || 3;
  const isFinalFailure = isPermanent || nextAttempts >= maxAttempts;

  let nextRunAt = new Date();
  if (!isFinalFailure) {
    // Exponential backoff: base 1s * 2^attempts + jitter (0-500ms), capped at 5 minutes
    const baseBackoffMs = Math.min(300000, 1000 * Math.pow(2, nextAttempts));
    const jitterMs = Math.floor(Math.random() * 500);
    nextRunAt = new Date(Date.now() + baseBackoffMs + jitterMs);
  }

  const nextStatus = isFinalFailure ? "FAILED" : "QUEUED";

  const rows: any[] = await prisma.$queryRawUnsafe(
    `
    UPDATE "background_jobs"
    SET
      "status" = $1,
      "attempts" = $2,
      "lastError" = $3,
      "runAt" = $4,
      "completedAt" = $5,
      "workerId" = NULL,
      "updatedAt" = (NOW() AT TIME ZONE 'UTC')
    WHERE "id"::text = $6
      AND "workerId" = $7
      AND "fencingToken" = $8
      AND "status" = 'RUNNING'
    RETURNING "id";
    `,
    nextStatus,
    nextAttempts,
    errorMsg.slice(0, 2000),
    isFinalFailure ? job.runAt : nextRunAt,
    isFinalFailure ? new Date() : null,
    job.id,
    workerId,
    job.fencingToken
  );

  return rows.length > 0;
}

/**
 * Operational Metrics for Dashboards
 */
export async function getJobMetrics() {
  try {
    const counts = await (prisma as any).backgroundJob.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    const statusCounts: Record<string, number> = {
      QUEUED: 0,
      RUNNING: 0,
      COMPLETED: 0,
      FAILED: 0,
      CANCELLED: 0,
    };

    for (const c of counts) {
      statusCounts[c.status] = c._count.id;
    }

    // Active workers with heartbeat in last 2 minutes
    const activeWorkersRaw: any[] = await prisma.$queryRawUnsafe(`
      SELECT COUNT(DISTINCT "workerId") as active_workers
      FROM "background_jobs"
      WHERE "status" = 'RUNNING' AND "heartbeatAt" >= (NOW() AT TIME ZONE 'UTC') - INTERVAL '2 minutes';
    `);
    const activeWorkers = Number(activeWorkersRaw[0]?.active_workers || 0);

    // Oldest pending job
    const oldestPending = await (prisma as any).backgroundJob.findFirst({
      where: { status: "QUEUED" },
      orderBy: { runAt: "asc" },
      select: { runAt: true, createdAt: true },
    });

    const oldestAgeMs = oldestPending
      ? Math.max(0, Date.now() - new Date(oldestPending.runAt).getTime())
      : 0;

    // Stuck jobs (in RUNNING status with expired lease)
    const stuckJobsCount: any[] = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM "background_jobs"
      WHERE "status" = 'RUNNING' AND "leaseExpiresAt" < (NOW() AT TIME ZONE 'UTC');
    `);

    return {
      counts: statusCounts,
      total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
      activeWorkers,
      stuckJobsCount: Number(stuckJobsCount[0]?.count || 0),
      oldestPendingAgeMs: oldestAgeMs,
    };
  } catch (err: any) {
    return {
      counts: { QUEUED: 0, RUNNING: 0, COMPLETED: 0, FAILED: 0, CANCELLED: 0 },
      total: 0,
      activeWorkers: 0,
      stuckJobsCount: 0,
      oldestPendingAgeMs: 0,
      error: err?.message,
    };
  }
}

/**
 * Start worker loop
 */
export function startJobWorker(intervalMs: number = 3000, workerId: string = DEFAULT_WORKER_ID) {
  if (workerInterval) return;
  isShuttingDown = false;

  workerInterval = setInterval(async () => {
    try {
      await processNextJob(undefined, workerId);
    } catch {}
  }, intervalMs);
}

/**
 * Stop worker loop gracefully
 */
export async function stopJobWorker(graceTimeoutMs: number = 5000) {
  isShuttingDown = true;
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }

  // Wait for in-flight jobs to drain up to graceTimeoutMs
  const startWait = Date.now();
  while (inFlightJobCount > 0 && Date.now() - startWait < graceTimeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  isShuttingDown = false;
}

export function resetWorkerShutdown() {
  isShuttingDown = false;
}
