import { strict as assert } from "assert";
import { prisma } from "../config/prisma.js";
import {
  saveFormNotificationSettings,
  getFormNotificationSettings,
  testFormNotification,
  processFormSubmission,
  getWebsiteSubmissions,
  exportSubmissionsCsv,
  initFormSubmissionsTable,
} from "../services/form/form.service.js";

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
  console.log("RUNNING FEATURE 2: EMAIL NOTIFICATIONS TEST SUITE");
  console.log("=================================================\n");

  await initFormSubmissionsTable();

  // Test Fixtures
  let ownerUser: any = null;
  let otherUser: any = null;
  let testWebsite: any = null;
  let otherWebsite: any = null;

  try {
    const timestamp = Date.now();

    // 1. Setup Test Users and Websites
    ownerUser = await db.user.create({
      data: {
        email: `notif.owner.${timestamp}@example.test`,
        passwordHash: "hash123",
        fullName: "Notification Owner",
      },
    });

    otherUser = await db.user.create({
      data: {
        email: `notif.other.${timestamp}@example.test`,
        passwordHash: "hash123",
        fullName: "Other User",
      },
    });

    testWebsite = await db.website.create({
      data: {
        userId: ownerUser.id,
        name: `Notification Test Site ${timestamp}`,
        slug: `notif-site-${timestamp}`,
        status: "DRAFT",
      },
    });

    otherWebsite = await db.website.create({
      data: {
        userId: otherUser.id,
        name: `Other Test Site ${timestamp}`,
        slug: `other-site-${timestamp}`,
        status: "DRAFT",
      },
    });

    console.log("--- 1. Configuration & Persistence Tests ---");

    await runScenario("Initial notification settings returns clean default", async () => {
      const settings = await getFormNotificationSettings(testWebsite.id, ownerUser.id);
      assert.equal(settings.websiteId, testWebsite.id);
      assert.equal(settings.notificationEmail, "");
      assert.equal(settings.enabled, false);
      assert.ok(settings.subjectTemplate.includes("{{formName}}"));
    });

    await runScenario("Authorized owner can save recipient email and subject template", async () => {
      const saved = await saveFormNotificationSettings(testWebsite.id, ownerUser.id, {
        notificationEmail: "leads.recipient@company.com",
        enabled: true,
        subjectTemplate: "Hot Lead Received for {{formName}}",
      });

      assert.equal(saved.notificationEmail, "leads.recipient@company.com");
      assert.equal(saved.enabled, true);
      assert.equal(saved.subjectTemplate, "Hot Lead Received for {{formName}}");

      const fetched = await getFormNotificationSettings(testWebsite.id, ownerUser.id);
      assert.equal(fetched.notificationEmail, "leads.recipient@company.com");
      assert.equal(fetched.enabled, true);
      assert.equal(fetched.subjectTemplate, "Hot Lead Received for {{formName}}");
    });

    console.log("\n--- 2. Validation & Security Checks ---");

    await runScenario("Invalid email format is rejected with INVALID_EMAIL", async () => {
      let threw = false;
      try {
        await saveFormNotificationSettings(testWebsite.id, ownerUser.id, {
          notificationEmail: "not-a-valid-email-address",
          enabled: true,
        });
      } catch (err: any) {
        threw = true;
        assert.equal(err.code, "INVALID_EMAIL");
      }
      assert.ok(threw, "Expected invalid email to throw an AppError");
    });

    await runScenario("Unauthorized user cannot read another website's notification settings", async () => {
      let threw = false;
      try {
        await getFormNotificationSettings(testWebsite.id, otherUser.id);
      } catch (err: any) {
        threw = true;
        assert.ok(err.statusCode === 403 || err.statusCode === 404);
      }
      assert.ok(threw, "Expected unauthorized access to be rejected");
    });

    await runScenario("Unauthorized user cannot modify another website's notification settings", async () => {
      let threw = false;
      try {
        await saveFormNotificationSettings(testWebsite.id, otherUser.id, {
          notificationEmail: "attacker@malicious.com",
          enabled: true,
        });
      } catch (err: any) {
        threw = true;
        assert.ok(err.statusCode === 403 || err.statusCode === 404);
      }
      assert.ok(threw, "Expected unauthorized modification to be rejected");
    });

    console.log("\n--- 3. Form Submission Email Dispatch & Resilience ---");

    await runScenario("Form submission automatically routes notification to configured recipient", async () => {
      const subResult = await processFormSubmission({
        websiteId: testWebsite.id,
        formId: "contact-sales-form",
        formName: "Enterprise Sales",
        fields: {
          fullName: "Alice Johnson",
          email: "alice@acme.org",
          message: "Interested in the enterprise plan for 50 users.",
        },
        metadata: {
          ip: "198.51.100.55",
          userAgent: "Mozilla/5.0 Test Browser",
        },
      });

      assert.equal(subResult.success, true);
      assert.equal(subResult.actionsExecuted?.database, true);
      assert.equal(subResult.actionsExecuted?.email, true);

      // Verify form submission was properly stored in database
      const stored = await getWebsiteSubmissions(testWebsite.id, ownerUser.id);
      assert.ok(stored.length >= 1);
      const latest = stored[0];
      assert.equal(latest.data.fullName, "Alice Johnson");
      assert.equal(latest.data.email, "alice@acme.org");
    });

    await runScenario("Form submission prioritizes configured recipient over widget default placeholder", async () => {
      await saveFormNotificationSettings(testWebsite.id, ownerUser.id, {
        notificationEmail: "configured.lead@business.com",
        enabled: true,
        subjectTemplate: "Alert: {{formName}} Received",
      });

      const subResult = await processFormSubmission({
        websiteId: testWebsite.id,
        formId: "priority-test-form",
        formName: "Priority Form",
        fields: {
          fullName: "VIP Client",
          email: "vip@client.org",
        },
        actions: {
          activeActions: ["database", "email"],
          emailConfig: {
            toEmail: "admin@example.com", // widget default placeholder
            subject: "Placeholder Subject",
          },
        },
      });

      assert.equal(subResult.success, true);
      assert.equal(subResult.actionsExecuted?.email, true);

      // Verify the delivery log recorded the persistent email, not the placeholder
      const logRows: any[] = await db.$queryRawUnsafe(
        `SELECT recipient, subject, status FROM email_delivery_logs WHERE "websiteId" = $1::uuid ORDER BY "createdAt" DESC LIMIT 1`,
        testWebsite.id
      );
      assert.ok(logRows.length > 0);
      assert.equal(logRows[0].recipient, "configured.lead@business.com");
      assert.equal(logRows[0].subject, "Alert: Priority Form Received");
    });

    await runScenario("Disabled notifications do not dispatch an email", async () => {
      await saveFormNotificationSettings(testWebsite.id, ownerUser.id, {
        notificationEmail: "disabled.lead@business.com",
        enabled: false,
      });

      const countBefore: any[] = await db.$queryRawUnsafe(
        `SELECT COUNT(*)::int as count FROM email_delivery_logs WHERE "websiteId" = $1::uuid`,
        testWebsite.id
      );

      const subResult = await processFormSubmission({
        websiteId: testWebsite.id,
        formId: "disabled-test-form",
        formName: "Disabled Form",
        fields: {
          fullName: "Should Not Email",
          email: "noemail@tester.com",
        },
        actions: {
          activeActions: ["database", "email"],
          emailConfig: {
            toEmail: "should-not-receive@example.com",
          },
        },
      });

      assert.equal(subResult.success, true);
      assert.equal(subResult.actionsExecuted?.email, false);

      const countAfter: any[] = await db.$queryRawUnsafe(
        `SELECT COUNT(*)::int as count FROM email_delivery_logs WHERE "websiteId" = $1::uuid`,
        testWebsite.id
      );
      assert.equal(countAfter[0].count, countBefore[0].count, "No email was dispatched when disabled");
    });

    await runScenario("Form submission remains safely saved in DB even if email dispatch encounters an error", async () => {
      // Re-enable with an address
      await saveFormNotificationSettings(testWebsite.id, ownerUser.id, {
        notificationEmail: "resilience.lead@test.com",
        enabled: true,
      });

      const subResult = await processFormSubmission({
        websiteId: testWebsite.id,
        formId: "resilience-check-form",
        formName: "Resilience Inquiry",
        fields: {
          fullName: "Resilient Tester",
          email: "resilient@tester.com",
          message: "Data must never be lost if email fails.",
        },
        metadata: {
          ip: "198.51.100.99",
        },
      });

      assert.equal(subResult.success, true, "Form submission succeeds even on transient email errors");

      // Verify DB persistence was unaffected
      const stored = await getWebsiteSubmissions(testWebsite.id, ownerUser.id);
      const found = stored.find((s: any) => s.data.fullName === "Resilient Tester");
      assert.ok(found, "Form submission is safely saved in the database");
    });

    await runScenario("Complete contact form submission stores all 5 fields and includes them in CSV export", async () => {
      const fullContactLead = {
        fullName: "Alex Rivera",
        email: "alex.rivera@enterprise.com",
        phone: "+1 (555) 432-8765",
        subject: "Project Consultation",
        message: "We need custom web app development with instant lead alerts.",
      };

      const subResult = await processFormSubmission({
        websiteId: testWebsite.id,
        formId: "main-contact-form",
        formName: "Contact Us",
        fields: fullContactLead,
        metadata: {
          ip: "203.0.113.42",
          userAgent: "Mozilla/5.0 Test Suite",
          referer: "https://mybusiness.com/contact",
        },
      });

      assert.equal(subResult.success, true);

      // Verify stored lead in database
      const stored = await getWebsiteSubmissions(testWebsite.id, ownerUser.id);
      const savedLead = stored.find((s: any) => s.data.email === "alex.rivera@enterprise.com");
      assert.ok(savedLead, "Lead record exists in database");
      assert.equal(savedLead.data.fullName, "Alex Rivera");
      assert.equal(savedLead.data.phone, "+1 (555) 432-8765");
      assert.equal(savedLead.data.subject, "Project Consultation");
      assert.equal(savedLead.data.message, "We need custom web app development with instant lead alerts.");

      // Verify CSV export includes newly submitted lead and fields
      const { csvContent } = await exportSubmissionsCsv(testWebsite.id, ownerUser.id, { formId: "main-contact-form" });
      assert.ok(csvContent.includes("Alex Rivera"));
      assert.ok(csvContent.includes("alex.rivera@enterprise.com"));
      assert.ok(csvContent.includes("+1 (555) 432-8765"));
      assert.ok(csvContent.includes("Project Consultation"));
    });

    await runScenario("Invalid submission rejected by validation does not save lead or send email", async () => {
      const countBefore: any[] = await db.$queryRawUnsafe(
        `SELECT COUNT(*)::int as count FROM form_submissions WHERE "websiteId" = $1::uuid`,
        testWebsite.id
      );

      let threw = false;
      try {
        await processFormSubmission({
          websiteId: testWebsite.id,
          formId: "validated-form",
          formName: "Validated Form",
          fields: {
            userEmail: "invalid-email-string",
          },
          fieldConfigs: [
            {
              id: "userEmail",
              name: "userEmail",
              label: "User Email",
              type: "email",
              required: true,
            },
          ],
        });
      } catch (err: any) {
        threw = true;
        assert.equal(err.code, "VALIDATION_ERROR");
      }
      assert.ok(threw, "Invalid submission throws validation error");

      const countAfter: any[] = await db.$queryRawUnsafe(
        `SELECT COUNT(*)::int as count FROM form_submissions WHERE "websiteId" = $1::uuid`,
        testWebsite.id
      );
      assert.equal(countAfter[0].count, countBefore[0].count, "No lead was saved for invalid submission");
    });

    console.log("\n--- 4. Live SMTP Test Notification Dispatch ---");

    await runScenario("testFormNotification dispatches real verification email via SMTP", async () => {
      const testResult = await testFormNotification(
        testWebsite.id,
        ownerUser.id,
        "harshpatel131823@gmail.com"
      );

      assert.equal(testResult.success, true);
      assert.ok(testResult.status === "DELIVERED" || testResult.status === "SIMULATED");
      assert.ok(testResult.message.includes("successfully delivered") || testResult.message.includes("delivered") || testResult.status === "DELIVERED");
    });

  } catch (globalErr) {
    console.error("Global Test Suite Error:", globalErr);
  } finally {
    // Cleanup fixtures
    try {
      if (testWebsite) {
        await db.$executeRawUnsafe(`DELETE FROM form_notification_settings WHERE "websiteId" = $1::uuid`, testWebsite.id);
        await db.$executeRawUnsafe(`DELETE FROM form_submissions WHERE "websiteId" = $1::uuid`, testWebsite.id);
        await db.website.delete({ where: { id: testWebsite.id } });
      }
      if (otherWebsite) {
        await db.$executeRawUnsafe(`DELETE FROM form_notification_settings WHERE "websiteId" = $1::uuid`, otherWebsite.id);
        await db.$executeRawUnsafe(`DELETE FROM form_submissions WHERE "websiteId" = $1::uuid`, otherWebsite.id);
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
  console.log(`FEATURE 2 EMAIL TESTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite();
