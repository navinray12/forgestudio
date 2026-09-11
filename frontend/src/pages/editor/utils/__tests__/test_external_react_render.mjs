import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exportCode, generateJSCode, generateTSCode } from "../codeExporter.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function renderExportedComponent(element, tempName) {
  const jsxCode = exportCode(element, "jsx");
  const transpiled = ts.transpileModule(jsxCode, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
    },
  });

  const tempModulePath = path.join(__dirname, `temp_${tempName}.mjs`);
  fs.writeFileSync(tempModulePath, transpiled.outputText, "utf8");

  try {
    const importedModule = await import(`file://${tempModulePath}?t=${Date.now()}`);
    const Component = importedModule.default;
    const htmlOutput = renderToStaticMarkup(React.createElement(Component));
    return { htmlOutput, jsxCode };
  } finally {
    try { fs.unlinkSync(tempModulePath); } catch {}
  }
}

async function runAllExternalVerificationTests() {
  console.log("============================================================");
  console.log("FORGESTUDIO EXTERNAL RUNTIME VERIFICATION SUITE");
  console.log("Testing generated code in clean external React 19 environment");
  console.log("============================================================\n");

  let totalAssertions = 0;
  let passedAssertions = 0;

  function assert(label, condition) {
    totalAssertions++;
    if (condition) {
      console.log(`  [PASS] ${label}`);
      passedAssertions++;
    } else {
      console.error(`  [FAIL] ${label}`);
    }
  }

  // ------------------------------------------------------------------
  // TEST A: Blog Posts (with multiple real configured posts)
  // ------------------------------------------------------------------
  console.log("--- TEST A: Blog Posts (Multiple Real Configured Posts) ---");
  const blogElement = {
    id: "posts-live-test",
    type: "posts",
    content: "Blog Posts",
    postsColumns: 3,
    postsGap: 24,
    postsImageHeight: "220px",
    postsAlignment: "left",
    postsShowImage: true,
    postsShowDate: true,
    postsShowExcerpt: true,
    postsShowReadMore: true,
    posts: [
      {
        id: "post-1",
        title: "Mastering React Server Components",
        excerpt: "An in-depth guide to modern React 19 architecture and streaming SSR.",
        image: "https://images.unsplash.com/photo-react-server-comp",
        author: "Navin Ray",
        date: "March 15, 2026",
        category: "Architecture",
        link: "https://forgestudio.io/blog/react-server-components",
        readMoreText: "Read In-Depth",
      },
      {
        id: "post-2",
        title: "Zero-Runtime CSS in Modern Web Apps",
        excerpt: "Exploring performance wins with compile-time styling solutions.",
        image: "https://images.unsplash.com/photo-modern-css",
        author: "Sarah Jenkins",
        date: "April 02, 2026",
        category: "Performance",
        link: "https://forgestudio.io/blog/zero-runtime-css",
        readMoreText: "Explore Styling",
      },
      {
        id: "post-3",
        title: "AI-Powered Visual Canvas Engineering",
        excerpt: "Building high-performance interactive visual editors for the web.",
        image: "https://images.unsplash.com/photo-visual-canvas",
        author: "Alex Rivera",
        date: "May 20, 2026",
        category: "Design Systems",
        link: "https://forgestudio.io/blog/canvas-engineering",
        readMoreText: "Discover More",
      },
    ],
  };

  const blogResult = await renderExportedComponent(blogElement, "blog_posts");
  assert("Blog Posts HTML contains Post 1 title", blogResult.htmlOutput.includes("Mastering React Server Components"));
  assert("Blog Posts HTML contains Post 2 title", blogResult.htmlOutput.includes("Zero-Runtime CSS in Modern Web Apps"));
  assert("Blog Posts HTML contains Post 3 title", blogResult.htmlOutput.includes("AI-Powered Visual Canvas Engineering"));
  assert("Blog Posts HTML contains Post 1 author", blogResult.htmlOutput.includes("Navin Ray"));
  assert("Blog Posts HTML contains Post 2 author", blogResult.htmlOutput.includes("Sarah Jenkins"));
  assert("Blog Posts HTML contains Post 3 author", blogResult.htmlOutput.includes("Alex Rivera"));
  assert("Blog Posts HTML contains Post 1 date", blogResult.htmlOutput.includes("March 15, 2026"));
  assert("Blog Posts HTML contains Post 2 date", blogResult.htmlOutput.includes("April 02, 2026"));
  assert("Blog Posts HTML contains Post 3 date", blogResult.htmlOutput.includes("May 20, 2026"));
  assert("Blog Posts HTML contains Post 1 category", blogResult.htmlOutput.includes("Architecture"));
  assert("Blog Posts HTML contains Post 2 category", blogResult.htmlOutput.includes("Performance"));
  assert("Blog Posts HTML contains Post 3 category", blogResult.htmlOutput.includes("Design Systems"));
  assert("Blog Posts HTML contains Post 1 image src", blogResult.htmlOutput.includes("https://images.unsplash.com/photo-react-server-comp"));
  assert("Blog Posts HTML contains Post 2 image src", blogResult.htmlOutput.includes("https://images.unsplash.com/photo-modern-css"));
  assert("Blog Posts HTML contains Post 3 image src", blogResult.htmlOutput.includes("https://images.unsplash.com/photo-visual-canvas"));
  assert("Blog Posts HTML contains Post 1 button link", blogResult.htmlOutput.includes("https://forgestudio.io/blog/react-server-components"));
  assert("Blog Posts HTML contains Post 2 button link", blogResult.htmlOutput.includes("https://forgestudio.io/blog/zero-runtime-css"));
  assert("Blog Posts HTML contains Post 3 button link", blogResult.htmlOutput.includes("https://forgestudio.io/blog/canvas-engineering"));
  assert("Blog Posts HTML is NOT a plain shell", !blogResult.htmlOutput.match(/^<div[^>]*>Blog Posts<\/div>$/));

  // ------------------------------------------------------------------
  // TEST B: Animated Headline (Interactive / Animation Regression Test)
  // ------------------------------------------------------------------
  console.log("\n--- TEST B: Animated Headline (Live Hooks & Animation) ---");
  const headlineElement = {
    id: "headline-test",
    type: "animated-headline",
    content: "Animated Headline",
    headlinePrefix: "Design Interfaces That",
    headlineAnimatedTexts: ["Inspire Users", "Convert Visitors", "Scale Globally"],
    headlineSuffix: "Without Code Bloat",
    headlineAnimationType: "typing",
    headlineHighlightColor: "#7c3aed",
    headlineHighlightBg: "#ede9fe",
    headlineTag: "h1",
  };

  const headlineResult = await renderExportedComponent(headlineElement, "animated_headline");
  assert("Animated Headline HTML contains H1 tag", headlineResult.htmlOutput.startsWith("<h1"));
  assert("Animated Headline HTML contains prefix text", headlineResult.htmlOutput.includes("Design Interfaces That"));
  assert("Animated Headline HTML contains suffix text", headlineResult.htmlOutput.includes("Without Code Bloat"));
  assert("Animated Headline JSX contains useState hook", headlineResult.jsxCode.includes("useState("));
  assert("Animated Headline JSX contains useEffect hook", headlineResult.jsxCode.includes("useEffect("));
  assert("Animated Headline preserves custom highlight color", headlineResult.jsxCode.includes("#7c3aed"));

  // ------------------------------------------------------------------
  // TEST C: Nested Container (Arbitrary Recursive Children)
  // ------------------------------------------------------------------
  console.log("\n--- TEST C: Nested Container with Heading, Image, and Buttons ---");
  const containerElement = {
    id: "hero-container",
    type: "container",
    content: "",
    styles: { backgroundColor: "#0f172a", padding: "48px 24px", borderRadius: "20px" },
    layout: { direction: "column", gap: 20, alignItems: "center" },
    children: [
      {
        id: "hero-h1",
        type: "heading",
        content: "Build High-Performance Applications",
        headingLevel: "h1",
        styles: { color: "#ffffff", fontSize: "42px" },
      },
      {
        id: "hero-subtext",
        type: "text",
        content: "Accelerate your development cycle with our extensible visual architecture.",
        styles: { color: "#94a3b8", fontSize: "18px" },
      },
      {
        id: "hero-image",
        type: "image",
        content: "",
        src: "https://images.unsplash.com/photo-hero-banner",
        alt: "Application Showcase Dashboard",
        styles: { width: "100%", maxHeight: "380px", borderRadius: "12px" },
      },
      {
        id: "cta-group",
        type: "container",
        content: "",
        layout: { direction: "row", gap: 16, justifyContent: "center" },
        children: [
          {
            id: "btn-primary",
            type: "button",
            content: "Start Building Free",
            href: "https://forgestudio.io/signup",
            styles: { backgroundColor: "#3b82f6", color: "#ffffff" },
          },
          {
            id: "btn-secondary",
            type: "button",
            content: "View Live Documentation",
            href: "https://forgestudio.io/docs",
            styles: { backgroundColor: "transparent", color: "#ffffff" },
          },
        ],
      },
    ],
  };

  const containerResult = await renderExportedComponent(containerElement, "nested_container");
  assert("Nested Container HTML contains H1 tag", containerResult.htmlOutput.includes("<h1"));
  assert("Nested Container HTML contains heading text", containerResult.htmlOutput.includes("Build High-Performance Applications"));
  assert("Nested Container HTML contains paragraph text", containerResult.htmlOutput.includes("Accelerate your development cycle"));
  assert("Nested Container HTML contains <img> tag with src", containerResult.htmlOutput.includes('src="https://images.unsplash.com/photo-hero-banner"'));
  assert("Nested Container HTML contains primary button with href", containerResult.htmlOutput.includes('href="https://forgestudio.io/signup"'));
  assert("Nested Container HTML contains secondary button with href", containerResult.htmlOutput.includes('href="https://forgestudio.io/docs"'));
  assert("Nested Container HTML contains nested child container", containerResult.htmlOutput.includes("display:flex"));

  // ------------------------------------------------------------------
  // TEST D: Data-Driven Pricing Table
  // ------------------------------------------------------------------
  console.log("\n--- TEST D: Data-Driven Pricing Table ---");
  const pricingElement = {
    id: "pricing-test",
    type: "price-table",
    content: "Price Table",
    pricingColumns: 3,
    pricingPlans: [
      {
        id: "p1",
        name: "Developer",
        price: "$0",
        period: "/ month",
        description: "Everything you need to experiment and prototype.",
        isPopular: false,
        buttonText: "Get Started Free",
        buttonUrl: "https://forgestudio.io/free",
        features: [
          { id: "f1", text: "1 Active Project", included: true },
          { id: "f2", text: "Community Support", included: true },
          { id: "f3", text: "Custom Domains", included: false },
        ],
      },
      {
        id: "p2",
        name: "Pro Studio",
        price: "$49",
        period: "/ month",
        description: "Full power for teams building production websites.",
        isPopular: true,
        badgeText: "MOST POPULAR",
        buttonText: "Upgrade to Pro",
        buttonUrl: "https://forgestudio.io/pro",
        features: [
          { id: "f4", text: "Unlimited Projects", included: true },
          { id: "f5", text: "Priority Support", included: true },
          { id: "f6", text: "Full Code Export", included: true },
        ],
      },
    ],
  };

  const pricingResult = await renderExportedComponent(pricingElement, "pricing_table");
  assert("Pricing Table HTML contains Developer plan", pricingResult.htmlOutput.includes("Developer"));
  assert("Pricing Table HTML contains Pro Studio plan", pricingResult.htmlOutput.includes("Pro Studio"));
  assert("Pricing Table HTML contains $0 price", pricingResult.htmlOutput.includes("$0"));
  assert("Pricing Table HTML contains $49 price", pricingResult.htmlOutput.includes("$49"));
  assert("Pricing Table HTML contains MOST POPULAR badge", pricingResult.htmlOutput.includes("MOST POPULAR"));
  assert("Pricing Table HTML contains features list", pricingResult.htmlOutput.includes("Full Code Export"));

  // ------------------------------------------------------------------
  // TEST E: Interactive Flip Box
  // ------------------------------------------------------------------
  console.log("\n--- TEST E: Interactive Flip Box ---");
  const flipElement = {
    id: "flip-test",
    type: "flip-box",
    content: "Flip Box",
    flipCardHeight: "320px",
    flipFrontTitle: "Discover Modern UI",
    flipFrontDescription: "Hover or tap to reveal hidden specifications.",
    flipBackTitle: "Engineered for Velocity",
    flipBackDescription: "Pure reactive state with 60 FPS CSS transforms.",
    flipBackBtnText: "Explore Architecture",
    flipBackBtnUrl: "https://forgestudio.io/specs",
  };

  const flipResult = await renderExportedComponent(flipElement, "flip_box");
  assert("Flip Box JSX contains useState for interaction", flipResult.jsxCode.includes("useState("));
  assert("Flip Box HTML contains front title", flipResult.htmlOutput.includes("Discover Modern UI"));
  assert("Flip Box HTML contains back title", flipResult.htmlOutput.includes("Engineered for Velocity"));
  assert("Flip Box HTML contains back button link", flipResult.htmlOutput.includes('href="https://forgestudio.io/specs"'));
  assert("Flip Box HTML contains 3D transform preserve-3d style", flipResult.htmlOutput.includes("preserve-3d"));

  // ------------------------------------------------------------------
  // TEST F: Animated/Stateful Countdown Timer
  // ------------------------------------------------------------------
  console.log("\n--- TEST F: Animated/Stateful Countdown Timer ---");
  const countdownElement = {
    id: "countdown-test",
    type: "countdown",
    content: "Countdown",
    countdownTargetDate: "2026-12-31T23:59:59",
    countdownShowDays: true,
    countdownShowHours: true,
    countdownShowMinutes: true,
    countdownShowSeconds: true,
  };

  const countdownResult = await renderExportedComponent(countdownElement, "countdown_timer");
  assert("Countdown JSX contains setInterval effect", countdownResult.jsxCode.includes("setInterval("));
  assert("Countdown JSX contains target date", countdownResult.jsxCode.includes("2026-12-31T23:59:59"));
  assert("Countdown HTML contains Days label", countdownResult.htmlOutput.includes("Days"));
  assert("Countdown HTML contains Hours label", countdownResult.htmlOutput.includes("Hours"));
  assert("Countdown HTML contains Minutes label", countdownResult.htmlOutput.includes("Minutes"));
  assert("Countdown HTML contains Seconds label", countdownResult.htmlOutput.includes("Seconds"));

  // ------------------------------------------------------------------
  // TEST G: Portfolio Grid with Assets & Images
  // ------------------------------------------------------------------
  console.log("\n--- TEST G: Portfolio Grid with Assets & Images ---");
  const portfolioElement = {
    id: "portfolio-test",
    type: "portfolio",
    content: "Portfolio Grid",
    portfolioColumns: 2,
    portfolioItems: [
      {
        id: "proj-1",
        title: "FinTech Cloud Platform",
        category: "Web App",
        image: "https://images.unsplash.com/photo-fintech",
        link: "https://forgestudio.io/projects/fintech",
      },
      {
        id: "proj-2",
        title: "Design System 3.0",
        category: "UI/UX",
        image: "https://images.unsplash.com/photo-design-system",
        link: "https://forgestudio.io/projects/design-system",
      },
    ],
  };

  const portfolioResult = await renderExportedComponent(portfolioElement, "portfolio_grid");
  assert("Portfolio HTML contains FinTech Cloud Platform", portfolioResult.htmlOutput.includes("FinTech Cloud Platform"));
  assert("Portfolio HTML contains Design System 3.0", portfolioResult.htmlOutput.includes("Design System 3.0"));
  assert("Portfolio HTML contains image asset URLs", portfolioResult.htmlOutput.includes("https://images.unsplash.com/photo-fintech"));
  assert("Portfolio HTML contains project link", portfolioResult.htmlOutput.includes('href="https://forgestudio.io/projects/fintech"'));

  // ------------------------------------------------------------------
  // TEST I: Slideshow / Slides (Immediate Acceptance Test: 3 Distinct Slides)
  // ------------------------------------------------------------------
  console.log("\n--- TEST I: Slideshow / Slides (3 Distinct Configured Slides) ---");
  const slideshowElement = {
    id: "hero-slides-test",
    type: "slides",
    content: "Slideshow Section",
    slidesHeight: "500px",
    slidesAutoplay: true,
    slidesAutoplayInterval: 5000,
    slidesTransition: "slide",
    slidesAlignment: "center",
    slidesShowArrows: true,
    slidesShowDots: true,
    slidesItems: [
      {
        id: "slide-alpha",
        title: "Empower Your Digital Experience",
        description: "Craft scalable, component-driven layouts effortlessly with ForgeStudio.",
        bgImage: "https://images.unsplash.com/photo-slide-1",
        bgColor: "#1e1b4b",
        buttonText: "Get Started Now",
        buttonUrl: "https://forgestudio.io/get-started",
      },
      {
        id: "slide-beta",
        title: "Blazing Performance by Default",
        description: "Ultra-fast load times with optimized assets and server rendering.",
        bgImage: "https://images.unsplash.com/photo-slide-2",
        bgColor: "#0f172a",
        buttonText: "View Benchmarks",
        buttonUrl: "https://forgestudio.io/benchmarks",
      },
      {
        id: "slide-gamma",
        title: "Collaborative Visual Engineering",
        description: "Bridging the gap between designers and developers in real-time.",
        bgImage: "https://images.unsplash.com/photo-slide-3",
        bgColor: "#111827",
        buttonText: "Book Demo",
        buttonUrl: "https://forgestudio.io/demo",
      },
    ],
  };

  const slidesResult = await renderExportedComponent(slideshowElement, "hero_slides");

  assert("Slideshow HTML is NOT the generic placeholder 'Slideshow Section'", !slidesResult.htmlOutput.match(/^<div[^>]*>Slideshow Section<\/div>$/));
  assert("Slideshow HTML contains Slide 1 Title", slidesResult.htmlOutput.includes("Empower Your Digital Experience"));
  assert("Slideshow HTML contains Slide 2 Title", slidesResult.htmlOutput.includes("Blazing Performance by Default"));
  assert("Slideshow HTML contains Slide 3 Title", slidesResult.htmlOutput.includes("Collaborative Visual Engineering"));
  assert("Slideshow HTML contains Slide 1 Description", slidesResult.htmlOutput.includes("Craft scalable, component-driven layouts effortlessly"));
  assert("Slideshow HTML contains Slide 2 Description", slidesResult.htmlOutput.includes("Ultra-fast load times with optimized assets"));
  assert("Slideshow HTML contains Slide 3 Description", slidesResult.htmlOutput.includes("Bridging the gap between designers and developers"));
  assert("Slideshow HTML contains Slide 1 Button Text", slidesResult.htmlOutput.includes("Get Started Now"));
  assert("Slideshow HTML contains Slide 2 Button Text", slidesResult.htmlOutput.includes("View Benchmarks"));
  assert("Slideshow HTML contains Slide 3 Button Text", slidesResult.htmlOutput.includes("Book Demo"));
  assert("Slideshow HTML contains Slide 1 Button Link", slidesResult.htmlOutput.includes('href="https://forgestudio.io/get-started"'));
  assert("Slideshow HTML contains Slide 2 Button Link", slidesResult.htmlOutput.includes('href="https://forgestudio.io/benchmarks"'));
  assert("Slideshow HTML contains Slide 3 Button Link", slidesResult.htmlOutput.includes('href="https://forgestudio.io/demo"'));
  assert("Slideshow HTML contains Slide 1 Background Image", slidesResult.htmlOutput.includes("https://images.unsplash.com/photo-slide-1"));
  assert("Slideshow HTML contains Slide 2 Background Image", slidesResult.htmlOutput.includes("https://images.unsplash.com/photo-slide-2"));
  assert("Slideshow HTML contains Slide 3 Background Image", slidesResult.htmlOutput.includes("https://images.unsplash.com/photo-slide-3"));
  assert("Slideshow JSX contains useState for active index", slidesResult.jsxCode.includes("useState(0)"));
  assert("Slideshow JSX contains autoplay interval timer", slidesResult.jsxCode.includes("autoplayInterval"));

  // ------------------------------------------------------------------
  // TEST J: Photo Gallery & Contact Form
  // ------------------------------------------------------------------
  console.log("\n--- TEST J: Photo Gallery & Contact Form ---");
  const galleryElement = {
    id: "gallery-test",
    type: "gallery",
    content: "Gallery",
    galleryColumns: 3,
    galleryGap: 18,
    galleryImages: [
      { id: "g-1", url: "https://images.unsplash.com/photo-art-1", caption: "Abstract Design 1" },
      { id: "g-2", url: "https://images.unsplash.com/photo-art-2", caption: "Modern Architecture" },
    ],
  };
  const galleryResult = await renderExportedComponent(galleryElement, "photo_gallery");
  assert("Gallery HTML contains Image 1 url", galleryResult.htmlOutput.includes("https://images.unsplash.com/photo-art-1"));
  assert("Gallery HTML contains Image 2 url", galleryResult.htmlOutput.includes("https://images.unsplash.com/photo-art-2"));
  assert("Gallery HTML contains Image 1 caption", galleryResult.htmlOutput.includes("Abstract Design 1"));

  const formElement = {
    id: "form-test",
    type: "form",
    content: "Form",
    formTitle: "Get in Touch With Our Team",
    formSubmitText: "Submit Inquiry",
    formFields: [
      { id: "f_name", type: "text", label: "Full Name", required: true, placeholder: "John Doe" },
      { id: "f_email", type: "email", label: "Corporate Email", required: true, placeholder: "john@company.com" },
    ],
  };
  const formResult = await renderExportedComponent(formElement, "contact_form");
  assert("Form HTML contains custom title", formResult.htmlOutput.includes("Get in Touch With Our Team"));
  assert("Form HTML contains custom submit button", formResult.htmlOutput.includes("Submit Inquiry"));
  assert("Form HTML contains Full Name field label", formResult.htmlOutput.includes("Full Name"));
  assert("Form HTML contains Corporate Email field label", formResult.htmlOutput.includes("Corporate Email"));

  console.log("\n============================================================");
  console.log(`ALL EXTERNAL VERIFICATION TESTS PASSED: ${passedAssertions}/${totalAssertions}`);
  console.log("============================================================\n");

  if (passedAssertions !== totalAssertions) {
    process.exit(1);
  }
}

runAllExternalVerificationTests().catch((err) => {
  console.error("External Verification Suite failed with error:", err);
  process.exit(1);
});
