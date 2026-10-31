import { prisma } from "../config/prisma.js";
import app from "../app.js";
import crypto from "crypto";
import type { Server } from "http";

const db = prisma as any;

let passed = 0;
let failed = 0;

function assert(condition: any, testName: string, details?: any) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`, details || "");
    failed++;
  }
}

async function createTestSession(userId: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  await db.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return rawToken;
}

async function runAuditLogRoleTests() {
  console.log("=================================================");
  console.log("RUNNING AUDIT LOG ROLE NORMALIZATION TEST SUITE");
  console.log("Phase 15 Feature 2 Step 3");
  console.log("=================================================\n");

  let server: Server | null = null;
  let baseUrl = "";

  let superAdminUser: any;
  let platformAdminUser: any;
  let legacyAdminUser: any;
  let supportAdminUser: any;
  let developerUser: any;
  let customerUserA: any;
  let customerUserB: any;

  const createdUserIds: string[] = [];
  const createdAuditLogIds: string[] = [];

  try {
    const timestamp = Date.now();

    // 1. Create Test Users for each role
    superAdminUser = await db.user.create({
      data: { email: `superadmin_al_${timestamp}@example.com`, fullName: "Super Admin AL", status: "ACTIVE", role: "SUPER_ADMIN" },
    });
    createdUserIds.push(superAdminUser.id);

    platformAdminUser = await db.user.create({
      data: { email: `platformadmin_al_${timestamp}@example.com`, fullName: "Platform Admin AL", status: "ACTIVE", role: "PLATFORM_ADMIN" },
    });
    createdUserIds.push(platformAdminUser.id);

    legacyAdminUser = await db.user.create({
      data: { email: `legacyadmin_al_${timestamp}@example.com`, fullName: "Legacy Admin AL", status: "ACTIVE", role: "ADMIN" },
    });
    createdUserIds.push(legacyAdminUser.id);

    supportAdminUser = await db.user.create({
      data: { email: `supportadmin_al_${timestamp}@example.com`, fullName: "Support Admin AL", status: "ACTIVE", role: "SUPPORT_ADMIN" },
    });
    createdUserIds.push(supportAdminUser.id);

    developerUser = await db.user.create({
      data: { email: `developer_al_${timestamp}@example.com`, fullName: "Developer AL", status: "ACTIVE", role: "DEVELOPER" },
    });
    createdUserIds.push(developerUser.id);

    customerUserA = await db.user.create({
      data: { email: `cust_a_al_${timestamp}@example.com`, fullName: "Customer A AL", status: "ACTIVE", role: "USER" },
    });
    createdUserIds.push(customerUserA.id);

    customerUserB = await db.user.create({
      data: { email: `cust_b_al_${timestamp}@example.com`, fullName: "Customer B AL", status: "ACTIVE", role: "USER" },
    });
    createdUserIds.push(customerUserB.id);

    // 2. Insert sample audit logs for Customer A and Customer B
    const logA = await db.auditLog.create({
      data: {
        userId: customerUserA.id,
        actorRole: "CUSTOMER",
        action: "WEBSITE_PUBLISHED",
        targetResource: `website:site-a-${timestamp}`,
        result: "SUCCESS",
        details: { token: "secret_token_123", note: "published site A" },
      },
    });
    createdAuditLogIds.push(logA.id);

    const logB = await db.auditLog.create({
      data: {
        userId: customerUserB.id,
        actorRole: "CUSTOMER",
        action: "SETTINGS_UPDATED",
        targetResource: `website:site-b-${timestamp}`,
        result: "SUCCESS",
        details: { password: "secret_password_456", note: "updated site B" },
      },
    });
    createdAuditLogIds.push(logB.id);

    // 3. Generate Auth Tokens
    const superAdminToken = await createTestSession(superAdminUser.id);
    const platformAdminToken = await createTestSession(platformAdminUser.id);
    const legacyAdminToken = await createTestSession(legacyAdminUser.id);
    const supportAdminToken = await createTestSession(supportAdminUser.id);
    const devToken = await createTestSession(developerUser.id);
    const customerAToken = await createTestSession(customerUserA.id);
    const customerBToken = await createTestSession(customerUserB.id);

    // 4. Start Ephemeral Server
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server!.address() as any;
        baseUrl = `http://localhost:${addr.port}/api/audit-logs`;
        resolve();
      });
    });

    const headers = (token?: string) => ({
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });

    // ==========================================
    // TEST 1: Unauthenticated request is rejected (401)
    // ==========================================
    {
      const res = await fetch(`${baseUrl}`, {
        method: "GET",
        headers: headers(),
      });
      assert(res.status === 401, "T1: Unauthenticated request to /api/audit-logs returns 401", { status: res.status });
    }

    // ==========================================
    // TEST 2: PLATFORM_ADMIN can query global audit logs without restriction (200)
    // ==========================================
    {
      const res = await fetch(`${baseUrl}?userId=${customerUserA.id}`, {
        method: "GET",
        headers: headers(platformAdminToken),
      });
      const data = await res.json();
      assert(
        res.status === 200 && data.success && Array.isArray(data.logs) && data.logs.length >= 1,
        "T2: PLATFORM_ADMIN can query another user's audit logs without restriction (200)",
        data
      );
    }

    // ==========================================
    // TEST 3: SUPER_ADMIN can query global audit logs without restriction (200)
    // ==========================================
    {
      const res = await fetch(`${baseUrl}?userId=${customerUserB.id}`, {
        method: "GET",
        headers: headers(superAdminToken),
      });
      const data = await res.json();
      assert(
        res.status === 200 && data.success && Array.isArray(data.logs) && data.logs.length >= 1,
        "T3: SUPER_ADMIN can query global audit logs without restriction (200)",
        data
      );
    }

    // ==========================================
    // TEST 4: Legacy "ADMIN" alias can query global audit logs (200)
    // ==========================================
    {
      const res = await fetch(`${baseUrl}?userId=${customerUserA.id}`, {
        method: "GET",
        headers: headers(legacyAdminToken),
      });
      const data = await res.json();
      assert(
        res.status === 200 && data.success && Array.isArray(data.logs),
        "T4: Legacy ADMIN alias is normalized and granted admin audit log access (200)",
        data
      );
    }

    // ==========================================
    // TEST 5: CUSTOMER attempting cross-tenant query is rejected (403)
    // ==========================================
    {
      const res = await fetch(`${baseUrl}?userId=${customerUserB.id}`, {
        method: "GET",
        headers: headers(customerAToken),
      });
      assert(
        res.status === 403,
        "T5: CUSTOMER attempting to query another user's activity is rejected with 403",
        { status: res.status }
      );
    }

    // ==========================================
    // TEST 6: CUSTOMER querying their own logs succeeds (200)
    // ==========================================
    {
      const res = await fetch(`${baseUrl}`, {
        method: "GET",
        headers: headers(customerAToken),
      });
      const data = await res.json();
      assert(
        res.status === 200 && data.success && Array.isArray(data.logs),
        "T6: CUSTOMER querying their own audit logs succeeds (200)",
        data
      );
    }

    // ==========================================
    // TEST 7: DEVELOPER attempting cross-tenant query is rejected (403)
    // ==========================================
    {
      const res = await fetch(`${baseUrl}?userId=${customerUserA.id}`, {
        method: "GET",
        headers: headers(devToken),
      });
      assert(
        res.status === 403,
        "T7: DEVELOPER attempting cross-tenant audit log query is rejected with 403",
        { status: res.status }
      );
    }

    // ==========================================
    // TEST 8: SUPPORT_ADMIN attempting cross-tenant query without admin role is rejected (403)
    // ==========================================
    {
      const res = await fetch(`${baseUrl}?userId=${customerUserA.id}`, {
        method: "GET",
        headers: headers(supportAdminToken),
      });
      assert(
        res.status === 403,
        "T8: SUPPORT_ADMIN attempting direct cross-tenant audit query is rejected with 403",
        { status: res.status }
      );
    }

    // ==========================================
    // TEST 9: Secret redaction in logs still functions correctly
    // ==========================================
    {
      const res = await fetch(`${baseUrl}?userId=${customerUserA.id}`, {
        method: "GET",
        headers: headers(platformAdminToken),
      });
      const data = await res.json();
      const targetLog = data.logs.find((l: any) => l.id === logA.id);
      assert(
        targetLog && targetLog.details?.token === "[REDACTED]",
        "T9: Sensitive tokens and credentials in audit log details are redacted",
        targetLog
      );
    }

  } catch (error) {
    console.error("Test execution threw exception:", error);
    failed++;
  } finally {
    // Cleanup
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }

    try {
      if (createdAuditLogIds.length > 0) {
        await db.auditLog.deleteMany({
          where: { id: { in: createdAuditLogIds } },
        });
      }
      if (createdUserIds.length > 0) {
        await db.session.deleteMany({
          where: { userId: { in: createdUserIds } },
        });
        await db.user.deleteMany({
          where: { id: { in: createdUserIds } },
        });
      }
    } catch (cleanupError) {
      console.warn("Cleanup error (non-fatal):", cleanupError);
    }
  }

  console.log("\n=================================================");
  console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAuditLogRoleTests();
