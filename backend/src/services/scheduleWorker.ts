import { prisma } from "../config/prisma.js";

// F-115 background worker
// Periodically checks editorData JSON for scheduled publication of custom code

const POLL_INTERVAL_MS = 60 * 1000; // Check every 60 seconds

async function processScheduledPublications() {
    try {
        const now = new Date();

        const pendingSnippets = await prisma.customCodeSnippet.findMany({
            where: {
                status: 'SCHEDULED',
                scheduledFor: { lte: now }
            }
        });

        if (pendingSnippets.length === 0) return;

        for (const snippet of pendingSnippets) {
            await prisma.customCodeSnippet.update({
                where: { id: snippet.id },
                data: {
                    status: 'PUBLISHED'
                }
            });
            console.log(`[Scheduler] F-115 Executed pending snippet: ${snippet.title} (${snippet.id}) into PUBLISHED mode.`);
        }
    } catch (error) {
        console.error("[Scheduler] Error running background schedule task:", error);
    }
}

export function startScheduler() {
    console.log("[Scheduler] F-115 Scheduled Worker Initialized in Background.");
    // Run at startup
    processScheduledPublications();
    // Re-run periodically
    setInterval(processScheduledPublications, POLL_INTERVAL_MS);
}
