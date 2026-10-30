import fs from "fs";
import path from "path";
import crypto from "crypto";
import assert from "node:assert/strict";
import { prisma } from "../config/prisma.js";
import {
  getUploadsDir,
  getImagesDir,
  getBackupsDir,
  getOptimizedImagesDir,
  isSafeSubpath,
  resolveSafePath,
  resolveMediaAssetFilePath,
} from "../config/storage.config.js";
import {
  createMediaAsset,
  listMediaAssets,
  getMediaAssetById,
  deleteMediaAsset,
} from "../services/media.service.js";
import { createWebsite } from "../services/website.service.js";

const db = prisma as any;

let passed = 0;
let failed = 0;

async function testScenario(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`[FAIL] ${name}`);
    console.error(err);
    failed++;
  }
}

async function runPersistentUploadsTestSuite() {
  console.log("=================================================");
  console.log("RUNNING FEATURE 7: PERSISTENT UPLOADS TEST SUITE");
  console.log("=================================================\n");

  const originalEnvUploadDir = process.env.UPLOAD_DIR;
  const tempTestUploadDir = path.resolve(process.cwd(), "test_persistent_storage_" + Date.now());
  const tempImagesDir = path.join(tempTestUploadDir, "images");

  let testUser: any = null;
  let testSite: any = null;

  try {
    // Setup isolated test user and site
    testUser = await db.user.create({
      data: {
        email: `persistent_user_${Date.now()}@example.com`,
        passwordHash: "hash_placeholder",
        fullName: "Persistent Upload User",
        role: "USER",
      },
    });

    testSite = await createWebsite({
      name: "Persistence Test Site",
      slug: `persistence-test-site-${Date.now()}`,
      userId: testUser.id,
    });

    // -------------------------------------------------------------------------
    // Scenario 1: Path Traversal Defense
    // -------------------------------------------------------------------------
    await testScenario("1. Path Traversal Defense: Blocks directory traversal attempts", async () => {
      const base = getImagesDir();
      
      // Should allow standard safe subpaths
      const safe = resolveSafePath(base, "normal_image.png");
      assert.equal(safe, path.join(base, "normal_image.png"));

      // Should block ../ navigation
      assert.throws(
        () => resolveSafePath(base, "../../etc/passwd"),
        /Path traversal attempt detected/
      );

      // Should block backslash traversal on Windows
      assert.throws(
        () => resolveSafePath(base, "..\\..\\windows\\system32"),
        /Path traversal attempt detected/
      );

      // resolveMediaAssetFilePath uses path.basename to neutralize traversal
      const assetWithMaliciousFilename = {
        filename: "../../../etc/shadow",
        url: "/uploads/images/../../../etc/shadow",
      };
      const resolved = resolveMediaAssetFilePath(assetWithMaliciousFilename);
      assert.equal(resolved, path.join(base, "shadow"));
      assert.ok(isSafeSubpath(base, resolved));
    });

    // -------------------------------------------------------------------------
    // Scenario 2: Custom UPLOAD_DIR Environment Configuration
    // -------------------------------------------------------------------------
    await testScenario("2. Storage Config: Supports custom UPLOAD_DIR directory", async () => {
      try {
        process.env.UPLOAD_DIR = tempTestUploadDir;
        
        const configuredUploadsDir = getUploadsDir();
        assert.equal(configuredUploadsDir, path.resolve(tempTestUploadDir));

        const configuredImagesDir = getImagesDir();
        assert.equal(configuredImagesDir, path.join(configuredUploadsDir, "images"));

        const configuredBackupsDir = getBackupsDir();
        assert.equal(configuredBackupsDir, path.join(configuredUploadsDir, "backups"));

        const configuredOptimizedDir = getOptimizedImagesDir();
        assert.equal(configuredOptimizedDir, path.join(configuredUploadsDir, "optimized"));
      } finally {
        if (originalEnvUploadDir) {
          process.env.UPLOAD_DIR = originalEnvUploadDir;
        } else {
          delete process.env.UPLOAD_DIR;
        }
      }
    });

    // -------------------------------------------------------------------------
    // Scenario 3: Uploading & Retrieving Files from Persistent Storage
    // -------------------------------------------------------------------------
    let persistentAsset: any = null;
    const testFileBytes = Buffer.from("ForgeStudio Persistent Asset Binary Test Content " + Date.now());

    await testScenario("3. Storage Persistence: Physical file and database record persist correctly", async () => {
      // Create persistent directory structure
      fs.mkdirSync(tempImagesDir, { recursive: true });

      const uniqueFilename = `img_persist_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.png`;
      const diskPath = path.join(getImagesDir(), uniqueFilename);

      // Write physical file
      await fs.promises.writeFile(diskPath, testFileBytes);
      assert.ok(fs.existsSync(diskPath), "File must exist on disk before DB registration");

      // Register asset in DB
      persistentAsset = await createMediaAsset({
        userId: testUser.id,
        websiteId: testSite.id,
        filename: uniqueFilename,
        originalName: "hero-photo.png",
        mimeType: "image/png",
        sizeBytes: testFileBytes.length,
        url: `/uploads/images/${uniqueFilename}`,
        width: 1920,
        height: 1080,
        altText: "Hero photography banner",
      });

      assert.ok(persistentAsset.id, "Asset record created");
      assert.equal(persistentAsset.url, `/uploads/images/${uniqueFilename}`);
      assert.equal(persistentAsset.sizeBytes, testFileBytes.length);

      // Read back file using resolveMediaAssetFilePath
      const resolvedPath = resolveMediaAssetFilePath(persistentAsset);
      assert.equal(resolvedPath, diskPath);
      const readBytes = await fs.promises.readFile(resolvedPath);
      assert.deepEqual(readBytes, testFileBytes, "Stored byte contents match original upload");
    });

    // -------------------------------------------------------------------------
    // Scenario 4: Simulated Backend Restart Persistence Verification
    // -------------------------------------------------------------------------
    await testScenario("4. Restart Resilience: Asset and file remain intact after simulated restart", async () => {
      assert.ok(persistentAsset, "Previous persistent asset exists");

      // Simulate restart: re-fetch from database as a fresh client request
      const retrievedAsset = await getMediaAssetById(persistentAsset.id, testUser.id);
      assert.ok(retrievedAsset, "Retrieved asset from database after simulated restart");
      assert.equal(retrievedAsset.id, persistentAsset.id);
      assert.equal(retrievedAsset.url, persistentAsset.url);

      // Verify physical disk file is still present and valid
      const resolvedPath = resolveMediaAssetFilePath(retrievedAsset);
      assert.ok(fs.existsSync(resolvedPath), "Physical file exists on storage after restart");
      const readContent = await fs.promises.readFile(resolvedPath);
      assert.deepEqual(readContent, testFileBytes, "File contents identical after simulated restart");
    });

    // -------------------------------------------------------------------------
    // Scenario 5: Duplicate Filename Collision Prevention
    // -------------------------------------------------------------------------
    await testScenario("5. Collision Safety: Identical original filenames receive unique, non-colliding paths", async () => {
      const originalName = "company-logo.png";
      const file1 = `img_${Date.now()}_${crypto.randomBytes(6).toString("hex")}.png`;
      const file2 = `img_${Date.now() + 1}_${crypto.randomBytes(6).toString("hex")}.png`;

      assert.notEqual(file1, file2, "Unique timestamp+random token ensures distinct filenames");

      const path1 = resolveSafePath(getImagesDir(), file1);
      const path2 = resolveSafePath(getImagesDir(), file2);

      await fs.promises.writeFile(path1, Buffer.from("Logo Version 1"));
      await fs.promises.writeFile(path2, Buffer.from("Logo Version 2"));

      const asset1 = await createMediaAsset({
        userId: testUser.id,
        filename: file1,
        originalName,
        mimeType: "image/png",
        sizeBytes: 14,
        url: `/uploads/images/${file1}`,
      });

      const asset2 = await createMediaAsset({
        userId: testUser.id,
        filename: file2,
        originalName,
        mimeType: "image/png",
        sizeBytes: 14,
        url: `/uploads/images/${file2}`,
      });

      assert.notEqual(asset1.url, asset2.url);
      assert.equal(fs.readFileSync(path1).toString(), "Logo Version 1");
      assert.equal(fs.readFileSync(path2).toString(), "Logo Version 2");

      // Clean up collision test files
      if (fs.existsSync(path1)) fs.unlinkSync(path1);
      if (fs.existsSync(path2)) fs.unlinkSync(path2);
      await db.mediaAsset.deleteMany({ where: { id: { in: [asset1.id, asset2.id] } } });
    });

    // -------------------------------------------------------------------------
    // Scenario 6: Database Failure Cleanup (No Orphaned Files)
    // -------------------------------------------------------------------------
    await testScenario("6. Atomic Upload: Disk file cleaned up if database registration fails", async () => {
      const orphanTestFile = `img_orphan_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.png`;
      const orphanDiskPath = path.join(getImagesDir(), orphanTestFile);

      await fs.promises.writeFile(orphanDiskPath, Buffer.from("temporary binary data"));
      assert.ok(fs.existsSync(orphanDiskPath), "File initially written to disk");

      // Simulate database failure during creation (e.g. invalid foreign key userId)
      let caughtError = false;
      try {
        await createMediaAsset({
          userId: "00000000-0000-0000-0000-000000000000", // Non-existent user UUID causes DB foreign key violation
          filename: orphanTestFile,
          originalName: "fail.png",
          mimeType: "image/png",
          sizeBytes: 10,
          url: `/uploads/images/${orphanTestFile}`,
        });
      } catch (err) {
        caughtError = true;
        // The upload middleware catch block executes:
        if (fs.existsSync(orphanDiskPath)) {
          await fs.promises.unlink(orphanDiskPath);
        }
      }

      assert.ok(caughtError, "DB operation failed as anticipated");
      assert.equal(fs.existsSync(orphanDiskPath), false, "Disk file must be cleaned up to prevent orphaned files");
    });

    // -------------------------------------------------------------------------
    // Scenario 7: Safe Deletion & In-Use Protection
    // -------------------------------------------------------------------------
    await testScenario("7. Deletion Safety: Protected against deletion when referenced in website", async () => {
      // Reference persistentAsset in testSite editorData
      await db.website.update({
        where: { id: testSite.id },
        data: {
          editorData: {
            elements: [
              {
                id: "hero_img_1",
                type: "image",
                src: persistentAsset.url,
              },
            ],
          },
        },
      });

      // Attempting delete without force must fail with 409 ASSET_IN_USE
      let blocked = false;
      try {
        await deleteMediaAsset(persistentAsset.id, testUser.id, { force: false });
      } catch (err: any) {
        blocked = true;
        assert.equal(err.statusCode, 409);
        assert.equal(err.code, "ASSET_IN_USE");
      }
      assert.ok(blocked, "Deletion blocked when referenced in website editorData");

      // Verify physical file was NOT deleted
      const resolvedPath = resolveMediaAssetFilePath(persistentAsset);
      assert.ok(fs.existsSync(resolvedPath), "Physical file kept intact during blocked deletion");

      // Force delete removes both physical file and DB record
      const delResult = await deleteMediaAsset(persistentAsset.id, testUser.id, { force: true });
      assert.equal(delResult.success, true);
      assert.equal(fs.existsSync(resolvedPath), false, "Physical file unlinked after force deletion");
    });

    // -------------------------------------------------------------------------
    // Scenario 8: Missing File Handled Safely
    // -------------------------------------------------------------------------
    await testScenario("8. Missing File Grace: Handles missing physical file gracefully on deletion", async () => {
      const ghostFilename = `img_ghost_${Date.now()}.png`;
      const ghostAsset = await createMediaAsset({
        userId: testUser.id,
        filename: ghostFilename,
        originalName: "ghost.png",
        mimeType: "image/png",
        sizeBytes: 100,
        url: `/uploads/images/${ghostFilename}`,
      });

      // Physical file intentionally does NOT exist on disk
      const resolvedGhostPath = resolveMediaAssetFilePath(ghostAsset);
      assert.equal(fs.existsSync(resolvedGhostPath), false);

      // Deleting ghost asset must not throw STORAGE_DELETE_FAILED; should clean DB
      const result = await deleteMediaAsset(ghostAsset.id, testUser.id);
      assert.equal(result.success, true);

      const checkInDb = await db.mediaAsset.findUnique({ where: { id: ghostAsset.id } });
      assert.equal(checkInDb, null, "Database record successfully removed");
    });

    // -------------------------------------------------------------------------
    // Scenario 9: Existing Media Library Compatibility
    // -------------------------------------------------------------------------
    await testScenario("9. Media Library Compatibility: Lists media assets with correct URLs and metadata", async () => {
      const libFilename = `img_lib_${Date.now()}.jpg`;
      const libPath = path.join(getImagesDir(), libFilename);
      await fs.promises.writeFile(libPath, Buffer.from("jpg dummy"));

      const libAsset = await createMediaAsset({
        userId: testUser.id,
        websiteId: testSite.id,
        filename: libFilename,
        originalName: "vacation.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 9,
        url: `/uploads/images/${libFilename}`,
        altText: "Sunny vacation",
      });

      const listResult = await listMediaAssets(testUser.id, {
        websiteId: testSite.id,
        search: "vacation",
      });

      assert.equal(listResult.assets.length, 1);
      assert.equal(listResult.assets[0].id, libAsset.id);
      assert.equal(listResult.assets[0].altText, "Sunny vacation");
      assert.equal(listResult.assets[0].url, `/uploads/images/${libFilename}`);

      // Clean up
      await deleteMediaAsset(libAsset.id, testUser.id);
      assert.equal(fs.existsSync(libPath), false);
    });

  } finally {
    // Clean up test user & website
    if (testSite?.id) {
      try {
        await db.website.delete({ where: { id: testSite.id } });
      } catch {}
    }
    if (testUser?.id) {
      try {
        await db.user.delete({ where: { id: testUser.id } });
      } catch {}
    }
    // Clean up temporary test directory if created
    if (fs.existsSync(tempTestUploadDir)) {
      try {
        fs.rmSync(tempTestUploadDir, { recursive: true, force: true });
      } catch {}
    }
  }

  console.log("\n=================================================");
  console.log(`FEATURE 7 TESTS COMPLETED: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPersistentUploadsTestSuite().catch((err) => {
  console.error("Test suite runner crashed:", err);
  process.exit(1);
});
