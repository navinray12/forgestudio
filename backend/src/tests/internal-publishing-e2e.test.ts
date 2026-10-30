import http from "http";
import app from "../app.js";
import { prisma } from "../config/prisma.js";
import { createUserSession } from "../services/session.service.js";
import { changeUserPlan } from "../services/subscription.service.js";

const db = prisma as any;

async function runInternalPublishingE2ETests() {
  console.log("=================================================");
  console.log("FEATURE 12: INTERNAL PUBLISHING HTTP E2E TEST SUITE");
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

  // Start HTTP server on ephemeral port (port 0)
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}`;
  console.log(`Test HTTP Server listening at: ${baseUrl}\n`);

  let ownerUser: any = null;
  let attackerUser: any = null;
  let ownerToken: string = "";
  let attackerToken: string = "";
  let testWebsiteId: string = "";

  try {
    // 1. Setup test users and sessions
    ownerUser = await db.user.create({
      data: {
        email: `publish_owner_${Date.now()}@forgestudio.dev`,
        fullName: "Publish Owner",
        status: "ACTIVE",
        role: "USER",
      },
    });
    await changeUserPlan(ownerUser.id, "agency");
    const ownerSession = await createUserSession(ownerUser.id);
    ownerToken = ownerSession.token;

    attackerUser = await db.user.create({
      data: {
        email: `publish_attacker_${Date.now()}@forgestudio.dev`,
        fullName: "Publish Attacker",
        status: "ACTIVE",
        role: "USER",
      },
    });
    const attackerSession = await createUserSession(attackerUser.id);
    attackerToken = attackerSession.token;

    const ownerHeaders = {
      "Content-Type": "application/json",
      Cookie: `forge_session=${ownerToken}`,
    };

    const attackerHeaders = {
      "Content-Type": "application/json",
      Cookie: `forge_session=${attackerToken}`,
    };

    const uniqueMarker1 = `MARKER_V1_${Date.now()}`;
    const uniqueMarker2 = `MARKER_V2_${Date.now()}`;

    // 2. Create test website (Initial state: DRAFT)
    const createRes = await fetch(`${baseUrl}/api/v1/websites`, {
      method: "POST",
      headers: ownerHeaders,
      body: JSON.stringify({
        name: "E2E Publishing Test Site",
        slug: `e2e-pub-${Date.now()}`,
        editorData: {
          version: 1,
          homePageId: "home",
          pages: [
            {
              id: "home",
              name: "Home Page",
              slug: "/",
              isHome: true,
              elements: [
                {
                  id: "h1",
                  type: "heading",
                  content: uniqueMarker1,
                  styles: { fontSize: "32px" },
                },
                {
                  id: "img1",
                  type: "image",
                  src: "/uploads/images/hero_e2e.png",
                  alt: "Hero Banner",
                  styles: { width: "100%" },
                },
              ],
            },
            {
              id: "about",
              name: "About Page",
              slug: "/about",
              isHome: false,
              elements: [
                {
                  id: "about_text",
                  type: "paragraph",
                  content: "About our company",
                },
              ],
            },
          ],
        },
      }),
    });

    const createData = await createRes.json();
    const createdId = createData.data?.id || createData.website?.id || createData.id;
    assert(createRes.status === 201 && Boolean(createdId), "Website creation via HTTP API succeeds", `Status ${createRes.status}`);
    testWebsiteId = createdId;

    // --- Step 2: Confirm unpublished website is NOT publicly accessible ---
    const prePubRes = await fetch(`${baseUrl}/api/v1/websites/public/${testWebsiteId}`);
    assert(prePubRes.status === 404, "Unpublished website returns HTTP 404 on /api/v1 public route", `Status ${prePubRes.status}`);

    const prePubResLegacy = await fetch(`${baseUrl}/api/websites/public/${testWebsiteId}`);
    assert(prePubResLegacy.status === 404, "Unpublished website returns HTTP 404 on /api legacy public route", `Status ${prePubResLegacy.status}`);

    // --- Step 3: Authorization checks ---
    // Attacker cannot read owner's draft
    const attackerReadRes = await fetch(`${baseUrl}/api/v1/websites/${testWebsiteId}`, {
      headers: attackerHeaders,
    });
    assert(attackerReadRes.status === 403 || attackerReadRes.status === 404, "Unauthorized user cannot access private draft editorData", `Status ${attackerReadRes.status}`);

    // Attacker cannot publish owner's website
    const attackerPubRes = await fetch(`${baseUrl}/api/v1/websites/${testWebsiteId}/publish`, {
      method: "POST",
      headers: attackerHeaders,
      body: JSON.stringify({ destinationType: "INTERNAL" }),
    });
    assert(attackerPubRes.status === 403, "Unauthorized user is rejected with HTTP 403 when attempting to publish", `Status ${attackerPubRes.status}`);

    // --- Step 4: Publish website (v1) ---
    const pubRes1 = await fetch(`${baseUrl}/api/v1/websites/${testWebsiteId}/publish`, {
      method: "POST",
      headers: ownerHeaders,
      body: JSON.stringify({
        destinationType: "INTERNAL",
        environment: "PRODUCTION",
      }),
    });
    const pubData1 = await pubRes1.json();
    console.log("pubRes1.status:", pubRes1.status, "pubData1:", JSON.stringify(pubData1));
    const publishResult1 = pubData1.data || pubData1;
    assert(
      (pubRes1.status === 200 || pubRes1.status === 201) &&
      publishResult1.success === true &&
      publishResult1.version === 1 &&
      publishResult1.status === "PUBLISHED",
      "Owner publishes website successfully (v1, PUBLISHED status)",
      `Status ${pubRes1.status}, version=${publishResult1.version}`
    );
    assert(publishResult1.liveUrl === `/site/${testWebsiteId}`, "Live URL matches expected internal URL pattern (/site/:id)", `liveUrl=${publishResult1.liveUrl}`);

    const deploymentId1 = publishResult1.deploymentId;

    // --- Step 5: Verify deployment status endpoint ---
    const verifyRes = await fetch(`${baseUrl}/api/v1/websites/${testWebsiteId}/deployments/${deploymentId1}/verify`, {
      method: "POST",
      headers: ownerHeaders,
    });
    const verifyData = await verifyRes.json();
    assert(verifyRes.status === 200 && verifyData.verified === true, "Deployment verify endpoint confirms live deployment status", `verified=${verifyData.verified}`);

    // --- Step 6: Public visitor fetches published website ---
    const publicRes1 = await fetch(`${baseUrl}/api/v1/websites/public/${testWebsiteId}`);
    const publicData1 = await publicRes1.json();
    assert(publicRes1.status === 200 && publicData1.success === true, "Public unauthenticated visitor can fetch published website over HTTP", `Status ${publicRes1.status}`);

    const homePage1 = publicData1.website?.editorData?.pages?.find((p: any) => p.id === "home");
    const headingEl1 = homePage1?.elements?.find((el: any) => el.id === "h1");
    assert(headingEl1?.content === uniqueMarker1, "Published website reflects expected marker #1 content", `Got ${headingEl1?.content}`);

    // Relative image resolution check
    const imgEl = homePage1?.elements?.find((el: any) => el.id === "img1");
    assert(imgEl?.src === "/uploads/images/hero_e2e.png" && imgEl?.alt === "Hero Banner", "Relative image URL and alt text are preserved in public response", `src=${imgEl?.src}`);

    // Multi-page resolution check
    const aboutPage1 = publicData1.website?.editorData?.pages?.find((p: any) => p.id === "about");
    assert(aboutPage1 && aboutPage1.slug === "/about", "Multi-page structure (about page) is present in public payload", `slug=${aboutPage1?.slug}`);

    // --- Step 7: Draft isolation — draft changes do NOT leak before publishing ---
    const updateDraftRes = await fetch(`${baseUrl}/api/v1/websites/${testWebsiteId}`, {
      method: "PUT",
      headers: ownerHeaders,
      body: JSON.stringify({
        editorData: {
          version: 1,
          homePageId: "home",
          pages: [
            {
              id: "home",
              name: "Home Page",
              slug: "/",
              isHome: true,
              elements: [
                {
                  id: "h1",
                  type: "heading",
                  content: uniqueMarker2, // Updated marker in draft only
                },
              ],
            },
          ],
        },
      }),
    });
    assert(updateDraftRes.status === 200, "Owner saves new draft changes", `Status ${updateDraftRes.status}`);

    // Fetch public site again — MUST STILL HAVE marker 1!
    const publicResDuringDraft = await fetch(`${baseUrl}/api/v1/websites/public/${testWebsiteId}`);
    const publicDataDuringDraft = await publicResDuringDraft.json();
    console.log("publicDataDuringDraft:", JSON.stringify(publicDataDuringDraft));
    const headingDuringDraft = publicDataDuringDraft.website?.editorData?.pages
      ?.find((p: any) => p.id === "home")
      ?.elements?.find((el: any) => el.id === "h1");
    assert(
      headingDuringDraft?.content === uniqueMarker1 && headingDuringDraft?.content !== uniqueMarker2,
      "Draft changes do NOT leak to the public site before publishing",
      `Expected ${uniqueMarker1}, got ${headingDuringDraft?.content}`
    );

    // --- Step 8: Re-publish (v2) and verify update ---
    const pubRes2 = await fetch(`${baseUrl}/api/v1/websites/${testWebsiteId}/publish`, {
      method: "POST",
      headers: ownerHeaders,
      body: JSON.stringify({
        destinationType: "INTERNAL",
        environment: "PRODUCTION",
      }),
    });
    const pubData2 = await pubRes2.json();
    const publishResult2 = pubData2.data || pubData2;
    assert((pubRes2.status === 200 || pubRes2.status === 201) && publishResult2.version === 2, "Second publish increments monotonic version to v2", `Version=${publishResult2.version}`);

    // Public site now reflects marker 2!
    const publicRes2 = await fetch(`${baseUrl}/api/v1/websites/public/${testWebsiteId}`);
    const publicData2 = await publicRes2.json();
    const heading2 = publicData2.website?.editorData?.pages
      ?.find((p: any) => p.id === "home")
      ?.elements?.find((el: any) => el.id === "h1");
    assert(heading2?.content === uniqueMarker2, "Published site reflects latest content (marker #2) after re-publishing", `Got ${heading2?.content}`);

    // --- Step 9: Deployment history consistency ---
    const depListRes = await fetch(`${baseUrl}/api/v1/websites/${testWebsiteId}/deployments`, {
      headers: ownerHeaders,
    });
    const depListData = await depListRes.json();
    const deploymentsList = depListData.deployments || depListData.data?.deployments || depListData.data || [];
    assert(
      (depListRes.status === 200 || depListRes.status === 201) &&
      Array.isArray(deploymentsList) &&
      deploymentsList.length >= 2 &&
      deploymentsList[0].version === 2 &&
      deploymentsList[1].version === 1,
      "Deployments history lists records newest-first (v2, v1) without duplications",
      `Count=${deploymentsList?.length}`
    );

    // --- Step 10: Non-existent website handling ---
    const missingRes = await fetch(`${baseUrl}/api/v1/websites/public/00000000-0000-4000-8000-000000000000`);
    assert(missingRes.status === 404, "Missing website ID returns 404 safely on public endpoint", `Status ${missingRes.status}`);

  } finally {
    // Cleanup test records
    try {
      if (testWebsiteId) {
        await db.deployment.deleteMany({ where: { websiteId: testWebsiteId } });
        await db.website.deleteMany({ where: { id: testWebsiteId } });
      }
      if (ownerUser?.id) {
        await db.session.deleteMany({ where: { userId: ownerUser.id } });
        await db.user.deleteMany({ where: { id: ownerUser.id } });
      }
      if (attackerUser?.id) {
        await db.session.deleteMany({ where: { userId: attackerUser.id } });
        await db.user.deleteMany({ where: { id: attackerUser.id } });
      }
    } catch (cleanErr) {
      console.warn("Cleanup warning:", cleanErr);
    }

    server.close();
  }

  console.log("\n=================================================");
  console.log(`FEATURE 12 HTTP E2E RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runInternalPublishingE2ETests().catch((err) => {
  console.error("Unhandled error in E2E tests:", err);
  process.exit(1);
});
