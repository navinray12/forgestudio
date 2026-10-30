import http from "http";
import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import app from "../app.js";
import { createUserSession } from "../services/session.service.js";
import {
  getUserSubscription,
  cancelSubscription,
  processSubscriptionExpirations,
  isValidSubscriptionTransition,
} from "../services/subscription.service.js";

const db = prisma as any;

function generateStripeSignature(payload: string, secret: string, timestamp?: number): string {
  const t = timestamp ?? Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac("sha256", secret).update(`${t}.${payload}`, "utf8").digest("hex");
  return `t=${t},v1=${signature}`;
}

async function runSubscriptionLifecycleTests() {
  console.log("=================================================");
  console.log("MODULE 18.3: SUBSCRIPTION LIFECYCLE & CONSISTENCY");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
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

  const testSecret = "whsec_test_lifecycle_secret_key_123456789";
  const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = testSecret;

  let testUser: any = null;
  let userToken: string = "";
  let adminUser: any = null;
  let adminToken: string = "";
  let overdueUser: any = null;
  let starterPlan: any = null;
  let agencyPlan: any = null;

  try {
    // ------------------------------------------------------------------------
    // SETUP: Test User & Plans
    // ------------------------------------------------------------------------
    testUser = await db.user.create({
      data: {
        email: `lifecycle_test_${Date.now()}@forgestudio.dev`,
        fullName: "Lifecycle Testing User",
        status: "ACTIVE",
        role: "USER",
      },
    });

    const session = await createUserSession(testUser.id);
    userToken = session.token;

    adminUser = await db.user.create({
      data: {
        email: `lifecycle_admin_${Date.now()}@forgestudio.dev`,
        fullName: "Lifecycle Admin User",
        status: "ACTIVE",
        role: "ADMIN",
      },
    });
    const adminSession = await createUserSession(adminUser.id);
    adminToken = adminSession.token;

    const plans: any[] = await prisma.$queryRaw`
      SELECT id, name, slug, price, currency, "websiteLimit" FROM subscription_plans
    `;
    starterPlan = plans.find((p) => p.slug === "starter");
    agencyPlan = plans.find((p) => p.slug === "agency");

    assert(!!starterPlan && !!agencyPlan, "Starter and Agency plans exist in database");

    const starterMinor = Math.round(Number(starterPlan.price) * 100);

    // ------------------------------------------------------------------------
    // TEST 1: State Transition Matrix Validation
    // ------------------------------------------------------------------------
    assert(isValidSubscriptionTransition("PENDING", "ACTIVE"), "Transition PENDING -> ACTIVE is valid");
    assert(isValidSubscriptionTransition("ACTIVE", "PAST_DUE"), "Transition ACTIVE -> PAST_DUE is valid");
    assert(isValidSubscriptionTransition("PAST_DUE", "ACTIVE"), "Transition PAST_DUE -> ACTIVE is valid");
    assert(isValidSubscriptionTransition("ACTIVE", "CANCELED"), "Transition ACTIVE -> CANCELED is valid");
    assert(isValidSubscriptionTransition("CANCELED", "EXPIRED"), "Transition CANCELED -> EXPIRED is valid");
    assert(isValidSubscriptionTransition("EXPIRED", "ACTIVE"), "Transition EXPIRED -> ACTIVE is valid");
    assert(!isValidSubscriptionTransition("EXPIRED", "CANCELED"), "Transition EXPIRED -> CANCELED is invalid & rejected");
    assert(!isValidSubscriptionTransition("UNKNOWN", "ACTIVE"), "Transition UNKNOWN -> ACTIVE is invalid & rejected");

    // ------------------------------------------------------------------------
    // TEST 2: Initial payment activation via checkout.session.completed (PENDING/FREE -> ACTIVE)
    // ------------------------------------------------------------------------
    const initialSessionId = `cs_init_${Date.now()}`;
    const initialPayload = JSON.stringify({
      id: `evt_init_${Date.now()}`,
      created: Math.floor(Date.now() / 1000),
      type: "checkout.session.completed",
      data: {
        object: {
          id: initialSessionId,
          payment_status: "paid",
          amount_total: starterMinor,
          currency: (starterPlan.currency || "INR").toLowerCase(),
          metadata: {
            userId: testUser.id,
            planSlug: "starter",
            planId: starterPlan.id,
          },
        },
      },
    });
    const initialSig = generateStripeSignature(initialPayload, testSecret);
    const resInit = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": initialSig },
      body: initialPayload,
    });
    const dataInit = await resInit.json();
    assert(resInit.status === 200 && dataInit.activated === true, "Initial payment transitions user subscription to ACTIVE");

    const subActive = await getUserSubscription(testUser.id);
    assert(subActive.status === "ACTIVE" && subActive.plan.slug === "starter", "User subscription in DB is ACTIVE on starter plan");

    const licensesActive: any[] = await prisma.$queryRaw`
      SELECT "maxSites", "planSlug" FROM licenses WHERE "userId" = ${testUser.id}::uuid LIMIT 1
    `;
    assert(licensesActive[0]?.maxSites === 3, "User license site limit matches starter plan (maxSites = 3)");

    // ------------------------------------------------------------------------
    // TEST 3: Renewal payment via invoice.payment_succeeded extends billing period (ACTIVE -> ACTIVE)
    // ------------------------------------------------------------------------
    const firstPeriodEnd = new Date(subActive.currentPeriodEnd).getTime();
    await new Promise((resolve) => setTimeout(resolve, 50)); // Tiny sleep to advance timestamp

    const renewalEventId = `evt_renew_${Date.now()}`;
    const renewalInvoiceId = `in_renew_${Date.now()}`;
    const renewalPayload = JSON.stringify({
      id: renewalEventId,
      created: Math.floor(Date.now() / 1000),
      type: "invoice.payment_succeeded",
      data: {
        object: {
          id: renewalInvoiceId,
          customer_email: testUser.email,
          amount_paid: starterMinor,
          currency: (starterPlan.currency || "INR").toLowerCase(),
          subscription_details: {
            metadata: {
              userId: testUser.id,
              planSlug: "starter",
            },
          },
        },
      },
    });
    const renewalSig = generateStripeSignature(renewalPayload, testSecret);
    const resRenew = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": renewalSig },
      body: renewalPayload,
    });
    const dataRenew = await resRenew.json();
    assert(resRenew.status === 200 && dataRenew.renewed === true, "Renewal invoice payment succeeds and renews subscription");

    const subRenewed = await getUserSubscription(testUser.id);
    const secondPeriodEnd = new Date(subRenewed.currentPeriodEnd).getTime();
    assert(secondPeriodEnd >= firstPeriodEnd, "Renewal extended currentPeriodEnd");

    // ------------------------------------------------------------------------
    // TEST 4: Duplicate renewal webhook delivery is idempotent
    // ------------------------------------------------------------------------
    const resDupRenew = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": renewalSig },
      body: renewalPayload,
    });
    const dataDupRenew = await resDupRenew.json();
    assert(resDupRenew.status === 200 && dataDupRenew.idempotent === true, "Duplicate renewal webhook is idempotent (idempotent: true)");

    // ------------------------------------------------------------------------
    // TEST 5: Failed renewal payment transitions subscription to PAST_DUE (ACTIVE -> PAST_DUE)
    // ------------------------------------------------------------------------
    const failedInvoiceEventId = `evt_fail_${Date.now()}`;
    const failedPayload = JSON.stringify({
      id: failedInvoiceEventId,
      created: Math.floor(Date.now() / 1000),
      type: "invoice.payment_failed",
      data: {
        object: {
          id: `in_fail_${Date.now()}`,
          customer_email: testUser.email,
          amount_due: starterMinor,
          currency: (starterPlan.currency || "INR").toLowerCase(),
          subscription_details: {
            metadata: {
              userId: testUser.id,
            },
          },
        },
      },
    });
    const failedSig = generateStripeSignature(failedPayload, testSecret);
    const resFail = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": failedSig },
      body: failedPayload,
    });
    const dataFail = await resFail.json();
    assert(
      resFail.status === 200 && dataFail.status === "PAST_DUE",
      "Payment failure transitions subscription to PAST_DUE",
      `Status: ${resFail.status}, Response: ${JSON.stringify(dataFail)}`
    );

    const subPastDue = await getUserSubscription(testUser.id);
    assert(
      subPastDue.status === "PAST_DUE",
      "User subscription status in DB is now PAST_DUE",
      `Current sub status: ${subPastDue.status}`
    );

    // ------------------------------------------------------------------------
    // TEST 6: Payment recovery restores status to ACTIVE (PAST_DUE -> ACTIVE)
    // ------------------------------------------------------------------------
    const recoveryPayload = JSON.stringify({
      id: `evt_recover_${Date.now()}`,
      created: Math.floor(Date.now() / 1000),
      type: "invoice.payment_succeeded",
      data: {
        object: {
          id: `in_recover_${Date.now()}`,
          customer_email: testUser.email,
          amount_paid: starterMinor,
          currency: (starterPlan.currency || "INR").toLowerCase(),
          subscription_details: {
            metadata: {
              userId: testUser.id,
              planSlug: "starter",
            },
          },
        },
      },
    });
    const recoverySig = generateStripeSignature(recoveryPayload, testSecret);
    const resRecover = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": recoverySig },
      body: recoveryPayload,
    });
    const dataRecover = await resRecover.json();
    assert(resRecover.status === 200 && dataRecover.activated === true, "Payment recovery transitions PAST_DUE back to ACTIVE");

    const subRecovered = await getUserSubscription(testUser.id);
    assert(subRecovered.status === "ACTIVE", "User subscription restored to ACTIVE");

    // ------------------------------------------------------------------------
    // TEST 7: Graceful Cancellation retains paid access until currentPeriodEnd (ACTIVE -> CANCELED)
    // ------------------------------------------------------------------------
    const futurePeriodEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days in future
    await prisma.$executeRawUnsafe(
      `UPDATE user_subscriptions SET "currentPeriodEnd" = $1 WHERE "userId" = $2::uuid`,
      futurePeriodEnd,
      testUser.id
    );

    const cancelRes = await cancelSubscription(testUser.id);
    assert(cancelRes.success === true && cancelRes.subscription.status === "CANCELED", "Graceful cancellation marks status as CANCELED");

    // Check user subscription: retains plan and limits while now < currentPeriodEnd
    const subDuringGrace = await getUserSubscription(testUser.id);
    assert(
      subDuringGrace.status === "CANCELED" && subDuringGrace.plan.slug === "starter" && subDuringGrace.plan.websiteLimit === 3,
      "User retains Starter access and site limits during cancellation grace period"
    );

    // ------------------------------------------------------------------------
    // TEST 8: Stale/Out-of-order event cannot resurrect or overwrite a CANCELED subscription
    // ------------------------------------------------------------------------
    const stalePayload = JSON.stringify({
      id: `evt_stale_${Date.now()}`,
      created: Math.floor(Date.now() / 1000) - 3600, // Created 1 hour ago!
      type: "checkout.session.completed",
      data: {
        object: {
          id: `cs_stale_${Date.now()}`,
          payment_status: "paid",
          amount_total: starterMinor,
          currency: (starterPlan.currency || "INR").toLowerCase(),
          metadata: {
            userId: testUser.id,
            planSlug: "starter",
            planId: starterPlan.id,
          },
        },
      },
    });
    const staleSig = generateStripeSignature(stalePayload, testSecret);
    const resStale = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": staleSig },
      body: stalePayload,
    });
    const dataStale = await resStale.json();
    assert(resStale.status === 200 && dataStale.stale === true, "Stale activation event safely ignored (stale: true)");

    const subAfterStale = await getUserSubscription(testUser.id);
    assert(subAfterStale.status === "CANCELED", "Subscription status remains CANCELED despite stale event");

    // ------------------------------------------------------------------------
    // TEST 8B: Timezone-Invariant Epoch Handling & Fresh Checkout Recovery
    // ------------------------------------------------------------------------
    console.log("\n--- TEST 8B: Webhook Timestamp & Timezone Invariance ---");

    // 8B.1: Epoch extraction under UTC
    await prisma.$executeRawUnsafe(`SET TIME ZONE 'UTC'`);
    const utcEpochQuery: any[] = await prisma.$queryRaw`
      SELECT (EXTRACT(EPOCH FROM s."updatedAt") * 1000)::bigint AS "updatedAtMs"
      FROM user_subscriptions s WHERE s."userId" = ${testUser.id}::uuid LIMIT 1
    `;
    const utcEpochMs = Number(utcEpochQuery[0]?.updatedAtMs);
    const nowUtcMs = Date.now();
    assert(
      !isNaN(utcEpochMs) && Math.abs(utcEpochMs - nowUtcMs) < 60000,
      "T8B.1: Epoch conversion is accurate under UTC database session"
    );

    // 8B.2: Epoch extraction under positive-offset timezone (Asia/Kolkata +05:30)
    await prisma.$executeRawUnsafe(`SET TIME ZONE 'Asia/Kolkata'`);
    const kolkataEpochQuery: any[] = await prisma.$queryRaw`
      SELECT (EXTRACT(EPOCH FROM s."updatedAt") * 1000)::bigint AS "updatedAtMs"
      FROM user_subscriptions s WHERE s."userId" = ${testUser.id}::uuid LIMIT 1
    `;
    const kolkataEpochMs = Number(kolkataEpochQuery[0]?.updatedAtMs);
    assert(
      !isNaN(kolkataEpochMs) && kolkataEpochMs === utcEpochMs,
      "T8B.2: Epoch conversion remains identical under Asia/Kolkata (+05:30) without timezone drift"
    );

    // Reset session timezone to default
    await prisma.$executeRawUnsafe(`SET TIME ZONE DEFAULT`);

    // 8B.3: Fresh legitimate checkout event after cancellation is NOT rejected as stale
    const freshPayload = JSON.stringify({
      id: `evt_fresh_${Date.now()}`,
      created: Math.floor(Date.now() / 1000), // Fresh event created right now!
      type: "checkout.session.completed",
      data: {
        object: {
          id: `cs_fresh_${Date.now()}`,
          payment_status: "paid",
          amount_total: starterMinor,
          currency: (starterPlan.currency || "INR").toLowerCase(),
          metadata: {
            userId: testUser.id,
            planSlug: "starter",
            planId: starterPlan.id,
          },
        },
      },
    });
    const freshSig = generateStripeSignature(freshPayload, testSecret);
    const resFresh = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": freshSig },
      body: freshPayload,
    });
    const dataFresh = await resFresh.json();
    assert(
      resFresh.status === 200 && dataFresh.activated === true && dataFresh.stale === undefined,
      "T8B.3: Fresh legitimate checkout event after cancellation is NOT rejected as stale"
    );

    const subAfterFresh = await getUserSubscription(testUser.id);
    assert(
      subAfterFresh.status === "ACTIVE",
      "T8B.4: Fresh checkout successfully reactivates subscription to ACTIVE"
    );

    // Cancel again to return to CANCELED status for subsequent expiry tests
    await cancelSubscription(testUser.id);

    // ------------------------------------------------------------------------
    // TEST 9: Scheduled Expiry processing reconciles overdue subscription (CANCELED/ACTIVE -> EXPIRED)
    // ------------------------------------------------------------------------
    // Artificially simulate that currentPeriodEnd has now passed
    const pastPeriodEnd = new Date(Date.now() - 3600 * 1000); // 1 hour in past
    await prisma.$executeRawUnsafe(
      `UPDATE user_subscriptions SET "currentPeriodEnd" = $1 WHERE "userId" = $2::uuid`,
      pastPeriodEnd,
      testUser.id
    );

    const expiryResult = await processSubscriptionExpirations();
    assert(
      expiryResult.processedCount >= 1 && expiryResult.expiredUserIds.includes(testUser.id),
      "processSubscriptionExpirations successfully identified and processed expired subscription"
    );

    const subAfterExpiry = await getUserSubscription(testUser.id);
    assert(
      subAfterExpiry.plan.slug === "free" && subAfterExpiry.plan.websiteLimit === 1,
      "Subscription downgraded to Free plan with websiteLimit = 1 after expiry"
    );

    const licensesAfterExpiry: any[] = await prisma.$queryRaw`
      SELECT "maxSites", "planSlug" FROM licenses WHERE "userId" = ${testUser.id}::uuid LIMIT 1
    `;
    assert(
      licensesAfterExpiry[0]?.maxSites === 1 && licensesAfterExpiry[0]?.planSlug === "free",
      "User license strictly reduced to 1 site on expiry (cannot retain paid limits indefinitely)"
    );

    // ------------------------------------------------------------------------
    // TEST 10: Repeated execution of processSubscriptionExpirations is safe & idempotent
    // ------------------------------------------------------------------------
    const repeatExpiry = await processSubscriptionExpirations();
    assert(repeatExpiry.processedCount === 0, "Repeated execution of processSubscriptionExpirations finds 0 overdue items (idempotent)");

    // ------------------------------------------------------------------------
    // TEST 11: Immediate cancellation option downgrades immediately to Free
    // ------------------------------------------------------------------------
    // Temporarily upgrade to Agency
    await prisma.$executeRawUnsafe(
      `UPDATE user_subscriptions
       SET "planId" = $1::uuid,
           status = 'ACTIVE',
           "currentPeriodStart" = NOW(),
           "currentPeriodEnd" = NOW() + INTERVAL '30 days',
           "updatedAt" = NOW()
       WHERE "userId" = $2::uuid`,
      agencyPlan.id,
      testUser.id
    );
    const agencyLicenseRows: any[] = await prisma.$queryRaw`
      UPDATE licenses SET "maxSites" = 50, "planSlug" = 'agency' WHERE "userId" = ${testUser.id}::uuid RETURNING *
    `;
    assert(agencyLicenseRows[0]?.maxSites === 50, "User temporarily upgraded to Agency with 50 sites");

    // Perform immediate cancellation
    const immediateCancel = await cancelSubscription(testUser.id, { immediate: true });
    assert(
      immediateCancel.success === true && immediateCancel.subscription.status === "CANCELED",
      "Immediate cancellation succeeds"
    );

    const subAfterImmediate = await getUserSubscription(testUser.id);
    assert(
      subAfterImmediate.plan.slug === "free" && subAfterImmediate.plan.websiteLimit === 1,
      "Immediate cancellation immediately reverts plan to Free (1 site)"
    );

    const licensesAfterImmediate: any[] = await prisma.$queryRaw`
      SELECT "maxSites" FROM licenses WHERE "userId" = ${testUser.id}::uuid LIMIT 1
    `;
    assert(
      licensesAfterImmediate[0]?.maxSites === 1,
      "License site limit immediately reset to 1 site"
    );

    // ------------------------------------------------------------------------
    // TEST 12: Invalid status transition rejected
    // ------------------------------------------------------------------------
    // User is currently EXPIRED or free. Transition to CANCELED should be rejected.
    await prisma.$executeRawUnsafe(
      `UPDATE user_subscriptions SET status = 'EXPIRED' WHERE "userId" = $1::uuid`,
      testUser.id
    );

    let invalidTransitionRejected = false;
    try {
      await cancelSubscription(testUser.id);
    } catch (err: any) {
      if (err.code === "INVALID_STATUS_TRANSITION") {
        invalidTransitionRejected = true;
      }
    }
    assert(invalidTransitionRejected, "Invalid transition from EXPIRED to CANCELED rejected with INVALID_STATUS_TRANSITION");

    // ------------------------------------------------------------------------
    // TEST 13: Direct paid plan selection on /select remains blocked
    // ------------------------------------------------------------------------
    const resDirectPaid = await fetch(`${baseUrl}/api/v1/subscriptions/select`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `forge_session=${userToken}`,
      },
      body: JSON.stringify({ planSlug: "starter" }),
    });
    const dataDirectPaid = await resDirectPaid.json();
    assert(
      resDirectPaid.status === 400 && dataDirectPaid.code === "PAID_PLAN_REQUIRES_CHECKOUT",
      "Direct paid-plan selection remains blocked on /select"
    );

    // ------------------------------------------------------------------------
    // TEST 14: Free plan selection still works on /select
    // ------------------------------------------------------------------------
    const resDirectFree = await fetch(`${baseUrl}/api/v1/subscriptions/select`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `forge_session=${userToken}`,
      },
      body: JSON.stringify({ planSlug: "free" }),
    });
    const dataDirectFree = await resDirectFree.json();
    assert(resDirectFree.status === 200 && dataDirectFree.success === true, "Direct free-plan selection works on /select");

    // ------------------------------------------------------------------------
    // TEST 15: Security & Authorization for /process-expirations (Feature 18.3 P0 Fix 1)
    // ------------------------------------------------------------------------
    console.log("\n--- TEST 15: Expiration Endpoint Security & Authorization ---");

    // 15.1: Unauthenticated requests are rejected with 401
    const resUnauth = await fetch(`${baseUrl}/api/v1/subscriptions/process-expirations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const dataUnauth = await resUnauth.json();
    assert(
      resUnauth.status === 401 && dataUnauth.success === false,
      "T15.1: Unauthenticated request to /process-expirations is rejected with 401 Unauthorized"
    );

    // 15.2: Ordinary authenticated users (role: 'USER') are rejected with 403
    const resOrdinary = await fetch(`${baseUrl}/api/v1/subscriptions/process-expirations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `forge_session=${userToken}`,
      },
    });
    const dataOrdinary = await resOrdinary.json();
    assert(
      resOrdinary.status === 403 && dataOrdinary.error?.code === "FORBIDDEN",
      "T15.2: Ordinary authenticated user is rejected from /process-expirations with 403 FORBIDDEN"
    );

    // 15.3: Setup an overdue subscription and verify unauthorized requests did not execute expiration
    overdueUser = await db.user.create({
      data: {
        email: `overdue_target_${Date.now()}@forgestudio.dev`,
        fullName: "Overdue Target User",
        status: "ACTIVE",
        role: "USER",
      },
    });

    await prisma.$executeRawUnsafe(
      `INSERT INTO user_subscriptions (id, "userId", "planId", status, "currentPeriodStart", "currentPeriodEnd", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1::uuid, $2::uuid, 'ACTIVE', NOW() - INTERVAL '35 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '35 days', NOW())`,
      overdueUser.id,
      starterPlan.id
    );

    await prisma.$executeRawUnsafe(
      `INSERT INTO licenses (id, key, "userId", "planSlug", "maxSites", status, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2::uuid, 'starter', 3, 'ACTIVE', NOW(), NOW())`,
      `FS-TEST-${Date.now()}-OVERDUE`,
      overdueUser.id
    );

    // Retry unauthenticated & ordinary requests
    await fetch(`${baseUrl}/api/v1/subscriptions/process-expirations`, { method: "POST" });
    await fetch(`${baseUrl}/api/v1/subscriptions/process-expirations`, {
      method: "POST",
      headers: { Cookie: `forge_session=${userToken}` },
    });

    // Check that overdue user is STILL ACTIVE (unauthorized requests did not trigger expiration)
    const subCheckBefore: any[] = await prisma.$queryRaw`
      SELECT status FROM user_subscriptions WHERE "userId" = ${overdueUser.id}::uuid LIMIT 1
    `;
    assert(
      subCheckBefore[0]?.status === "ACTIVE",
      "T15.3: Unauthorized requests do not execute the expiration service (overdue subscription remains untouched)"
    );

    // 15.4: Authorized admin caller can trigger batch processing (200 OK)
    const resAdmin = await fetch(`${baseUrl}/api/v1/subscriptions/process-expirations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `forge_session=${adminToken}`,
      },
    });
    const dataAdmin = await resAdmin.json();
    assert(
      resAdmin.status === 200 && dataAdmin.success === true,
      "T15.4: Authorized admin caller successfully triggers /process-expirations with 200 OK"
    );

    // 15.5: Response does NOT disclose user IDs and returns safe status info
    assert(
      dataAdmin.data?.expiredUserIds === undefined &&
      typeof dataAdmin.data?.processedCount === "number" &&
      dataAdmin.data?.processedCount >= 1 &&
      dataAdmin.data?.status === "COMPLETED",
      "T15.5: Response does not disclose user IDs and returns safe aggregate counts"
    );

    // 15.6: Confirm that authorized execution actually transitioned the overdue subscription
    const subCheckAfter: any[] = await prisma.$queryRaw`
      SELECT status FROM user_subscriptions WHERE "userId" = ${overdueUser.id}::uuid LIMIT 1
    `;
    assert(
      subCheckAfter[0]?.status === "EXPIRED",
      "T15.6: Authorized batch execution successfully expired the overdue subscription"
    );

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
    // Restore original Stripe secret
    if (originalSecret !== undefined) {
      process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
    } else {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    }

    // Cleanup all created test users
    const userIdsToClean = [testUser?.id, adminUser?.id, overdueUser?.id].filter(Boolean);
    for (const uid of userIdsToClean) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM payment_webhook_events WHERE "userId" = $1::uuid`, uid);
        await prisma.$executeRawUnsafe(`DELETE FROM billing_invoices WHERE "userId" = $1::uuid`, uid);
        await prisma.$executeRawUnsafe(`DELETE FROM license_activations WHERE "licenseId" IN (SELECT id FROM licenses WHERE "userId" = $1::uuid)`, uid);
        await prisma.$executeRawUnsafe(`DELETE FROM licenses WHERE "userId" = $1::uuid`, uid);
        await prisma.$executeRawUnsafe(`DELETE FROM user_subscriptions WHERE "userId" = $1::uuid`, uid);
        await prisma.$executeRawUnsafe(`DELETE FROM sessions WHERE "userId" = $1::uuid`, uid);
        await prisma.$executeRawUnsafe(`DELETE FROM users WHERE id = $1::uuid`, uid);
      } catch (cleanupErr) {
        console.warn("Cleanup warning:", cleanupErr);
      }
    }

    server.close();
  }

  console.log("\n=================================================");
  console.log(`LIFECYCLE TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================\n");

  process.exit(failed > 0 ? 1 : 0);
}

runSubscriptionLifecycleTests();
