import { prisma } from "../../config/prisma.js";

export type JobType =
  | "SCHEDULED_PUBLISH"
  | "DEPLOYMENT_VERIFY"
  | "WEBHOOK_RETRY"
  | "MEDIA_OPTIMIZATION"
  | string;

export type JobStatus =
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type JobHandler = (payload: any, job: any) => Promise<any>;

// Registered in-process handlers
const handlers: Map<string, JobHandler> = new Map();

// In-memory fallback if database table is initializing
const memoryQueue: any[] = [];

let workerInterval: any = null;

export function registerJobHandler(type: string, handler: JobHandler) {
  handlers.set(type, handler);
}

export function unregisterJobHandler(type: string) {
  handlers.delete(type);
}

export async function enqueueJob(
  type: string,
  payload: any,
  options: { runAt?: Date; maxAttempts?: number } = {}
) {
  const runAt = options.runAt || new Date();
  const maxAttempts = options.maxAttempts || 3;

  try {
    const job = await (prisma as any).backgroundJob.create({
      data: {
        type,
        payload: payload || {},
        status: "QUEUED",
        attempts: 0,
        maxAttempts,
        runAt,
      },
    });
    return job;
  } catch (err) {
    // Fallback to in-memory queue
    const memJob = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      payload: payload || {},
      status: "QUEUED",
      attempts: 0,
      maxAttempts,
      lastError: null,
      runAt,
      startedAt: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryQueue.push(memJob);
    return memJob;
  }
}

export async function getJobById(jobId: string) {
  try {
    const job = await (prisma as any).backgroundJob.findUnique({
      where: { id: jobId },
    });
    if (job) return job;
  } catch {}

  return memoryQueue.find((j) => j.id === jobId) || null;
}

export async function listJobs(filters: { type?: string; status?: string; limit?: number } = {}) {
  const limit = filters.limit || 50;

  try {
    const where: any = {};
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;

    const dbJobs = await (prisma as any).backgroundJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    if (dbJobs.length > 0) return dbJobs;
  } catch {}

  let memFiltered = memoryQueue;
  if (filters.type) memFiltered = memFiltered.filter((j) => j.type === filters.type);
  if (filters.status) memFiltered = memFiltered.filter((j) => j.status === filters.status);
  return memFiltered.slice(0, limit);
}

export async function processNextJob(): Promise<{ processed: boolean; job?: any; result?: any; error?: any }> {
  const now = new Date();

  // Try DB first
  let job: any = null;
  try {
    const candidate = await (prisma as any).backgroundJob.findFirst({
      where: {
        status: "QUEUED",
        runAt: { lte: now },
      },
      orderBy: { runAt: "asc" },
    });

    if (candidate) {
      // Mark RUNNING
      job = await (prisma as any).backgroundJob.update({
        where: { id: candidate.id },
        data: {
          status: "RUNNING",
          startedAt: new Date(),
        },
      });
    }
  } catch {}

  // Try Memory Queue fallback if no DB job
  if (!job) {
    const memIdx = memoryQueue.findIndex(
      (j) => j.status === "QUEUED" && new Date(j.runAt).getTime() <= now.getTime()
    );
    if (memIdx >= 0) {
      job = memoryQueue[memIdx];
      job.status = "RUNNING";
      job.startedAt = new Date();
    }
  }

  if (!job) {
    return { processed: false };
  }

  const handler = handlers.get(job.type);
  if (!handler) {
    const errMsg = `No handler registered for job type: ${job.type}`;
    await markJobFailed(job, errMsg);
    return { processed: true, job, error: errMsg };
  }

  try {
    const result = await handler(job.payload, job);
    await markJobCompleted(job, result);
    return { processed: true, job, result };
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    await markJobFailed(job, errMsg);
    return { processed: true, job, error: errMsg };
  }
}

async function markJobCompleted(job: any, _result?: any) {
  const now = new Date();
  try {
    await (prisma as any).backgroundJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        completedAt: now,
        updatedAt: now,
      },
    });
  } catch {
    job.status = "COMPLETED";
    job.completedAt = now;
    job.updatedAt = now;
  }
}

async function markJobFailed(job: any, errorMsg: string) {
  const now = new Date();
  const nextAttempts = (job.attempts || 0) + 1;
  const isFinalFailure = nextAttempts >= (job.maxAttempts || 3);

  // Exponential backoff: 2^attempts seconds
  const backoffMs = Math.pow(2, nextAttempts) * 1000;
  const nextRunAt = new Date(Date.now() + backoffMs);

  const nextStatus = isFinalFailure ? "FAILED" : "QUEUED";

  try {
    await (prisma as any).backgroundJob.update({
      where: { id: job.id },
      data: {
        status: nextStatus,
        attempts: nextAttempts,
        lastError: errorMsg.slice(0, 2000),
        runAt: isFinalFailure ? job.runAt : nextRunAt,
        completedAt: isFinalFailure ? now : null,
        updatedAt: now,
      },
    });
  } catch {
    job.status = nextStatus;
    job.attempts = nextAttempts;
    job.lastError = errorMsg.slice(0, 2000);
    job.runAt = isFinalFailure ? job.runAt : nextRunAt;
    job.completedAt = isFinalFailure ? now : null;
    job.updatedAt = now;
  }
}

export function startJobWorker(intervalMs: number = 2000) {
  if (workerInterval) return;

  workerInterval = setInterval(async () => {
    try {
      await processNextJob();
    } catch {}
  }, intervalMs);
}

export function stopJobWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }
}
