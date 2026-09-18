import { prisma } from "../config/prisma.js";
import {
  initMediaAssetTable,
  extractImageDimensions,
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

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`, details || "");
    failed++;
  }
}

async function runMilestoneITests() {
  console.log("=================================================");
  console.log("RUNNING FORGESTUDIO MILESTONE I VERIFICATION SUITE");
  console.log("Real Media & Asset Management (Phase 9)");
  console.log("=================================================\n");

  let userA: any = null;
  let userB: any = null;
  let siteA: any = null;
  let createdAssetId = "";

  try {
    // 0. Setup test users and website
    userA = await db.user.create({
      data: {
        email: `media_user_a_${Date.now()}@example.com`,
        passwordHash: "hash_placeholder",
        fullName: "Media User A",
        role: "USER",
      },
    });

    userB = await db.user.create({
      data: {
        email: `media_user_b_${Date.now()}@example.com`,
        passwordHash: "hash_placeholder",
        fullName: "Media User B",
        role: "USER",
      },
    });

    siteA = await createWebsite({
      name: "Media Site A",
      slug: `media-site-a-${Date.now()}`,
      userId: userA.id,
    });

    // 1. Table initialization
    await initMediaAssetTable();
    assert(true, "initMediaAssetTable runs without errors");

    // 2. Pure JS Dimension Parsing: PNG
    // Minimal PNG header: 8-byte signature + IHDR chunk (length 13, IHDR, width=320, height=240, bit depth, color type, etc.)
    const pngBuffer = Buffer.alloc(32);
    pngBuffer[0] = 0x89;
    pngBuffer[1] = 0x50;
    pngBuffer[2] = 0x4e;
    pngBuffer[3] = 0x47;
    pngBuffer[4] = 0x0d;
    pngBuffer[5] = 0x0a;
    pngBuffer[6] = 0x1a;
    pngBuffer[7] = 0x0a;
    // Chunk length
    pngBuffer.writeUInt32BE(13, 8);
    // 'IHDR'
    pngBuffer.write("IHDR", 12, 4, "ascii");
    // Width = 800
    pngBuffer.writeUInt32BE(800, 16);
    // Height = 600
    pngBuffer.writeUInt32BE(600, 20);

    const pngDims = extractImageDimensions(pngBuffer, "image/png");
    assert(
      pngDims.width === 800 && pngDims.height === 600,
      "extractImageDimensions accurately parses PNG header without native dependencies",
      pngDims
    );

    // 3. Pure JS Dimension Parsing: GIF
    // GIF89a header: offset 6: width (LE 16-bit), offset 8: height (LE 16-bit)
    const gifBuffer = Buffer.alloc(16);
    gifBuffer.write("GIF89a", 0, 6, "ascii");
    gifBuffer.writeUInt16LE(400, 6);
    gifBuffer.writeUInt16LE(300, 8);

    const gifDims = extractImageDimensions(gifBuffer, "image/gif");
    assert(
      gifDims.width === 400 && gifDims.height === 300,
      "extractImageDimensions accurately parses GIF header",
      gifDims
    );

    // 4. Pure JS Dimension Parsing: SVG
    const svgBuffer = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 768"><rect width="100%" height="100%" fill="red"/></svg>`
    );
    const svgDims = extractImageDimensions(svgBuffer, "image/svg+xml");
    assert(
      svgDims.width === 1024 && svgDims.height === 768,
      "extractImageDimensions parses SVG viewBox dimensions",
      svgDims
    );

    // 5. Create MediaAsset in PostgreSQL
    const newAsset = await createMediaAsset({
      userId: userA.id,
      websiteId: siteA.id,
      filename: `banner-${Date.now()}.png`,
      originalName: "hero-banner-summer.png",
      mimeType: "image/png",
      sizeBytes: 154200,
      url: `/uploads/images/banner-${Date.now()}.png`,
      width: 800,
      height: 600,
      altText: "Summer sale hero banner with sunglasses",
    });

    createdAssetId = newAsset.id;
    assert(
      newAsset.id !== undefined &&
      newAsset.userId === userA.id &&
      newAsset.width === 800 &&
      newAsset.height === 600,
      "createMediaAsset persists record with metadata in PostgreSQL"
    );

    // 6. List MediaAssets for User A
    const listResultA = await listMediaAssets(userA.id);
    assert(
      listResultA.assets.length === 1 && listResultA.assets[0].id === createdAssetId,
      "listMediaAssets retrieves stored assets for owner user"
    );

    // 7. Strict Tenant Isolation: User B cannot see User A's media
    const listResultB = await listMediaAssets(userB.id);
    assert(
      listResultB.assets.length === 0,
      "Tenant isolation verified: User B cannot access User A media assets"
    );

    // 8. IDOR Prevention: User B cannot fetch or update User A's asset
    let idorBlocked = false;
    try {
      await getMediaAssetById(createdAssetId, userB.id);
    } catch {
      idorBlocked = true;
    }
    assert(idorBlocked === true, "IDOR protection denies foreign user asset access by ID");

    // 9. Update MediaAsset (Alt Text)
    const updated = await updateMediaAsset(createdAssetId, userA.id, {
      altText: "Updated high-converting summer sale banner",
    });
    assert(
      updated.altText === "Updated high-converting summer sale banner",
      "updateMediaAsset updates alt text and returns fresh record"
    );

    // 10. Search Filtering
    const searchMatch = await listMediaAssets(userA.id, { search: "summer" });
    const searchNoMatch = await listMediaAssets(userA.id, { search: "winter-snow" });
    assert(
      searchMatch.assets.length === 1 && searchNoMatch.assets.length === 0,
      "listMediaAssets search filter matches substring queries"
    );

    // 11. Delete MediaAsset
    const deleteResult = await deleteMediaAsset(createdAssetId, userA.id);
    assert(deleteResult.success === true, "deleteMediaAsset successfully deletes asset record");

    const afterDelete = await listMediaAssets(userA.id);
    assert(afterDelete.assets.length === 0, "Asset is completely removed after deletion");

  } catch (err) {
    console.error("Unexpected error in Phase 9 test suite:", err);
    assert(false, "Test suite executed without unhandled exceptions", err);
  } finally {
    // Cleanup
    try {
      if (siteA) {
        await db.website.delete({ where: { id: siteA.id } });
      }
      if (userA) {
        await db.user.delete({ where: { id: userA.id } });
      }
      if (userB) {
        await db.user.delete({ where: { id: userB.id } });
      }
    } catch (cleanErr) {
      console.warn("Cleanup warning:", cleanErr);
    }
  }

  console.log("\n=================================================");
  console.log(`PHASE 9 TESTS COMPLETED: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runMilestoneITests();
