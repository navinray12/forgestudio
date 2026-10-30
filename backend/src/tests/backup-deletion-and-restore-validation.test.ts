/**
 * Module 19.3 — Feature 1: Safe Backup Deletion and Restore Validation Test Suite
 *
 * Covers:
 * 1. Deleting a backup removes its corresponding durable file from disk.
 * 2. Deleting a backup whose file is already missing behaves safely.
 * 3. A filesystem deletion error is handled without falsely claiming complete success.
 * 4. A malformed or empty snapshot is rejected.
 * 5. A failed restore leaves the live website unchanged.
 * 6. A valid restore still preserves backup history and creates the pre-restore safety snapshot.
 * 7. Existing tenant authorization remains enforced.
 */
import http from "http";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import app from "../app.js";
import { prisma } from "../config/database.js";
import { getBackupsDir } from "../config/storage.config.js";
import {
  deleteBackupFile,
  validateRestoreSnapshot,
  restoreFromBackup,
  createBackupRecord,
  appendBackup,
} from "../services/backups/websiteBackup.service.js";

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
  } else {
    console.error(`[FAIL] ${testName}${detail ? ` - Detail: ${detail}` : ""}`);
    throw new Error(`Test failed: ${testName}`);
  }
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
  console.log("==================================================================");
  console.log("MODULE 19.3: SAFE BACKUP DELETION & RESTORE VALIDATION TESTS");
  console.log("==================================================================\n");

  // -------------------------------------------------------------------------
  // Part 1: Unit Validation Tests
  // -------------------------------------------------------------------------
  console.log("--- Part 1: Structural Snapshot Validation & Path Traversal Unit Tests ---");

  // Null, undefined, primitive checks
  assert(!validateRestoreSnapshot(null).valid, "Rejects null snapshot");
  assert(!validateRestoreSnapshot(undefined).valid, "Rejects undefined snapshot");
  assert(!validateRestoreSnapshot("string" as any).valid, "Rejects string snapshot");
  assert(!validateRestoreSnapshot(123 as any).valid, "Rejects number snapshot");
  assert(!validateRestoreSnapshot([] as any).valid, "Rejects array snapshot");

  // Empty object check
  const emptyRes = validateRestoreSnapshot({});
  assert(Boolean(!emptyRes.valid && emptyRes.error?.includes("empty")), "Rejects empty object snapshot");

  // Missing pages & elements
  const missingBoth = validateRestoreSnapshot({ version: 1, foo: "bar" });
  assert(Boolean(!missingBoth.valid && missingBoth.error?.includes("must contain a 'pages' or 'elements' array")), "Rejects snapshot without pages or elements");

  // Invalid pages or elements types
  assert(!validateRestoreSnapshot({ pages: "invalid" as any }).valid, "Rejects snapshot with non-array pages");
  assert(!validateRestoreSnapshot({ elements: 123 as any }).valid, "Rejects snapshot with non-array elements");

  // Invalid version
  assert(!validateRestoreSnapshot({ version: -1, pages: [] }).valid, "Rejects negative version");
  assert(!validateRestoreSnapshot({ version: 0, elements: [] }).valid, "Rejects zero version");

  // Valid structures
  assert(validateRestoreSnapshot({ version: 1, pages: [] }).valid, "Accepts snapshot with version and pages array");
  assert(validateRestoreSnapshot({ version: 1, elements: [] }).valid, "Accepts snapshot with version and elements array");
  assert(validateRestoreSnapshot({ pages: [{ id: "p1", name: "Home" }] }).valid, "Accepts snapshot with pages without explicit version");
  assert(validateRestoreSnapshot({ elements: [{ id: "e1", tag: "div" }] }).valid, "Accepts snapshot with elements without explicit version");

  // restoreFromBackup throws on invalid snapshot
  let thrown = false;
  try {
    restoreFromBackup(
      { version: 1, pages: [] },
      {
        id: "bkp_bad",
        label: "Bad Backup",
        trigger: "manual",
        status: "ready",
        createdAt: new Date().toISOString(),
        sizeBytes: 10,
        schemaVersion: 1,
        snapshot: { invalid: true },
      }
    );
  } catch (err: any) {
    thrown = true;
    assert(err.message.includes("Cannot restore backup"), "restoreFromBackup throws on structurally invalid snapshot");
  }
  assert(thrown, "restoreFromBackup threw on invalid snapshot");

  // Path traversal defense in deleteBackupFile
  let traversalCaught = false;
  try {
    deleteBackupFile("site_1", "../../../secret");
  } catch (err: any) {
    traversalCaught = true;
    assert(err.message.includes("contains invalid characters"), "deleteBackupFile rejects traversal backupId characters");
  }
  assert(traversalCaught, "deleteBackupFile threw on traversal backupId");

  console.log("✓ Part 1 passed successfully.\n");

  // -------------------------------------------------------------------------
  // Part 2: Integration Tests with Real HTTP Server & Database
  // -------------------------------------------------------------------------
  console.log("--- Part 2: HTTP Integration Tests (Deletion, Consistency & Restore) ---");

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  const suffix = Date.now();
  const owner = await prisma.user.create({
    data: {
      email: `owner_${suffix}@example.com`,
      passwordHash: "hash123",
      fullName: "Owner User",
      role: "USER",
    },
  });

  const attacker = await prisma.user.create({
    data: {
      email: `attacker_${suffix}@example.com`,
      passwordHash: "hash123",
      fullName: "Attacker User",
      role: "USER",
    },
  });

  const ownerCookie = await createAuthenticatedSession(owner);
  const attackerCookie = await createAuthenticatedSession(attacker);

  const initialEditorData = {
    version: 1,
    pages: [{ id: "p1", name: "Original Page", elements: [] }],
    backups: [],
  };

  const website = await prisma.website.create({
    data: {
      name: `Backup Test Site ${suffix}`,
      slug: `backup-test-${suffix}`,
      userId: owner.id,
      editorData: initialEditorData,
    },
  });

  try {
    // -----------------------------------------------------------------------
    // Test 1: Deleting a backup removes its corresponding durable file from disk
    // -----------------------------------------------------------------------
    console.log("Testing: Deleting a backup removes its corresponding file from disk...");
    const createRes1 = await fetch(`${baseUrl}/api/websites/${website.id}/backups`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: ownerCookie },
      body: JSON.stringify({ label: "Backup To Delete" }),
    });
    assert(createRes1.status === 201, "Created backup 1 successfully");
    const createData1 = await createRes1.json();
    const backupId1 = createData1.backup.id;
    assert(Boolean(backupId1), "Received backupId 1");

    // Verify durable disk file exists
    const expectedDiskFile1 = path.join(getBackupsDir(), website.id, `${backupId1}.json`);
    assert(fs.existsSync(expectedDiskFile1), "Durable backup file exists on disk prior to deletion");

    // Perform DELETE
    const delRes1 = await fetch(`${baseUrl}/api/websites/${website.id}/backups/${backupId1}`, {
      method: "DELETE",
      headers: { cookie: ownerCookie },
    });
    assert(delRes1.status === 200, "DELETE returned HTTP 200");
    const delData1 = await delRes1.json();
    assert(delData1.success === true, "Response indicated success");

    // Assert file is unlinked on disk
    assert(!fs.existsSync(expectedDiskFile1), "Durable backup file was deleted from disk");

    // Assert removed from DB
    const siteAfterDel1 = await prisma.website.findUnique({ where: { id: website.id } });
    const backups1 = (siteAfterDel1?.editorData as any)?.backups || [];
    assert(!backups1.some((b: any) => b.id === backupId1), "Backup metadata removed from database");

    // -----------------------------------------------------------------------
    // Test 2: Deleting a backup whose file is already missing behaves safely
    // -----------------------------------------------------------------------
    console.log("Testing: Deleting a backup whose file is already missing behaves safely...");
    const createRes2 = await fetch(`${baseUrl}/api/websites/${website.id}/backups`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: ownerCookie },
      body: JSON.stringify({ label: "Backup Missing File" }),
    });
    assert(createRes2.status === 201, "Created backup 2 successfully");
    const backupId2 = (await createRes2.json()).backup.id;
    const expectedDiskFile2 = path.join(getBackupsDir(), website.id, `${backupId2}.json`);
    assert(fs.existsSync(expectedDiskFile2), "File exists before manual removal");

    // Prematurely unlink the file to simulate missing file
    fs.unlinkSync(expectedDiskFile2);
    assert(!fs.existsSync(expectedDiskFile2), "File is now missing on disk");

    // Perform DELETE on backup with missing file
    const delRes2 = await fetch(`${baseUrl}/api/websites/${website.id}/backups/${backupId2}`, {
      method: "DELETE",
      headers: { cookie: ownerCookie },
    });
    assert(delRes2.status === 200, "DELETE with missing file returns HTTP 200");
    const siteAfterDel2 = await prisma.website.findUnique({ where: { id: website.id } });
    const backups2 = (siteAfterDel2?.editorData as any)?.backups || [];
    assert(!backups2.some((b: any) => b.id === backupId2), "Backup metadata cleaned from DB safely");

    // -----------------------------------------------------------------------
    // Test 3: Filesystem deletion error is handled without falsely claiming success
    // -----------------------------------------------------------------------
    console.log("Testing: Filesystem deletion error handling...");
    const createRes3 = await fetch(`${baseUrl}/api/websites/${website.id}/backups`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: ownerCookie },
      body: JSON.stringify({ label: "Backup Simulating FS Error" }),
    });
    assert(createRes3.status === 201, "Created backup 3 successfully");
    const backupId3 = (await createRes3.json()).backup.id;
    const expectedDiskFile3 = path.join(getBackupsDir(), website.id, `${backupId3}.json`);
    assert(fs.existsSync(expectedDiskFile3), "File exists before error simulation");

    // Stub fs.unlinkSync to throw an IO permission error
    const originalUnlinkSync = fs.unlinkSync;
    try {
      (fs as any).unlinkSync = (targetPath: string) => {
        if (targetPath.includes(backupId3)) {
          throw new Error("EACCES: permission denied, unlink");
        }
        return originalUnlinkSync(targetPath);
      };

      const delRes3 = await fetch(`${baseUrl}/api/websites/${website.id}/backups/${backupId3}`, {
        method: "DELETE",
        headers: { cookie: ownerCookie },
      });

      assert(delRes3.status === 500, "Deletion returns HTTP 500 when filesystem fails");
      const delData3 = await delRes3.json();
      assert(delData3.success === false, "success is false on fs error");
      assert(delData3.message.includes("Failed to delete backup storage file"), "Descriptive error message returned");

      // Verify the backup was NOT deleted from DB metadata!
      const siteAfterErr3 = await prisma.website.findUnique({ where: { id: website.id } });
      const backups3 = (siteAfterErr3?.editorData as any)?.backups || [];
      assert(backups3.some((b: any) => b.id === backupId3), "Backup retained in database when disk unlinking fails");
    } finally {
      fs.unlinkSync = originalUnlinkSync;
      // Clean up backup 3
      if (fs.existsSync(expectedDiskFile3)) {
        fs.unlinkSync(expectedDiskFile3);
      }
    }

    // -----------------------------------------------------------------------
    // Test 4 & 5: Malformed/empty snapshot rejected & failed restore leaves website unchanged
    // -----------------------------------------------------------------------
    console.log("Testing: Malformed/empty snapshot rejection and live website invariance...");
    // Inject a malformed backup record into the site's backups[]
    const malformedBackup = {
      id: `bkp_malformed_${Date.now()}`,
      label: "Corrupted Empty Snapshot",
      trigger: "manual",
      status: "ready",
      createdAt: new Date().toISOString(),
      sizeBytes: 2,
      schemaVersion: 1,
      snapshot: {}, // Empty snapshot!
    };

    const siteBeforeRestore = await prisma.website.findUnique({ where: { id: website.id } });
    const editorBeforeRestore = siteBeforeRestore?.editorData as any;
    const originalPages = JSON.stringify(editorBeforeRestore.pages);

    await prisma.website.update({
      where: { id: website.id },
      data: {
        editorData: {
          ...editorBeforeRestore,
          backups: [malformedBackup, ...(editorBeforeRestore.backups || [])],
        },
      },
    });

    const restoreBadRes = await fetch(`${baseUrl}/api/websites/${website.id}/backups/${malformedBackup.id}/restore`, {
      method: "POST",
      headers: { cookie: ownerCookie },
    });

    assert(restoreBadRes.status === 400, "Restore rejects malformed snapshot with HTTP 400");
    const badRestoreData = await restoreBadRes.json();
    assert(badRestoreData.success === false, "Restore reports failure");
    assert(badRestoreData.message.includes("Cannot restore backup"), "Clear client-safe error returned");

    // Confirm live site is UNCHANGED
    const siteAfterBadRestore = await prisma.website.findUnique({ where: { id: website.id } });
    const editorAfterBadRestore = siteAfterBadRestore?.editorData as any;
    assert(JSON.stringify(editorAfterBadRestore.pages) === originalPages, "Live website pages remained completely untouched");
    assert(!editorAfterBadRestore._lastRestoredFrom, "_lastRestoredFrom was not set on failed restore");

    // -----------------------------------------------------------------------
    // Test 6: Valid restore preserves backup history and creates pre-restore snapshot
    // -----------------------------------------------------------------------
    console.log("Testing: Valid restore creates pre-restore safety snapshot and preserves history...");
    // Update live site with changes so we can verify the pre-restore backup captures them
    await prisma.website.update({
      where: { id: website.id },
      data: {
        editorData: {
          ...editorAfterBadRestore,
          pages: [{ id: "p1", name: "Page Modified Before Restore", elements: [{ tag: "h1", text: "Before" }] }],
        },
      },
    });

    // Create a valid target backup to restore
    const validRestorableBackup = createBackupRecord(
      {
        version: 2,
        pages: [{ id: "p_restored", name: "Successfully Restored Page", elements: [{ tag: "h1", text: "Restored Content" }] }],
        globalStyles: { primaryColor: "#10b981" },
      },
      {
        websiteId: website.id,
        trigger: "manual",
        label: "Valid State To Restore",
      }
    );

    // Save valid backup into website backups list
    const siteCurrent = await prisma.website.findUnique({ where: { id: website.id } });
    const currentEditor = siteCurrent?.editorData as any;
    const withValidBackup = appendBackup(currentEditor.backups || [], validRestorableBackup);

    await prisma.website.update({
      where: { id: website.id },
      data: { editorData: { ...currentEditor, backups: withValidBackup } },
    });

    const restoreGoodRes = await fetch(`${baseUrl}/api/websites/${website.id}/backups/${validRestorableBackup.id}/restore`, {
      method: "POST",
      headers: { cookie: ownerCookie },
    });

    assert(restoreGoodRes.status === 200, "Valid restore returns HTTP 200");
    const goodRestoreData = await restoreGoodRes.json();
    assert(goodRestoreData.success === true, "Restore succeeded");
    assert(Boolean(goodRestoreData.preRestoreBackupId), "Pre-restore safety snapshot ID returned");

    // Inspect live site
    const siteAfterRestore = await prisma.website.findUnique({ where: { id: website.id } });
    const editorAfterRestore = siteAfterRestore?.editorData as any;
    assert(editorAfterRestore._lastRestoredFrom === validRestorableBackup.id, "_lastRestoredFrom set to restored backup ID");
    assert(Boolean(editorAfterRestore._lastRestoredAt), "_lastRestoredAt timestamp populated");
    assert(editorAfterRestore.pages[0].name === "Successfully Restored Page", "Live pages updated to restored snapshot");
    assert(editorAfterRestore.globalStyles?.primaryColor === "#10b981", "Live styles updated to restored snapshot");

    // Check backups history
    const restoredBackups = editorAfterRestore.backups as any[];
    assert(Array.isArray(restoredBackups), "Backups array preserved in editorData");
    const preRestoreRecord = restoredBackups.find((b: any) => b.id === goodRestoreData.preRestoreBackupId);
    assert(Boolean(preRestoreRecord), "Pre-restore safety snapshot found in backups history");
    assert(preRestoreRecord.trigger === "pre-restore", "Pre-restore snapshot has trigger='pre-restore'");
    assert(preRestoreRecord.snapshot.pages[0].name === "Page Modified Before Restore", "Pre-restore snapshot captured state before restore");

    // Verify durable disk file was also written for the pre-restore backup
    const preRestoreDiskFile = path.join(getBackupsDir(), website.id, `${preRestoreRecord.id}.json`);
    assert(fs.existsSync(preRestoreDiskFile), "Pre-restore safety snapshot written to durable disk storage");

    // -----------------------------------------------------------------------
    // Test 7: Existing tenant authorization remains enforced
    // -----------------------------------------------------------------------
    console.log("Testing: Tenant authorization enforcement...");
    const unauthorizedDel = await fetch(`${baseUrl}/api/websites/${website.id}/backups/${validRestorableBackup.id}`, {
      method: "DELETE",
      headers: { cookie: attackerCookie },
    });
    assert(unauthorizedDel.status === 404, "Attacker cannot delete owner's backup (returns 404)");

    const unauthorizedRestore = await fetch(`${baseUrl}/api/websites/${website.id}/backups/${validRestorableBackup.id}/restore`, {
      method: "POST",
      headers: { cookie: attackerCookie },
    });
    assert(unauthorizedRestore.status === 404, "Attacker cannot restore owner's backup (returns 404)");

    console.log("✓ All Module 19.3 Feature 1 tests passed successfully!\n");
  } finally {
    // Cleanup test artifacts
    server.close();
    try {
      const siteBackupDir = path.join(getBackupsDir(), website.id);
      if (fs.existsSync(siteBackupDir)) {
        fs.rmSync(siteBackupDir, { recursive: true, force: true });
      }
      await prisma.website.deleteMany({ where: { id: website.id } });
      await prisma.session.deleteMany({ where: { userId: { in: [owner.id, attacker.id] } } });
      await prisma.user.deleteMany({ where: { id: { in: [owner.id, attacker.id] } } });
    } catch (cleanupErr) {
      console.warn("Cleanup error (non-fatal):", cleanupErr);
    }
  }
}

runTests()
  .then(() => {
    console.log("==================================================================");
    console.log("ALL TESTS COMPLETED SUCCESSFULLY");
    console.log("==================================================================");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
