import { prisma } from "../config/prisma.js";

// F-115 background worker
// Periodically checks editorData JSON for scheduled publication of custom code

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
            },
            select: {
                id: true,
                title: true,
                status: true,
                scheduledFor: true
            }
        });

        if (!pendingSnippets || pendingSnippets.length === 0) return;

        for (const snippet of pendingSnippets) {
            await customCodeSnippetModel.update({
                where: { id: snippet.id },
                data: {
                    status: 'PUBLISHED'
                }
            });
            console.log(`[Scheduler] F-115 Executed pending snippet: ${snippet.title || snippet.id} (${snippet.id}) into PUBLISHED mode.`);
        }
    } catch (error: any) {
        console.error("[Scheduler] Error running background schedule task:", error?.message || error);
    }
}

export function startScheduler() {
    console.log("[Scheduler] F-115 Scheduled Worker Initialized in Background.");
    // Run at startup
    processScheduledPublications();
    // Re-run periodically
    setInterval(processScheduledPublications, POLL_INTERVAL_MS);
}
