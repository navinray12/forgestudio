import app from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import { createUserSession } from "../../src/services/session.service.js";
import http from "http";

export async function runTeamsApiTestSuite() {
    console.log("==================================================");
    console.log("   FORGESTUDIO TEAMS API SUITE — REGRESSION TEST  ");
    console.log("==================================================\n");

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(5091, resolve));
    const baseUrl = "http://localhost:5091";

    let testUser: any = null;
    let sessionCookie = "";
    let createdTeam: any = null;

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
        // Cleanup prior test user
        await (prisma as any).user.deleteMany({ where: { email: "team_test_user@example.com" } }).catch(() => { });

        // 1. Create Test User & Session
        testUser = await prisma.user.create({
            data: {
                fullName: "Team Suite User",
                email: "team_test_user@example.com",
                role: "USER",
                status: "ACTIVE",
                emailVerified: true,
            },
        });
        const session = await createUserSession(testUser.id);
        sessionCookie = `forge_session=${session.token}`;

        // 2. GET /api/v1/teams (Initial Empty List)
        try {
            const res = await fetch(`${baseUrl}/api/v1/teams`, {
                headers: { Cookie: sessionCookie },
            });
            const body: any = await res.json();
            if (res.status === 200 && body.success && Array.isArray(body.teams)) {
                logPass("1. GET /api/v1/teams", `Loaded ${body.teams.length} teams for user`);
            } else {
                logFail("1. GET /api/v1/teams", `Status: ${res.status}, Body: ${JSON.stringify(body)}`);
            }
        } catch (e) {
            logFail("1. GET /api/v1/teams", e);
        }

        // 3. POST /api/v1/teams (Create Team)
        try {
            const res = await fetch(`${baseUrl}/api/v1/teams`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Cookie: sessionCookie },
                body: JSON.stringify({
                    name: "Design Operations Team",
                    description: "Team workspace for website building",
                }),
            });
            const body: any = await res.json();
            if ((res.status === 200 || res.status === 201) && body.success && body.team?.id) {
                createdTeam = body.team;
                logPass("2. POST /api/v1/teams", `Team created with ID: ${createdTeam.id}`);
            } else {
                logFail("2. POST /api/v1/teams", `Status: ${res.status}, Body: ${JSON.stringify(body)}`);
            }
        } catch (e) {
            logFail("2. POST /api/v1/teams", e);
        }

        // 4. GET /api/v1/teams (Verify Team Exists)
        if (createdTeam) {
            try {
                const res = await fetch(`${baseUrl}/api/v1/teams`, {
                    headers: { Cookie: sessionCookie },
                });
                const body: any = await res.json();
                if (res.status === 200 && body.success && body.teams.some((t: any) => t.id === createdTeam.id)) {
                    logPass("3. GET /api/v1/teams", "Verified newly created team is in user team list");
                } else {
                    logFail("3. GET /api/v1/teams", `Status: ${res.status}, Body: ${JSON.stringify(body)}`);
                }
            } catch (e) {
                logFail("3. GET /api/v1/teams", e);
            }
        }

        // 5. GET /api/v1/teams/:id (Get Details)
        if (createdTeam) {
            try {
                const res = await fetch(`${baseUrl}/api/v1/teams/${createdTeam.id}`, {
                    headers: { Cookie: sessionCookie },
                });
                const body: any = await res.json();
                if (res.status === 200 && body.success && body.team?.name === "Design Operations Team") {
                    logPass("4. GET /api/v1/teams/:id", `Loaded team details (Role: ${body.team.userRole})`);
                } else {
                    logFail("4. GET /api/v1/teams/:id", `Status: ${res.status}, Body: ${JSON.stringify(body)}`);
                }
            } catch (e) {
                logFail("4. GET /api/v1/teams/:id", e);
            }
        }

        // 6. DELETE /api/v1/teams/:id (Cleanup)
        if (createdTeam) {
            try {
                const res = await fetch(`${baseUrl}/api/v1/teams/${createdTeam.id}`, {
                    method: "DELETE",
                    headers: { Cookie: sessionCookie },
                });
                const body: any = await res.json();
                if (res.status === 200 && body.success) {
                    logPass("5. DELETE /api/v1/teams/:id", "Team deleted successfully");
                } else {
                    logFail("5. DELETE /api/v1/teams/:id", `Status: ${res.status}, Body: ${JSON.stringify(body)}`);
                }
            } catch (e) {
                logFail("5. DELETE /api/v1/teams/:id", e);
            }
        }

        console.log("\n==================================================");
        console.log(` TEAMS TEST SUMMARY: ${passedCount} PASSED | ${failedCount} FAILED`);
        console.log("==================================================");

        return failedCount === 0;

    } catch (err: any) {
        console.error("Teams Test Suite Error:", err);
        return false;
    } finally {
        if (testUser) {
            await (prisma as any).user.delete({ where: { id: testUser.id } }).catch(() => { });
        }
        server.close();
    }
}

if (process.argv[1]?.endsWith("teams.test.ts") || process.argv[1]?.endsWith("teams.test.js")) {
    runTeamsApiTestSuite();
}
