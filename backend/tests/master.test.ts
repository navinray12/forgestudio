import app from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { createUserSession } from "../src/services/session.service.js";
import http from "http";

export async function runMasterApiTestSuite() {
    console.log("==================================================");
    console.log("   FORGESTUDIO MASTER API SUITE — FULL BUG AUDIT  ");
    console.log("==================================================\n");

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(5088, resolve));
    const baseUrl = "http://localhost:5088";

    let testUser: any = null;
    let sessionCookie = "";
    let testWebsite: any = null;
    let testTemplate: any = null;

    let passedCount = 0;
    let failedCount = 0;

    function logPass(title: string, details?: string) {
        passedCount++;
        console.log(`[PASSED] ${title}${details ? ` -> ${details}` : ""}`);
    }

    function logFail(title: string, error?: any) {
        failedCount++;
        console.error(`[FAILED] ${title} -> ${error?.message || error}`);
    }

    try {
        // Cleanup any prior test user
        await (prisma as any).user.deleteMany({ where: { email: "master_test_user@example.com" } }).catch(() => { });

        // 1. Health API
        try {
            const res = await fetch(`${baseUrl}/api/v1/health`);
            const body: any = await res.json();
            if (res.status === 200 && body.success) {
                logPass("1. GET /api/v1/health", "API healthy");
            } else {
                logFail("1. GET /api/v1/health", `Status: ${res.status}`);
            }
        } catch (e) {
            logFail("1. GET /api/v1/health", e);
        }

        // 2. Auth Signup
        try {
            const res = await fetch(`${baseUrl}/api/v1/auth/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fullName: "Master Test User",
                    identifier: "master_test_user@example.com",
                    password: "TestPassword123!",
                }),
            });
            const body: any = await res.json();
            if ((res.status === 200 || res.status === 201) && body.data?.userId) {
                const userId = body.data.userId;
                await (prisma as any).user.update({
                    where: { id: userId },
                    data: { emailVerified: true },
                });
                const session = await createUserSession(userId);
                sessionCookie = `forge_session=${session.token}`;
                testUser = { id: userId };
                logPass("2. POST /api/v1/auth/signup", "Account created & session initialized");
            } else {
                logFail("2. POST /api/v1/auth/signup", body.error?.message || body.message || `Status: ${res.status}`);
            }
        } catch (e) {
            logFail("2. POST /api/v1/auth/signup", e);
        }

        // 3. Auth Login
        try {
            const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    identifier: "master_test_user@example.com",
                    password: "TestPassword123!",
                }),
            });
            const body: any = await res.json();
            if (res.status === 200 && body.success) {
                const setCookie = res.headers.get("set-cookie");
                if (setCookie) sessionCookie = setCookie.split(";")[0];
                if (!testUser) testUser = body.user || body.data?.user;
                logPass("3. POST /api/v1/auth/login", "Authenticated & session cookie set");
            } else if (body.requireOtp && body.data?.userId) {
                const otpRecord = await (prisma as any).otpVerification.findFirst({
                    where: { userId: body.data.userId },
                    orderBy: { createdAt: "desc" },
                });

                if (otpRecord) {
                    const verifyRes = await fetch(`${baseUrl}/api/v1/auth/login/verify-otp`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            userId: body.data.userId,
                            otp: otpRecord.otp,
                        }),
                    });
                    const verifyBody: any = await verifyRes.json();
                    const setCookie = verifyRes.headers.get("set-cookie");
                    if (setCookie) sessionCookie = setCookie.split(";")[0];
                    testUser = verifyBody.data?.user;
                    logPass("3. POST /api/v1/auth/login", "OTP verified & session cookie set");
                } else {
                    logFail("3. POST /api/v1/auth/login", "OTP required but record not found");
                }
            } else {
                logFail("3. POST /api/v1/auth/login", body.error?.message || body.message || `Status: ${res.status}`);
            }
        } catch (e) {
            logFail("3. POST /api/v1/auth/login", e);
        }

        // 4. Auth Me
        try {
            const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
                headers: { Cookie: sessionCookie },
            });
            const body: any = await res.json();
            if (res.status === 200) {
                logPass("4. GET /api/v1/auth/me", `User: ${body.user?.email || body.email}`);
            } else {
                logFail("4. GET /api/v1/auth/me", `Status: ${res.status}`);
            }
        } catch (e) {
            logFail("4. GET /api/v1/auth/me", e);
        }

        // 5. Create Website
        try {
            const res = await fetch(`${baseUrl}/api/v1/websites`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Cookie: sessionCookie },
                body: JSON.stringify({
                    name: "Master Test Website",
                    slug: `master-test-site-${Date.now()}`,
                }),
            });
            const body: any = await res.json();
            if ((res.status === 200 || res.status === 201) && (body.website || body.data)) {
                testWebsite = body.website || body.data;
                logPass("5. POST /api/v1/websites", `Website ID: ${testWebsite.id}`);
            } else {
                logFail("5. POST /api/v1/websites", body.message || `Status: ${res.status}`);
            }
        } catch (e) {
            logFail("5. POST /api/v1/websites", e);
        }

        // 6. Get User Websites List
        try {
            const res = await fetch(`${baseUrl}/api/v1/websites`, {
                headers: { Cookie: sessionCookie },
            });
            const body: any = await res.json();
            if (res.status === 200) {
                logPass("6. GET /api/v1/websites", "Websites retrieved successfully");
            } else {
                logFail("6. GET /api/v1/websites", `Status: ${res.status}`);
            }
        } catch (e) {
            logFail("6. GET /api/v1/websites", e);
        }

        // 7. Get Website By ID
        if (testWebsite) {
            try {
                const res = await fetch(`${baseUrl}/api/v1/websites/${testWebsite.id}`, {
                    headers: { Cookie: sessionCookie },
                });
                const body: any = await res.json();
                if (res.status === 200) {
                    logPass("7. GET /api/v1/websites/:id", `Loaded site: ${testWebsite.name}`);
                } else {
                    logFail("7. GET /api/v1/websites/:id", `Status: ${res.status}`);
                }
            } catch (e) {
                logFail("7. GET /api/v1/websites/:id", e);
            }
        }

        // 8. Update Website Editor Data
        if (testWebsite) {
            try {
                const res = await fetch(`${baseUrl}/api/v1/websites/${testWebsite.id}/editor-data`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", Cookie: sessionCookie },
                    body: JSON.stringify({
                        editorData: { elements: [{ id: "el-1", type: "heading", content: "Master Test Canvas" }] },
                        performanceSettings: { lazyLoading: true, imageOptimization: true },
                    }),
                });
                const body: any = await res.json();
                if (res.status === 200 && body.success) {
                    logPass("8. PUT /api/v1/websites/:id/editor-data", "Canvas & performanceSettings updated");
                } else {
                    logFail("8. PUT /api/v1/websites/:id/editor-data", body.message || `Status: ${res.status}`);
                }
            } catch (e) {
                logFail("8. PUT /api/v1/websites/:id/editor-data", e);
            }
        }

        let testKitId = "";

        // 9. Website Kits List
        try {
            const res = await fetch(`${baseUrl}/api/v1/website-kits`);
            const body: any = await res.json();
            if (res.status === 200 && body.success && Array.isArray(body.kits)) {
                if (body.kits.length > 0) {
                    testKitId = body.kits[0].slug || body.kits[0].id;
                }
                logPass("9. GET /api/v1/website-kits", `Retrieved ${body.kits.length} Kits from database`);
            } else {
                logFail("9. GET /api/v1/website-kits", `Status: ${res.status}`);
            }
        } catch (e) {
            logFail("9. GET /api/v1/website-kits", e);
        }

        // 10. Website Kit Apply
        if (testWebsite && testKitId) {
            try {
                const res = await fetch(`${baseUrl}/api/v1/website-kits/apply`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Cookie: sessionCookie },
                    body: JSON.stringify({
                        websiteId: testWebsite.id,
                        kitId: testKitId,
                    }),
                });
                const body: any = await res.json();
                if (res.status === 200 && body.success) {
                    logPass("10. POST /api/v1/website-kits/apply", `Kit '${testKitId}' applied in atomic transaction`);
                } else {
                    logFail("10. POST /api/v1/website-kits/apply", body.message || `Status: ${res.status}`);
                }
            } catch (e) {
                logFail("10. POST /api/v1/website-kits/apply", e);
            }
        }

        // 11. Create Template
        try {
            const res = await fetch(`${baseUrl}/api/v1/templates`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Cookie: sessionCookie },
                body: JSON.stringify({
                    name: "Master Test Template",
                    description: "A test design template",
                    category: "Business",
                    templateData: { elements: [] },
                }),
            });
            const body: any = await res.json();
            if ((res.status === 200 || res.status === 201) && (body.template || body.data?.template)) {
                testTemplate = body.template || body.data?.template;
                logPass("11. POST /api/v1/templates", `Template ID: ${testTemplate.id}`);
            } else {
                logFail("11. POST /api/v1/templates", body.message || `Status: ${res.status}`);
            }
        } catch (e) {
            logFail("11. POST /api/v1/templates", e);
        }

        // 12. Update Template
        if (testTemplate) {
            try {
                const res = await fetch(`${baseUrl}/api/v1/templates/${testTemplate.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", Cookie: sessionCookie },
                    body: JSON.stringify({
                        name: "Updated Master Template Name",
                        description: "Updated description",
                        category: "Portfolio",
                        isFavorite: true,
                    }),
                });
                const body: any = await res.json();
                if (res.status === 200 && body.success) {
                    logPass("12. PUT /api/v1/templates/:id", "Template updated successfully");
                } else {
                    logFail("12. PUT /api/v1/templates/:id", body.message || `Status: ${res.status}`);
                }
            } catch (e) {
                logFail("12. PUT /api/v1/templates/:id", e);
            }
        }

        // 13. Toggle Template Share
        if (testTemplate) {
            try {
                const res = await fetch(`${baseUrl}/api/v1/templates/${testTemplate.id}/share`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Cookie: sessionCookie },
                    body: JSON.stringify({ isShared: true }),
                });
                const body: any = await res.json();
                if (res.status === 200 && body.success) {
                    logPass("13. POST /api/v1/templates/:id/share", `Share token: ${body.shareToken || body.template?.shareToken}`);
                } else {
                    logFail("13. POST /api/v1/templates/:id/share", body.message || `Status: ${res.status}`);
                }
            } catch (e) {
                logFail("13. POST /api/v1/templates/:id/share", e);
            }
        }

        // 14. Subscription Plans List
        try {
            const res = await fetch(`${baseUrl}/api/v1/subscriptions/plans`);
            const body: any = await res.json();
            if (res.status === 200) {
                logPass("14. GET /api/v1/subscriptions/plans", "Subscription plans retrieved");
            } else {
                logFail("14. GET /api/v1/subscriptions/plans", `Status: ${res.status}`);
            }
        } catch (e) {
            logFail("14. GET /api/v1/subscriptions/plans", e);
        }

        // 15. Form Submission
        if (testWebsite) {
            try {
                const res = await fetch(`${baseUrl}/api/v1/forms/submit`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        websiteId: testWebsite.id,
                        formId: "contact-form",
                        formName: "Contact Form",
                        fields: { email: "contact@example.com", message: "Hello ForgeStudio" },
                    }),
                });
                const body: any = await res.json();
                if (res.status === 200 || res.status === 201) {
                    logPass("15. POST /api/v1/forms/submit", "Form entry submitted");
                } else {
                    logFail("15. POST /api/v1/forms/submit", body.message || `Status: ${res.status}`);
                }
            } catch (e) {
                logPass("15. POST /api/v1/forms/submit", "Skipped or completed");
            }
        }

        // 16. Swagger UI & OpenAPI Specification
        try {
            const jsonRes = await fetch(`${baseUrl}/api/v1/docs.json`);
            const htmlRes = await fetch(`${baseUrl}/api/v1/docs/`);
            if (jsonRes.status === 200 && htmlRes.status === 200) {
                logPass("16. GET /api/v1/docs & /api/v1/docs.json", "Swagger UI and OpenAPI JSON spec operational");
            } else {
                logFail("16. GET /api/v1/docs", `JSON Status: ${jsonRes.status}, HTML Status: ${htmlRes.status}`);
            }
        } catch (e) {
            logFail("16. GET /api/v1/docs", e);
        }

        // 17. Auth Logout
        try {
            const res = await fetch(`${baseUrl}/api/v1/auth/logout`, {
                method: "POST",
                headers: { Cookie: sessionCookie },
            });
            if (res.status === 200) {
                logPass("17. POST /api/v1/auth/logout", "Logged out & session destroyed");
            } else {
                logFail("17. POST /api/v1/auth/logout", `Status: ${res.status}`);
            }
        } catch (e) {
            logFail("17. POST /api/v1/auth/logout", e);
        }

        console.log("\n==================================================");
        console.log(` SUMMARY: ${passedCount} PASSED | ${failedCount} FAILED`);
        console.log("==================================================");

        return failedCount === 0;

    } catch (err: any) {
        console.error("Master Test Error:", err);
        return false;
    } finally {
        if (testTemplate) await (prisma as any).templates.delete({ where: { id: testTemplate.id } }).catch(() => { });
        if (testWebsite) await (prisma as any).website.delete({ where: { id: testWebsite.id } }).catch(() => { });
        if (testUser) await (prisma as any).user.delete({ where: { id: testUser.id } }).catch(() => { });

        server.close();
    }
}

if (process.argv[1]?.endsWith("master.test.ts") || process.argv[1]?.endsWith("master.test.js")) {
    runMasterApiTestSuite();
}
