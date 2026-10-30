import assert from "assert";
import http from "http";
import crypto from "crypto";
import app from "../app.js";
import { prisma } from "../config/prisma.js";
import { createUserSession } from "../services/session.service.js";
import { getUserSubscription } from "../services/subscription.service.js";

function generateStripeSignature(payload: string, secret: string, timestamp?: number): string {
  const t = timestamp ?? Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac("sha256", secret).update(`${t}.${payload}`, "utf8").digest("hex");
  return `t=${t},v1=${signature}`;
}

async function runMappingTests() {
  console.log("=========================================================");
  console.log("MODULE 18.6: STRIPE CUSTOMER & SUBSCRIPTION MAPPING TEST");
  console.log("=========================================================\n");

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

  const testSecret = "whsec_test_mapping_secret_123456789";
  const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = testSecret;

  let testUserA: any = null;
  let testUserB: any = null;
  let testPlan: any = null;

  try {
    // ------------------------------------------------------------------------
    // SETUP: Test Users and Plan
    // ------------------------------------------------------------------------
    const userAEmail = `mapping_a_${Date.now()}@forgestudio.com`;
    testUserA = await prisma.user.create({
      data: {
        email: userAEmail,
        fullName: "Mapping Test User A",
        role: "USER",
        status: "ACTIVE",
        emailVerified: true,
      },
    });

    const userBEmail = `mapping_b_${Date.now()}@forgestudio.com`;
    testUserB = await prisma.user.create({
      data: {
        email: userBEmail,
        fullName: "Mapping Test User B",
        role: "USER",
        status: "ACTIVE",
        emailVerified: true,
      },
    });

    const planSlug = `pro-mapping-${Date.now()}`;
    testPlan = await prisma.subscriptionPlan.create({
      data: {
        name: "Pro Mapping Plan",
        slug: planSlug,
        price: 2999,
        currency: "INR",
        billingInterval: "monthly",
        websiteLimit: 10,
        storageLimitMb: 10000,
        aiCreditLimit: 300,
        features: ["10 Websites", "Stripe ID mapping", "Priority support"],
        isActive: true,
      },
    });

    console.log(`Created test users: ${testUserA.id}, ${testUserB.id}`);
    console.log(`Created test plan: ${testPlan.slug} (${testPlan.id})\n`);

    // Helper to send signed webhook
    const postWebhook = async (payloadObj: any) => {
      const payloadString = JSON.stringify(payloadObj);
      const signature = generateStripeSignature(payloadString, testSecret);
      const res = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": signature,
        },
        body: payloadString,
      });
      const data = await res.json().catch(() => null);
      return { status: res.status, data };
    };

    // ------------------------------------------------------------------------
    // TEST 1: Backward compatibility: default user subscription has NULL stripe IDs
    // ------------------------------------------------------------------------
    console.log("--- 1. Backward Compatibility & NULL Stripe IDs ---");
    const initialSubB = await getUserSubscription(testUserB.id);
    record(
      "Initial default subscription returns null stripeCustomerId",
      initialSubB.stripeCustomerId === null,
      `Got: ${initialSubB.stripeCustomerId}`
    );
    record(
      "Initial default subscription returns null stripeSubscriptionId",
      initialSubB.stripeSubscriptionId === null,
      `Got: ${initialSubB.stripeSubscriptionId}`
    );

    // ------------------------------------------------------------------------
    // TEST 2: checkout.session.completed persists stripeCustomerId & stripeSubscriptionId
    // ------------------------------------------------------------------------
    console.log("\n--- 2. Checkout Persists Stripe Identifiers ---");
    const stripeCustIdA = `cus_test_map_${Date.now()}`;
    const stripeSubIdA = `sub_test_map_${Date.now()}`;
    const checkoutSessionId = `cs_test_${Date.now()}`;
    const checkoutEventId = `evt_checkout_${Date.now()}`;

    const checkoutPayload = {
      id: checkoutEventId,
      type: "checkout.session.completed",
      data: {
        object: {
          id: checkoutSessionId,
          payment_status: "paid",
          customer: stripeCustIdA,
          subscription: stripeSubIdA,
          client_reference_id: testUserA.id,
          amount_total: 299900,
          currency: "inr",
          metadata: {
            userId: testUserA.id,
            planId: testPlan.id,
            planSlug: testPlan.slug,
          },
        },
      },
    };

    const checkoutRes = await postWebhook(checkoutPayload);
    record("Checkout webhook response is 200", checkoutRes.status === 200);
    record("Checkout webhook processed successfully", checkoutRes.data?.processed === true);

    const subAfterCheckout = await getUserSubscription(testUserA.id);
    record(
      "UserSubscription persisted stripeCustomerId",
      subAfterCheckout.stripeCustomerId === stripeCustIdA,
      `Expected: ${stripeCustIdA}, Got: ${subAfterCheckout.stripeCustomerId}`
    );
    record(
      "UserSubscription persisted stripeSubscriptionId",
      subAfterCheckout.stripeSubscriptionId === stripeSubIdA,
      `Expected: ${stripeSubIdA}, Got: ${subAfterCheckout.stripeSubscriptionId}`
    );
    record(
      "UserSubscription status is ACTIVE",
      subAfterCheckout.status === "ACTIVE"
    );

    // ------------------------------------------------------------------------
    // TEST 3: customer.subscription.updated resolves user WITHOUT metadata
    // ------------------------------------------------------------------------
    console.log("\n--- 3. customer.subscription.updated Resolved via Stored Subscription ID (Zero Metadata) ---");
    const updateEventId = `evt_sub_upd_${Date.now()}`;
    const updatePayloadNoMeta = {
      id: updateEventId,
      type: "customer.subscription.updated",
      data: {
        object: {
          id: stripeSubIdA, // Authoritative Stripe Subscription ID
          customer: stripeCustIdA,
          status: "past_due",
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
          // CRITICAL: metadata is completely absent!
        },
      },
    };

    const updateRes = await postWebhook(updatePayloadNoMeta);
    record("Subscription update webhook without metadata returned 200", updateRes.status === 200);
    record("Subscription update webhook processed successfully", updateRes.data?.processed === true);
    record("Subscription update resolved to correct user", updateRes.data?.userId === testUserA.id);

    const subAfterUpdate = await getUserSubscription(testUserA.id);
    record(
      "UserSubscription status updated to PAST_DUE",
      subAfterUpdate.status === "PAST_DUE",
      `Got: ${subAfterUpdate.status}`
    );

    // ------------------------------------------------------------------------
    // TEST 4: customer.subscription.updated resolves via Customer ID when new sub ID arrives
    // ------------------------------------------------------------------------
    console.log("\n--- 4. Resolution via Stored Customer ID ---");
    const newStripeSubIdA = `sub_renewed_${Date.now()}`;
    const updateViaCustEventId = `evt_sub_cust_${Date.now()}`;
    const updateViaCustPayload = {
      id: updateViaCustEventId,
      type: "customer.subscription.updated",
      data: {
        object: {
          id: newStripeSubIdA,
          customer: stripeCustIdA, // Matches User A's stored stripeCustomerId
          status: "active",
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
          // Zero metadata
        },
      },
    };

    const updateViaCustRes = await postWebhook(updateViaCustPayload);
    record("Update via Customer ID returned 200", updateViaCustRes.status === 200);
    record("Update via Customer ID processed successfully", updateViaCustRes.data?.processed === true);
    record("Update resolved to User A", updateViaCustRes.data?.userId === testUserA.id);

    const subAfterCustUpdate = await getUserSubscription(testUserA.id);
    record(
      "UserSubscription status restored to ACTIVE",
      subAfterCustUpdate.status === "ACTIVE",
      `Got: ${subAfterCustUpdate.status}`
    );
    record(
      "UserSubscription updated to new stripeSubscriptionId",
      subAfterCustUpdate.stripeSubscriptionId === newStripeSubIdA,
      `Expected: ${newStripeSubIdA}, Got: ${subAfterCustUpdate.stripeSubscriptionId}`
    );

    // ------------------------------------------------------------------------
    // TEST 5: invoice.payment_succeeded resolves via stored subscription ID (Zero Metadata)
    // ------------------------------------------------------------------------
    console.log("\n--- 5. invoice.payment_succeeded Resolved via Stored Subscription ID ---");
    const invoiceSuccessEventId = `evt_inv_succ_${Date.now()}`;
    const invoiceNumber = `in_stripe_test_${Date.now()}`;
    const invoiceSuccessPayload = {
      id: invoiceSuccessEventId,
      type: "invoice.payment_succeeded",
      data: {
        object: {
          id: invoiceNumber,
          number: `INV-MOCK-${Date.now()}`,
          subscription: newStripeSubIdA, // Matches stored subscription ID
          customer: stripeCustIdA,
          amount_paid: 299900,
          currency: "inr",
          period_start: Math.floor(Date.now() / 1000),
          period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
          // Zero metadata, zero customer_email
        },
      },
    };

    const invSuccRes = await postWebhook(invoiceSuccessPayload);
    record("Invoice payment_succeeded without metadata returned 200", invSuccRes.status === 200);
    record("Invoice payment_succeeded processed successfully", invSuccRes.data?.processed === true);
    record("Invoice payment_succeeded renewed subscription", invSuccRes.data?.renewed === true);
    record("Invoice payment_succeeded resolved User A", invSuccRes.data?.userId === testUserA.id);

    // ------------------------------------------------------------------------
    // TEST 6: invoice.payment_failed resolves via stored subscription ID (Zero Metadata)
    // ------------------------------------------------------------------------
    console.log("\n--- 6. invoice.payment_failed Resolved via Stored Subscription ID ---");
    const invoiceFailEventId = `evt_inv_fail_${Date.now()}`;
    const invoiceFailPayload = {
      id: invoiceFailEventId,
      type: "invoice.payment_failed",
      data: {
        object: {
          id: `in_fail_${Date.now()}`,
          subscription: newStripeSubIdA, // Matches stored subscription ID
          customer: stripeCustIdA,
          amount_due: 299900,
          currency: "inr",
          // Zero metadata, zero customer_email
        },
      },
    };

    const invFailRes = await postWebhook(invoiceFailPayload);
    record("Invoice payment_failed returned 200", invFailRes.status === 200);
    record("Invoice payment_failed processed successfully", invFailRes.data?.processed === true);
    record("Invoice payment_failed transitioned to PAST_DUE", invFailRes.data?.status === "PAST_DUE");

    const subAfterFail = await getUserSubscription(testUserA.id);
    record(
      "UserSubscription status is PAST_DUE",
      subAfterFail.status === "PAST_DUE",
      `Got: ${subAfterFail.status}`
    );

    // ------------------------------------------------------------------------
    // TEST 7: customer.subscription.deleted resolves via stored subscription ID (Zero Metadata)
    // ------------------------------------------------------------------------
    console.log("\n--- 7. customer.subscription.deleted Resolved via Stored Subscription ID ---");
    const subDeletedEventId = `evt_sub_del_${Date.now()}`;
    const subDeletedPayload = {
      id: subDeletedEventId,
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: newStripeSubIdA, // Matches stored subscription ID
          customer: stripeCustIdA,
          status: "canceled",
          // Zero metadata
        },
      },
    };

    const subDelRes = await postWebhook(subDeletedPayload);
    record("Subscription deleted without metadata returned 200", subDelRes.status === 200);
    record("Subscription deleted processed successfully", subDelRes.data?.processed === true);
    record("Subscription deleted resolved User A", subDelRes.data?.userId === testUserA.id);

    const subAfterDel = await getUserSubscription(testUserA.id);
    record(
      "UserSubscription status changed to CANCELED",
      subAfterDel.status === "CANCELED" || subAfterDel.status === "EXPIRED",
      `Got: ${subAfterDel.status}`
    );

    // ------------------------------------------------------------------------
    // TEST 8: Unknown Stripe Customer / Subscription IDs handled safely
    // ------------------------------------------------------------------------
    console.log("\n--- 8. Safe Handling of Unknown Stripe Identifiers ---");
    const unknownSubEventId = `evt_sub_unknown_${Date.now()}`;
    const unknownSubPayload = {
      id: unknownSubEventId,
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_completely_unknown_99999",
          customer: "cus_completely_unknown_99999",
          status: "canceled",
        },
      },
    };

    const unknownRes = await postWebhook(unknownSubPayload);
    record("Unknown subscription ID returned 200", unknownRes.status === 200);
    record("Unknown subscription ID was safely not processed", unknownRes.data?.processed === false);

    const unknownInvEventId = `evt_inv_unknown_${Date.now()}`;
    const unknownInvPayload = {
      id: unknownInvEventId,
      type: "invoice.payment_succeeded",
      data: {
        object: {
          id: `in_unknown_${Date.now()}`,
          subscription: "sub_nonexistent_12345",
          customer: "cus_nonexistent_12345",
          amount_paid: 1000,
        },
      },
    };

    const unknownInvRes = await postWebhook(unknownInvPayload);
    record("Unknown invoice subscription returned 200", unknownInvRes.status === 200);
    record("Unknown invoice was safely ignored", unknownInvRes.data?.processed === false);

    // ------------------------------------------------------------------------
    // TEST 9: Idempotency of duplicate deliveries
    // ------------------------------------------------------------------------
    console.log("\n--- 9. Duplicate Webhook Idempotency ---");
    const duplicateRes = await postWebhook(checkoutPayload);
    record("Duplicate event delivery returned 200", duplicateRes.status === 200);
    record("Duplicate event delivery detected idempotency", duplicateRes.data?.idempotent === true);

  } catch (err: any) {
    console.error("Unexpected test failure:", err);
    failed++;
  } finally {
    // Teardown
    console.log("\n--- Cleaning up test artifacts ---");
    try {
      if (testUserA) {
        await prisma.$executeRawUnsafe(`DELETE FROM payment_webhook_events WHERE "userId" = $1::uuid`, testUserA.id);
        await prisma.$executeRawUnsafe(`DELETE FROM billing_invoices WHERE "userId" = $1::uuid`, testUserA.id);
        await prisma.$executeRawUnsafe(`DELETE FROM user_subscriptions WHERE "userId" = $1::uuid`, testUserA.id);
        await prisma.$executeRawUnsafe(`DELETE FROM licenses WHERE "userId" = $1::uuid`, testUserA.id);
        await prisma.$executeRawUnsafe(`DELETE FROM sessions WHERE "userId" = $1::uuid`, testUserA.id);
        await prisma.$executeRawUnsafe(`DELETE FROM users WHERE id = $1::uuid`, testUserA.id);
      }
      if (testUserB) {
        await prisma.$executeRawUnsafe(`DELETE FROM payment_webhook_events WHERE "userId" = $1::uuid`, testUserB.id);
        await prisma.$executeRawUnsafe(`DELETE FROM billing_invoices WHERE "userId" = $1::uuid`, testUserB.id);
        await prisma.$executeRawUnsafe(`DELETE FROM user_subscriptions WHERE "userId" = $1::uuid`, testUserB.id);
        await prisma.$executeRawUnsafe(`DELETE FROM licenses WHERE "userId" = $1::uuid`, testUserB.id);
        await prisma.$executeRawUnsafe(`DELETE FROM sessions WHERE "userId" = $1::uuid`, testUserB.id);
        await prisma.$executeRawUnsafe(`DELETE FROM users WHERE id = $1::uuid`, testUserB.id);
      }
      if (testPlan) {
        await prisma.$executeRawUnsafe(`DELETE FROM subscription_plans WHERE id = $1::uuid`, testPlan.id);
      }
    } catch (cleanupErr) {
      console.warn("Teardown error:", cleanupErr);
    }

    process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
    server.close();
    await prisma.$disconnect();

    console.log("\n=========================================================");
    console.log(`MODULE 18.6 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("=========================================================\n");

    process.exit(failed > 0 ? 1 : 0);
  }
}

runMappingTests();

