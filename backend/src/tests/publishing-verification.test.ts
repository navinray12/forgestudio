import { prisma } from "../config/prisma.js";
import {
  createWebsite,
  getWebsiteById,
  getPublicWebsiteById,
} from "../services/website.service.js";
import {
  publishWebsite,
  verifyDeployment,
  getWebsiteDeployments,
  getDeploymentById,
} from "../services/publishing.service.js";
import { destinationRegistry } from "../services/destinations/registry.js";
import { changeUserPlan } from "../services/subscription.service.js";

const db = prisma as any;

async function runPublishingVerificationTests() {
  console.log("=================================================");
  console.log("FEATURE 12 — INTERNAL PUBLISHING VERIFICATION TESTS");
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
  let validWebsite: any = null;
  let brokenWebsite: any = null;
  let unpubWebsite: any = null;

  try {
    // Setup dedicated test users
    ownerUser = await db.user.create({
      data: {
        email: `owner_verif_${Date.now()}@forgestudio.dev`,
        fullName: "Owner Verifier",
        status: "ACTIVE",
        role: "USER",
      },
    });
    await changeUserPlan(ownerUser.id, "agency");

    unauthorizedUser = await db.user.create({
      data: {
        email: `unauth_verif_${Date.now()}@forgestudio.dev`,
        fullName: "Unauthorized Verifier",
        status: "ACTIVE",
        role: "USER",
      },
    });

    // Create valid test website
    validWebsite = await createWebsite({
      name: "Verification Test Site",
      slug: `verif-site-${Date.now()}`,
      userId: ownerUser.id,
      editorData: {
        version: 1,
        homePageId: "home",
        pages: [
          {
            id: "home",
            name: "Home Page",
            title: "Home Page",
            slug: "/",
            isHome: true,
            elements: [
              {
                id: "heading_1",
                type: "heading",
                content: "Welcome to Verified Publishing",
                styles: { color: "#1e293b", fontSize: "32px" },
              },
              {
                id: "btn_1",
                type: "button",
                content: "Explore Services",
                styles: { backgroundColor: "#3b82f6", color: "#ffffff" },
              },
            ],
          },
          {
            id: "about",
            name: "About Us",
            title: "About Us",
            slug: "/about",
            isHome: false,
            elements: [
              {
                id: "text_about",
                type: "text",
                content: "We deliver exceptional web experiences.",
              },
            ],
          },
        ],
        elements: [
          {
            id: "heading_1",
            type: "heading",
            content: "Welcome to Verified Publishing",
          },
        ],
      },
    });

    // =========================================================================
    // Test 1: Successful Internal Publishing Verification (Pipeline End-to-End)
    // =========================================================================
    const publishRes = await publishWebsite(validWebsite.id, ownerUser.id, {
      destinationType: "INTERNAL",
      environment: "PRODUCTION",
    });

    assert(
      publishRes.success === true &&
      publishRes.status === "PUBLISHED" &&
      publishRes.version === 1 &&
      publishRes.liveUrl === `/site/${validWebsite.id}`,
      "Test 1: Publish completes end-to-end, reaches PUBLISHED status, and produces valid live URL"
    );

    // =========================================================================
    // Test 2: Destination Registry Verification Adapter
    // =========================================================================
    const internalPublisher = destinationRegistry.getPublisher("INTERNAL");
    const verifCheck = await internalPublisher.verify(validWebsite.id, publishRes.deploymentId, {
      version: 1,
    });

    assert(
      verifCheck.verified === true &&
      verifCheck.statusCode === 200 &&
      verifCheck.details?.status === "PUBLISHED" &&
      verifCheck.details?.version === 1 &&
      verifCheck.details?.pagesCount === 2 &&
      verifCheck.details?.liveUrl === `/site/${validWebsite.id}`,
      "Test 2: InternalPublisher.verify validates published snapshot, page count, and status"
    );

    // =========================================================================
    // Test 3: Public Runtime Accessibility Verification
    // =========================================================================
    const publicSite = await getPublicWebsiteById(validWebsite.id);
    assert(
      publicSite.status === "PUBLISHED" &&
      (publicSite.editorData?.version === 1 || publicSite.editorData?.publishing?.version === 1) &&
      Array.isArray(publicSite.editorData?.pages) &&
      publicSite.editorData.pages.length === 2,
      "Test 3: Public runtime returns active published snapshot with durable page artifacts"
    );

    // =========================================================================
    // Test 4: Idempotent verifyDeployment Service & Repeated Verification
    // =========================================================================
    const deploymentsBefore = await getWebsiteDeployments(validWebsite.id, ownerUser.id);
    const countBefore = deploymentsBefore.length;

    const repeatedVerif1 = await verifyDeployment(validWebsite.id, publishRes.deploymentId, ownerUser.id);
    const repeatedVerif2 = await verifyDeployment(validWebsite.id, publishRes.deploymentId, ownerUser.id);

    const deploymentsAfter = await getWebsiteDeployments(validWebsite.id, ownerUser.id);
    const countAfter = deploymentsAfter.length;

    assert(
      repeatedVerif1.verified === true &&
      repeatedVerif2.verified === true &&
      countBefore === countAfter,
      "Test 4: Repeated verifyDeployment calls are idempotent and create ZERO duplicate deployment records"
    );

    // =========================================================================
    // Test 5: Build Failure Detection & Persistence
    // =========================================================================
    brokenWebsite = await createWebsite({
      name: "Broken Build Site",
      slug: `broken-build-${Date.now()}`,
      userId: ownerUser.id,
      editorData: {
        version: 1,
        homePageId: "home",
        pages: [{ id: "home", name: "Home", slug: "/", isHome: true, elements: [] }],
      },
    });

    // Create a component structure that causes build compilation failure
    const circularEl: any = {
      id: "circular_container",
      type: "container",
      children: [],
    };
    circularEl.children.push(circularEl);

    let buildErrorCaught = false;
    let buildErrorCode = "";
    try {
      await publishWebsite(brokenWebsite.id, ownerUser.id, {
        destinationType: "INTERNAL",
        editorData: {
          homePageId: "home",
          pages: [
            {
              id: "home",
              name: "Corrupt Page",
              slug: "/",
              isHome: true,
              elements: [circularEl],
            },
          ],
          elements: [circularEl],
        },
      });
    } catch (err: any) {
      buildErrorCaught = true;
      buildErrorCode = err.code || err.name;
    }

    const brokenDeployments = await getWebsiteDeployments(brokenWebsite.id, ownerUser.id);
    const latestBrokenDeploy = brokenDeployments[0];

    assert(
      buildErrorCaught &&
      latestBrokenDeploy &&
      latestBrokenDeploy.status === "BUILD_FAILED",
      `Test 5: Build compilation failure is caught and persisted with status '${latestBrokenDeploy?.status}'`
    );

    // =========================================================================
    // Test 6: Missing Artifacts / Empty Snapshot Detection
    // =========================================================================
    const emptyArtifactCheck = await internalPublisher.verify(validWebsite.id, publishRes.deploymentId, {
      version: 999, // Mismatched version
    });

    assert(
      emptyArtifactCheck.verified === false &&
      emptyArtifactCheck.statusCode === 409 &&
      Boolean(emptyArtifactCheck.error?.includes("Published version mismatch")),
      "Test 6: Internal verification flags version mismatch as unverified (409 Conflict)"
    );

    // Test missing published snapshot detection
    unpubWebsite = await createWebsite({
      name: "Unpublished Site",
      slug: `unpub-${Date.now()}`,
      userId: ownerUser.id,
      editorData: { pages: [{ id: "p1", name: "P1", slug: "/" }] },
    });

    const unpubCheck = await internalPublisher.verify(unpubWebsite.id, "fake-deploy-id", { version: 1 });
    assert(
      unpubCheck.verified === false &&
      unpubCheck.statusCode === 400 &&
      Boolean(unpubCheck.error?.includes("expected 'PUBLISHED'")),
      "Test 7: Verification rejects unpublished sites (status is DRAFT)"
    );

    // =========================================================================
    // Test 8: Unauthorized Verification and Publishing Rejection
    // =========================================================================
    // Add unauthorizedUser as VIEW-only collaborator so getWebsiteById succeeds but PUBLISH capability fails
    await db.websiteCollaborator.create({
      data: {
        websiteId: validWebsite.id,
        userId: unauthorizedUser.id,
        permission: "VIEW",
      },
    });

    let unauthPublishBlocked = false;
    try {
      await publishWebsite(validWebsite.id, unauthorizedUser.id, {
        destinationType: "INTERNAL",
      });
    } catch (err: any) {
      unauthPublishBlocked = err.statusCode === 403 || err.code === "FORBIDDEN";
    }

    let unauthVerifyBlocked = false;
    try {
      await verifyDeployment(validWebsite.id, publishRes.deploymentId, unauthorizedUser.id);
    } catch (err: any) {
      unauthVerifyBlocked = err.statusCode === 403 || err.code === "FORBIDDEN";
    }

    assert(
      unauthPublishBlocked && unauthVerifyBlocked,
      "Test 8: Unauthorized users (VIEW only) are strictly blocked from publishing and verifying deployments (403 Forbidden)"
    );

    // =========================================================================
    // Test 9: Retry Verification Recovers Failed Verification
    // =========================================================================
    // Create a mock deployment manually in VERIFICATION_FAILED state
    const failedDeployment = await db.deployment.create({
      data: {
        websiteId: validWebsite.id,
        version: 1, // matches the published website version
        status: "VERIFICATION_FAILED",
        environment: "PRODUCTION",
        destinationType: "INTERNAL",
        destinationRef: `/site/${validWebsite.id}`,
        createdBy: ownerUser.id,
        error: { code: "DESTINATION_VERIFICATION_FAILED", message: "Transient network timeout" },
      },
    });

    // Run verifyDeployment on the failed record
    const retryResult = await verifyDeployment(validWebsite.id, failedDeployment.id, ownerUser.id);
    const updatedDeploymentRecord = await getDeploymentById(validWebsite.id, failedDeployment.id, ownerUser.id);

    assert(
      retryResult.verified === true &&
      retryResult.status === "PUBLISHED" &&
      updatedDeploymentRecord.status === "PUBLISHED" &&
      updatedDeploymentRecord.error === null,
      "Test 9: Re-verifying a previously failed deployment recovers status to PUBLISHED and clears error details"
    );

    // =========================================================================
    // Test 10: Existing Publishing Regression & Monotonic Versioning
    // =========================================================================
    const secondPublishRes = await publishWebsite(validWebsite.id, ownerUser.id, {
      destinationType: "INTERNAL",
      environment: "PRODUCTION",
    });

    const allDeployments = await getWebsiteDeployments(validWebsite.id, ownerUser.id);
    const versions = allDeployments.map((d: any) => d.version);

    assert(
      secondPublishRes.success === true &&
      secondPublishRes.version === 2 &&
      versions.includes(1) &&
      versions.includes(2),
      "Test 10: Regression safety: Monotonic deployment versions (v1, v2) increment correctly without data loss"
    );

  } catch (error) {
    console.error("Test execution error:", error);
    failed++;
  } finally {
    // Cleanup test entities
    try {
      if (validWebsite?.id) {
        await db.deployment.deleteMany({ where: { websiteId: validWebsite.id } });
        await db.website.delete({ where: { id: validWebsite.id } });
      }
      if (brokenWebsite?.id) {
        await db.deployment.deleteMany({ where: { websiteId: brokenWebsite.id } });
        await db.website.delete({ where: { id: brokenWebsite.id } });
      }
      if (unpubWebsite?.id) {
        await db.deployment.deleteMany({ where: { websiteId: unpubWebsite.id } });
        await db.website.delete({ where: { id: unpubWebsite.id } });
      }
      if (unauthorizedUser?.id) {
        await db.user.delete({ where: { id: unauthorizedUser.id } });
      }
      if (ownerUser?.id) {
        await db.website.deleteMany({ where: { userId: ownerUser.id } });
        await db.user.delete({ where: { id: ownerUser.id } });
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

runPublishingVerificationTests();
