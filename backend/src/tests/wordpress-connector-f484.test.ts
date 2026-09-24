import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import {
  createWebsite,
  getWebsiteById,
} from "../services/website.service.js";
import {
  connectWordPress,
  getWordPressStatus,
  verifyWordPressConnection,
  disconnectWordPress,
  publishToWordPress,
  getWebsitePageMappings,
} from "../services/wordpress/connector.service.js";
import {
  verifyWebhookSignature,
  processWordPressWebhook,
} from "../services/wordpress/webhook.service.js";
import { transformPageToWordPress } from "../services/wordpress/transformer.service.js";

const db = prisma as any;

export async function runF484WordPressConnectorTests() {
  console.log("=================================================");
  console.log("RUNNING FEATURE F-484: WORDPRESS CONNECTOR SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` - Detail: ${detail}` : ""}`);
      failed++;
    }
  }

  let ownerUser: any = null;
  let testWebsite: any = null;

  try {
    // 1. Setup Test User and Website
    const uniqueEmail = `wp-f484-${Date.now()}@example.com`;
    ownerUser = await prisma.user.create({
      data: {
        email: uniqueEmail,
        fullName: "WP Connector Test User",
        passwordHash: "hashed_pwd",
      },
    });

    testWebsite = await createWebsite({
      userId: ownerUser.id,
      name: "F-484 Test WordPress Destination Site",
      slug: `wp-f484-${Date.now()}`,
    });

    assert(Boolean(testWebsite?.id), "1. Created test website workspace");

    // 2. Initial Status check - Should be disconnected
    const initialStatus = await getWordPressStatus(testWebsite.id, ownerUser.id);
    assert(initialStatus.isConnected === false, "2. Initial WordPress status is disconnected");
    assert(initialStatus.connection === null, "2. Initial connection object is null");

    // 3. Connect WordPress with API Key
    const testSiteUrl = "https://example-wp-destination.com";
    const testApiKey = "forgestudio_secret_api_key_12345678";
    const expectedApiKeyHash = crypto.createHash("sha256").update(testApiKey).digest("hex");

    const connectionDto = await connectWordPress(
      testWebsite.id,
      ownerUser.id,
      testSiteUrl,
      testApiKey,
      "F484 Remote WP Site"
    );

    assert(connectionDto.status === "CONNECTED", "3. Connection status returned CONNECTED");
    assert(connectionDto.siteUrl === testSiteUrl, "3. Connection siteUrl matches input");
    assert(connectionDto.wpSiteName === "F484 Remote WP Site", "3. Connection site name matches input");
    assert(connectionDto.pluginVersion === "1.0.0", "3. Plugin version is reported as 1.0.0");
    assert(connectionDto.apiVersion === "v1", "3. API version is reported as v1");

    // Check DB security: plain-text key must NOT be stored
    let rawConn: any = null;
    if (db?.wordPressConnection?.findUnique) {
      rawConn = await db.wordPressConnection.findUnique({ where: { websiteId: testWebsite.id } });
    } else {
      const rows: any[] = await prisma.$queryRaw`
        SELECT * FROM wordpress_connections WHERE "websiteId" = ${testWebsite.id}::uuid
      `;
      rawConn = rows[0];
    }
    assert(rawConn.apiKeyHash === expectedApiKeyHash, "3. API Key is stored securely as SHA-256 hash");
    assert(rawConn.apiKey === undefined, "3. Plaintext API key is not present on connection model");

    // 4. Verify Active WordPress Status & Health Check
    const activeStatus = await getWordPressStatus(testWebsite.id, ownerUser.id);
    assert(activeStatus.isConnected === true, "4. Status endpoint returns isConnected = true");
    assert(activeStatus.connection?.siteUrl === testSiteUrl, "4. Status connection DTO contains siteUrl");

    const healthCheck = await verifyWordPressConnection(testWebsite.id, ownerUser.id);
    assert(healthCheck.verification?.healthy === true, "4. Connection health verification returned verified = true");
    assert(healthCheck.verification?.status === "CONNECTED", "4. Health check status is CONNECTED");

    // 5. Publish Canvas Pages to WordPress
    const sampleCanvasSnapshot = {
      siteSettings: { title: "F-484 Site Title" },
      globalStyles: { primaryColor: "#3b82f6" },
      pages: [
        {
          id: "page-home",
          name: "Home Page",
          slug: "home",
          isHome: true,
          elements: [
            {
              id: "elem-1",
              type: "heading",
              props: { text: "Welcome to ForgeStudio WordPress Connector", level: "h1" },
            },
            {
              id: "elem-2",
              type: "text",
              props: { content: "This content was built in ForgeStudio and published to WP." },
            },
          ],
        },
        {
          id: "page-about",
          name: "About Us",
          slug: "about",
          isHome: false,
          elements: [
            {
              id: "elem-3",
              type: "heading",
              props: { text: "About Our SaaS", level: "h2" },
            },
          ],
        },
      ],
    };

    const syncResult = await publishToWordPress(testWebsite.id, ownerUser.id, "deploy-f484", sampleCanvasSnapshot);
    assert(syncResult.success === true, "5. Publishing to WordPress returned success = true");
    assert(syncResult.syncedPagesCount === 2, "5. Synced 2 pages to WordPress destination");
    assert(syncResult.pageMappings.length === 2, "5. Created 2 page mappings");

    const mappings = await getWebsitePageMappings(testWebsite.id);
    assert(mappings.length === 2, "5. Retrieved 2 persistent page mappings from DB");
    assert(mappings[0].forgePageId === "page-home", "5. Mapping 1 maps page-home");
    assert(mappings[1].forgePageId === "page-about", "5. Mapping 2 maps page-about");

    // 6. Test Webhook Security Logic
    const webhookPayloadObj = {
      event: "page_updated" as const,
      timestamp: Math.floor(Date.now() / 1000),
      data: { wpPostId: 1001, forgePageId: "page-home" },
    };
    const webhookBody = JSON.stringify(webhookPayloadObj);
    const validSignature = crypto.createHmac("sha256", expectedApiKeyHash).update(webhookBody).digest("hex");
    const isWebhookValid = verifyWebhookSignature(validSignature, webhookBody, expectedApiKeyHash);
    assert(isWebhookValid === true, "6. HMAC-SHA256 webhook signature verification succeeds for valid payload");

    const isInvalidSigValid = verifyWebhookSignature("invalid_sig", webhookBody, expectedApiKeyHash);
    assert(isInvalidSigValid === false, "6. HMAC-SHA256 webhook signature verification fails for tampered payload");

    const webhookResult = await processWordPressWebhook(testWebsite.id, validSignature, webhookBody, webhookPayloadObj);
    assert(webhookResult.success === true, "6. Webhook payload processed successfully");

    // 7. Safely Disconnect WordPress Integration
    const disconnectRes = await disconnectWordPress(testWebsite.id, ownerUser.id);
    assert(disconnectRes.success === true, "7. Disconnected WordPress integration safely");

    const postDisconnectStatus = await getWordPressStatus(testWebsite.id, ownerUser.id);
    assert(postDisconnectStatus.isConnected === false, "7. Post-disconnect status is false");

    // Invariant: Verify ForgeStudio website data is preserved
    const websiteAfterDisconnect = await getWebsiteById(testWebsite.id, ownerUser.id);
    assert(Boolean(websiteAfterDisconnect?.id), "7. Invariant: Website workspace preserved after disconnection");

  } catch (err: any) {
    console.error("Test execution threw error:", err);
    failed++;
  } finally {
    // Cleanup
    if (testWebsite?.id) {
      await prisma.$executeRawUnsafe(`DELETE FROM wordpress_page_mappings WHERE "websiteId" = $1::uuid`, testWebsite.id).catch(() => {});
      await prisma.$executeRawUnsafe(`DELETE FROM wordpress_connections WHERE "websiteId" = $1::uuid`, testWebsite.id).catch(() => {});
      await prisma.$executeRawUnsafe(`DELETE FROM websites WHERE id = $1::uuid`, testWebsite.id).catch(() => {});
    }
    if (ownerUser?.id) {
      await prisma.$executeRawUnsafe(`DELETE FROM users WHERE id = $1::uuid`, ownerUser.id).catch(() => {});
    }
  }

  console.log("\n=================================================");
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

// Run test if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes("wordpress-connector-f484.test.ts")) {
  runF484WordPressConnectorTests()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
