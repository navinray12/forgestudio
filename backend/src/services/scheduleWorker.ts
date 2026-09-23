import { prisma } from "../config/prisma.js";
import { initJobHandlers } from "./jobs/handlers.js";
import { startJobWorker } from "./jobs/jobRunner.js";

// Background worker
// Periodically checks editorData JSON for scheduled publication of custom code
// and processes background jobs (SCHEDULED_PUBLISH, DEPLOYMENT_VERIFY, WEBHOOK_RETRY, MEDIA_OPTIMIZATION)

const POLL_INTERVAL_MS = 60 * 1000; // Check every 60 seconds

async function processScheduledPublications() {
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
        console.error("[Scheduler] Error running background schedule task:", error);
    }
}

export function startScheduler() {
    console.log("[Scheduler] Scheduled Worker & Automation Daemon Initialized in Background.");
    // Initialize background job handlers and worker loop
    initJobHandlers();
    startJobWorker(5000);

    // Run at startup
    processScheduledPublications();
    // Re-run periodically
    setInterval(processScheduledPublications, POLL_INTERVAL_MS);
}
