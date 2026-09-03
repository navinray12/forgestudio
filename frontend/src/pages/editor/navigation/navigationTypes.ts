// ==========================================================
// Navigation & Search Element Types & Interfaces (F-223 to F-233)
// ==========================================================

export type NavigationElementType =
  | "nav-menu"         // F-223: Nav Menu
  | "wp-menu"          // F-224: WordPress Menu
  | "menu-widget"      // F-225: Menu Widget
  | "mega-menu"        // F-226: Mega Menu
  | "breadcrumbs"      // F-227: Breadcrumbs
  | "menu-anchor"      // F-228: Menu Anchor
  | "post-nav"         // F-229: Post Navigation
  | "off-canvas-nav"   // F-230: Off Canvas Navigation
  | "site-search"      // F-231: Search
  | "search-form"      // F-232: Search Form
  | "taxonomy-filter"; // F-233: Taxonomy Filter

// ----------------------------------------------------------
// Sub-types for Navigation elements
// ----------------------------------------------------------

export interface NavMenuItem {
  id: string;
  label: string;
  url: string;
  target?: "_self" | "_blank";
  badge?: string;
  badgeColor?: string;
  icon?: string;
  children?: Array<{
    id: string;
    label: string;
    url: string;
    target?: "_self" | "_blank";
    badge?: string;
    description?: string;
  }>;
}

export interface MegaMenuColumn {
  id: string;
  title: string;
  icon?: string;
  links: Array<{
    id: string;
    label: string;
    url: string;
    badge?: string;
    description?: string;
  }>;
}

export interface BreadcrumbItem {
  id: string;
  label: string;
  url?: string;
  isCurrent?: boolean;
}

export interface TaxonomyItem {
  id: string;
  name: string;
  slug: string;
  count: number;
  active?: boolean;
}

export interface SearchSampleResult {
  id: string;
  title: string;
  category: string;
  snippet: string;
  url: string;
}

// ----------------------------------------------------------
// Navigation-specific Styles and Options
// ----------------------------------------------------------

export interface NavigationStyles {
  maxWidth?: string;

  // Common Navigation
  navLayout?: "horizontal" | "vertical";
  navAlign?: "left" | "center" | "right" | "space-between";
  navHoverEffect?: "underline" | "pill" | "fade" | "glow" | "top-line" | "none";
  navActiveStyle?: "bold" | "pill" | "underline" | "dot";
  navMobileBreakpoint?: "mobile" | "tablet" | "laptop" | "none";
  navMobileMenuOpen?: "true" | "false";
  navItemSpacing?: string;
  navItemColor?: string;
  navItemHoverColor?: string;
  navItemActiveColor?: string;
  navItemBgColor?: string;
  navItemHoverBgColor?: string;
  navDropdownBg?: string;
  navDropdownShadow?: string;
  navDropdownTextColor?: string;

  // WordPress Menu (F-224)
  wpMenuSource?: "primary" | "header" | "footer" | "secondary" | "custom";
  wpMenuName?: string;
  wpMenuSyncStatus?: "synced" | "pending" | "fallback";
  wpMenuDepth?: string;
  wpShowBadge?: "true" | "false";

  // Menu Widget (F-225)
  menuTrigger?: "hover" | "click";
  menuAnimation?: "fade" | "slide-down" | "scale" | "flip";
  menuIndicator?: "chevron" | "arrow" | "plus" | "dot" | "none";
  menuBadgeBg?: string;
  menuBadgeColor?: string;

  // Mega Menu (F-226)
  megaMenuColumns?: string;
  megaMenuWidth?: "full" | "container" | "custom";
  megaMenuCustomWidth?: string;
  megaMenuPromoEnabled?: "true" | "false";
  megaMenuPromoTitle?: string;
  megaMenuPromoText?: string;
  megaMenuPromoImage?: string;
  megaMenuPromoBadge?: string;
  megaMenuPromoButtonText?: string;
  megaMenuPromoButtonUrl?: string;
  megaMenuDropdownBg?: string;

  // Breadcrumbs (F-227)
  breadcrumbSeparator?: "slash" | "chevron" | "arrow" | "bullet" | "pipe";
  breadcrumbCustomSeparator?: string;
  breadcrumbHomeIcon?: "true" | "false";
  breadcrumbHomeLabel?: string;
  breadcrumbShowSchema?: "true" | "false";
  breadcrumbActiveColor?: string;
  breadcrumbSeparatorColor?: string;

  // Menu Anchor (F-228)
  anchorId?: string;
  anchorScrollOffset?: string;
  anchorSmoothScroll?: "true" | "false";
  anchorTitle?: string;

  // Post Navigation (F-229)
  postNavLayout?: "split" | "stacked" | "card";
  postNavPrevLabel?: string;
  postNavPrevTitle?: string;
  postNavPrevUrl?: string;
  postNavPrevImage?: string;
  postNavNextLabel?: string;
  postNavNextTitle?: string;
  postNavNextUrl?: string;
  postNavNextImage?: string;
  postNavShowImages?: "true" | "false";
  postNavShowArrows?: "true" | "false";
  postNavCardBg?: string;
  postNavCardHoverBg?: string;

  // Off Canvas Navigation (F-230)
  offCanvasPosition?: "left" | "right" | "top" | "bottom";
  offCanvasWidth?: string;
  offCanvasBgColor?: string;
  offCanvasOverlayColor?: string;
  offCanvasTriggerLabel?: string;
  offCanvasTriggerIcon?: "hamburger" | "dots" | "menu-text" | "custom";
  offCanvasTriggerStyle?: "button" | "icon-only" | "floating" | "pill";
  offCanvasTitle?: string;
  offCanvasShowSearch?: "true" | "false";
  offCanvasShowSocials?: "true" | "false";
  offCanvasIsOpen?: "true" | "false";

  // Search (F-231)
  searchPlaceholder?: string;
  searchButtonText?: string;
  searchLiveResults?: "true" | "false";
  searchResultCount?: string;
  searchStyleVariant?: "classic" | "minimal" | "floating" | "pill";
  searchIconPosition?: "left" | "right";
  searchShowClear?: "true" | "false";
  searchDropdownBg?: string;

  // Search Form (F-232)
  formActionUrl?: string;
  formMethod?: "GET" | "POST";
  formParamName?: string;
  formPlaceholder?: string;
  formButtonText?: string;
  formButtonIcon?: "true" | "false";
  formFilterPostType?: string;
  formFilterCategory?: string;
  formButtonBg?: string;
  formButtonTextColor?: string;
  formInputBorderColor?: string;

  // Taxonomy Filter (F-233)
  taxonomyType?: "categories" | "tags" | "authors" | "custom";
  taxonomySelectionMode?: "single" | "multi";
  taxonomyLayout?: "pills" | "tabs" | "dropdown" | "sidebar-list";
  taxonomyShowCounts?: "true" | "false";
  taxonomyShowAll?: "true" | "false";
  taxonomyAllLabel?: string;
  taxonomyActiveBg?: string;
  taxonomyActiveTextColor?: string;
  taxonomyItemBg?: string;
  taxonomyItemTextColor?: string;
}
