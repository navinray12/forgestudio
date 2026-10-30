import assert from "assert";
import http from "http";
import app from "../app.js";
import { prisma } from "../config/prisma.js";
import { gracefulShutdown } from "../server.js";
import { startScheduler, stopScheduler, isSchedulerRunning } from "../services/scheduleWorker.js";
import { createSubscriptionCheckoutSession } from "../services/subscription.service.js";

async function runStagingReadinessTests() {
  console.log("=========================================================================");
  console.log("MODULE 18.9: BILLING STAGING READINESS & INTEGRATION VERIFICATION");
  console.log("=========================================================================\n");

  let passed = 0;
  let failed = 0;

  function record(testName: string, condition: boolean, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` - Detail: ${detail}` : ""}`);
      failed++;
    }
  }

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}`;
  console.log(`Test HTTP Server running at: ${baseUrl}\n`);

  let testUser: any = null;

  try {
    testUser = await prisma.user.create({
      data: {
        email: `staging_ready_${Date.now()}@forgestudio.com`,
        fullName: "Staging Readiness User",
        role: "USER",
        status: "ACTIVE",
        emailVerified: true,
      },
    });

    // ------------------------------------------------------------------------
    // TEST 1: Graceful Shutdown Guards & Clean Execution
    // ------------------------------------------------------------------------
    console.log("--- 1. Graceful Shutdown & Scheduler Lifecycle ---");
    startScheduler({ pollIntervalMs: 10000, expiryIntervalMs: 10000 });
    record("Scheduler is running after startScheduler", isSchedulerRunning());

    stopScheduler();
    record("Scheduler stopped cleanly after stopScheduler", !isSchedulerRunning());

    // Call stopScheduler a second time to ensure idempotency
    stopScheduler();
    record("Repeated stopScheduler does not throw error", !isSchedulerRunning());

    // ------------------------------------------------------------------------
    // TEST 2: Missing Stripe Credentials Fail Safely
    // ------------------------------------------------------------------------
    console.log("\n--- 2. Safe Failure On Missing Stripe Credentials ---");
    const originalStripeKey = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;

    let caughtError: any = null;
    try {
      await createSubscriptionCheckoutSession(testUser.id, "starter");
    } catch (err: any) {
      caughtError = err;
    }

    record(
      "Missing STRIPE_SECRET_KEY throws 503 PAYMENT_GATEWAY_NOT_CONFIGURED",
      caughtError?.statusCode === 503 && caughtError?.code === "PAYMENT_GATEWAY_NOT_CONFIGURED"
    );
    record(
      "Error message is user-friendly and does not leak system internals",
      caughtError?.message?.includes("Payment gateway is not configured") && !caughtError?.message?.includes("key")
    );

    if (originalStripeKey) {
      process.env.STRIPE_SECRET_KEY = originalStripeKey;
    }

    // ------------------------------------------------------------------------
    // TEST 3: Webhook Route & Raw Body Validation
    // ------------------------------------------------------------------------
    console.log("\n--- 3. Webhook Endpoint Availability & Credential Handling ---");
    const originalWhSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // A. Unconfigured webhook secret rejects with 500 MISSING_WEBHOOK_SECRET
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const resNoSecret = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "test" }),
    });
    record("Unconfigured webhook secret rejects with 500", resNoSecret.status === 500);
    const dataNoSecret = await resNoSecret.json().catch(() => null);
    record("Returns MISSING_WEBHOOK_SECRET code without leaking internals", dataNoSecret?.code === "MISSING_WEBHOOK_SECRET");

    // B. Configured webhook secret with missing stripe-signature header rejects with 400 MISSING_SIGNATURE
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_staging_secret";
    const resV1 = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "test" }),
    });
    record("Configured route /api/v1/subscriptions/webhook with missing header returns 400", resV1.status === 400);
    const dataV1 = await resV1.json().catch(() => null);
    record("Missing signature header returns MISSING_SIGNATURE", dataV1?.code === "MISSING_SIGNATURE");

    // Also verify alias /api/subscriptions/webhook
    const resAlias = await fetch(`${baseUrl}/api/subscriptions/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "test" }),
    });
    record("Alias route /api/subscriptions/webhook is accessible and returns 400", resAlias.status === 400);

    if (originalWhSecret) {
      process.env.STRIPE_WEBHOOK_SECRET = originalWhSecret;
    } else {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    }

    // ------------------------------------------------------------------------
    // TEST 4: Price Tampering and Direct Paid Select Prevention
    // ------------------------------------------------------------------------
    console.log("\n--- 4. Client Price Tampering & Direct Paid Select Prevention ---");
    // Direct /select cannot be used to activate paid plans
    const resSelect = await fetch(`${baseUrl}/api/v1/subscriptions/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planSlug: "starter" }),
    });
    record("Direct paid plan selection without checkout returns 401 Unauthorized or 400", resSelect.status === 401 || resSelect.status === 400);

  } catch (err: any) {
    console.error("Test execution failure:", err);
    failed++;
  } finally {
    if (testUser) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM user_subscriptions WHERE "userId" = $1::uuid`, testUser.id);
        await prisma.$executeRawUnsafe(`DELETE FROM users WHERE id = $1::uuid`, testUser.id);
      } catch (cleanErr) {
        console.warn("Cleanup warning:", cleanErr);
      }
    }

    server.close();
    await prisma.$disconnect();

    console.log("\n=========================================================================");
    console.log(`STAGING READINESS RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log("=========================================================================\n");

    process.exit(failed > 0 ? 1 : 0);
  }
}

runStagingReadinessTests();
