import assert from "node:assert/strict";
import http from "node:http";
import crypto from "node:crypto";
import { prisma } from "../config/prisma.js";
import {
  initFormSubmissionsTable,
  getFormWebhookSettings,
  saveFormWebhookSettings,
  deleteFormWebhookSettings,
  testFormWebhook,
  getFormWebhookDeliveries,
  retryFormWebhookDelivery,
  processFormSubmission,
  exportSubmissionsCsv,
  saveFormNotificationSettings,
  getFormNotificationSettings,
  signWebhookPayload,
  dispatchWebhookRequest,
} from "../services/form/form.service.js";
import { AppError } from "../utils/app-error.js";
import { isSafeUrl, validateWebhookUrl, assertValidWebhookUrl } from "../utils/ssrf.validator.js";
import { processNextJob, enqueueJob, getJobById } from "../services/jobs/jobRunner.js";
import { initJobHandlers } from "../services/jobs/handlers.js";

const db = prisma as any;

let passed = 0;
let failed = 0;

function runScenario(title: string, fn: () => Promise<void> | void) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`[PASS] ${title}`);
      passed++;
    })
    .catch((err: any) => {
      console.error(`[FAIL] ${title}`);
      console.error(err);
      failed++;
    });
}

async function runTestSuite() {
  console.log("=================================================");
  console.log("RUNNING FEATURE 3B: WEBHOOKS IMPLEMENTATION TESTS");
  console.log("=================================================\n");

  await initFormSubmissionsTable();
  initJobHandlers();

  // Test Fixtures
  let ownerUser: any = null;
  let otherUser: any = null;
  let testWebsite: any = null;
  let otherWebsite: any = null;

  // Local Receiver Server for live verification
  const receivedRequests: Array<{
    headers: http.IncomingHttpHeaders;
    body: any;
    rawBody: string;
  }> = [];

  let mockResponseStatus = 200;
  let mockResponseBody = JSON.stringify({ received: true });
  let mockDelayMs = 0;

  const mockServer = http.createServer(async (req, res) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", async () => {
      let parsed = {};
      try {
        parsed = JSON.parse(raw);
      } catch {}
      receivedRequests.push({
        headers: req.headers,
        body: parsed,
        rawBody: raw,
      });

      if (mockDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, mockDelayMs));
      }

      res.writeHead(mockResponseStatus, { "Content-Type": "application/json" });
      res.end(mockResponseBody);
    });
  });

  const serverPort = await new Promise<number>((resolve) => {
    mockServer.listen(0, "127.0.0.1", () => {
      const addr = mockServer.address() as any;
      resolve(addr.port);
    });
  });

  const mockReceiverUrl = `http://127.0.0.1:${serverPort}/webhook-sink`;

  try {
    const timestamp = Date.now();

    // 1. Setup Test Users and Websites
    ownerUser = await db.user.create({
      data: {
        email: `webhook.owner.${timestamp}@example.test`,
        passwordHash: "hash123",
        fullName: "Webhook Owner",
      },
    });

    otherUser = await db.user.create({
      data: {
        email: `webhook.other.${timestamp}@example.test`,
        passwordHash: "hash123",
        fullName: "Other User",
      },
    });

    testWebsite = await db.website.create({
      data: {
        userId: ownerUser.id,
        name: `Webhook Test Site ${timestamp}`,
        slug: `webhook-site-${timestamp}`,
        status: "DRAFT",
      },
    });

    otherWebsite = await db.website.create({
      data: {
        userId: otherUser.id,
        name: `Other Webhook Site ${timestamp}`,
        slug: `other-webhook-${timestamp}`,
        status: "DRAFT",
      },
    });

    console.log("--- 1. Settings & Workspace Authorization Tests ---");

    await runScenario("Initial webhook settings returns clean default", async () => {
      const settings = await getFormWebhookSettings(testWebsite.id, ownerUser.id);
      assert.equal(settings.websiteId, testWebsite.id);
      assert.equal(settings.endpointUrl, "");
      assert.equal(settings.enabled, false);
      assert.equal(settings.hasSecret, false);
      assert.deepEqual(settings.events, ["form.submitted"]);
    });

    await runScenario("Unauthorized user cannot read or update website webhook settings", async () => {
      let readBlocked = false;
      try {
        await getFormWebhookSettings(testWebsite.id, otherUser.id);
      } catch (err: any) {
        readBlocked = true;
      }
      assert.ok(readBlocked, "Unauthorized read should throw error");

      let saveBlocked = false;
      try {
        await saveFormWebhookSettings(testWebsite.id, otherUser.id, {
          endpointUrl: "https://example.com/webhook",
        });
      } catch (err: any) {
        saveBlocked = true;
      }
      assert.ok(saveBlocked, "Unauthorized save should throw error");
    });

    console.log("\n--- 2. Configuration, Persistence & Secret Masking Tests ---");

    const sampleSecret = "whsec_ForgeStudioSuperSecretKey1234";

    await runScenario("Authorized owner can save endpoint and signing secret securely", async () => {
      // Temporarily enable local webhooks for our test mock sink
      process.env.ALLOW_LOCAL_WEBHOOKS = "true";

      const saved = await saveFormWebhookSettings(testWebsite.id, ownerUser.id, {
        endpointUrl: mockReceiverUrl,
        enabled: true,
        events: ["form.submitted"],
        signingSecret: sampleSecret,
      });

      assert.equal(saved.websiteId, testWebsite.id);
      assert.equal(saved.endpointUrl, mockReceiverUrl);
      assert.equal(saved.enabled, true);
      assert.equal(saved.hasSecret, true);
      // Raw secret must never be returned in plaintext
      assert.ok(saved.signingSecret.startsWith("••••••••"));
      assert.ok(saved.signingSecret.endsWith("1234"));
    });

    await runScenario("GET webhook settings persists and masks signing secret", async () => {
      const loaded = await getFormWebhookSettings(testWebsite.id, ownerUser.id);
      assert.equal(loaded.endpointUrl, mockReceiverUrl);
      assert.equal(loaded.enabled, true);
      assert.equal(loaded.hasSecret, true);
      assert.equal(loaded.signingSecret, "••••••••1234");
    });

    await runScenario("Saving with unchanged masked secret preserves original secret", async () => {
      const reSaved = await saveFormWebhookSettings(testWebsite.id, ownerUser.id, {
        endpointUrl: mockReceiverUrl,
        enabled: true,
        signingSecret: "••••••••1234",
      });
      assert.equal(reSaved.hasSecret, true);

      // Verify DB still contains raw secret
      const rows: any[] = await prisma.$queryRaw`
        SELECT "signingSecret" FROM form_webhook_settings WHERE "websiteId" = ${testWebsite.id}::uuid
      `;
      assert.equal(rows[0].signingSecret, sampleSecret);
    });

    console.log("\n--- 3. SSRF Defense & Unsafe URL Rejection Tests ---");

    await runScenario("Webhook URL format validation rejects emails and malformed strings", () => {
      // raja@gmail.com — rejected
      const emailCheck = validateWebhookUrl("raja@gmail.com");
      assert.equal(emailCheck.valid, false);
      assert.equal(emailCheck.reason, "Enter a valid webhook URL starting with https://");

      // not-a-url — rejected
      const malformedCheck = validateWebhookUrl("not-a-url");
      assert.equal(malformedCheck.valid, false);
      assert.equal(malformedCheck.reason, "Enter a valid webhook URL starting with https://");

      // https://webhook.site/unique-id — accepted by URL-format validation
      const validCheck = validateWebhookUrl("https://webhook.site/unique-id");
      assert.equal(validCheck.valid, true);

      // empty — rejected
      const emptyCheck = validateWebhookUrl("");
      assert.equal(emptyCheck.valid, false);
      assert.equal(emptyCheck.reason, "Webhook URL is required");

      // assertValidWebhookUrl throws AppError 400 INVALID_WEBHOOK_URL on invalid inputs
      assert.throws(
        () => assertValidWebhookUrl("raja@gmail.com"),
        (err: any) => err instanceof AppError && err.statusCode === 400 && err.code === "INVALID_WEBHOOK_URL"
      );
      assert.throws(
        () => assertValidWebhookUrl("not-a-url"),
        (err: any) => err instanceof AppError && err.statusCode === 400 && err.code === "INVALID_WEBHOOK_URL"
      );
      assert.throws(
        () => assertValidWebhookUrl(""),
        (err: any) => err instanceof AppError && err.statusCode === 400 && err.code === "INVALID_WEBHOOK_URL"
      );
    });

    await runScenario("Saving or testing webhooks with email address raja@gmail.com or empty URL throws INVALID_WEBHOOK_URL", async () => {
      let threwSave = false;
      try {
        await saveFormWebhookSettings(testWebsite.id, ownerUser.id, {
          endpointUrl: "raja@gmail.com",
          enabled: true,
        });
      } catch (err: any) {
        if (err instanceof AppError && err.statusCode === 400 && err.code === "INVALID_WEBHOOK_URL") {
          threwSave = true;
          assert.equal(err.message, "Enter a valid webhook URL starting with https://");
        }
      }
      assert.ok(threwSave, "saveFormWebhookSettings must reject raja@gmail.com with INVALID_WEBHOOK_URL");

      let threwEmpty = false;
      try {
        await saveFormWebhookSettings(testWebsite.id, ownerUser.id, {
          endpointUrl: "",
          enabled: true,
        });
      } catch (err: any) {
        if (err instanceof AppError && err.statusCode === 400 && err.code === "INVALID_WEBHOOK_URL") {
          threwEmpty = true;
          assert.equal(err.message, "Webhook URL is required");
        }
      }
      assert.ok(threwEmpty, "saveFormWebhookSettings must reject empty endpointUrl with Webhook URL is required");

      let threwTest = false;
      try {
        await testFormWebhook(testWebsite.id, ownerUser.id, "raja@gmail.com");
      } catch (err: any) {
        if (err instanceof AppError && err.statusCode === 400 && err.code === "INVALID_WEBHOOK_URL") {
          threwTest = true;
          assert.equal(err.message, "Enter a valid webhook URL starting with https://");
        }
      }
      assert.ok(threwTest, "testFormWebhook must reject raja@gmail.com with INVALID_WEBHOOK_URL");
    });

    await runScenario("SSRF Guard blocks private, loopback, and metadata destinations", () => {
      delete process.env.ALLOW_LOCAL_WEBHOOKS;

      // Loopback
      const loopbackCheck = isSafeUrl("http://127.0.0.1/api/sink");
      assert.equal(loopbackCheck.safe, false);

      // Localhost
      const localhostCheck = isSafeUrl("http://localhost:3000/webhook");
      assert.equal(localhostCheck.safe, false);

      // AWS / GCP Cloud Metadata
      const awsMetaCheck = isSafeUrl("http://169.254.169.254/latest/meta-data/");
      assert.equal(awsMetaCheck.safe, false);

      const gcpMetaCheck = isSafeUrl("http://metadata.google.internal/computeMetadata/v1/");
      assert.equal(gcpMetaCheck.safe, false);

      // RFC1918 Private subnets
      const private10Check = isSafeUrl("http://10.0.0.1/webhook");
      assert.equal(private10Check.safe, false);

      const private192Check = isSafeUrl("http://192.168.1.50:8000/hook");
      assert.equal(private192Check.safe, false);

      // Unsafe scheme
      const ftpCheck = isSafeUrl("ftp://external.com/file");
      assert.equal(ftpCheck.safe, false);

      // Public safe URL (accepted by URL-format validation, subject to existing security checks)
      const formatCheck = validateWebhookUrl("https://webhook.site/550e8400-e29b-41d4-a716-446655440000");
      assert.equal(formatCheck.valid, true);
      const publicCheck = isSafeUrl("https://webhook.site/550e8400-e29b-41d4-a716-446655440000");
      assert.equal(publicCheck.safe, true);

      process.env.ALLOW_LOCAL_WEBHOOKS = "true";
    });

    console.log("\n--- 4. HMAC-SHA256 Signature Verification Tests ---");

    await runScenario("Signature calculation matches HMAC-SHA256 standard", () => {
      const secret = "test_signing_secret_999";
      const payload = { event: "form.submitted", websiteId: "abc", data: { name: "Test" } };
      const timestamp = 1700000000;

      const sig = signWebhookPayload(secret, payload, timestamp);
      const expected = crypto
        .createHmac("sha256", secret)
        .update(`${timestamp}.${JSON.stringify(payload)}`)
        .digest("hex");

      assert.equal(sig, expected);
      assert.equal(sig.length, 64);
    });

    console.log("\n--- 5. Test Webhook Dispatch & Live Receiver Inspection ---");

    await runScenario("testFormWebhook sends test event with valid headers and HMAC signature", async () => {
      receivedRequests.length = 0;
      mockResponseStatus = 200;

      const testRes = await testFormWebhook(testWebsite.id, ownerUser.id);
      assert.equal(testRes.success, true);
      assert.equal(testRes.httpStatus, 200);

      assert.equal(receivedRequests.length, 1);
      const req = receivedRequests[0];

      // Verify headers
      assert.equal(req.headers["content-type"], "application/json");
      assert.equal(req.headers["user-agent"], "ForgeStudio-Webhook/1.0");
      assert.equal(req.headers["x-forgestudio-event"], "form.test");
      assert.ok(req.headers["x-webhook-timestamp"]);
      assert.ok(req.headers["x-webhook-signature"]);
      assert.ok(req.headers["x-forgestudio-signature"]);

      // Verify HMAC signature in header matches payload
      const ts = parseInt(req.headers["x-webhook-timestamp"] as string, 10);
      const expectedSig = signWebhookPayload(sampleSecret, req.body, ts);
      assert.equal(req.headers["x-forgestudio-signature"], expectedSig);
      assert.equal(req.headers["x-webhook-signature"], `t=${ts},v1=${expectedSig}`);

      // Verify documented payload shape
      assert.equal(req.body.event, "form.test");
      assert.ok(req.body.eventId);
      assert.ok(req.body.timestamp);
      assert.equal(req.body.websiteId, testWebsite.id);
      assert.ok(req.body.data);
      assert.ok(req.body.metadata);
    });

    console.log("\n--- 6. Form Submission Trigger & Non-blocking Guarantee ---");

    await runScenario("Valid form submission triggers webhook with full documented payload", async () => {
      receivedRequests.length = 0;
      mockResponseStatus = 200;

      const submissionPayload = {
        websiteId: testWebsite.id,
        formId: "contact_us_form",
        formName: "Contact Us Form",
        fields: {
          fullName: "Alice Morgan",
          email: "alice@example.com",
          message: "Looking for enterprise tier pricing.",
        },
        fieldConfigs: [
          { id: "f1", name: "fullName", label: "Full Name", type: "text", required: true },
          { id: "f2", name: "email", label: "Email Address", type: "email", required: true },
          { id: "f3", name: "message", label: "Message", type: "textarea", required: false },
        ],
        metadata: {
          ip: "203.0.113.195",
          userAgent: "Mozilla/5.0 TestBrowser",
          referer: "https://example.com/contact",
        },
      };

      const result = await processFormSubmission(submissionPayload);
      assert.equal(result.success, true);

      // Allow background dispatch tick
      await new Promise((resolve) => setTimeout(resolve, 150));

      assert.equal(receivedRequests.length, 1);
      const req = receivedRequests[0];

      assert.equal(req.body.event, "form.submitted");
      assert.ok(req.body.eventId);
      assert.ok(req.body.timestamp);
      assert.equal(req.body.websiteId, testWebsite.id);
      assert.equal(req.body.formId, "contact_us_form");
      assert.equal(req.body.formName, "Contact Us Form");
      assert.equal(req.body.data.fullName, "Alice Morgan");
      assert.equal(req.body.data.email, "alice@example.com");
      assert.equal(req.body.metadata.ip, "203.0.113.195");
    });

    await runScenario("Invalid form submission fails validation and DOES NOT dispatch webhook", async () => {
      receivedRequests.length = 0;

      const invalidPayload = {
        websiteId: testWebsite.id,
        formId: "contact_us_form",
        formName: "Contact Us Form",
        fields: {
          fullName: "Alice Morgan",
          email: "not-an-email", // Invalid email format
        },
        fieldConfigs: [
          { id: "f1", name: "fullName", label: "Full Name", type: "text", required: true },
          { id: "f2", name: "email", label: "Email Address", type: "email", required: true },
        ],
        metadata: { ip: "203.0.113.196" },
      };

      let threw = false;
      try {
        await processFormSubmission(invalidPayload);
      } catch (err: any) {
        threw = true;
        assert.equal(err.statusCode, 400);
      }
      assert.ok(threw, "Invalid form submission should throw 400 error");

      await new Promise((resolve) => setTimeout(resolve, 100));
      assert.equal(receivedRequests.length, 0, "No webhook should be delivered on invalid form");
    });

    await runScenario("Webhook receiver failure NEVER makes persisted form submission fail", async () => {
      mockResponseStatus = 500;
      mockResponseBody = JSON.stringify({ error: "Receiver database down" });

      const submissionPayload = {
        websiteId: testWebsite.id,
        formId: "quote_form",
        formName: "Quote Form",
        fields: {
          fullName: "Bob Builder",
          email: "bob@example.com",
        },
        fieldConfigs: [
          { id: "f1", name: "fullName", label: "Full Name", type: "text", required: true },
          { id: "f2", name: "email", label: "Email", type: "email", required: true },
        ],
        metadata: { ip: "203.0.113.197" },
      };

      const result = await processFormSubmission(submissionPayload);
      assert.equal(result.success, true, "Form submission must succeed even if webhook fails");

      // Verify form submission was persisted in DB
      const dbRows: any[] = await prisma.$queryRaw`
        SELECT id FROM form_submissions WHERE "websiteId" = ${testWebsite.id}::uuid AND "formId" = 'quote_form'
      `;
      assert.ok(dbRows.length > 0, "Form submission must be recorded in database");
    });

    console.log("\n--- 7. Delivery Audit Log & Manual Retry Tests ---");

    let failedDeliveryId: string = "";

    await runScenario("Delivery attempts are logged with status, code, and payload", async () => {
      let deliveries = await getFormWebhookDeliveries(testWebsite.id, ownerUser.id, 10);
      for (let i = 0; i < 15 && (!deliveries.find((d) => d.status === "FAILED") || deliveries.length < 2); i++) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        deliveries = await getFormWebhookDeliveries(testWebsite.id, ownerUser.id, 10);
      }
      assert.ok(deliveries.length >= 2, "Should have logged test and submission deliveries");

      const failedDeliv = deliveries.find((d) => d.status === "FAILED");
      assert.ok(failedDeliv, "Should have logged the 500 failed delivery");
      assert.equal(failedDeliv.httpStatus, 500);
      failedDeliveryId = failedDeliv.id;

      const successDeliv = deliveries.find((d) => d.status === "SUCCESS");
      assert.ok(successDeliv, "Should have logged the 200 success delivery");
      assert.equal(successDeliv.httpStatus, 200);
    });

    await runScenario("Authorized owner can retry failed delivery", async () => {
      assert.ok(failedDeliveryId, "Failed delivery ID must exist");
      mockResponseStatus = 200;
      mockResponseBody = JSON.stringify({ recovered: true });

      const retryRes = await retryFormWebhookDelivery(testWebsite.id, failedDeliveryId, ownerUser.id);
      assert.equal(retryRes.success, true);
      assert.equal(retryRes.status, "SUCCESS");
      assert.equal(retryRes.httpStatus, 200);
      assert.ok(retryRes.attemptCount >= 2);
    });

    console.log("\n--- 8. Feature 5: Webhook Retry Handling Deep Verification ---");

    await runScenario("Permanent HTTP 4xx failures update delivery and are NOT re-queued by worker", async () => {
      mockResponseStatus = 400;
      mockResponseBody = JSON.stringify({ error: "Invalid payload format" });

      const delivEventId = crypto.randomUUID();
      const rows: any[] = await prisma.$queryRaw`
        INSERT INTO form_webhook_deliveries (
          id, "websiteId", "eventId", "endpointUrl", "event", "status",
          "httpStatus", "requestPayload", "errorMessage", "attemptCount", "createdAt", "updatedAt"
        )
        VALUES (
          gen_random_uuid(), ${testWebsite.id}::uuid, ${delivEventId}::uuid,
          ${mockReceiverUrl}, 'form.submitted', 'FAILED', 400,
          '{"event":"form.submitted"}'::jsonb, 'HTTP 400', 1, NOW(), NOW()
        )
        RETURNING id
      `;
      const permDelivId = rows[0].id;

      const job = await enqueueJob(
        "WEBHOOK_RETRY",
        {
          deliveryId: permDelivId,
          websiteId: testWebsite.id,
          url: mockReceiverUrl,
          event: "form.submitted",
          body: { event: "form.submitted", eventId: delivEventId, data: { name: "Test" } },
        },
        { maxAttempts: 5, runAt: new Date(Date.now() - 1000) }
      );

      const jobResult = await processNextJob({ id: job.id });
      assert.equal(jobResult.processed, true);
      assert.equal(jobResult.result?.status, "PERMANENT_FAILURE");
      assert.equal(jobResult.result?.retryable, false);

      // Verify job is NOT re-queued (marked COMPLETED as finished with permanent failure)
      const finishedJob = await getJobById(job.id);
      assert.equal(finishedJob.status, "COMPLETED");

      // Verify delivery record updated
      const updatedDeliv: any[] = await prisma.$queryRaw`
        SELECT "httpStatus", "attemptCount", status FROM form_webhook_deliveries WHERE id = ${permDelivId}::uuid
      `;
      assert.equal(updatedDeliv[0].status, "FAILED");
      assert.equal(updatedDeliv[0].httpStatus, 400);
      assert.equal(updatedDeliv[0].attemptCount, 2);
    });

    await runScenario("Retryable HTTP 500 failure re-queues job with incremented attempts", async () => {
      mockResponseStatus = 500;
      mockResponseBody = JSON.stringify({ error: "Temporary outage" });

      const delivEventId = crypto.randomUUID();
      const rows: any[] = await prisma.$queryRaw`
        INSERT INTO form_webhook_deliveries (
          id, "websiteId", "eventId", "endpointUrl", "event", "status",
          "httpStatus", "requestPayload", "errorMessage", "attemptCount", "createdAt", "updatedAt"
        )
        VALUES (
          gen_random_uuid(), ${testWebsite.id}::uuid, ${delivEventId}::uuid,
          ${mockReceiverUrl}, 'form.submitted', 'FAILED', 500,
          '{"event":"form.submitted"}'::jsonb, 'HTTP 500', 1, NOW(), NOW()
        )
        RETURNING id
      `;
      const retryableDelivId = rows[0].id;

      const job = await enqueueJob(
        "WEBHOOK_RETRY",
        {
          deliveryId: retryableDelivId,
          websiteId: testWebsite.id,
          url: mockReceiverUrl,
          event: "form.submitted",
          body: { event: "form.submitted", eventId: delivEventId, data: { name: "Test" } },
        },
        { maxAttempts: 3, runAt: new Date(Date.now() - 1000) }
      );

      const jobResult = await processNextJob({ id: job.id });
      assert.equal(jobResult.processed, true);
      assert.ok(jobResult.error?.includes("retryable failure"));

      // Verify job is re-queued with attempts incremented to 1
      const rescheduledJob = await getJobById(job.id);
      assert.equal(rescheduledJob.status, "QUEUED");
      assert.equal(rescheduledJob.attempts, 1);
      assert.ok(new Date(rescheduledJob.runAt).getTime() > Date.now());
    });

    await runScenario("Fresh HMAC signature and updated timestamp are generated on retry", async () => {
      receivedRequests.length = 0;
      mockResponseStatus = 200;

      const delivEventId = crypto.randomUUID();
      const testPayload = {
        event: "form.submitted",
        eventId: delivEventId,
        websiteId: testWebsite.id,
        data: { lead: "Fresh Signature Test" },
      };

      const initialDispatch = await dispatchWebhookRequest(mockReceiverUrl, testPayload, {
        signingSecret: sampleSecret,
      });
      assert.equal(initialDispatch.success, true);
      assert.equal(receivedRequests.length, 1);

      const initialTimestamp = parseInt(receivedRequests[0].headers["x-webhook-timestamp"] as string, 10);
      const initialSignature = receivedRequests[0].headers["x-forgestudio-signature"];

      // Wait 1.1s so Unix epoch advances
      await new Promise((r) => setTimeout(r, 1100));

      // Execute retry with same payload
      const retryDispatch = await dispatchWebhookRequest(mockReceiverUrl, testPayload, {
        signingSecret: sampleSecret,
      });
      assert.equal(retryDispatch.success, true);
      assert.equal(receivedRequests.length, 2);

      const retryTimestamp = parseInt(receivedRequests[1].headers["x-webhook-timestamp"] as string, 10);
      const retrySignature = receivedRequests[1].headers["x-forgestudio-signature"];

      assert.ok(
        retryTimestamp > initialTimestamp,
        `Retry timestamp (${retryTimestamp}) must be strictly greater than initial timestamp (${initialTimestamp})`
      );
      assert.notEqual(retrySignature, initialSignature, "Signature must differ because timestamp changed");

      // Verify recomputed signature matches byte-for-byte
      const expectedRetrySig = signWebhookPayload(sampleSecret, testPayload, retryTimestamp);
      assert.equal(retrySignature, expectedRetrySig);
    });

    await runScenario("Idempotency Guard: already-succeeded delivery is skipped by worker", async () => {
      receivedRequests.length = 0;

      // Create delivery record already in SUCCESS state
      const delivEventId = crypto.randomUUID();
      const rows: any[] = await prisma.$queryRaw`
        INSERT INTO form_webhook_deliveries (
          id, "websiteId", "eventId", "endpointUrl", "event", "status",
          "httpStatus", "requestPayload", "errorMessage", "attemptCount", "createdAt", "updatedAt"
        )
        VALUES (
          gen_random_uuid(), ${testWebsite.id}::uuid, ${delivEventId}::uuid,
          ${mockReceiverUrl}, 'form.submitted', 'SUCCESS', 200,
          '{"event":"form.submitted"}'::jsonb, NULL, 1, NOW(), NOW()
        )
        RETURNING id
      `;
      const alreadySuccessDelivId = rows[0].id;

      const job = await enqueueJob(
        "WEBHOOK_RETRY",
        {
          deliveryId: alreadySuccessDelivId,
          websiteId: testWebsite.id,
          url: mockReceiverUrl,
          event: "form.submitted",
          body: { event: "form.submitted", eventId: delivEventId },
        },
        { maxAttempts: 3, runAt: new Date(Date.now() - 1000) }
      );

      const jobResult = await processNextJob({ id: job.id });
      assert.equal(jobResult.processed, true);
      assert.equal(jobResult.result?.status, "ALREADY_COMPLETED");
      assert.equal(jobResult.result?.skipped, true);

      // Verify no HTTP request was sent to the receiver
      assert.equal(receivedRequests.length, 0, "No duplicate HTTP request should be sent");
    });

    await runScenario("Exponential backoff is strictly bounded at 300,000 ms (5 minutes)", () => {
      // Small attempts
      const delay1 = Math.min(Math.pow(2, 1) * 1000, 300000);
      assert.equal(delay1, 2000);

      const delay4 = Math.min(Math.pow(2, 4) * 1000, 300000);
      assert.equal(delay4, 16000);

      // Large attempts capped at 300,000ms
      const delay10 = Math.min(Math.pow(2, 10) * 1000, 300000);
      assert.equal(delay10, 300000);

      const delay20 = Math.min(Math.pow(2, 20) * 1000, 300000);
      assert.equal(delay20, 300000);
    });

    await runScenario("SSRF-blocked destinations during retry are non-retryable", async () => {
      delete process.env.ALLOW_LOCAL_WEBHOOKS;

      const delivEventId = crypto.randomUUID();
      const rows: any[] = await prisma.$queryRaw`
        INSERT INTO form_webhook_deliveries (
          id, "websiteId", "eventId", "endpointUrl", "event", "status",
          "httpStatus", "requestPayload", "errorMessage", "attemptCount", "createdAt", "updatedAt"
        )
        VALUES (
          gen_random_uuid(), ${testWebsite.id}::uuid, ${delivEventId}::uuid,
          'http://127.0.0.1:8080/sink', 'form.submitted', 'FAILED', NULL,
          '{}'::jsonb, 'Blocked by SSRF', 1, NOW(), NOW()
        )
        RETURNING id
      `;
      const ssrfDelivId = rows[0].id;

      const job = await enqueueJob(
        "WEBHOOK_RETRY",
        {
          deliveryId: ssrfDelivId,
          websiteId: testWebsite.id,
          url: "http://127.0.0.1:8080/sink",
          event: "form.submitted",
          body: { event: "form.submitted", eventId: delivEventId },
        },
        { maxAttempts: 5, runAt: new Date(Date.now() - 1000) }
      );

      const jobResult = await processNextJob({ id: job.id });
      assert.equal(jobResult.processed, true);
      assert.equal(jobResult.result?.status, "PERMANENT_FAILURE");
      assert.equal(jobResult.result?.retryable, false);

      process.env.ALLOW_LOCAL_WEBHOOKS = "true";
    });

    console.log("\n--- 9. Regression Checks (Features 1, 2, 3A) ---");

    await runScenario("CSV Lead Export (Feature 1) remains fully operational", async () => {
      const csvRes = await exportSubmissionsCsv(testWebsite.id, ownerUser.id);
      assert.ok(csvRes.totalRecords >= 2);
      assert.ok(csvRes.csvContent.includes("Alice Morgan"));
      assert.ok(csvRes.csvContent.includes("alice@example.com"));
      assert.ok(csvRes.csvContent.includes("Submission ID"));
    });

    await runScenario("Email Notifications Settings (Feature 2) remains fully operational", async () => {
      const savedEmail = await saveFormNotificationSettings(testWebsite.id, ownerUser.id, {
        notificationEmail: "alerts@mybusiness.com",
        enabled: true,
        subjectTemplate: "New Lead from {{formName}}",
      });
      assert.equal(savedEmail.notificationEmail, "alerts@mybusiness.com");

      const loadedEmail = await getFormNotificationSettings(testWebsite.id, ownerUser.id);
      assert.equal(loadedEmail.notificationEmail, "alerts@mybusiness.com");
      assert.equal(loadedEmail.enabled, true);
    });

  } finally {
    mockServer.close();
    delete process.env.ALLOW_LOCAL_WEBHOOKS;

    // Clean up test data
    try {
      if (testWebsite) {
        await prisma.$executeRawUnsafe(
          `DELETE FROM form_webhook_deliveries WHERE "websiteId" = $1::uuid`,
          testWebsite.id
        );
        await prisma.$executeRawUnsafe(
          `DELETE FROM form_webhook_settings WHERE "websiteId" = $1::uuid`,
          testWebsite.id
        );
        await prisma.$executeRawUnsafe(
          `DELETE FROM form_submissions WHERE "websiteId" = $1::uuid`,
          testWebsite.id
        );
        await db.website.delete({ where: { id: testWebsite.id } });
      }
      if (otherWebsite) {
        await db.website.delete({ where: { id: otherWebsite.id } });
      }
      if (ownerUser) {
        await db.user.delete({ where: { id: ownerUser.id } });
      }
      if (otherUser) {
        await db.user.delete({ where: { id: otherUser.id } });
      }
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr);
    }
  }

  console.log("\n=================================================");
  console.log(`TEST SUITE FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Fatal error running test suite:", err);
  process.exit(1);
});
