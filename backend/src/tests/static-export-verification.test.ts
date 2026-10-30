import { prisma } from "../config/prisma.js";
import { publishWebsite, getWebsiteDeployments, verifyDeployment } from "../services/publishing.service.js";
import { createWebsite } from "../services/website.service.js";
import { StaticExportPublisher } from "../services/destinations/staticExport.publisher.js";
import { compileCanonicalToStaticBundle } from "../services/destinations/staticCompiler.js";
import { createStaticZipArchive } from "../services/destinations/staticZip.service.js";

const db = prisma as any;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    return true;
  } else {
    console.error(`[FAIL] ${testName}${detail ? ` - Detail: ${detail}` : ""}`);
    return false;
  }
}

async function runStaticExportVerificationTests() {
  console.log("=================================================");
  console.log("FEATURE 13 — STATIC EXPORT VERIFICATION TESTS");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function record(result: boolean) {
    if (result) passed++;
    else failed++;
  }

  const staticPublisher = new StaticExportPublisher();

  let ownerUser: any = null;
  let viewerUser: any = null;
  let foreignUser: any = null;
  let validWebsite: any = null;
  let publishedRes: any = null;

  try {
    // 1. Setup dedicated isolated test users
    ownerUser = await db.user.create({
      data: {
        email: `owner_static_${Date.now()}@forgestudio.dev`,
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
        fullName: "Static Owner",
        role: "USER",
      },
    });

    viewerUser = await db.user.create({
      data: {
        email: `viewer_static_${Date.now()}@forgestudio.dev`,
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
        fullName: "Static Viewer",
        role: "USER",
      },
    });

    foreignUser = await db.user.create({
      data: {
        email: `foreign_static_${Date.now()}@forgestudio.dev`,
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
        fullName: "Foreign User",
        role: "USER",
      },
    });

    // 2. Setup test website with home and about page
    validWebsite = await createWebsite({
      name: "Static Export Test Site",
      slug: `static-test-${Date.now()}`,
      userId: ownerUser.id,
      editorData: {
        version: 1,
        homePageId: "home",
        siteSettings: {
          siteName: "ForgeStudio Static Showcase",
          siteLanguage: "en",
        },
        pages: [
          {
            id: "home",
            name: "Home",
            slug: "/",
            isHome: true,
            elements: [
              {
                id: "h1",
                type: "heading",
                content: "Welcome to Static ForgeStudio",
                level: 1,
              },
              {
                id: "btn1",
                type: "button",
                content: "Learn More",
                href: "about.html",
              },
            ],
          },
          {
            id: "about",
            name: "About Us",
            slug: "/about",
            isHome: false,
            elements: [
              {
                id: "h2",
                type: "heading",
                content: "About Our Static Export",
                level: 2,
              },
              {
                id: "img1",
                type: "image",
                src: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800",
                alt: "Unsplash Header (External SSRF-Safe)",
              },
            ],
          },
        ],
      },
    });

    // Add viewerUser as VIEW collaborator
    await db.websiteCollaborator.create({
      data: {
        websiteId: validWebsite.id,
        userId: viewerUser.id,
        permission: "VIEW",
      },
    });

    // =========================================================================
    // Test 1: Successful Static Export End-to-End & Direct Verification
    // =========================================================================
    publishedRes = await publishWebsite(validWebsite.id, ownerUser.id, {
      destinationType: "STATIC",
    });

    const verifyRes1 = await staticPublisher.verify(validWebsite.id, publishedRes.deploymentId, {
      version: 1,
      userId: ownerUser.id,
    });

    record(
      assert(
        publishedRes.success === true &&
        publishedRes.destinationType === "STATIC" &&
        verifyRes1.verified === true &&
        verifyRes1.statusCode === 200 &&
        verifyRes1.details?.entryHtml === "index.html" &&
        verifyRes1.details?.zipPackaged === true &&
        verifyRes1.details?.zipSizeBytes > 0 &&
        verifyRes1.details?.pagesVerified?.includes("index.html") &&
        verifyRes1.details?.pagesVerified?.includes("about.html"),
        "Test 1: Static export completes successfully with valid HTML, assets, and ZIP packaging"
      )
    );

    // =========================================================================
    // Test 2: Missing Entry HTML File (index.html) Detection
    // =========================================================================
    const normalBundle = compileCanonicalToStaticBundle(validWebsite.id, 1, validWebsite.editorData);

    // Strip index.html from bundle
    const bundleWithoutIndex = {
      ...normalBundle,
      files: normalBundle.files.filter((f) => f.path !== "index.html"),
    };

    const missingIndexRes = await staticPublisher.verify(validWebsite.id, publishedRes.deploymentId, {
      version: 1,
      bundle: bundleWithoutIndex,
    });

    record(
      assert(
        missingIndexRes.verified === false &&
        missingIndexRes.statusCode === 422 &&
        Boolean(missingIndexRes.error?.includes("index.html")),
        "Test 2: Missing entry HTML file (index.html) is detected and rejected with status 422"
      )
    );

    // =========================================================================
    // Test 3: Empty or Unreadable Required Core Artifact Detection
    // =========================================================================
    const bundleWithEmptyCss = {
      ...normalBundle,
      files: normalBundle.files.map((f) =>
        f.path === "styles.css" ? { ...f, content: "", size: 0 } : f
      ),
    };

    const emptyCssRes = await staticPublisher.verify(validWebsite.id, publishedRes.deploymentId, {
      version: 1,
      bundle: bundleWithEmptyCss,
    });

    record(
      assert(
        emptyCssRes.verified === false &&
        emptyCssRes.statusCode === 422 &&
        Boolean(emptyCssRes.error?.includes("styles.css")),
        "Test 3: Empty or unreadable required asset (styles.css 0 bytes) is detected and rejected"
      )
    );

    // =========================================================================
    // Test 4: Missing Referenced Local Asset (SSRF-Safe) Detection
    // =========================================================================
    const bundleWithBrokenLocalAsset = {
      ...normalBundle,
      files: normalBundle.files.map((f) =>
        f.path === "index.html"
          ? {
              ...f,
              content: `${f.content}\n<img src="images/missing-local-graphic.png" alt="Missing" />\n<img src="https://external.domain.com/safe.jpg" />`,
            }
          : f
      ),
    };

    const brokenAssetRes = await staticPublisher.verify(validWebsite.id, publishedRes.deploymentId, {
      version: 1,
      bundle: bundleWithBrokenLocalAsset,
    });

    record(
      assert(
        brokenAssetRes.verified === false &&
        brokenAssetRes.statusCode === 422 &&
        Boolean(brokenAssetRes.error?.includes("missing-local-graphic.png")),
        "Test 4: Internal asset references pointing to missing local files are flagged without SSRF risk"
      )
    );

    // =========================================================================
    // Test 5: Compilation Failure Detection
    // =========================================================================
    const circularEl: any = { id: "c1", type: "container", children: [] };
    circularEl.children.push(circularEl);

    const corruptSnapshot = {
      version: 1,
      homePageId: "home",
      pages: [{ id: "home", name: "Corrupt", slug: "/", isHome: true, elements: [circularEl] }],
      elements: [circularEl],
    };

    const compileFailRes = await staticPublisher.verify(validWebsite.id, publishedRes.deploymentId, {
      version: 1,
      snapshot: corruptSnapshot,
    });

    record(
      assert(
        compileFailRes.verified === false &&
        compileFailRes.statusCode === 422 &&
        Boolean(compileFailRes.error?.includes("Static compilation failed")),
        "Test 5: Compilation failure is caught and accurately reported with status 422"
      )
    );

    // =========================================================================
    // Test 6: Route and Filename Consistency (Traversal / Illegal Filenames)
    // =========================================================================
    const maliciousRouteSnapshot = {
      version: 1,
      homePageId: "home",
      pages: [
        { id: "home", name: "Home", slug: "/", isHome: true, elements: [] },
        { id: "evil", name: "Evil", slug: "../../../etc/passwd", isHome: false, elements: [] },
      ],
    };

    const evilRouteRes = await staticPublisher.verify(validWebsite.id, publishedRes.deploymentId, {
      version: 1,
      snapshot: maliciousRouteSnapshot,
    });

    record(
      assert(
        evilRouteRes.verified === false &&
        evilRouteRes.statusCode === 422 &&
        Boolean(evilRouteRes.error?.includes("illegal characters")),
        "Test 6: Traversal or invalid filenames in page routes are rejected"
      )
    );

    // =========================================================================
    // Test 7: Unauthorized Verification & Export Attempts Blocked
    // =========================================================================
    const unauthVerifyRes = await staticPublisher.verify(validWebsite.id, publishedRes.deploymentId, {
      version: 1,
      userId: foreignUser.id,
    });

    let unauthPublishBlocked = false;
    try {
      await publishWebsite(validWebsite.id, foreignUser.id, { destinationType: "STATIC" });
    } catch (err: any) {
      unauthPublishBlocked = err.statusCode === 403 || err.statusCode === 404;
    }

    record(
      assert(
        unauthVerifyRes.verified === false &&
        unauthVerifyRes.statusCode === 403 &&
        unauthPublishBlocked,
        "Test 7: Unauthorized users are strictly blocked from static export and verification"
      )
    );

    // =========================================================================
    // Test 8: Export Version Mismatch Guard
    // =========================================================================
    const versionMismatchRes = await staticPublisher.verify(validWebsite.id, publishedRes.deploymentId, {
      version: 999, // Mismatched requested version
    });

    record(
      assert(
        versionMismatchRes.verified === false &&
        versionMismatchRes.statusCode === 409 &&
        Boolean(versionMismatchRes.error?.includes("version mismatch")),
        "Test 8: Version mismatch is flagged with 409 Conflict"
      )
    );

    // =========================================================================
    // Test 9: ZIP Archive Packaging Integrity
    // =========================================================================
    const zipArchiveBuffer = await createStaticZipArchive(normalBundle);
    const hasZipMagic =
      zipArchiveBuffer.length > 4 &&
      zipArchiveBuffer[0] === 0x50 &&
      zipArchiveBuffer[1] === 0x4b &&
      zipArchiveBuffer[2] === 0x03 &&
      zipArchiveBuffer[3] === 0x04;

    record(
      assert(
        hasZipMagic && zipArchiveBuffer.length > 100,
        "Test 9: Static bundle packages into a valid binary ZIP archive with standard PK signature"
      )
    );

    // =========================================================================
    // Test 10: Idempotent verifyDeployment & Feature 12 Internal Publishing Safety
    // =========================================================================
    const allDeploymentsBefore = await getWebsiteDeployments(validWebsite.id, ownerUser.id);
    const countBefore = allDeploymentsBefore.length;

    const repeatStaticVerif = await verifyDeployment(validWebsite.id, publishedRes.deploymentId, ownerUser.id);
    const allDeploymentsAfter = await getWebsiteDeployments(validWebsite.id, ownerUser.id);
    const countAfter = allDeploymentsAfter.length;

    // Run internal publish to ensure zero regression on Feature 12
    const internalPublishRes = await publishWebsite(validWebsite.id, ownerUser.id, {
      destinationType: "INTERNAL",
    });

    record(
      assert(
        repeatStaticVerif.verified === true &&
        countBefore === countAfter &&
        internalPublishRes.success === true &&
        internalPublishRes.destinationType === "INTERNAL" &&
        internalPublishRes.version === 2,
        "Test 10: Idempotent re-verification creates zero duplicates; internal publishing regression passes"
      )
    );

  } catch (err: any) {
    console.error("Test execution exception:", err);
    failed++;
  } finally {
    // Cleanup
    try {
      if (validWebsite?.id) {
        await db.deployment.deleteMany({ where: { websiteId: validWebsite.id } });
        await db.website.delete({ where: { id: validWebsite.id } });
      }
      if (foreignUser?.id) await db.user.delete({ where: { id: foreignUser.id } });
      if (viewerUser?.id) await db.user.delete({ where: { id: viewerUser.id } });
      if (ownerUser?.id) await db.user.delete({ where: { id: ownerUser.id } });
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

runStaticExportVerificationTests();
