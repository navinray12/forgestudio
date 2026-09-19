import fs from "fs";
import path from "path";
import { prisma } from "../config/prisma.js";
import {
  connectWordPress,
  getWordPressStatus,
  verifyWordPressConnection,
  syncWordPressPages,
  getWebsitePageMappings,
  generateWordPressPluginZip,
} from "../services/wordpress/connector.service.js";
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

async function runMilestoneJTests() {
  console.log("=================================================");
  console.log("RUNNING FORGESTUDIO MILESTONE J VERIFICATION SUITE");
  console.log("WordPress Plugin & REST Engine (Phase 10)");
  console.log("=================================================\n");

  let testUser: any = null;
  let testWebsite: any = null;

  try {
    // 0. Setup test user & website
    testUser = await db.user.create({
      data: {
        email: `wp_tester_${Date.now()}@example.com`,
        passwordHash: "hash_placeholder",
        fullName: "WordPress Tester",
        role: "USER",
      },
    });

    testWebsite = await createWebsite({
      name: "WordPress Target Site",
      slug: `wp-target-${Date.now()}`,
      userId: testUser.id,
    });

    // 1. Verify WordPress Plugin file structure
    let pluginDir = path.resolve(process.cwd(), "..", "wordpress-plugin");
    if (!fs.existsSync(pluginDir)) {
      pluginDir = path.resolve(process.cwd(), "wordpress-plugin");
    }

    const mainPhpPath = path.join(pluginDir, "forgestudio-connector.php");
    const readmePath = path.join(pluginDir, "readme.txt");

    assert(fs.existsSync(mainPhpPath), "forgestudio-connector.php exists on disk");
    assert(fs.existsSync(readmePath), "readme.txt exists on disk");

    const phpContent = fs.readFileSync(mainPhpPath, "utf8");
    assert(
      phpContent.includes("Plugin Name: ForgeStudio Connector") &&
      phpContent.includes("class ForgeStudio_Connector") &&
      phpContent.includes("register_rest_route"),
      "forgestudio-connector.php contains valid WordPress plugin headers and REST routes"
    );

    // 2. Test Dynamic Plugin ZIP Generation
    const zipBuffer = await generateWordPressPluginZip();
    assert(
      Buffer.isBuffer(zipBuffer) && zipBuffer.length > 500,
      `generateWordPressPluginZip creates valid binary ZIP bundle (${zipBuffer.length} bytes)`,
      { length: zipBuffer.length }
    );

    // Verify ZIP header magic number: PK\x03\x04
    assert(
      zipBuffer[0] === 0x50 && zipBuffer[1] === 0x4b && zipBuffer[2] === 0x03 && zipBuffer[3] === 0x04,
      "Generated plugin ZIP matches standard PK zip signature"
    );

    // 3. Anti-SSRF Validation on WordPress connection
    let loopbackBlocked = false;
    try {
      await connectWordPress(testWebsite.id, testUser.id, "http://127.0.0.1:8080", "valid_api_key_12345");
    } catch (err: any) {
      if (err.code === "SSRF_VALIDATION_FAILED") {
        loopbackBlocked = true;
      }
    }
    assert(loopbackBlocked === true, "connectWordPress rejects loopback 127.0.0.1 with SSRF_VALIDATION_FAILED");

    let metadataBlocked = false;
    try {
      await connectWordPress(testWebsite.id, testUser.id, "http://169.254.169.254/latest", "valid_api_key_12345");
    } catch (err: any) {
      if (err.code === "SSRF_VALIDATION_FAILED") {
        metadataBlocked = true;
      }
    }
    assert(metadataBlocked === true, "connectWordPress rejects AWS/cloud metadata address 169.254.169.254");

    // 4. Valid Public Connection
    const connection = await connectWordPress(
      testWebsite.id,
      testUser.id,
      "https://sample-corporate-wp.com",
      "super_secret_forgestudio_key_9999",
      "Corporate WP Portal"
    );
    assert(
      connection.status === "CONNECTED" &&
      connection.siteUrl === "https://sample-corporate-wp.com" &&
      connection.wpSiteName === "Corporate WP Portal",
      "connectWordPress accepts valid public HTTPS destination"
    );

    // 5. Connection Status & Verification Handshake
    const status = await getWordPressStatus(testWebsite.id, testUser.id);
    assert(
      status.isConnected === true && status.connection?.siteUrl === "https://sample-corporate-wp.com",
      "getWordPressStatus reflects active connection"
    );

    const verification = await verifyWordPressConnection(testWebsite.id, testUser.id);
    assert(verification.verified === true, "verifyWordPressConnection validates status without error");

    // 6. Synchronize Pages with live REST dispatch & fallback handling
    const syncResult = await syncWordPressPages(testWebsite.id, testUser.id);
    assert(
      syncResult.success === true &&
      syncResult.syncedPagesCount > 0 &&
      syncResult.pageMappings.length > 0,
      "syncWordPressPages synchronizes pages and generates durable mappings",
      syncResult
    );

    // 7. Verify page mappings stored in PostgreSQL
    const mappings = await getWebsitePageMappings(testWebsite.id);
    assert(
      mappings.length > 0 &&
      mappings[0].wpPostId > 0 &&
      mappings[0].wpPostUrl.startsWith("https://sample-corporate-wp.com"),
      "getWebsitePageMappings returns durable post mappings from PostgreSQL"
    );

  } catch (err) {
    console.error("Unexpected error in Phase 10 test suite:", err);
    assert(false, "Test suite executed without unhandled exceptions", err);
  } finally {
    // Cleanup
    try {
      if (testWebsite) {
        await db.$executeRawUnsafe(`DELETE FROM wordpress_page_mappings WHERE "websiteId" = $1::uuid`, testWebsite.id);
        await db.$executeRawUnsafe(`DELETE FROM wordpress_connections WHERE "websiteId" = $1::uuid`, testWebsite.id);
        await db.website.delete({ where: { id: testWebsite.id } });
      }
      if (testUser) {
        await db.user.delete({ where: { id: testUser.id } });
      }
    } catch (cleanErr) {
      console.warn("Cleanup warning:", cleanErr);
    }
  }

  console.log("\n=================================================");
  console.log(`PHASE 10 TESTS COMPLETED: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runMilestoneJTests();
