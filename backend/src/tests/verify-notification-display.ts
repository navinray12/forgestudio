import { strict as assert } from "assert";
import { prisma } from "../config/prisma.js";
import {
  saveFormNotificationSettings,
  getFormNotificationSettings,
  testFormNotification,
  initFormSubmissionsTable,
} from "../services/form/form.service.js";

async function verifyNotificationWorkflow() {
  console.log("=================================================");
  console.log("VERIFYING EMAIL NOTIFICATION SETTINGS PERSISTENCE & DISPLAY");
  console.log("=================================================\n");

  await initFormSubmissionsTable();
  const db = prisma as any;
  const ts = Date.now();

  const user = await db.user.create({
    data: {
      email: `notif.verify.${ts}@example.com`,
      fullName: "Verification User",
      passwordHash: "hash123",
    },
  });

  const site = await db.website.create({
    data: {
      userId: user.id,
      name: `Verification Site ${ts}`,
      slug: `notif-verify-${ts}`,
      status: "DRAFT",
    },
  });

  try {
    // 1. Initial State: clean default
    const initial = await getFormNotificationSettings(site.id, user.id);
    console.log("1. Initial settings:", initial);
    assert.equal(initial.notificationEmail, "");
    assert.equal(initial.enabled, false);

    // 2. Save settings
    const saved = await saveFormNotificationSettings(site.id, user.id, {
      notificationEmail: "alerts@mybusiness.com",
      enabled: true,
      subjectTemplate: "Hot Lead from {{formName}}",
    });
    console.log("\n2. Saved settings response:", saved);
    assert.ok(saved.id, "Save response must return database row id");
    assert.ok(saved.createdAt, "Save response must return createdAt");
    assert.ok(saved.updatedAt, "Save response must return updatedAt");
    assert.equal(saved.notificationEmail, "alerts@mybusiness.com");
    assert.equal(saved.enabled, true);
    assert.equal(saved.subjectTemplate, "Hot Lead from {{formName}}");

    // 3. Reload settings from database
    const reloaded = await getFormNotificationSettings(site.id, user.id);
    console.log("\n3. Reloaded from database:", reloaded);
    assert.equal(reloaded.id, saved.id);
    assert.equal(reloaded.notificationEmail, "alerts@mybusiness.com");
    assert.equal(reloaded.enabled, true);
    assert.equal(reloaded.subjectTemplate, "Hot Lead from {{formName}}");
    assert.ok(reloaded.updatedAt);

    // 4. Update / Edit existing record
    const updated = await saveFormNotificationSettings(site.id, user.id, {
      notificationEmail: "new.leads@mybusiness.com",
      enabled: false,
      subjectTemplate: "Updated Subject Template",
    });
    console.log("\n4. Updated record response:", updated);
    assert.equal(updated.id, saved.id, "Must update existing row rather than create duplicate");
    assert.equal(updated.notificationEmail, "new.leads@mybusiness.com");
    assert.equal(updated.enabled, false);

    // 5. Test Email Dispatch
    const testResult = await testFormNotification(site.id, user.id, "new.leads@mybusiness.com");
    console.log("\n5. Test email result:", testResult);
    assert.ok(testResult.success, "Test email dispatch must succeed");

    console.log("\n=================================================");
    console.log("✓ ALL EMAIL NOTIFICATION WORKFLOWS VERIFIED SUCCESSFULLY");
    console.log("=================================================");
  } finally {
    try {
      await db.$executeRawUnsafe(
        `DELETE FROM form_notification_settings WHERE "websiteId" = $1::uuid`,
        site.id
      );
      await db.website.delete({ where: { id: site.id } });
      await db.user.delete({ where: { id: user.id } });
    } catch {}
  }
}

verifyNotificationWorkflow()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  });
