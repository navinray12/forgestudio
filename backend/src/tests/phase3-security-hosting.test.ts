import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import {
  updateSiteLock,
  updatePrivacyAndMaintenance,
  updateIpFirewall,
  runSecurityAudit,
  purgeHostingCache,
  getHostingLogs,
} from "../services/siteSecurity.service.js";
import { transferWebsiteOwnership } from "../services/website.service.js";

const db = prisma as any;
let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`[PASS] ${msg}`);
    passed++;
  } else {
    console.error(`[FAIL] ${msg}`);
    failed++;
  }
}

async function runTests() {
  console.log("\n=================================================");
  console.log("RUNNING FORGESTUDIO PHASE 3 SECURITY & HOSTING SUITE");
  console.log("=================================================");

  // Setup test user and website
  const testUserA = await db.user.upsert({
    where: { email: "owner_a@forgestudio.test" },
    update: {},
    create: {
      email: "owner_a@forgestudio.test",
      fullName: "Owner Alpha",
      role: "ADMIN",
    },
  });

  const testUserB = await db.user.upsert({
    where: { email: "recipient_b@forgestudio.test" },
    update: {},
    create: {
      email: "recipient_b@forgestudio.test",
      fullName: "Recipient Beta",
      role: "USER",
    },
  });

  const testWebsite = await db.website.create({
    data: {
      userId: testUserA.id,
      name: "Security Sandbox Site",
      slug: `security-sandbox-${Date.now()}`,
      status: "DRAFT",
      editorData: {
        version: 1,
        pages: [{ id: "p1", name: "Home", elements: [] }],
        hostingConfig: {},
      },
    },
  });

  try {
    // 1. Site Lock Password Hashing
    console.log("\n--- Section 1: Site Lock Password Hashing ---");
    const rawPass = "VaultSecure2026!";
    const lockResult = await updateSiteLock(testWebsite.id, {
      enabled: true,
      password: rawPass,
      hint: "Secret company passkey",
    }, testUserA.id);

    assert(lockResult.enabled === true, "Site lock is enabled");
    assert(lockResult.hasPassword === true, "Site lock records password hash");
    assert(lockResult.hint === "Secret company passkey", "Password hint preserved");

    const refreshedSite = await db.website.findUnique({ where: { id: testWebsite.id } });
    const storedLock = refreshedSite.editorData.hostingConfig.siteLock;
    assert(!!storedLock.passwordHash, "Password hash persisted in editorData.hostingConfig.siteLock");
    assert(storedLock.passwordHash !== rawPass, "Password is not stored in plaintext");
    const isPasswordValid = await bcrypt.compare(rawPass, storedLock.passwordHash);
    assert(isPasswordValid === true, "Stored bcrypt hash verifies against original password");

    // 2. Search Engine Privacy & Maintenance Mode
    console.log("\n--- Section 2: Privacy & Maintenance Mode ---");
    const privacy = await updatePrivacyAndMaintenance(testWebsite.id, {
      noIndex: true,
      maintenanceMode: true,
    }, testUserA.id);
    assert(privacy.noIndex === true, "noindex flag set to true");
    assert(privacy.maintenanceMode === true, "maintenanceMode flag set to true");

    // 3. IP Access Firewall
    console.log("\n--- Section 3: IP Access Firewall ---");
    const firewall = await updateIpFirewall(testWebsite.id, {
      mode: "allow",
      ips: ["192.168.1.1", "10.0.0.0/24", "invalid_ip_format", "192.168.1.1"],
    }, testUserA.id);
    assert(firewall.mode === "allow", "Firewall mode set to allow");
    assert(firewall.ips.length === 2, "Duplicate and invalid IPs filtered out");
    assert(firewall.ips.includes("10.0.0.0/24"), "CIDR block format preserved");

    // 4. Security Audit & Malware Heuristics
    console.log("\n--- Section 4: Security Audit & Heuristics ---");
    const auditRes = await runSecurityAudit(testWebsite.id, testUserA.id);
    assert(auditRes.score >= 0 && auditRes.score <= 100, "Security health score is between 0-100");
    assert(["CLEAN", "WARNING", "CRITICAL"].includes(auditRes.status), "Audit status is valid");
    assert(auditRes.checks.length >= 4, "Security audit evaluates at least 4 heuristic checks");

    // 5. Cache Purging
    console.log("\n--- Section 5: Platform Edge Cache Purging ---");
    const cacheRes = await purgeHostingCache(testWebsite.id, testUserA.id);
    assert(cacheRes.success === true, "Cache purge reports success");
    assert(!!cacheRes.purgedAt, "Cache purge records timestamp");

    // 6. Operational Hosting Logs
    console.log("\n--- Section 6: Operational Hosting Logs ---");
    const logsRes = await getHostingLogs(testWebsite.id, testUserA.id);
    assert(Array.isArray(logsRes.logs), "Hosting logs returns an array");
    assert(logsRes.logs.length > 0, "Hosting logs contains aggregated audit and HTTP events");

    // 7. Ownership Transfer
    console.log("\n--- Section 7: Website Ownership Transfer ---");
    // Should fail if transferring to self
    try {
      await transferWebsiteOwnership(testWebsite.id, testUserA.id, testUserA.email);
      assert(false, "Self-transfer should throw error");
    } catch {
      assert(true, "Self-transfer throws error");
    }

    // Should fail if target email doesn't exist
    try {
      await transferWebsiteOwnership(testWebsite.id, testUserA.id, "nonexistent_user_9999@test.com");
      assert(false, "Nonexistent user transfer should throw error");
    } catch {
      assert(true, "Nonexistent target user throws error");
    }

    // Successful transfer to User B
    const transferRes = await transferWebsiteOwnership(testWebsite.id, testUserA.id, testUserB.email);
    assert(transferRes.success === true, "Ownership transfer returns success");
    assert(transferRes.newOwnerEmail === testUserB.email, "Ownership transferred to recipient email");

    const transferredSite = await db.website.findUnique({ where: { id: testWebsite.id } });
    assert(transferredSite.userId === testUserB.id, "Website record in database updated to new owner ID");

  } finally {
    // Clean up test records
    try {
      await db.website.delete({ where: { id: testWebsite.id } });
      await db.user.delete({ where: { id: testUserA.id } });
      await db.user.delete({ where: { id: testUserB.id } });
    } catch {}
  }

  console.log(`\n=================================================`);
  console.log(`PHASE 3 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`=================================================\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
