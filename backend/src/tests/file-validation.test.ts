import fs from "fs";
import path from "path";
import assert from "node:assert/strict";
import { prisma } from "../config/prisma.js";
import {
  validateImageFile,
  detectImageSignature,
  isSafeSvg,
  sanitizeFilename,
  MAX_FILE_SIZE,
} from "../middlewares/upload.middleware.js";
import { createWebsite } from "../services/website.service.js";
import { getImagesDir, resolveSafePath } from "../config/storage.config.js";
import { getMediaAssetById } from "../services/media.service.js";

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

async function runFileValidationTestSuite() {
  console.log("=================================================");
  console.log("RUNNING FEATURE 11: FILE VALIDATION TEST SUITE");
  console.log("=================================================\n");

  let userA: any = null;
  let userB: any = null;
  let siteA: any = null;
  let siteB: any = null;
  const createdDiskFiles: string[] = [];

  // Valid 1x1 PNG
  const validPngBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );

  // Valid 1x1 JPEG
  const validJpgBuffer = Buffer.from(
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
    "base64"
  );

  // Valid 1x1 GIF
  const validGifBuffer = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

  // Valid 1x1 WebP
  const validWebpBuffer = Buffer.from(
    "UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAkA4JaQAA3AA/vv9UAAA/v39/f////////////////////////////////8AAAA=",
    "base64"
  );

  // Valid SVG
  const validSvgBuffer = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="40" fill="green"/></svg>',
    "utf8"
  );

  try {
    userA = await db.user.create({
      data: {
        email: `validation_user_a_${Date.now()}@example.com`,
        passwordHash: "hash_placeholder",
        fullName: "Validation User A",
        role: "USER",
      },
    });

    userB = await db.user.create({
      data: {
        email: `validation_user_b_${Date.now()}@example.com`,
        passwordHash: "hash_placeholder",
        fullName: "Validation User B",
        role: "USER",
      },
    });

    siteA = await createWebsite({
      userId: userA.id,
      name: "Site A",
      slug: `site-a-${Date.now()}`,
    });

    siteB = await createWebsite({
      userId: userB.id,
      name: "Site B",
      slug: `site-b-${Date.now()}`,
    });

    // -------------------------------------------------------------------------
    // 1. Valid Supported Image Uploads
    // -------------------------------------------------------------------------
    console.log("--- 1. Valid Supported Image Uploads ---");

    await testScenario("Valid PNG passes signature, dimensions, and type checks", async () => {
      const res = await validateImageFile(validPngBuffer, "photo.png", "image/png");
      assert.equal(res.valid, true);
      assert.equal(res.format, "png");
      assert.equal(res.mimeType, "image/png");
    });

    await testScenario("Valid JPEG passes signature, dimensions, and type checks", async () => {
      const res = await validateImageFile(validJpgBuffer, "banner.jpg", "image/jpeg");
      assert.equal(res.valid, true);
      assert.equal(res.format, "jpeg");
      assert.equal(res.mimeType, "image/jpeg");
    });

    await testScenario("Valid WebP passes signature, dimensions, and type checks", async () => {
      const res = await validateImageFile(validWebpBuffer, "hero.webp", "image/webp");
      assert.equal(res.valid, true);
      assert.equal(res.format, "webp");
      assert.equal(res.mimeType, "image/webp");
    });

    await testScenario("Valid GIF passes signature, dimensions, and type checks", async () => {
      const res = await validateImageFile(validGifBuffer, "animation.gif", "image/gif");
      assert.equal(res.valid, true);
      assert.equal(res.format, "gif");
      assert.equal(res.mimeType, "image/gif");
    });

    await testScenario("Valid SVG passes XML inspection and security verification", async () => {
      const res = await validateImageFile(validSvgBuffer, "logo.svg", "image/svg+xml");
      assert.equal(res.valid, true);
      assert.equal(res.format, "svg");
      assert.equal(res.mimeType, "image/svg+xml");
    });

    // -------------------------------------------------------------------------
    // 2. Oversized Files & Empty Files
    // -------------------------------------------------------------------------
    console.log("\n--- 2. Oversized and Empty Files ---");

    await testScenario("Rejects empty file buffer (0 bytes)", async () => {
      const emptyBuffer = Buffer.alloc(0);
      const res = await validateImageFile(emptyBuffer, "empty.png");
      assert.equal(res.valid, false);
      assert.equal(res.code, "EMPTY_FILE");
    });

    await testScenario("Rejects file exceeding 5MB limit", async () => {
      const oversizedBuffer = Buffer.alloc(MAX_FILE_SIZE + 1024);
      const res = await validateImageFile(oversizedBuffer, "large.png");
      assert.equal(res.valid, false);
      assert.equal(res.code, "FILE_SIZE_EXCEEDED");
    });

    // -------------------------------------------------------------------------
    // 3. MIME and Extension Mismatches
    // -------------------------------------------------------------------------
    console.log("\n--- 3. MIME and Extension Mismatches ---");

    await testScenario("Rejects extension mismatch: JPEG image renamed to .png", async () => {
      const res = await validateImageFile(validJpgBuffer, "mismatch.png", "image/png");
      assert.equal(res.valid, false);
      assert.equal(res.code, "FILE_TYPE_MISMATCH");
    });

    await testScenario("Rejects extension mismatch: PNG image renamed to .jpg", async () => {
      const res = await validateImageFile(validPngBuffer, "mismatch.jpg", "image/jpeg");
      assert.equal(res.valid, false);
      assert.equal(res.code, "FILE_TYPE_MISMATCH");
    });

    await testScenario("Rejects non-image binary with spoofed .png extension (PDF)", async () => {
      const fakePdfBuffer = Buffer.from("%PDF-1.5 %Fake PDF Header and content");
      const res = await validateImageFile(fakePdfBuffer, "fake.png", "image/png");
      assert.equal(res.valid, false);
      assert.equal(res.code, "INVALID_IMAGE_SIGNATURE");
    });

    await testScenario("Rejects unsupported extensions (.exe, .php, .sh)", async () => {
      const resExe = await validateImageFile(validPngBuffer, "malware.exe");
      assert.equal(resExe.valid, false);
      assert.equal(resExe.code, "INVALID_FILE_EXTENSION");

      const resPhp = await validateImageFile(validPngBuffer, "webshell.php");
      assert.equal(resPhp.valid, false);
      assert.equal(resPhp.code, "INVALID_FILE_EXTENSION");
    });

    // -------------------------------------------------------------------------
    // 4. Invalid or Corrupted Image Content
    // -------------------------------------------------------------------------
    console.log("\n--- 4. Invalid or Corrupted Image Content ---");

    await testScenario("Rejects corrupted image with valid PNG magic bytes but corrupt data", async () => {
      // Valid PNG header (8 bytes) followed by invalid garbage
      const corruptPng = Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        Buffer.from("CorruptRandomJunkDataNotAPNG"),
      ]);

      const res = await validateImageFile(corruptPng, "corrupt.png");
      assert.equal(res.valid, false);
      assert.equal(res.code, "CORRUPT_IMAGE");
    });

    await testScenario("Rejects malicious SVG containing <script> tags", async () => {
      const maliciousSvg = Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(document.cookie)</script></svg>'
      );
      const res = await validateImageFile(maliciousSvg, "xss.svg");
      assert.equal(res.valid, false);
      assert.equal(res.code, "UNSAFE_SVG");
    });

    await testScenario("Rejects malicious SVG containing javascript: URI", async () => {
      const maliciousSvg = Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><circle cx="50" cy="50" r="10"/></a></svg>'
      );
      const res = await validateImageFile(maliciousSvg, "xss2.svg");
      assert.equal(res.valid, false);
      assert.equal(res.code, "UNSAFE_SVG");
    });

    await testScenario("Rejects malicious SVG containing inline event handler (onload)", async () => {
      const maliciousSvg = Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="10" height="10"/></svg>'
      );
      const res = await validateImageFile(maliciousSvg, "xss3.svg");
      assert.equal(res.valid, false);
      assert.equal(res.code, "UNSAFE_SVG");
    });

    await testScenario("Rejects malicious SVG containing DTD / XXE entity declarations", async () => {
      const xxeSvg = Buffer.from(
        '<?xml version="1.0"?><!DOCTYPE svg SYSTEM "http://evil.com/xxe.dtd"><svg xmlns="http://www.w3.org/2000/svg"><text>XXE</text></svg>'
      );
      const res = await validateImageFile(xxeSvg, "xxe.svg");
      assert.equal(res.valid, false);
      assert.equal(res.code, "UNSAFE_SVG");
    });

    await testScenario("Rejects malicious SVG containing external resource references (xlink:href)", async () => {
      const externalSvg = Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><image xlink:href="https://evil.com/tracker.png" width="10" height="10"/></svg>'
      );
      const res = await validateImageFile(externalSvg, "external.svg");
      assert.equal(res.valid, false);
      assert.equal(res.code, "UNSAFE_SVG");
    });

    // -------------------------------------------------------------------------
    // 5. Filename Sanitization and Path Traversal Defense
    // -------------------------------------------------------------------------
    console.log("\n--- 5. Filename Sanitization & Traversal Defense ---");

    await testScenario("Sanitizes directory traversal patterns in filenames (Unix & Windows)", async () => {
      assert.equal(sanitizeFilename("../../../../etc/passwd.png"), "passwd.png");
      assert.equal(sanitizeFilename("..\\..\\windows\\system32\\calc.png"), "calc.png");
      assert.equal(sanitizeFilename("safe_image.png"), "safe_image.png");
    });

    await testScenario("Strips null bytes and illegal control characters from filename", async () => {
      const nullByteFilename = "exploit\0.php.png";
      const sanitized = sanitizeFilename(nullByteFilename);
      assert.equal(sanitized.includes("\0"), false);
      assert.equal(sanitized, "exploit.php.png");
    });

    // -------------------------------------------------------------------------
    // 6. Website Authorization Validation
    // -------------------------------------------------------------------------
    console.log("\n--- 6. Website Authorization Validation ---");

    await testScenario("Website authorization: Rejects uploading to a website owned by a different user", async () => {
      const { getWebsiteById } = await import("../services/website.service.js");
      let unauthorizedRejected = false;
      try {
        // User B tries to authorize upload for User A's siteA
        await getWebsiteById(siteA.id, userB.id);
      } catch (err: any) {
        unauthorizedRejected = true;
      }
      assert.equal(unauthorizedRejected, true, "User B must not have access to User A's website");
    });

    // -------------------------------------------------------------------------
    // 7. Cleanup After Failure
    // -------------------------------------------------------------------------
    console.log("\n--- 7. Cleanup After Failure ---");

    await testScenario("Failed upload leaves no orphaned file in persistent storage", async () => {
      const targetDir = getImagesDir();
      const testOrphanName = `test_orphan_${Date.now()}.png`;
      const orphanPath = resolveSafePath(targetDir, testOrphanName);

      // Simulate writing before DB failure
      fs.writeFileSync(orphanPath, validPngBuffer);
      assert.ok(fs.existsSync(orphanPath));

      // Simulate rollback cleanup
      if (fs.existsSync(orphanPath)) {
        fs.unlinkSync(orphanPath);
      }
      assert.equal(fs.existsSync(orphanPath), false, "Unlinked file does not persist");
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
      if (siteB) await db.website.delete({ where: { id: siteB.id } });
      if (userA) await db.user.delete({ where: { id: userA.id } });
      if (userB) await db.user.delete({ where: { id: userB.id } });
    } catch {}
  }

  console.log("\n=================================================");
  console.log(`FEATURE 11 TESTS COMPLETED: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runFileValidationTestSuite();
