import fs from "fs";
import path from "path";
import assert from "node:assert/strict";
import { prisma } from "../config/prisma.js";
import {
  initMediaAssetTable,
  createMediaAsset,
  listMediaAssets,
  getMediaAssetById,
  updateMediaAsset,
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

async function runMediaLibraryTestSuite() {
  console.log("=================================================");
  console.log("RUNNING FEATURE 6: MEDIA LIBRARY TEST SUITE");
  console.log("=================================================\n");

  let userA: any = null;
  let userB: any = null;
  let siteA: any = null;
  let siteB: any = null;

  const createdFilePaths: string[] = [];

  try {
    // 1. Setup isolated test users and websites
    userA = await db.user.create({
      data: {
        email: `medialib_user_a_${Date.now()}@example.com`,
        passwordHash: "hash_placeholder",
        fullName: "MediaLib User A",
        role: "USER",
      },
    });

    userB = await db.user.create({
      data: {
        email: `medialib_user_b_${Date.now()}@example.com`,
        passwordHash: "hash_placeholder",
        fullName: "MediaLib User B",
        role: "USER",
      },
    });

    siteA = await createWebsite({
      name: "Portfolio Alpha",
      slug: `portfolio-alpha-${Date.now()}`,
      userId: userA.id,
    });

    siteB = await createWebsite({
      name: "Store Beta",
      slug: `store-beta-${Date.now()}`,
      userId: userB.id,
    });

    await initMediaAssetTable();

    console.log("--- 1. Asset Creation & Dimension Extraction ---");

    // Helper to generate a dummy physical file in uploads/images
    const uploadsDir = path.join(process.cwd(), "uploads", "images");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const createDummyAsset = async (
      userId: string,
      filename: string,
      originalName: string,
      mimeType: string,
      options: { altText?: string; websiteId?: string; createDiskFile?: boolean } = {}
    ) => {
      const publicUrl = `/uploads/images/${filename}`;
      const filePath = path.join(uploadsDir, filename);

      if (options.createDiskFile !== false) {
        fs.writeFileSync(filePath, Buffer.from("dummy-media-content"));
        createdFilePaths.push(filePath);
      }

      return await createMediaAsset({
        userId,
        websiteId: options.websiteId,
        filename,
        originalName,
        mimeType,
        sizeBytes: 1024,
        url: publicUrl,
        width: 1200,
        height: 800,
        altText: options.altText || undefined,
      });
    };

    const assetPng = await createDummyAsset(userA.id, `hero_${Date.now()}.png`, "hero-banner-main.png", "image/png", {
      altText: "Main modern hero banner",
      websiteId: siteA.id,
    });

    const assetJpg = await createDummyAsset(userA.id, `product_${Date.now()}.jpg`, "sneaker-product-photo.jpg", "image/jpeg", {
      altText: "White running sneakers side view",
    });

    const assetSvg = await createDummyAsset(userA.id, `logo_${Date.now()}.svg`, "company-brand-logo.svg", "image/svg+xml", {
      altText: "Vector brand logo monogram",
    });

    await testScenario("Asset creation persists metadata, dimensions, and URL correctly", async () => {
      assert.ok(assetPng.id);
      assert.equal(assetPng.userId, userA.id);
      assert.equal(assetPng.width, 1200);
      assert.equal(assetPng.height, 800);
      assert.equal(assetPng.mimeType, "image/png");
    });

    console.log("\n--- 2. Listing, Search & Pagination ---");

    await testScenario("Listing retrieves user assets with default pagination", async () => {
      const res = await listMediaAssets(userA.id);
      assert.equal(res.assets.length, 3);
      assert.equal(res.pagination.total, 3);
      assert.equal(res.pagination.page, 1);
    });

    await testScenario("Pagination limit and page offsets work correctly", async () => {
      const page1 = await listMediaAssets(userA.id, { page: 1, limit: 2 });
      assert.equal(page1.assets.length, 2);
      assert.equal(page1.pagination.totalPages, 2);

      const page2 = await listMediaAssets(userA.id, { page: 2, limit: 2 });
      assert.equal(page2.assets.length, 1);
      assert.notEqual(page1.assets[0].id, page2.assets[0].id);
    });

    await testScenario("Search matches filename, originalName, and alt text", async () => {
      // By originalName substring
      const searchByName = await listMediaAssets(userA.id, { search: "sneaker" });
      assert.equal(searchByName.assets.length, 1);
      assert.equal(searchByName.assets[0].id, assetJpg.id);

      // By alt text substring
      const searchByAlt = await listMediaAssets(userA.id, { search: "monogram" });
      assert.equal(searchByAlt.assets.length, 1);
      assert.equal(searchByAlt.assets[0].id, assetSvg.id);

      // Non-matching query
      const noMatch = await listMediaAssets(userA.id, { search: "non-existent-xyz" });
      assert.equal(noMatch.assets.length, 0);
    });

    console.log("\n--- 3. Media Type Filtering ---");

    await testScenario("Filtering by MIME-type isolates target file types", async () => {
      const pngOnly = await listMediaAssets(userA.id, { mimeType: "image/png" });
      assert.equal(pngOnly.assets.length, 1);
      assert.equal(pngOnly.assets[0].mimeType, "image/png");

      const svgOnly = await listMediaAssets(userA.id, { mimeType: "image/svg+xml" });
      assert.equal(svgOnly.assets.length, 1);
      assert.equal(svgOnly.assets[0].mimeType, "image/svg+xml");

      const jpegOnly = await listMediaAssets(userA.id, { mimeType: "image/jpeg" });
      assert.equal(jpegOnly.assets.length, 1);
      assert.equal(jpegOnly.assets[0].mimeType, "image/jpeg");
    });

    console.log("\n--- 4. Safe Deletion & Reference Check ---");

    await testScenario("Safe Deletion: Prevents deleting asset in use by website editorData", async () => {
      // Embed assetPng URL into siteA's editorData
      await db.website.update({
        where: { id: siteA.id },
        data: {
          editorData: {
            version: 1,
            elements: [
              {
                id: "img_test_1",
                type: "image",
                src: assetPng.url,
                alt: "Active Hero",
              },
            ],
          },
        },
      });

      // Attempt deletion without force: must be blocked with 409 ASSET_IN_USE
      let blockedError: any = null;
      try {
        await deleteMediaAsset(assetPng.id, userA.id, { force: false });
      } catch (err: any) {
        blockedError = err;
      }

      assert.ok(blockedError, "Deletion should throw an error when asset is referenced");
      assert.equal(blockedError.statusCode, 409);
      assert.equal(blockedError.code, "ASSET_IN_USE");
      assert.ok(blockedError.message.includes("Portfolio Alpha"));

      // Verify DB record and file still exist
      const checkAsset = await getMediaAssetById(assetPng.id, userA.id);
      assert.ok(checkAsset);
      const filePath = path.join(uploadsDir, assetPng.filename);
      assert.ok(fs.existsSync(filePath), "File must not be unlinked on blocked deletion");
    });

    await testScenario("Safe Deletion: Force deletion removes in-use asset and unlinks physical file", async () => {
      const filePath = path.join(uploadsDir, assetPng.filename);
      assert.ok(fs.existsSync(filePath));

      const res = await deleteMediaAsset(assetPng.id, userA.id, { force: true });
      assert.equal(res.success, true);

      // Verify physical file was unlinked from disk
      assert.equal(fs.existsSync(filePath), false, "Physical file must be unlinked from uploads/images/");

      // Verify record removed from database
      let notFound = false;
      try {
        await getMediaAssetById(assetPng.id, userA.id);
      } catch (err: any) {
        notFound = true;
      }
      assert.equal(notFound, true);
    });

    await testScenario("Deletion of unreferenced asset succeeds and unlinks disk file", async () => {
      const filePath = path.join(uploadsDir, assetJpg.filename);
      assert.ok(fs.existsSync(filePath));

      const res = await deleteMediaAsset(assetJpg.id, userA.id);
      assert.equal(res.success, true);
      assert.equal(fs.existsSync(filePath), false);
    });

    await testScenario("Deletion handles missing disk file gracefully without throwing error", async () => {
      // Create asset record without file on disk
      const assetNoFile = await createDummyAsset(userA.id, `ghost_${Date.now()}.png`, "ghost.png", "image/png", {
        createDiskFile: false,
      });

      const res = await deleteMediaAsset(assetNoFile.id, userA.id);
      assert.equal(res.success, true);

      let recordRemoved = false;
      try {
        await getMediaAssetById(assetNoFile.id, userA.id);
      } catch {
        recordRemoved = true;
      }
      assert.equal(recordRemoved, true);
    });

    console.log("\n--- 5. Authorization & Multi-Tenant Isolation ---");

    await testScenario("Cross-User Isolation: User B cannot view User A media assets", async () => {
      const listB = await listMediaAssets(userB.id);
      assert.equal(listB.assets.length, 0);

      let idorGetBlocked = false;
      try {
        await getMediaAssetById(assetSvg.id, userB.id);
      } catch {
        idorGetBlocked = true;
      }
      assert.equal(idorGetBlocked, true);
    });

    await testScenario("Cross-User Isolation: User B cannot delete or update User A media assets", async () => {
      let updateBlocked = false;
      try {
        await updateMediaAsset(assetSvg.id, userB.id, { altText: "Malicious rewrite" });
      } catch {
        updateBlocked = true;
      }
      assert.equal(updateBlocked, true);

      let deleteBlocked = false;
      try {
        await deleteMediaAsset(assetSvg.id, userB.id);
      } catch {
        deleteBlocked = true;
      }
      assert.equal(deleteBlocked, true);
    });

    await testScenario("Unauthorized Website ID filter is rejected with 404/Forbidden", async () => {
      // User B attempts to query media using User A's websiteId
      let foreignSiteBlocked = false;
      try {
        await listMediaAssets(userB.id, { websiteId: siteA.id });
      } catch {
        foreignSiteBlocked = true;
      }
      assert.equal(foreignSiteBlocked, true, "Querying foreign websiteId must be rejected");
    });

    console.log("\n--- 6. Alt Text & Selection Payload Contract ---");

    await testScenario("Asset selection payload provides valid URL and updated alt text", async () => {
      const updated = await updateMediaAsset(assetSvg.id, userA.id, {
        altText: "Accessible Corporate Brand Monogram",
      });

      assert.equal(updated.altText, "Accessible Corporate Brand Monogram");
      assert.ok(updated.url.startsWith("/uploads/images/"));

      // Contract check for editor element assignment:
      const elementPayload = {
        src: updated.url,
        alt: updated.altText,
      };
      assert.equal(elementPayload.src, updated.url);
      assert.equal(elementPayload.alt, "Accessible Corporate Brand Monogram");
    });

  } finally {
    // Cleanup created test records and remaining disk files
    for (const f of createdFilePaths) {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch {}
    }

    try {
      if (siteA) await db.website.delete({ where: { id: siteA.id } });
      if (siteB) await db.website.delete({ where: { id: siteB.id } });
      if (userA) await db.user.delete({ where: { id: userA.id } });
      if (userB) await db.user.delete({ where: { id: userB.id } });
    } catch {}
  }

  console.log("\n=================================================");
  console.log(`FEATURE 6 TESTS COMPLETED: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runMediaLibraryTestSuite();
