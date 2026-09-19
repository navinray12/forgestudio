import { prisma } from "../config/prisma.js";
import { destinationRegistry } from "../services/destinations/registry.js";
import { compileCanonicalToStaticBundle } from "../services/destinations/staticCompiler.js";
import {
  createWebsite,
  getWebsiteById,
  deleteWebsite,
} from "../services/website.service.js";
import {
  publishWebsite,
  getWebsiteDeployments,
  rollbackDeployment,
} from "../services/publishing.service.js";
import {
  createOrUpdateSftpConfig,
  getSftpConfig,
  syncFilesOverSftp,
} from "../services/sftp.service.js";
import { setSftpClientFactory } from "../services/destinations/sftp.publisher.js";

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

async function runMilestoneBTests() {
  console.log("=================================================");
  console.log("RUNNING FORGESTUDIO MILESTONE B VERIFICATION SUITE");
  console.log("Deployment Destinations (Master Phase 7)");
  console.log("=================================================\n");

  let testUser: any;
  let testWebsite: any;

  try {
    setSftpClientFactory(() => ({
      connect: async () => {},
      mkdir: async () => "",
      put: async () => "",
      list: async () => [],
      end: async () => {},
    }));

    const timestamp = Date.now();
    testUser = await db.user.create({
      data: {
        email: `destinations_${timestamp}@example.com`,
        fullName: "Destinations Architect",
      },
    });

    testWebsite = await createWebsite(testUser.id, `Destinations Site ${timestamp}`);

    // Update website with multi-page canonical data
    const canonicalData = {
      version: 1,
      homePageId: "home-page",
      name: "Destinations Corp",
      siteSettings: {
        siteName: "Destinations Corp",
        siteLanguage: "en",
        metaDescription: "Global deployment testing",
      },
      globalStyles: {
        colors: { primary: "#2563eb", background: "#f8fafc" },
        typography: { fontFamily: "Inter, sans-serif" },
      },
      pages: [
        {
          id: "home-page",
          name: "Home",
          title: "Home",
          slug: "",
          isHome: true,
          elements: [
            { id: "h1", type: "heading", level: 1, content: "Welcome to Destinations Corp" },
            { id: "p1", type: "paragraph", content: "Empowering multi-destination publishing." },
            { id: "b1", type: "button", text: "Contact Us", link: "page:contact-page" },
          ],
        },
        {
          id: "contact-page",
          name: "Contact",
          title: "Contact",
          slug: "contact",
          isHome: false,
          elements: [
            { id: "h2", type: "heading", level: 2, content: "Get In Touch" },
            {
              id: "f1",
              type: "form",
              submitButtonText: "Send Message",
              fields: [
                { name: "email", type: "email", label: "Your Email", required: true },
                { name: "msg", type: "textarea", label: "Message", required: true },
              ],
            },
          ],
        },
      ],
      siteParts: {
        header: {
          isEnabled: true,
          elements: [{ id: "nav", type: "heading", level: 3, content: "Destinations Corp Header" }],
        },
        footer: {
          isEnabled: true,
          elements: [{ id: "foot", type: "paragraph", content: "© 2026 Destinations Corp." }],
        },
      },
    };

    await db.website.update({
      where: { id: testWebsite.id },
      data: { editorData: canonicalData },
    });

    // =========================================================================
    // Test 1: Destination Registry supports all required destination types
    // =========================================================================
    const supported = destinationRegistry.getSupportedDestinations();
    const hasInternal = supported.includes("INTERNAL");
    const hasWordpress = supported.includes("WORDPRESS");
    const hasSftp = supported.includes("SFTP");
    const hasStatic = supported.includes("STATIC");

    assert(
      hasInternal && hasWordpress && hasSftp && hasStatic,
      "Test 1: DestinationRegistry supports INTERNAL, WORDPRESS, SFTP, and STATIC destination publishers"
    );

    // =========================================================================
    // Test 2: Destination Registry rejects unknown destination types
    // =========================================================================
    let unsupportedCaught = false;
    try {
      destinationRegistry.getPublisher("UNKNOWN_DESTINATION");
    } catch (e: any) {
      unsupportedCaught = e.statusCode === 400;
    }
    assert(unsupportedCaught, "Test 2: DestinationRegistry strictly rejects unsupported destination types");

    // =========================================================================
    // Test 3: Static Compiler generates deterministic bundle from CanonicalWebsiteData
    // =========================================================================
    const staticBundle = compileCanonicalToStaticBundle(testWebsite.id, 1, canonicalData);
    const filePaths = staticBundle.files.map((f) => f.path);

    const hasIndexHtml = filePaths.includes("index.html");
    const hasContactHtml = filePaths.includes("contact.html");
    const hasStylesCss = filePaths.includes("styles.css");
    const hasRuntimeJs = filePaths.includes("runtime.js");
    const hasManifestJson = filePaths.includes("site-manifest.json");

    assert(
      hasIndexHtml && hasContactHtml && hasStylesCss && hasRuntimeJs && hasManifestJson &&
      staticBundle.pageCount === 2 && staticBundle.totalBytes > 0,
      "Test 3: StaticCompiler generates valid multi-page HTML, CSS, runtime, and manifest bundle"
    );

    // =========================================================================
    // Test 4: Static Compiler preserves HTML navigation links and element rendering
    // =========================================================================
    const indexFile = staticBundle.files.find((f) => f.path === "index.html");
    const contactFile = staticBundle.files.find((f) => f.path === "contact.html");

    const indexContent = String(indexFile?.content || "");
    const contactContent = String(contactFile?.content || "");

    const hasWelcomeHeading = indexContent.includes("Welcome to Destinations Corp");
    const hasMappedLink = indexContent.includes('href="contact.html"');
    const hasContactForm = contactContent.includes('<form');
    const hasHeader = indexContent.includes("Destinations Corp Header");

    assert(
      hasWelcomeHeading && hasMappedLink && hasContactForm && hasHeader,
      "Test 4: Generated HTML strictly preserves semantic tags, siteParts, and inter-page navigation links"
    );

    // =========================================================================
    // Test 5: SFTP Publish fails safely when SFTP configuration is missing
    // =========================================================================
    let sftpConfigMissingCaught = false;
    try {
      await publishWebsite(testWebsite.id, testUser.id, { destinationType: "SFTP" });
    } catch (e: any) {
      sftpConfigMissingCaught = e.statusCode === 400 && e.code === "SFTP_CONFIG_MISSING";
    }
    assert(
      sftpConfigMissingCaught,
      "Test 5: SFTP publish fails with clear validation error when SFTP configuration is missing"
    );

    // =========================================================================
    // Test 6: SFTP Configuration creation and secret protection
    // =========================================================================
    await createOrUpdateSftpConfig(
      testWebsite.id,
      "sftp.forgestudio.test",
      22,
      "deployer",
      "/var/www/forgestudio"
    );
    const sftpConfig = await getSftpConfig(testWebsite.id);

    assert(
      sftpConfig !== null &&
      sftpConfig.host === "sftp.forgestudio.test" &&
      sftpConfig.username === "deployer" &&
      sftpConfig.remotePath === "/var/www/forgestudio" &&
      !(sftpConfig as any).password,
      "Test 6: SFTP configuration saves correctly and never exposes credentials in DTO"
    );

    // =========================================================================
    // Test 7: Production-Safe SFTP Publish calculates REAL file counts (NO fake 42!)
    // =========================================================================
    const sftpPublishResult = await publishWebsite(testWebsite.id, testUser.id, {
      destinationType: "SFTP",
      environment: "PRODUCTION",
    });

    const deployments = await getWebsiteDeployments(testWebsite.id, testUser.id);
    const sftpDeployment = deployments.find((d: any) => d.id === sftpPublishResult.deploymentId);

    // Verify real file count was calculated
    const expectedFilesCount = staticBundle.files.length;
    const actualTransferred = sftpPublishResult.filesTransferred;

    assert(
      sftpPublishResult.success === true &&
      sftpPublishResult.destinationType === "SFTP" &&
      actualTransferred === expectedFilesCount &&
      actualTransferred !== 42 && // Strict Invariant: No fake 42!
      sftpDeployment?.status === "PUBLISHED" &&
      sftpDeployment?.destinationType === "SFTP",
      `Test 7: SFTP publish succeeds with real calculated file count (${actualTransferred} files, not mock 42)`
    );

    // =========================================================================
    // Test 8: syncFilesOverSftp returns real calculated filesTransferred
    // =========================================================================
    const directSync = await syncFilesOverSftp(testWebsite.id, testUser.id);
    assert(
      directSync.success === true &&
      directSync.filesTransferred === expectedFilesCount &&
      directSync.filesTransferred !== 42,
      `Test 8: syncFilesOverSftp returns real calculated file count (${directSync.filesTransferred} files)`
    );

    // =========================================================================
    // Test 9: Static Export Publish generates deployment record & artifact metadata
    // =========================================================================
    const staticPublishResult = await publishWebsite(testWebsite.id, testUser.id, {
      destinationType: "STATIC",
      environment: "PRODUCTION",
    });

    const deploymentsAfterStatic = await getWebsiteDeployments(testWebsite.id, testUser.id);
    const staticDeployment = deploymentsAfterStatic.find((d: any) => d.id === staticPublishResult.deploymentId);

    assert(
      staticPublishResult.success === true &&
      staticPublishResult.destinationType === "STATIC" &&
      staticDeployment?.status === "PUBLISHED" &&
      staticDeployment?.destinationType === "STATIC" &&
      staticDeployment?.metadata?.filesCount === expectedFilesCount,
      "Test 9: Static Export publish creates valid STATIC deployment with bundle metadata"
    );

    // =========================================================================
    // Test 10: Multi-destination deployments maintain monotonic versioning
    // =========================================================================
    // Deployments so far: v1 (SFTP), v2 (STATIC)
    assert(
      sftpDeployment?.version === 1 && staticDeployment?.version === 2,
      "Test 10: Deployments across diverse destinations strictly maintain monotonic versioning (v1 -> v2)"
    );

    // =========================================================================
    // Test 11: Rollback of SFTP deployment creates additive deployment event
    // =========================================================================
    const rollbackResult = await rollbackDeployment(testWebsite.id, sftpDeployment.id, testUser.id);
    const deploymentsAfterRollback = await getWebsiteDeployments(testWebsite.id, testUser.id);

    assert(
      rollbackResult.success === true &&
      rollbackResult.version === 3 &&
      rollbackResult.status === "PUBLISHED" &&
      deploymentsAfterRollback.length === 3,
      "Test 11: Rollback of destination deployment creates new monotonic v3 deployment without deleting history"
    );

    // =========================================================================
    // Test 12: Internal runtime publishing continues working seamlessly alongside new destinations
    // =========================================================================
    const internalPublishResult = await publishWebsite(testWebsite.id, testUser.id, {
      destinationType: "INTERNAL",
      environment: "PRODUCTION",
    });

    const updatedSite = await getWebsiteById(testWebsite.id, testUser.id);
    const rawEditorData =
      typeof updatedSite.editorData === "string"
        ? JSON.parse(updatedSite.editorData)
        : updatedSite.editorData;

    assert(
      internalPublishResult.success === true &&
      internalPublishResult.destinationType === "INTERNAL" &&
      internalPublishResult.version === 4 &&
      rawEditorData.publishedData?.version === 4,
      "Test 12: Internal runtime publisher continues operating with 100% fidelity alongside SFTP/Static"
    );

  } catch (error) {
    console.error("Milestone B test error:", error);
    failed++;
  } finally {
    setSftpClientFactory(null);
    // Teardown
    try {
      if (testWebsite?.id) await db.website.delete({ where: { id: testWebsite.id } });
      if (testUser?.id) await db.user.delete({ where: { id: testUser.id } });
    } catch (_) {}
  }

  console.log("\n=================================================");
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log("=================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runMilestoneBTests();
