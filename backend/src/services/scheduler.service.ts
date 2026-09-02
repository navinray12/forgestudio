import { prisma } from "../config/prisma.js";
import { publishWebsiteService } from "./deployment.service.js";

let schedulerInterval: NodeJS.Timeout | null = null;
let isJobRunning = false;

export function startScheduler() {
    if (schedulerInterval) return;

    // Run every 30 seconds
    schedulerInterval = setInterval(async () => {
        if (isJobRunning) return;
        isJobRunning = true;

        try {
            await processScheduledPublishing();
        } catch (e) {
            console.error("Scheduler Error:", e);
        } finally {
            isJobRunning = false;
        }
    }, 30_000);

    console.log("📅 F-115 Scheduled Code Publishing Service Started.");
}

export function stopScheduler() {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
    }
}

const db = prisma as any;

export async function processScheduledPublishing() {
    let websites: any[] = [];
    if (db?.website?.findMany) {
        websites = await db.website.findMany({
            select: { id: true, userId: true, editorData: true },
        });
    } else {
        websites = await prisma.$queryRaw`
            SELECT id, "userId", "editorData"
            FROM websites
        `;
    }

    const now = new Date();

    for (const website of websites) {
        let editorData: any = {};

        // editorData is a Prisma Json field — may come back as object or string depending on adapter serialization
        if (typeof website.editorData === "string") {
            try {
                editorData = JSON.parse(website.editorData as string);
            } catch {
                continue;
            }
        } else {
            editorData = website.editorData ?? {};
        }

        const globalSettings = editorData?.globalSettings;
        if (!globalSettings) continue;

        const customCodeList: any[] = globalSettings.customCodeList ?? [];
        const customCodeRevisions: any[] = globalSettings.customCodeRevisions ?? [];

        if (customCodeList.length === 0) continue;

        let needsPublish = false;
        let isChanged = false;

        for (let i = 0; i < customCodeList.length; i++) {
            const snip = customCodeList[i];

            if (snip.scheduleStatus === "scheduled" && snip.scheduledPublishAt) {
                const scheduledTime = new Date(snip.scheduledPublishAt);

                // F-115: If the scheduled time is now or in the past, publish
                if (scheduledTime <= now) {
                    const snippetRevs = customCodeRevisions.filter(
                        (r: any) => r.snippetId === snip.id
                    );

                    if (snippetRevs.length > 0) {
                        const latestRev = snippetRevs.reduce(
                            (max: any, r: any) => (r.version > max.version ? r : max),
                            snippetRevs[0]
                        );

                        snip.publishedRevisionId = latestRev.id;
                        snip.scheduleStatus = "published";
                        delete snip.scheduledPublishAt;

                        console.log(
                            `[F-115] Auto-publishing snippet "${snip.name}" on website ${website.id} at ${now.toISOString()}`
                        );
                        needsPublish = true;
                        isChanged = true;
                    } else {
                        // No revision found — mark failed
                        snip.scheduleStatus = "failed";
                        isChanged = true;
                    }
                }
            }
        }

        if (!isChanged) continue;

        // Persist the updated editorData back
        if (db?.website?.update) {
            await db.website.update({
                where: { id: website.id },
                data: { editorData },
            });
        } else {
            const jsonStr = JSON.stringify(editorData);
            await prisma.$queryRaw`
                UPDATE websites
                SET "editorData" = ${jsonStr}::jsonb
                WHERE id = ${website.id}::uuid
            `;
        }

        // F-115: Trigger the deployment pipeline if something was actually published
        if (needsPublish) {
            try {
                await publishWebsiteService(website.id, website.userId);
                console.log(`[F-115] Deployment finalized for website ${website.id}.`);
            } catch (err) {
                // F-117: Linter/validator blocked the scheduled deployment — revert to "failed"
                console.error(
                    `[F-115/F-117] Scheduled deployment blocked for website ${website.id}:`,
                    err
                );

                for (let i = 0; i < customCodeList.length; i++) {
                    if (
                        customCodeList[i].scheduleStatus === "published" &&
                        !customCodeList[i].scheduledPublishAt
                    ) {
                        customCodeList[i].scheduleStatus = "failed";
                    }
                }

                if (db?.website?.update) {
                    await db.website.update({
                        where: { id: website.id },
                        data: { editorData },
                    });
                } else {
                    const jsonStr = JSON.stringify(editorData);
                    await prisma.$queryRaw`
                        UPDATE websites
                        SET "editorData" = ${jsonStr}::jsonb
                        WHERE id = ${website.id}::uuid
                    `;
                }
            }
        }
    }
}
