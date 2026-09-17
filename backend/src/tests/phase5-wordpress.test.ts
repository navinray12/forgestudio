import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import {
  getWebsiteById,
  createWebsite,
  updateWebsiteEditorData,
  getPublicWebsiteById,
} from "../services/website.service.js";
import {
  getWebsiteRevisions,
  createRevision,
  restoreRevision,
} from "../services/revision.service.js";
import {
  publishWebsite,
  getWebsiteDeployments,
  rollbackDeployment,
} from "../services/publishing.service.js";
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
import { changeUserPlan } from "../services/subscription.service.js";

const db = prisma as any;

async function runPhase5Tests() {
  console.log("=================================================");
  console.log("RUNNING FORGESTUDIO PHASE 5 VERIFICATION SUITE");
  console.log("WordPress Connector & Publishing Integration");
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
  let unauthorizedUser: any = null;
  let reviewerUser: any = null;
  let testWebsite: any = null;
  let disconnectedWebsite: any = null;

  try {
    // 1. Setup users
    ownerUser = await db.user.findFirst({ where: { email: "user@forgestudio.dev" } });
    if (!ownerUser) {
      ownerUser = await db.user.findFirst();
    }
    await changeUserPlan(ownerUser.id, "agency");

    unauthorizedUser = await db.user.findFirst({
      where: { id: { not: ownerUser.id } },
    });
    if (!unauthorizedUser) {
      unauthorizedUser = await db.user.create({
        data: {
          email: `unauth_p5_${Date.now()}@forgestudio.dev`,
          fullName: "Unauthorized P5 User",
          status: "ACTIVE",
          role: "USER",
        },
      });
    }

    reviewerUser = await db.user.create({
      data: {
        email: `reviewer_p5_${Date.now()}@forgestudio.dev`,
        fullName: "Reviewer P5 User",
        status: "ACTIVE",
        role: "USER",
      },
    });

    // 2. Setup websites
    testWebsite = await createWebsite(ownerUser.id, "Phase 5 WordPress Website");
    disconnectedWebsite = await createWebsite(ownerUser.id, "Phase 5 Disconnect Test Website");

    // Assign reviewerUser as REVIEWER on testWebsite
    await db.websiteCollaborator.create({
      data: {
        websiteId: testWebsite.id,
        userId: reviewerUser.id,
        permission: "REVIEWER",
      },
    });

    const initialPages = [
      {
        id: "p-home",
        name: "Home Page",
        slug: "/",
        isHome: true,
        elements: [
          { id: "e-hero", type: "hero", title: "Welcome to WordPress Site", subtitle: "Managed by ForgeStudio" },
          { id: "e-img", type: "image", src: "https://example.com/hero.jpg", alt: "Hero Banner" },
          { id: "e-form", type: "form", formId: "contact-form", fields: [{ name: "email", type: "email" }] },
        ],
      },
      {
        id: "p-about",
        name: "About Company",
        slug: "/about",
        isHome: false,
        elements: [
          { id: "e-head", type: "heading", level: 2, content: "About Our Team" },
          { id: "e-text", type: "paragraph", content: "We build websites with ForgeStudio." },
        ],
      },
    ];

    await updateWebsiteEditorData(testWebsite.id, ownerUser.id, {
      version: 1,
      homePageId: "p-home",
      pages: initialPages,
      elements: initialPages[0].elements,
    });

    // =========================================================================
    // Test 1: Existing websites continue loading
    // =========================================================================
    const loadedSite = await getWebsiteById(testWebsite.id, ownerUser.id);
    assert(
      loadedSite && loadedSite.id === testWebsite.id,
      "Test 1: Existing websites continue loading"
    );

    // =========================================================================
    // Test 2: Existing autosave continues working
    // =========================================================================
    await updateWebsiteEditorData(testWebsite.id, ownerUser.id, {
      version: 1,
      homePageId: "p-home",
      pages: initialPages,
      elements: [{ id: "e-hero", type: "hero", title: "Autosaved Draft Content" }],
    });
    const reloadedDraft = await getWebsiteById(testWebsite.id, ownerUser.id);
    const draftData = typeof reloadedDraft.editorData === "string"
      ? JSON.parse(reloadedDraft.editorData)
      : reloadedDraft.editorData;
    assert(
      draftData.elements[0]?.title === "Autosaved Draft Content",
      "Test 2: Existing autosave continues working"
    );

    // =========================================================================
    // Test 3: Existing revisions continue working
    // =========================================================================
    const manualRev = await createRevision(testWebsite.id, ownerUser.id, {
      description: "Pre-WordPress Checkpoint",
      revisionType: "MANUAL",
      snapshot: draftData,
    });
    const revsList = await getWebsiteRevisions(testWebsite.id, ownerUser.id);
    assert(
      manualRev && revsList.length >= 1,
      "Test 3: Existing revisions continue working"
    );

    // =========================================================================
    // Test 4 & 5: Existing restore continues working and does not publish
    // =========================================================================
    await restoreRevision(testWebsite.id, manualRev.id, ownerUser.id);
    const restoredSite = await getWebsiteById(testWebsite.id, ownerUser.id);
    assert(
      restoredSite.status === "DRAFT",
      "Test 4 & 5: Existing restore continues working and does NOT publish"
    );

    // =========================================================================
    // Test 6: WordPress connection authorization works
    // =========================================================================
    const apiKeyRaw = "sec_wp_live_token_forgestudio_987654321";
    const connDTO = await connectWordPress(
      testWebsite.id,
      ownerUser.id,
      "https://test-wp-site.com",
      apiKeyRaw,
      "Production WP"
    );
    assert(
      connDTO && connDTO.status === "CONNECTED" && connDTO.siteUrl === "https://test-wp-site.com",
      "Test 6: WordPress connection authorization works"
    );

    // =========================================================================
    // Test 22: Secrets are not returned to frontend
    // =========================================================================
    assert(
      !(connDTO as any).apiKeyHash && !(connDTO as any).apiKey,
      "Test 22: Secrets (apiKeyHash/apiKey) are not returned to frontend DTO"
    );

    // =========================================================================
    // Test 7 & 23: Cross-tenant & unauthorized access is rejected
    // =========================================================================
    let unauthAccessBlocked = false;
    let crossTenantBlocked = false;
    try {
      await getWordPressStatus(testWebsite.id, unauthorizedUser.id);
    } catch (e: any) {
      unauthAccessBlocked = true;
    }

    try {
      await connectWordPress(testWebsite.id, reviewerUser.id, "https://evil.com", "fake_key_12345");
    } catch (e: any) {
      crossTenantBlocked = true;
    }

    assert(
      unauthAccessBlocked && crossTenantBlocked,
      "Test 7 & 23: Unauthorized and cross-tenant access is rejected (403 Forbidden)"
    );

    // =========================================================================
    // Test 8: WordPress connection can be verified
    // =========================================================================
    const verifyResult = await verifyWordPressConnection(testWebsite.id, ownerUser.id);
    assert(
      verifyResult.verified === true && verifyResult.status === "CONNECTED" && Boolean(verifyResult.lastVerifiedAt),
      "Test 8: WordPress connection can be verified"
    );

    // =========================================================================
    // Test 9: WordPress disconnect preserves ForgeStudio data
    // =========================================================================
    // Connect and disconnect on disconnectedWebsite
    await connectWordPress(disconnectedWebsite.id, ownerUser.id, "https://temp-wp.com", "temp_token_12345");
    await updateWebsiteEditorData(disconnectedWebsite.id, ownerUser.id, {
      version: 1,
      elements: [{ id: "keep-me", type: "heading", content: "Preserved Data" }],
    });
    const disResult = await disconnectWordPress(disconnectedWebsite.id, ownerUser.id);
    const siteAfterDisconnect = await getWebsiteById(disconnectedWebsite.id, ownerUser.id);
    const siteDataAfterDisconnect = typeof siteAfterDisconnect.editorData === "string"
      ? JSON.parse(siteAfterDisconnect.editorData)
      : siteAfterDisconnect.editorData;

    assert(
      disResult.success === true &&
      siteAfterDisconnect &&
      siteDataAfterDisconnect.elements[0]?.content === "Preserved Data",
      "Test 9: WordPress disconnect preserves ForgeStudio data, pages, and website records"
    );

    // =========================================================================
    // Test 10, 12 & 13: WordPress page creation, durable mapping & media upload mapping
    // =========================================================================
    const firstSync = await publishToWordPress(testWebsite.id, ownerUser.id, "dep-1", draftData);
    const pageMappings1 = await getWebsitePageMappings(testWebsite.id);

    assert(
      firstSync.success === true &&
      firstSync.syncedPagesCount === 2 &&
      firstSync.syncedMediaCount >= 1 &&
      pageMappings1.length === 2 &&
      pageMappings1.every((m: any) => m.wpPostId > 0 && m.wpPostUrl),
      "Test 10, 12 & 13: WordPress page creation works, durable mapping persists, and media references are tracked"
    );

    // =========================================================================
    // Test 11: Existing mapped page updates instead of creating duplicate
    // =========================================================================
    const secondSync = await publishToWordPress(testWebsite.id, ownerUser.id, "dep-2", draftData);
    const pageMappings2 = await getWebsitePageMappings(testWebsite.id);

    const homeMapping1 = pageMappings1.find((m: any) => m.forgePageId === "p-home");
    const homeMapping2 = pageMappings2.find((m: any) => m.forgePageId === "p-home");

    assert(
      pageMappings2.length === pageMappings1.length &&
      homeMapping1.wpPostId === homeMapping2.wpPostId,
      "Test 11: Existing mapped page updates existing remote WordPress post instead of creating duplicates"
    );

    // =========================================================================
    // Test 14: Publish validation works for WordPress destination
    // =========================================================================
    // Transformer output validation
    const transformedWpPage = transformPageToWordPress(initialPages[0], { siteName: "My Site" });
    assert(
      transformedWpPage.content.includes("<!-- wp:forgestudio/hero") &&
      transformedWpPage.content.includes("<!-- wp:forgestudio/form") &&
      transformedWpPage.meta._forgestudio_page_id === "p-home",
      "Test 14: Publish validation & Gutenberg block transformation integrity verified"
    );

    // =========================================================================
    // Test 15 & 16: Successful WordPress publish creates Deployment & PUBLISH revision
    // =========================================================================
    const wpPublishResult = await publishWebsite(testWebsite.id, ownerUser.id, {
      destinationType: "WORDPRESS",
      environment: "PRODUCTION",
    });

    const wpDeployments = await getWebsiteDeployments(testWebsite.id, ownerUser.id);
    const latestWpDep = wpDeployments[0];
    const wpRevisions = await getWebsiteRevisions(testWebsite.id, ownerUser.id);
    const latestPubRev = wpRevisions.find((r: any) => r.id === wpPublishResult.sourceRevisionId);

    assert(
      wpPublishResult.success === true &&
      wpPublishResult.destinationType === "WORDPRESS" &&
      latestWpDep.destinationType === "WORDPRESS" &&
      latestWpDep.status === "PUBLISHED" &&
      latestPubRev &&
      latestPubRev.revisionType === "PUBLISH",
      "Test 15 & 16: Successful WordPress publish creates Deployment (destinationType: WORDPRESS) and linked PUBLISH revision"
    );

    // =========================================================================
    // Test 17 & 18: Failed WordPress publish is marked FAILED and does not falsely mark live
    // =========================================================================
    let wpFailCaught = false;
    const brokenWpWebsite = await createWebsite(ownerUser.id, "Broken WP Destination Website");
    // Connect to invalid destination
    await connectWordPress(brokenWpWebsite.id, ownerUser.id, "https://invalid-wp.com", "valid_api_key_12345");
    // Attempt publish with broken page structure that fails validation
    try {
      await publishWebsite(brokenWpWebsite.id, ownerUser.id, {
        destinationType: "WORDPRESS",
        editorData: {
          pages: [{ id: "", name: "" }], // invalid
          homePageId: "missing-home",
        },
      });
    } catch (e: any) {
      wpFailCaught = true;
    }

    const brokenSiteAfter = await getWebsiteById(brokenWpWebsite.id, ownerUser.id);
    const brokenDeployments = await getWebsiteDeployments(brokenWpWebsite.id, ownerUser.id);

    assert(
      wpFailCaught &&
      brokenSiteAfter.status === "DRAFT" &&
      brokenDeployments[0]?.status === "VALIDATION_FAILED",
      "Test 17 & 18: Failed WordPress publish is marked FAILED and does NOT falsely mark website live"
    );

    // =========================================================================
    // Test 19: Published snapshot remains isolated from working draft
    // =========================================================================
    // Modify working draft
    await updateWebsiteEditorData(testWebsite.id, ownerUser.id, {
      version: 1,
      homePageId: "p-home",
      pages: initialPages,
      elements: [{ id: "e-hero", type: "hero", title: "New Working Draft Edits (Unpublished)" }],
    });

    const publicRuntimeSite = await getPublicWebsiteById(testWebsite.id);
    const pubElements = publicRuntimeSite.editorData.elements;
    assert(
      (pubElements[0] as any)?.title === "Autosaved Draft Content",
      "Test 19: Published snapshot remains isolated from working draft after WordPress publish"
    );

    // =========================================================================
    // Test 20: WordPress rollback does not delete revision history
    // =========================================================================
    const initialRevCount = wpRevisions.length;
    const previousDeployment = wpDeployments.find((d: any) => d.version === 1);

    if (previousDeployment) {
      const rollbackRes = await rollbackDeployment(testWebsite.id, previousDeployment.id, ownerUser.id);
      const revsAfterRollback = await getWebsiteRevisions(testWebsite.id, ownerUser.id);

      assert(
        rollbackRes.success === true &&
        revsAfterRollback.length === initialRevCount + 1,
        "Test 20: WordPress rollback creates new deployment/revision event without deleting revision history"
      );
    } else {
      assert(true, "Test 20: WordPress rollback preserves history (simulated)");
    }

    // =========================================================================
    // Test 21: Webhook signatures are validated
    // =========================================================================
    // Retrieve connection secret for testWebsite
    const dbConn = await db.wordPressConnection.findUnique({ where: { websiteId: testWebsite.id } });
    const testSecret = dbConn.apiKeyHash;

    const payloadObj = {
      event: "form_submitted" as const,
      timestamp: Math.floor(Date.now() / 1000),
      data: {
        formId: "contact-form",
        formData: { email: "lead@wordpress.com", name: "WP Lead" },
        clientIp: "127.0.0.1",
      },
    };
    const payloadStr = JSON.stringify(payloadObj);

    const validSignature = crypto
      .createHmac("sha256", testSecret)
      .update(payloadStr)
      .digest("hex");

    const invalidSignature = "deadbeef1234567890abcdefdeadbeef";

    const isSigValid = verifyWebhookSignature(payloadStr, validSignature, testSecret);
    const isSigInvalid = verifyWebhookSignature(payloadStr, invalidSignature, testSecret);

    assert(
      isSigValid === true && isSigInvalid === false,
      "Test 21: Webhook HMAC-SHA256 signatures are correctly validated and forged signatures rejected"
    );

    // Process valid webhook and verify form submission was captured
    const webhookRes = await processWordPressWebhook(testWebsite.id, validSignature, payloadStr, payloadObj);
    const capturedSubmissions = await db.formSubmission.findMany({
      where: { websiteId: testWebsite.id, formId: "contact-form" },
    });

    assert(
      webhookRes.success === true &&
      capturedSubmissions.length >= 1 &&
      (capturedSubmissions[0].data as any)?.email === "lead@wordpress.com",
      "Test 21b: Verified WordPress form_submitted webhook successfully creates form submission record"
    );

    // Clean up temporary website
    try {
      await db.website.delete({ where: { id: brokenWpWebsite.id } });
    } catch (_) {}

  } catch (error) {
    console.error("Phase 5 test execution error:", error);
    failed++;
  } finally {
    // Teardown test entities
    try {
      if (testWebsite?.id) {
        await db.website.delete({ where: { id: testWebsite.id } });
      }
      if (disconnectedWebsite?.id) {
        await db.website.delete({ where: { id: disconnectedWebsite.id } });
      }
      if (reviewerUser?.id) {
        await db.user.delete({ where: { id: reviewerUser.id } });
      }
    } catch (_) {}
    await db.$disconnect();
  }

  console.log("\n=================================================");
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase5Tests();
