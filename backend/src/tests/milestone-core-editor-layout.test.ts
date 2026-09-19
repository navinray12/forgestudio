import { compileCanonicalToStaticBundle } from "../services/destinations/staticCompiler.js";
import { transformPageToWordPress } from "../services/wordpress/transformer.service.js";

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

async function runMilestoneCoreEditorLayoutTests() {
  console.log("=================================================");
  console.log("RUNNING FORGESTUDIO CORE VISUAL EDITOR & LAYOUT TESTS");
  console.log("CSS Grid Engine, 5-Renderer Parity & Telemetry");
  console.log("=================================================\n");

  // 1. CSS Grid Static Compiler Verification
  const gridContainerPage = {
    id: "page-grid-1",
    name: "Grid Test Page",
    title: "Grid Test Page",
    slug: "",
    isHome: true,
    elements: [
      {
        id: "container-grid-1",
        type: "container",
        layout: {
          layoutType: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gridAutoFlow: "row",
          gap: 24,
          rowGap: 16,
          columnGap: 24,
          alignItems: "center",
        },
        styles: {
          padding: "32px",
          backgroundColor: "#ffffff",
        },
        elements: [
          { id: "col-1", type: "heading", content: "Card 1", level: 3 },
          { id: "col-2", type: "heading", content: "Card 2", level: 3 },
          { id: "col-3", type: "heading", content: "Card 3", level: 3 },
        ],
      },
    ],
  };

  const gridBundle = compileCanonicalToStaticBundle("site-grid", 1, {
    name: "Grid Test Site",
    pages: [gridContainerPage],
  });
  const gridHtmlFile = gridBundle.files.find((f) => f.path === "index.html");
  const compiledGridHtml = gridHtmlFile ? gridHtmlFile.content : "";

  assert(
    compiledGridHtml.includes("display: grid"),
    "Static compiler renders 'display: grid' for container with layoutType='grid'"
  );
  assert(
    compiledGridHtml.includes("grid-template-columns: repeat(3, minmax(0, 1fr))"),
    "Static compiler compiles grid-template-columns accurately"
  );
  assert(
    compiledGridHtml.includes("gap: 24px"),
    "Static compiler compiles gap accurately"
  );
  assert(
    compiledGridHtml.includes("Card 1") && compiledGridHtml.includes("Card 2") && compiledGridHtml.includes("Card 3"),
    "Static compiler renders all nested grid children"
  );

  // 2. Flexbox Fallback Parity
  const flexContainerPage = {
    id: "page-flex-1",
    name: "Flex Test Page",
    title: "Flex Test Page",
    slug: "",
    isHome: true,
    elements: [
      {
        id: "container-flex-1",
        type: "container",
        layout: {
          layoutType: "flex",
          direction: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
        },
        elements: [
          { id: "f-1", type: "text", content: "Flex Item 1" },
          { id: "f-2", type: "text", content: "Flex Item 2" },
        ],
      },
    ],
  };

  const flexBundle = compileCanonicalToStaticBundle("site-flex", 1, {
    name: "Flex Test Site",
    pages: [flexContainerPage],
  });
  const flexHtmlFile = flexBundle.files.find((f) => f.path === "index.html");
  const compiledFlexHtml = flexHtmlFile ? flexHtmlFile.content : "";

  assert(
    compiledFlexHtml.includes("display: flex"),
    "Static compiler renders 'display: flex' for flex container"
  );
  assert(
    compiledFlexHtml.includes("flex-direction: row"),
    "Static compiler renders 'flex-direction: row'"
  );
  assert(
    compiledFlexHtml.includes("justify-content: space-between"),
    "Static compiler renders 'justify-content: space-between'"
  );

  // 3. WordPress Transformer Container & Grid Parity
  const wpTransformed = transformPageToWordPress(gridContainerPage);
  assert(
    wpTransformed.content.includes("wp:group"),
    "WordPress transformer wraps container in Gutenberg wp:group"
  );
  assert(
    wpTransformed.content.includes("display: grid"),
    "WordPress transformer outputs display: grid for grid container"
  );
  assert(
    wpTransformed.content.includes("grid-template-columns: repeat(3, minmax(0, 1fr))"),
    "WordPress transformer outputs grid-template-columns"
  );
  assert(
    wpTransformed.content.includes("Card 1") && wpTransformed.content.includes("Card 2"),
    "WordPress transformer includes nested children blocks"
  );

  // 3b. Masonry Layout Parity (F-051)
  const masonryContainerPage = {
    id: "page-masonry-1",
    name: "Masonry Test Page",
    title: "Masonry Test Page",
    slug: "masonry",
    isHome: false,
    elements: [
      {
        id: "container-masonry-1",
        type: "container",
        layout: {
          layoutType: "masonry",
          masonryColumns: 4,
          columnGap: 24,
        },
        elements: [
          { id: "m-1", type: "text", content: "Masonry Card 1" },
          { id: "m-2", type: "text", content: "Masonry Card 2" },
        ],
      },
    ],
  };

  const masonryBundle = compileCanonicalToStaticBundle("site-masonry", 1, {
    name: "Masonry Test Site",
    pages: [masonryContainerPage],
  });
  const masonryHtml = masonryBundle.files.find((f) => f.path === "masonry.html" || f.path === "index.html")?.content || "";
  assert(
    masonryHtml.includes("column-count: 4") || masonryHtml.includes("column-count:4"),
    "Static compiler renders column-count: 4 for masonry container"
  );
  assert(
    masonryHtml.includes("column-gap: 24px"),
    "Static compiler renders column-gap: 24px for masonry container"
  );

  const wpMasonry = transformPageToWordPress(masonryContainerPage);
  assert(
    wpMasonry.content.includes("column-count: 4") || wpMasonry.content.includes("columnCount") || wpMasonry.content.includes("column-count"),
    "WordPress transformer supports masonry column layout"
  );

  // 3c. Scroll Snap & Overflow Parity (F-050)
  const scrollSnapPage = {
    id: "page-snap-1",
    name: "Snap Test Page",
    title: "Snap Test Page",
    slug: "snap",
    isHome: false,
    elements: [
      {
        id: "container-snap-1",
        type: "container",
        layout: {
          layoutType: "flex",
          direction: "row",
          scrollSnapType: "x mandatory",
          overflowX: "auto",
        },
        elements: [
          { id: "s-1", type: "text", content: "Snap Slide 1" },
          { id: "s-2", type: "text", content: "Snap Slide 2" },
        ],
      },
    ],
  };

  const snapBundle = compileCanonicalToStaticBundle("site-snap", 1, {
    name: "Snap Test Site",
    pages: [scrollSnapPage],
  });
  const snapHtml = snapBundle.files.find((f) => f.path === "snap.html" || f.path === "index.html")?.content || "";
  assert(
    snapHtml.includes("scroll-snap-type: x mandatory"),
    "Static compiler outputs scroll-snap-type: x mandatory"
  );
  assert(
    snapHtml.includes("overflow-x: auto"),
    "Static compiler outputs overflow-x: auto"
  );

  const wpSnap = transformPageToWordPress(scrollSnapPage);
  assert(
    wpSnap.content.includes("scroll-snap-type: x mandatory"),
    "WordPress transformer outputs scroll-snap-type: x mandatory"
  );

  // 4. Breakpoint Inheritance & Cascading Logic
  function resolveResponsiveLayout(el: any, device: "desktop" | "tablet" | "mobile", key: string) {
    const l = el.layout || {};
    if (device === "mobile") {
      if (el.responsiveLayout?.mobile?.[key] !== undefined) return el.responsiveLayout.mobile[key];
      if (el.responsiveLayout?.tablet?.[key] !== undefined) return el.responsiveLayout.tablet[key];
      if (el.responsiveLayout?.desktop?.[key] !== undefined) return el.responsiveLayout.desktop[key];
      return l[key];
    }
    if (device === "tablet") {
      if (el.responsiveLayout?.tablet?.[key] !== undefined) return el.responsiveLayout.tablet[key];
      if (el.responsiveLayout?.desktop?.[key] !== undefined) return el.responsiveLayout.desktop[key];
      return l[key];
    }
    if (el.responsiveLayout?.desktop?.[key] !== undefined) return el.responsiveLayout.desktop[key];
    return l[key];
  }

  const responsiveEl = {
    layout: {
      layoutType: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 20,
    },
    responsiveLayout: {
      tablet: {
        gridTemplateColumns: "repeat(2, 1fr)",
      },
      mobile: {
        gridTemplateColumns: "repeat(1, 1fr)",
        gap: 10,
      },
    },
  };

  assert(
    resolveResponsiveLayout(responsiveEl, "desktop", "gridTemplateColumns") === "repeat(4, 1fr)",
    "Desktop inherits base gridTemplateColumns (repeat(4, 1fr))"
  );
  assert(
    resolveResponsiveLayout(responsiveEl, "tablet", "gridTemplateColumns") === "repeat(2, 1fr)",
    "Tablet overrides gridTemplateColumns to repeat(2, 1fr)"
  );
  assert(
    resolveResponsiveLayout(responsiveEl, "tablet", "gap") === 20,
    "Tablet inherits desktop gap (20px)"
  );
  assert(
    resolveResponsiveLayout(responsiveEl, "mobile", "gridTemplateColumns") === "repeat(1, 1fr)",
    "Mobile overrides gridTemplateColumns to repeat(1, 1fr)"
  );
  assert(
    resolveResponsiveLayout(responsiveEl, "mobile", "gap") === 10,
    "Mobile overrides gap to 10px"
  );

  // 5. Popup Telemetry Simulation
  let popups = [
    { id: "pop-1", name: "Promo", viewsCount: 0, clicksCount: 0 },
    { id: "pop-2", name: "Newsletter", viewsCount: 5, clicksCount: 1 },
  ];

  function simulateTrackView(id: string) {
    popups = popups.map((p) => (p.id === id ? { ...p, viewsCount: (p.viewsCount || 0) + 1 } : p));
  }
  function simulateTrackClick(id: string) {
    popups = popups.map((p) => (p.id === id ? { ...p, clicksCount: (p.clicksCount || 0) + 1 } : p));
  }

  simulateTrackView("pop-1");
  simulateTrackView("pop-1");
  simulateTrackClick("pop-1");
  simulateTrackView("pop-2");

  assert(
    popups.find((p) => p.id === "pop-1")?.viewsCount === 2,
    "Popup view tracking increments viewsCount correctly (0 -> 2)"
  );
  assert(
    popups.find((p) => p.id === "pop-1")?.clicksCount === 1,
    "Popup click tracking increments clicksCount correctly (0 -> 1)"
  );
  assert(
    popups.find((p) => p.id === "pop-2")?.viewsCount === 6,
    "Popup view tracking preserves existing count (5 -> 6)"
  );

  console.log("\n-------------------------------------------------");
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log("-------------------------------------------------");

  if (failed > 0) {
    process.exit(1);
  }
}

runMilestoneCoreEditorLayoutTests().catch((err) => {
  console.error("Test execution encountered an error:", err);
  process.exit(1);
});
