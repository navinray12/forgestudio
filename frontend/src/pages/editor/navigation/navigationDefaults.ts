import type { EditorElement, ElementType } from "../WebsiteEditor";
import type {
  NavMenuItem,
  MegaMenuColumn,
  BreadcrumbItem,
  TaxonomyItem,
  SearchSampleResult,
} from "./navigationTypes";

export const DEFAULT_NAV_MENU_ITEMS: NavMenuItem[] = [
  { id: "item_1", label: "Home", url: "/" },
  {
    id: "item_2",
    label: "Services",
    url: "/services",
    children: [
      { id: "sub_1", label: "Web Development", url: "/services/web", description: "Modern React & Next.js apps", badge: "POPULAR" },
      { id: "sub_2", label: "Cloud & DevOps", url: "/services/cloud", description: "AWS, GCP & Docker solutions" },
      { id: "sub_3", label: "AI Integration", url: "/services/ai", description: "LLMs, Agents & Automation", badge: "NEW" },
    ],
  },
  { id: "item_3", label: "Pricing", url: "/pricing", badge: "SALE", badgeColor: "#ef4444" },
  { id: "item_4", label: "Blog", url: "/blog" },
  { id: "item_5", label: "Contact", url: "/contact" },
];

export const DEFAULT_WP_MENU_ITEMS: NavMenuItem[] = [
  { id: "wp_1", label: "Home", url: "/" },
  {
    id: "wp_2",
    label: "About Us",
    url: "/about",
    children: [
      { id: "wp_sub_1", label: "Our Story", url: "/about/story" },
      { id: "wp_sub_2", label: "Leadership Team", url: "/about/team" },
      { id: "wp_sub_3", label: "Careers", url: "/about/careers", badge: "WE'RE HIRING" },
    ],
  },
  { id: "wp_3", label: "Case Studies", url: "/case-studies" },
  { id: "wp_4", label: "Docs", url: "/docs" },
  { id: "wp_5", label: "Support", url: "/support" },
];

export const DEFAULT_MEGA_MENU_COLUMNS: MegaMenuColumn[] = [
  {
    id: "col_1",
    title: "Core Platform",
    icon: "⚡",
    links: [
      { id: "ml_1", label: "Visual Page Builder", url: "/builder", description: "Drag & drop site creation", badge: "PRO" },
      { id: "ml_2", label: "Component Studio", url: "/components", description: "Custom UI widget toolkit" },
      { id: "ml_3", label: "API & Webhooks", url: "/api", description: "Automated sync pipeline" },
    ],
  },
  {
    id: "col_2",
    title: "Solutions",
    icon: "💼",
    links: [
      { id: "ml_4", label: "For Agencies", url: "/agencies", description: "Multi-tenant client management" },
      { id: "ml_5", label: "For Enterprises", url: "/enterprise", description: "SAML, SSO & 99.99% SLA" },
      { id: "ml_6", label: "For Startups", url: "/startups", description: "Scale from 0 to 1M users" },
    ],
  },
  {
    id: "col_3",
    title: "Resources & Learn",
    icon: "📚",
    links: [
      { id: "ml_7", label: "Documentation", url: "/docs", description: "Comprehensive API guides" },
      { id: "ml_8", label: "Video Tutorials", url: "/tutorials", description: "Step-by-step masterclasses" },
      { id: "ml_9", label: "Community Forum", url: "/community", description: "Join 45k+ builders", badge: "ACTIVE" },
    ],
  },
];

export const DEFAULT_BREADCRUMBS: BreadcrumbItem[] = [
  { id: "bc_1", label: "Home", url: "/" },
  { id: "bc_2", label: "Products", url: "/products" },
  { id: "bc_3", label: "Developer Tools", url: "/products/developer-tools" },
  { id: "bc_4", label: "Visual Site Editor", isCurrent: true },
];

export const DEFAULT_TAXONOMY_ITEMS: TaxonomyItem[] = [
  { id: "tax_1", name: "All Topics", slug: "all", count: 48, active: true },
  { id: "tax_2", name: "Web Design", slug: "web-design", count: 18 },
  { id: "tax_3", name: "Engineering", slug: "engineering", count: 14 },
  { id: "tax_4", name: "Productivity", slug: "productivity", count: 9 },
  { id: "tax_5", name: "AI & Tools", slug: "ai-tools", count: 7 },
];

export const DEFAULT_SEARCH_RESULTS: SearchSampleResult[] = [
  {
    id: "sr_1",
    title: "Getting Started with Navigation Menus",
    category: "Guides",
    snippet: "Learn how to build responsive navigation bars, mega menus, and mobile drawers effortlessly.",
    url: "/docs/navigation-menus",
  },
  {
    id: "sr_2",
    title: "WordPress Menu Sync & Hierarchies",
    category: "Integration",
    snippet: "Connect WordPress REST API to sync custom navigation menus and hierarchical structures.",
    url: "/docs/wordpress-sync",
  },
  {
    id: "sr_3",
    title: "Optimizing Search & Taxonomy Filters",
    category: "Performance",
    snippet: "Speed up client-side search query indexing and multi-tag filtering with live preview.",
    url: "/docs/search-optimization",
  },
];

export function getNavigationDefaultElement(type: ElementType, id: string): EditorElement | null {
  switch (type) {
    // --------------------------------------------------------
    // F-223: Nav Menu
    // --------------------------------------------------------
    case "nav-menu":
      return {
        id,
        type: "nav-menu",
        content: JSON.stringify(DEFAULT_NAV_MENU_ITEMS),
        styles: {
          width: "100%",
          paddingTop: "12px",
          paddingBottom: "12px",
          paddingLeft: "16px",
          paddingRight: "16px",
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          marginTop: "12px",
          marginBottom: "12px",
          navLayout: "horizontal",
          navAlign: "space-between",
          navHoverEffect: "pill",
          navActiveStyle: "pill",
          navMobileBreakpoint: "mobile",
          navItemSpacing: "16px",
          navItemColor: "#334155",
          navItemHoverColor: "#2563eb",
          navItemActiveColor: "#2563eb",
          navDropdownBg: "#ffffff",
          navDropdownShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
        },
      };

    // --------------------------------------------------------
    // F-224: WordPress Menu
    // --------------------------------------------------------
    case "wp-menu":
      return {
        id,
        type: "wp-menu",
        content: JSON.stringify(DEFAULT_WP_MENU_ITEMS),
        styles: {
          width: "100%",
          paddingTop: "12px",
          paddingBottom: "12px",
          paddingLeft: "16px",
          paddingRight: "16px",
          backgroundColor: "#0f172a",
          borderRadius: "12px",
          marginTop: "12px",
          marginBottom: "12px",
          wpMenuSource: "primary",
          wpMenuName: "Main WordPress Menu",
          wpMenuSyncStatus: "synced",
          wpMenuDepth: "3",
          wpShowBadge: "true",
          navLayout: "horizontal",
          navAlign: "left",
          navHoverEffect: "glow",
          navItemSpacing: "20px",
          navItemColor: "#e2e8f0",
          navItemHoverColor: "#38bdf8",
          navItemActiveColor: "#38bdf8",
          navDropdownBg: "#1e293b",
        },
      };

    // --------------------------------------------------------
    // F-225: Menu Widget
    // --------------------------------------------------------
    case "menu-widget":
      return {
        id,
        type: "menu-widget",
        content: JSON.stringify(DEFAULT_NAV_MENU_ITEMS),
        styles: {
          width: "100%",
          paddingTop: "14px",
          paddingBottom: "14px",
          paddingLeft: "20px",
          paddingRight: "20px",
          backgroundColor: "#f8fafc",
          borderRadius: "14px",
          borderWidth: "1px",
          borderColor: "#e2e8f0",
          marginTop: "12px",
          marginBottom: "12px",
          menuTrigger: "hover",
          menuAnimation: "slide-down",
          menuIndicator: "chevron",
          menuBadgeBg: "#ef4444",
          menuBadgeColor: "#ffffff",
          navHoverEffect: "pill",
          navItemColor: "#1e293b",
          navItemHoverColor: "#2563eb",
          navItemSpacing: "18px",
          navDropdownBg: "#ffffff",
        },
      };

    // --------------------------------------------------------
    // F-226: Mega Menu
    // --------------------------------------------------------
    case "mega-menu":
      return {
        id,
        type: "mega-menu",
        content: JSON.stringify(DEFAULT_MEGA_MENU_COLUMNS),
        styles: {
          width: "100%",
          paddingTop: "14px",
          paddingBottom: "14px",
          paddingLeft: "24px",
          paddingRight: "24px",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.08)",
          marginTop: "12px",
          marginBottom: "12px",
          megaMenuColumns: "3",
          megaMenuWidth: "container",
          megaMenuPromoEnabled: "true",
          megaMenuPromoTitle: "Pro Designer Bundle 2.0",
          megaMenuPromoText: "Unlock 500+ premium UI templates and responsive components.",
          megaMenuPromoImage: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=600&auto=format&fit=crop&q=80",
          megaMenuPromoBadge: "SPECIAL OFFER",
          megaMenuPromoButtonText: "Explore Now →",
          megaMenuPromoButtonUrl: "/pricing",
          megaMenuDropdownBg: "#ffffff",
          navItemColor: "#0f172a",
          navItemHoverColor: "#2563eb",
        },
      };

    // --------------------------------------------------------
    // F-227: Breadcrumbs
    // --------------------------------------------------------
    case "breadcrumbs":
      return {
        id,
        type: "breadcrumbs",
        content: JSON.stringify(DEFAULT_BREADCRUMBS),
        styles: {
          width: "100%",
          paddingTop: "8px",
          paddingBottom: "8px",
          paddingLeft: "12px",
          paddingRight: "12px",
          backgroundColor: "#f8fafc",
          borderRadius: "8px",
          marginTop: "8px",
          marginBottom: "8px",
          fontSize: "13px",
          breadcrumbSeparator: "chevron",
          breadcrumbHomeIcon: "true",
          breadcrumbHomeLabel: "Home",
          breadcrumbShowSchema: "true",
          breadcrumbActiveColor: "#2563eb",
          breadcrumbSeparatorColor: "#94a3b8",
          navItemColor: "#64748b",
        },
      };

    // --------------------------------------------------------
    // F-228: Menu Anchor
    // --------------------------------------------------------
    case "menu-anchor":
      return {
        id,
        type: "menu-anchor",
        content: "Section Anchor Point",
        styles: {
          width: "100%",
          marginTop: "4px",
          marginBottom: "4px",
          anchorId: "features-section",
          anchorScrollOffset: "80px",
          anchorSmoothScroll: "true",
          anchorTitle: "Features Section Anchor",
        },
      };

    // --------------------------------------------------------
    // F-229: Post Navigation
    // --------------------------------------------------------
    case "post-nav":
      return {
        id,
        type: "post-nav",
        content: "Previous / Next Content Navigation",
        styles: {
          width: "100%",
          marginTop: "16px",
          marginBottom: "16px",
          postNavLayout: "split",
          postNavPrevLabel: "← Previous Post",
          postNavPrevTitle: "10 Essential UI/UX Principles for Modern Web Apps",
          postNavPrevUrl: "/blog/ux-principles",
          postNavPrevImage: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=300&auto=format&fit=crop&q=80",
          postNavNextLabel: "Next Post →",
          postNavNextTitle: "Building High-Performance React Component Libraries",
          postNavNextUrl: "/blog/react-components",
          postNavNextImage: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=300&auto=format&fit=crop&q=80",
          postNavShowImages: "true",
          postNavShowArrows: "true",
          postNavCardBg: "#ffffff",
          postNavCardHoverBg: "#f8fafc",
          borderRadius: "14px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        },
      };

    // --------------------------------------------------------
    // F-230: Off Canvas Navigation
    // --------------------------------------------------------
    case "off-canvas-nav":
      return {
        id,
        type: "off-canvas-nav",
        content: JSON.stringify(DEFAULT_NAV_MENU_ITEMS),
        styles: {
          width: "auto",
          marginTop: "12px",
          marginBottom: "12px",
          offCanvasPosition: "left",
          offCanvasWidth: "340px",
          offCanvasBgColor: "#0f172a",
          offCanvasOverlayColor: "rgba(15, 23, 42, 0.6)",
          offCanvasTriggerLabel: "Menu",
          offCanvasTriggerIcon: "hamburger",
          offCanvasTriggerStyle: "button",
          offCanvasTitle: "Forge Studio Navigation",
          offCanvasShowSearch: "true",
          offCanvasShowSocials: "true",
          offCanvasIsOpen: "false",
          backgroundColor: "#2563eb",
          color: "#ffffff",
          paddingTop: "10px",
          paddingBottom: "10px",
          paddingLeft: "18px",
          paddingRight: "18px",
          borderRadius: "10px",
        },
      };

    // --------------------------------------------------------
    // F-231: Search
    // --------------------------------------------------------
    case "site-search":
      return {
        id,
        type: "site-search",
        content: JSON.stringify(DEFAULT_SEARCH_RESULTS),
        styles: {
          width: "100%",
          maxWidth: "480px",
          marginTop: "12px",
          marginBottom: "12px",
          searchPlaceholder: "Search docs, components, articles...",
          searchButtonText: "Search",
          searchLiveResults: "true",
          searchResultCount: "3",
          searchStyleVariant: "pill",
          searchIconPosition: "left",
          searchShowClear: "true",
          searchDropdownBg: "#ffffff",
          backgroundColor: "#ffffff",
          borderRadius: "9999px",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.06)",
        },
      };

    // --------------------------------------------------------
    // F-232: Search Form
    // --------------------------------------------------------
    case "search-form":
      return {
        id,
        type: "search-form",
        content: "Search Form",
        styles: {
          width: "100%",
          marginTop: "12px",
          marginBottom: "12px",
          formActionUrl: "/search",
          formMethod: "GET",
          formParamName: "q",
          formPlaceholder: "Type keywords and hit Enter...",
          formButtonText: "Search",
          formButtonIcon: "true",
          formFilterPostType: "all",
          formFilterCategory: "all",
          formButtonBg: "#2563eb",
          formButtonTextColor: "#ffffff",
          formInputBorderColor: "#cbd5e1",
          borderRadius: "12px",
        },
      };

    // --------------------------------------------------------
    // F-233: Taxonomy Filter
    // --------------------------------------------------------
    case "taxonomy-filter":
      return {
        id,
        type: "taxonomy-filter",
        content: JSON.stringify(DEFAULT_TAXONOMY_ITEMS),
        styles: {
          width: "100%",
          marginTop: "12px",
          marginBottom: "12px",
          taxonomyType: "categories",
          taxonomySelectionMode: "single",
          taxonomyLayout: "pills",
          taxonomyShowCounts: "true",
          taxonomyShowAll: "true",
          taxonomyAllLabel: "All Topics",
          taxonomyActiveBg: "#2563eb",
          taxonomyActiveTextColor: "#ffffff",
          taxonomyItemBg: "#f1f5f9",
          taxonomyItemTextColor: "#475569",
          borderRadius: "10px",
          paddingTop: "6px",
          paddingBottom: "6px",
        },
      };

    default:
      return null;
  }
}

export function isNavigationElement(type: string): boolean {
  return [
    "nav-menu",
    "wp-menu",
    "menu-widget",
    "mega-menu",
    "breadcrumbs",
    "menu-anchor",
    "post-nav",
    "off-canvas-nav",
    "site-search",
    "search-form",
    "taxonomy-filter",
  ].includes(type);
}

