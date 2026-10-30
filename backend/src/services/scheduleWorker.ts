import { prisma } from "../config/prisma.js";
import { initJobHandlers } from "./jobs/handlers.js";
import { startJobWorker, stopJobWorker } from "./jobs/jobRunner.js";
import { processSubscriptionExpirations } from "./subscription.service.js";
import { processExpiringSslCertificates } from "./domains/customDomain.service.js";
import { processAllScheduledBackups } from "./backups/websiteBackup.service.js";

// Background worker
// Periodically checks editorData JSON for scheduled publication of custom code,
// runs automated subscription expirations,
// scans for expiring SSL certificates and triggers non-destructive renewals,
// executes due automated website backups and retention pruning,
// and processes background jobs (SCHEDULED_PUBLISH, DEPLOYMENT_VERIFY, WEBHOOK_RETRY, MEDIA_OPTIMIZATION)

const POLL_INTERVAL_MS = 60 * 1000; // Check every 60 seconds for publications
const EXPIRY_INTERVAL_MS = 60 * 1000; // Check every 60 seconds for expired subscriptions
const SSL_RENEWAL_INTERVAL_MS = 60 * 60 * 1000; // Check every 60 minutes for SSL renewals
const BACKUP_SCHEDULE_INTERVAL_MS = 60 * 1000; // Check every 60 seconds for scheduled backups

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

export async function processScheduledPublications() {
    if (isProcessingPublications) {
        return;
    }
    isProcessingPublications = true;
    try {
        const customCodeSnippetModel = (prisma as any)?.customCodeSnippet;
        if (!customCodeSnippetModel) {
            return;
        }

        const now = new Date();

        const pendingSnippets = await customCodeSnippetModel.findMany({
            where: {
                status: 'SCHEDULED',
                scheduledFor: { lte: now }
            }
        });

        if (pendingSnippets.length === 0) return;

        for (const snippet of pendingSnippets) {
            await customCodeSnippetModel.update({
                where: { id: snippet.id },
                data: {
                    status: 'PUBLISHED'
                }
            });
            console.log(`[Scheduler] Executed pending snippet: ${snippet.title} (${snippet.id}) into PUBLISHED mode.`);
        }
    } catch (error: any) {
        if (error?.code === 'P2021' || error?.message?.includes("does not exist")) {
            console.log("[Scheduler] Table 'custom_code_snippets' does not exist in database yet. Skipping scheduled publication check.");
            return;
        }
        console.error("[Scheduler] Error running background schedule task:", error?.message || "Unknown error");
    } finally {
        isProcessingPublications = false;
    }
}

export async function runSubscriptionExpirationCheck() {
    if (isProcessingExpirations) {
        return;
    }
    isProcessingExpirations = true;
    try {
        const result = await processSubscriptionExpirations();
        if (result && result.processedCount > 0) {
            console.log(`[Scheduler] Processed ${result.processedCount} expired subscriptions.`);
        }
        return result;
    } catch (error: any) {
        console.error("[Scheduler] Error running subscription expiration check:", error?.message || "Unknown error");
    } finally {
        isProcessingExpirations = false;
    }
}

export async function runSslCertificateRenewalCheck(windowDays: number = 30) {
    if (isProcessingSslRenewals) {
        return;
    }
    isProcessingSslRenewals = true;

    // Distributed locking: avoid overlapping runs across multi-instance deployments
    let lockAcquired = false;
    try {
        try {
            const lockResult: any = await prisma.$queryRaw`
                SELECT pg_try_advisory_lock(hashtext('fs_ssl_renewal_worker')) as acquired;
            `;
            lockAcquired = lockResult?.[0]?.acquired === true;
        } catch {
            // Fallback for in-memory / non-Postgres test environments
            lockAcquired = true;
        }

        if (!lockAcquired) {
            return;
        }

        const result = await processExpiringSslCertificates(windowDays);
        if (result && (result.renewed > 0 || result.failed > 0 || result.expired > 0)) {
            console.log(
                `[Scheduler] SSL Check completed: ${result.processed} processed, ${result.renewed} renewed, ${result.failed} failed, ${result.expired} expired.`
            );
        }
        return result;
    } catch (error: any) {
        console.error("[Scheduler] Error running SSL certificate renewal check:", error?.message || "Unknown error");
    } finally {
        if (lockAcquired) {
            try {
                await prisma.$queryRaw`SELECT pg_advisory_unlock(hashtext('fs_ssl_renewal_worker'));`;
            } catch {
                // Ignore unlock errors during teardown
            }
        }
        isProcessingSslRenewals = false;
    }
}

export async function runScheduledBackupCheck(now: Date = new Date()) {
    if (isProcessingScheduledBackups) {
        return;
    }
    isProcessingScheduledBackups = true;

    // Distributed locking: avoid overlapping runs across multi-instance deployments
    let lockAcquired = false;
    try {
        try {
            const lockResult: any = await prisma.$queryRaw`
                SELECT pg_try_advisory_lock(hashtext('fs_scheduled_backup_worker')) as acquired;
            `;
            lockAcquired = lockResult?.[0]?.acquired === true;
        } catch {
            // Fallback for SQLite / in-memory / non-Postgres test environments
            lockAcquired = true;
        }

        if (!lockAcquired) {
            return;
        }

        const result = await processAllScheduledBackups(now);
        if (result && (result.created > 0 || result.pruned > 0 || result.failed > 0)) {
            console.log(
                `[Scheduler] Scheduled Backup completed: ${result.processed} inspected, ${result.created} created, ${result.pruned} pruned, ${result.failed} failed.`
            );
        }
        return result;
    } catch (error: any) {
        console.error("[Scheduler] Error running scheduled backup check:", error?.message || "Unknown error");
    } finally {
        if (lockAcquired) {
            try {
                await prisma.$queryRaw`SELECT pg_advisory_unlock(hashtext('fs_scheduled_backup_worker'));`;
            } catch {
                // Ignore unlock errors during teardown
            }
        }
        isProcessingScheduledBackups = false;
    }
}

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
    console.log("[Scheduler] Scheduled Worker & Automation Daemon Initialized in Background.");

    const pubInterval = options?.pollIntervalMs || POLL_INTERVAL_MS;
    const expInterval = options?.expiryIntervalMs || EXPIRY_INTERVAL_MS;
    const sslInterval = options?.sslRenewalIntervalMs || SSL_RENEWAL_INTERVAL_MS;
    const bkpInterval = options?.backupIntervalMs || BACKUP_SCHEDULE_INTERVAL_MS;

    // Initialize background job handlers and worker loop
    initJobHandlers();
    startJobWorker(5000);

    // Run at startup
    processScheduledPublications();
    runSubscriptionExpirationCheck();
    runSslCertificateRenewalCheck();
    runScheduledBackupCheck();

    // Re-run periodically
    publicationsInterval = setInterval(processScheduledPublications, pubInterval);
    expirationsInterval = setInterval(runSubscriptionExpirationCheck, expInterval);
    sslRenewalInterval = setInterval(runSslCertificateRenewalCheck, sslInterval);
    backupScheduleInterval = setInterval(runScheduledBackupCheck, bkpInterval);
}

export function stopScheduler() {
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
    stopJobWorker();
    schedulerStarted = false;
    console.log("[Scheduler] Scheduled Worker & Automation Daemon Stopped.");
}
