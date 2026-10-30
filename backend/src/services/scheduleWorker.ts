import { prisma } from "../config/prisma.js";
import { initJobHandlers } from "./jobs/handlers.js";
import { startJobWorker, stopJobWorker, enqueueJob } from "./jobs/jobRunner.js";

const DEFAULT_POLL_INTERVAL_MS = 30 * 1000; // Check every 30 seconds

let schedulerInterval: NodeJS.Timeout | null = null;
let isRunning = false;

/**
 * Process scheduled custom code snippets
 * Atomic update ensures multiple scheduler instances don't duplicate publication
 */
async function processScheduledCustomCode() {
  try {
    const customCodeSnippetModel = (prisma as any)?.customCodeSnippet;
    if (!customCodeSnippetModel) return;

    const now = new Date();

    const pendingSnippets = await customCodeSnippetModel.findMany({
      where: {
        status: "SCHEDULED",
        scheduledFor: { lte: now },
      },
      take: 20,
    });

    if (pendingSnippets.length === 0) return;

    for (const snippet of pendingSnippets) {
      // Atomic conditional update prevents race conditions across instances
      const updated = await customCodeSnippetModel.updateMany({
        where: {
          id: snippet.id,
          status: "SCHEDULED",
        },
        data: {
          status: "PUBLISHED",
          updatedAt: now,
        },
      });

      if (updated.count > 0) {
        console.log(`[Scheduler] Published scheduled custom code snippet: ${snippet.title} (${snippet.id})`);
      }
    }
  } catch (error: any) {
    if (error?.code === "P2021" || error?.message?.includes("does not exist")) {
      return;
    }
    console.error("[Scheduler] Error processing scheduled custom code:", error);
  }
}

/**
 * Main scheduler cycle
 */
export async function runSchedulerCycle() {
  await Promise.allSettled([
    processScheduledCustomCode(),
  ]);
}

/**
 * Start the background scheduler and job worker daemon
 */
export function startScheduler(pollIntervalMs: number = DEFAULT_POLL_INTERVAL_MS) {
  if (isRunning) return;
  isRunning = true;

  console.log(`[Scheduler] Starting Background Scheduler Daemon (polling every ${pollIntervalMs}ms)...`);

  // 1. Initialize registered handlers & worker loop
  initJobHandlers();
  startJobWorker(3000);

  // 2. Run scheduler cycle immediately
  runSchedulerCycle().catch(() => {});

  // 3. Setup recurring scheduler timer
  schedulerInterval = setInterval(() => {
    runSchedulerCycle().catch((err) => {
      console.error("[Scheduler] Recurring cycle error:", err);
    });
  }, pollIntervalMs);
}

/**
 * Stop scheduler gracefully
 */
export async function stopScheduler(graceTimeoutMs: number = 5000) {
  if (!isRunning) return;
  isRunning = false;

  console.log("[Scheduler] Stopping Background Scheduler Daemon...");

  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }

  // Stop job worker loop and drain in-flight jobs
  await stopJobWorker(graceTimeoutMs);
}
