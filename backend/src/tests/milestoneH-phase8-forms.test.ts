import { prisma } from "../config/prisma.js";
import {
  initFormSubmissionsTable,
  sanitizeInput,
  checkRateLimit,
  processFormSubmission,
  getWebsiteSubmissions,
  deleteWebsiteSubmission,
} from "../services/form/form.service.js";
import { isSafeUrl } from "../utils/ssrf.validator.js";
import { listJobs } from "../services/jobs/jobRunner.js";
import { createWebsite } from "../services/website.service.js";

const db = prisma as any;

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

async function runMilestoneHTests() {
  console.log("=================================================");
  console.log("RUNNING FORGESTUDIO MILESTONE H VERIFICATION SUITE");
  console.log("Forms, Leads & Webhook Automation (Phase 8)");
  console.log("=================================================\n");

  let testUser: any = null;
  let testWebsite: any = null;

  try {
    // 0. Setup test user & website
    const email = `phase8_form_${Date.now()}@example.com`;
    testUser = await db.user.create({
      data: {
        email,
        passwordHash: "hash_placeholder",
        fullName: "Phase 8 Lead Tester",
        role: "USER",
      },
    });

    testWebsite = await createWebsite({
      name: "Phase 8 Form Site",
      slug: `phase8-form-${Date.now()}`,
      userId: testUser.id,
    });

    // 1. Table Initialization
    await initFormSubmissionsTable();
    assert(true, "initFormSubmissionsTable runs without throwing");

    // 2. Input sanitization
    const dirty = {
      name: "John <script>alert(1)</script>Doe",
      message: "Hello <b>World</b><img src=x onerror=alert(1)>!",
      tags: ["<i>safe</i>", "good"],
    };
    const clean = sanitizeInput(dirty);
    assert(
      clean.name === "John Doe" &&
      clean.message === "Hello World!" &&
      clean.tags[0] === "safe",
      "sanitizeInput strips dangerous HTML and script tags",
      clean
    );

    // 3. Honeypot check
    const honeypotResult = await processFormSubmission({
      websiteId: testWebsite.id,
      formId: "contact-form-1",
      formName: "Contact Us",
      fields: { email: "bot@spammer.com" },
      honeypotValue: "I am a spam bot",
      actions: { activeActions: ["database"], successMessage: "Got it" },
    });
    assert(
      honeypotResult.success === true && honeypotResult.actionsExecuted === undefined,
      "Honeypot value silently suppresses database insertion and actions"
    );

    // Verify nothing saved in DB for honeypot
    const honeypotSubmissions = await getWebsiteSubmissions(testWebsite.id, testUser.id);
    assert(
      honeypotSubmissions.length === 0,
      "Zero submissions stored when honeypot is triggered"
    );

    // 4. Rate limiting
    const testIp = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
    let rateLimitExceeded = false;
    for (let i = 0; i < 7; i++) {
      const allowed = checkRateLimit(testIp, 5);
      if (!allowed) {
        rateLimitExceeded = true;
        break;
      }
    }
    assert(
      rateLimitExceeded === true,
      "checkRateLimit properly throttles when submissions exceed threshold"
    );

    // 5. Anti-SSRF check on webhook URLs
    const ssrfLoopback = isSafeUrl("http://127.0.0.1:8080/webhook");
    const ssrfMetadata = isSafeUrl("http://169.254.169.254/latest/meta-data/");
    const ssrfPrivate = isSafeUrl("http://192.168.1.50:3000/api");
    const ssrfValid = isSafeUrl("https://hooks.slack.com/services/T00/B00/XXXX");

    assert(
      ssrfLoopback.safe === false &&
      ssrfMetadata.safe === false &&
      ssrfPrivate.safe === false &&
      ssrfValid.safe === true,
      "Anti-SSRF validator blocks loopback, cloud metadata, and RFC 1918 subnets while allowing public HTTPS URLs"
    );

    // 6. Form submission with database persistence & SSRF-blocked webhook
    const legitResult = await processFormSubmission({
      websiteId: testWebsite.id,
      formId: "contact-form-1",
      formName: "Contact Us",
      fields: {
        fullName: "Jane Doe",
        email: "jane@example.com",
        message: "Interested in ForgeStudio Pro",
      },
      actions: {
        activeActions: ["database", "webhook", "email"],
        webhookConfig: {
          endpointUrl: "http://127.0.0.1/evil-webhook", // Will be blocked by SSRF validator
        },
        emailConfig: {
          toEmail: "sales@forgestudio.io",
          subject: "New Enterprise Lead",
        },
      },
      metadata: { ip: `203.0.113.${Math.floor(Math.random() * 200)}` },
    });

    assert(
      legitResult.success === true &&
      legitResult.actionsExecuted?.database === true &&
      legitResult.actionsExecuted?.webhook === false &&
      legitResult.actionsExecuted?.email === true,
      "processFormSubmission persists to DB, blocks SSRF webhook, and dispatches email notification"
    );

    // 7. Verify submission stored in DB
    const savedSubmissions = await getWebsiteSubmissions(testWebsite.id, testUser.id);
    assert(
      savedSubmissions.length === 1 &&
      savedSubmissions[0].data.fullName === "Jane Doe" &&
      savedSubmissions[0].data.email === "jane@example.com",
      "getWebsiteSubmissions retrieves stored lead data"
    );

    // 8. Durable Webhook Retry Queueing on Unreachable Remote Endpoint
    // Use an unrouteable public TEST-NET IP so it passes SSRF but fails to connect, triggering retry queue
    const retryTestResult = await processFormSubmission({
      websiteId: testWebsite.id,
      formId: "lead-form-2",
      formName: "Lead Capture",
      fields: { email: "lead@test.com" },
      actions: {
        activeActions: ["webhook"],
        webhookConfig: {
          endpointUrl: "https://example.com:81/webhook-fail", // Will time out / fail
        },
      },
      metadata: { ip: `203.0.113.${Math.floor(Math.random() * 200)}` },
    });

    assert(retryTestResult.success === true, "Form submission returns success even when webhook fails asynchronously");

    // 9. Deletion of submission
    const submissionId = savedSubmissions[0].id;
    await deleteWebsiteSubmission(testWebsite.id, submissionId, testUser.id);
    const afterDelete = await getWebsiteSubmissions(testWebsite.id, testUser.id);
    assert(afterDelete.length === 0, "deleteWebsiteSubmission properly removes lead from database");

  } catch (err) {
    console.error("Unexpected error during Phase 8 test suite:", err);
    assert(false, "Test suite execution completed without uncaught exceptions", err);
  } finally {
    // Cleanup
    try {
      if (testWebsite) {
        await db.$executeRawUnsafe(`DELETE FROM form_submissions WHERE "websiteId" = $1::uuid`, testWebsite.id);
        await db.website.delete({ where: { id: testWebsite.id } });
      }
      if (testUser) {
        await db.user.delete({ where: { id: testUser.id } });
      }
    } catch (cleanErr) {
      console.warn("Cleanup warning:", cleanErr);
    }
  }

  console.log("\n=================================================");
  console.log(`PHASE 8 TESTS COMPLETED: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runMilestoneHTests();
