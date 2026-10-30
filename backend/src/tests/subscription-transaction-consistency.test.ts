import assert from "assert";
import http from "http";
import crypto from "crypto";
import app from "../app.js";
import { prisma } from "../config/prisma.js";
import { createUserSession } from "../services/session.service.js";
import {
  changeUserPlan,
  cancelSubscription,
  getUserSubscription,
  getUserInvoices,
  processSubscriptionExpirations,
} from "../services/subscription.service.js";
import { syncUserLicenseForPlan } from "../services/license.service.js";

function generateStripeSignature(payload: string, secret: string, timestamp?: number): string {
  const t = timestamp ?? Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac("sha256", secret).update(`${t}.${payload}`, "utf8").digest("hex");
  return `t=${t},v1=${signature}`;
}

async function runConsistencyTests() {
  console.log("=================================================");
  console.log("MODULE 18.5: SUBSCRIPTION TRANSACTION CONSISTENCY");
  console.log("=================================================\n");

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
  console.log(`Test HTTP Server listening at: ${baseUrl}\n`);

  const testSecret = "whsec_test_consistency_123456789";
  const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = testSecret;

  let userA: any = null;
  let userB: any = null;
  let testPlan: any = null;

  try {
    // ------------------------------------------------------------------------
    // SETUP: Test Users and Plans
    // ------------------------------------------------------------------------
    userA = await prisma.user.create({
      data: {
        email: `consistency_a_${Date.now()}@forgestudio.dev`,
        fullName: "Consistency User A",
        role: "USER",
        status: "ACTIVE",
        emailVerified: true,
      },
    });

    userB = await prisma.user.create({
      data: {
        email: `consistency_b_${Date.now()}@forgestudio.dev`,
        fullName: "Consistency User B",
        role: "USER",
        status: "ACTIVE",
        emailVerified: true,
      },
    });

    // Create a dedicated 5-site Pro plan
    testPlan = await prisma.subscriptionPlan.create({
      data: {
        name: "Pro 5-Site",
        slug: `pro5-${Date.now()}`,
        price: 799,
        currency: "INR",
        billingInterval: "monthly",
        websiteLimit: 5,
        storageLimitMb: 5000,
        aiCreditLimit: 150,
        features: ["5 Websites", "Consistency Testing"],
        isActive: true,
      },
    });

    // ------------------------------------------------------------------------
    // TEST 1: Atomic changeUserPlan updates subscription, invoice and license together
    // ------------------------------------------------------------------------
    const initialChange = await changeUserPlan(userA.id, testPlan.slug);
    record("T1.1: changeUserPlan succeeds atomically", initialChange.status === "ACTIVE");

    const subA = await getUserSubscription(userA.id);
    record("T1.2: User subscription is updated to new plan", subA.plan.slug === testPlan.slug);

    const licenseA: any[] = await prisma.$queryRaw`
      SELECT * FROM licenses WHERE "userId" = ${userA.id}::uuid ORDER BY "createdAt" DESC LIMIT 1
    `;
    record(
      "T1.3: User license limits synchronized to plan (maxSites = 5)",
      licenseA[0]?.maxSites === 5 && licenseA[0]?.planSlug === testPlan.slug
    );

    const invoicesA: any[] = await prisma.$queryRaw`
      SELECT * FROM billing_invoices WHERE "userId" = ${userA.id}::uuid ORDER BY "createdAt" DESC
    `;
    record("T1.4: Verified billing invoice generated with exact plan amount", Number(invoicesA[0]?.amount) === 799);

    // ------------------------------------------------------------------------
    // TEST 2: Transaction rollback prevents partial updates when an error occurs
    // ------------------------------------------------------------------------
    // Capture state of User B (starts on free plan)
    const subBInitial = await getUserSubscription(userB.id);
    const initialInvoicesB = await getUserInvoices(userB.id);
    const initialLicenseB: any[] = await prisma.$queryRaw`
      SELECT * FROM licenses WHERE "userId" = ${userB.id}::uuid LIMIT 1
    `;

    // Attempt a transaction where license is updated but invoice fails intentionally (simulated partial failure)
    let rollbackOccurred = false;
    try {
      await prisma.$transaction(async (tx: any) => {
        // Step 1: sync license within tx (e.g. attempting to grant 20 sites)
        await syncUserLicenseForPlan(userB.id, "enterprise", 20, false, tx);

        // Step 2: update user subscription
        await tx.$executeRawUnsafe(
          `UPDATE user_subscriptions SET status = 'ACTIVE', "updatedAt" = NOW() WHERE "userId" = $1::uuid`,
          userB.id
        );

        // Step 3: Trigger intentional constraint failure (e.g. duplicate or invalid primary key)
        throw new Error("SIMULATED_TRANSACTION_FAILURE");
      });
    } catch (err: any) {
      if (err.message === "SIMULATED_TRANSACTION_FAILURE") {
        rollbackOccurred = true;
      }
    }

    record("T2.1: Transaction caught error and initiated rollback", rollbackOccurred);

    // Verify User B's license was NOT mutated (rolled back)
    const licenseBAfterRollback: any[] = await prisma.$queryRaw`
      SELECT * FROM licenses WHERE "userId" = ${userB.id}::uuid ORDER BY "createdAt" DESC LIMIT 1
    `;
    record(
      "T2.2: License changes rolled back completely (did not retain 20 sites)",
      licenseBAfterRollback[0]?.maxSites === (initialLicenseB[0]?.maxSites || 1) &&
        licenseBAfterRollback[0]?.planSlug !== "enterprise",
      `Sites: ${licenseBAfterRollback[0]?.maxSites}, Plan: ${licenseBAfterRollback[0]?.planSlug}`
    );

    // Verify User B's invoices count did not increase
    const invoicesBAfterRollback = await getUserInvoices(userB.id);
    record(
      "T2.3: Invoices count unchanged after transaction rollback",
      invoicesBAfterRollback.length === initialInvoicesB.length
    );

    // ------------------------------------------------------------------------
    // TEST 3: Webhook payment retry recovers safely after failure without duplicating state
    // ------------------------------------------------------------------------
    const retrySessionId = `cs_retry_${Date.now()}`;
    const retryPayload = JSON.stringify({
      id: `evt_retry_${Date.now()}`,
      created: Math.floor(Date.now() / 1000),
      type: "checkout.session.completed",
      data: {
        object: {
          id: retrySessionId,
          payment_status: "paid",
          amount_total: 79900,
          currency: "inr",
          metadata: {
            userId: userB.id,
            planSlug: testPlan.slug,
            planId: testPlan.id,
          },
        },
      },
    });
    const retrySig = generateStripeSignature(retryPayload, testSecret);

    // First attempt: succeeds and activates User B
    const resAttempt1 = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": retrySig },
      body: retryPayload,
    });
    const dataAttempt1 = await resAttempt1.json();
    record(
      "T3.1: First webhook delivery activates subscription and syncs license atomically",
      resAttempt1.status === 200 && dataAttempt1.activated === true
    );

    const subBActive = await getUserSubscription(userB.id);
    const licenseBActive: any[] = await prisma.$queryRaw`
      SELECT * FROM licenses WHERE "userId" = ${userB.id}::uuid ORDER BY "createdAt" DESC LIMIT 1
    `;
    record(
      "T3.2: User B is ACTIVE on testPlan with 5 sites license",
      subBActive.plan.slug === testPlan.slug && licenseBActive[0]?.maxSites === 5
    );

    // Second attempt (simulating Stripe retry or network redelivery): must be idempotent
    const resAttempt2 = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": retrySig },
      body: retryPayload,
    });
    const dataAttempt2 = await resAttempt2.json();
    record(
      "T3.3: Webhook retry returns 200 OK with idempotent: true",
      resAttempt2.status === 200 && dataAttempt2.idempotent === true
    );

    // Verify invoice was not duplicated
    const invoicesBAfterRetry: any[] = await prisma.$queryRaw`
      SELECT id FROM billing_invoices WHERE "userId" = ${userB.id}::uuid AND "paymentReference" = ${retrySessionId}
    `;
    record("T3.4: Exactly 1 invoice exists for the paymentReference (no duplicates)", invoicesBAfterRetry.length === 1);

    // ------------------------------------------------------------------------
    // TEST 4: Immediate cancellation downgrades plan and resets license limits atomically
    // ------------------------------------------------------------------------
    const cancelResult = await cancelSubscription(userB.id, { immediate: true });
    record("T4.1: Immediate cancellation succeeds", cancelResult.success === true);

    const subBCanceled = await getUserSubscription(userB.id);
    record("T4.2: Subscription status is CANCELED/reverted to Free", subBCanceled.status === "CANCELED");

    const licenseBCanceled: any[] = await prisma.$queryRaw`
      SELECT * FROM licenses WHERE "userId" = ${userB.id}::uuid ORDER BY "createdAt" DESC LIMIT 1
    `;
    record(
      "T4.3: User license limits strictly reset to 1 site on free plan",
      licenseBCanceled[0]?.maxSites === 1 && licenseBCanceled[0]?.planSlug === "free"
    );

    // ------------------------------------------------------------------------
    // TEST 5: Expiration sweep resets plan and license limits consistently
    // ------------------------------------------------------------------------
    // Set user A's subscription to past due / overdue
    await prisma.$executeRawUnsafe(
      `UPDATE user_subscriptions 
       SET "currentPeriodEnd" = NOW() - INTERVAL '1 day', status = 'CANCELED' 
       WHERE "userId" = $1::uuid`,
      userA.id
    );

    const expiryResult = await processSubscriptionExpirations();
    record(
      "T5.1: processSubscriptionExpirations processes overdue subscription",
      expiryResult.processedCount >= 1 && expiryResult.expiredUserIds.includes(userA.id)
    );

    const subAExpired = await getUserSubscription(userA.id);
    record("T5.2: User A subscription downgraded to Free plan", subAExpired.plan.slug === "free");

    const licenseAExpired: any[] = await prisma.$queryRaw`
      SELECT * FROM licenses WHERE "userId" = ${userA.id}::uuid ORDER BY "createdAt" DESC LIMIT 1
    `;
    record(
      "T5.3: User A license limits reduced strictly to 1 site on free plan",
      licenseAExpired[0]?.maxSites === 1 && licenseAExpired[0]?.planSlug === "free"
    );

  } catch (err: any) {
    console.error("Consistency Test Error:", err);
    record("ConsistencyTestSuite", false, err.message);
  } finally {
    // Cleanup
    if (userA) {
      await prisma.$executeRawUnsafe(`DELETE FROM payment_webhook_events WHERE "userId" = $1::uuid`, userA.id).catch(() => {});
      await prisma.$executeRawUnsafe(`DELETE FROM billing_invoices WHERE "userId" = $1::uuid`, userA.id).catch(() => {});
      await prisma.$executeRawUnsafe(`DELETE FROM user_subscriptions WHERE "userId" = $1::uuid`, userA.id).catch(() => {});
      await prisma.$executeRawUnsafe(`DELETE FROM licenses WHERE "userId" = $1::uuid`, userA.id).catch(() => {});
      await prisma.user.delete({ where: { id: userA.id } }).catch(() => {});
    }
    if (userB) {
      await prisma.$executeRawUnsafe(`DELETE FROM payment_webhook_events WHERE "userId" = $1::uuid`, userB.id).catch(() => {});
      await prisma.$executeRawUnsafe(`DELETE FROM billing_invoices WHERE "userId" = $1::uuid`, userB.id).catch(() => {});
      await prisma.$executeRawUnsafe(`DELETE FROM user_subscriptions WHERE "userId" = $1::uuid`, userB.id).catch(() => {});
      await prisma.$executeRawUnsafe(`DELETE FROM licenses WHERE "userId" = $1::uuid`, userB.id).catch(() => {});
      await prisma.user.delete({ where: { id: userB.id } }).catch(() => {});
    }
    if (testPlan) {
      await prisma.subscriptionPlan.delete({ where: { id: testPlan.id } }).catch(() => {});
    }

    if (originalSecret) {
      process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
    } else {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    }

    server.close();
  }

  console.log("\n=================================================");
  console.log(`CONSISTENCY TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================\n");

  process.exit(failed > 0 ? 1 : 0);
}

runConsistencyTests();
