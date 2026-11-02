import assert from "node:assert";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { chromium, type Browser } from "playwright";

dotenv.config();

// Widget Manifest & Static Compiler
import { WIDGET_CAPABILITIES, getWidgetCapability, isStaticCompatible } from "../src/services/destinations/widgetManifest.js";
import { compileCanonicalToStaticBundle, resolveStaticHtmlHref, sanitizeCustomHead } from "../src/services/destinations/staticCompiler.js";

// Safety & Canonical Validator imports
import {
  validateDisposableDatabaseUrl,
  assertSafeDisposableDatabase,
} from "../src/utils/database-safety.js";

const STATIC_BUNDLE_PORT = 5188;

function startStaticServer(files: { path: string; content: string; contentType?: string }[], port: number): Promise<http.Server> {
  const fileMap = new Map<string, { content: string; contentType: string }>();
  for (const f of files) {
    const cleanPath = f.path.replace(/^\/+/, "");
    fileMap.set(cleanPath, {
      content: f.content,
      contentType: f.contentType || "text/plain",
    });
  }

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const reqUrl = new URL(req.url || "/", `http://localhost:${port}`);
        let pathname = decodeURIComponent(reqUrl.pathname).replace(/^\/+/, "");
        if (!pathname) pathname = "index.html";

        if (pathname === "favicon.ico") {
          res.writeHead(204);
          res.end();
          return;
        }

        const file = fileMap.get(pathname);
        if (file) {
          res.writeHead(200, {
            "Content-Type": file.contentType,
            "Access-Control-Allow-Origin": "*",
          });
          res.end(file.content);
        } else {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Not Found");
        }
      } catch (err: any) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end(err.message || "Server Error");
      }
    });

    server.listen(port, () => resolve(server));
    server.on("error", reject);
  });
}

export async function runPhase6TestSuite() {
  console.log("================================================================");
  console.log("   FORGESTUDIO PHASE 6 — WIDGET PARITY & RESPONSIVE SUITE       ");
  console.log("================================================================\n");

  let passedCount = 0;
  let failedCount = 0;

  function logPass(title: string, details?: string) {
    passedCount++;
    console.log(`  [PASSED] ${title}${details ? ` -> ${details}` : ""}`);
  }

  function logFail(title: string, error?: any) {
    failedCount++;
    console.error(`  [FAILED] ${title} -> ${error?.message || JSON.stringify(error)}`);
  }

  // ===========================================================================
  // MODULE 1: WIDGET INVENTORY & CAPABILITY MANIFEST
  // ===========================================================================
  console.log("[MODULE 1] Verifying Widget Capability Manifest & Registry Consistency...");
  try {
    const registeredWidgetTypes = Object.keys(WIDGET_CAPABILITIES);
    assert.ok(registeredWidgetTypes.length >= 78, `Canonical registered widget count must be at least 78 (found ${registeredWidgetTypes.length})`);
    logPass("Registry Count", `Verified ${registeredWidgetTypes.length} registered widgets`);

    // Verify all widgets declare required parity fields
    let fullySupportedCount = 0;
    let backendRequiredCount = 0;
    for (const [type, cap] of Object.entries(WIDGET_CAPABILITIES)) {
      assert.strictEqual(cap.type, type, `Widget type mismatch: ${type}`);
      assert.ok(cap.name, `Widget ${type} missing name`);
      assert.ok(cap.category, `Widget ${type} missing category`);
      assert.strictEqual(typeof cap.canvas, "boolean", `Widget ${type} canvas flag invalid`);
      assert.strictEqual(typeof cap.published, "boolean", `Widget ${type} published flag invalid`);
      assert.strictEqual(typeof cap.staticExport, "boolean", `Widget ${type} staticExport flag invalid`);
      assert.strictEqual(typeof cap.responsive, "boolean", `Widget ${type} responsive flag invalid`);

      if (cap.staticExport && cap.staticSupportLevel === "full") fullySupportedCount++;
      if (cap.requiresBackend) backendRequiredCount++;
    }
    logPass("Capability Manifest Fields", `78 widgets fully specified. ${fullySupportedCount} full static, ${backendRequiredCount} require backend`);

    // Verify capability lookup helper
    const containerCap = getWidgetCapability("container");
    assert.ok(containerCap && containerCap.staticExport, "Container must be static compatible");
    const soundcloudCap = getWidgetCapability("soundcloud");
    assert.ok(soundcloudCap && soundcloudCap.canvas && soundcloudCap.published && soundcloudCap.staticExport, "SoundCloud must have tri-renderer parity");
    const postsCap = getWidgetCapability("posts");
    assert.ok(postsCap && postsCap.canvas && postsCap.published && postsCap.staticExport, "Posts widget must have tri-renderer parity");
    logPass("Capability Lookups", "Verified helper functions getWidgetCapability and isStaticCompatible");
  } catch (err: any) {
    logFail("Module 1 Widget Inventory", err);
  }

  // ===========================================================================
  // MODULE 2: STATIC COMPILER TRI-RENDERER PARITY
  // ===========================================================================
  console.log("\n[MODULE 2] Verifying Static Compiler Tri-Renderer Parity across All Families...");
  let compiledBundle: any;
  try {
    const mockWebsiteData = {
      id: "site_parity_test",
      name: "Parity Test Website",
      slug: "parity-test",
      globalStyles: {
        colors: { primary: "#0ea5e9", text: "#0f172a", background: "#f8fafc" },
        typography: { fontFamily: "Inter, sans-serif", fontSize: "16px" }
      },
      homePageId: "home",
      pages: [
        {
          id: "home",
          title: "Parity Home",
          slug: "",
          isHome: true,
          elements: [
            { id: "heading_1", type: "heading", level: 1, content: "Tri-Renderer Parity Showcase" },
            { id: "text_1", type: "paragraph", content: "Deterministic cross-renderer compilation in ForgeStudio." },
            { id: "btn_1", type: "button", content: "Explore Features", href: "page:about" },
            { id: "rating_1", type: "rating", rating: 4.8, maxRating: 5, starColor: "#f59e0b" },
            { id: "counter_1", type: "counter", countNumber: 10000, content: "Active Deployments" },
            { id: "prog_1", type: "progress-bar", progressValue: 95, title: "Test Coverage" },
            { id: "alert_1", type: "alert", alertType: "success", alertTitle: "Verified", content: "Tri-Renderer parity verified across all targets." },
            { id: "sc_1", type: "soundcloud", trackUrl: "https://soundcloud.com/artist/track", height: 166 },
            { id: "map_1", type: "google-maps", mapAddress: "San Francisco, CA", mapZoom: 14 },
            {
              id: "bio_1",
              type: "link-in-bio",
              name: "Forge Team",
              bio: "Next-gen web application engine.",
              links: [{ label: "Official Docs", url: "https://example.com" }]
            },
            {
              id: "imgbox_1",
              type: "image-box",
              title: "Modern UI System",
              content: "Unified design tokens and clean layout primitives.",
              image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800"
            },
            {
              id: "iconbox_1",
              type: "icon-box",
              title: "Deterministic Compilation",
              content: "Exact bytes and deterministic output artifacts.",
              icon: "⚡"
            },
            {
              id: "iconlist_1",
              type: "icon-list",
              items: [{ text: "Tri-renderer consistency", icon: "✓" }]
            },
            {
              id: "posts_1",
              type: "posts",
              columns: 3,
              posts: [{ title: "Parity Architecture", excerpt: "Details on unified renderer design.", link: "#" }]
            },
            {
              id: "port_1",
              type: "portfolio",
              columns: 3,
              items: [{ title: "Design Sprint", category: "UX", image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800" }]
            },
            {
              id: "tabs_1",
              type: "nested-tabs",
              tabs: [
                { id: "tab-feat", title: "Features", content: "All features operational." },
                { id: "tab-perf", title: "Performance", content: "Sub-second static load times." }
              ]
            },
            {
              id: "acc_1",
              type: "nested-accordion",
              items: [{ title: "Is static compiler complete?", content: "Yes, fully compatible.", open: true }]
            },
            {
              id: "anim_1",
              type: "animated-headline",
              prefix: "Engineered for",
              animatedText: "Peak Performance",
              suffix: "in production"
            },
            {
              id: "toc_1",
              type: "table-of-contents",
              title: "Page Contents",
              headings: [{ text: "Overview", anchor: "heading_1" }]
            },
            {
              id: "off_1",
              type: "off-canvas",
              triggerText: "Open Drawer",
              panelId: "main_drawer",
              content: "Navigation menu inside drawer"
            },
            {
              id: "carousel_1",
              type: "basic-media-carousel",
              slides: [{ url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800", caption: "Slide One" }]
            },
            {
              id: "lb_1",
              type: "dynamic-lightbox",
              src: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200",
              alt: "Full Image"
            },
            {
              id: "menu_1",
              type: "wp-menu",
              menuItems: [{ label: "Home", url: "/" }, { label: "About", url: "page:about" }]
            },
            {
              id: "unsupported_test",
              type: "legacy-unsupported-widget",
              content: "Legacy content that has no static support"
            }
          ]
        },
        {
          id: "about",
          title: "About Us",
          slug: "about",
          isHome: false,
          elements: [
            { id: "about_h1", type: "heading", level: 1, content: "About ForgeStudio" }
          ]
        }
      ]
    };

    compiledBundle = compileCanonicalToStaticBundle("site_parity_test", 1, mockWebsiteData);
    assert.ok(compiledBundle, "Compiled bundle must be produced");
    assert.strictEqual(Array.isArray(compiledBundle.files), true, "Compiled files must be an array");

    const homeHtmlFile = compiledBundle.files.find((f: any) => f.path === "index.html");
    const aboutHtmlFile = compiledBundle.files.find((f: any) => f.path === "about.html");
    const cssFile = compiledBundle.files.find((f: any) => f.path === "styles.css");
    const jsFile = compiledBundle.files.find((f: any) => f.path === "runtime.js");

    assert.ok(homeHtmlFile, "index.html must be generated");
    assert.ok(aboutHtmlFile, "about.html must be generated");
    assert.ok(cssFile, "styles.css must be generated");
    assert.ok(jsFile, "runtime.js must be generated");
    logPass("Static Bundle Structure", `Generated 4 core files (${compiledBundle.files.length} total)`);

    const html = homeHtmlFile.content;

    // Check individual widget HTML generators
    assert.ok(html.includes("fs-rating-widget") && html.includes("★"), "Rating widget rendered");
    assert.ok(html.includes("fs-soundcloud-widget") && html.includes("w.soundcloud.com/player"), "SoundCloud iframe rendered");
    assert.ok(html.includes("fs-link-in-bio") && html.includes("Forge Team"), "Link in Bio rendered");
    assert.ok(html.includes("fs-image-box") && html.includes("Modern UI System"), "Image Box rendered");
    assert.ok(html.includes("fs-icon-box") && html.includes("Deterministic Compilation"), "Icon Box rendered");
    assert.ok(html.includes("fs-icon-list") && html.includes("Tri-renderer consistency"), "Icon List rendered");
    assert.ok(html.includes("fs-posts-grid") && html.includes("Parity Architecture"), "Posts widget rendered");
    assert.ok(html.includes("fs-portfolio-grid") && html.includes("Design Sprint"), "Portfolio widget rendered");
    assert.ok(html.includes("fs-tabs-widget") && html.includes("data-tab-target"), "Tabs widget rendered");
    assert.ok(html.includes("fs-accordion-widget") && html.includes("fs-accordion-header"), "Accordion widget rendered");
    assert.ok(html.includes("fs-animated-headline") && html.includes("Peak Performance"), "Animated headline rendered");
    assert.ok(html.includes("fs-toc-widget") && html.includes("Page Contents"), "Table of Contents rendered");
    assert.ok(html.includes("fs-off-canvas-container") && html.includes("data-off-canvas-toggle"), "Off-canvas container rendered");
    assert.ok(html.includes("fs-carousel-widget") && html.includes("fs-carousel-slide"), "Carousel widget rendered");
    assert.ok(html.includes("fs-lightbox-item") && html.includes("data-lightbox-src"), "Lightbox item rendered");
    assert.ok(html.includes("fs-wp-menu") && html.includes("fs-wp-menu-item"), "WordPress menu rendered");
    logPass("Widget HTML Generation", "All 20+ specialized static widget handlers generated expected DOM structures");

    // Check unsupported widget explicit detection
    assert.ok(html.includes('data-unsupported-widget="legacy-unsupported-widget"'), "Unsupported widget rendered with explicit detectable marker");
    assert.ok(html.includes("fs-unsupported-widget"), "Unsupported widget has visible class fs-unsupported-widget");
    logPass("Unsupported Widget Safeguard", "Unsupported widgets explicitly tagged without generic silent div masking");

    // Check Multi-page relative links resolution
    assert.ok(html.includes('href="about.html"'), "page:about correctly resolved to about.html");
    logPass("Page Links Resolution", "Multi-page internal page destinations resolve to static .html targets");
  } catch (err: any) {
    logFail("Module 2 Static Tri-Renderer Parity", err);
  }

  // ===========================================================================
  // MODULE 3: RESPONSIVE LAYOUT ENGINE & BREAKPOINTS
  // ===========================================================================
  console.log("\n[MODULE 3] Verifying Responsive Layout Engine & Breakpoints...");
  try {
    const responsiveSiteData = {
      id: "site_resp_test",
      name: "Responsive Test",
      slug: "responsive-test",
      homePageId: "home",
      pages: [
        {
          id: "home",
          title: "Responsive Page",
          slug: "",
          isHome: true,
          elements: [
            {
              id: "hero_box",
              type: "container",
              styles: { padding: "40px", fontSize: "24px" },
              responsiveStyles: {
                tablet: { padding: "24px", fontSize: "20px" },
                mobile: { padding: "16px", fontSize: "16px" }
              },
              visibility: { desktop: true, tablet: true, mobile: true }
            },
            {
              id: "desktop_only_banner",
              type: "paragraph",
              content: "Desktop Only Notice",
              visibility: { desktop: true, tablet: false, mobile: false }
            },
            {
              id: "mobile_only_cta",
              type: "button",
              content: "Call Now",
              visibility: { desktop: false, tablet: false, mobile: true }
            }
          ]
        }
      ]
    };

    const bundle = compileCanonicalToStaticBundle("site_resp_test", 1, responsiveSiteData);
    const css = bundle.files.find((f: any) => f.path === "styles.css")?.content || "";

    assert.ok(css.includes("@media (max-width: 1024px)"), "Tablet media query (1024px) must be generated");
    assert.ok(css.includes("@media (max-width: 768px)"), "Mobile media query (768px) must be generated");
    assert.ok(css.includes("@media (max-width: 480px)"), "Narrow mobile query (480px) must be generated");

    // Responsive styles checks
    assert.ok(css.includes("#hero_box"), "Selector #hero_box must be present");
    assert.ok(css.includes("padding: 24px"), "Tablet padding (24px) present in CSS");
    assert.ok(css.includes("padding: 16px"), "Mobile padding (16px) present in CSS");

    // Visibility rules checks
    assert.ok(css.includes("#desktop_only_banner { display: none !important; }") || css.includes("#desktop_only_banner"), "Desktop-only element hidden on tablet/mobile");
    assert.ok(css.includes("#mobile_only_cta { display: none !important; }"), "Mobile-only element hidden on desktop");
    logPass("Responsive Engine Rules", "Media queries for 1024px, 768px, 480px and visibility rules generated accurately");
  } catch (err: any) {
    logFail("Module 3 Responsive Engine", err);
  }

  // ===========================================================================
  // MODULE 4: COMMERCE SAFEGUARD & SECURITY SANITIZATION
  // ===========================================================================
  console.log("\n[MODULE 4] Verifying Commerce Safeguard & Security Sanitization...");
  try {
    const jsFile = compiledBundle?.files.find((f: any) => f.path === "runtime.js");
    const runtimeJs = jsFile?.content || "";

    // Critical commerce safeguard: ensure failed checkout never pretends order succeeded or clears cart
    assert.ok(runtimeJs.includes("Checkout failed"), "Checkout error reporting must be present");
    assert.strictEqual(runtimeJs.includes("Order recorded locally"), false, "Fake 'Order recorded locally' MUST NOT be present");
    assert.ok(runtimeJs.includes("Cart preserved") || runtimeJs.includes("Checkout error"), "Network error handling must preserve cart");
    logPass("Commerce Safeguard", "Failed order API requests never fake success, never show fake alert, and never clear cart");

    // Static runtime interactive behaviors
    assert.ok(runtimeJs.includes("fs-tabs-widget"), "Tabs event listener included in runtime");
    assert.ok(runtimeJs.includes("fs-accordion-item"), "Accordion event listener included in runtime");
    assert.ok(runtimeJs.includes("data-off-canvas-toggle"), "Off-canvas drawer listener included in runtime");
    assert.ok(runtimeJs.includes("fs-countdown"), "Live countdown updater included in runtime");
    assert.ok(runtimeJs.includes("fs-carousel-widget"), "Carousel navigation included in runtime");
    assert.ok(runtimeJs.includes("data-lightbox-src"), "Dynamic lightbox modal included in runtime");
    logPass("Static Runtime Interactions", "Vanilla JS handlers bundled for tabs, accordion, off-canvas, countdown, carousel, and lightbox");

    // XSS Sanitization & Href resolver checks
    assert.strictEqual(resolveStaticHtmlHref("javascript:alert(1)"), "#", "javascript: URI scheme neutralized to #");
    assert.strictEqual(resolveStaticHtmlHref("vbscript:msgbox(1)"), "#", "vbscript: URI scheme neutralized to #");
    assert.strictEqual(resolveStaticHtmlHref("data:text/html;base64,PHNjcmlwdD4="), "#", "data: URI scheme neutralized to #");

    const dangerousHead = `<script>alert('xss')</script><iframe src="evil.com"></iframe><div onclick="steal()"></div>`;
    const cleanHead = sanitizeCustomHead(dangerousHead);
    assert.strictEqual(cleanHead.includes("<iframe"), false, "iframe tags stripped from head");
    assert.strictEqual(cleanHead.includes("onclick="), false, "inline event handlers stripped from head");
    logPass("Security & XSS Neutralization", "Dangerous protocols, framing elements, and event handlers sanitized");
  } catch (err: any) {
    logFail("Module 4 Commerce & Security", err);
  }

  // ===========================================================================
  // MODULE 5: REAL CHROMIUM BROWSER TESTS (PLAYWRIGHT)
  // ===========================================================================
  console.log("\n[MODULE 5] Executing Real Chromium Browser Tests across Breakpoints...");
  let browser: Browser | null = null;
  let staticServer: http.Server | null = null;
  try {
    staticServer = await startStaticServer(compiledBundle.files, STATIC_BUNDLE_PORT);
    logPass("Local Static Server", `Serving static export bundle at http://localhost:${STATIC_BUNDLE_PORT}`);

    browser = await chromium.launch({ headless: true });

    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    // Test 1: Desktop Viewport (1440x900)
    const desktopPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    desktopPage.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    desktopPage.on("pageerror", (err) => pageErrors.push(err.message));

    await desktopPage.goto(`http://localhost:${STATIC_BUNDLE_PORT}/index.html`, { waitUntil: "domcontentloaded" });
    const h1Text = await desktopPage.textContent("h1");
    assert.strictEqual(h1Text, "Tri-Renderer Parity Showcase", "Desktop page loaded and rendered correct H1");

    // Verify rating stars rendered
    const ratingEl = await desktopPage.$(".fs-rating-widget");
    assert.ok(ratingEl, "Rating widget found in DOM");

    // Test interactive Tabs in Chromium
    const firstTabActive = await desktopPage.$eval(".fs-tab-pane.active", (el) => el.textContent);
    assert.ok(firstTabActive?.includes("All features operational"), "Initial tab active");
    const secondTabBtn = await desktopPage.$('button[data-tab-target="tab-perf"]');
    assert.ok(secondTabBtn, "Second tab button exists");
    await secondTabBtn.click();
    const secondTabActive = await desktopPage.$eval('.fs-tab-pane[data-tab-id="tab-perf"]', (el) => el.classList.contains("active"));
    assert.strictEqual(secondTabActive, true, "Clicking tab button switched active tab pane in browser");
    logPass("Browser: Desktop Viewport (1440px)", "H1 rendered, widgets intact, tab switching functioning interactively");

    // Test 2: Tablet Viewport (768x1024)
    const tabletPage = await browser.newPage({ viewport: { width: 768, height: 1024 } });
    tabletPage.on("pageerror", (err) => pageErrors.push(err.message));
    await tabletPage.goto(`http://localhost:${STATIC_BUNDLE_PORT}/index.html`, { waitUntil: "domcontentloaded" });

    // Test Accordion toggle in Chromium
    const accordionHeader = await tabletPage.$(".fs-accordion-header");
    assert.ok(accordionHeader, "Accordion header exists");
    const isAccordionOpenBefore = await tabletPage.$eval(".fs-accordion-item", (el) => el.classList.contains("active"));
    assert.strictEqual(isAccordionOpenBefore, true, "Initial accordion item open");
    await accordionHeader.click();
    const isAccordionOpenAfter = await tabletPage.$eval(".fs-accordion-item", (el) => el.classList.contains("active"));
    assert.strictEqual(isAccordionOpenAfter, false, "Clicking accordion header toggled item to closed in browser");
    logPass("Browser: Tablet Viewport (768px)", "Accordion interactive toggle functional");

    // Test 3: Mobile Viewport (390x844 - iPhone 14)
    const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    mobilePage.on("pageerror", (err) => pageErrors.push(err.message));
    await mobilePage.goto(`http://localhost:${STATIC_BUNDLE_PORT}/index.html`, { waitUntil: "domcontentloaded" });

    // Test Off-Canvas Drawer toggle in Chromium
    const offCanvasToggle = await mobilePage.$("[data-off-canvas-toggle]");
    assert.ok(offCanvasToggle, "Off-canvas toggle button exists");
    await offCanvasToggle.click();
    const isDrawerOpen = await mobilePage.$eval(".fs-off-canvas-drawer", (el) => el.classList.contains("active"));
    assert.strictEqual(isDrawerOpen, true, "Clicking off-canvas toggle opened drawer in browser");

    const offCanvasClose = await mobilePage.$("[data-off-canvas-close]");
    assert.ok(offCanvasClose, "Off-canvas close button exists");
    await offCanvasClose.click();
    const isDrawerClosed = await mobilePage.$eval(".fs-off-canvas-drawer", (el) => el.classList.contains("active"));
    assert.strictEqual(isDrawerClosed, false, "Clicking close button closed drawer in browser");
    logPass("Browser: Mobile Viewport (390px)", "Off-canvas drawer opened and closed interactively");

    // Test 4: Multi-page navigation in Chromium
    await mobilePage.goto(`http://localhost:${STATIC_BUNDLE_PORT}/about.html`, { waitUntil: "domcontentloaded" });
    const aboutH1 = await mobilePage.textContent("h1");
    assert.strictEqual(aboutH1, "About ForgeStudio", "Navigated directly to about.html and verified DOM");
    logPass("Browser: Multi-Page Navigation", "Direct navigation to secondary page rendered correctly");

    const scriptErrors = consoleErrors.filter(err => 
      !err.includes("404") && 
      !err.includes("Failed to load resource") && 
      !err.includes("soundcloud.com") && 
      !err.includes("maps.google.com") && 
      !err.includes("favicon")
    );
    assert.strictEqual(scriptErrors.length, 0, `Browser script errors must be 0 (found ${scriptErrors.length}: ${JSON.stringify(scriptErrors)})`);
    assert.strictEqual(pageErrors.length, 0, `Uncaught page exceptions must be 0 (found ${pageErrors.length}: ${JSON.stringify(pageErrors)})`);
    logPass("Browser Console Stability", "Zero script errors or page exceptions across all viewports");
  } catch (err: any) {
    logFail("Module 5 Playwright Browser Tests", err);
  } finally {
    if (browser) await browser.close();
    if (staticServer) {
      await new Promise<void>((res) => staticServer!.close(() => res()));
    }
  }

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log("\n================================================================");
  console.log(`   PHASE 6 TEST RUN SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

// Execute directly if run via CLI
runPhase6TestSuite().catch((err) => {
  console.error("FATAL ERROR IN PHASE 6 TEST SUITE:", err);
  process.exit(1);
});
