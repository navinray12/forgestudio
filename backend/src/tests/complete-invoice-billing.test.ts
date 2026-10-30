import http from "http";
import crypto from "crypto";
import app from "../app.js";
import { prisma } from "../config/database.js";
import { initLicensingTables } from "../services/license.service.js";
import { generateInvoiceHtml, escapeHtml } from "../services/subscription.service.js";

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
  } else {
    console.error(`[FAIL] ${testName}${detail ? ` - Detail: ${detail}` : ""}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

function generateStripeSignature(payload: string, secret: string, timestamp?: number): string {
  const t = timestamp || Math.floor(Date.now() / 1000);
  const signaturePayload = `${t}.${payload}`;
  const hmac = crypto.createHmac("sha256", secret).update(signaturePayload).digest("hex");
  return `t=${t},v1=${hmac}`;
}

async function createAuthenticatedSession(user: any) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  return `forge_session=${rawToken}`;
}

async function runTests() {
  console.log("=================================================");
  console.log("MODULE 18.4: COMPLETE INVOICE & BILLING DOCUMENTS");
  console.log("=================================================\n");

  await initLicensingTables();

  const originalEnvSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const originalSecretKey = process.env.STRIPE_SECRET_KEY;
  const originalFetch = globalThis.fetch;
  const testSecret = "whsec_test_secret_forgestudio_18_4";
  process.env.STRIPE_WEBHOOK_SECRET = testSecret;
  process.env.STRIPE_SECRET_KEY = "sk_test_mock_secret_key_18_4";

  // Mock global fetch for Stripe API calls
  globalThis.fetch = async (input: any, init?: any) => {
    const url = typeof input === "string" ? input : input?.url || "";
    if (url.includes("api.stripe.com/v1/checkout/sessions")) {
      return new Response(
        JSON.stringify({
          id: `cs_test_mock_session_${Date.now()}`,
          url: `https://checkout.stripe.com/c/pay/cs_test_mock_session_${Date.now()}`,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return originalFetch(input, init);
  };

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Test server running at ${baseUrl}\n`);

  const uniqueSuffix = Date.now();
  let userA: any = null;
  let userB: any = null;
  let adminUser: any = null;
  let cookieA: string = "";
  let cookieB: string = "";
  let cookieAdmin: string = "";

  try {
    // ------------------------------------------------------------------------
    // SETUP: Create Users and Plans
    // ------------------------------------------------------------------------
    userA = await prisma.user.create({
      data: {
        email: `invoice-test-a-${uniqueSuffix}@example.com`,
        fullName: "Alice Developer <XSS & Tag Test>",
        role: "USER",
      },
    });
    cookieA = await createAuthenticatedSession(userA);

    userB = await prisma.user.create({
      data: {
        email: `invoice-test-b-${uniqueSuffix}@example.com`,
        fullName: "Bob Collaborator",
        role: "USER",
      },
    });
    cookieB = await createAuthenticatedSession(userB);

    adminUser = await prisma.user.create({
      data: {
        email: `invoice-admin-${uniqueSuffix}@example.com`,
        fullName: "Platform Admin",
        role: "ADMIN",
      },
    });
    cookieAdmin = await createAuthenticatedSession(adminUser);

    const [starterPlan]: any[] = await prisma.$queryRaw`
      SELECT id, slug, price, currency, "websiteLimit" FROM subscription_plans WHERE LOWER(slug) = 'starter' LIMIT 1
    `;
    assert(!!starterPlan, "Starter subscription plan exists in DB");

    // Clean user subscriptions and invoices
    await prisma.$executeRawUnsafe(`DELETE FROM billing_invoices WHERE "userId" IN ($1::uuid, $2::uuid)`, userA.id, userB.id);
    await prisma.$executeRawUnsafe(`DELETE FROM user_subscriptions WHERE "userId" IN ($1::uuid, $2::uuid)`, userA.id, userB.id);

    // ------------------------------------------------------------------------
    // TEST 1: Checkout Session creation does NOT create a paid invoice
    // ------------------------------------------------------------------------
    const resCheckout = await fetch(`${baseUrl}/api/v1/subscriptions/checkout-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieA,
      },
      body: JSON.stringify({ planSlug: "starter" }),
    });
    assert(resCheckout.status === 200, "Checkout session created successfully");

    const invoicesAfterCheckout: any[] = await prisma.$queryRaw`
      SELECT id FROM billing_invoices WHERE "userId" = ${userA.id}::uuid
    `;
    assert(invoicesAfterCheckout.length === 0, "No paid invoice created on checkout-session creation");

    // ------------------------------------------------------------------------
    // TEST 2: Unpaid checkout event (payment_status: 'unpaid') does NOT create invoice
    // ------------------------------------------------------------------------
    const unpaidPayload = JSON.stringify({
      id: `evt_unpaid_${uniqueSuffix}`,
      type: "checkout.session.completed",
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: `cs_unpaid_${uniqueSuffix}`,
          payment_status: "unpaid",
          metadata: { userId: userA.id, planSlug: "starter" },
          amount_total: Number(starterPlan.price) * 100,
          currency: starterPlan.currency.toLowerCase(),
        },
      },
    });
    const unpaidSig = generateStripeSignature(unpaidPayload, testSecret);
    const resUnpaid = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": unpaidSig },
      body: unpaidPayload,
    });
    assert(resUnpaid.status === 200, "Unpaid webhook received with 200");

    const invoicesAfterUnpaid: any[] = await prisma.$queryRaw`
      SELECT id FROM billing_invoices WHERE "userId" = ${userA.id}::uuid
    `;
    assert(invoicesAfterUnpaid.length === 0, "No paid invoice created on unpaid payment status");

    // ------------------------------------------------------------------------
    // TEST 3: Failed invoice (invoice.payment_failed) does NOT create a paid invoice
    // ------------------------------------------------------------------------
    const failPayload = JSON.stringify({
      id: `evt_fail_${uniqueSuffix}`,
      type: "invoice.payment_failed",
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: `in_failed_${uniqueSuffix}`,
          customer_email: userA.email,
          amount_paid: 0,
          currency: starterPlan.currency.toLowerCase(),
          subscription_details: { metadata: { userId: userA.id } },
        },
      },
    });
    const failSig = generateStripeSignature(failPayload, testSecret);
    const resFail = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": failSig },
      body: failPayload,
    });
    assert(resFail.status === 200, "Payment failed webhook handled safely");

    const invoicesAfterFailed: any[] = await prisma.$queryRaw`
      SELECT id FROM billing_invoices WHERE "userId" = ${userA.id}::uuid
    `;
    assert(invoicesAfterFailed.length === 0, "No paid invoice created on payment failure");

    // ------------------------------------------------------------------------
    // TEST 4: Verified successful checkout payment creates complete paid invoice
    // ------------------------------------------------------------------------
    const checkoutRef = `cs_test_success_${uniqueSuffix}`;
    const paymentIntentRef = `pi_test_success_${uniqueSuffix}`;
    const paidPayload = JSON.stringify({
      id: `evt_paid_${uniqueSuffix}`,
      type: "checkout.session.completed",
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: checkoutRef,
          payment_intent: paymentIntentRef,
          payment_status: "paid",
          amount_total: Number(starterPlan.price) * 100,
          amount_subtotal: Number(starterPlan.price) * 100,
          total_details: { amount_tax: 0 },
          currency: starterPlan.currency.toLowerCase(),
          metadata: { userId: userA.id, planSlug: "starter" },
        },
      },
    });
    const paidSig = generateStripeSignature(paidPayload, testSecret);
    const resPaid = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": paidSig },
      body: paidPayload,
    });
    const dataPaid = await resPaid.json();
    assert(resPaid.status === 200 && dataPaid.activated === true, "Verified payment activates paid subscription");

    const [createdInvoice]: any[] = await prisma.$queryRaw`
      SELECT * FROM billing_invoices WHERE "userId" = ${userA.id}::uuid ORDER BY "createdAt" DESC LIMIT 1
    `;
    assert(!!createdInvoice, "Paid BillingInvoice record exists in DB");
    assert(createdInvoice.amount === Number(starterPlan.price), "Invoice amount matches server plan price");
    assert(createdInvoice.currency === starterPlan.currency.toUpperCase(), "Invoice currency matches server plan currency");
    assert(createdInvoice.status === "PAID", "Invoice status is PAID");
    assert(createdInvoice.paymentProvider === "stripe", "Invoice payment provider is stripe");
    assert(
      createdInvoice.paymentReference === paymentIntentRef || createdInvoice.paymentReference === checkoutRef,
      "Invoice stores actual payment reference",
      `Expected ${paymentIntentRef} or ${checkoutRef}, got ${createdInvoice.paymentReference}`
    );
    assert(createdInvoice.invoiceNumber.startsWith("INV-"), "Invoice number has standard INV- prefix");

    // ------------------------------------------------------------------------
    // TEST 5: Duplicate webhook delivery prevents duplicate invoice creation
    // ------------------------------------------------------------------------
    const resDup = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": paidSig },
      body: paidPayload,
    });
    const dataDup = await resDup.json();
    assert(resDup.status === 200 && dataDup.idempotent === true, "Duplicate delivery returns idempotent: true");

    const invoiceCountAfterDup: any[] = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM billing_invoices WHERE "userId" = ${userA.id}::uuid
    `;
    assert(invoiceCountAfterDup[0].count === 1, "Duplicate delivery does not create duplicate invoice records");

    // ------------------------------------------------------------------------
    // TEST 6: User A can fetch list of their invoices via GET /invoices
    // ------------------------------------------------------------------------
    const resList = await fetch(`${baseUrl}/api/v1/subscriptions/invoices`, {
      headers: { Cookie: cookieA },
    });
    const dataList = await resList.json();
    assert(resList.status === 200 && Array.isArray(dataList.data?.invoices), "GET /invoices returns user invoices array");
    assert(dataList.data.invoices.length === 1, "Invoices array contains exactly 1 invoice");
    assert(dataList.data.invoices[0].invoiceNumber === createdInvoice.invoiceNumber, "Invoice number matches record in DB");

    // ------------------------------------------------------------------------
    // TEST 7: User A can fetch single invoice details by UUID
    // ------------------------------------------------------------------------
    const resDetail = await fetch(`${baseUrl}/api/v1/subscriptions/invoices/${createdInvoice.id}`, {
      headers: { Cookie: cookieA },
    });
    const dataDetail = await resDetail.json();
    assert(resDetail.status === 200 && dataDetail.success === true, "GET /invoices/:id returns 200 JSON detail");
    assert(dataDetail.data.invoice.id === createdInvoice.id, "Invoice detail ID matches");
    assert(dataDetail.data.invoice.customer.email === userA.email, "Invoice detail customer identity matches User A");
    assert(dataDetail.data.invoice.amount === Number(starterPlan.price), "Invoice detail amount is accurate");
    assert(dataDetail.data.invoice.paymentReference === createdInvoice.paymentReference, "Payment reference matches DB");

    // ------------------------------------------------------------------------
    // TEST 8: User A can fetch invoice details by invoiceNumber
    // ------------------------------------------------------------------------
    const resByNum = await fetch(`${baseUrl}/api/v1/subscriptions/invoices/${createdInvoice.invoiceNumber}`, {
      headers: { Cookie: cookieA },
    });
    const dataByNum = await resByNum.json();
    assert(resByNum.status === 200 && dataByNum.data?.invoice?.id === createdInvoice.id, "Lookup by invoiceNumber succeeds");

    // ------------------------------------------------------------------------
    // TEST 9: User A can view printable HTML invoice document (/html)
    // ------------------------------------------------------------------------
    const resHtml = await fetch(`${baseUrl}/api/v1/subscriptions/invoices/${createdInvoice.id}/html`, {
      headers: { Cookie: cookieA },
    });
    const htmlBody = await resHtml.text();
    assert(resHtml.status === 200, "GET /invoices/:id/html returns 200");
    assert(
      (resHtml.headers.get("content-type") || "").includes("text/html"),
      "Response Content-Type is text/html"
    );
    assert(htmlBody.includes("<!DOCTYPE html>"), "HTML response contains valid doctype");
    assert(htmlBody.includes("window.print()"), "HTML response contains print button trigger");
    assert(htmlBody.includes(createdInvoice.invoiceNumber), "HTML response displays invoice number");
    assert(htmlBody.includes(userA.email), "HTML response displays customer email");
    assert(htmlBody.includes("@media print"), "HTML response contains print-specific stylesheet");

    // ------------------------------------------------------------------------
    // TEST 10: User A can download invoice document (/download)
    // ------------------------------------------------------------------------
    const resDownload = await fetch(`${baseUrl}/api/v1/subscriptions/invoices/${createdInvoice.id}/download`, {
      headers: { Cookie: cookieA },
    });
    assert(resDownload.status === 200, "GET /invoices/:id/download returns 200");
    const contentDisposition = resDownload.headers.get("content-disposition") || "";
    assert(
      contentDisposition.includes("attachment") && contentDisposition.includes(createdInvoice.invoiceNumber),
      "Content-Disposition specifies attachment with invoice filename",
      `Got Content-Disposition: ${contentDisposition}`
    );

    // ------------------------------------------------------------------------
    // TEST 11: User B CANNOT view User A's invoice (HTTP 403 FORBIDDEN)
    // ------------------------------------------------------------------------
    const resForbiddenJson = await fetch(`${baseUrl}/api/v1/subscriptions/invoices/${createdInvoice.id}`, {
      headers: { Cookie: cookieB },
    });
    assert(
      resForbiddenJson.status === 403,
      "User B accessing User A invoice via JSON returns 403 Forbidden",
      `Status: ${resForbiddenJson.status}`
    );

    const resForbiddenHtml = await fetch(`${baseUrl}/api/v1/subscriptions/invoices/${createdInvoice.id}/html`, {
      headers: { Cookie: cookieB },
    });
    assert(
      resForbiddenHtml.status === 403,
      "User B accessing User A invoice via HTML returns 403 Forbidden",
      `Status: ${resForbiddenHtml.status}`
    );

    // ------------------------------------------------------------------------
    // TEST 12: Admin User CAN view User A's invoice (Admin Permission)
    // ------------------------------------------------------------------------
    const resAdmin = await fetch(`${baseUrl}/api/v1/subscriptions/invoices/${createdInvoice.id}`, {
      headers: { Cookie: cookieAdmin },
    });
    const dataAdmin = await resAdmin.json();
    assert(
      resAdmin.status === 200 && dataAdmin.data?.invoice?.id === createdInvoice.id,
      "Admin user can view customer invoice"
    );

    // ------------------------------------------------------------------------
    // TEST 13: Non-existent invoice returns HTTP 404 INVOICE_NOT_FOUND
    // ------------------------------------------------------------------------
    const nonExistentId = "00000000-0000-0000-0000-000000000000";
    const resNotFound = await fetch(`${baseUrl}/api/v1/subscriptions/invoices/${nonExistentId}`, {
      headers: { Cookie: cookieA },
    });
    const dataNotFound = await resNotFound.json();
    assert(
      resNotFound.status === 404 && dataNotFound.code === "INVOICE_NOT_FOUND",
      "Non-existent invoice returns HTTP 404 INVOICE_NOT_FOUND"
    );

    // ------------------------------------------------------------------------
    // TEST 14: Unauthenticated request returns HTTP 401
    // ------------------------------------------------------------------------
    const resUnauth = await fetch(`${baseUrl}/api/v1/subscriptions/invoices/${createdInvoice.id}`);
    assert(resUnauth.status === 401, "Unauthenticated request returns HTTP 401");

    // ------------------------------------------------------------------------
    // TEST 15: HTML escaping protects against XSS in user and plan content
    // ------------------------------------------------------------------------
    assert(escapeHtml("<script>alert('xss')</script>") === "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;", "escapeHtml escapes <script> tags");
    assert(escapeHtml('"quoted" & "amp"') === "&quot;quoted&quot; &amp; &quot;amp&quot;", "escapeHtml escapes quotes and ampersands");

    // User A fullName has <XSS & Tag Test>
    assert(htmlBody.includes("&lt;XSS &amp; Tag Test&gt;"), "HTML invoice properly escapes user's name containing HTML characters");
    assert(!htmlBody.includes("<XSS & Tag Test>"), "Raw unescaped HTML characters are absent from generated document");

    // ------------------------------------------------------------------------
    // TEST 16: Renewal payment invoice creation with distinct payment reference
    // ------------------------------------------------------------------------
    const renewalInvoiceRef = `in_renewal_${uniqueSuffix}`;
    const renewalPayload = JSON.stringify({
      id: `evt_renew_${uniqueSuffix}`,
      type: "invoice.payment_succeeded",
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: renewalInvoiceRef,
          customer_email: userA.email,
          amount_paid: Number(starterPlan.price) * 100,
          currency: starterPlan.currency.toLowerCase(),
          subscription_details: { metadata: { userId: userA.id } },
        },
      },
    });
    const renewalSig = generateStripeSignature(renewalPayload, testSecret);
    const resRenewal = await fetch(`${baseUrl}/api/v1/subscriptions/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": renewalSig },
      body: renewalPayload,
    });
    assert(resRenewal.status === 200, "Renewal webhook handled successfully");

    const [renewalInvoice]: any[] = await prisma.$queryRaw`
      SELECT * FROM billing_invoices WHERE "userId" = ${userA.id}::uuid AND "paymentReference" = ${renewalInvoiceRef} LIMIT 1
    `;
    assert(!!renewalInvoice, "Renewal invoice record created in DB");
    assert(renewalInvoice.paymentReference === renewalInvoiceRef, "Renewal invoice stores Stripe invoice reference");
    assert(renewalInvoice.description.includes("Renewal"), "Renewal invoice description reflects renewal");

    console.log("\n=================================================");
    console.log("ALL 16 MODULE 18.4 INVOICE TESTS PASSED!");
    console.log("=================================================\n");
  } finally {
    globalThis.fetch = originalFetch;
    process.env.STRIPE_WEBHOOK_SECRET = originalEnvSecret;
    process.env.STRIPE_SECRET_KEY = originalSecretKey;

    if (userA?.id) {
      await prisma.$executeRawUnsafe(`DELETE FROM billing_invoices WHERE "userId" = $1::uuid`, userA.id).catch(() => {});
      await prisma.$executeRawUnsafe(`DELETE FROM user_subscriptions WHERE "userId" = $1::uuid`, userA.id).catch(() => {});
      await prisma.$executeRawUnsafe(`DELETE FROM sessions WHERE "userId" = $1::uuid`, userA.id).catch(() => {});
      await prisma.$executeRawUnsafe(`DELETE FROM users WHERE id = $1::uuid`, userA.id).catch(() => {});
    }
    if (userB?.id) {
      await prisma.$executeRawUnsafe(`DELETE FROM billing_invoices WHERE "userId" = $1::uuid`, userB.id).catch(() => {});
      await prisma.$executeRawUnsafe(`DELETE FROM user_subscriptions WHERE "userId" = $1::uuid`, userB.id).catch(() => {});
      await prisma.$executeRawUnsafe(`DELETE FROM sessions WHERE "userId" = $1::uuid`, userB.id).catch(() => {});
      await prisma.$executeRawUnsafe(`DELETE FROM users WHERE id = $1::uuid`, userB.id).catch(() => {});
    }
    if (adminUser?.id) {
      await prisma.$executeRawUnsafe(`DELETE FROM sessions WHERE "userId" = $1::uuid`, adminUser.id).catch(() => {});
      await prisma.$executeRawUnsafe(`DELETE FROM users WHERE id = $1::uuid`, adminUser.id).catch(() => {});
    }

    server.close();
  }
}

runTests().catch((err) => {
  console.error("FATAL ERROR in invoice billing tests:", err);
  process.exit(1);
});
