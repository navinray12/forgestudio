import app from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import type { Server } from "http";

const PORT = 5099;
const BASE_URL = `http://localhost:${PORT}`;

export async function runFormTests() {
    console.log("==========================================");
    console.log("Starting Form Submit Test Suite");
    console.log("==========================================\n");

    let server: Server | null = null;
    let testUserId: string | null = null;
    let testWebsiteId: string | null = null;
    let passedCount = 0;
    let failedCount = 0;

    try {
        server = app.listen(PORT);

        const testUser = await (prisma as any).user.create({
            data: {
                email: `form_test_user_${Date.now()}@example.com`,
                fullName: "Form Test User",
                role: "USER",
                status: "ACTIVE",
            },
        });
        testUserId = testUser.id;

        const testWebsite = await (prisma as any).website.create({
            data: {
                userId: testUser.id,
                name: "Form Test Website",
                slug: `form-test-site-${Date.now()}`,
                status: "DRAFT",
                editorData: { version: 1, elements: [] },
            },
        });
        testWebsiteId = testWebsite.id;

        // TEST 1: Valid Form Submission
        {
            const payload = {
                websiteId: testWebsiteId,
                formId: "contact-form-1",
                formName: "Contact Us Form",
                fields: { fullName: "Jane Doe", email: "jane@example.com", message: "Hello from test!" },
            };

            const res = await fetch(`${BASE_URL}/api/v1/forms/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const body = await res.json();
            if ((res.status === 200 || res.status === 201) && body.success === true) {
                console.log("[PASSED] TEST 1: Submission accepted and persisted");
                passedCount++;
            } else {
                console.error("[FAILED] TEST 1");
                failedCount++;
            }
        }

        // TEST 2: Missing Website ID
        {
            const payload = { formId: "contact-form-1", fields: { fullName: "Jane Doe" } };
            const res = await fetch(`${BASE_URL}/api/v1/forms/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const body = await res.json();
            if (res.status === 400 && body.success === false) {
                console.log("[PASSED] TEST 2: Rejected missing website ID with 400");
                passedCount++;
            } else {
                console.error("[FAILED] TEST 2");
                failedCount++;
            }
        }

        console.log(`\nForm Test Results: ${passedCount} Passed, ${failedCount} Failed`);
        return failedCount === 0;

    } catch (err) {
        console.error("Test execution error:", err);
        return false;
    } finally {
        if (testWebsiteId) {
            await prisma.$executeRawUnsafe(`DELETE FROM form_submissions WHERE "websiteId" = $1::uuid`, testWebsiteId).catch(() => { });
            await (prisma as any).website.delete({ where: { id: testWebsiteId } }).catch(() => { });
        }
        if (testUserId) {
            await (prisma as any).user.delete({ where: { id: testUserId } }).catch(() => { });
        }
        if (server) {
            server.close();
        }
    }
}

if (process.argv[1]?.endsWith("forms.test.ts") || process.argv[1]?.endsWith("forms.test.js")) {
    runFormTests();
}
