/**
 * Module 18: Real Storefront Checkout Test Suite
 *
 * Verifies:
 * 1. Server-side price calculation and rejection of client price tampering
 * 2. Missing Stripe configuration fails safely with HTTP 503 (no simulated success)
 * 3. Stripe session creation with correct metadata, mode: "payment", and line items
 * 4. Pending, unpaid order persistence with Stripe session ID association
 * 5. Secure payment confirmation via signed webhook (storefront isolated from subscriptions)
 * 6. Duplicate webhook events and duplicate fulfillment prevention
 * 7. Failed, expired, and canceled checkout handling
 * 8. Stale/delayed event protection (expired cannot reverse paid order)
 * 9. Tenant & website isolation (rejects cross-website session verification)
 * 10. Amount & currency mismatch protection
 */
import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import {
  resolveTrustedOrderItemsAndTotals,
  createStorefrontCheckoutSession,
  verifyStorefrontPayment,
  markStorefrontOrderPaid,
  markStorefrontOrderFailed,
  type Order,
} from "../services/ecommerce/commerce.service.js";
import { handleStripePaymentWebhook } from "../services/subscription.service.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`, details || "");
    failed++;
  }
}

async function runStorefrontCheckoutTests() {
  console.log("=================================================");
  console.log("RUNNING MODULE 18: REAL STOREFRONT CHECKOUT TESTS");
  console.log("=================================================\n");

  const originalStripeKey = process.env.STRIPE_SECRET_KEY;
  const originalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const mockWebhookSecret = "whsec_test_mock_secret_key_1234567890";

  let testUserA: any;
  let testUserB: any;
  let testWebsiteA: any;
  let testWebsiteB: any;

  try {
    // -------------------------------------------------------------------------
    // Setup Test Data
    // -------------------------------------------------------------------------
    testUserA = await prisma.user.create({
      data: {
        email: `storefront-test-a-${Date.now()}@example.com`,
        fullName: "Storefront Tester A",
        passwordHash: "dummyhash",
        emailVerified: true,
      },
    });

    testUserB = await prisma.user.create({
      data: {
        email: `storefront-test-b-${Date.now()}@example.com`,
        fullName: "Storefront Tester B",
        passwordHash: "dummyhash",
        emailVerified: true,
      },
    });

    testWebsiteA = await prisma.website.create({
      data: {
        userId: testUserA.id,
        name: "Shop A",
        slug: `shop-a-${Date.now()}`,
        editorData: {
          commerceSettings: {
            currency: "USD",
            currencySymbol: "$",
            taxEnabled: true,
            taxRate: 10,
            shippingEnabled: true,
          },
          commerceProducts: [
            {
              id: "prod-alpha-1",
              name: "Alpha Premium Widget",
              price: 100.0,
              salePrice: 80.0,
              currency: "USD",
              images: [],
              categories: ["Gadgets"],
              tags: ["popular"],
              stock: 50,
              type: "simple",
              status: "publish",
              slug: "alpha-premium-widget",
            },
            {
              id: "prod-beta-var",
              name: "Beta Customizable T-Shirt",
              price: 30.0,
              currency: "USD",
              images: [],
              categories: ["Apparel"],
              tags: ["clothing"],
              stock: 100,
              type: "variable",
              status: "publish",
              slug: "beta-customizable-t-shirt",
              variants: [
                {
                  id: "var-size-m",
                  attributes: { size: "M", color: "Blue" },
                  price: 35.0,
                  stock: 10,
                },
                {
                  id: "var-size-xl",
                  attributes: { size: "XL", color: "Black" },
                  price: 40.0,
                  salePrice: 38.0,
                  stock: 5,
                },
              ],
            },
          ],
          commerceCoupons: [
            {
              code: "SAVE20",
              type: "percent",
              amount: 20,
              usageCount: 0,
            },
          ],
          commerceOrders: [],
        },
      },
    });

    testWebsiteB = await prisma.website.create({
      data: {
        userId: testUserB.id,
        name: "Shop B",
        slug: `shop-b-${Date.now()}`,
        editorData: {
          commerceOrders: [],
        },
      },
    });

    // -------------------------------------------------------------------------
    // 1. Server-Side Price Calculation & Tampering Prevention
    // -------------------------------------------------------------------------
    console.log("--- 1. Server-Side Catalog Resolution & Tampering Prevention ---");

    const tamperedInput = {
      items: [
        {
          productId: "prod-alpha-1",
          quantity: 2,
          unitPrice: 0.01, // MALICIOUS CLIENT SUBMISSION
          total: 0.02,
        } as any,
      ],
      shippingCost: 0, // MALICIOUS: claims free shipping
    };

    const resolved = resolveTrustedOrderItemsAndTotals(testWebsiteA, tamperedInput);

    // Alpha widget salePrice is 80.00. 2 * 80.00 = 160.00.
    // Shipping: subtotal > 50 -> shipping is 0.
    // Tax: 10% of 160 = 16.00.
    // Grand Total: 160 + 16 = 176.00.
    assert(
      resolved.trustedItems[0].unitPrice === 80.0,
      "Server ignores client-submitted unitPrice (0.01) and resolves true catalog salePrice (80.00)"
    );
    assert(
      resolved.subtotal === 160.0,
      "Server computes true subtotal: 2 * $80 = $160"
    );
    assert(
      resolved.taxAmount === 16.0,
      "Server computes true 10% tax: $16.00"
    );
    assert(
      resolved.total === 176.0,
      "Server computes authoritative total: $176.00"
    );

    // Test Variable Product Variant Resolution
    const variantInput = {
      items: [
        {
          productId: "prod-beta-var",
          variantId: "var-size-xl",
          quantity: 1,
          unitPrice: 1.0, // Malicious
        } as any,
      ],
    };
    const resolvedVar = resolveTrustedOrderItemsAndTotals(testWebsiteA, variantInput);
    assert(
      resolvedVar.trustedItems[0].unitPrice === 38.0,
      "Server resolves variant salePrice (38.00) instead of client value"
    );

    // Test Rejection of Missing Product
    let missingProdError = false;
    try {
      resolveTrustedOrderItemsAndTotals(testWebsiteA, {
        items: [{ productId: "nonexistent-product-id", quantity: 1 }],
      });
    } catch (e: any) {
      missingProdError = e.statusCode === 400 && e.message.includes("not found");
    }
    assert(missingProdError, "Rejects uncataloged product IDs with 400 Bad Request");

    // -------------------------------------------------------------------------
    // 2. Missing Stripe Configuration Fails Safely with HTTP 503
    // -------------------------------------------------------------------------
    console.log("\n--- 2. Missing Stripe Configuration Handling ---");

    delete process.env.STRIPE_SECRET_KEY;

    let failedSafely503 = false;
    try {
      await createStorefrontCheckoutSession({
        websiteId: testWebsiteA.id,
        items: [{ productId: "prod-alpha-1", quantity: 1 }],
      });
    } catch (err: any) {
      failedSafely503 = err.statusCode === 503 && err.code === "PAYMENT_GATEWAY_NOT_CONFIGURED";
    }
    assert(
      failedSafely503,
      "createStorefrontCheckoutSession strictly fails with HTTP 503 PAYMENT_GATEWAY_NOT_CONFIGURED when STRIPE_SECRET_KEY is missing"
    );

    let verify503 = false;
    try {
      await verifyStorefrontPayment(testWebsiteA.id, "cs_test_mock_123");
    } catch (err: any) {
      verify503 = err.statusCode === 503 && err.code === "PAYMENT_GATEWAY_NOT_CONFIGURED";
    }
    assert(
      verify503,
      "verifyStorefrontPayment strictly fails with HTTP 503 when STRIPE_SECRET_KEY is missing"
    );

    // -------------------------------------------------------------------------
    // 3. Real Stripe Session Creation with Order Metadata
    // -------------------------------------------------------------------------
    console.log("\n--- 3. Stripe Checkout Session Creation & Metadata ---");

    process.env.STRIPE_SECRET_KEY = "sk_test_mock_secret_key_storefront";
    process.env.STRIPE_WEBHOOK_SECRET = mockWebhookSecret;

    // Mock global fetch for Stripe API
    const realFetch = global.fetch;
    let stripeCapturedForm: any = null;
    const mockSessionId = "cs_test_storefront_" + Date.now();
    const mockSessionUrl = `https://checkout.stripe.com/c/pay/${mockSessionId}`;

    (global as any).fetch = async (url: string, opts: any) => {
      const urlStr = String(url);
      if (urlStr.includes("api.stripe.com/v1/checkout/sessions")) {
        if (opts.method === "POST") {
          stripeCapturedForm = new URLSearchParams(opts.body);
          return {
            ok: true,
            status: 200,
            json: async () => ({
              id: mockSessionId,
              url: mockSessionUrl,
              mode: "payment",
              payment_status: "unpaid",
            }),
          };
        }
        if (opts.method === "GET") {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              id: mockSessionId,
              payment_status: "paid",
              amount_total: Number(stripeCapturedForm?.get("metadata[expectedTotalMinor]") || 17600),
              currency: "usd",
              payment_intent: "pi_test_intent_123",
              metadata: {
                type: "storefront_order",
                orderId: stripeCapturedForm?.get("metadata[orderId]"),
                websiteId: testWebsiteA.id,
                expectedTotalMinor: stripeCapturedForm?.get("metadata[expectedTotalMinor]"),
              },
            }),
          };
        }
      }
      return realFetch(url, opts);
    };

    const sessionRes = await createStorefrontCheckoutSession({
      websiteId: testWebsiteA.id,
      customerEmail: "buyer@example.com",
      customerName: "Alice Buyer",
      items: [{ productId: "prod-alpha-1", quantity: 2 }], // 160 + 16 tax = 176.00
    });

    assert(sessionRes.success === true, "createStorefrontCheckoutSession succeeds with valid input");
    assert(sessionRes.sessionId === mockSessionId, "Returns Stripe session ID");
    assert(sessionRes.checkoutUrl === mockSessionUrl, "Returns Stripe Checkout redirect URL");
    assert(sessionRes.total === 176.0, "Returns verified order total ($176.00)");

    assert(stripeCapturedForm?.get("mode") === "payment", "Stripe session created in mode: 'payment'");
    assert(
      stripeCapturedForm?.get("metadata[type]") === "storefront_order",
      "Stripe metadata contains type = 'storefront_order'"
    );
    assert(
      stripeCapturedForm?.get("metadata[websiteId]") === testWebsiteA.id,
      "Stripe metadata associates session with correct website ID"
    );
    assert(
      stripeCapturedForm?.get("metadata[orderId]") === sessionRes.orderId,
      "Stripe metadata associates session with correct order ID"
    );
    assert(
      stripeCapturedForm?.get("metadata[expectedTotalMinor]") === "17600",
      "Stripe metadata expectedTotalMinor matches server calculation in cents (17600)"
    );

    // Check that order was saved in Website.editorData as pending and unpaid
    const freshSiteA = await prisma.website.findUnique({ where: { id: testWebsiteA.id } });
    const ordersA: Order[] = (freshSiteA?.editorData as any)?.commerceOrders || [];
    const savedOrder = ordersA.find((o) => o.id === sessionRes.orderId);

    assert(savedOrder !== undefined, "Order is persisted in Website.editorData.commerceOrders");
    assert(savedOrder?.status === "pending", "Order initial status is strictly 'pending'");
    assert(savedOrder?.paymentStatus === "unpaid", "Order initial paymentStatus is strictly 'unpaid'");
    assert(savedOrder?.stripeSessionId === mockSessionId, "Order stores Stripe session ID");

    // -------------------------------------------------------------------------
    // 4. Secure Payment Confirmation via Webhook
    // -------------------------------------------------------------------------
    console.log("\n--- 4. Secure Payment Confirmation & Webhook Idempotency ---");

    const webhookEventId = "evt_storefront_paid_" + Date.now();
    const webhookPayload = {
      id: webhookEventId,
      type: "checkout.session.completed",
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: mockSessionId,
          payment_status: "paid",
          amount_total: 17600,
          currency: "usd",
          payment_intent: "pi_test_intent_storefront_999",
          client_reference_id: sessionRes.orderId,
          metadata: {
            type: "storefront_order",
            orderId: sessionRes.orderId,
            websiteId: testWebsiteA.id,
            expectedTotalMinor: "17600",
          },
        },
      },
    };

    const rawPayload = JSON.stringify(webhookPayload);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto
      .createHmac("sha256", mockWebhookSecret)
      .update(`${timestamp}.${rawPayload}`)
      .digest("hex");
    const sigHeader = `t=${timestamp},v1=${signature}`;

    const webhookResult = await handleStripePaymentWebhook(
      Buffer.from(rawPayload),
      sigHeader
    );

    assert(webhookResult.success === true, "Storefront webhook processed successfully");
    assert(webhookResult.storefront === true, "Identified and routed as storefront payment event");
    assert(webhookResult.orderId === sessionRes.orderId, "Identified correct order ID");

    // Verify order in database is now processing and paid
    const updatedSiteA = await prisma.website.findUnique({ where: { id: testWebsiteA.id } });
    const updatedOrdersA: Order[] = (updatedSiteA?.editorData as any)?.commerceOrders || [];
    const paidOrder = updatedOrdersA.find((o) => o.id === sessionRes.orderId);

    assert(paidOrder?.status === "processing", "Order status transitioned to 'processing'");
    assert(paidOrder?.paymentStatus === "paid", "Order paymentStatus transitioned to 'paid'");
    assert(paidOrder?.paidAt !== undefined, "Order paidAt timestamp populated");
    assert(
      paidOrder?.stripePaymentIntentId === "pi_test_intent_storefront_999",
      "Order stored stripePaymentIntentId"
    );

    // Verify Inventory Reduction (Initial stock was 50, ordered 2 -> should be 48)
    const prodsA: any[] = (updatedSiteA?.editorData as any)?.commerceProducts || [];
    const widgetProd = prodsA.find((p) => p.id === "prod-alpha-1");
    assert(widgetProd?.stock === 48, "Product inventory decremented on paid order (50 -> 48)");

    // -------------------------------------------------------------------------
    // 5. Idempotent Deduplication & Duplicate Fulfillment Prevention
    // -------------------------------------------------------------------------
    console.log("\n--- 5. Idempotent Deduplication & Duplicate Fulfillment Prevention ---");

    // Deliver exact same event again
    const dupWebhookResult = await handleStripePaymentWebhook(
      Buffer.from(rawPayload),
      sigHeader
    );

    assert(
      dupWebhookResult.idempotent === true,
      "Duplicate webhook delivery is detected and deduplicated via payment_webhook_events"
    );

    // Verify inventory was NOT double-decremented
    const siteAfterDup = await prisma.website.findUnique({ where: { id: testWebsiteA.id } });
    const widgetAfterDup = ((siteAfterDup?.editorData as any)?.commerceProducts || []).find(
      (p: any) => p.id === "prod-alpha-1"
    );
    assert(
      widgetAfterDup?.stock === 48,
      "Duplicate webhook delivery does NOT cause duplicate inventory reduction (stock remains 48)"
    );

    // -------------------------------------------------------------------------
    // 6. Failed, Canceled, and Expired Checkout Sessions
    // -------------------------------------------------------------------------
    console.log("\n--- 6. Failed / Expired Checkout Sessions ---");

    // Create an unpaid pending order for testing expiration
    const expireOrderRes = await createStorefrontCheckoutSession({
      websiteId: testWebsiteA.id,
      items: [{ productId: "prod-alpha-1", quantity: 1 }],
    });

    const expireEventId = "evt_storefront_expired_" + Date.now();
    const expirePayload = {
      id: expireEventId,
      type: "checkout.session.expired",
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: expireOrderRes.sessionId,
          metadata: {
            type: "storefront_order",
            orderId: expireOrderRes.orderId,
            websiteId: testWebsiteA.id,
          },
        },
      },
    };

    const expireRaw = JSON.stringify(expirePayload);
    const expireSig = crypto
      .createHmac("sha256", mockWebhookSecret)
      .update(`${timestamp}.${expireRaw}`)
      .digest("hex");
    const expireSigHeader = `t=${timestamp},v1=${expireSig}`;

    const expireResult = await handleStripePaymentWebhook(
      Buffer.from(expireRaw),
      expireSigHeader
    );

    assert(expireResult.expired === true, "checkout.session.expired marks session as expired");

    const siteAfterExpire = await prisma.website.findUnique({ where: { id: testWebsiteA.id } });
    const expiredOrder = ((siteAfterExpire?.editorData as any)?.commerceOrders || []).find(
      (o: any) => o.id === expireOrderRes.orderId
    );
    assert(expiredOrder?.status === "failed", "Expired order status transitioned to 'failed'");
    assert(expiredOrder?.paymentStatus === "failed", "Expired order paymentStatus transitioned to 'failed'");

    // -------------------------------------------------------------------------
    // 7. Stale/Delayed Event Cannot Reverse a Paid Order
    // -------------------------------------------------------------------------
    console.log("\n--- 7. Stale Event Reversal Protection ---");

    // Attempt to mark the previously paid order as failed via delayed expiration
    await markStorefrontOrderFailed(testWebsiteA.id, sessionRes.orderId, "delayed_late_arrival");

    const siteAfterLate = await prisma.website.findUnique({ where: { id: testWebsiteA.id } });
    const checkPaidOrder = ((siteAfterLate?.editorData as any)?.commerceOrders || []).find(
      (o: any) => o.id === sessionRes.orderId
    );
    assert(
      checkPaidOrder?.paymentStatus === "paid" && checkPaidOrder?.status === "processing",
      "Delayed or out-of-order failure/expiration event strictly CANNOT reverse an already paid order"
    );

    // -------------------------------------------------------------------------
    // 8. Tenant & Website Isolation
    // -------------------------------------------------------------------------
    console.log("\n--- 8. Cross-Tenant and Cross-Website Isolation ---");

    let tenantMismatchCaught = false;
    try {
      // Attempt to verify session belonging to Website A on Website B
      await verifyStorefrontPayment(testWebsiteB.id, mockSessionId);
    } catch (err: any) {
      tenantMismatchCaught = err.statusCode === 404 || err.statusCode === 403;
    }
    assert(
      tenantMismatchCaught,
      "Cross-website checkout verification is strictly rejected (order not found / tenant mismatch)"
    );

    // -------------------------------------------------------------------------
    // 9. Payment Amount & Currency Mismatch Protection
    // -------------------------------------------------------------------------
    console.log("\n--- 9. Payment Amount & Currency Mismatch Protection ---");

    const mismatchOrderRes = await createStorefrontCheckoutSession({
      websiteId: testWebsiteA.id,
      items: [{ productId: "prod-alpha-1", quantity: 1 }],
    });

    let amountMismatchCaught = false;
    try {
      await markStorefrontOrderPaid(testWebsiteA.id, mismatchOrderRes.orderId, {
        id: "cs_fake_tampered",
        amount_total: 99, // Tampered amount (expected 8800)
        currency: "usd",
      });
    } catch (err: any) {
      amountMismatchCaught = err.statusCode === 400 && err.code === "AMOUNT_MISMATCH";
    }
    assert(
      amountMismatchCaught,
      "Rejects payment confirmation when gateway amount does not match expected order total"
    );

    let currencyMismatchCaught = false;
    try {
      await markStorefrontOrderPaid(testWebsiteA.id, mismatchOrderRes.orderId, {
        id: "cs_fake_tampered_curr",
        amount_total: 8800,
        currency: "eur", // Mismatched currency (expected usd)
      });
    } catch (err: any) {
      currencyMismatchCaught = err.statusCode === 400 && err.code === "CURRENCY_MISMATCH";
    }
    assert(
      currencyMismatchCaught,
      "Rejects payment confirmation when gateway currency does not match expected order currency"
    );

    // Restore real fetch
    (global as any).fetch = realFetch;
  } catch (err) {
    console.error("Test execution failed unexpectedly:", err);
    failed++;
  } finally {
    // Restore environment variables
    if (originalStripeKey) process.env.STRIPE_SECRET_KEY = originalStripeKey;
    else delete process.env.STRIPE_SECRET_KEY;

    if (originalWebhookSecret) process.env.STRIPE_WEBHOOK_SECRET = originalWebhookSecret;
    else delete process.env.STRIPE_WEBHOOK_SECRET;

    // Cleanup test data
    if (testWebsiteA) {
      await prisma.website.delete({ where: { id: testWebsiteA.id } }).catch(() => {});
    }
    if (testWebsiteB) {
      await prisma.website.delete({ where: { id: testWebsiteB.id } }).catch(() => {});
    }
    if (testUserA) {
      await prisma.$executeRawUnsafe(
        `DELETE FROM payment_webhook_events WHERE "userId" = $1::uuid OR "checkoutSessionId" LIKE 'cs_test_storefront%'`,
        testUserA.id
      ).catch(() => {});
      await prisma.user.delete({ where: { id: testUserA.id } }).catch(() => {});
    }
    if (testUserB) {
      await prisma.user.delete({ where: { id: testUserB.id } }).catch(() => {});
    }
  }

  console.log("\n=================================================");
  console.log(`STOREFRONT CHECKOUT RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runStorefrontCheckoutTests();
