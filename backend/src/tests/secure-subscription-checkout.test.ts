import http from "http";
import { prisma } from "../config/prisma.js";
import app from "../app.js";
import { createUserSession } from "../services/session.service.js";
import { getUserSubscription } from "../services/subscription.service.js";

const db = prisma as any;

async function runSecureCheckoutTests() {
  console.log("=================================================");
  console.log("FEATURE 18.1: SECURE SUBSCRIPTION CHECKOUT TESTS");
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

  // Start HTTP server on ephemeral port (port 0)
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}`;
  console.log(`Test HTTP Server listening at: ${baseUrl}\n`);

  let testUser: any = null;
  let userToken: string = "";

  try {
    // Setup test user and session
    testUser = await db.user.create({
      data: {
        email: `checkout_sec_${Date.now()}@forgestudio.dev`,
        fullName: "Checkout Security User",
        status: "ACTIVE",
        role: "USER",
      },
    });
    const session = await createUserSession(testUser.id);
    userToken = session.token;

    const authHeaders = {
      "Content-Type": "application/json",
      Cookie: `forge_session=${userToken}`,
    };

    // ------------------------------------------------------------------------
    // TEST 1: User cannot activate paid plans through direct /select endpoint
    // ------------------------------------------------------------------------
    for (const planSlug of ["starter", "professional", "agency"]) {
      const res = await fetch(`${baseUrl}/api/v1/subscriptions/select`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ planSlug }),
      });
      const data = await res.json();
      assert(
        res.status === 400 && data.code === "PAID_PLAN_REQUIRES_CHECKOUT",
        `Direct /select rejects paid plan '${planSlug}' with PAID_PLAN_REQUIRES_CHECKOUT`,
        `status=${res.status}, code=${data.code}`
      );
    }

    // Verify user is still on default free plan
    const subAfterAttempts = await getUserSubscription(testUser.id);
    assert(
      subAfterAttempts.plan.slug === "free",
      "User subscription remains 'free' after rejected paid /select attempts"
    );

    // ------------------------------------------------------------------------
    // TEST 2: User can select the free plan directly
    // ------------------------------------------------------------------------
    const freeRes = await fetch(`${baseUrl}/api/v1/subscriptions/select`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ planSlug: "free" }),
    });
    const freeData = await freeRes.json();
    assert(
      freeRes.status === 200 && freeData.data.subscription.plan.slug === "free",
      "User can select free plan via direct /select endpoint"
    );

    // ------------------------------------------------------------------------
    // TEST 3: Invalid or inactive plan slugs are rejected
    // ------------------------------------------------------------------------
    const invalidRes = await fetch(`${baseUrl}/api/v1/subscriptions/checkout-session`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ planSlug: "ultra-mega-non-existent" }),
    });
    const invalidData = await invalidRes.json();
    assert(
      invalidRes.status === 400 && invalidData.code === "INVALID_PLAN",
      "Checkout session rejects non-existent planSlug with 400 INVALID_PLAN",
      `status=${invalidRes.status}, code=${invalidData.code}`
    );

    const freeCheckoutRes = await fetch(`${baseUrl}/api/v1/subscriptions/checkout-session`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ planSlug: "free" }),
    });
    const freeCheckoutData = await freeCheckoutRes.json();
    assert(
      freeCheckoutRes.status === 400 && freeCheckoutData.code === "FREE_PLAN_NO_CHECKOUT",
      "Checkout session rejects 'free' plan with 400 FREE_PLAN_NO_CHECKOUT"
    );

    // ------------------------------------------------------------------------
    // TEST 4: Unauthenticated user cannot create a checkout session
    // ------------------------------------------------------------------------
    const unauthRes = await fetch(`${baseUrl}/api/v1/subscriptions/checkout-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planSlug: "starter" }),
    });
    assert(
      unauthRes.status === 401,
      "Unauthenticated checkout-session request is rejected with HTTP 401"
    );

    // ------------------------------------------------------------------------
    // TEST 5: Missing provider credentials returns safe 503 error, never simulates success
    // ------------------------------------------------------------------------
    const originalStripeKey = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;

    const noCredsRes = await fetch(`${baseUrl}/api/v1/subscriptions/checkout-session`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ planSlug: "professional" }),
    });
    const noCredsData = await noCredsRes.json();
    assert(
      noCredsRes.status === 503 && noCredsData.code === "PAYMENT_GATEWAY_NOT_CONFIGURED",
      "Missing provider credentials returns safe 503 PAYMENT_GATEWAY_NOT_CONFIGURED without faking success",
      `status=${noCredsRes.status}, code=${noCredsData.code}`
    );

    // ------------------------------------------------------------------------
    // TEST 6: Checkout session creation derives amount & currency from trusted server plan
    // ------------------------------------------------------------------------
    // Mock the global fetch for Stripe API
    const originalFetch = globalThis.fetch;
    process.env.STRIPE_SECRET_KEY = "sk_test_mock_secret_key";

    let interceptedFormBody: string = "";
    globalThis.fetch = async (input: any, init?: any) => {
      const url = typeof input === "string" ? input : input?.url || "";
      if (url.includes("api.stripe.com/v1/checkout/sessions")) {
        interceptedFormBody = init?.body?.toString() || "";
        return new Response(
          JSON.stringify({
            id: "cs_test_mock_session_12345",
            url: "https://checkout.stripe.com/c/pay/cs_test_mock_session_12345",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return originalFetch(input, init);
    };

    // Client attempts to pass tampered price ($1) and tampered currency (USD)
    const mockCheckoutRes = await fetch(`${baseUrl}/api/v1/subscriptions/checkout-session`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        planSlug: "starter",
        price: 1, // Tamper attempt: starter is ₹499
        currency: "USD", // Tamper attempt: starter is INR
      }),
    });
    const mockCheckoutData = await mockCheckoutRes.json();

    assert(
      mockCheckoutRes.status === 200 && mockCheckoutData.data.checkoutUrl.includes("checkout.stripe.com"),
      "Checkout session returns valid checkoutUrl from provider"
    );
    assert(
      mockCheckoutData.data.amount === 499 && mockCheckoutData.data.currency === "INR",
      "Checkout session response strictly returns server-configured plan price and currency (499 INR)"
    );

    // Inspect intercepted Stripe form parameters
    const parsedParams = new URLSearchParams(interceptedFormBody);
    assert(
      parsedParams.get("line_items[0][price_data][unit_amount]") === "49900",
      "Provider payload amount is calculated in minor units (49900 paise) from server data, ignoring client tamper"
    );
    assert(
      parsedParams.get("line_items[0][price_data][currency]") === "inr",
      "Provider payload currency is set to trusted server currency ('inr')"
    );

    // ------------------------------------------------------------------------
    // TEST 7: Checkout creation alone does NOT activate the paid subscription
    // ------------------------------------------------------------------------
    const subAfterCheckout = await getUserSubscription(testUser.id);
    assert(
      subAfterCheckout.plan.slug === "free",
      "Creating checkout session does NOT activate the paid plan; user remains 'free'"
    );

    // ------------------------------------------------------------------------
    // TEST 8: Client-supplied payment status or transaction IDs cannot bypass activation
    // ------------------------------------------------------------------------
    const bypassRes = await fetch(`${baseUrl}/api/v1/subscriptions/select`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        planSlug: "agency",
        status: "PAID",
        paymentStatus: "SUCCESS",
        transactionId: "TXN_FAKE_12345",
        sessionId: "cs_test_mock_session_12345",
      }),
    });
    const bypassData = await bypassRes.json();
    assert(
      bypassRes.status === 400 && bypassData.code === "PAID_PLAN_REQUIRES_CHECKOUT",
      "Client-supplied payment status/transactionId cannot activate paid plan (400 PAID_PLAN_REQUIRES_CHECKOUT)"
    );

    // ------------------------------------------------------------------------
    // TEST 9: Repeated checkout requests do not create duplicate or broken subscription records
    // ------------------------------------------------------------------------
    for (let i = 0; i < 3; i++) {
      const repRes = await fetch(`${baseUrl}/api/v1/subscriptions/checkout-session`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ planSlug: "starter" }),
      });
      assert(repRes.status === 200, `Repeated checkout request #${i + 1} succeeds safely`);
    }

    const subCount = await db.userSubscription.count({
      where: { userId: testUser.id },
    });
    assert(
      subCount === 1,
      "User has exactly one subscription record despite repeated checkout session requests"
    );

    // ------------------------------------------------------------------------
    // TEST 10: Existing cancellation and invoice retrieval continue to work
    // ------------------------------------------------------------------------
    const invRes = await fetch(`${baseUrl}/api/v1/subscriptions/invoices`, {
      headers: authHeaders,
    });
    const invData = await invRes.json();
    assert(
      invRes.status === 200 && Array.isArray(invData.data.invoices),
      "Invoices endpoint /api/v1/subscriptions/invoices returns 200 array"
    );

    const cancelRes = await fetch(`${baseUrl}/api/v1/subscriptions/cancel`, {
      method: "POST",
      headers: authHeaders,
    });
    const cancelData = await cancelRes.json();
    assert(
      cancelRes.status === 200 && cancelData.data.subscription.status === "CANCELED",
      "Cancel endpoint /api/v1/subscriptions/cancel succeeds with CANCELED status"
    );

    // Restore environment
    globalThis.fetch = originalFetch;
    if (originalStripeKey) {
      process.env.STRIPE_SECRET_KEY = originalStripeKey;
    } else {
      delete process.env.STRIPE_SECRET_KEY;
    }

  } finally {
    // Cleanup test user and database records
    if (testUser) {
      try {
        await db.billingInvoice.deleteMany({ where: { userId: testUser.id } });
        await db.userSubscription.deleteMany({ where: { userId: testUser.id } });
        await db.session.deleteMany({ where: { userId: testUser.id } });
        await db.user.deleteMany({ where: { id: testUser.id } });
      } catch (e) {}
    }
    server.close();
  }

  console.log("\n=================================================");
  console.log(`SECURE CHECKOUT RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runSecureCheckoutTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
