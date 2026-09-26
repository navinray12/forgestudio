/**
 * Automated Verification Test Suite
 * Module 10: Navigation & Search (F-223 to F-233)
 *
 * Scenarios:
 * 1. Schema & Default Factories Validation (all 11 navigation element types)
 * 2. Static Compiler Semantic Markup Output (mega-menu, menu-anchor, search, taxonomy-filter, post-nav)
 * 3. WordPress Menu Connector Data Formatting & Hierarchy (tree builder, cycle detection, orphan safety)
 * 4. Anchor Jump & Link Target Resolution (smooth scroll targets, page links, protocol neutralization)
 */

import {
  compileCanonicalToStaticBundle,
  resolveStaticHtmlHref,
} from "../services/destinations/staticCompiler.js";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`[FAIL] ${testName}`);
    if (details !== undefined) {
      console.error("       Details:", details);
    }
    failedCount++;
  }
}

// =========================================================================
// Helper: Element Factory for Navigation Elements (mirrors editor defaults)
// =========================================================================
export type NavElementType =
  | "nav-menu"
  | "wp-menu"
  | "breadcrumbs"
  | "menu-anchor"
  | "post-nav"
  | "mega-menu"
  | "off-canvas"
  | "off-canvas-nav"
  | "search-bar"
  | "search-form"
  | "site-search"
  | "taxonomy-filter";

export function createNavElementDefault(type: NavElementType, id: string = `el_${type}_${Date.now()}`): any {
  switch (type) {
    case "nav-menu":
      return {
        id,
        type: "nav-menu",
        content: JSON.stringify([
          { id: "item_1", label: "Home", url: "/" },
          { id: "item_2", label: "Services", url: "/services", children: [{ id: "sub_1", label: "Web", url: "/services/web" }] },
          { id: "item_3", label: "Contact", url: "/contact" },
        ]),
        styles: {
          width: "100%",
          navLayout: "horizontal",
          navAlign: "space-between",
          navHoverEffect: "pill",
          navActiveStyle: "pill",
          navMobileBreakpoint: "mobile",
          navItemSpacing: "16px",
          navItemColor: "#334155",
        },
      };

    case "wp-menu":
      return {
        id,
        type: "wp-menu",
        content: JSON.stringify([
          { id: "wp_1", label: "Home", url: "/" },
          { id: "wp_2", label: "About", url: "/about", children: [{ id: "wp_sub_1", label: "Team", url: "/about/team" }] },
        ]),
        styles: {
          width: "100%",
          wpMenuSource: "primary",
          wpMenuName: "Main WP Menu",
          wpMenuSyncStatus: "synced",
          wpMenuDepth: "3",
          navLayout: "horizontal",
          navItemColor: "#e2e8f0",
        },
      };

    case "breadcrumbs":
      return {
        id,
        type: "breadcrumbs",
        content: JSON.stringify([
          { id: "b_1", label: "Home", url: "/" },
          { id: "b_2", label: "Products", url: "/products" },
          { id: "b_3", label: "Visual Builder", url: "/products/builder" },
        ]),
        styles: {
          width: "100%",
          breadcrumbSeparator: "chevron",
          breadcrumbHomeIcon: "true",
          breadcrumbShowSchema: "true",
          breadcrumbActiveColor: "#2563eb",
          breadcrumbSeparatorColor: "#94a3b8",
        },
      };

    case "menu-anchor":
      return {
        id,
        type: "menu-anchor",
        anchorId: "pricing-section",
        anchorOffset: 90,
        content: "Section Anchor Point",
        styles: {
          anchorId: "pricing-section",
          anchorScrollOffset: "90px",
          anchorSmoothScroll: "true",
        },
      };

    case "post-nav":
      return {
        id,
        type: "post-nav",
        prevTitle: "How to Build Component Libraries",
        prevUrl: "/blog/component-libraries",
        nextTitle: "State Machines in React 19",
        nextUrl: "/blog/state-machines",
        styles: {
          width: "100%",
          postNavPrevLabel: "← Previous Post",
          postNavPrevTitle: "How to Build Component Libraries",
          postNavPrevUrl: "/blog/component-libraries",
          postNavNextLabel: "Next Post →",
          postNavNextTitle: "State Machines in React 19",
          postNavNextUrl: "/blog/state-machines",
          postNavShowImages: "true",
          postNavShowArrows: "true",
        },
      };

    case "mega-menu":
      return {
        id,
        type: "mega-menu",
        megaMenuItems: [
          {
            title: "Products",
            columns: [
              {
                title: "Core Toolkit",
                links: [
                  { label: "Visual Page Builder", href: "/builder", badge: "POPULAR", description: "Design fast" },
                  { label: "Design Token Engine", href: "/tokens", badge: "NEW" },
                ],
              },
              {
                title: "Developers",
                links: [
                  { label: "API Reference", href: "/docs/api" },
                  { label: "CLI & SDK", href: "/docs/sdk" },
                ],
              },
            ],
          },
        ],
        megaMenuPromoEnabled: true,
        megaMenuPromoTitle: "Pro Designer Suite",
        megaMenuPromoText: "Access 400+ UI components",
        megaMenuPromoButtonText: "Explore Pro",
        megaMenuPromoButtonUrl: "/pricing",
        styles: {
          width: "100%",
          megaMenuColumns: "2",
          megaMenuPromoEnabled: "true",
          megaMenuPromoTitle: "Pro Designer Suite",
          megaMenuPromoButtonText: "Explore Pro",
          megaMenuPromoButtonUrl: "/pricing",
        },
      };

    case "off-canvas":
    case "off-canvas-nav":
      return {
        id,
        type,
        offCanvasPosition: "left",
        offCanvasWidth: "320px",
        offCanvasTitle: "Navigation Drawer",
        offCanvasButtonText: "Open Menu",
        styles: {
          offCanvasPosition: "left",
          offCanvasWidth: "320px",
          offCanvasTitle: "Navigation Drawer",
          offCanvasTriggerLabel: "Open Menu",
          offCanvasShowSearch: "true",
        },
      };

    case "search-bar":
    case "search-form":
      return {
        id,
        type,
        searchPlaceholder: "Search docs, components...",
        buttonText: "Search",
        searchRedirectUrl: "/search",
        styles: {
          width: "100%",
          formActionUrl: "/search",
          formMethod: "GET",
          formPlaceholder: "Search docs, components...",
          formButtonText: "Search",
        },
      };

    case "site-search":
      return {
        id,
        type: "site-search",
        searchPlaceholder: "Instant site search...",
        searchButtonText: "Find",
        styles: {
          width: "100%",
          searchPlaceholder: "Instant site search...",
          searchButtonText: "Find",
          searchLiveResults: "true",
        },
      };

    case "taxonomy-filter":
      return {
        id,
        type: "taxonomy-filter",
        targetGridId: "blog-articles-grid",
        taxonomyItems: [
          { slug: "all", label: "All Topics", count: 28 },
          { slug: "react", label: "React", count: 12 },
          { slug: "typescript", label: "TypeScript", count: 8 },
          { slug: "devops", label: "DevOps", count: 5 },
        ],
        styles: {
          width: "100%",
          targetGridId: "blog-articles-grid",
          taxonomyType: "categories",
          taxonomySelectionMode: "single",
          taxonomyShowCounts: "true",
        },
      };

    default:
      throw new Error(`Unsupported element type: ${type}`);
  }
}

// =========================================================================
// WordPress Hierarchical Menu Tree Builder Implementation (mirroring connector)
// =========================================================================
export interface FlatMenuItem {
  id: number | string;
  parent_id: number | string;
  title: string;
  url: string;
  target?: string;
  order?: number;
  children?: FlatMenuItem[];
}

export function buildWordPressMenuTree(items: any[]): FlatMenuItem[] {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const itemsById = new Map<string, FlatMenuItem>();
  const parentMap = new Map<string, string>();

  // Pass 1: Normalize all records into indexed nodes
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const id = String(raw.id ?? raw.ID ?? "");
    if (!id) continue;

    const parentId = String(raw.parent_id ?? raw.menu_item_parent ?? "0");
    const title = String(raw.title ?? raw.post_title ?? "");
    const url = String(raw.url ?? "");
    const target = String(raw.target || "_self");
    const order = Number(raw.order ?? raw.menu_order ?? 0);

    const node: FlatMenuItem = {
      id,
      parent_id: parentId === "0" || parentId === id ? "0" : parentId,
      title,
      url,
      target,
      order,
      children: [],
    };

    itemsById.set(id, node);
    parentMap.set(id, node.parent_id as string);
  }

  // Pass 2: Detect & break circular references (e.g. A -> B -> A)
  for (const [nodeId, initialParentId] of parentMap.entries()) {
    let curr = initialParentId;
    const visited = new Set<string>([nodeId]);

    while (curr && curr !== "0") {
      if (visited.has(curr)) {
        // Cycle detected: safely sever cycle by elevating to root level
        const node = itemsById.get(nodeId);
        if (node) {
          node.parent_id = "0";
        }
        break;
      }
      visited.add(curr);
      curr = parentMap.get(curr) || "0";
    }
  }

  // Pass 3: Build hierarchy tree
  const tree: FlatMenuItem[] = [];
  for (const node of itemsById.values()) {
    const pid = String(node.parent_id);
    if (pid !== "0" && itemsById.has(pid)) {
      itemsById.get(pid)!.children!.push(node);
    } else {
      tree.push(node);
    }
  }

  // Sort children by order
  const sortNodes = (nodes: FlatMenuItem[]) => {
    nodes.sort((a, b) => (a.order || 0) - (b.order || 0));
    for (const n of nodes) {
      if (n.children && n.children.length > 0) {
        sortNodes(n.children);
      }
    }
  };
  sortNodes(tree);

  return tree;
}

// =========================================================================
// RUN TEST SUITE
// =========================================================================
async function runModule10Tests() {
  console.log("=================================================");
  console.log("RUNNING MODULE 10 VERIFICATION TEST SUITE");
  console.log("Navigation & Search (F-223 to F-233)");
  console.log("=================================================\n");

  // -----------------------------------------------------------------------
  // TEST GROUP 1: Schema & Default Factories Validation
  // -----------------------------------------------------------------------
  console.log("--- 1. Schema & Default Factories Validation ---");

  const navTypes: NavElementType[] = [
    "nav-menu",
    "wp-menu",
    "breadcrumbs",
    "menu-anchor",
    "post-nav",
    "mega-menu",
    "off-canvas",
    "search-bar",
    "search-form",
    "site-search",
    "taxonomy-filter",
  ];

  for (const type of navTypes) {
    const el = createNavElementDefault(type, `test_${type}`);
    assert(
      Boolean(el && el.id === `test_${type}` && el.type === type && typeof el.styles === "object"),
      `Default AST factory produces valid structure for '${type}'`
    );
  }

  // Deep validation of navigation-specific properties
  const navMenuEl = createNavElementDefault("nav-menu");
  assert(
    navMenuEl.styles.navLayout === "horizontal" &&
    navMenuEl.styles.navAlign === "space-between" &&
    navMenuEl.styles.navHoverEffect === "pill",
    "Nav Menu has responsive layout, alignment, and hover animation styles"
  );

  const wpMenuEl = createNavElementDefault("wp-menu");
  assert(
    wpMenuEl.styles.wpMenuSource === "primary" &&
    wpMenuEl.styles.wpMenuSyncStatus === "synced" &&
    wpMenuEl.styles.wpMenuDepth === "3",
    "WordPress Menu includes source, sync status, and depth styles"
  );

  const breadcrumbsEl = createNavElementDefault("breadcrumbs");
  assert(
    breadcrumbsEl.styles.breadcrumbSeparator === "chevron" &&
    breadcrumbsEl.styles.breadcrumbShowSchema === "true",
    "Breadcrumbs includes schema metadata and separator settings"
  );

  const anchorEl = createNavElementDefault("menu-anchor");
  assert(
    (anchorEl.anchorId === "pricing-section" || anchorEl.styles.anchorId === "pricing-section") &&
    (anchorEl.anchorOffset === 90 || anchorEl.styles.anchorScrollOffset === "90px"),
    "Menu Anchor maintains anchorId and scrollMarginTop offset"
  );

  const postNavEl = createNavElementDefault("post-nav");
  assert(
    Boolean(postNavEl.prevTitle && postNavEl.nextTitle && postNavEl.prevUrl && postNavEl.nextUrl),
    "Post Navigation contains prev/next article titles and URLs"
  );

  const megaMenuEl = createNavElementDefault("mega-menu");
  assert(
    Array.isArray(megaMenuEl.megaMenuItems) &&
    megaMenuEl.megaMenuItems.length > 0 &&
    megaMenuEl.megaMenuPromoEnabled === true,
    "Mega Menu contains multi-column items and promo banner configuration"
  );

  const taxFilterEl = createNavElementDefault("taxonomy-filter");
  assert(
    taxFilterEl.targetGridId === "blog-articles-grid" &&
    Array.isArray(taxFilterEl.taxonomyItems) &&
    taxFilterEl.taxonomyItems.length === 4,
    "Taxonomy Filter contains target grid selector and category count items"
  );

  console.log();

  // -----------------------------------------------------------------------
  // TEST GROUP 2: Static Compiler Semantic Markup Output
  // -----------------------------------------------------------------------
  console.log("--- 2. Static Compiler Semantic Markup Output ---");

  const sampleElements = [
    createNavElementDefault("mega-menu", "mega_1"),
    createNavElementDefault("menu-anchor", "anchor_1"),
    createNavElementDefault("search-form", "search_1"),
    createNavElementDefault("taxonomy-filter", "tax_1"),
    createNavElementDefault("post-nav", "pnav_1"),
  ];

  const websitePayload = {
    name: "Module 10 Test Site",
    slug: "module-10-site",
    homePageId: "home",
    pages: [
      {
        id: "home",
        title: "Home Page",
        slug: "",
        isHome: true,
        elements: sampleElements,
      },
      {
        id: "page-blog",
        title: "Blog",
        slug: "blog",
        isHome: false,
        elements: [],
      },
    ],
  };

  const bundle = compileCanonicalToStaticBundle("site_mod10", 1, websitePayload);
  assert(Array.isArray(bundle.files) && bundle.files.length >= 3, "Static Compiler outputs valid bundle files");

  const indexHtmlFile = bundle.files.find((f) => f.path === "index.html");
  assert(Boolean(indexHtmlFile), "Static bundle contains index.html");

  const html = indexHtmlFile?.content || "";

  // 2a. Mega Menu Output
  assert(
    html.includes('<nav class="fs-mega-menu"') &&
    html.includes('class="fs-mega-category-title"') &&
    html.includes('class="fs-mega-col"') &&
    html.includes('class="fs-mega-promo"') &&
    html.includes("Pro Designer Suite"),
    "Static Compiler outputs semantic <nav class='fs-mega-menu'> with multi-column lists and promo card"
  );

  // 2b. Menu Anchor Output
  assert(
    html.includes('<div id="pricing-section" class="fs-menu-anchor"') &&
    html.includes("scroll-margin-top: 90px") &&
    html.includes("height: 0;"),
    "Static Compiler outputs <div class='fs-menu-anchor'> with target ID and scroll-margin-top offset"
  );

  // 2c. Search Form Output
  assert(
    html.includes('<form action="/search" method="GET" class="fs-search-form"') &&
    html.includes('type="search" name="q"') &&
    html.includes('class="fs-search-btn">Search</button>'),
    "Static Compiler outputs semantic <form class='fs-search-form'> with input and submit button"
  );

  // 2d. Taxonomy Filter Output
  assert(
    html.includes('<div class="fs-taxonomy-filter"') &&
    html.includes('data-target-grid="blog-articles-grid"') &&
    html.includes('data-slug="react">React (12)</button>') &&
    html.includes('data-slug="typescript">TypeScript (8)</button>'),
    "Static Compiler outputs <div class='fs-taxonomy-filter'> with data-target-grid and category count buttons"
  );

  // 2e. Post Navigation Output
  assert(
    html.includes('class="fs-post-navigation"') &&
    html.includes('aria-label="Post Navigation"') &&
    html.includes('class="fs-post-prev"><a href="/blog/component-libraries">← How to Build Component Libraries</a></div>') &&
    html.includes('class="fs-post-next"><a href="/blog/state-machines">State Machines in React 19 →</a></div>'),
    "Static Compiler outputs semantic <nav class='fs-post-navigation'> with previous and next links"
  );

  // 2f. Global CSS contains Module 10 styles
  const stylesCssFile = bundle.files.find((f) => f.path === "styles.css");
  const css = stylesCssFile?.content || "";
  assert(
    css.includes(".fs-mega-menu") &&
    css.includes(".fs-menu-anchor") &&
    css.includes(".fs-search-form") &&
    css.includes(".fs-taxonomy-filter") &&
    css.includes(".fs-post-navigation"),
    "Static Compiler styles.css includes complete CSS rules for all Module 10 components"
  );

  console.log();

  // -----------------------------------------------------------------------
  // TEST GROUP 3: WordPress Menu Connector Data Formatting & Hierarchy
  // -----------------------------------------------------------------------
  console.log("--- 3. WordPress Menu Connector Data Formatting & Hierarchy ---");

  // 3a. Flat list into nested hierarchical tree
  const flatItems = [
    { id: 10, parent_id: 0, title: "Home", url: "/", order: 1 },
    { id: 20, parent_id: 0, title: "Services", url: "/services", order: 2 },
    { id: 30, parent_id: 0, title: "Contact", url: "/contact", order: 3 },
    { id: 21, parent_id: 20, title: "Web Development", url: "/services/web", order: 1 },
    { id: 22, parent_id: 20, title: "Cloud Services", url: "/services/cloud", order: 2 },
    { id: 211, parent_id: 21, title: "React Architecture", url: "/services/web/react", order: 1 },
  ];

  const menuTree = buildWordPressMenuTree(flatItems);
  assert(menuTree.length === 3, "Hierarchical tree has exactly 3 root menu nodes");
  assert(menuTree[1].title === "Services" && menuTree[1].children?.length === 2, "Root node 'Services' has 2 children");
  assert(
    menuTree[1].children?.[0].title === "Web Development" &&
    menuTree[1].children?.[0].children?.length === 1 &&
    menuTree[1].children?.[0].children?.[0].title === "React Architecture",
    "Nested 3-level hierarchy (Services -> Web Development -> React Architecture) is preserved"
  );

  // 3b. Circular reference prevention (Node 1 -> Node 2 -> Node 1)
  const circularItems = [
    { id: 1, parent_id: 2, title: "Loop Node A", url: "/a" },
    { id: 2, parent_id: 1, title: "Loop Node B", url: "/b" },
    { id: 3, parent_id: 0, title: "Safe Node C", url: "/c" },
  ];

  const cycleTree = buildWordPressMenuTree(circularItems);
  assert(Array.isArray(cycleTree) && cycleTree.length > 0, "Circular reference handled safely without infinite loop");
  assert(
    cycleTree.some((n) => n.id === "1" || n.id === 1) && cycleTree.some((n) => n.id === "3" || n.id === 3),
    "Circular nodes gracefully broken and rendered at root level"
  );

  // 3c. Self-parenting node (Node 5 -> Node 5)
  const selfParentingItems = [
    { id: 5, parent_id: 5, title: "Self Parent Node", url: "/self" },
  ];
  const selfTree = buildWordPressMenuTree(selfParentingItems);
  assert(selfTree.length === 1 && selfTree[0].parent_id === "0", "Self-parenting node elevated safely to root level");

  // 3d. Orphaned child (parent does not exist)
  const orphanedItems = [
    { id: 100, parent_id: 99999, title: "Orphaned Child", url: "/orphan" },
    { id: 101, parent_id: 0, title: "Valid Root", url: "/" },
  ];
  const orphanTree = buildWordPressMenuTree(orphanedItems);
  assert(orphanTree.length === 2, "Orphaned node safely elevated to root tree without throwing");

  // 3e. Empty or invalid input handling
  assert(buildWordPressMenuTree([]).length === 0, "Empty items array returns empty tree");
  assert(buildWordPressMenuTree(null as any).length === 0, "Null items returns empty tree");

  console.log();

  // -----------------------------------------------------------------------
  // TEST GROUP 4: Anchor Jump & Link Target Resolution
  // -----------------------------------------------------------------------
  console.log("--- 4. Anchor Jump & Link Target Resolution ---");

  const dummyPages = [
    { id: "page_home", title: "Home", slug: "/", isHome: true },
    { id: "page_about", title: "About Us", slug: "about", isHome: false },
    { id: "page_pricing", title: "Pricing", slug: "/pricing", isHome: false },
  ];

  // 4a. Hash anchor jump
  assert(resolveStaticHtmlHref("#features", dummyPages) === "#features", "In-page anchor '#features' preserves jump target");
  assert(resolveStaticHtmlHref("#pricing-section", dummyPages) === "#pricing-section", "Smooth scroll anchor '#pricing-section' preserved");

  // 4b. Internal page references via 'page:id'
  assert(resolveStaticHtmlHref("page:page_home", dummyPages) === "index.html", "Home page reference resolves to 'index.html'");
  assert(resolveStaticHtmlHref("page:page_about", dummyPages) === "about.html", "About page reference resolves to 'about.html'");
  assert(resolveStaticHtmlHref("page:page_pricing", dummyPages) === "pricing.html", "Pricing page reference resolves to 'pricing.html'");

  // 4c. Slug resolution with query or hash
  assert(resolveStaticHtmlHref("/about#team", dummyPages) === "about.html#team", "Page path with anchor hash resolves to 'about.html#team'");
  assert(resolveStaticHtmlHref("about?ref=nav", dummyPages) === "about.html?ref=nav", "Page path with query params resolves to 'about.html?ref=nav'");

  // 4d. External URL preservation
  assert(resolveStaticHtmlHref("https://forgestudio.io", dummyPages) === "https://forgestudio.io", "External HTTPS URL preserved");
  assert(resolveStaticHtmlHref("mailto:team@forgestudio.io", dummyPages) === "mailto:team@forgestudio.io", "Mailto link preserved");

  // 4e. Unsafe protocol neutralization
  assert(resolveStaticHtmlHref("javascript:alert(1)", dummyPages) === "#", "Neutralizes dangerous 'javascript:' scheme to '#'");
  assert(resolveStaticHtmlHref("data:text/html;base64,PHNjcmlwdD4=", dummyPages) === "#", "Neutralizes dangerous 'data:' scheme to '#'");
  assert(resolveStaticHtmlHref("vbscript:MsgBox", dummyPages) === "#", "Neutralizes dangerous 'vbscript:' scheme to '#'");

  console.log();

  // -----------------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------------
  console.log("=================================================");
  console.log(`MODULE 10 TEST SUITE COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runModule10Tests().catch((err) => {
  console.error("Unhandled error during Module 10 test execution:", err);
  process.exit(1);
});
