import fs from "fs";
import path from "path";
import assert from "node:assert/strict";
import { prisma } from "../config/prisma.js";
import {
  initOptimizationTables,
  convertToWebp,
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

async function runWebpConversionTestSuite() {
  console.log("=================================================");
  console.log("RUNNING FEATURE 9: WEBP CONVERSION TEST SUITE");
  console.log("=================================================\n");

  await initOptimizationTables();

  let testUser: any = null;
  let foreignUser: any = null;
  let testSite: any = null;
  const createdDiskFiles: string[] = [];

  try {
    // 1. Setup isolated test users and website
    testUser = await db.user.create({
      data: {
        email: `webp_user_${Date.now()}@example.com`,
        passwordHash: "hash_placeholder",
        fullName: "WebP Conversion Test User",
        role: "USER",
        optimizationCredits: 50,
      },
    });

    foreignUser = await db.user.create({
      data: {
        email: `webp_foreign_${Date.now()}@example.com`,
        passwordHash: "hash_placeholder",
        fullName: "Foreign User",
        role: "USER",
        optimizationCredits: 50,
      },
    });

    testSite = await createWebsite({
      name: "WebP Test Site",
      slug: `webp-site-${Date.now()}`,
      userId: testUser.id,
    });

    // Helper: Create a real test PNG buffer with Sharp
    const sharp = (await import("sharp")).default;
    const testPngBuffer = await sharp({
      create: {
        width: 500,
        height: 250,
        channels: 4,
        background: { r: 70, g: 150, b: 220, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    // Helper: Create a real test JPEG buffer
    const testJpgBuffer = await sharp({
      create: {
        width: 800,
        height: 400,
        channels: 3,
        background: { r: 240, g: 80, b: 60 },
      },
    })
      .jpeg({ quality: 90 })
      .toBuffer();

    // -------------------------------------------------------------------------
    // Scenario 1: Successful WebP conversion of PNG
    // -------------------------------------------------------------------------
    let convertedPngAssetId: string = "";

    await testScenario("1. WebP Conversion of PNG: Converts raster PNG to real WebP format", async () => {
      const result = await convertToWebp(testSite.id, testUser.id, {
        imageBuffer: testPngBuffer,
        fileName: "test-diagram.png",
        quality: 85,
      });

      assert.ok(result.assetId, "Asset ID returned");
      assert.ok(result.convertedUrl.startsWith("/uploads/optimized/"), "Output URL starts with /uploads/optimized/");
      assert.ok(result.convertedUrl.endsWith(".webp"), "Output URL ends with .webp");
      assert.equal(result.format, "webp", "Format is webp");
      assert.equal(result.width, 500, "Output width matches original width");
      assert.equal(result.height, 250, "Output height matches original height");
      assert.ok(result.convertedBytes > 0, "Converted bytes reported");

      // Verify that the file generated on disk is valid WebP using Sharp metadata
      const fileName = path.basename(result.convertedUrl);
      const filePath = path.join(getOptimizedImagesDir(), fileName);
      assert.ok(fs.existsSync(filePath), "Converted file exists in persistent storage");
      createdDiskFiles.push(filePath);

      const diskMeta = await sharp(filePath).metadata();
      assert.equal(diskMeta.format, "webp", "Physical disk file is verified valid WebP format");

      convertedPngAssetId = result.assetId;
    });

    // -------------------------------------------------------------------------
    // Scenario 2: Successful WebP conversion of JPEG
    // -------------------------------------------------------------------------
    await testScenario("2. WebP Conversion of JPEG: Converts raster JPEG to real WebP with accurate dimensions", async () => {
      const result = await convertToWebp(testSite.id, testUser.id, {
        imageBuffer: testJpgBuffer,
        fileName: "landscape.jpg",
        quality: 80,
      });

      assert.ok(result.assetId, "Asset ID returned");
      assert.equal(result.format, "webp");
      assert.equal(result.width, 800);
      assert.equal(result.height, 400);
      assert.ok(result.convertedBytes > 0);

      const fileName = path.basename(result.convertedUrl);
      const filePath = path.join(getOptimizedImagesDir(), fileName);
      assert.ok(fs.existsSync(filePath));
      createdDiskFiles.push(filePath);

      const diskMeta = await sharp(filePath).metadata();
      assert.equal(diskMeta.format, "webp");
    });

    // -------------------------------------------------------------------------
    // Scenario 3: Quality validation
    // -------------------------------------------------------------------------
    await testScenario("3. Quality Validation: Rejects invalid quality (<10 or >100) with INVALID_QUALITY", async () => {
      let rejectedLow = false;
      try {
        await convertToWebp(testSite.id, testUser.id, {
          imageBuffer: testPngBuffer,
          quality: 5,
        });
      } catch (err: any) {
        if (err.code === "INVALID_QUALITY" || err.errorCode === "INVALID_QUALITY") rejectedLow = true;
      }
      assert.equal(rejectedLow, true, "Quality 5 rejected");

      let rejectedHigh = false;
      try {
        await convertToWebp(testSite.id, testUser.id, {
          imageBuffer: testPngBuffer,
          quality: 105,
        });
      } catch (err: any) {
        if (err.code === "INVALID_QUALITY" || err.errorCode === "INVALID_QUALITY") rejectedHigh = true;
      }
      assert.equal(rejectedHigh, true, "Quality 105 rejected");
    });

    // -------------------------------------------------------------------------
    // Scenario 4: Unsupported formats (SVG rejection)
    // -------------------------------------------------------------------------
    await testScenario("4. Unsupported Formats: Safely rejects SVG vector graphics with UNSUPPORTED_FORMAT", async () => {
      const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="red" width="100" height="100"/></svg>');
      let rejectedSvg = false;
      try {
        await convertToWebp(testSite.id, testUser.id, {
          imageBuffer: svgBuffer,
          fileName: "icon.svg",
        });
      } catch (err: any) {
        if (err.code === "UNSUPPORTED_FORMAT" || err.errorCode === "UNSUPPORTED_FORMAT") rejectedSvg = true;
      }
      assert.equal(rejectedSvg, true, "SVG conversion rejected");
    });

    // -------------------------------------------------------------------------
    // Scenario 5: Corrupt / Invalid image buffer
    // -------------------------------------------------------------------------
    await testScenario("5. Corrupt / Invalid Asset: Rejects corrupt image data with INVALID_IMAGE", async () => {
      const corruptBuffer = Buffer.from("NotAnImageAtAll-1234567890-CorruptData");
      let rejectedCorrupt = false;
      try {
        await convertToWebp(testSite.id, testUser.id, {
          imageBuffer: corruptBuffer,
          fileName: "corrupt.png",
        });
      } catch (err: any) {
        if (err.code === "INVALID_IMAGE" || err.errorCode === "INVALID_IMAGE") rejectedCorrupt = true;
      }
      assert.equal(rejectedCorrupt, true, "Corrupt buffer rejected");
    });

    // -------------------------------------------------------------------------
    // Scenario 6: Proportional resizing
    // -------------------------------------------------------------------------
    await testScenario("6. Proportional Resizing: Proportional resize preserves aspect ratio without enlargement", async () => {
      const result = await convertToWebp(testSite.id, testUser.id, {
        imageBuffer: testJpgBuffer, // 800 x 400 (2:1 aspect ratio)
        maxWidth: 400,
        maxHeight: 400,
      });

      assert.equal(result.width, 400, "Width constrained to 400");
      assert.equal(result.height, 200, "Height proportionally constrained to 200 (maintaining 2:1 ratio)");

      const fileName = path.basename(result.convertedUrl);
      const filePath = path.join(getOptimizedImagesDir(), fileName);
      createdDiskFiles.push(filePath);
    });

    // -------------------------------------------------------------------------
    // Scenario 7: Original Asset & URL Preservation
    // -------------------------------------------------------------------------
    await testScenario("7. Original Asset Preservation: Original media asset and file remain 100% untouched", async () => {
      // Create an original asset in imagesDir
      const originalFileName = `orig_${Date.now()}.png`;
      const originalFilePath = path.join(getImagesDir(), originalFileName);
      await fs.promises.writeFile(originalFilePath, testPngBuffer);
      createdDiskFiles.push(originalFilePath);

      const originalAsset = await createMediaAsset({
        userId: testUser.id,
        websiteId: testSite.id,
        filename: originalFileName,
        originalName: "my-original-artwork.png",
        mimeType: "image/png",
        sizeBytes: testPngBuffer.length,
        url: `/uploads/images/${originalFileName}`,
        width: 500,
        height: 250,
        altText: "Original artwork",
      });

      // Convert using assetId
      const convertRes = await convertToWebp(testSite.id, testUser.id, {
        assetId: originalAsset.id,
        quality: 80,
      });

      // Assert that original asset record in DB has NOT changed
      const fetchedOriginal = await getMediaAssetById(originalAsset.id, testUser.id);
      assert.equal(fetchedOriginal.filename, originalFileName, "Original filename unchanged");
      assert.equal(fetchedOriginal.url, `/uploads/images/${originalFileName}`, "Original URL unchanged");
      assert.equal(fetchedOriginal.mimeType, "image/png", "Original MIME type remains PNG");
      assert.ok(fs.existsSync(originalFilePath), "Original file still exists on disk");

      // Assert converted asset is a separate record
      assert.notEqual(convertRes.assetId, originalAsset.id, "Converted asset is a distinct new DB record");
      assert.equal(convertRes.format, "webp");

      const fileName = path.basename(convertRes.convertedUrl);
      const filePath = path.join(getOptimizedImagesDir(), fileName);
      createdDiskFiles.push(filePath);
    });

    // -------------------------------------------------------------------------
    // Scenario 8: Media Library Integration
    // -------------------------------------------------------------------------
    await testScenario("8. Media Library Integration: Converted asset registered in media_assets with format WEBP", async () => {
      const mediaList = await listMediaAssets(testUser.id, {
        websiteId: testSite.id,
        mimeType: "image/webp",
      });

      const webpAssets = mediaList.assets.filter((a: any) => a.mimeType === "image/webp");
      assert.ok(webpAssets.length >= 2, "Media library contains registered WebP assets");

      const sample = webpAssets[0];
      assert.equal(sample.mimeType, "image/webp");
      assert.equal(sample.format, "WEBP", "Format column is set to WEBP");
      assert.ok(sample.url.endsWith(".webp"));
    });

    // -------------------------------------------------------------------------
    // Scenario 9: Authorization Guard
    // -------------------------------------------------------------------------
    await testScenario("9. Authorization Guard: Foreign user blocked from converting another user's asset", async () => {
      let blocked = false;
      try {
        await convertToWebp(testSite.id, foreignUser.id, {
          assetId: convertedPngAssetId,
        });
      } catch (err: any) {
        blocked = true;
      }
      assert.equal(blocked, true, "Foreign user access blocked with error");
    });

    // -------------------------------------------------------------------------
    // Scenario 10: Atomic Rollback Cleanup
    // -------------------------------------------------------------------------
    await testScenario("10. Atomic Rollback: Physical file cleaned up from disk if DB registration fails", async () => {
      const originalCreate = db.mediaAsset.create;
      let capturedFilePath = "";

      // Temporarily mock create to fail
      db.mediaAsset.create = async () => {
        throw new Error("Simulated database failure during WebP registration");
      };

      let failedGracefully = false;
      try {
        await convertToWebp(testSite.id, testUser.id, {
          imageBuffer: testPngBuffer,
          fileName: "rollback-test.png",
        });
      } catch (err: any) {
        if (err.code === "WEBP_DB_FAILED" || err.errorCode === "WEBP_DB_FAILED") {
          failedGracefully = true;
        }
      } finally {
        db.mediaAsset.create = originalCreate;
      }

      assert.equal(failedGracefully, true, "Returned WEBP_DB_FAILED error");

      // Verify no orphaned rollback-test files exist in optimized directory
      const files = await fs.promises.readdir(getOptimizedImagesDir());
      const orphans = files.filter(f => f.includes("rollback-test"));
      assert.equal(orphans.length, 0, "No orphaned files left on disk after DB failure");
    });

  } finally {
    // Cleanup created disk files
    for (const f of createdDiskFiles) {
      if (fs.existsSync(f)) {
        try {
          fs.unlinkSync(f);
        } catch {}
      }
    }

    // Cleanup DB records
    if (testSite) {
      try {
        await db.mediaAsset.deleteMany({ where: { websiteId: testSite.id } });
        await db.mediaOptimizationAsset.deleteMany({ where: { websiteId: testSite.id } });
        await db.website.delete({ where: { id: testSite.id } });
      } catch {}
    }
    if (testUser) {
      try {
        await db.mediaAsset.deleteMany({ where: { userId: testUser.id } });
        await db.user.delete({ where: { id: testUser.id } });
      } catch {}
    }
    if (foreignUser) {
      try {
        await db.user.delete({ where: { id: foreignUser.id } });
      } catch {}
    }
  }

  console.log("\n=================================================");
  console.log(`FEATURE 9 WEBP TESTS COMPLETED: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runWebpConversionTestSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test suite fatal error:", err);
    process.exit(1);
  });
