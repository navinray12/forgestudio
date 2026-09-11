import { exportCode } from "../codeExporter.ts";
import { importCodeToElement, validateCodeSyntax } from "../codeImporter.ts";
function updateTreeElement(list, id, updater) {
  return list.map((item) => {
    if (item.id === id) return updater(item);
    if (item.children && item.children.length > 0) {
      return { ...item, children: updateTreeElement(item.children, id, updater) };
    }
    return item;
  });
}

async function runBidirectionalSyncTests() {
  console.log("============================================================");
  console.log("FORGESTUDIO BIDIRECTIONAL SYNC (UI ↔ CODE) TEST SUITE");
  console.log("Testing round-trip fidelity, external code edits, & safety");
  console.log("============================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  function assert(label, condition) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] ${label}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] ${label}`);
    }
  }

  // =========================================================================
  // 1. CRITICAL ACCEPTANCE TEST: Complete External Modification Round-Trip
  // =========================================================================
  console.log("--- 1. CRITICAL ACCEPTANCE TEST: Complete External Workflow ---");
  // 1. Create a section visually with Heading, Paragraph, Image, and Button
  const initialSection = {
    id: "section-main",
    type: "container",
    content: "",
    styles: { backgroundColor: "#0f172a", padding: "40px" },
    layout: { direction: "column", gap: 20 },
    children: [
      {
        id: "head-1",
        type: "heading",
        headingLevel: "h1",
        content: "Initial Heading Title",
        styles: { color: "#ffffff", fontSize: "36px" },
      },
      {
        id: "para-1",
        type: "text",
        content: "Initial paragraph copy for testing.",
        styles: { color: "#94a3b8", fontSize: "16px" },
      },
      {
        id: "img-1",
        type: "image",
        content: "",
        src: "https://example.com/initial-image.jpg",
        alt: "Old Alt Text",
        styles: { width: "100%" },
      },
      {
        id: "btn-1",
        type: "button",
        content: "Initial Button Text",
        href: "https://example.com/initial-link",
        styles: { backgroundColor: "#2563eb", color: "#ffffff" },
      },
    ],
  };

  // 6. Export the section
  const exportedJSX = exportCode(initialSection, "jsx");
  assert("Initial Section exported successfully", exportedJSX.includes("Initial Heading Title"));

  // 8-12. External modification: Developer modifies heading, paragraph, image, button text & href
  const modifiedCode = exportedJSX
    .replace("Initial Heading Title", "Welcome to ForgeStudio")
    .replace("Initial paragraph copy for testing.", "Build your website visually or with code seamlessly.")
    .replace("https://example.com/initial-image.jpg", "https://forgestudio.io/assets/dashboard-preview.png")
    .replace("Initial Button Text", "Start Building Free Today")
    .replace("https://example.com/initial-link", "https://forgestudio.io/get-started");

  // 13-14. Paste code into Dev Mode and Apply Code to Canvas
  const importResult = importCodeToElement(modifiedCode, { existingElement: initialSection });
  assert("Import result succeeded", importResult.success === true);
  assert("Import result status is VALID", importResult.status === "VALID");

  const importedElement = importResult.element;
  assert("Root container ID is preserved", importedElement.id === initialSection.id);
  assert("Root has 4 children", importedElement.children && importedElement.children.length === 4);

  // 15. Verify canvas element tree visually reflects ALL 5 modifications
  const updatedHeading = importedElement.children[0];
  const updatedParagraph = importedElement.children[1];
  const updatedImage = importedElement.children[2];
  const updatedButton = importedElement.children[3];

  assert("Updated Heading has new content", updatedHeading.content === "Welcome to ForgeStudio");
  assert("Updated Paragraph has new content", updatedParagraph.content === "Build your website visually or with code seamlessly.");
  assert("Updated Image has new src", updatedImage.src === "https://forgestudio.io/assets/dashboard-preview.png");
  assert("Updated Button has new content", updatedButton.content === "Start Building Free Today");
  assert("Updated Button has new href", updatedButton.href === "https://forgestudio.io/get-started");

  // 16-17. Teammate Manual Visual UI Edit: Teammate changes button text in ForgeStudio UI
  const canvasTree = [importedElement];
  const treeAfterManualEdit = updateTreeElement(canvasTree, updatedButton.id, (b) => ({
    ...b,
    content: "Deploy Website Now →",
    styles: { ...b.styles, backgroundColor: "#10b981" },
  }));

  // 18-19. Open Dev Mode again and verify newly modified canvas state is exported
  const finalExportedCode = exportCode(treeAfterManualEdit[0], "jsx");
  assert("Re-exported code reflects manual teammate edit", finalExportedCode.includes("Deploy Website Now →"));
  assert("Re-exported code reflects manual teammate style edit", finalExportedCode.includes("#10b981"));
  assert("Re-exported code retains previous code edits", finalExportedCode.includes("Welcome to ForgeStudio"));

  // =========================================================================
  // 2. DATA-DRIVEN COMPONENT: Blog Posts Round-Trip
  // =========================================================================
  console.log("\n--- 2. DATA-DRIVEN: Blog Posts Round-Trip ---");
  const initialBlog = {
    id: "blog-widget-1",
    type: "posts",
    content: "Blog Posts",
    postsColumns: 3,
    posts: [
      {
        id: "p1",
        title: "Alpha Release Notes",
        author: "John Doe",
        date: "Jan 1, 2026",
        category: "Announcements",
        link: "https://example.com/p1",
      },
      {
        id: "p2",
        title: "Beta Features",
        author: "Jane Smith",
        date: "Feb 1, 2026",
        category: "Product",
        link: "https://example.com/p2",
      },
    ],
  };

  const blogCode = exportCode(initialBlog, "tsx");
  assert("Blog Posts exports original posts", blogCode.includes("Alpha Release Notes") && blogCode.includes("John Doe"));

  // External edit: Change author and title in code
  const modifiedBlogCode = blogCode
    .replace("Alpha Release Notes", "Production Release 1.0")
    .replace("John Doe", "Navin Ray")
    .replace("Announcements", "Engineering");

  const blogImportResult = importCodeToElement(modifiedBlogCode, { existingElement: initialBlog });
  assert("Blog Posts code imported successfully", blogImportResult.success);
  assert("Imported Blog Posts type is 'posts'", blogImportResult.element.type === "posts");
  assert("Imported Blog Posts has 2 items", blogImportResult.element.posts.length === 2);
  assert("Post 1 title updated in canvas data", blogImportResult.element.posts[0].title === "Production Release 1.0");
  assert("Post 1 author updated in canvas data", blogImportResult.element.posts[0].author === "Navin Ray");
  assert("Post 1 category updated in canvas data", blogImportResult.element.posts[0].category === "Engineering");

  // =========================================================================
  // 3. DATA-DRIVEN COMPONENT: Pricing Table Round-Trip
  // =========================================================================
  console.log("\n--- 3. DATA-DRIVEN: Pricing Table Round-Trip ---");
  const initialPricing = {
    id: "pricing-widget-1",
    type: "price-table",
    content: "Price Table",
    pricingPlans: [
      {
        id: "plan-1",
        name: "Starter",
        price: "$19",
        period: "/ month",
        buttonText: "Get Started",
        features: [{ id: "f1", text: "5 Projects", included: true }],
      },
      {
        id: "plan-2",
        name: "Enterprise",
        price: "$199",
        period: "/ month",
        buttonText: "Contact Sales",
        features: [{ id: "f2", text: "Unlimited Projects", included: true }],
      },
    ],
  };

  const pricingCode = exportCode(initialPricing, "tsx");
  const modifiedPricingCode = pricingCode
    .replace("$19", "$29")
    .replace("Starter", "Pro Developer")
    .replace("Contact Sales", "Talk to an Architect");

  const pricingImportResult = importCodeToElement(modifiedPricingCode, { existingElement: initialPricing });
  assert("Pricing Table imported successfully", pricingImportResult.success);
  assert("Plan 1 name updated", pricingImportResult.element.pricingPlans[0].name === "Pro Developer");
  assert("Plan 1 price updated", pricingImportResult.element.pricingPlans[0].price === "$29");
  assert("Plan 2 buttonText updated", pricingImportResult.element.pricingPlans[1].buttonText === "Talk to an Architect");

  // =========================================================================
  // 4. INTERACTIVE & STATEFUL COMPONENT: Animated Headline Round-Trip
  // =========================================================================
  console.log("\n--- 4. INTERACTIVE / STATEFUL: Animated Headline Round-Trip ---");
  const initialHeadline = {
    id: "headline-1",
    type: "animated-headline",
    content: "Animated Headline",
    headlinePrefix: "Design Web Apps That Are",
    headlineAnimatedTexts: ["Fast", "Modern", "Secure"],
    headlineSuffix: "Without Overhead",
    headlineHighlightColor: "#2563eb",
  };

  const headlineCode = exportCode(initialHeadline, "tsx");
  const modifiedHeadlineCode = headlineCode
    .replace("Design Web Apps That Are", "Build Modern Products That Are")
    .replace("Fast", "Lightning Fast")
    .replace("Without Overhead", "At Scale");

  const headlineImportResult = importCodeToElement(modifiedHeadlineCode, { existingElement: initialHeadline });
  assert("Animated Headline imported successfully", headlineImportResult.success);
  assert("Headline prefix updated", headlineImportResult.element.headlinePrefix === "Build Modern Products That Are");
  assert("Headline animated words updated", headlineImportResult.element.headlineAnimatedTexts.includes("Lightning Fast"));
  assert("Headline suffix updated", headlineImportResult.element.headlineSuffix === "At Scale");

  // =========================================================================
  // 5. STYLES & LAYOUT ROUND-TRIP
  // =========================================================================
  console.log("\n--- 5. STYLES & LAYOUT: Round-Trip ---");
  const initialStyledBox = {
    id: "box-1",
    type: "container",
    content: "",
    styles: { backgroundColor: "#1e293b", padding: "20px", borderRadius: "8px" },
    layout: { direction: "column", gap: 10, justifyContent: "flex-start" },
    children: [],
  };

  const boxCode = exportCode(initialStyledBox, "jsx");
  const modifiedBoxCode = boxCode
    .replace("#1e293b", "#000000")
    .replace('"20px"', '"48px"')
    .replace('"8px"', '"24px"')
    .replace('"10px"', '"32px"');

  const boxImportResult = importCodeToElement(modifiedBoxCode, { existingElement: initialStyledBox });
  assert("Styles imported successfully", boxImportResult.success);
  assert("Background color updated", boxImportResult.element.styles.backgroundColor === "#000000");
  assert("Padding updated", boxImportResult.element.styles.padding === "48px");
  assert("Border radius updated", boxImportResult.element.styles.borderRadius === "24px");
  assert("Layout gap updated", boxImportResult.element.layout.gap === 32);

  // =========================================================================
  // 6. INVALID CODE SAFETY TEST
  // =========================================================================
  console.log("\n--- 6. SAFETY TEST: Corrupted & Invalid Syntax ---");
  const brokenCode = `
  export default function Broken() {
    return (
      <section style={{ backgroundColor: "#fff" }
        <h1>Missing closing tags and unclosed brace
      </div>
  `;

  const syntaxValidation = validateCodeSyntax(brokenCode);
  assert("Syntax validator caught broken syntax", syntaxValidation.isValid === false);
  assert("Syntax validator reported status 'INVALID'", syntaxValidation.status === "INVALID");
  assert("Syntax validator produced diagnostic messages", syntaxValidation.errors.length > 0);

  const safeImportResult = importCodeToElement(brokenCode, { existingElement: initialSection });
  assert("Importer refused to corrupt element with invalid syntax", safeImportResult.success === false);
  assert("Importer status is INVALID", safeImportResult.status === "INVALID");
  assert("Original initialSection remained untouched", initialSection.children[0].content === "Initial Heading Title");

  // =========================================================================
  // 7. RESET TO CANVAS STATE TEST
  // =========================================================================
  console.log("\n--- 7. RESET TEST: Reset Code to Current Canvas State ---");
  const currentCanvasElement = {
    id: "canvas-live-node",
    type: "heading",
    headingLevel: "h2",
    content: "Live Canvas Heading",
    styles: { color: "#3b82f6" },
  };

  // 1. Initial code generated from canvas
  const canvasCode = exportCode(currentCanvasElement, "tsx");

  // 2. User types messy experimental code in Dev Mode
  const experimentalDraft = canvasCode.replace("Live Canvas Heading", "Draft Not Yet Applied");
  assert("Experimental draft contains modified text", experimentalDraft.includes("Draft Not Yet Applied"));

  // 3. User clicks 'Reset'
  const resetCode = exportCode(currentCanvasElement, "tsx");
  assert("Reset restores exact code from current canvas element", resetCode === canvasCode);
  assert("Reset does NOT contain draft changes", !resetCode.includes("Draft Not Yet Applied"));
  assert("Canvas element remains pure", currentCanvasElement.content === "Live Canvas Heading");

  // =========================================================================
  // 8. CRITICAL ACCEPTANCE TEST: SLIDESHOW FULL BIDIRECTIONAL ROUND-TRIP
  // =========================================================================
  console.log("\n--- 8. SLIDESHOW BIDIRECTIONAL SYNC (Full User Workflow) ---");
  const initialSlideshow = {
    id: "slideshow-hero-root",
    type: "slides",
    content: "Slideshow Section",
    slidesHeight: "500px",
    slidesAutoplay: true,
    slidesAutoplayInterval: 4500,
    slidesTransition: "slide",
    slidesAlignment: "center",
    slidesShowArrows: true,
    slidesShowDots: true,
    slidesItems: [
      {
        id: "slide_1",
        title: "Empower Your Digital Growth",
        description: "Initial description for slide one.",
        bgImage: "https://images.unsplash.com/photo-initial-1",
        bgColor: "#1e1b4b",
        buttonText: "Explore Features",
        buttonUrl: "https://forgestudio.io/features",
      },
      {
        id: "slide_2",
        title: "Designed for High Performance",
        description: "Initial description for slide two.",
        bgImage: "https://images.unsplash.com/photo-initial-2",
        bgColor: "#0f172a",
        buttonText: "Start Free Trial",
        buttonUrl: "https://forgestudio.io/trial",
      },
      {
        id: "slide_3",
        title: "Seamless Team Collaboration",
        description: "Initial description for slide three.",
        bgImage: "https://images.unsplash.com/photo-initial-3",
        bgColor: "#111827",
        buttonText: "Contact Sales",
        buttonUrl: "https://forgestudio.io/sales",
      },
    ],
  };

  // Step 1: Export from Canvas
  const exportedSlidesCode = exportCode(initialSlideshow, "tsx");
  assert("Exported code is NOT generic 'Slideshow Section' shell", !exportedSlidesCode.includes("<div style={{\n      \"width\": \"100%\",\n      \"marginTop\": \"16px\"\n    }} className=\"\">\n      Slideshow Section\n    </div>"));
  assert("Exported code contains HeroSlides component name", exportedSlidesCode.includes("export default function HeroSlides"));
  assert("Exported code contains slide 1 title", exportedSlidesCode.includes("Empower Your Digital Growth"));
  assert("Exported code contains slide 2 title", exportedSlidesCode.includes("Designed for High Performance"));
  assert("Exported code contains slide 3 title", exportedSlidesCode.includes("Seamless Team Collaboration"));
  assert("Exported code contains slide 1 button text", exportedSlidesCode.includes("Explore Features"));
  assert("Exported code contains slide 1 button URL", exportedSlidesCode.includes("https://forgestudio.io/features"));

  // Step 2: Simulate External Developer Modifications
  let modifiedSlidesCode = exportedSlidesCode
    .replace("Empower Your Digital Growth", "Updated Slide Title by Dev")
    .replace("Designed for High Performance", "Developer Modified Slide Two")
    .replace("Initial description for slide one.", "Re-architected cloud infrastructure with zero downtime.")
    .replace("https://images.unsplash.com/photo-initial-1", "https://images.unsplash.com/photo-dev-modified-1")
    .replace("Explore Features", "Launch Platform Now")
    .replace("https://forgestudio.io/features", "https://forgestudio.io/platform-launch");

  assert("Modified code contains updated Slide 1 title", modifiedSlidesCode.includes("Updated Slide Title by Dev"));
  assert("Modified code contains updated Slide 2 title", modifiedSlidesCode.includes("Developer Modified Slide Two"));
  assert("Modified code contains updated button text", modifiedSlidesCode.includes("Launch Platform Now"));

  // Step 3: Developer Pastes Back into Dev Mode & Applies to Canvas
  const slidesImportResult = importCodeToElement(modifiedSlidesCode, {
    existingElement: initialSlideshow,
    language: "tsx",
  });

  assert("Importer parsed modified slideshow successfully", slidesImportResult.success === true);
  assert("Importer status is VALID", slidesImportResult.status === "VALID");
  assert("Preserved original element ID", slidesImportResult.element.id === "slideshow-hero-root");
  assert("Preserved element type 'slides'", slidesImportResult.element.type === "slides");
  assert("Preserved height configuration", slidesImportResult.element.slidesHeight === "500px");
  assert("Preserved autoplay configuration", slidesImportResult.element.slidesAutoplay === true);

  // Step 4: Canvas Tree Update via updateTreeElement
  let canvasElements = [initialSlideshow];
  canvasElements = updateTreeElement(canvasElements, initialSlideshow.id, () => slidesImportResult.element);

  const updatedCanvasSlideshow = canvasElements[0];
  assert("Canvas element Slide 1 title updated", updatedCanvasSlideshow.slidesItems[0].title === "Updated Slide Title by Dev");
  assert("Canvas element Slide 2 title updated", updatedCanvasSlideshow.slidesItems[1].title === "Developer Modified Slide Two");
  assert("Canvas element Slide 1 description updated", updatedCanvasSlideshow.slidesItems[0].description === "Re-architected cloud infrastructure with zero downtime.");
  assert("Canvas element Slide 1 button text updated", updatedCanvasSlideshow.slidesItems[0].buttonText === "Launch Platform Now");
  assert("Canvas element Slide 1 button url updated", updatedCanvasSlideshow.slidesItems[0].buttonUrl === "https://forgestudio.io/platform-launch");
  assert("Canvas element Slide 1 image updated", updatedCanvasSlideshow.slidesItems[0].bgImage === "https://images.unsplash.com/photo-dev-modified-1");
  assert("Canvas element Slide 3 title retained", updatedCanvasSlideshow.slidesItems[2].title === "Seamless Team Collaboration");

  // Step 5: Teammate manually edits Slide 3 through normal visual UI
  updatedCanvasSlideshow.slidesItems[2].title = "Teammate Live UI Edit in ForgeStudio";
  updatedCanvasSlideshow.slidesItems[2].buttonText = "Contact Teammate";

  // Step 6: Dev Mode reopened $\rightarrow$ code reflects teammate's change
  const reExportedCode = exportCode(updatedCanvasSlideshow, "tsx");
  assert("Re-exported code reflects teammate Slide 3 title edit", reExportedCode.includes("Teammate Live UI Edit in ForgeStudio"));
  assert("Re-exported code reflects teammate Slide 3 button text edit", reExportedCode.includes("Contact Teammate"));
  assert("Re-exported code preserves developer Slide 1 modifications", reExportedCode.includes("Updated Slide Title by Dev"));
  assert("Re-exported code preserves developer button URL", reExportedCode.includes("https://forgestudio.io/platform-launch"));

  // =========================================================================
  // 9. GALLERY & FORM BIDIRECTIONAL SYNC
  // =========================================================================
  console.log("\n--- 9. GALLERY & FORM BIDIRECTIONAL SYNC ---");
  const initialGallery = {
    id: "gallery-sync",
    type: "gallery",
    content: "Gallery",
    galleryColumns: 3,
    galleryGap: 16,
    galleryImages: [
      { id: "img-1", url: "https://photos.com/1", caption: "Photo One" },
      { id: "img-2", url: "https://photos.com/2", caption: "Photo Two" },
    ],
  };

  const galleryCode = exportCode(initialGallery, "tsx");
  const modifiedGalleryCode = galleryCode
    .replace("Photo One", "Modern Art Masterpiece")
    .replace("https://photos.com/1", "https://photos.com/art-masterpiece");

  const importedGallery = importCodeToElement(modifiedGalleryCode, { existingElement: initialGallery });
  assert("Gallery imported successfully", importedGallery.success === true);
  assert("Gallery image 1 caption updated", importedGallery.element.galleryImages[0].caption === "Modern Art Masterpiece");
  assert("Gallery image 1 URL updated", importedGallery.element.galleryImages[0].url === "https://photos.com/art-masterpiece");
  assert("Gallery preserved element ID", importedGallery.element.id === "gallery-sync");
  console.log("\n============================================================");
  console.log(`BIDIRECTIONAL TEST SUITE RESULT: ${passedTests}/${totalTests} PASSED`);
  console.log("============================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runBidirectionalSyncTests().catch((err) => {
  console.error("Bidirectional Test Suite failed with error:", err);
  process.exit(1);
});
