import assert from "assert";
import {
  generateAllCodeOutputs,
  buildProjectZipStream,
  optimizeAST,
  applySemanticPass,
  escapeHtml,
  stylesToTailwindClasses,
  generateReactComponentPackage,
} from "../services/codeGenerator.service.js";
import { generateHelloThemeFiles, buildHelloThemeZipStream } from "../services/helloTheme.service.js";

async function runExporterTests() {
  console.log("Starting Universal Component & Code Generation Test Suite (F-745 -> F-755, X-786)...");

  const mockEditorData = {
    version: 1,
    siteSettings: { siteName: "Test Universal Export Portal" },
    pages: [
      {
        id: "p1",
        name: "Home",
        slug: "index",
        isHome: true,
        elements: [
          {
            id: "el_header",
            type: "header",
            name: "SiteHeader",
            tag: "div",
            classes: ["site-header", "bg-white"],
            attributes: {},
            styles: { backgroundColor: "#ffffff", padding: "16px", display: "flex", justifyContent: "space-between" },
            children: [
              {
                id: "el_nav",
                type: "navbar",
                name: "PrimaryNav",
                tag: "div",
                attributes: {},
                children: [
                  { id: "el_logo", type: "text", textContent: "ForgeStudio Brand", attributes: {} },
                ],
              },
            ],
          },
          {
            id: "el_hero",
            type: "hero",
            name: "HeroSection",
            tag: "div",
            attributes: {},
            styles: { padding: "32px", fontSize: "36px", fontWeight: "700" },
            props: { title: "Hero Component Title", subtitle: "Hero Subtitle" },
            children: [
              { id: "el_h1", type: "heading", tag: "h1", textContent: "Welcome to Universal Export Engine", attributes: {} },
              {
                id: "el_img",
                type: "image",
                tag: "img",
                attributes: { src: "https://cdn.example.com/media/banner.jpg", alt: "Hero Banner" },
              },
              { id: "el_btn", type: "button", tag: "button", textContent: "Get Started", interaction: { type: "modal", targetId: "modal1" }, attributes: {} },
              { id: "el_empty_wrapper", type: "container", tag: "div", children: [], attributes: {} },
            ],
          },
        ],
      },
    ],
  };

  // --- 1. F-745: Generated HTML Output & Asset Path Rewriting ---
  console.log("Testing F-745: Generated HTML Output & Asset Path Rewriting...");
  const res = generateAllCodeOutputs(mockEditorData);
  assert.ok(res.html.includes("<!DOCTYPE html>"));
  assert.ok(res.html.includes("Welcome to Universal Export Engine"));
  assert.ok(res.html.includes("./assets/banner.jpg"), "Asset URL must be rewritten to local relative path ./assets/");
  console.log("✓ F-745 Generated HTML Output verified (PASS)");

  // --- 2. F-746: Generated CSS Output & Tailwind Utility Translator ---
  console.log("Testing F-746 & F-754: CSS Output & Tailwind Class Translation...");
  assert.ok(res.css.includes("background-color: #ffffff"));
  assert.ok(res.css.includes("padding: 16px"));

  const twClasses = stylesToTailwindClasses({ display: "flex", justifyContent: "space-between", padding: "16px", fontSize: "36px", fontWeight: "700" });
  assert.ok(twClasses.includes("flex"));
  assert.ok(twClasses.includes("justify-between"));
  assert.ok(twClasses.includes("p-4"));
  assert.ok(twClasses.includes("text-4xl"));
  assert.ok(twClasses.includes("font-bold"));
  console.log("✓ F-746 & F-754 CSS & Tailwind Translation verified (PASS)");

  // --- 3. F-747: Generated JavaScript Output ---
  console.log("Testing F-747: Generated JavaScript Output...");
  assert.ok(res.js.includes("document.addEventListener"));
  assert.ok(res.js.includes("el_btn"));
  assert.ok(!res.js.includes("eval("));
  console.log("✓ F-747 Generated JavaScript Output verified (PASS)");

  // --- 4. F-748: Optimized DOM Output ---
  console.log("Testing F-748: Optimized DOM Output...");
  assert.ok(res.optimizedDomHtml);
  assert.ok(res.stats.optimizedNodes <= res.stats.totalNodes);
  console.log("✓ F-748 Optimized DOM Output verified (PASS)");

  // --- 5. F-749: Semantic HTML Output ---
  console.log("Testing F-749: Semantic HTML Output...");
  assert.ok(res.semanticHtml?.includes("<header"));
  assert.ok(res.semanticHtml?.includes("<nav"));
  assert.ok(res.semanticHtml?.includes("<section"));
  assert.ok(res.semanticHtml?.includes("<h1"));
  assert.ok(res.semanticHtml?.includes("<img"));
  console.log("✓ F-749 Semantic HTML Output verified (PASS)");

  // --- 6. F-750 & F-751: Code Preview & Copy Security ---
  console.log("Testing F-750 & F-751: Code Preview & Copy Security...");
  assert.ok(res.stats.totalNodes > 0);
  assert.ok(res.stats.assetCount >= 1);
  const escaped = escapeHtml("<script>alert(1)</script>");
  assert.strictEqual(escaped, "&lt;script&gt;alert(1)&lt;/script&gt;");
  console.log("✓ F-750 & F-751 Code Preview & Copy Security verified (PASS)");

  // --- 7. F-753 & Component Export: React TSX Generator ---
  console.log("Testing F-753 & Component Export: React TSX Component Packages...");
  const compPkg = generateReactComponentPackage(mockEditorData.pages[0].elements[1] as any);
  assert.strictEqual(compPkg.componentName, "HeroSection");
  assert.ok(compPkg.typesCode.includes("interface HeroSectionProps"));
  assert.ok(compPkg.tsxCode.includes("export const HeroSection: React.FC<HeroSectionProps>"));
  assert.ok(compPkg.cssCode.includes(".herosection-container"));
  assert.ok(compPkg.tailwindJsx.includes("p-6 bg-white"));

  const compZip = await buildProjectZipStream(mockEditorData, "react", "component", "el_hero");
  assert.ok(Buffer.isBuffer(compZip));
  assert.ok(compZip.length > 300);
  console.log("✓ F-753 & Component Export verified (PASS)");

  // --- 8. F-755: Next.js App Router Client Directive ---
  console.log("Testing F-755: Next.js App Router Client Directive Auto-Detection...");
  assert.ok(res.nextJsCode?.pageTsx.includes("'use client'"), "Interactive page must include 'use client' directive");
  console.log("✓ F-755 Next.js App Router Client Directive verified (PASS)");

  // --- 9. F-752: Full Project ZIP Exports ---
  console.log("Testing F-752: Full Project ZIP Exports...");
  const staticZip = await buildProjectZipStream(mockEditorData, "static", "full");
  const nextjsZip = await buildProjectZipStream(mockEditorData, "nextjs", "full");
  assert.ok(staticZip.length > 500);
  assert.ok(nextjsZip.length > 500);
  console.log("✓ F-752 Full Project ZIP Exports verified (PASS)");

  // --- 10. X-786: Hello Theme WordPress Companion ---
  console.log("Testing X-786: Hello Theme WordPress Companion...");
  const themeFiles = generateHelloThemeFiles("Hello ForgeStudio");
  assert.ok(themeFiles.styleCss.includes("Theme Name: Hello ForgeStudio"));
  assert.ok(themeFiles.functionsPhp.includes("hello_forgestudio_setup"));
  const themeZip = await buildHelloThemeZipStream("Hello ForgeStudio");
  assert.ok(themeZip.length > 500);
  console.log("✓ X-786 Hello Theme verified (PASS)");

  // --- 11. SSRF Asset Pipeline Security ---
  console.log("Testing Asset Pipeline SSRF Protection...");
  const { isSafeAssetUrl } = await import("../services/codeGenerator.service.js");
  assert.strictEqual(isSafeAssetUrl("https://images.unsplash.com/photo-1234.webp"), true);
  assert.strictEqual(isSafeAssetUrl("http://127.0.0.1/admin/secret.png"), false);
  assert.strictEqual(isSafeAssetUrl("http://localhost:3000/env.json"), false);
  assert.strictEqual(isSafeAssetUrl("http://169.254.169.254/latest/meta-data"), false);
  assert.strictEqual(isSafeAssetUrl("http://192.168.1.100/internal.png"), false);
  assert.strictEqual(isSafeAssetUrl("http://10.0.0.1/db.sql"), false);
  console.log("✓ SSRF Asset Security verified (PASS)");

  console.log("\n============================================================");
  console.log("ALL UNIVERSAL CODE GENERATOR & EXPORTER TESTS PASSED!");
  console.log("============================================================\n");
}

runExporterTests().catch((err) => {
  console.error("Exporter Test Suite Error:", err);
  process.exit(1);
});

