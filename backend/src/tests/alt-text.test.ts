import fs from "fs";
import path from "path";
import assert from "node:assert/strict";
import { prisma } from "../config/prisma.js";
import {
  initMediaAssetTable,
  createMediaAsset,
  getMediaAssetById,
  updateMediaAsset,
} from "../services/media.service.js";
import { convertToWebp } from "../services/imageOptimization.service.js";
import { createWebsite } from "../services/website.service.js";
import { getUploadsDir, getOptimizedImagesDir } from "../config/storage.config.js";

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

async function runAltTextTestSuite() {
  console.log("=================================================");
  console.log("RUNNING FEATURE 10: ALT TEXT MANAGEMENT TEST SUITE");
  console.log("=================================================\n");

  await initMediaAssetTable();

  let userA: any = null;
  let userB: any = null;
  let siteA: any = null;
  const createdDiskFiles: string[] = [];

  // 1x1 valid PNG for real WebP conversion tests
  const samplePngBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );

  try {
    userA = await db.user.create({
      data: {
        email: `alt_user_a_${Date.now()}@example.com`,
        passwordHash: "hash_placeholder",
        fullName: "Alt Text User A",
        role: "USER",
      },
    });

    userB = await db.user.create({
      data: {
        email: `alt_user_b_${Date.now()}@example.com`,
        passwordHash: "hash_placeholder",
        fullName: "Alt Text User B",
        role: "USER",
      },
    });

    siteA = await createWebsite({
      userId: userA.id,
      name: "Alt Text Site",
      slug: `alt-site-${Date.now()}`,
    });

    // -------------------------------------------------------------------------
    // Scenario 1: Create media asset with alt text
    // -------------------------------------------------------------------------
    let asset1: any = null;
    await testScenario("1. Creation: Media asset created with valid alt text", async () => {
      asset1 = await createMediaAsset({
        userId: userA.id,
        websiteId: siteA.id,
        filename: "hero_banner.png",
        originalName: "hero_banner.png",
        mimeType: "image/png",
        sizeBytes: 1024,
        url: "/uploads/images/hero_banner.png",
        width: 1200,
        height: 600,
        altText: "Hero banner showing modern web design workspace",
      });

      assert.equal(asset1.altText, "Hero banner showing modern web design workspace");
      assert.equal(asset1.width, 1200);
      assert.equal(asset1.height, 600);
    });

    // -------------------------------------------------------------------------
    // Scenario 2: Edit and update alt text via updateMediaAsset
    // -------------------------------------------------------------------------
    await testScenario("2. Update & Persistence: Edit and save updated alt text", async () => {
      const updated = await updateMediaAsset(asset1.id, userA.id, {
        altText: "Updated high-contrast minimalist workspace banner",
      });

      assert.equal(updated.altText, "Updated high-contrast minimalist workspace banner");
      // Verify persistence in DB
      const fresh = await getMediaAssetById(asset1.id, userA.id);
      assert.equal(fresh.altText, "Updated high-contrast minimalist workspace banner");
    });

    // -------------------------------------------------------------------------
    // Scenario 3: Metadata preservation (dimensions, url, filename untouched)
    // -------------------------------------------------------------------------
    await testScenario("3. Metadata Preservation: Filename, URL, and dimensions remain intact after alt update", async () => {
      const fresh = await getMediaAssetById(asset1.id, userA.id);
      assert.equal(fresh.filename, "hero_banner.png");
      assert.equal(fresh.url, "/uploads/images/hero_banner.png");
      assert.equal(fresh.width, 1200);
      assert.equal(fresh.height, 600);
      assert.equal(fresh.mimeType, "image/png");
      assert.equal(fresh.sizeBytes, 1024);
    });

    // -------------------------------------------------------------------------
    // Scenario 4: Input trimming (safe removal of leading/trailing whitespace)
    // -------------------------------------------------------------------------
    await testScenario("4. Input Trimming: Safely trims leading and trailing whitespace", async () => {
      const updated = await updateMediaAsset(asset1.id, userA.id, {
        altText: "   Padded description with whitespace   ",
      });

      assert.equal(updated.altText, "Padded description with whitespace");
    });

    // -------------------------------------------------------------------------
    // Scenario 5: Clearing alt text / decorative image support (empty string & null)
    // -------------------------------------------------------------------------
    await testScenario("5. Empty / Decorative Support: Clears alt text to empty string or null for decorative images", async () => {
      // Clear to empty string
      const emptyUpdate = await updateMediaAsset(asset1.id, userA.id, {
        altText: "",
      });
      assert.equal(emptyUpdate.altText, "");

      // Clear to null
      const nullUpdate = await updateMediaAsset(asset1.id, userA.id, {
        altText: null,
      });
      assert.equal(nullUpdate.altText, null);
    });

    // -------------------------------------------------------------------------
    // Scenario 6: Reopen / refresh asset verification
    // -------------------------------------------------------------------------
    await testScenario("6. Reopening Asset: Returns saved alt text consistently after refresh", async () => {
      await updateMediaAsset(asset1.id, userA.id, {
        altText: "Final persisted accessibility description",
      });

      // Simulate reopening asset
      const reopened = await getMediaAssetById(asset1.id, userA.id);
      assert.equal(reopened.altText, "Final persisted accessibility description");
    });

    // -------------------------------------------------------------------------
    // Scenario 7: Input validation (rejects invalid input > 500 chars, invalid types)
    // -------------------------------------------------------------------------
    await testScenario("7. Input Validation: Rejects alt text exceeding 500 characters or invalid types", async () => {
      const excessiveAltText = "A".repeat(501);
      let rejectedLength = false;
      try {
        await updateMediaAsset(asset1.id, userA.id, {
          altText: excessiveAltText,
        });
      } catch (err: any) {
        if (err.code === "INVALID_ALT_TEXT" || err.errorCode === "INVALID_ALT_TEXT") {
          rejectedLength = true;
        }
      }
      assert.equal(rejectedLength, true, "501-character alt text must be rejected");

      let rejectedType = false;
      try {
        await updateMediaAsset(asset1.id, userA.id, {
          altText: { invalid: true } as any,
        });
      } catch (err: any) {
        if (err.code === "INVALID_ALT_TEXT" || err.errorCode === "INVALID_ALT_TEXT") {
          rejectedType = true;
        }
      }
      assert.equal(rejectedType, true, "Non-string non-null alt text must be rejected");
    });

    // -------------------------------------------------------------------------
    // Scenario 8: Tenant isolation (foreign user blocked from editing alt text)
    // -------------------------------------------------------------------------
    await testScenario("8. Multi-Tenant Authorization: Foreign user blocked from editing another user's alt text", async () => {
      let foreignUpdateBlocked = false;
      try {
        await updateMediaAsset(asset1.id, userB.id, {
          altText: "Hacked by User B",
        });
      } catch {
        foreignUpdateBlocked = true;
      }
      assert.equal(foreignUpdateBlocked, true, "User B must not be allowed to update User A's asset");

      // Verify asset1 altText unchanged
      const unaffected = await getMediaAssetById(asset1.id, userA.id);
      assert.equal(unaffected.altText, "Final persisted accessibility description");
    });

    // -------------------------------------------------------------------------
    // Scenario 9: WebP converted assets support alt text management consistently
    // -------------------------------------------------------------------------
    let webpAssetRecord: any = null;
    await testScenario("9. WebP Consistency: Converted WebP asset supports editing, persisting, and querying alt text", async () => {
      const webpResult = await convertToWebp(siteA.id, userA.id, {
        imageBuffer: samplePngBuffer,
        fileName: "product-photo.png",
        altText: "Initial product photography",
      });

      webpAssetRecord = webpResult.asset;
      assert.ok(webpAssetRecord);
      assert.equal(webpAssetRecord.format, "WEBP");
      assert.equal(webpAssetRecord.altText, "Initial product photography");

      // Track disk file for cleanup
      const diskPath = path.join(getOptimizedImagesDir(), webpAssetRecord.filename);
      createdDiskFiles.push(diskPath);

      // Update WebP asset's alt text
      const updatedWebp = await updateMediaAsset(webpAssetRecord.id, userA.id, {
        altText: "Studio lighting product view with soft shadow",
      });

      assert.equal(updatedWebp.altText, "Studio lighting product view with soft shadow");
      assert.equal(updatedWebp.format, "WEBP");

      // Reopening / refreshing WebP asset
      const reopenedWebp = await getMediaAssetById(webpAssetRecord.id, userA.id);
      assert.equal(reopenedWebp.altText, "Studio lighting product view with soft shadow");
    });

    // -------------------------------------------------------------------------
    // Scenario 10: Original asset alt text preserved without auto-generation or overwriting
    // -------------------------------------------------------------------------
    await testScenario("10. Conversion Non-Destructive: Original asset alt text is not overwritten or replaced with synthetic text", async () => {
      // 1. Setup a distinct original asset with an explicit alt text
      const originalAsset = await createMediaAsset({
        userId: userA.id,
        websiteId: siteA.id,
        filename: "nature.png",
        originalName: "nature.png",
        mimeType: "image/png",
        sizeBytes: samplePngBuffer.length,
        url: "/uploads/images/nature.png",
        width: 100,
        height: 100,
        altText: "Original serene alpine lake at sunset",
      });

      // Write physical file so convertToWebp can read it via assetId
      const originalDiskPath = path.join(getUploadsDir(), "images", "nature.png");
      if (!fs.existsSync(path.dirname(originalDiskPath))) {
        fs.mkdirSync(path.dirname(originalDiskPath), { recursive: true });
      }
      fs.writeFileSync(originalDiskPath, samplePngBuffer);
      createdDiskFiles.push(originalDiskPath);

      // 2. Perform WebP conversion referencing assetId without passing altText override
      const webpFromAsset = await convertToWebp(siteA.id, userA.id, {
        assetId: originalAsset.id,
      });

      if (webpFromAsset.asset) {
        const webpDisk = path.join(getOptimizedImagesDir(), webpFromAsset.asset.filename);
        createdDiskFiles.push(webpDisk);
      }

      // Converted asset inherits original altText
      assert.equal(webpFromAsset.asset?.altText, "Original serene alpine lake at sunset");

      // Verify original asset remains 100% untouched
      const originalAfterConversion = await getMediaAssetById(originalAsset.id, userA.id);
      assert.equal(originalAfterConversion.altText, "Original serene alpine lake at sunset");
      assert.equal(originalAfterConversion.url, "/uploads/images/nature.png");
    });

    // -------------------------------------------------------------------------
    // Scenario 11: Unicode & Tamil Character Preservation
    // -------------------------------------------------------------------------
    await testScenario("11. Unicode & Special Characters: Preserves Tamil, quotes, ampersands, and angle brackets verbatim", async () => {
      const complexAltText = "அழகான இயற்கை & \"Modern\" <Scenic> View 'Sunset'";
      const unicodeAsset = await createMediaAsset({
        userId: userA.id,
        websiteId: siteA.id,
        filename: "tamil_scenic.png",
        originalName: "tamil_scenic.png",
        mimeType: "image/png",
        sizeBytes: 512,
        url: "/uploads/images/tamil_scenic.png",
        altText: complexAltText,
      });

      assert.equal(unicodeAsset.altText, complexAltText);

      // Verify DB fetch preserves exact characters
      const retrieved = await getMediaAssetById(unicodeAsset.id, userA.id);
      assert.equal(retrieved.altText, complexAltText);
    });

    // -------------------------------------------------------------------------
    // Scenario 12: Static Compiler & HTML Escaping with Decorative Alt Support
    // -------------------------------------------------------------------------
    await testScenario("12. Static Compiler HTML Escaping: Safely escapes HTML quotes/ampersands and supports alt='' for decorative images", async () => {
      const { compileCanonicalToStaticBundle } = await import("../services/destinations/staticCompiler.js");

      const siteData = {
        name: "Alt Accessibility Test",
        pages: [
          {
            id: "home",
            name: "Home",
            slug: "index",
            isHome: true,
            elements: [
              {
                id: "img_accessible",
                type: "image",
                src: "/uploads/images/tamil_scenic.png",
                alt: "அழகான இயற்கை & \"Modern\" View",
              },
              {
                id: "img_decorative",
                type: "image",
                src: "/uploads/images/bg_pattern.png",
                alt: "", // Explicit empty alt for decorative image
              },
              {
                id: "img_no_alt",
                type: "image",
                src: "/uploads/images/unspecified.png",
                // alt omitted
              },
            ],
          },
        ],
      };

      const bundle = compileCanonicalToStaticBundle(siteA.id, 1, siteData);
      const indexHtmlFile = bundle.files.find((f) => f.path === "index.html");
      assert.ok(indexHtmlFile, "index.html must be generated in bundle");

      const html = indexHtmlFile.content;

      // 1. Verify quotes and ampersands are escaped safely in alt attribute
      assert.ok(
        html.includes('alt="அழகான இயற்கை &amp; &quot;Modern&quot; View"'),
        "Quotes and ampersands must be HTML escaped in alt attribute"
      );

      // 2. Verify decorative image renders alt="" (not fallback 'Image' or 'Uploaded Image')
      assert.ok(
        html.includes('src="/uploads/images/bg_pattern.png" alt=""'),
        "Decorative image with alt='' must render exact alt=''"
      );

      // 3. Verify missing alt renders alt="" and not misleading descriptions
      assert.ok(
        html.includes('src="/uploads/images/unspecified.png" alt=""'),
        "Image with unspecified alt must render safe empty alt"
      );
      assert.equal(html.includes('alt="Uploaded Image"'), false);
      assert.equal(html.includes('alt="Image"'), false);
    });

  } finally {
    // Cleanup created files on disk
    for (const f of createdDiskFiles) {
      if (fs.existsSync(f)) {
        try {
          fs.unlinkSync(f);
        } catch {}
      }
    }

    // Cleanup database records
    try {
      if (siteA) await db.website.delete({ where: { id: siteA.id } });
      if (userA) await db.user.delete({ where: { id: userA.id } });
      if (userB) await db.user.delete({ where: { id: userB.id } });
    } catch {}
  }

  console.log("\n=================================================");
  console.log(`FEATURE 10 ALT TEXT TESTS COMPLETED: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runAltTextTestSuite();
