import type { PageConfig, EditorElement, NavMenuItem, SitePartsConfig } from "../types";

/**
 * Generates a clean, URL-safe slug from a raw title string.
 * Example: "About Us" -> "/about-us"
 */
export function generateSlug(rawTitle: string, existingSlugs: string[] = [], allowRoot = false): string {
  if (!rawTitle || rawTitle.trim() === "") return "/page";

  const cleaned = rawTitle
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (allowRoot && (cleaned === "home" || cleaned === "root" || cleaned === "")) {
    return "/";
  }

  let slug = `/${cleaned || "page"}`;
  let counter = 1;
  while (existingSlugs.includes(slug)) {
    counter++;
    slug = `/${cleaned || "page"}-${counter}`;
  }

  return slug;
}

/**
 * Validates a page slug against existing pages and reserved keywords.
 */
export function validateSlug(
  rawSlug: string,
  existingPages: PageConfig[],
  currentPageId?: string
): { isValid: boolean; slug: string; error?: string } {
  let slug = (rawSlug || "").trim();

  if (!slug) {
    return { isValid: false, slug: "", error: "Page slug cannot be empty." };
  }

  if (!slug.startsWith("/")) {
    slug = `/${slug}`;
  }

  // Sanitize path characters
  slug = slug.toLowerCase().replace(/[^\w/-]/g, "");

  // Reserved paths
  const reservedPaths = ["/api", "/admin", "/super-admin", "/login", "/signup", "/editor", "/dashboard", "/subscriptions"];
  if (reservedPaths.includes(slug)) {
    return { isValid: false, slug, error: `"${slug}" is a reserved system route and cannot be used.` };
  }

  // Duplicate check
  const duplicate = existingPages.find(
    (p) => p.slug.toLowerCase() === slug && p.id !== currentPageId
  );
  if (duplicate) {
    return {
      isValid: false,
      slug,
      error: `Slug "${slug}" is already in use by page "${duplicate.name}". Please choose a unique slug.`,
    };
  }

  return { isValid: true, slug };
}

/**
 * Dynamically resolves an internal page link or external URL.
 * Internal links: "page:page_123" -> "/about-us"
 * Home page always resolves to "/" regardless of its slug.
 */
export function resolveInternalLink(
  linkStr: string | undefined,
  pages: PageConfig[] = [],
  homePageId?: string
): string {
  if (!linkStr || linkStr.trim() === "") return "#";

  const cleanLink = linkStr.trim();

  if (cleanLink.startsWith("page:")) {
    const targetPageId = cleanLink.replace("page:", "").trim();
    const targetPage = pages.find((p) => p.id === targetPageId);

    if (targetPage) {
      if (targetPage.id === homePageId || targetPage.isHome || targetPage.slug === "/") {
        return "/";
      }
      return targetPage.slug.startsWith("/") ? targetPage.slug : `/${targetPage.slug}`;
    }

    console.warn(`Internal link "${cleanLink}" references a page that no longer exists.`);
    return "#";
  }

  // Standard external, anchor, or protocol URL
  return cleanLink;
}

/**
 * Deep clones an element tree and re-assigns fresh unique IDs for all elements
 * and nested entity collections (slides, pricing plans, form fields, items).
 */
export function cloneElementTreeWithNewIds(elements: EditorElement[]): EditorElement[] {
  let counter = 0;
  const generateId = (prefix = "el") => `${prefix}_${Date.now()}_${++counter}_${Math.random().toString(36).substring(2, 7)}`;

  const cloneItem = (item: any, prefix: string) => {
    if (!item || typeof item !== "object") return item;
    const cloned = { ...item };
    if (typeof item.id === "string") {
      cloned.id = generateId(prefix);
    }
    return cloned;
  };

  const clone = (el: EditorElement): EditorElement => {
    const newId = generateId("el");

    // Deep clone responsive style dictionaries
    const cloneStyleMap = (map?: Record<string, any>) => {
      if (!map) return undefined;
      const res: Record<string, any> = {};
      for (const [k, v] of Object.entries(map)) {
        res[k] = v && typeof v === "object" ? { ...v } : v;
      }
      return res;
    };

    const cloned: EditorElement = {
      ...el,
      id: newId,
      styles: el.styles ? { ...el.styles } : {},
      hoverStyles: el.hoverStyles ? { ...el.hoverStyles } : undefined,
      responsiveStyles: cloneStyleMap(el.responsiveStyles) as any,
      responsiveHoverStyles: cloneStyleMap(el.responsiveHoverStyles) as any,
      responsiveLayout: cloneStyleMap(el.responsiveLayout) as any,
      classes: el.classes ? [...el.classes] : [],
      children: el.children ? el.children.map(clone) : undefined,

      // Widget-specific nested collections with entity IDs
      slides: el.slides ? el.slides.map((s) => cloneItem(s, "slide")) : undefined,
      formFields: el.formFields ? el.formFields.map((f) => cloneItem(f, "field")) : undefined,
      posts: el.posts ? el.posts.map((p) => cloneItem(p, "post")) : undefined,
      priceListItems: el.priceListItems ? el.priceListItems.map((p) => cloneItem(p, "pli")) : undefined,
      galleryImages: el.galleryImages ? el.galleryImages.map((g) => cloneItem(g, "img")) : undefined,
      testimonials: el.testimonials ? el.testimonials.map((t) => cloneItem(t, "tstm")) : undefined,
      reviews: el.reviews ? el.reviews.map((r) => cloneItem(r, "rev")) : undefined,
      playlistItems: el.playlistItems ? el.playlistItems.map((p) => cloneItem(p, "pl")) : undefined,
      loopCarouselItems: el.loopCarouselItems ? el.loopCarouselItems.map((l) => cloneItem(l, "loop")) : undefined,
      mediaCarouselItems: el.mediaCarouselItems ? el.mediaCarouselItems.map((m) => cloneItem(m, "med")) : undefined,
      imageCarouselItems: el.imageCarouselItems ? el.imageCarouselItems.map((i) => cloneItem(i, "icar")) : undefined,
      shareNetworks: el.shareNetworks ? el.shareNetworks.map((s) => cloneItem(s, "sh")) : undefined,

      // Multi-level pricing plans & features
      pricingPlans: el.pricingPlans
        ? el.pricingPlans.map((plan) => ({
            ...cloneItem(plan, "plan"),
            features: plan.features ? plan.features.map((f: any) => cloneItem(f, "feat")) : undefined,
          }))
        : undefined,

      // Multi-level navigation items & submenus
      navMenuItems: el.navMenuItems
        ? el.navMenuItems.map((item) => ({
            ...cloneItem(item, "nav"),
            submenu: item.submenu ? item.submenu.map((sub: any) => cloneItem(sub, "sub")) : undefined,
          }))
        : undefined,

      megaMenuItems: el.megaMenuItems
        ? el.megaMenuItems.map((item) => ({
            ...cloneItem(item, "mega"),
            columns: item.columns
              ? item.columns.map((col: any) => ({
                  ...cloneItem(col, "col"),
                  items: col.items ? col.items.map((ci: any) => cloneItem(ci, "item")) : undefined,
                }))
              : undefined,
          }))
        : undefined,
    };

    return cloned;
  };

  return elements.map(clone);
}

/**
 * Safely duplicates an existing page with non-destructive deep cloning.
 */
export function duplicatePage(sourcePage: PageConfig, existingPages: PageConfig[]): PageConfig {
  const existingSlugs = existingPages.map((p) => p.slug);
  const newName = `${sourcePage.name} (Copy)`;
  const newSlug = generateSlug(newName, existingSlugs);
  const newId = `page_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  return {
    id: newId,
    name: newName,
    slug: newSlug,
    isHome: false,
    elements: cloneElementTreeWithNewIds(sourcePage.elements || []),
    pageSettings: {
      ...(sourcePage.pageSettings || {}),
      title: newName,
      path: newSlug,
    },
    customCss: sourcePage.customCss || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Checks if a page is referenced by navigation menus, global site parts, or internal links.
 */
export function checkPageReferences(
  pageId: string,
  pages: PageConfig[],
  navigation: NavMenuItem[] = [],
  siteParts?: SitePartsConfig
): { count: number; descriptions: string[] } {
  const descriptions: string[] = [];

  // Check navigation items
  const checkNav = (items: NavMenuItem[]) => {
    for (const item of items) {
      if (item.pageId === pageId || item.url === `page:${pageId}`) {
        descriptions.push(`Navigation menu item: "${item.label}"`);
      }
      if (item.children && Array.isArray(item.children)) {
        for (const sub of item.children) {
          if (sub.pageId === pageId || sub.url === `page:${pageId}`) {
            descriptions.push(`Navigation submenu item: "${sub.label}"`);
          }
        }
      }
    }
  };
  checkNav(navigation);

  // Check elements inside other pages for internal page links
  const checkElements = (elements: EditorElement[], pageName: string) => {
    const scan = (el: EditorElement) => {
      if (el.href === `page:${pageId}` || el.linkPageId === pageId) {
        descriptions.push(`Link in page "${pageName}" on ${el.type} ("${el.content?.slice(0, 20) || el.id}")`);
      }
      if (el.children) el.children.forEach(scan);
    };
    elements.forEach(scan);
  };

  pages.forEach((p) => {
    if (p.id !== pageId && Array.isArray(p.elements)) {
      checkElements(p.elements, p.name);
    }
  });

  // Check Header and Footer
  if (siteParts?.header?.elements) checkElements(siteParts.header.elements, "Global Header");
  if (siteParts?.footer?.elements) checkElements(siteParts.footer.elements, "Global Footer");

  return { count: descriptions.length, descriptions };
}

/**
 * Safely deletes a page and reassigns Home if the deleted page was Home.
 */
export function safeDeletePage(
  pageIdToDelete: string,
  pages: PageConfig[],
  homePageId: string
): { success: boolean; updatedPages: PageConfig[]; newHomePageId: string; error?: string } {
  if (pages.length <= 1) {
    return {
      success: false,
      updatedPages: pages,
      newHomePageId: homePageId,
      error: "Cannot delete the only remaining page in the website.",
    };
  }

  const remainingPages = pages.filter((p) => p.id !== pageIdToDelete);
  let newHomePageId = homePageId;

  // If deleted page was the home page, or if homePageId is no longer in remaining pages:
  if (homePageId === pageIdToDelete || !remainingPages.some((p) => p.id === homePageId)) {
    newHomePageId = remainingPages[0].id;
  }

  // Ensure exactly the page with id === newHomePageId has isHome: true, all other pages have isHome: false
  const updatedPages = remainingPages.map((p) => ({
    ...p,
    isHome: p.id === newHomePageId,
  }));

  return {
    success: true,
    updatedPages,
    newHomePageId,
  };
}

/**
 * Generates default starter pages (Home, About, Services, Contact) as editable data.
 */
export function createStarterPages(siteName = "My Website"): PageConfig[] {
  const now = new Date().toISOString();

  return [
    {
      id: "home",
      name: "Home",
      slug: "/",
      isHome: true,
      elements: [
        {
          id: "home_hero_container",
          type: "container",
          content: "",
          styles: {
            paddingTop: "64px",
            paddingBottom: "64px",
            paddingLeft: "24px",
            paddingRight: "24px",
            textAlign: "center",
            backgroundColor: "#f8fafc",
          },
          children: [
            {
              id: "home_hero_heading",
              type: "heading",
              content: `Welcome to ${siteName}`,
              styles: {
                fontSize: "36px",
                fontWeight: "800",
                color: "#0f172a",
                marginBottom: "16px",
              },
            },
            {
              id: "home_hero_sub",
              type: "text",
              content: "Build beautiful, high-performing multi-page websites visually or with clean code.",
              styles: {
                fontSize: "16px",
                color: "#64748b",
                marginBottom: "24px",
              },
            },
            {
              id: "home_hero_btn",
              type: "button",
              content: "Explore Our Services →",
              href: "page:services",
              linkPageId: "services",
              styles: {
                backgroundColor: "#2563eb",
                color: "#ffffff",
                paddingTop: "12px",
                paddingBottom: "12px",
                paddingLeft: "24px",
                paddingRight: "24px",
                borderRadius: "8px",
                fontWeight: "600",
              },
            },
          ],
        },
      ],
      pageSettings: {
        title: `${siteName} — Home`,
        path: "/",
        description: "Official website home page.",
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "about",
      name: "About Us",
      slug: "/about",
      isHome: false,
      elements: [
        {
          id: "about_container",
          type: "container",
          content: "",
          styles: {
            paddingTop: "48px",
            paddingBottom: "48px",
            paddingLeft: "24px",
            paddingRight: "24px",
          },
          children: [
            {
              id: "about_heading",
              type: "heading",
              content: "About Our Company",
              styles: { fontSize: "30px", fontWeight: "700", color: "#0f172a", marginBottom: "12px" },
            },
            {
              id: "about_text",
              type: "text",
              content: "We are a dedicated team delivering world-class digital experiences.",
              styles: { fontSize: "15px", color: "#475569", lineHeight: "1.6" },
            },
          ],
        },
      ],
      pageSettings: {
        title: "About Us",
        path: "/about",
        description: "Learn more about our mission and team.",
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "services",
      name: "Services",
      slug: "/services",
      isHome: false,
      elements: [
        {
          id: "services_container",
          type: "container",
          content: "",
          styles: {
            paddingTop: "48px",
            paddingBottom: "48px",
            paddingLeft: "24px",
            paddingRight: "24px",
          },
          children: [
            {
              id: "services_heading",
              type: "heading",
              content: "Our Services",
              styles: { fontSize: "30px", fontWeight: "700", color: "#0f172a", marginBottom: "12px" },
            },
            {
              id: "services_text",
              type: "text",
              content: "Comprehensive end-to-end design, development, and hosting solutions.",
              styles: { fontSize: "15px", color: "#475569", lineHeight: "1.6" },
            },
          ],
        },
      ],
      pageSettings: {
        title: "Services",
        path: "/services",
        description: "Our core services and solutions.",
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "contact",
      name: "Contact",
      slug: "/contact",
      isHome: false,
      elements: [
        {
          id: "contact_container",
          type: "container",
          content: "",
          styles: {
            paddingTop: "48px",
            paddingBottom: "48px",
            paddingLeft: "24px",
            paddingRight: "24px",
          },
          children: [
            {
              id: "contact_heading",
              type: "heading",
              content: "Contact Us",
              styles: { fontSize: "30px", fontWeight: "700", color: "#0f172a", marginBottom: "12px" },
            },
            {
              id: "contact_text",
              type: "text",
              content: "Get in touch with us today to discuss your next project.",
              styles: { fontSize: "15px", color: "#475569", lineHeight: "1.6" },
            },
          ],
        },
      ],
      pageSettings: {
        title: "Contact",
        path: "/contact",
        description: "Contact our team.",
      },
      createdAt: now,
      updatedAt: now,
    },
  ];
}
