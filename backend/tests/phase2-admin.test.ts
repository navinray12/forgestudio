import http from "http";
import app from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { createUserSession } from "../src/services/session.service.js";
import { hashPassword } from "../src/utils/password.js";
import { AUTH_COOKIE_NAME } from "../src/config/auth.js";

const db = prisma as any;

export async function runPhase2AdminTestSuite() {
  console.log("================================================================");
  console.log("   FORGESTUDIO PHASE 2 — ADMIN DASHBOARD VERIFICATION SUITE     ");
  console.log("================================================================\n");

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(5099, resolve));
  const baseUrl = "http://localhost:5099";

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

  let normalUser: any = null;
  let normalCookie = "";
  let adminUser: any = null;
  let adminCookie = "";
  let secondAdminUser: any = null;
  let superAdminUser: any = null;
  let superAdminCookie = "";
  let secondSuperAdminUser: any = null;
  let testWebsite: any = null;

  try {
    // -------------------------------------------------------------------------
    // Setup Test Data
    // -------------------------------------------------------------------------
    console.log("Setting up isolated Phase 2 test tenants...");
    const testPasswordHash = await hashPassword("AdminTest123!");

    // Clean any prior runs
    const testEmails = [
      "p2_normal@example.com",
      "p2_admin@example.com",
      "p2_admin_two@example.com",
      "p2_superadmin@example.com",
      "p2_superadmin_two@example.com",
    ];
    await db.user.deleteMany({ where: { email: { in: testEmails } } }).catch(() => {});

    normalUser = await db.user.create({
      data: {
        email: "p2_normal@example.com",
        fullName: "P2 Normal User",
        passwordHash: testPasswordHash,
        role: "USER",
        status: "ACTIVE",
        emailVerified: true,
      },
    });
    const normalSession = await createUserSession(normalUser.id);
    normalCookie = `${AUTH_COOKIE_NAME}=${normalSession.token}`;

    adminUser = await db.user.create({
      data: {
        email: "p2_admin@example.com",
        fullName: "P2 Admin User",
        passwordHash: testPasswordHash,
        role: "ADMIN",
        status: "ACTIVE",
        emailVerified: true,
      },
    });
    const adminSession = await createUserSession(adminUser.id);
    adminCookie = `${AUTH_COOKIE_NAME}=${adminSession.token}`;

    secondAdminUser = await db.user.create({
      data: {
        email: "p2_admin_two@example.com",
        fullName: "P2 Second Admin",
        passwordHash: testPasswordHash,
        role: "ADMIN",
        status: "ACTIVE",
        emailVerified: true,
      },
    });

    superAdminUser = await db.user.create({
      data: {
        email: "p2_superadmin@example.com",
        fullName: "P2 Super Admin",
        passwordHash: testPasswordHash,
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        emailVerified: true,
      },
    });
    const superAdminSession = await createUserSession(superAdminUser.id);
    superAdminCookie = `${AUTH_COOKIE_NAME}=${superAdminSession.token}`;

    secondSuperAdminUser = await db.user.create({
      data: {
        email: "p2_superadmin_two@example.com",
        fullName: "P2 Second Super Admin",
        passwordHash: testPasswordHash,
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        emailVerified: true,
      },
    });

    testWebsite = await db.website.create({
      data: {
        userId: normalUser.id,
        name: "P2 Test Website",
        slug: "p2-test-website",
        status: "DRAFT",
        moderationStatus: "ACTIVE",
      },
    });

    logPass("Setup: Test users and website initialized in PostgreSQL");

    // -------------------------------------------------------------------------
    // GROUP A: LIVE STATISTICS
    // -------------------------------------------------------------------------
    console.log("\n--- GROUP A: LIVE STATISTICS ---");
    try {
      const res = await fetch(`${baseUrl}/api/v1/operations/admin/stats`, {
        headers: { Cookie: adminCookie },
      });
      const json: any = await res.json();
      if (
        res.status === 200 &&
        json.success &&
        typeof json.data.totals.totalUsers === "number" &&
        json.data.totals.totalUsers >= 5 &&
        typeof json.data.totals.activeUsers === "number" &&
        typeof json.data.totals.totalWebsites === "number" &&
        json.data.health?.status === "HEALTHY" &&
        json.data.activityDefinition
      ) {
        logPass("A1. GET /api/v1/operations/admin/stats returns live aggregated metrics", `Users: ${json.data.totals.totalUsers}, Active: ${json.data.totals.activeUsers}`);
      } else {
        logFail("A1. GET /api/v1/operations/admin/stats metrics mismatch", json);
      }
    } catch (e) {
      logFail("A1. GET /api/v1/operations/admin/stats", e);
    }

    // A2: Normal User denied stats access
    try {
      const res = await fetch(`${baseUrl}/api/v1/operations/admin/stats`, {
        headers: { Cookie: normalCookie },
      });
      if (res.status === 403) {
        logPass("A2. Normal User denied access to /operations/admin/stats (403)");
      } else {
        logFail("A2. Normal User denied access", `Status: ${res.status}`);
      }
    } catch (e) {
      logFail("A2. Normal User denied access", e);
    }

    // -------------------------------------------------------------------------
    // GROUP B: USER MANAGEMENT & SUSPENSION
    // -------------------------------------------------------------------------
    console.log("\n--- GROUP B: USER MANAGEMENT & SUSPENSION ---");
    
    // B1: List / search users
    try {
      const res = await fetch(`${baseUrl}/api/v1/operations/admin/users?search=p2_normal`, {
        headers: { Cookie: adminCookie },
      });
      const json: any = await res.json();
      if (res.status === 200 && json.success && json.data.length >= 1 && json.data[0].email === "p2_normal@example.com") {
        logPass("B1. GET /api/v1/operations/admin/users search by email", `Found ${json.data.length} user(s)`);
      } else {
        logFail("B1. Search users failed", json);
      }
    } catch (e) {
      logFail("B1. Search users", e);
    }

    // B2: User details
    try {
      const res = await fetch(`${baseUrl}/api/v1/operations/admin/users/${normalUser.id}`, {
        headers: { Cookie: adminCookie },
      });
      const json: any = await res.json();
      if (res.status === 200 && json.success && json.data.id === normalUser.id && Array.isArray(json.data.websites)) {
        logPass("B2. GET /api/v1/operations/admin/users/:userId returns user details with websites list");
      } else {
        logFail("B2. User details failed", json);
      }
    } catch (e) {
      logFail("B2. User details", e);
    }

    // B3: Safety: Admin cannot suspend themselves
    try {
      const res = await fetch(`${baseUrl}/api/v1/operations/admin/users/${adminUser.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: adminCookie },
        body: JSON.stringify({ status: "SUSPENDED", reason: "Self test" }),
      });
      if (res.status === 400) {
        logPass("B3. Safety: Admin self-suspension rejected (400 CANNOT_MODIFY_SELF)");
      } else {
        logFail("B3. Admin self-suspension should be blocked", `Status: ${res.status}`);
      }
    } catch (e) {
      logFail("B3. Self-suspension", e);
    }

    // B4: Safety: Regular admin cannot suspend another Admin or Super Admin
    try {
      const res = await fetch(`${baseUrl}/api/v1/operations/admin/users/${secondAdminUser.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: adminCookie },
        body: JSON.stringify({ status: "SUSPENDED", reason: "Peer admin test" }),
      });
      if (res.status === 403) {
        logPass("B4. Safety: Admin cannot suspend peer Admin (403 FORBIDDEN)");
      } else {
        logFail("B4. Admin suspending Admin should be blocked", `Status: ${res.status}`);
      }
    } catch (e) {
      logFail("B4. Admin suspending Admin", e);
    }

    // B5: Suspend normal user by Admin
    try {
      const res = await fetch(`${baseUrl}/api/v1/operations/admin/users/${normalUser.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: adminCookie },
        body: JSON.stringify({ status: "SUSPENDED", reason: "Violation of Acceptable Use Policy" }),
      });
      const json: any = await res.json();
      if (res.status === 200 && json.success && json.data.status === "SUSPENDED") {
        logPass("B5. Admin suspends normal user successfully", `Reason: ${json.data.suspensionReason}`);
      } else {
        logFail("B5. Suspend normal user failed", json);
      }
    } catch (e) {
      logFail("B5. Suspend normal user", e);
    }

    // B6: Existing session denied after suspension (403 ACCOUNT_SUSPENDED)
    try {
      const res = await fetch(`${baseUrl}/api/websites`, {
        headers: { Cookie: normalCookie },
      });
      const json: any = await res.json();
      if (res.status === 403 && json.error?.code === "ACCOUNT_SUSPENDED") {
        logPass("B6. Existing session denied immediately after suspension (403 ACCOUNT_SUSPENDED)");
      } else {
        logFail("B6. Suspended user session not blocked properly", `Status: ${res.status}, Code: ${json.error?.code}`);
      }
    } catch (e) {
      logFail("B6. Existing session denied", e);
    }

    // B7: New login attempt blocked for suspended user
    try {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: "p2_normal@example.com", password: "AdminTest123!" }),
      });
      if (res.status === 401 || res.status === 403) {
        logPass("B7. New login attempt blocked for suspended user");
      } else {
        logFail("B7. Login attempt was not blocked for suspended user", `Status: ${res.status}`);
      }
    } catch (e) {
      logFail("B7. New login blocked", e);
    }

    // B8: Reactivate normal user by Admin
    try {
      const res = await fetch(`${baseUrl}/api/v1/operations/admin/users/${normalUser.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: adminCookie },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      const json: any = await res.json();
      if (res.status === 200 && json.success && json.data.status === "ACTIVE") {
        logPass("B8. Admin reactivates normal user successfully");
      } else {
        logFail("B8. Reactivate normal user failed", json);
      }
    } catch (e) {
      logFail("B8. Reactivate normal user", e);
    }

    // -------------------------------------------------------------------------
    // GROUP C: WEBSITE MANAGEMENT & MODERATION
    // -------------------------------------------------------------------------
    console.log("\n--- GROUP C: WEBSITE MANAGEMENT & MODERATION ---");

    // C1: List / filter websites
    try {
      const res = await fetch(`${baseUrl}/api/v1/operations/admin/websites?search=p2-test-website`, {
        headers: { Cookie: adminCookie },
      });
      const json: any = await res.json();
      if (res.status === 200 && json.success && json.data.length >= 1 && json.data[0].slug === "p2-test-website") {
        logPass("C1. GET /api/v1/operations/admin/websites returns filtered websites list");
      } else {
        logFail("C1. List websites failed", json);
      }
    } catch (e) {
      logFail("C1. List websites", e);
    }

    // C2: Suspend website moderation
    try {
      const res = await fetch(`${baseUrl}/api/v1/operations/admin/websites/${testWebsite.id}/moderation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: adminCookie },
        body: JSON.stringify({ moderationStatus: "SUSPENDED", reason: "Copyright investigation" }),
      });
      const json: any = await res.json();
      if (res.status === 200 && json.success && json.data.moderationStatus === "SUSPENDED") {
        logPass("C2. Website moderation suspended by administrator", `Reason: ${json.data.moderationReason}`);
      } else {
        logFail("C2. Website moderation suspend failed", json);
      }
    } catch (e) {
      logFail("C2. Website moderation suspend", e);
    }

    // C3: Publishing blocked for suspended website (attempted by website owner)
    try {
      const ownerSession = await createUserSession(normalUser.id);
      const ownerCookie = `${AUTH_COOKIE_NAME}=${ownerSession.token}`;

      const res = await fetch(`${baseUrl}/api/websites/${testWebsite.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: ownerCookie },
        body: JSON.stringify({ destinationType: "INTERNAL" }),
      });
      const json: any = await res.json();
      if (res.status === 403 && json.error?.code === "WEBSITE_SUSPENDED") {
        logPass("C3. Publishing blocked for suspended website (403 WEBSITE_SUSPENDED)");
      } else {
        logFail("C3. Suspended website publish should be blocked", `Status: ${res.status}, Error: ${json.error?.code}`);
      }
    } catch (e) {
      logFail("C3. Suspended website publish", e);
    }

    // C4: Reactivate website moderation
    try {
      const res = await fetch(`${baseUrl}/api/v1/operations/admin/websites/${testWebsite.id}/moderation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: adminCookie },
        body: JSON.stringify({ moderationStatus: "ACTIVE", reason: "Investigation cleared" }),
      });
      const json: any = await res.json();
      if (res.status === 200 && json.success && json.data.moderationStatus === "ACTIVE") {
        logPass("C4. Website moderation reactivated by administrator");
      } else {
        logFail("C4. Website reactivate failed", json);
      }
    } catch (e) {
      logFail("C4. Website reactivate", e);
    }

    // -------------------------------------------------------------------------
    // GROUP D: AUDIT LOGS
    // -------------------------------------------------------------------------
    console.log("\n--- GROUP D: AUDIT LOGS ---");

    // D1: Verify audit logs recorded for prior actions
    try {
      const res = await fetch(`${baseUrl}/api/v1/operations/admin/audit-logs?action=USER_SUSPEND`, {
        headers: { Cookie: adminCookie },
      });
      const json: any = await res.json();
      if (res.status === 200 && json.success && json.data.length >= 1 && json.data[0].action === "USER_SUSPEND") {
        logPass("D1. Audit logs persisted with action USER_SUSPEND", `Found ${json.data.length} record(s)`);
      } else {
        logFail("D1. Audit logs query failed", json);
      }
    } catch (e) {
      logFail("D1. Audit logs query", e);
    }

    // D2: Export audit logs to CSV
    try {
      const res = await fetch(`${baseUrl}/api/v1/operations/admin/audit-logs/export`, {
        headers: { Cookie: adminCookie },
      });
      const text = await res.text();
      const contentType = res.headers.get("content-type") || "";
      if (res.status === 200 && contentType.includes("text/csv") && text.includes("Event ID") && text.includes("USER_SUSPEND")) {
        logPass("D2. GET /api/v1/operations/admin/audit-logs/export produces valid CSV file");
      } else {
        logFail("D2. Audit logs CSV export failed", `ContentType: ${contentType}`);
      }
    } catch (e) {
      logFail("D2. Audit logs CSV export", e);
    }

    // -------------------------------------------------------------------------
    // GROUP E: ROLE-BASED ACCESS CONTROL
    // -------------------------------------------------------------------------
    console.log("\n--- GROUP E: ROLE-BASED ACCESS CONTROL ---");

    // E1: Super Admin can suspend an Admin
    try {
      const res = await fetch(`${baseUrl}/api/v1/operations/admin/users/${secondAdminUser.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: superAdminCookie },
        body: JSON.stringify({ status: "SUSPENDED", reason: "Administrative review by SuperAdmin" }),
      });
      const json: any = await res.json();
      if (res.status === 200 && json.success && json.data.status === "SUSPENDED") {
        logPass("E1. Super Admin can moderate Admin accounts");
      } else {
        logFail("E1. Super Admin moderate Admin failed", json);
      }
    } catch (e) {
      logFail("E1. Super Admin moderate Admin", e);
    }

    // E2: Admin denied access to Super Admin Background Jobs
    try {
      const res = await fetch(`${baseUrl}/api/v1/operations/jobs`, {
        headers: { Cookie: adminCookie },
      });
      if (res.status === 403) {
        logPass("E2. Regular Admin denied access to /operations/jobs (403)");
      } else {
        logFail("E2. Admin access to jobs should be 403", `Status: ${res.status}`);
      }
    } catch (e) {
      logFail("E2. Admin access to jobs", e);
    }

    // E3: Super Admin allowed access to Background Jobs
    try {
      const res = await fetch(`${baseUrl}/api/v1/operations/jobs`, {
        headers: { Cookie: superAdminCookie },
      });
      const json: any = await res.json();
      if (res.status === 200 && json.success) {
        logPass("E3. Super Admin allowed access to /operations/jobs (200)");
      } else {
        logFail("E3. Super Admin access to jobs failed", json);
      }
    } catch (e) {
      logFail("E3. Super Admin access to jobs", e);
    }

    // -------------------------------------------------------------------------
    // GROUP F: SYSTEM MONITORING
    // -------------------------------------------------------------------------
    console.log("\n--- GROUP F: SYSTEM MONITORING ---");

    // F1: Admin Monitoring telemetry
    try {
      const res = await fetch(`${baseUrl}/api/v1/operations/admin/monitoring`, {
        headers: { Cookie: adminCookie },
      });
      const json: any = await res.json();
      if (res.status === 200 && json.success && json.data.health?.database?.connected && json.data.nodeEnvironment) {
        logPass("F1. GET /api/v1/operations/admin/monitoring returns operational telemetry", `DB Latency: ${json.data.health.database.latencyMs}ms`);
      } else {
        logFail("F1. Admin monitoring failed", json);
      }
    } catch (e) {
      logFail("F1. Admin monitoring", e);
    }

    // F2: Public health probe is minimal
    try {
      const res = await fetch(`${baseUrl}/api/v1/operations/health`);
      const json: any = await res.json();
      if (res.status === 200 && json.status && !json.database?.connectionString) {
        logPass("F2. Public /operations/health is functional and leaks no credentials");
      } else {
        logFail("F2. Public health failed", json);
      }
    } catch (e) {
      logFail("F2. Public health", e);
    }
  } finally {
    // Teardown
    console.log("\nTearing down test server and cleaning test records...");
    await new Promise<void>((resolve) => server.close(() => resolve()));
    const cleanupEmails = [
      "p2_normal@example.com",
      "p2_admin@example.com",
      "p2_admin_two@example.com",
      "p2_superadmin@example.com",
      "p2_superadmin_two@example.com",
    ];
    await db.user.deleteMany({ where: { email: { in: cleanupEmails } } }).catch(() => {});
  }

  console.log("\n================================================================");
  console.log(`   PHASE 2 TEST SUMMARY: ${passedCount} PASSED | ${failedCount} FAILED`);
  console.log("================================================================\n");

  return { passedCount, failedCount };
}

// Self-run when invoked directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  runPhase2AdminTestSuite()
    .then(({ failedCount }) => {
      process.exit(failedCount > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error("Test execution aborted:", err);
      process.exit(1);
    });
}
