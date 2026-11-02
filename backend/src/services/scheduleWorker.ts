import { prisma } from "../config/prisma.js";
import { initJobHandlers } from "./jobs/handlers.js";
import { startJobWorker, stopJobWorker } from "./jobs/jobRunner.js";
import { processSubscriptionExpirations } from "./subscription.service.js";
import { processExpiringSslCertificates } from "./domains/customDomain.service.js";
import { processAllScheduledBackups } from "./backups/websiteBackup.service.js";

// Background scheduler daemon
// Periodically executes:
// 1. Scheduled custom code publications (with atomic CAS updates)
// 2. Automated subscription expirations (with distributed advisory locking)
// 3. Expiring SSL certificate renewals (with distributed advisory locking)
// 4. Automated website backups & retention pruning (with distributed advisory locking)
// And processes durable background jobs (SCHEDULED_PUBLISH, DEPLOYMENT_VERIFY, WEBHOOK_RETRY, MEDIA_OPTIMIZATION, etc.)

const DEFAULT_POLL_INTERVAL_MS = 30 * 1000; // Check every 30 seconds for custom code
const DEFAULT_EXPIRY_INTERVAL_MS = 60 * 1000; // Check every 60 seconds for expired subscriptions
const DEFAULT_SSL_RENEWAL_INTERVAL_MS = 60 * 60 * 1000; // Check every 60 minutes for SSL renewals
const DEFAULT_BACKUP_SCHEDULE_INTERVAL_MS = 60 * 1000; // Check every 60 seconds for scheduled backups

let isProcessingPublications = false;
let isProcessingExpirations = false;
let isProcessingSslRenewals = false;
let isProcessingScheduledBackups = false;
let schedulerStarted = false;

let publicationsInterval: NodeJS.Timeout | null = null;
let expirationsInterval: NodeJS.Timeout | null = null;
let sslRenewalInterval: NodeJS.Timeout | null = null;
let backupScheduleInterval: NodeJS.Timeout | null = null;

export function isSchedulerRunning(): boolean {
  return schedulerStarted;
}

/**
 * Executes a function protected by a distributed PostgreSQL advisory lock.
 * If another worker instance holds the lock, this instance safely skips this cycle without blocking.
 */
async function withAdvisoryLock<T>(
  lockName: string,
  fn: () => Promise<T>
): Promise<T | null> {
  let lockAcquired = false;
  try {
    try {
      const lockResult: any = await prisma.$queryRaw`
        SELECT pg_try_advisory_lock(hashtext(${lockName})) as acquired;
      `;
      lockAcquired = lockResult?.[0]?.acquired === true;
    } catch {
      // Fallback for in-memory, mock, or SQLite test environments
      lockAcquired = true;
    }

    if (!lockAcquired) {
      return null;
    }

    return await fn();
  } finally {
    if (lockAcquired) {
      try {
        await prisma.$queryRaw`SELECT pg_advisory_unlock(hashtext(${lockName}));`;
      } catch {
        // Ignore unlock errors during teardown
      }
    }
  }
}

/**
 * Process scheduled custom code snippets.
 * Atomic conditional update ensures multiple scheduler instances don't duplicate publication.
 */
export async function processScheduledCustomCode() {
  if (isProcessingPublications) return;
  isProcessingPublications = true;

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
    console.error("[Scheduler] Error processing scheduled custom code:", error?.message || error);
  } finally {
    isProcessingPublications = false;
  }
}

// Backward-compatible alias for existing tests
export const processScheduledPublications = processScheduledCustomCode;

/**
 * Process subscription expirations with distributed advisory locking.
 */
export async function runSubscriptionExpirationCheck() {
  if (isProcessingExpirations) return;
  isProcessingExpirations = true;

  try {
    return await withAdvisoryLock("fs_subscription_expiration_worker", async () => {
      const result = await processSubscriptionExpirations();
      if (result && result.processedCount > 0) {
        console.log(`[Scheduler] Processed ${result.processedCount} expired subscriptions.`);
      }
      return result;
    });
  } catch (error: any) {
    console.error("[Scheduler] Error running subscription expiration check:", error?.message || error);
  } finally {
    isProcessingExpirations = false;
  }
}

/**
 * Process expiring SSL certificates with distributed advisory locking.
 */
export async function runSslCertificateRenewalCheck(windowDays: number = 30) {
  if (isProcessingSslRenewals) return;
  isProcessingSslRenewals = true;

  try {
    return await withAdvisoryLock("fs_ssl_renewal_worker", async () => {
      const result = await processExpiringSslCertificates(windowDays);
      if (result && (result.renewed > 0 || result.failed > 0 || result.expired > 0)) {
        console.log(
          `[Scheduler] SSL Check completed: ${result.processed} processed, ${result.renewed} renewed, ${result.failed} failed, ${result.expired} expired.`
        );
      }
      return result;
    });
  } catch (error: any) {
    console.error("[Scheduler] Error running SSL certificate renewal check:", error?.message || error);
  } finally {
    isProcessingSslRenewals = false;
  }
}

/**
 * Process scheduled backups with distributed advisory locking.
 */
export async function runScheduledBackupCheck(now: Date = new Date()) {
  if (isProcessingScheduledBackups) return;
  isProcessingScheduledBackups = true;

  try {
    return await withAdvisoryLock("fs_scheduled_backup_worker", async () => {
      const result = await processAllScheduledBackups(now);
      if (result && (result.created > 0 || result.pruned > 0 || result.failed > 0)) {
        console.log(
          `[Scheduler] Scheduled Backup completed: ${result.processed} inspected, ${result.created} created, ${result.pruned} pruned, ${result.failed} failed.`
        );
      }
      return result;
    });
  } catch (error: any) {
    console.error("[Scheduler] Error running scheduled backup check:", error?.message || error);
  } finally {
    isProcessingScheduledBackups = false;
  }
}

/**
 * Main scheduler cycle
 */
export async function runSchedulerCycle() {
  await Promise.allSettled([
    processScheduledCustomCode(),
    runSubscriptionExpirationCheck(),
    runSslCertificateRenewalCheck(),
    runScheduledBackupCheck(),
  ]);
}

/**
 * Start the background scheduler and job worker daemon
 */
export function startScheduler(options?: {
  pollIntervalMs?: number;
  expiryIntervalMs?: number;
  sslRenewalIntervalMs?: number;
  backupIntervalMs?: number;
}) {
  if (schedulerStarted) {
    console.log("[Scheduler] Scheduled Worker & Automation Daemon is already running. Skipping duplicate startup.");
    return;
  }
  schedulerStarted = true;

  const pubInterval = options?.pollIntervalMs || DEFAULT_POLL_INTERVAL_MS;
  const expInterval = options?.expiryIntervalMs || DEFAULT_EXPIRY_INTERVAL_MS;
  const sslInterval = options?.sslRenewalIntervalMs || DEFAULT_SSL_RENEWAL_INTERVAL_MS;
  const bkpInterval = options?.backupIntervalMs || DEFAULT_BACKUP_SCHEDULE_INTERVAL_MS;

  console.log(`[Scheduler] Starting Background Scheduler Daemon (code: ${pubInterval}ms, sub: ${expInterval}ms, ssl: ${sslInterval}ms, bkp: ${bkpInterval}ms)...`);

  // 1. Initialize registered job handlers & worker loop
  initJobHandlers();
  startJobWorker(3000);

  // 2. Run scheduler cycles immediately at startup
  runSchedulerCycle().catch(() => {});

  // 3. Setup individual recurring intervals for each automated task
  publicationsInterval = setInterval(() => {
    processScheduledCustomCode().catch((err) => {
      console.error("[Scheduler] Scheduled custom code cycle error:", err);
    });
  }, pubInterval);

  expirationsInterval = setInterval(() => {
    runSubscriptionExpirationCheck().catch((err) => {
      console.error("[Scheduler] Subscription expiration cycle error:", err);
    });
  }, expInterval);

  sslRenewalInterval = setInterval(() => {
    runSslCertificateRenewalCheck().catch((err) => {
      console.error("[Scheduler] SSL renewal cycle error:", err);
    });
  }, sslInterval);

  backupScheduleInterval = setInterval(() => {
    runScheduledBackupCheck().catch((err) => {
      console.error("[Scheduler] Scheduled backup cycle error:", err);
    });
  }, bkpInterval);
}

/**
 * Stop scheduler gracefully, clearing all intervals and draining in-flight jobs.
 */
export async function stopScheduler(graceTimeoutMs: number = 5000) {
  if (!schedulerStarted) return;
  schedulerStarted = false;

  console.log("[Scheduler] Stopping Background Scheduler Daemon...");

  if (publicationsInterval) {
    clearInterval(publicationsInterval);
    publicationsInterval = null;
  }
  if (expirationsInterval) {
    clearInterval(expirationsInterval);
    expirationsInterval = null;
  }
  if (sslRenewalInterval) {
    clearInterval(sslRenewalInterval);
    sslRenewalInterval = null;
  }
  if (backupScheduleInterval) {
    clearInterval(backupScheduleInterval);
    backupScheduleInterval = null;
  }

  // Stop job worker loop and drain in-flight jobs
  await stopJobWorker(graceTimeoutMs);
  console.log("[Scheduler] Scheduled Worker & Automation Daemon Stopped.");
}
