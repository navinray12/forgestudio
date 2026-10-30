import assert from "assert";
import http from "http";
import crypto from "crypto";
import app from "../app.js";
import { prisma } from "../config/prisma.js";
import { getUserSubscription } from "../services/subscription.service.js";

function generateStripeSignature(payload: string, secret: string, timestamp?: number): string {
  const t = timestamp ?? Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac("sha256", secret).update(`${t}.${payload}`, "utf8").digest("hex");
  return `t=${t},v1=${signature}`;
}

async function runComprehensiveTests() {
  console.log("=========================================================================");
  console.log("MODULE 18.6 & 18.7: STRIPE MAPPING & WEBHOOK RELIABILITY AUDIT TEST SUITE");
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

  const testSecret = "whsec_reliability_test_secret_987654321";
  const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = testSecret;

  let testUserA: any = null;
  let testUserB: any = null;
  let testUserC: any = null;
  let testPlan: any = null;

  try {
    // ------------------------------------------------------------------------
    // SETUP: Test Users and Plans
    // ------------------------------------------------------------------------
    testUserA = await prisma.user.create({
      data: {
        email: `map_rel_a_${Date.now()}@forgestudio.com`,
        fullName: "Reliability User A",
        role: "USER",
        status: "ACTIVE",
        emailVerified: true,
      },
    });

    testUserB = await prisma.user.create({
      data: {
        email: `map_rel_b_${Date.now()}@forgestudio.com`,
        fullName: "Reliability User B",
        role: "USER",
        status: "ACTIVE",
        emailVerified: true,
      },
    });

    testUserC = await prisma.user.create({
      data: {
        email: `map_rel_c_${Date.now()}@forgestudio.com`,
        fullName: "Reliability User C",
        role: "USER",
        status: "ACTIVE",
        emailVerified: true,
      },
    });

    const planSlug = `pro-audit-${Date.now()}`;
    testPlan = await prisma.subscriptionPlan.create({
      data: {
        name: "Pro Audit Plan",
        slug: planSlug,
        price: 2999,
        currency: "INR",
        billingInterval: "monthly",
        websiteLimit: 10,
        storageLimitMb: 5000,
        aiCreditLimit: 150,
        features: ["10 Websites", "Reliability Audit", "Priority"],
        isActive: true,
      },
    });

    console.log(`Created test users: User A (${testUserA.id}), User B (${testUserB.id}), User C (${testUserC.id})`);
    console.log(`Created test plan: ${testPlan.slug} (${testPlan.id})\n`);

    const postWebhook = async (payloadObj: any, customSig?: string) => {
      const payloadString = typeof payloadObj === "string" ? payloadObj : JSON.stringify(payloadObj);
      const signature = customSig !== undefined ? customSig : generateStripeSignature(payloadString, testSecret);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (signature !== null) {
        headers["stripe-signature"] = signature;
      }
      const res = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
        method: "POST",
        headers,
        body: payloadString,
      });
      const data = await res.json().catch(() => null);
      return { status: res.status, data };
    };

    // ------------------------------------------------------------------------
    // TEST 1: Backward compatibility: User without Stripe IDs has NULL fields
    // ------------------------------------------------------------------------
    console.log("--- 1. Backward Compatibility of Default Subscriptions ---");
    const subInitC = await getUserSubscription(testUserC.id);
    record("Initial subscription has null stripeCustomerId", subInitC.stripeCustomerId === null);
    record("Initial subscription has null stripeSubscriptionId", subInitC.stripeSubscriptionId === null);
    record("Initial subscription status is ACTIVE on free plan", subInitC.plan.slug === "free");

    // ------------------------------------------------------------------------
    // TEST 2: Checkout completion saves Stripe IDs reliably
    // ------------------------------------------------------------------------
    console.log("\n--- 2. Checkout Completion Persists Stripe IDs Reliably ---");
    const custIdA = `cus_rel_a_${Date.now()}`;
    const subIdA = `sub_rel_a_${Date.now()}`;
    const csIdA = `cs_rel_a_${Date.now()}`;
    const evtCheckoutA = `evt_chk_a_${Date.now()}`;

    const checkoutPayloadA = {
      id: evtCheckoutA,
      type: "checkout.session.completed",
      data: {
        object: {
          id: csIdA,
          payment_status: "paid",
          customer: custIdA,
          subscription: subIdA,
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

    const resCheckoutA = await postWebhook(checkoutPayloadA);
    record("Checkout webhook response is 200", resCheckoutA.status === 200);
    record("Checkout webhook activated subscription", resCheckoutA.data?.activated === true);

    const subAfterChk = await getUserSubscription(testUserA.id);
    record("UserSubscription stores correct stripeCustomerId", subAfterChk.stripeCustomerId === custIdA);
    record("UserSubscription stores correct stripeSubscriptionId", subAfterChk.stripeSubscriptionId === subIdA);
    record("UserSubscription status is ACTIVE on Pro plan", subAfterChk.plan.slug === testPlan.slug && subAfterChk.status === "ACTIVE");

    // Also set User B with a distinct Stripe Customer & Subscription ID
    const custIdB = `cus_rel_b_${Date.now()}`;
    const subIdB = `sub_rel_b_${Date.now()}`;
    const csIdB = `cs_rel_b_${Date.now()}`;
    const evtCheckoutB = `evt_chk_b_${Date.now()}`;

    const checkoutPayloadB = {
      id: evtCheckoutB,
      type: "checkout.session.completed",
      data: {
        object: {
          id: csIdB,
          payment_status: "paid",
          customer: custIdB,
          subscription: subIdB,
          client_reference_id: testUserB.id,
          amount_total: 299900,
          currency: "inr",
          metadata: {
            userId: testUserB.id,
            planId: testPlan.id,
            planSlug: testPlan.slug,
          },
        },
      },
    };
    await postWebhook(checkoutPayloadB);

    // ------------------------------------------------------------------------
    // TEST 3: Subscription update resolves correct user using persisted Stripe IDs
    // ------------------------------------------------------------------------
    console.log("\n--- 3. Subscription Update Resolves Correct User via Stored IDs (Zero Metadata) ---");
    const evtUpdA = `evt_upd_a_${Date.now()}`;
    const updPayloadA = {
      id: evtUpdA,
      type: "customer.subscription.updated",
      data: {
        object: {
          id: subIdA,
          customer: custIdA,
          status: "past_due",
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
        },
      },
    };

    const resUpdA = await postWebhook(updPayloadA);
    record("Subscription update returned 200", resUpdA.status === 200);
    record("Subscription update resolved User A", resUpdA.data?.userId === testUserA.id);

    const subAfterUpdA = await getUserSubscription(testUserA.id);
    record("User A status updated to PAST_DUE", subAfterUpdA.status === "PAST_DUE");
    const subBCheck = await getUserSubscription(testUserB.id);
    record("User B status remains untouched (ACTIVE)", subBCheck.status === "ACTIVE");

    // ------------------------------------------------------------------------
    // TEST 4: Subscription deletion resolves correct user
    // ------------------------------------------------------------------------
    console.log("\n--- 4. Subscription Deletion Resolves Correct User ---");
    const evtDelA = `evt_del_a_${Date.now()}`;
    const delPayloadA = {
      id: evtDelA,
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: subIdA,
          customer: custIdA,
          status: "canceled",
        },
      },
    };

    const resDelA = await postWebhook(delPayloadA);
    record("Subscription deletion returned 200", resDelA.status === 200);
    record("Subscription deletion resolved User A", resDelA.data?.userId === testUserA.id);

    const subAfterDelA = await getUserSubscription(testUserA.id);
    record("User A status transitioned to CANCELED", subAfterDelA.status === "CANCELED" || subAfterDelA.status === "EXPIRED");

    // ------------------------------------------------------------------------
    // TEST 5: Customer/subscription ownership mismatch is rejected safely
    // ------------------------------------------------------------------------
    console.log("\n--- 5. Cross-Tenant Ownership Mismatch Protection ---");
    // Craft an event with User A's subId but User B's customerId
    const evtMismatch = `evt_mismatch_${Date.now()}`;
    const mismatchPayload = {
      id: evtMismatch,
      type: "customer.subscription.updated",
      data: {
        object: {
          id: subIdA, // Belongs to User A
          customer: custIdB, // Belongs to User B!
          status: "active",
        },
      },
    };

    const resMismatch = await postWebhook(mismatchPayload);
    record("Mismatch event returned 200 (not unhandled 500 crash)", resMismatch.status === 200);
    record("Mismatch was detected and not processed", resMismatch.data?.processed === false && resMismatch.data?.mismatch === true);

    // Verify neither user's subscription was corrupted
    const checkAAfterMismatch = await getUserSubscription(testUserA.id);
    const checkBAfterMismatch = await getUserSubscription(testUserB.id);
    record("User A still has User A's customer ID", checkAAfterMismatch.stripeCustomerId === custIdA);
    record("User B still has User B's customer ID", checkBAfterMismatch.stripeCustomerId === custIdB);

    // Also test checkout session ownership mismatch: User C tries to claim User B's subId
    const evtCheckoutTheft = `evt_theft_${Date.now()}`;
    const checkoutTheftPayload = {
      id: evtCheckoutTheft,
      type: "checkout.session.completed",
      data: {
        object: {
          id: `cs_theft_${Date.now()}`,
          payment_status: "paid",
          customer: custIdB, // Belongs to User B!
          subscription: subIdB, // Belongs to User B!
          client_reference_id: testUserC.id,
          amount_total: 299900,
          currency: "inr",
          metadata: {
            userId: testUserC.id,
            planId: testPlan.id,
            planSlug: testPlan.slug,
          },
        },
      },
    };
    const resTheft = await postWebhook(checkoutTheftPayload);
    record("Checkout ID theft is safely rejected with 400", resTheft.status === 400);
    record("Error code indicates ownership mismatch", resTheft.data?.code?.includes("MISMATCH"));

    // ------------------------------------------------------------------------
    // TEST 6: Unknown subscription IDs do not modify unrelated users
    // ------------------------------------------------------------------------
    console.log("\n--- 6. Unknown Subscription IDs Handled Safely ---");
    const evtUnknown = `evt_unkn_${Date.now()}`;
    const unknownPayload = {
      id: evtUnknown,
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_completely_nonexistent_88888",
          customer: "cus_completely_nonexistent_88888",
          status: "canceled",
        },
      },
    };
    const resUnknown = await postWebhook(unknownPayload);
    record("Unknown subscription returned 200 OK", resUnknown.status === 200);
    record("Unknown subscription was safely ignored (processed: false)", resUnknown.data?.processed === false);

    // ------------------------------------------------------------------------
    // TEST 7: Metadata fallback works only when validated
    // ------------------------------------------------------------------------
    console.log("\n--- 7. Validated Metadata Fallback ---");
    // New subscription where Stripe IDs are not in DB yet, but metadata.userId is valid User C
    const newCustC = `cus_brand_new_c_${Date.now()}`;
    const newSubC = `sub_brand_new_c_${Date.now()}`;
    const evtMetaC = `evt_meta_c_${Date.now()}`;
    const metaPayloadC = {
      id: evtMetaC,
      type: "invoice.payment_succeeded",
      data: {
        object: {
          id: `in_meta_c_${Date.now()}`,
          subscription: newSubC,
          customer: newCustC,
          amount_paid: 299900,
          currency: "inr",
          metadata: {
            userId: testUserC.id,
          },
        },
      },
    };
    // Prior to this, User C had no active paid subscription record
    // When sent without active subscription, it is ignored safely
    const resMetaC = await postWebhook(metaPayloadC);
    record("Metadata invoice for user with no active subscription handled safely", resMetaC.status === 200);

    // ------------------------------------------------------------------------
    // TEST 8: Repeated delivery of the same event (Idempotency)
    // ------------------------------------------------------------------------
    console.log("\n--- 8. Repeated Delivery Idempotency ---");
    const resDupCheckout = await postWebhook(checkoutPayloadA);
    record("Repeated delivery returned 200 OK", resDupCheckout.status === 200);
    record("Repeated delivery detected idempotent: true", resDupCheckout.data?.idempotent === true);

    // ------------------------------------------------------------------------
    // TEST 9: Concurrent delivery of the same event
    // ------------------------------------------------------------------------
    console.log("\n--- 9. Concurrent Delivery Handling Under High Contention ---");
    const concurrentEvtId = `evt_concurrent_${Date.now()}`;
    const concurrentCsId = `cs_concurrent_${Date.now()}`;
    const concurrentCust = `cus_conc_${Date.now()}`;
    const concurrentSub = `sub_conc_${Date.now()}`;

    const concurrentPayload = {
      id: concurrentEvtId,
      type: "checkout.session.completed",
      data: {
        object: {
          id: concurrentCsId,
          payment_status: "paid",
          customer: concurrentCust,
          subscription: concurrentSub,
          client_reference_id: testUserC.id,
          amount_total: 299900,
          currency: "inr",
          metadata: {
            userId: testUserC.id,
            planId: testPlan.id,
            planSlug: testPlan.slug,
          },
        },
      },
    };

    // Dispatch 5 requests concurrently in parallel
    const parallelResponses = await Promise.all([
      postWebhook(concurrentPayload),
      postWebhook(concurrentPayload),
      postWebhook(concurrentPayload),
      postWebhook(concurrentPayload),
      postWebhook(concurrentPayload),
    ]);

    const all200 = parallelResponses.every((r) => r.status === 200);
    record("All 5 concurrent requests returned HTTP 200", all200);

    // Check payment_webhook_events table: exactly 1 event record
    const recordedEvents: any[] = await prisma.$queryRaw`
      SELECT id FROM payment_webhook_events WHERE "eventId" = ${concurrentEvtId}
    `;
    record("Exactly 1 payment_webhook_events record exists for the concurrent event", recordedEvents.length === 1, `Count: ${recordedEvents.length}`);

    // Check billing_invoices table: exactly 1 invoice created
    const recordedInvoices: any[] = await prisma.$queryRaw`
      SELECT id FROM billing_invoices WHERE "paymentReference" = ${concurrentCsId}
    `;
    record("Exactly 1 billing_invoice record exists (no duplicate invoices under concurrency)", recordedInvoices.length === 1, `Count: ${recordedInvoices.length}`);

    // ------------------------------------------------------------------------
    // TEST 10: Out-of-Order / Stale Events Safeguard
    // ------------------------------------------------------------------------
    console.log("\n--- 10. Out-of-Order & Stale Event Protection Across All Lifecycle Handlers ---");
    // 10A: Reactivate User A with a fresh checkout
    const freshCustA = `cus_fresh_a_${Date.now()}`;
    const freshSubA = `sub_fresh_a_${Date.now()}`;
    const freshEvtA = `evt_fresh_a_${Date.now()}`;
    const freshPayloadA = {
      id: freshEvtA,
      type: "checkout.session.completed",
      data: {
        object: {
          id: `cs_fresh_${Date.now()}`,
          payment_status: "paid",
          customer: freshCustA,
          subscription: freshSubA,
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
    await postWebhook(freshPayloadA);
    const subActiveFresh = await getUserSubscription(testUserA.id);
    record("User A reactivated to ACTIVE status", subActiveFresh.status === "ACTIVE");

    // 10B: An old, delayed customer.subscription.deleted event arrives from 1 hour ago
    const staleDelEvt = `evt_stale_del_${Date.now()}`;
    const staleDelPayload = {
      id: staleDelEvt,
      created: Math.floor(Date.now() / 1000) - 3600, // 1 hour old!
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: freshSubA,
          customer: freshCustA,
          status: "canceled",
        },
      },
    };
    const resStaleDel = await postWebhook(staleDelPayload);
    record("Stale deletion event returned 200 OK", resStaleDel.status === 200);
    record("Stale deletion event was ignored as stale (stale: true)", resStaleDel.data?.stale === true);

    const subAfterStaleDel = await getUserSubscription(testUserA.id);
    record("User A subscription remains ACTIVE (not corrupted by stale deletion)", subAfterStaleDel.status === "ACTIVE");

    // 10C: An old, delayed customer.subscription.updated event arrives from 1 hour ago
    const staleUpdEvt = `evt_stale_upd_${Date.now()}`;
    const staleUpdPayload = {
      id: staleUpdEvt,
      created: Math.floor(Date.now() / 1000) - 3600, // 1 hour old!
      type: "customer.subscription.updated",
      data: {
        object: {
          id: freshSubA,
          customer: freshCustA,
          status: "past_due",
        },
      },
    };
    const resStaleUpd = await postWebhook(staleUpdPayload);
    record("Stale update event returned 200 OK", resStaleUpd.status === 200);
    record("Stale update event was ignored as stale", resStaleUpd.data?.stale === true);

    const subAfterStaleUpd = await getUserSubscription(testUserA.id);
    record("User A subscription remains ACTIVE after stale update", subAfterStaleUpd.status === "ACTIVE");

    // ------------------------------------------------------------------------
    // TEST 11: Webhook Signature Verification and Tamper Protection
    // ------------------------------------------------------------------------
    console.log("\n--- 11. Webhook Signature Verification & Tamper Protection ---");
    const testDummyPayload = JSON.stringify({ id: `evt_dummy_${Date.now()}`, type: "checkout.session.completed" });

    // Missing signature header
    const resNoSig = await postWebhook(testDummyPayload, null as any);
    record("Missing stripe-signature header rejected with 400", resNoSig.status === 400);

    // Tampered / invalid signature
    const resBadSig = await postWebhook(testDummyPayload, "t=123456,v1=deadbeefcafebabe");
    record("Tampered signature rejected with 400 INVALID_SIGNATURE", resBadSig.status === 400);

    // Expired timestamp (>300 seconds)
    const oldTimestamp = Math.floor(Date.now() / 1000) - 400;
    const oldSig = generateStripeSignature(testDummyPayload, testSecret, oldTimestamp);
    const resOldSig = await postWebhook(testDummyPayload, oldSig);
    record("Replayed event (>300s) rejected with 400 TIMESTAMP_OUT_OF_RANGE", resOldSig.status === 400);

    // ------------------------------------------------------------------------
    // TEST 12: Unsupported Event Types Handled Safely
    // ------------------------------------------------------------------------
    console.log("\n--- 12. Safe Handling of Unsupported Event Types ---");
    const resUnsupported = await postWebhook({
      id: `evt_unsupp_${Date.now()}`,
      type: "payment_intent.created",
      data: { object: { id: "pi_123" } },
    });
    record("Unsupported event type returns 200 OK (so Stripe does not retry endlessly)", resUnsupported.status === 200);
    record("Unsupported event acknowledges processed: false", resUnsupported.data?.processed === false);

  } catch (err: any) {
    console.error("Unexpected test suite error:", err);
    failed++;
  } finally {
    // ------------------------------------------------------------------------
    // CLEANUP
    // ------------------------------------------------------------------------
    console.log("\n--- Cleaning up test artifacts ---");
    try {
      const uids = [testUserA?.id, testUserB?.id, testUserC?.id].filter(Boolean);
      for (const uid of uids) {
        await prisma.$executeRawUnsafe(`DELETE FROM payment_webhook_events WHERE "userId" = $1::uuid`, uid);
        await prisma.$executeRawUnsafe(`DELETE FROM billing_invoices WHERE "userId" = $1::uuid`, uid);
        await prisma.$executeRawUnsafe(`DELETE FROM user_subscriptions WHERE "userId" = $1::uuid`, uid);
        await prisma.$executeRawUnsafe(`DELETE FROM licenses WHERE "userId" = $1::uuid`, uid);
        await prisma.$executeRawUnsafe(`DELETE FROM sessions WHERE "userId" = $1::uuid`, uid);
        await prisma.$executeRawUnsafe(`DELETE FROM users WHERE id = $1::uuid`, uid);
      }
      if (testPlan) {
        await prisma.$executeRawUnsafe(`DELETE FROM subscription_plans WHERE id = $1::uuid`, testPlan.id);
      }
    } catch (cleanErr) {
      console.warn("Cleanup warning:", cleanErr);
    }

    process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
    server.close();
    await prisma.$disconnect();

    console.log("\n=========================================================================");
    console.log(`COMPREHENSIVE AUDIT RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log("=========================================================================\n");

    process.exit(failed > 0 ? 1 : 0);
  }
}

runComprehensiveTests();
