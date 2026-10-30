import fs from "fs";
import path from "path";
import assert from "node:assert/strict";
import { prisma } from "../config/prisma.js";
import {
  initOptimizationTables,
  optimizeImage,
  getOptimizationStats,
} from "../services/imageOptimization.service.js";
import { createMediaAsset, listMediaAssets, getMediaAssetById } from "../services/media.service.js";
import { createWebsite } from "../services/website.service.js";
import { getImagesDir, getOptimizedImagesDir } from "../config/storage.config.js";

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

async function runImageOptimizationTestSuite() {
  console.log("=================================================");
  console.log("RUNNING FEATURE 8: IMAGE OPTIMIZATION TEST SUITE");
  console.log("=================================================\n");

  await initOptimizationTables();

  let testUser: any = null;
  let unauthorizedUser: any = null;
  let testSite: any = null;
  const createdDiskFiles: string[] = [];

  try {
    // 1. Setup isolated test user and site
    testUser = await db.user.create({
      data: {
        email: `opt_user_${Date.now()}@example.com`,
        passwordHash: "hash_placeholder",
        fullName: "Optimization Test User",
        role: "USER",
        optimizationCredits: 10,
      },
    });

    unauthorizedUser = await db.user.create({
      data: {
        email: `opt_unauth_${Date.now()}@example.com`,
        passwordHash: "hash_placeholder",
        fullName: "Unauthorized User",
        role: "USER",
        optimizationCredits: 10,
      },
    });

    testSite = await createWebsite({
      name: "Optimization Test Site",
      slug: `opt-site-${Date.now()}`,
      userId: testUser.id,
    });

    // Helper: Create a real test PNG buffer with Sharp
    const sharp = (await import("sharp")).default;
    const testPngBuffer = await sharp({
      create: {
        width: 400,
        height: 200,
        channels: 4,
        background: { r: 255, g: 100, b: 50, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    // Helper: Create a real test JPEG buffer
    const testJpgBuffer = await sharp({
      create: {
        width: 600,
        height: 300,
        channels: 3,
        background: { r: 50, g: 120, b: 240 },
      },
    })
      .jpeg({ quality: 95 })
      .toBuffer();

    // -------------------------------------------------------------------------
    // Scenario 1: Real Image Compression & Valid Output
    // -------------------------------------------------------------------------
    let initialCredits = testUser.optimizationCredits;
    let optimizedPngAssetId: string = "";

    await testScenario("1. Real Compression: Compresses real PNG preserving format with valid dimensions", async () => {
      const result = await optimizeImage(testSite.id, testUser.id, {
        imageBuffer: testPngBuffer,
        fileName: "hero-banner.png",
        quality: 75,
      });

      assert.ok(result.assetId, "Asset ID returned");
      assert.ok(result.optimizedUrl.startsWith("/uploads/optimized/"), "Output URL starts with /uploads/optimized/");
      assert.equal(result.format, "png", "Original PNG format preserved in Feature 8");
      assert.equal(result.width, 400, "Output width matches original width");
      assert.equal(result.height, 200, "Output height matches original height");
      assert.ok(result.optimizedBytes > 0, "Optimized bytes reported");
      assert.equal(result.remainingCredits, initialCredits - 1, "Credits decremented by 1");

      optimizedPngAssetId = result.assetId;

      // Verify file exists on disk in persistent storage
      const fileName = path.basename(result.optimizedUrl);
      const filePath = path.join(getOptimizedImagesDir(), fileName);
      assert.ok(fs.existsSync(filePath), "Optimized file exists in persistent storage");
      createdDiskFiles.push(filePath);
    });

    // -------------------------------------------------------------------------
    // Scenario 2: Proportional Resizing & No Enlargement
    // -------------------------------------------------------------------------
    await testScenario("2. Proportional Resizing: Resizes with aspect ratio maintained and no enlargement", async () => {
      // Original is 600x300 (aspect ratio 2:1)
      // Constraining maxWidth to 300 should yield 300x150
      const result = await optimizeImage(testSite.id, testUser.id, {
        imageBuffer: testJpgBuffer,
        fileName: "photo.jpg",
        quality: 80,
        maxWidth: 300,
        maxHeight: 300,
      });

      assert.equal(result.width, 300, "Width constrained to 300");
      assert.equal(result.height, 150, "Height proportionally constrained to 150 (2:1 ratio)");
      assert.equal(result.format, "jpeg", "JPEG format preserved");

      // Verify no enlargement when dimensions are smaller than maxWidth
      const smallBuffer = await sharp({
        create: {
          width: 100,
          height: 50,
          channels: 3,
          background: { r: 0, g: 255, b: 0 },
        },
      })
        .jpeg()
        .toBuffer();

      const noEnlargeResult = await optimizeImage(testSite.id, testUser.id, {
        imageBuffer: smallBuffer,
        fileName: "small.jpg",
        maxWidth: 500,
        maxHeight: 500,
      });

      assert.equal(noEnlargeResult.width, 100, "Did not enlarge width beyond original 100");
      assert.equal(noEnlargeResult.height, 50, "Did not enlarge height beyond original 50");

      if (result.optimizedUrl) createdDiskFiles.push(path.join(getOptimizedImagesDir(), path.basename(result.optimizedUrl)));
      if (noEnlargeResult.optimizedUrl) createdDiskFiles.push(path.join(getOptimizedImagesDir(), path.basename(noEnlargeResult.optimizedUrl)));
    });

    // -------------------------------------------------------------------------
    // Scenario 3: Original Asset Preservation & Local Storage Resolution
    // -------------------------------------------------------------------------
    await testScenario("3. Original Asset Preservation: Original file and DB record remain untouched", async () => {
      // 1. Create original asset in library
      const origFilename = `img_orig_${Date.now()}.png`;
      const origPath = path.join(getImagesDir(), origFilename);
      await fs.promises.writeFile(origPath, testPngBuffer);
      createdDiskFiles.push(origPath);

      const originalAsset = await createMediaAsset({
        userId: testUser.id,
        websiteId: testSite.id,
        filename: origFilename,
        originalName: "original-hero.png",
        mimeType: "image/png",
        sizeBytes: testPngBuffer.length,
        url: `/uploads/images/${origFilename}`,
        width: 400,
        height: 200,
        altText: "Original hero image",
      });

      // 2. Optimize using assetId
      const optResult = await optimizeImage(testSite.id, testUser.id, {
        assetId: originalAsset.id,
        quality: 60,
        maxWidth: 200,
      });

      // 3. Verify original asset in DB is untouched
      const freshOriginal = await getMediaAssetById(originalAsset.id, testUser.id);
      assert.equal(freshOriginal.id, originalAsset.id);
      assert.equal(freshOriginal.url, originalAsset.url);
      assert.equal(freshOriginal.sizeBytes, testPngBuffer.length);
      assert.equal(freshOriginal.width, 400);

      // Verify original file on disk is untouched
      assert.ok(fs.existsSync(origPath), "Original disk file still exists");
      const readOrig = await fs.promises.readFile(origPath);
      assert.deepEqual(readOrig, testPngBuffer, "Original byte contents completely unchanged");

      // Verify newly created optimized asset is separate
      assert.notEqual(optResult.assetId, originalAsset.id);
      assert.notEqual(optResult.optimizedUrl, originalAsset.url);

      if (optResult.optimizedUrl) createdDiskFiles.push(path.join(getOptimizedImagesDir(), path.basename(optResult.optimizedUrl)));
    });

    // -------------------------------------------------------------------------
    // Scenario 4: MediaAsset Registration & Media Library Compatibility
    // -------------------------------------------------------------------------
    await testScenario("4. Media Library Registration: Optimized asset is registered in MediaAsset table", async () => {
      // Retrieve the newly created optimized asset from DB
      const optAssetRecord = await getMediaAssetById(optimizedPngAssetId, testUser.id);
      assert.ok(optAssetRecord, "Optimized asset found in MediaAsset table");
      assert.ok(optAssetRecord.originalName.startsWith("optimized-"), "Original name prefixed with optimized-");
      assert.equal(optAssetRecord.mimeType, "image/png");
      assert.ok(optAssetRecord.url.startsWith("/uploads/optimized/"));

      // Verify it appears in Media Library list query
      const libraryList = await listMediaAssets(testUser.id, {
        websiteId: testSite.id,
        search: "hero-banner",
      });
      const foundInLibrary = libraryList.assets.some((a: any) => a.id === optimizedPngAssetId);
      assert.ok(foundInLibrary, "Optimized asset appears in user's Media Library listing");
    });

    // -------------------------------------------------------------------------
    // Scenario 5: Corrupt Images & Unsupported Formats Rejected
    // -------------------------------------------------------------------------
    await testScenario("5. Validation Safety: Rejects corrupt or unsupported images safely", async () => {
      const corruptBuffer = Buffer.from("this is definitely not a real image binary file");

      let caught = false;
      try {
        await optimizeImage(testSite.id, testUser.id, {
          imageBuffer: corruptBuffer,
          fileName: "corrupt.png",
        });
      } catch (err: any) {
        caught = true;
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, "INVALID_IMAGE");
      }
      assert.ok(caught, "Corrupt buffer rejected with 400 INVALID_IMAGE");
    });

    // -------------------------------------------------------------------------
    // Scenario 6: Invalid Quality & Dimension Parameters Rejected
    // -------------------------------------------------------------------------
    await testScenario("6. Parameter Validation: Rejects invalid quality and negative dimensions", async () => {
      // Quality > 100
      let qualityCaught = false;
      try {
        await optimizeImage(testSite.id, testUser.id, {
          imageBuffer: testPngBuffer,
          quality: 150,
        });
      } catch (err: any) {
        qualityCaught = true;
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, "INVALID_QUALITY");
      }
      assert.ok(qualityCaught, "Quality > 100 rejected with 400 INVALID_QUALITY");

      // Quality < 10
      let lowQualityCaught = false;
      try {
        await optimizeImage(testSite.id, testUser.id, {
          imageBuffer: testPngBuffer,
          quality: 5,
        });
      } catch (err: any) {
        lowQualityCaught = true;
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, "INVALID_QUALITY");
      }
      assert.ok(lowQualityCaught, "Quality < 10 rejected with 400 INVALID_QUALITY");

      // Negative dimension
      let dimCaught = false;
      try {
        await optimizeImage(testSite.id, testUser.id, {
          imageBuffer: testPngBuffer,
          maxWidth: -500,
        });
      } catch (err: any) {
        dimCaught = true;
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, "INVALID_DIMENSIONS");
      }
      assert.ok(dimCaught, "Negative dimension rejected with 400 INVALID_DIMENSIONS");
    });

    // -------------------------------------------------------------------------
    // Scenario 7: SSRF Protection on Remote URLs
    // -------------------------------------------------------------------------
    await testScenario("7. SSRF Protection: Blocks private and loopback remote URLs", async () => {
      const blockedUrls = [
        "http://127.0.0.1:5000/image.png",
        "http://localhost:8080/secret.jpg",
        "http://169.254.169.254/latest/meta-data/",
        "http://192.168.1.1/router.png",
      ];

      for (const badUrl of blockedUrls) {
        let ssrfCaught = false;
        try {
          await optimizeImage(testSite.id, testUser.id, {
            imageUrl: badUrl,
          });
        } catch (err: any) {
          ssrfCaught = true;
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, "SSRF_VALIDATION_FAILED");
        }
        assert.ok(ssrfCaught, `SSRF target ${badUrl} correctly blocked`);
      }
    });

    // -------------------------------------------------------------------------
    // Scenario 8: Authorization & Tenant Isolation
    // -------------------------------------------------------------------------
    await testScenario("8. Authorization: Denies access to foreign user websites and assets", async () => {
      let authCaught = false;
      try {
        // Unauthorized user attempts to optimize for testSite
        await optimizeImage(testSite.id, unauthorizedUser.id, {
          imageBuffer: testPngBuffer,
        });
      } catch (err: any) {
        authCaught = true;
        assert.ok(err.statusCode === 403 || err.statusCode === 404);
      }
      assert.ok(authCaught, "Cross-user site optimization denied");
    });

    // -------------------------------------------------------------------------
    // Scenario 9: Credit Consistency & Optimization Stats
    // -------------------------------------------------------------------------
    await testScenario("9. Credit & Stats Consistency: Deducts credits and reports aggregated metrics", async () => {
      const stats = await getOptimizationStats(testSite.id, testUser.id);
      assert.ok(stats.totalImagesOptimized >= 2, "Reports at least 2 optimized images");
      assert.ok(stats.recentAssets.length >= 2, "Recent assets list populated");
      assert.ok(stats.remainingCredits < initialCredits, "Credits decreased");
      assert.ok(typeof stats.avgCompressionRatio === "string", "Compression ratio formatted");
    });

  } finally {
    // Clean up created physical files
    for (const f of createdDiskFiles) {
      if (fs.existsSync(f)) {
        try {
          fs.unlinkSync(f);
        } catch {}
      }
    }
    // Clean up test sites & users
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
    if (unauthorizedUser?.id) {
      try {
        await db.user.delete({ where: { id: unauthorizedUser.id } });
      } catch {}
    }
  }

  console.log("\n=================================================");
  console.log(`FEATURE 8 TESTS COMPLETED: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runImageOptimizationTestSuite().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
