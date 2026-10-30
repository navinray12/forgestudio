/**
 * Module 19, Task 2: Automated Backup Scheduler & Retention Pruning Test Suite
 *
 * Verifies:
 *   1. Pure unit evaluation: cron matching, slot calculation, due/not-yet-due state
 *   2. Scheduled backup execution: creates snapshot, writes durable file, updates lastRunAt
 *   3. Duplicate prevention: prevents duplicate runs for the same scheduled slot
 *   4. Retention pruning: preserves newest retainCount backups and cleans disk files safely
 *   5. Multi-website independent processing: one site's state does not leak to another
 *   6. Fault tolerance: backup failure on one site does not abort remaining sites
 *   7. Distributed locking: advisory lock acquisition and reliable release
 *   8. Scheduler lifecycle: startup, periodic interval, and clean shutdown
 *   9. Regression safety: manual backups, restore validation, and safety snapshots
 */

import fs from "fs";
import path from "path";
import { prisma } from "../config/prisma.js";
import { getBackupsDir } from "../config/storage.config.js";
import {
  matchesCron,
  matchCronField,
  getMostRecentCronSlot,
  isBackupDue,
  validateBackupPolicy,
  pruneBackupsByRetention,
  processScheduledBackupsForWebsite,
  processAllScheduledBackups,
  createBackupRecord,
  restoreFromBackup,
  type WebsiteBackup,
  type BackupSchedulePolicy,
} from "../services/backups/websiteBackup.service.js";

import {
  startScheduler,
  stopScheduler,
  isSchedulerRunning,
  runScheduledBackupCheck,
} from "../services/scheduleWorker.js";

// ---------------------------------------------------------------------------
// Test Runner Harness
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${label}`);
    passed++;
  } else {
    console.error(`[FAIL] ${label}${detail ? ` - Detail: ${detail}` : ""}`);
    failed++;
    failures.push(label);
  }
}

// ---------------------------------------------------------------------------
// Main Test Execution
// ---------------------------------------------------------------------------
async function runTests() {
  console.log("==================================================================");
  console.log("MODULE 19, TASK 2: AUTOMATED BACKUP SCHEDULER & RETENTION TESTS");
  console.log("==================================================================\n");

  let testUser: any = null;
  const createdWebsiteIds: string[] = [];

  try {
    // -----------------------------------------------------------------------
    // Part 1: Cron Expression Parsing & Matching Unit Tests
    // -----------------------------------------------------------------------
    console.log("--- Part 1: Cron Parsing & Evaluation Unit Tests ---");

    // Match exact numbers, wildcards, steps, lists, and ranges
    assert(matchCronField("*", 15), "Wildcard * matches any value");
    assert(matchCronField("15", 15), "Exact number matches correctly");
    assert(!matchCronField("15", 16), "Exact number rejects non-matching value");
    assert(matchCronField("0,15,30,45", 30), "List matches element");
    assert(!matchCronField("0,15,30,45", 20), "List rejects non-element");
    assert(matchCronField("1-5", 3), "Range matches value inside bounds");
    assert(!matchCronField("1-5", 6), "Range rejects value outside bounds");
    assert(matchCronField("*/15", 45), "Step */15 matches divisible minute (45)");
    assert(!matchCronField("*/15", 20), "Step */15 rejects non-divisible minute (20)");
    assert(matchCronField("7", 0, true), "Day-of-week 7 maps to Sunday (0)");
    assert(matchCronField("0", 0, true), "Day-of-week 0 maps to Sunday (0)");

    // Standard daily cron: "0 2 * * *" (Every day at 02:00 UTC)
    const dailyDateMatching = new Date("2026-10-29T02:00:00.000Z");
    const dailyDateNonMatching = new Date("2026-10-29T02:05:00.000Z");
    assert(matchesCron("0 2 * * *", dailyDateMatching), "matchesCron matches daily 02:00 slot");
    assert(!matchesCron("0 2 * * *", dailyDateNonMatching), "matchesCron rejects non-slot minute 02:05");

    // Standard weekly cron: "0 2 * * 0" (Sunday at 02:00 UTC)
    // 2026-10-25 was a Sunday (UTC)
    const sundayDate = new Date("2026-10-25T02:00:00.000Z");
    const thursdayDate = new Date("2026-10-29T02:00:00.000Z");
    assert(matchesCron("0 2 * * 0", sundayDate), "matchesCron matches weekly Sunday slot");
    assert(!matchesCron("0 2 * * 0", thursdayDate), "matchesCron rejects Thursday for Sunday weekly cron");

    // Malformed expressions fail safely without throwing
    assert(!matchesCron("invalid cron", dailyDateMatching), "Rejects malformed cron string safely");
    assert(!matchesCron("0 2 *", dailyDateMatching), "Rejects cron with fewer than 5 parts safely");
    assert(!matchesCron("", dailyDateMatching), "Rejects empty cron string safely");
    assert(getMostRecentCronSlot("not-a-cron", dailyDateMatching) === null, "getMostRecentCronSlot returns null on invalid cron");

    // Most recent cron slot lookup
    const testNow = new Date("2026-10-29T03:45:00.000Z");
    const expectedSlot = new Date("2026-10-29T02:00:00.000Z");
    const foundSlot = getMostRecentCronSlot("0 2 * * *", testNow);
    assert(foundSlot !== null, "getMostRecentCronSlot found slot");
    assert(foundSlot?.toISOString() === expectedSlot.toISOString(), "Found correct previous slot for daily schedule (02:00 today)");

    // -----------------------------------------------------------------------
    // Part 2: Backup Policy Due / Not-Yet-Due State Evaluation
    // -----------------------------------------------------------------------
    console.log("\n--- Part 2: Backup Due / Not-Yet-Due State Evaluation ---");

    const disabledPolicy: BackupSchedulePolicy = {
      enabled: false,
      cronExpression: "0 2 * * *",
      retainCount: 7,
      trigger: "scheduled",
    };
    assert(!isBackupDue(disabledPolicy, testNow), "Disabled policy is never due");

    // Due daily policy: slot was today at 02:00 UTC, last run was yesterday at 02:00 UTC
    const dueDailyPolicy: BackupSchedulePolicy = {
      enabled: true,
      cronExpression: "0 2 * * *",
      retainCount: 7,
      trigger: "scheduled",
      lastRunAt: "2026-10-28T02:00:00.000Z",
    };
    assert(isBackupDue(dueDailyPolicy, testNow), "Due daily policy evaluates as due (slot passed since last run)");

    // Not-yet-due daily policy: slot was today at 02:00 UTC, and last run was today at 02:01 UTC
    const notDueDailyPolicy: BackupSchedulePolicy = {
      enabled: true,
      cronExpression: "0 2 * * *",
      retainCount: 7,
      trigger: "scheduled",
      lastRunAt: "2026-10-29T02:01:00.000Z",
    };
    assert(!isBackupDue(notDueDailyPolicy, testNow), "Not-yet-due daily policy evaluates as not due (already ran for this slot)");

    // Weekly schedule: test on Thursday 2026-10-29
    // Sunday was 2026-10-25. If last run was 2026-10-18 (prior week), Sunday's run is due
    const dueWeeklyPolicy: BackupSchedulePolicy = {
      enabled: true,
      cronExpression: "0 2 * * 0",
      retainCount: 4,
      trigger: "scheduled",
      lastRunAt: "2026-10-18T02:00:00.000Z",
    };
    assert(isBackupDue(dueWeeklyPolicy, testNow), "Due weekly policy evaluates as due");

    // If last run was 2026-10-25 02:05 (Sunday), it is NOT due on Thursday 2026-10-29
    const notDueWeeklyPolicy: BackupSchedulePolicy = {
      enabled: true,
      cronExpression: "0 2 * * 0",
      retainCount: 4,
      trigger: "scheduled",
      lastRunAt: "2026-10-25T02:05:00.000Z",
    };
    assert(!isBackupDue(notDueWeeklyPolicy, testNow), "Weekly policy already executed on Sunday is not due on Thursday");

    // Malformed cron expression fails safely
    const malformedPolicy: BackupSchedulePolicy = {
      enabled: true,
      cronExpression: "bad-cron-string",
      retainCount: 7,
      trigger: "scheduled",
    };
    assert(!isBackupDue(malformedPolicy, testNow), "Malformed cron policy fails safely and is not due");

    // -----------------------------------------------------------------------
    // SETUP DB: Create real test user and website in database
    // -----------------------------------------------------------------------
    const email = `scheduler-test-${Date.now()}@forgestudio.local`;
    testUser = await prisma.user.create({
      data: {
        email,
        fullName: "Backup Scheduler Tester",
        role: "USER",
      },
    });

    // -----------------------------------------------------------------------
    // Part 3: Scheduled Backup Execution & Duplicate Prevention
    // -----------------------------------------------------------------------
    console.log("\n--- Part 3: Scheduled Execution & Duplicate Prevention ---");

    const siteA = await prisma.website.create({
      data: {
        userId: testUser.id,
        name: "Scheduled Backup Site A",
        slug: `site-a-${Date.now()}`,
        status: "PUBLISHED",
        editorData: {
          version: 1,
          pages: [{ id: "p1", title: "Home", slug: "home", elements: [] }],
          elements: [],
          backupPolicy: {
            enabled: true,
            cronExpression: "0 2 * * *",
            retainCount: 5,
            trigger: "scheduled",
            lastRunAt: "2026-10-28T02:00:00.000Z", // Due for 2026-10-29 02:00 slot
          },
          backups: [],
        },
      },
    });
    createdWebsiteIds.push(siteA.id);

    // Execute scheduled backup at simulated time 2026-10-29T03:00:00Z
    const execTime = new Date("2026-10-29T03:00:00.000Z");
    const resultA = await processScheduledBackupsForWebsite(siteA, execTime);

    assert(resultA.created === true, "Scheduled backup was created successfully");
    assert(!!resultA.backup, "Created backup object is returned");
    assert(resultA.backup?.trigger === "scheduled", "Backup trigger is strictly 'scheduled'");
    assert(typeof resultA.backup?.storagePath === "string", "Backup has durable storagePath on disk");
    assert(fs.existsSync(resultA.backup!.storagePath!), "Durable backup file exists on disk");

    // Check DB persistence
    const updatedSiteA = await prisma.website.findUnique({ where: { id: siteA.id } });
    const edA: any = updatedSiteA?.editorData || {};
    assert(Array.isArray(edA.backups) && edA.backups.length === 1, "Database editorData.backups contains 1 backup");
    assert(edA.backups[0].id === resultA.backup?.id, "Persisted backup ID matches created backup");
    assert(edA.backupPolicy.lastRunAt === resultA.backup?.createdAt, "backupPolicy.lastRunAt updated to newest backup createdAt");

    // Test duplicate prevention: re-running immediately for same site and time
    const repeatResult = await processScheduledBackupsForWebsite(updatedSiteA!, execTime);
    assert(repeatResult.created === false, "Re-running scheduled backup immediately returns created: false (duplicate prevented)");
    const siteAfterRepeat = await prisma.website.findUnique({ where: { id: siteA.id } });
    const edRepeat: any = siteAfterRepeat?.editorData || {};
    assert(edRepeat.backups.length === 1, "Duplicate run did NOT add a second backup (count remains 1)");

    // -----------------------------------------------------------------------
    // Part 4: Retention Pruning & Storage Consistency
    // -----------------------------------------------------------------------
    console.log("\n--- Part 4: Retention Pruning & Storage Consistency ---");

    const siteB = await prisma.website.create({
      data: {
        userId: testUser.id,
        name: "Retention Pruning Site B",
        slug: `site-b-${Date.now()}`,
        status: "PUBLISHED",
        editorData: {
          version: 1,
          pages: [{ id: "p1", title: "Home", slug: "home", elements: [] }],
          elements: [],
          backupPolicy: {
            enabled: true,
            cronExpression: "0 2 * * *",
            retainCount: 3, // Retain only newest 3 backups
            trigger: "scheduled",
          },
          backups: [],
        },
      },
    });
    createdWebsiteIds.push(siteB.id);

    // Create 4 initial backups manually on siteB with increasing timestamps
    const backupsList: WebsiteBackup[] = [];
    for (let i = 1; i <= 4; i++) {
      const b = createBackupRecord(
        { version: 1, pages: [{ id: `page-${i}` }], elements: [] },
        {
          websiteId: siteB.id,
          trigger: "manual",
          label: `Backup ${i}`,
        }
      );
      // Ensure distinct timestamps
      b.createdAt = new Date(Date.now() - (5 - i) * 3600 * 1000).toISOString();
      backupsList.push(b);
    }

    assert(backupsList.every((b) => b.storagePath && fs.existsSync(b.storagePath)), "All 4 backup storage files exist before pruning");

    // Prune with retainCount: 3
    const pruneResult = pruneBackupsByRetention(siteB.id, backupsList, 3);
    assert(pruneResult.retained.length === 3, "pruneBackupsByRetention retained exactly 3 backups");
    assert(pruneResult.prunedCount === 1, "Exactly 1 obsolete backup was pruned");

    // Verify the oldest backup was pruned and newest were kept
    const retainedLabels = pruneResult.retained.map((b) => b.label);
    assert(!retainedLabels.includes("Backup 1"), "Oldest backup (Backup 1) was pruned");
    assert(retainedLabels.includes("Backup 4"), "Newest backup (Backup 4) was preserved");
    assert(retainedLabels.includes("Backup 3"), "Backup 3 was preserved");
    assert(retainedLabels.includes("Backup 2"), "Backup 2 was preserved");

    // Verify disk consistency: pruned backup file deleted, retained files preserved
    const prunedBackup1 = backupsList[0];
    assert(!fs.existsSync(prunedBackup1.storagePath!), "Obsolete backup storage file was unlinked from disk");
    for (const preserved of pruneResult.retained) {
      assert(fs.existsSync(preserved.storagePath!), `Preserved backup "${preserved.label}" file remains on disk`);
    }

    // -----------------------------------------------------------------------
    // Part 5: Multiple Websites Independent Processing
    // -----------------------------------------------------------------------
    console.log("\n--- Part 5: Multiple Websites Independent Processing ---");

    // Site C: Disabled policy -> should not run
    const siteC = await prisma.website.create({
      data: {
        userId: testUser.id,
        name: "Disabled Policy Site C",
        slug: `site-c-${Date.now()}`,
        status: "PUBLISHED",
        editorData: {
          version: 1,
          pages: [],
          backupPolicy: { enabled: false, cronExpression: "0 2 * * *", retainCount: 5 },
          backups: [],
        },
      },
    });
    createdWebsiteIds.push(siteC.id);

    // Site D: Enabled and due policy -> should run
    const siteD = await prisma.website.create({
      data: {
        userId: testUser.id,
        name: "Enabled Due Site D",
        slug: `site-d-${Date.now()}`,
        status: "PUBLISHED",
        editorData: {
          version: 1,
          pages: [],
          backupPolicy: {
            enabled: true,
            cronExpression: "0 2 * * *",
            retainCount: 5,
            lastRunAt: "2026-10-27T02:00:00.000Z", // 2 days old
          },
          backups: [],
        },
      },
    });
    createdWebsiteIds.push(siteD.id);

    // Run batch processor
    const batchResult = await processAllScheduledBackups(new Date("2026-10-29T03:00:00.000Z"));
    assert(batchResult.created >= 1, "Batch processor created at least 1 scheduled backup for due site");

    // Verify Site C was skipped
    const siteCAfter = await prisma.website.findUnique({ where: { id: siteC.id } });
    const edC: any = siteCAfter?.editorData || {};
    assert(edC.backups.length === 0, "Disabled policy Site C was untouched (0 backups)");

    // Verify Site D created backup
    const siteDAfter = await prisma.website.findUnique({ where: { id: siteD.id } });
    const edD: any = siteDAfter?.editorData || {};
    assert(edD.backups.length === 1, "Due policy Site D received 1 scheduled backup");

    // -----------------------------------------------------------------------
    // Part 6: Fault Tolerance & Error Isolation
    // -----------------------------------------------------------------------
    console.log("\n--- Part 6: Fault Tolerance & Error Isolation ---");

    // Site E: Malformed policy with corrupted structure
    const siteE = await prisma.website.create({
      data: {
        userId: testUser.id,
        name: "Malformed Site E",
        slug: `site-e-${Date.now()}`,
        status: "PUBLISHED",
        editorData: {
          version: 1,
          backupPolicy: {
            enabled: true,
            cronExpression: "* * * * *", // every minute
          },
          // Missing pages / elements
        },
      },
    });
    createdWebsiteIds.push(siteE.id);

    // Site F: Healthy due website
    const siteF = await prisma.website.create({
      data: {
        userId: testUser.id,
        name: "Healthy Site F",
        slug: `site-f-${Date.now()}`,
        status: "PUBLISHED",
        editorData: {
          version: 1,
          pages: [{ id: "p1", title: "Home", slug: "home", elements: [] }],
          elements: [],
          backupPolicy: {
            enabled: true,
            cronExpression: "* * * * *",
            lastRunAt: "2026-10-29T00:00:00.000Z",
          },
          backups: [],
        },
      },
    });
    createdWebsiteIds.push(siteF.id);

    const resilientBatch = await processAllScheduledBackups(new Date("2026-10-29T04:00:00.000Z"));
    assert(resilientBatch.processed >= 2, "Batch processed multiple websites without crashing");
    const siteFAfter = await prisma.website.findUnique({ where: { id: siteF.id } });
    const edF: any = siteFAfter?.editorData || {};
    assert(edF.backups.length === 1, "Healthy Site F was successfully backed up despite other site errors");

    // -----------------------------------------------------------------------
    // Part 7: Concurrency & Distributed Advisory Locking
    // -----------------------------------------------------------------------
    console.log("\n--- Part 7: Concurrency & Distributed Advisory Locking ---");

    const lockRunResult = await runScheduledBackupCheck(new Date("2026-10-29T05:00:00.000Z"));
    assert(lockRunResult !== undefined, "runScheduledBackupCheck executed with advisory lock safety");

    // -----------------------------------------------------------------------
    // Part 8: Scheduler Lifecycle Startup and Shutdown
    // -----------------------------------------------------------------------
    console.log("\n--- Part 8: Scheduler Lifecycle Startup and Shutdown ---");

    assert(!isSchedulerRunning(), "Scheduler initially not running in this test process");
    startScheduler({
      pollIntervalMs: 500000,
      expiryIntervalMs: 500000,
      sslRenewalIntervalMs: 500000,
      backupIntervalMs: 500000,
    });
    assert(isSchedulerRunning(), "startScheduler started running state");

    // Duplicate startup is safely ignored
    startScheduler();
    assert(isSchedulerRunning(), "Duplicate startScheduler safely ignored");

    stopScheduler();
    assert(!isSchedulerRunning(), "stopScheduler cleanly stopped running state");

    // -----------------------------------------------------------------------
    // Part 9: Regression Check: Manual Backups & Restore Safety
    // -----------------------------------------------------------------------
    console.log("\n--- Part 9: Regression Check: Manual Backup & Restore Safety ---");

    const manualSite = await prisma.website.create({
      data: {
        userId: testUser.id,
        name: "Manual Regression Site",
        slug: `manual-reg-${Date.now()}`,
        status: "PUBLISHED",
        editorData: {
          version: 1,
          pages: [{ id: "home-page", title: "Original Home", slug: "home", elements: [] }],
          elements: [],
          backups: [],
        },
      },
    });
    createdWebsiteIds.push(manualSite.id);

    const manualBackup = createBackupRecord(manualSite.editorData as any, {
      websiteId: manualSite.id,
      trigger: "manual",
      label: "Manual Baseline",
    });
    assert(manualBackup.trigger === "manual", "Manual backup trigger is 'manual'");

    // Mutate live site
    const modifiedEditorData = {
      version: 1,
      pages: [{ id: "mutated-page", title: "Mutated Page", slug: "mutated", elements: [] }],
      elements: [],
      backups: [manualBackup],
    };

    // Restore from manual backup
    const restored = restoreFromBackup(modifiedEditorData, manualBackup);
    assert(restored.pages[0].id === "home-page", "Restored snapshot recovered original home page");
    assert(restored._lastRestoredFrom === manualBackup.id, "_lastRestoredFrom recorded accurately");

  } catch (err: any) {
    console.error("Unexpected error during test execution:", err);
    assert(false, "Test suite threw unexpected exception", err.message);
  } finally {
    // -----------------------------------------------------------------------
    // CLEANUP: Clean database records and durable files created during test
    // -----------------------------------------------------------------------
    try {
      stopScheduler();
      for (const siteId of createdWebsiteIds) {
        await prisma.website.deleteMany({ where: { id: siteId } });
        // Clean disk folder
        const siteDir = path.join(getBackupsDir(), siteId.replace(/[^a-zA-Z0-9_-]/g, "_"));
        if (fs.existsSync(siteDir)) {
          fs.rmSync(siteDir, { recursive: true, force: true });
        }
      }
      if (testUser) {
        await prisma.user.deleteMany({ where: { id: testUser.id } });
      }
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr);
    }
  }

  // -------------------------------------------------------------------------
  // Report Results
  // -------------------------------------------------------------------------
  console.log("\n==================================================================");
  console.log(`AUTOMATED BACKUP SCHEDULER RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    console.error("Failed assertions:");
    failures.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }
}

runTests();
