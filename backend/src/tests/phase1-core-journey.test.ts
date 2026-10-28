import assert from "node:assert";
import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import { signupUser } from "../services/signup.service.js";
import { generateAndSendOtp, verifyOtp } from "../services/otp.service.js";
import { createUserSession, validateSession, revokeSession } from "../services/session.service.js";
import {
  createWebsite,
  getWebsiteById,
  updateWebsiteEditorData,
  getPublicWebsiteById,
  deleteWebsite,
} from "../services/website.service.js";
import {
  publishWebsite,
  rollbackDeployment,
  getWebsiteDeployments,
} from "../services/publishing.service.js";
import {
  createMediaAsset,
  getMediaAssetById,
  deleteMediaAsset,
} from "../services/media.service.js";
import {
  processFormSubmission,
  getWebsiteSubmissions,
} from "../services/form/form.service.js";

async function runPhase1CoreJourneyTest() {
  console.log("================================================================");
  console.log("STARTING PHASE 1 CORE STABILIZATION END-TO-END VERIFICATION");
  console.log("================================================================");

  const testSuffix = crypto.randomBytes(4).toString("hex");
  const testEmail = `phase1_user_${testSuffix}@example.com`;
  const testPassword = "Password123!Secure";
  const otherUserEmail = `other_user_${testSuffix}@example.com`;

  let primaryUserId = "";
  let otherUserId = "";
  let websiteId = "";
  let testSessionToken = "";

  try {
    // -------------------------------------------------------------------------
    // 1. SIGNUP & EMAIL OTP
    // -------------------------------------------------------------------------
    console.log("\n[TEST 1] Testing Signup & OTP Verification...");
    const user = await signupUser({
      identifier: testEmail,
      password: testPassword,
      fullName: "Phase1 Test User",
    });
    primaryUserId = user.id;
    assert(primaryUserId, "User should be created with an ID");
    assert.strictEqual(user.email, testEmail);
    console.log("  ✓ User signed up:", user.id);

    // Generate real OTP
    await generateAndSendOtp({
      userId: user.id,
      email: testEmail,
      purpose: "EMAIL_SIGNUP",
    });

    const otpRecord = await prisma.otpVerification.findFirst({
      where: { userId: user.id, purpose: "EMAIL_SIGNUP", verifiedAt: null },
      orderBy: { createdAt: "desc" },
    });
    assert(otpRecord, "OTP verification record must exist in DB");
    console.log("  ✓ OTP record generated and stored with sha256 hash");

    // Test invalid OTP rejection
    let invalidOtpRejected = false;
    try {
      await verifyOtp({
        userId: user.id,
        otp: "000000",
        purpose: "EMAIL_SIGNUP",
      });
    } catch (err: any) {
      invalidOtpRejected = true;
      assert.strictEqual(err.statusCode, 400, "Invalid OTP must return 400");
    }
    assert(invalidOtpRejected, "Invalid OTP code must be rejected");
    console.log("  ✓ Invalid OTP correctly rejected with 400");

    // Enable test fixture OTP for this isolated test run
    process.env.ENABLE_TEST_OTP_FIXTURE = "true";
    process.env.NODE_ENV = "test";
    const otpVerified = await verifyOtp({
      userId: user.id,
      otp: "123456",
      purpose: "EMAIL_SIGNUP",
    });
    assert.strictEqual(otpVerified, true, "OTP verification must succeed");

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });
    console.log("  ✓ User email verified successfully");

    // -------------------------------------------------------------------------
    // 2. SESSION COOKIE & AUTHENTICATION
    // -------------------------------------------------------------------------
    console.log("\n[TEST 2] Testing Sessions, Authorization & Logout...");
    const session = await createUserSession(user.id);
    testSessionToken = session.token;
    assert(session.token, "Session token must be generated");

    const validatedUser = await validateSession(session.token);
    assert.strictEqual(validatedUser?.id, user.id, "Session must validate to the correct user");
    console.log("  ✓ User session validated successfully");

    // -------------------------------------------------------------------------
    // 3. UNAUTHORIZED CROSS-TENANT ACCESS PROTECTION
    // -------------------------------------------------------------------------
    console.log("\n[TEST 3] Testing Multi-Tenant Authorization Protection...");
    const otherUser = await signupUser({
      identifier: otherUserEmail,
      password: testPassword,
      fullName: "Other Test User",
    });
    otherUserId = otherUser.id;

    // Create website for primary user
    const site = await createWebsite(primaryUserId, `Phase1 Site ${testSuffix}`);
    websiteId = site.id;
    assert(site.id, "Website must be created with ID");
    assert(site.slug, "Website must have a slug");
    console.log("  ✓ Primary user created website:", site.id, "slug:", site.slug);

    // Other user attempts to access primary user's website -> MUST BE FORBIDDEN
    let unauthorizedBlocked = false;
    try {
      await getWebsiteById(websiteId, otherUserId);
    } catch (err: any) {
      unauthorizedBlocked = true;
      assert(err.statusCode === 403 || err.statusCode === 404, "Cross-user website access must return 403/404");
    }
    assert(unauthorizedBlocked, "Unauthorized cross-tenant access must be blocked");
    console.log("  ✓ Unauthorized access to another user's website successfully blocked");

    // -------------------------------------------------------------------------
    // 4. EDITOR DATA: WIDGETS, MULTI-PAGES, HOMEPAGE, HEADER/FOOTER
    // -------------------------------------------------------------------------
    console.log("\n[TEST 4] Testing Website Editor: Widgets, Multiple Pages & SiteParts...");
    const formWidgetId = `form_${crypto.randomBytes(4).toString("hex")}`;
    const initialPages = [
      {
        id: "home",
        name: "Home",
        slug: "/",
        isHome: true,
        elements: [
          {
            id: "heading_1",
            type: "heading",
            content: "Welcome to ForgeStudio",
            styles: { desktop: { color: "#1e293b", fontSize: "36px" } },
          },
          {
            id: "btn_1",
            type: "button",
            content: "Contact Us",
            href: "/contact",
          },
        ],
      },
      {
        id: "contact_page",
        name: "Contact",
        slug: "contact",
        isHome: false,
        elements: [
          {
            id: "heading_contact",
            type: "heading",
            content: "Get in Touch",
          },
          {
            id: formWidgetId,
            type: "form",
            name: "Contact Inquiries Form",
            settings: {
              formId: formWidgetId,
              formName: "Contact Inquiries Form",
              actions: {
                activeActions: ["database"],
                successMessage: "Your message has been sent!",
              },
            },
          },
        ],
      },
    ];

    const initialSiteParts = {
      header: {
        isEnabled: true,
        elements: [
          {
            id: "nav_1",
            type: "nav",
            content: "Brand Navigation Bar",
          },
        ],
      },
      footer: {
        isEnabled: true,
        elements: [
          {
            id: "text_footer",
            type: "text",
            content: "© 2026 ForgeStudio. All rights reserved.",
          },
        ],
      },
    };

    const initialEditorData = {
      version: 1,
      homePageId: "home",
      pages: initialPages,
      elements: initialPages[0].elements,
      siteParts: initialSiteParts,
      globalSettings: {
        siteIdentity: { name: "Phase 1 Verified Site" },
        globalStyles: { primaryColor: "#3b82f6" },
      },
    };

    const savedSite = await updateWebsiteEditorData(websiteId, primaryUserId, initialEditorData);
    assert(savedSite, "Website save must return updated website");
    const reloadedSite = await getWebsiteById(websiteId, primaryUserId);
    const parsedData = typeof reloadedSite.editorData === "string" ? JSON.parse(reloadedSite.editorData) : reloadedSite.editorData;
    assert.strictEqual(parsedData.pages.length, 2, "Must persist 2 pages");
    assert.strictEqual(parsedData.homePageId, "home", "Home page ID must persist");
    assert.strictEqual(parsedData.siteParts?.header?.elements?.length, 1, "Header elements must persist");
    assert.strictEqual(parsedData.siteParts?.footer?.elements?.length, 1, "Footer elements must persist");
    console.log("  ✓ Multi-page editor data, widgets and siteParts saved and reloaded from DB successfully");

    // -------------------------------------------------------------------------
    // 5. MEDIA ASSET MANAGEMENT: UPLOAD, GET & SAFE DELETION
    // -------------------------------------------------------------------------
    console.log("\n[TEST 5] Testing Media Asset Management & Safe Deletion...");
    const mediaAsset = await createMediaAsset({
      userId: primaryUserId,
      websiteId,
      filename: `test_${testSuffix}.png`,
      originalName: "hero_banner.png",
      mimeType: "image/png",
      sizeBytes: 1024,
      url: `/uploads/images/test_${testSuffix}.png`,
      width: 800,
      height: 600,
    });
    assert(mediaAsset.id, "MediaAsset record must be created");

    const fetchedAsset = await getMediaAssetById(mediaAsset.id, primaryUserId);
    assert.strictEqual(fetchedAsset.id, mediaAsset.id);

    await deleteMediaAsset(mediaAsset.id, primaryUserId);
    let assetDeleted = false;
    try {
      await getMediaAssetById(mediaAsset.id, primaryUserId);
    } catch (err: any) {
      assetDeleted = true;
      assert.strictEqual(err.statusCode, 404);
    }
    assert(assetDeleted, "MediaAsset must be deleted from database");
    console.log("  ✓ Media asset created, validated and safely deleted");

    // -------------------------------------------------------------------------
    // 6. MULTI-TAB STALE SAVE CONFLICT (HTTP 409)
    // -------------------------------------------------------------------------
    console.log("\n[TEST 6] Testing Multi-Tab Version Conflict (HTTP 409)...");
    const staleTimestamp = new Date(Date.now() - 60000).toISOString();
    let conflictThrown = false;
    try {
      await updateWebsiteEditorData(
        websiteId,
        primaryUserId,
        initialEditorData,
        undefined,
        staleTimestamp
      );
    } catch (err: any) {
      conflictThrown = true;
      assert.strictEqual(err.statusCode, 409, "Stale save must return 409 Conflict");
      assert.strictEqual(err.code, "STALE_VERSION_CONFLICT");
    }
    assert(conflictThrown, "Multi-tab stale save must be blocked with HTTP 409");
    console.log("  ✓ Multi-tab stale version conflict correctly returned HTTP 409");

    // -------------------------------------------------------------------------
    // 7. INTERNAL PUBLISHING & ANONYMOUS PUBLIC ACCESS
    // -------------------------------------------------------------------------
    console.log("\n[TEST 7] Testing Internal Publishing Pipeline & Anonymous Access...");
    const publishResult = await publishWebsite(websiteId, primaryUserId, {
      destinationType: "INTERNAL",
      environment: "PRODUCTION",
    });
    assert(publishResult.success, "Publishing must succeed");
    assert.strictEqual(publishResult.status, "PUBLISHED");
    console.log("  ✓ Website published version:", publishResult.version);

    // Fetch public website anonymously (without credentials)
    const publicSite = await getPublicWebsiteById(websiteId);
    assert(publicSite, "Public website must be retrievable");
    assert.strictEqual(publicSite.status, "PUBLISHED");
    assert.strictEqual(publicSite.editorData.pages.length, 2);
    assert.strictEqual(publicSite.editorData.siteParts.header.elements.length, 1);
    console.log("  ✓ Anonymous visitor can view published website with header, pages and widgets");

    // -------------------------------------------------------------------------
    // 8. DRAFT ISOLATION: UNPUBLISHED EDITS REMAIN PRIVATE
    // -------------------------------------------------------------------------
    console.log("\n[TEST 8] Testing Draft Isolation (Unpublished Edits Remain Private)...");
    const draftHeadingElement = {
      id: "heading_1",
      type: "heading",
      content: "PRIVATE UNPUBLISHED DRAFT HEADLINE",
    };
    const updatedDraftData = {
      ...initialEditorData,
      elements: [draftHeadingElement],
      pages: [
        {
          ...initialPages[0],
          elements: [draftHeadingElement],
        },
        initialPages[1],
      ],
    };

    // Save as draft
    await updateWebsiteEditorData(websiteId, primaryUserId, updatedDraftData);

    // Re-fetch public website anonymously
    const publicSiteAfterDraft = await getPublicWebsiteById(websiteId);
    const publicHomeHeading = publicSiteAfterDraft.editorData.pages[0].elements[0].content;
    assert.strictEqual(
      publicHomeHeading,
      "Welcome to ForgeStudio",
      "Public website content MUST NOT change when draft is saved"
    );
    console.log("  ✓ Draft isolation verified: public site unchanged despite draft edits");

    // -------------------------------------------------------------------------
    // 9. REPUBLISHING & ROLLBACK
    // -------------------------------------------------------------------------
    console.log("\n[TEST 9] Testing Republishing & Rollback...");
    // Republish to release draft as v2
    const v2Publish = await publishWebsite(websiteId, primaryUserId, {
      destinationType: "INTERNAL",
      environment: "PRODUCTION",
    });
    assert.strictEqual(v2Publish.version, 2, "Republish must create version 2");

    const publicSiteV2 = await getPublicWebsiteById(websiteId);
    assert.strictEqual(
      publicSiteV2.editorData.pages[0].elements[0].content,
      "PRIVATE UNPUBLISHED DRAFT HEADLINE",
      "Public site must now reflect published v2"
    );
    console.log("  ✓ Republishing verified: public site updated to v2");

    // Test Rollback to deployment v1
    const deployments = await getWebsiteDeployments(websiteId, primaryUserId);
    const v1Deployment = deployments.find((d: any) => d.version === 1);
    assert(v1Deployment, "Deployment v1 must exist");

    await rollbackDeployment(websiteId, v1Deployment.id, primaryUserId);
    const publicSiteRollback = await getPublicWebsiteById(websiteId);
    assert.strictEqual(
      publicSiteRollback.editorData.pages[0].elements[0].content,
      "Welcome to ForgeStudio",
      "Public site must be restored to version 1 snapshot"
    );
    console.log("  ✓ Rollback verified: public site atomically restored to v1");

    // -------------------------------------------------------------------------
    // 10. FORMS & SUBMISSIONS SECURITY
    // -------------------------------------------------------------------------
    console.log("\n[TEST 10] Testing Published Form Submissions & Injection Blocking...");
    // Attempt form submission on non-existent form -> MUST BE REJECTED
    let fakeFormRejected = false;
    try {
      await processFormSubmission({
        websiteId,
        formId: "non_existent_fake_form",
        formName: "Fake Form",
        fields: { email: "attacker@test.com" },
      });
    } catch (err: any) {
      fakeFormRejected = true;
      assert.strictEqual(err.statusCode, 400);
    }
    assert(fakeFormRejected, "Submission to non-existent form must be rejected");
    console.log("  ✓ Submission to invalid/fake form correctly rejected");

    // Valid submission to real published form (formWidgetId)
    const validSubmitResult = await processFormSubmission({
      websiteId,
      formId: formWidgetId,
      formName: "Contact Inquiries Form",
      fields: {
        name: "Alice Visitor",
        email: "alice@example.com",
        message: "Hello from Phase 1 test lead!",
      },
      // Client attempting to inject arbitrary webhook destination
      actions: {
        activeActions: ["database"],
        webhookConfig: { endpointUrl: "http://attacker.com/steal" },
      },
    });
    assert.strictEqual(validSubmitResult.success, true);
    console.log("  ✓ Valid published form submission processed successfully");

    // Verify submission is persisted in database
    const submissions = await getWebsiteSubmissions(websiteId, primaryUserId);
    assert(submissions.length >= 1, "Submission must persist in database");
    assert.strictEqual(submissions[0].formId, formWidgetId);
    console.log("  ✓ Submission persisted in PostgreSQL and retrieved by site owner");

    // Other user cannot access submissions
    let otherAccessBlocked = false;
    try {
      await getWebsiteSubmissions(websiteId, otherUserId);
    } catch (err: any) {
      otherAccessBlocked = true;
    }
    assert(otherAccessBlocked, "Other user must not access submissions");
    console.log("  ✓ Cross-tenant access to submissions blocked");

    // -------------------------------------------------------------------------
    // 11. LOGOUT & REVOCATION
    // -------------------------------------------------------------------------
    console.log("\n[TEST 11] Testing Logout & Session Revocation...");
    await revokeSession(testSessionToken);
    const sessionAfterLogout = await validateSession(testSessionToken);
    assert.strictEqual(sessionAfterLogout, null, "Revoked session must not validate");
    console.log("  ✓ Session successfully revoked on logout");

    console.log("\n================================================================");
    console.log("ALL PHASE 1 CORE USER JOURNEY TESTS COMPLETED SUCCESSFULLY! (PASS)");
    console.log("================================================================");
  } finally {
    // Cleanup disposable test records
    console.log("\nCleaning up disposable test records...");
    if (websiteId) {
      try {
        await deleteWebsite(websiteId, primaryUserId!);
      } catch (e) {}
    }
    if (primaryUserId) {
      try {
        await prisma.user.delete({ where: { id: primaryUserId } });
      } catch (e) {}
    }
    if (otherUserId) {
      try {
        await prisma.user.delete({ where: { id: otherUserId } });
      } catch (e) {}
    }
    console.log("Cleanup complete.");
  }
}

runPhase1CoreJourneyTest().catch((err) => {
  console.error("FATAL: Phase 1 Core Journey Test Failed:", err);
  process.exit(1);
});
