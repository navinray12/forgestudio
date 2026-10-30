import http from "http";
import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import app from "../app.js";
import { createUserSession } from "../services/session.service.js";
import { getUserSubscription } from "../services/subscription.service.js";
import { IntegrationService } from "../services/integration.service.js";

const db = prisma as any;

function generateStripeSignature(payload: string, secret: string, timestamp?: number): string {
  const t = timestamp ?? Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac("sha256", secret).update(`${t}.${payload}`, "utf8").digest("hex");
  return `t=${t},v1=${signature}`;
}

async function runStripeWebhookTests() {
  console.log("=================================================");
  console.log("MODULE 18.2: SECURE PAYMENT WEBHOOK RECEIVER TESTS");
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

  const testSecret = "whsec_test_secret_forgestudio_secure_webhook_key_12345";
  const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = testSecret;

  let testUser: any = null;
  let starterPlan: any = null;
  let userToken: string = "";

  try {
    // 1. Setup Test User and fetch Starter Plan
    testUser = await db.user.create({
      data: {
        email: `webhook_test_${Date.now()}@forgestudio.dev`,
        fullName: "Webhook Verification User",
        status: "ACTIVE",
        role: "USER",
      },
    });

    const session = await createUserSession(testUser.id);
    userToken = session.token;

    starterPlan = await db.subscriptionPlan.findUnique({
      where: { slug: "starter" },
    });
    if (!starterPlan) {
      const plans: any[] = await prisma.$queryRaw`SELECT * FROM subscription_plans WHERE slug = 'starter' LIMIT 1`;
      starterPlan = plans[0];
    }

    assert(!!starterPlan, "Starter subscription plan exists in DB", JSON.stringify(starterPlan));

    const expectedMinor = Math.round(Number(starterPlan.price) * 100);
    const expectedCurrency = (starterPlan.currency || "INR").toLowerCase();

    // ------------------------------------------------------------------------
    // TEST 1: Reject request when STRIPE_WEBHOOK_SECRET is not configured
    // ------------------------------------------------------------------------
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const dummyPayload = JSON.stringify({ id: "evt_test_1" });
    const resNoSecret = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "t=123,v1=abc",
      },
      body: dummyPayload,
    });
    const dataNoSecret = await resNoSecret.json();
    assert(
      resNoSecret.status === 500 && dataNoSecret.code === "MISSING_WEBHOOK_SECRET",
      "Reject request with 500 when server webhook secret is unconfigured",
      `Status: ${resNoSecret.status}, Code: ${dataNoSecret.code}`
    );

    // Restore secret
    process.env.STRIPE_WEBHOOK_SECRET = testSecret;

    // ------------------------------------------------------------------------
    // TEST 2: Reject request when stripe-signature header is missing
    // ------------------------------------------------------------------------
    const resNoSig = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: dummyPayload,
    });
    const dataNoSig = await resNoSig.json();
    assert(
      resNoSig.status === 400 && dataNoSig.code === "MISSING_SIGNATURE",
      "Reject request with 400 when stripe-signature header is missing",
      `Status: ${resNoSig.status}, Code: ${dataNoSig.code}`
    );

    // ------------------------------------------------------------------------
    // TEST 3: Reject request with malformed stripe-signature header
    // ------------------------------------------------------------------------
    const resMalformedSig = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "invalid_header_without_timestamp_and_v1",
      },
      body: dummyPayload,
    });
    const dataMalformedSig = await resMalformedSig.json();
    assert(
      resMalformedSig.status === 400 && dataMalformedSig.code === "INVALID_SIGNATURE_HEADER",
      "Reject request with 400 when stripe-signature header format is invalid",
      `Status: ${resMalformedSig.status}, Code: ${dataMalformedSig.code}`
    );

    // ------------------------------------------------------------------------
    // TEST 4: Reject request with invalid signature hash
    // ------------------------------------------------------------------------
    const fakeSignature = `t=${Math.floor(Date.now() / 1000)},v1=0000000000000000000000000000000000000000000000000000000000000000`;
    const resBadSig = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": fakeSignature,
      },
      body: dummyPayload,
    });
    const dataBadSig = await resBadSig.json();
    assert(
      resBadSig.status === 400 && dataBadSig.code === "INVALID_SIGNATURE",
      "Reject request with 400 when signature does not match secret HMAC",
      `Status: ${resBadSig.status}, Code: ${dataBadSig.code}`
    );

    // ------------------------------------------------------------------------
    // TEST 5: Reject request with timestamp outside tolerance window (> 300s old)
    // ------------------------------------------------------------------------
    const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 400s ago
    const expiredSig = generateStripeSignature(dummyPayload, testSecret, oldTimestamp);
    const resExpired = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": expiredSig,
      },
      body: dummyPayload,
    });
    const dataExpired = await resExpired.json();
    assert(
      resExpired.status === 400 && dataExpired.code === "TIMESTAMP_OUT_OF_RANGE",
      "Reject replayed/expired request (>300s) with 400 TIMESTAMP_OUT_OF_RANGE",
      `Status: ${resExpired.status}, Code: ${dataExpired.code}`
    );

    // ------------------------------------------------------------------------
    // TEST 6: Reject malformed JSON payload
    // ------------------------------------------------------------------------
    const malformedBody = "{\"type\": \"checkout.session.completed\", broken...";
    const malformedSig = generateStripeSignature(malformedBody, testSecret);
    const resBadJson = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": malformedSig,
      },
      body: malformedBody,
    });
    const dataBadJson = await resBadJson.json();
    assert(
      resBadJson.status === 400 && (dataBadJson.code === "INVALID_JSON" || resBadJson.status === 400),
      "Reject malformed JSON with 400",
      `Status: ${resBadJson.status}`
    );

    // ------------------------------------------------------------------------
    // TEST 7: Payment not actually successful (payment_status !== "paid")
    // ------------------------------------------------------------------------
    const unpaidEventId = `evt_unpaid_${Date.now()}`;
    const unpaidPayload = JSON.stringify({
      id: unpaidEventId,
      type: "checkout.session.completed",
      data: {
        object: {
          id: `cs_unpaid_${Date.now()}`,
          payment_status: "unpaid",
          amount_total: expectedMinor,
          currency: expectedCurrency,
          metadata: {
            userId: testUser.id,
            planSlug: "starter",
            planId: starterPlan.id,
          },
        },
      },
    });
    const unpaidSig = generateStripeSignature(unpaidPayload, testSecret);
    const resUnpaid = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": unpaidSig,
      },
      body: unpaidPayload,
    });
    const dataUnpaid = await resUnpaid.json();
    assert(
      resUnpaid.status === 200 && dataUnpaid.activated === false,
      "Do NOT activate subscription when payment_status is not 'paid'",
      `Activated: ${dataUnpaid.activated}`
    );

    // Verify user is still on default free tier
    const subAfterUnpaid = await getUserSubscription(testUser.id);
    assert(
      subAfterUnpaid.plan.slug === "free",
      "User remains on free plan after unpaid checkout session",
      `Current plan: ${subAfterUnpaid.plan.slug}`
    );

    // ------------------------------------------------------------------------
    // TEST 8: Reject wrong amount
    // ------------------------------------------------------------------------
    const wrongAmountPayload = JSON.stringify({
      id: `evt_wrong_amount_${Date.now()}`,
      type: "checkout.session.completed",
      data: {
        object: {
          id: `cs_wrong_amount_${Date.now()}`,
          payment_status: "paid",
          amount_total: 100, // 100 instead of 49900
          currency: expectedCurrency,
          metadata: {
            userId: testUser.id,
            planSlug: "starter",
            planId: starterPlan.id,
          },
        },
      },
    });
    const wrongAmountSig = generateStripeSignature(wrongAmountPayload, testSecret);
    const resWrongAmount = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": wrongAmountSig,
      },
      body: wrongAmountPayload,
    });
    const dataWrongAmount = await resWrongAmount.json();
    assert(
      resWrongAmount.status === 400 && dataWrongAmount.code === "AMOUNT_MISMATCH",
      "Reject payment with 400 AMOUNT_MISMATCH when amount differs from server plan",
      `Status: ${resWrongAmount.status}, Code: ${dataWrongAmount.code}`
    );

    // ------------------------------------------------------------------------
    // TEST 9: Reject wrong currency
    // ------------------------------------------------------------------------
    const wrongCurrPayload = JSON.stringify({
      id: `evt_wrong_curr_${Date.now()}`,
      type: "checkout.session.completed",
      data: {
        object: {
          id: `cs_wrong_curr_${Date.now()}`,
          payment_status: "paid",
          amount_total: expectedMinor,
          currency: "eur", // EUR instead of INR
          metadata: {
            userId: testUser.id,
            planSlug: "starter",
            planId: starterPlan.id,
          },
        },
      },
    });
    const wrongCurrSig = generateStripeSignature(wrongCurrPayload, testSecret);
    const resWrongCurr = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": wrongCurrSig,
      },
      body: wrongCurrPayload,
    });
    const dataWrongCurr = await resWrongCurr.json();
    assert(
      resWrongCurr.status === 400 && dataWrongCurr.code === "CURRENCY_MISMATCH",
      "Reject payment with 400 CURRENCY_MISMATCH when currency differs from server plan",
      `Status: ${resWrongCurr.status}, Code: ${dataWrongCurr.code}`
    );

    // ------------------------------------------------------------------------
    // TEST 10: Reject unknown user or plan mismatch
    // ------------------------------------------------------------------------
    const fakeUserId = "00000000-0000-0000-0000-000000000000";
    const fakeUserPayload = JSON.stringify({
      id: `evt_fake_user_${Date.now()}`,
      type: "checkout.session.completed",
      data: {
        object: {
          id: `cs_fake_user_${Date.now()}`,
          payment_status: "paid",
          amount_total: expectedMinor,
          currency: expectedCurrency,
          metadata: {
            userId: fakeUserId,
            planSlug: "starter",
            planId: starterPlan.id,
          },
        },
      },
    });
    const fakeUserSig = generateStripeSignature(fakeUserPayload, testSecret);
    const resFakeUser = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": fakeUserSig,
      },
      body: fakeUserPayload,
    });
    const dataFakeUser = await resFakeUser.json();
    assert(
      resFakeUser.status === 404 && dataFakeUser.code === "USER_NOT_FOUND",
      "Reject unknown user with 404 USER_NOT_FOUND",
      `Status: ${resFakeUser.status}, Code: ${dataFakeUser.code}`
    );

    // ------------------------------------------------------------------------
    // TEST 11: Valid signed payment-success event activates subscription
    // ------------------------------------------------------------------------
    const validEventId = `evt_valid_${Date.now()}`;
    const validSessionId = `cs_valid_${Date.now()}`;
    const validPayload = JSON.stringify({
      id: validEventId,
      type: "checkout.session.completed",
      data: {
        object: {
          id: validSessionId,
          payment_status: "paid",
          amount_total: expectedMinor,
          currency: expectedCurrency,
          metadata: {
            userId: testUser.id,
            planSlug: "starter",
            planId: starterPlan.id,
          },
        },
      },
    });
    const validSig = generateStripeSignature(validPayload, testSecret);
    const resValid = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": validSig,
      },
      body: validPayload,
    });
    const dataValid = await resValid.json();
    assert(
      resValid.status === 200 && dataValid.activated === true && dataValid.plan === "starter",
      "Valid signed payment-success event activates paid Starter subscription",
      `Status: ${resValid.status}, Activated: ${dataValid.activated}, Plan: ${dataValid.plan}`
    );

    // Verify DB state: user subscription is ACTIVE and Starter
    const subAfterValid = await getUserSubscription(testUser.id);
    assert(
      subAfterValid.status === "ACTIVE" && subAfterValid.plan.slug === "starter",
      "User subscription status in DB is ACTIVE with Starter plan",
      `Status: ${subAfterValid.status}, Slug: ${subAfterValid.plan.slug}`
    );

    // Verify license synchronized: website limit is 3 for starter
    const licenses: any[] = await prisma.$queryRaw`
      SELECT id, "maxSites", "planSlug", status FROM licenses WHERE "userId" = ${testUser.id}::uuid LIMIT 1
    `;
    assert(
      subAfterValid.plan.websiteLimit === 3 && licenses.length > 0 && licenses[0].maxSites >= 3,
      "User license synchronized to Starter limits (maxSites = 3)",
      `websiteLimit: ${subAfterValid.plan.websiteLimit}, maxSites: ${licenses[0]?.maxSites}`
    );

    // Verify invoice created in billing_invoices
    const invoices: any[] = await prisma.$queryRaw`
      SELECT id, "userId", amount, currency, status, "invoiceNumber"
      FROM billing_invoices
      WHERE "userId" = ${testUser.id}::uuid
      ORDER BY "createdAt" DESC
    `;
    assert(
      invoices.length >= 1 && invoices[0].status === "PAID" && Number(invoices[0].amount) === Number(starterPlan.price),
      "Verified PAID invoice recorded with exact plan amount",
      `Invoices count: ${invoices.length}, Status: ${invoices[0]?.status}, Amount: ${invoices[0]?.amount}`
    );

    // ------------------------------------------------------------------------
    // TEST 12: Duplicate delivery of the exact same event is handled idempotently
    // ------------------------------------------------------------------------
    const resDup = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": validSig,
      },
      body: validPayload,
    });
    const dataDup = await resDup.json();
    assert(
      resDup.status === 200 && dataDup.idempotent === true,
      "Duplicate event delivery returns 200 with idempotent: true",
      `Status: ${resDup.status}, Idempotent: ${dataDup.idempotent}`
    );

    // Verify no duplicate invoice was created
    const invoicesAfterDup: any[] = await prisma.$queryRaw`
      SELECT id FROM billing_invoices WHERE "userId" = ${testUser.id}::uuid
    `;
    assert(
      invoicesAfterDup.length === invoices.length,
      "Duplicate delivery does not create duplicate invoice records",
      `Invoice count unchanged: ${invoicesAfterDup.length}`
    );

    // ------------------------------------------------------------------------
    // TEST 13: Duplicate checkoutSessionId under different eventId is prevented
    // ------------------------------------------------------------------------
    const dupSessionPayload = JSON.stringify({
      id: `evt_different_id_${Date.now()}`,
      type: "checkout.session.completed",
      data: {
        object: {
          id: validSessionId, // Same checkout session ID!
          payment_status: "paid",
          amount_total: expectedMinor,
          currency: expectedCurrency,
          metadata: {
            userId: testUser.id,
            planSlug: "starter",
            planId: starterPlan.id,
          },
        },
      },
    });
    const dupSessionSig = generateStripeSignature(dupSessionPayload, testSecret);
    const resDupSession = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": dupSessionSig,
      },
      body: dupSessionPayload,
    });
    const dataDupSession = await resDupSession.json();
    assert(
      resDupSession.status === 200 && dataDupSession.idempotent === true,
      "Same checkout session under different event ID is deduplicated via idempotency",
      `Status: ${resDupSession.status}, Idempotent: ${dataDupSession.idempotent}`
    );

    // ------------------------------------------------------------------------
    // TEST 14: Direct paid-plan selection remains blocked on /select
    // ------------------------------------------------------------------------
    const resDirectPaid = await fetch(`${baseUrl}/api/v1/subscriptions/select`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `forge_session=${userToken}`,
      },
      body: JSON.stringify({ planSlug: "agency" }),
    });
    const dataDirectPaid = await resDirectPaid.json();
    assert(
      resDirectPaid.status === 400 && dataDirectPaid.code === "PAID_PLAN_REQUIRES_CHECKOUT",
      "Direct paid-plan selection on /select remains blocked",
      `Status: ${resDirectPaid.status}, Code: ${dataDirectPaid.code}`
    );

    // ------------------------------------------------------------------------
    // TEST 15: Free-plan selection still works on /select
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
    assert(
      resDirectFree.status === 200 && dataDirectFree.success === true,
      "Direct free-plan downgrade on /select still works",
      `Status: ${resDirectFree.status}, Success: ${dataDirectFree.success}`
    );

    const subAfterFree = await getUserSubscription(testUser.id);
    assert(
      subAfterFree.plan.slug === "free",
      "User successfully downgraded back to Free plan",
      `Current plan: ${subAfterFree.plan.slug}`
    );

    // ------------------------------------------------------------------------
    // TEST 16: Missing provider credentials never simulate payment success
    // ------------------------------------------------------------------------
    const origPaypalId = process.env.PAYPAL_CLIENT_ID;
    const origPaypalSecret = process.env.PAYPAL_CLIENT_SECRET;
    delete process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_SECRET;

    let paypalFailedProperly = false;
    try {
      await IntegrationService.capturePayPalOrder("ORDER_WITHOUT_CREDS");
    } catch (paypalErr: any) {
      if (paypalErr.message.includes("Missing provider credentials cannot simulate payment success")) {
        paypalFailedProperly = true;
      }
    }
    assert(
      paypalFailedProperly,
      "Missing PayPal credentials strictly reject without simulating payment success",
      "Successfully threw expected error"
    );

    // Restore PayPal env
    if (origPaypalId) process.env.PAYPAL_CLIENT_ID = origPaypalId;
    if (origPaypalSecret) process.env.PAYPAL_CLIENT_SECRET = origPaypalSecret;

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

    // Cleanup test user and invoices
    if (testUser?.id) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM payment_webhook_events WHERE "userId" = $1::uuid`, testUser.id);
        await prisma.$executeRawUnsafe(`DELETE FROM billing_invoices WHERE "userId" = $1::uuid`, testUser.id);
        await prisma.$executeRawUnsafe(`DELETE FROM licenses WHERE "userId" = $1::uuid`, testUser.id);
        await prisma.$executeRawUnsafe(`DELETE FROM user_subscriptions WHERE "userId" = $1::uuid`, testUser.id);
        await prisma.$executeRawUnsafe(`DELETE FROM sessions WHERE "userId" = $1::uuid`, testUser.id);
        await prisma.$executeRawUnsafe(`DELETE FROM users WHERE id = $1::uuid`, testUser.id);
      } catch (cleanupErr) {
        console.warn("Cleanup warning:", cleanupErr);
      }
    }

    server.close();
  }

  console.log("\n=================================================");
  console.log(`WEBHOOK RECEIVER TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runStripeWebhookTests();
