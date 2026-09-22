import { prisma } from "../config/prisma.js";
import {
  generateLicenseKey,
  normalizeDomain,
  isLocalhostDomain,
  activateLicense,
  deactivateLicense,
  transferLicense,
  getUserLicenses,
  syncUserLicenseForPlan,
} from "../services/license.service.js";
import {
  getWhiteLabelConfig,
  updateWhiteLabelConfig,
  resolvePublicBranding,
} from "../services/whitelabel.service.js";
import { getUserUsageSummary } from "../services/usage.service.js";
import {
  changeUserPlan,
  cancelSubscription,
  getUserInvoices,
} from "../services/subscription.service.js";

async function runTests() {
  console.log("=== STARTING LICENSING, BILLING & SUBSCRIPTION TEST SUITE ===");

  // 1. Key generation & format check
  console.log("\n[TEST 1] Testing generateLicenseKey()...");
  const key = generateLicenseKey();
  console.log(`Generated Key: ${key}`);
  if (!/^FS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key)) {
    throw new Error(`Generated key failed regex format validation: ${key}`);
  }
  console.log("✔ License key format is valid (FS-XXXX-XXXX-XXXX-XXXX)");

  // 2. Domain normalization
  console.log("\n[TEST 2] Testing normalizeDomain()...");
  const testUrls = [
    { in: "https://my-agency-site.com/subpath?query=1", expected: "my-agency-site.com" },
    { in: "http://localhost:3000/dashboard", expected: "localhost" },
    { in: "https://DEV.CLIENT-PORTAL.TEST:8080/", expected: "dev.client-portal.test" },
  ];
  for (const t of testUrls) {
    const out = normalizeDomain(t.in);
    if (out !== t.expected) {
      throw new Error(`Domain normalization failed for ${t.in}: expected ${t.expected}, got ${out}`);
    }
  }
  console.log("✔ Domain normalization verified for protocols, ports, paths, and casing");

  // 3. Localhost domain detection
  console.log("\n[TEST 3] Testing isLocalhostDomain()...");
  if (!isLocalhostDomain("localhost")) throw new Error("localhost failed");
  if (!isLocalhostDomain("127.0.0.1")) throw new Error("127.0.0.1 failed");
  if (!isLocalhostDomain("portal.local")) throw new Error("portal.local failed");
  if (!isLocalhostDomain("app.test")) throw new Error("app.test failed");
  if (isLocalhostDomain("production-domain.com")) throw new Error("production-domain falsely flagged as local");
  console.log("✔ Localhost domain detection verified (exempt from site limits)");

  // 4. Setup Test User
  console.log("\n[TEST 4] Creating temporary test user...");
  const testEmail = `licensing-test-${Date.now()}@example.com`;
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      fullName: "License Test User",
      role: "USER",
      status: "ACTIVE",
    },
  });
  console.log(`Created test user: ${user.id} (${user.email})`);

  try {
    // 5. Test Free/Starter Plan Upgrade and License Sync
    console.log("\n[TEST 5] Testing changeUserPlan() with starter plan (3 sites)...");
    const subResult = await changeUserPlan(user.id, "starter");
    console.log("Starter Plan Activated:", subResult.plan.slug);
    console.log("Linked License Key:", subResult.license?.key);
    console.log("Invoice Generated:", subResult.invoiceNumber);

    if (!subResult.license || subResult.license.maxSites !== 3) {
      throw new Error(`License maxSites mismatch: expected 3, got ${subResult.license?.maxSites}`);
    }

    const licenseKey = subResult.license.key;

    // 6. Test Localhost Activation (F-443)
    console.log("\n[TEST 6] Testing localhost license activation (F-443)...");
    const localActivation = await activateLicense(licenseKey, "http://localhost:3000");
    if (!localActivation.activation.isLocalhost) {
      throw new Error("Activation was not marked as localhost");
    }
    console.log("✔ Localhost activation successful (isLocalhost: true)");

    // 7. Test 3 Production Activations (F-440, F-441)
    console.log("\n[TEST 7] Testing production site limits (maxSites: 3)...");
    const site1 = await activateLicense(licenseKey, "https://client-one.com");
    console.log("✔ Site 1 activated:", site1.activation.siteDomain);

    const site2 = await activateLicense(licenseKey, "https://client-two.com");
    console.log("✔ Site 2 activated:", site2.activation.siteDomain);

    const site3 = await activateLicense(licenseKey, "https://client-three.com");
    console.log("✔ Site 3 activated:", site3.activation.siteDomain);

    // 8. Test Exceeding Site Limit (F-441)
    console.log("\n[TEST 8] Testing site limit exceeded error (attempting site 4)...");
    let limitBlocked = false;
    try {
      await activateLicense(licenseKey, "https://client-four.com");
    } catch (err: any) {
      if (err.errorCode === "SITE_LIMIT_EXCEEDED" || err.message?.includes("limit reached")) {
        limitBlocked = true;
        console.log("✔ 4th site correctly rejected with SITE_LIMIT_EXCEEDED:", err.message);
      } else {
        throw err;
      }
    }
    if (!limitBlocked) {
      throw new Error("License site limit was NOT enforced!");
    }

    // 9. Test Deactivation (F-442)
    console.log("\n[TEST 9] Testing site deactivation (F-442)...");
    const deact = await deactivateLicense(licenseKey, "client-one.com");
    console.log("✔ Deactivated:", deact.domain);

    // Slot should now be open! Activate site 4 now
    const site4 = await activateLicense(licenseKey, "https://client-four.com");
    console.log("✔ Replaced slot activated:", site4.activation.siteDomain);

    // 10. Test Transfer License (F-442, F-443)
    console.log("\n[TEST 10] Testing license transfer (F-442)...");
    const transfer = await transferLicense(
      licenseKey,
      "client-two.com",
      "client-two-transferred.com",
      "https://client-two-transferred.com"
    );
    console.log("✔ Transfer succeeded:", transfer.transferredFrom, "->", transfer.transferredTo);

    // 11. Test White-Label Gating on Starter Plan (F-446, F-452)
    console.log("\n[TEST 11] Testing white-label gating on Starter plan...");
    let whiteLabelGated = false;
    try {
      await updateWhiteLabelConfig(user.id, {
        agencyName: "Acme Creative Agency",
        hideForgeBranding: true,
      });
    } catch (err: any) {
      if (err.errorCode === "AGENCY_PLAN_REQUIRED" || err.message?.includes("Agency")) {
        whiteLabelGated = true;
        console.log("✔ White-label access correctly blocked for non-agency user:", err.message);
      } else {
        throw err;
      }
    }
    if (!whiteLabelGated) {
      throw new Error("White-label was not gated for non-agency user!");
    }

    // 12. Upgrade to Agency Plan (F-444, F-452)
    console.log("\n[TEST 12] Upgrading user to Agency plan...");
    const agencyUpgrade = await changeUserPlan(user.id, "agency");
    console.log("✔ Upgraded to Agency plan. Upgraded license maxSites:", agencyUpgrade.license?.maxSites);

    // 13. Update White-Label Config (F-446)
    console.log("\n[TEST 13] Configuring white-label agency branding...");
    const wlResult = await updateWhiteLabelConfig(user.id, {
      agencyName: "Acme Creative Studio",
      logoUrl: "https://acme.agency/logo.svg",
      faviconUrl: "https://acme.agency/favicon.ico",
      hideForgeBranding: true,
      customCss: ".custom-agency-bar { background: #000; }",
    });
    console.log("✔ White-label config saved:", wlResult.config.agencyName);

    // 14. Test Invoices Retrieval (F-444, F-445, F-449)
    console.log("\n[TEST 14] Testing getUserInvoices()...");
    const invoices = await getUserInvoices(user.id);
    console.log(`✔ Found ${invoices.length} billing invoice(s) for user.`);
    if (invoices.length < 2) {
      throw new Error(`Expected at least 2 invoices (starter + agency), got ${invoices.length}`);
    }

    // 15. Test Usage Telemetry (F-450, F-452)
    console.log("\n[TEST 15] Testing getUserUsageSummary()...");
    const usage = await getUserUsageSummary(user.id);
    console.log("✔ Usage Telemetry Summary:");
    console.log("  Plan:", usage.subscription.plan.name);
    console.log("  Websites:", `${usage.quotas.websites.used} / ${usage.quotas.websites.limit}`);
    console.log("  Storage:", `${usage.quotas.storage.usedMb}MB / ${usage.quotas.storage.limitMb}MB`);
    console.log("  Optimization Credits:", usage.quotas.optimizationCredits.remaining);
    console.log("  Licenses:", `${usage.quotas.licensing.activeLicenses} active`);
    console.log("  Production Sites Activated:", usage.quotas.licensing.totalProductionSitesActivated);
    console.log("  Localhost Sites Activated:", usage.quotas.licensing.totalLocalhostSitesActivated);

    // 16. Test Cancel Subscription (F-449)
    console.log("\n[TEST 16] Testing cancelSubscription()...");
    const cancelRes = await cancelSubscription(user.id);
    console.log("✔ Cancel result:", cancelRes.message);
    if (cancelRes.subscription.status !== "CANCELED") {
      throw new Error("Subscription status was not updated to CANCELED");
    }

    console.log("\n🎉 ALL 16 LICENSING, BILLING & SUBSCRIPTION TESTS PASSED SUCCESSFULLY!");
  } finally {
    // Cleanup test user
    console.log("\nCleaning up test user...");
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    console.log("Cleanup complete.");
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ TEST SUITE FAILED:", err);
    process.exit(1);
  });
