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

async function runRecurringBillingTests() {
  console.log("=================================================");
  console.log("MODULE 18.4: STRIPE RECURRING & BILLING PERIODS");
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

  const testSecret = "whsec_test_recurring_billing_123456789";
  const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = testSecret;

  const originalStripeKey = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = "sk_test_mock_recurring_secret";

  let testUser: any = null;
  let userToken: string = "";
  let annualPlan: any = null;
  let oneTimePlan: any = null;

  try {
    // ------------------------------------------------------------------------
    // SETUP: Users & Plans
    // ------------------------------------------------------------------------
    const userEmail = `billing_test_${Date.now()}@forgestudio.com`;
    testUser = await prisma.user.create({
      data: {
        email: userEmail,
        fullName: "Billing Recurring Test User",
        role: "USER",
        status: "ACTIVE",
        emailVerified: true,
      },
    });

    const session = await createUserSession(testUser.id);
    userToken = session.token;
    const authHeaders = {
      "Content-Type": "application/json",
      Cookie: `forge_session=${userToken}`,
    };

    // Create an annual subscription plan
    const annualSlug = `pro-annual-${Date.now()}`;
    annualPlan = await prisma.subscriptionPlan.create({
      data: {
        name: "Pro Annual",
        slug: annualSlug,
        price: 9999,
        currency: "INR",
        billingInterval: "yearly",
        websiteLimit: 15,
        storageLimitMb: 15000,
        aiCreditLimit: 500,
        features: ["15 Websites", "Annual billing discount", "Priority support"],
        isActive: true,
      },
    });

    // Create a one-time plan
    const oneTimeSlug = `lifetime-${Date.now()}`;
    oneTimePlan = await prisma.subscriptionPlan.create({
      data: {
        name: "Lifetime Pass",
        slug: oneTimeSlug,
        price: 14999,
        currency: "INR",
        billingInterval: "one_time",
        websiteLimit: 5,
        storageLimitMb: 5000,
        aiCreditLimit: 100,
        features: ["5 Websites", "One-time purchase"],
        isActive: true,
      },
    });

    // ------------------------------------------------------------------------
    // TEST 1: Monthly recurring plan checkout uses mode: "subscription" & interval: "month"
    // ------------------------------------------------------------------------
    const originalFetch = globalThis.fetch;
    let interceptedFormBody: string = "";

    globalThis.fetch = async (input: any, init?: any) => {
      const url = typeof input === "string" ? input : input?.url || "";
      if (url.includes("api.stripe.com/v1/checkout/sessions")) {
        interceptedFormBody = init?.body?.toString() || "";
        return new Response(
          JSON.stringify({
            id: `cs_mock_${Date.now()}`,
            url: `https://checkout.stripe.com/c/pay/cs_mock_${Date.now()}`,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return originalFetch(input, init);
    };

    const monthlyCheckoutRes = await fetch(`${baseUrl}/api/v1/subscriptions/checkout-session`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ planSlug: "starter" }),
    });
    const monthlyCheckoutData = await monthlyCheckoutRes.json();
    const monthlyParams = new URLSearchParams(interceptedFormBody);

    record(
      "T1.1: Monthly recurring plan checkout returns 200 with checkout URL",
      monthlyCheckoutRes.status === 200 && monthlyCheckoutData.success === true
    );
    record(
      "T1.2: Monthly recurring plan sets mode: 'subscription'",
      monthlyParams.get("mode") === "subscription",
      `Actual mode: ${monthlyParams.get("mode")}`
    );
    record(
      "T1.3: Monthly recurring plan sets price_data recurring interval: 'month'",
      monthlyParams.get("line_items[0][price_data][recurring][interval]") === "month",
      `Actual interval: ${monthlyParams.get("line_items[0][price_data][recurring][interval]")}`
    );

    // ------------------------------------------------------------------------
    // TEST 2: Annual recurring plan checkout uses mode: "subscription" & interval: "year"
    // ------------------------------------------------------------------------
    interceptedFormBody = "";
    const annualCheckoutRes = await fetch(`${baseUrl}/api/v1/subscriptions/checkout-session`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ planSlug: annualPlan.slug }),
    });
    const annualCheckoutData = await annualCheckoutRes.json();
    const annualParams = new URLSearchParams(interceptedFormBody);

    record(
      "T2.1: Annual recurring plan checkout returns 200 with checkout URL",
      annualCheckoutRes.status === 200 && annualCheckoutData.success === true
    );
    record(
      "T2.2: Annual recurring plan sets mode: 'subscription'",
      annualParams.get("mode") === "subscription",
      `Actual mode: ${annualParams.get("mode")}`
    );
    record(
      "T2.3: Annual recurring plan sets price_data recurring interval: 'year'",
      annualParams.get("line_items[0][price_data][recurring][interval]") === "year",
      `Actual interval: ${annualParams.get("line_items[0][price_data][recurring][interval]")}`
    );

    // ------------------------------------------------------------------------
    // TEST 3: One-time product checkout uses mode: "payment" without recurring interval
    // ------------------------------------------------------------------------
    interceptedFormBody = "";
    const oneTimeCheckoutRes = await fetch(`${baseUrl}/api/v1/subscriptions/checkout-session`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ planSlug: oneTimePlan.slug }),
    });
    const oneTimeCheckoutData = await oneTimeCheckoutRes.json();
    const oneTimeParams = new URLSearchParams(interceptedFormBody);

    record(
      "T3.1: One-time plan checkout returns 200 with checkout URL",
      oneTimeCheckoutRes.status === 200 && oneTimeCheckoutData.success === true
    );
    record(
      "T3.2: One-time plan sets mode: 'payment'",
      oneTimeParams.get("mode") === "payment",
      `Actual mode: ${oneTimeParams.get("mode")}`
    );
    record(
      "T3.3: One-time plan does not append recurring interval parameter",
      oneTimeParams.get("line_items[0][price_data][recurring][interval]") === null,
      `Recurring param present: ${oneTimeParams.get("line_items[0][price_data][recurring][interval]")}`
    );

    // Restore fetch
    globalThis.fetch = originalFetch;

    // ------------------------------------------------------------------------
    // TEST 4: Authoritative Stripe renewal period extracted from invoice webhook
    // ------------------------------------------------------------------------
    // First, activate user on Starter plan via checkout.session.completed
    const activatePayload = JSON.stringify({
      id: `evt_act_${Date.now()}`,
      created: Math.floor(Date.now() / 1000),
      type: "checkout.session.completed",
      data: {
        object: {
          id: `cs_act_${Date.now()}`,
          payment_status: "paid",
          amount_total: 49900,
          currency: "inr",
          metadata: {
            userId: testUser.id,
            planSlug: "starter",
          },
        },
      },
    });
    const actSig = generateStripeSignature(activatePayload, testSecret);
    const actRes = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": actSig },
      body: activatePayload,
    });
    record("T4.1: Initial activation succeeds", actRes.status === 200);

    // Authoritative Stripe billing boundaries for invoice
    const authoritativeStart = Math.floor(Date.now() / 1000);
    const authoritativeEnd = authoritativeStart + 32 * 24 * 60 * 60; // Exactly 32 days authoritative window

    const authoritativeInvoiceId = `in_auth_${Date.now()}`;
    const invoicePayload = JSON.stringify({
      id: `evt_inv_${Date.now()}`,
      created: Math.floor(Date.now() / 1000),
      type: "invoice.payment_succeeded",
      data: {
        object: {
          id: authoritativeInvoiceId,
          customer_email: testUser.email,
          amount_paid: 49900,
          currency: "inr",
          period_start: authoritativeStart,
          period_end: authoritativeEnd,
          lines: {
            data: [
              {
                period: {
                  start: authoritativeStart,
                  end: authoritativeEnd,
                },
              },
            ],
          },
          subscription_details: {
            metadata: {
              userId: testUser.id,
              planSlug: "starter",
            },
          },
        },
      },
    });
    const invSig = generateStripeSignature(invoicePayload, testSecret);
    const invRes = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": invSig },
      body: invoicePayload,
    });
    record("T4.2: Authoritative invoice payment webhook processed with 200 OK", invRes.status === 200);

    const subAfterInvoice = await getUserSubscription(testUser.id);
    const actualPeriodEndMs = new Date(subAfterInvoice.currentPeriodEnd).getTime();
    const expectedPeriodEndMs = authoritativeEnd * 1000;

    record(
      "T4.3: currentPeriodEnd populated from authoritative Stripe invoice boundaries (not hardcoded 30 days)",
      Math.abs(actualPeriodEndMs - expectedPeriodEndMs) < 2000,
      `Actual: ${actualPeriodEndMs}, Expected: ${expectedPeriodEndMs}`
    );

    // Verify invoice record in billing_invoices has exact authoritative period boundaries
    const invoiceRecords: any[] = await prisma.$queryRaw`
      SELECT "billingPeriodStart", "billingPeriodEnd" 
      FROM billing_invoices 
      WHERE "userId" = ${testUser.id}::uuid AND "paymentReference" = ${authoritativeInvoiceId}
      LIMIT 1;
    `;
    const recEndMs = new Date(invoiceRecords[0]?.billingPeriodEnd).getTime();
    record(
      "T4.4: billing_invoices table stores authoritative Stripe billingPeriodEnd",
      Math.abs(recEndMs - expectedPeriodEndMs) < 2000,
      `Recorded End: ${recEndMs}, Expected: ${expectedPeriodEndMs}`
    );

    // ------------------------------------------------------------------------
    // TEST 5: Annual plan billing period assigns 1 full year (365 days), not 30 days
    // ------------------------------------------------------------------------
    const annualActivatePayload = JSON.stringify({
      id: `evt_act_annual_${Date.now()}`,
      created: Math.floor(Date.now() / 1000),
      type: "checkout.session.completed",
      data: {
        object: {
          id: `cs_annual_${Date.now()}`,
          payment_status: "paid",
          amount_total: 999900,
          currency: "inr",
          metadata: {
            userId: testUser.id,
            planSlug: annualPlan.slug,
            planId: annualPlan.id,
          },
        },
      },
    });
    const annualActSig = generateStripeSignature(annualActivatePayload, testSecret);
    const annualActRes = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": annualActSig },
      body: annualActivatePayload,
    });
    record("T5.1: Annual plan checkout webhook processed successfully", annualActRes.status === 200);

    const subAnnual = await getUserSubscription(testUser.id);
    const annualPeriodStartMs = new Date(subAnnual.currentPeriodStart).getTime();
    const annualPeriodEndMs = new Date(subAnnual.currentPeriodEnd).getTime();
    const diffDays = Math.round((annualPeriodEndMs - annualPeriodStartMs) / (24 * 60 * 60 * 1000));

    record(
      "T5.2: Annual plan assigns 1 year (365 days) period, not 30 days",
      diffDays >= 364 && diffDays <= 366,
      `Calculated days: ${diffDays}`
    );

    // ------------------------------------------------------------------------
    // TEST 6: customer.subscription.updated webhook handling
    // ------------------------------------------------------------------------
    const stripeSubId = `sub_test_${Date.now()}`;
    const subUpdatedStart = Math.floor(Date.now() / 1000);
    const subUpdatedEnd = subUpdatedStart + 60 * 24 * 60 * 60; // 60 days renewal

    const subUpdatedPayload = JSON.stringify({
      id: `evt_sub_upd_${Date.now()}`,
      created: Math.floor(Date.now() / 1000),
      type: "customer.subscription.updated",
      data: {
        object: {
          id: stripeSubId,
          status: "active",
          current_period_start: subUpdatedStart,
          current_period_end: subUpdatedEnd,
          client_reference_id: testUser.id,
          metadata: {
            userId: testUser.id,
          },
        },
      },
    });
    const subUpdSig = generateStripeSignature(subUpdatedPayload, testSecret);
    const subUpdRes = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": subUpdSig },
      body: subUpdatedPayload,
    });
    const subUpdData = await subUpdRes.json();

    record(
      "T6.1: customer.subscription.updated is processed with 200 OK",
      subUpdRes.status === 200 && subUpdData.processed === true
    );

    const subAfterUpd = await getUserSubscription(testUser.id);
    const updEndMs = new Date(subAfterUpd.currentPeriodEnd).getTime();
    record(
      "T6.2: customer.subscription.updated synchronizes authoritative periodEnd from Stripe",
      Math.abs(updEndMs - subUpdatedEnd * 1000) < 2000,
      `Updated End: ${updEndMs}, Expected: ${subUpdatedEnd * 1000}`
    );

    // Duplicate delivery of subscription.updated
    const subUpdDupRes = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": subUpdSig },
      body: subUpdatedPayload,
    });
    const subUpdDupData = await subUpdDupRes.json();
    record(
      "T6.3: customer.subscription.updated duplicate delivery is idempotent",
      subUpdDupRes.status === 200 && subUpdDupData.idempotent === true
    );

  } catch (err: any) {
    console.error("Test Suite Execution Error:", err);
    record("TestSuiteExecution", false, err.message);
  } finally {
    // Teardown
    if (testUser) {
      await prisma.$executeRawUnsafe(`DELETE FROM payment_webhook_events WHERE "userId" = $1::uuid`, testUser.id).catch(() => {});
      await prisma.$executeRawUnsafe(`DELETE FROM billing_invoices WHERE "userId" = $1::uuid`, testUser.id).catch(() => {});
      await prisma.$executeRawUnsafe(`DELETE FROM user_subscriptions WHERE "userId" = $1::uuid`, testUser.id).catch(() => {});
      await prisma.$executeRawUnsafe(`DELETE FROM licenses WHERE "userId" = $1::uuid`, testUser.id).catch(() => {});
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
    if (annualPlan) {
      await prisma.subscriptionPlan.delete({ where: { id: annualPlan.id } }).catch(() => {});
    }
    if (oneTimePlan) {
      await prisma.subscriptionPlan.delete({ where: { id: oneTimePlan.id } }).catch(() => {});
    }

    if (originalSecret) {
      process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
    } else {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    }
    if (originalStripeKey) {
      process.env.STRIPE_SECRET_KEY = originalStripeKey;
    } else {
      delete process.env.STRIPE_SECRET_KEY;
    }

    server.close();
  }

  console.log("\n=================================================");
  console.log(`RECURRING BILLING TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================\n");

  process.exit(failed > 0 ? 1 : 0);
}

runRecurringBillingTests();
