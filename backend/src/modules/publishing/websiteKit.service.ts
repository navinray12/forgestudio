import { prisma } from "../../platform/database/prisma.js";
import { AppError } from "../../platform/http/app-error.js";

const DEFAULT_KITS = [
  {
    slug: "kit-business-starter",
    name: "Business Starter Kit",
    category: "Business",
    description: "Complete professional corporate website design package including high-conversion landing page, about company section, services showcase, and contact form.",
    pageCount: 4,
    tags: ["business", "corporate", "starter"],
    globalStyles: {
      primaryColor: "#0f172a",
      accentColor: "#2563eb",
      backgroundColor: "#f8fafc",
      fontFamily: "Inter, sans-serif",
      buttonBorderRadius: "12px",
    },
    pages: [
      {
        id: "page-home",
        title: "Home",
        slug: "home",
        elements: [
          {
            id: "biz-hero",
            type: "container",
            styles: {
              backgroundColor: "#0f172a",
              color: "#ffffff",
              padding: "48px",
              borderRadius: "24px",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            },
            children: [
              {
                id: "biz-hero-title",
                type: "heading",
                content: "Elevate Your Business Presence",
                styles: { color: "#ffffff", fontSize: "36px", fontWeight: "800", textAlign: "center" },
              },
              {
                id: "biz-hero-desc",
                type: "text",
                content: "Complete digital solution designed for modern growing companies.",
                styles: { color: "#94a3b8", fontSize: "16px", textAlign: "center" },
              },
              {
                id: "biz-hero-btn",
                type: "button",
                content: "Get Started Now →",
                styles: { backgroundColor: "#2563eb", color: "#ffffff", padding: "14px", borderRadius: "12px" },
              },
            ],
          },
        ],
      },
      { id: "page-about", title: "About Us", slug: "about", elements: [] },
      { id: "page-services", title: "Services", slug: "services", elements: [] },
      { id: "page-contact", title: "Contact", slug: "contact", elements: [] },
    ],
  },
  {
    slug: "kit-creative-agency",
    name: "Creative Agency Pro Kit",
    category: "Agency",
    description: "Stunning modern agency template kit featuring dynamic project showcase, client testimonial block, team biography cards, and direct quote calculator.",
    pageCount: 4,
    tags: ["agency", "creative", "portfolio"],
    globalStyles: {
      primaryColor: "#1e1b4b",
      accentColor: "#7c3aed",
      backgroundColor: "#0f0728",
      fontFamily: "Outfit, sans-serif",
      buttonBorderRadius: "16px",
    },
    pages: [
      {
        id: "page-agency-home",
        title: "Home",
        slug: "home",
        elements: [
          {
            id: "agency-hero",
            type: "container",
            styles: {
              backgroundColor: "#1e1b4b",
              color: "#ffffff",
              padding: "48px",
              borderRadius: "24px",
              flexDirection: "column",
              gap: "20px",
            },
            children: [
              {
                id: "agency-title",
                type: "heading",
                content: "We Craft Exceptional Brand Experiences",
                styles: { color: "#ffffff", fontSize: "38px", fontWeight: "900" },
              },
              {
                id: "agency-btn",
                type: "button",
                content: "View Portfolio 🎨",
                styles: { backgroundColor: "#7c3aed", color: "#ffffff", padding: "14px", borderRadius: "14px" },
              },
            ],
          },
        ],
      },
      { id: "page-agency-portfolio", title: "Portfolio", slug: "portfolio", elements: [] },
      { id: "page-agency-cases", title: "Case Studies", slug: "case-studies", elements: [] },
      { id: "page-agency-contact", title: "Contact", slug: "contact", elements: [] },
    ],
  },
  {
    slug: "kit-saas-launch",
    name: "SaaS Platform Launch Kit",
    category: "SaaS",
    description: "High-conversion SaaS product website kit with feature grid breakdown, interactive pricing toggle tables, customer reviews, and FAQ accordion.",
    pageCount: 4,
    tags: ["saas", "software", "tech"],
    globalStyles: {
      primaryColor: "#0284c7",
      accentColor: "#06b6d4",
      backgroundColor: "#f0f9ff",
      fontFamily: "Inter, sans-serif",
      buttonBorderRadius: "10px",
    },
    pages: [
      {
        id: "page-saas-home",
        title: "Landing",
        slug: "home",
        elements: [
          {
            id: "saas-hero",
            type: "container",
            styles: {
              backgroundColor: "#0369a1",
              color: "#ffffff",
              padding: "44px",
              borderRadius: "20px",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            },
            children: [
              {
                id: "saas-title",
                type: "heading",
                content: "Automate Your Software Operations",
                styles: { color: "#ffffff", fontSize: "34px", fontWeight: "800", textAlign: "center" },
              },
              {
                id: "saas-btn",
                type: "button",
                content: "Start Free 14-Day Trial",
                styles: { backgroundColor: "#0284c7", color: "#ffffff", padding: "12px", borderRadius: "10px" },
              },
            ],
          },
        ],
      },
      { id: "page-saas-features", title: "Features", slug: "features", elements: [] },
      { id: "page-saas-pricing", title: "Pricing", slug: "pricing", elements: [] },
      { id: "page-saas-signup", title: "Signup", slug: "signup", elements: [] },
    ],
  },
  {
    slug: "kit-designer-portfolio",
    name: "Modern Designer Portfolio Kit",
    category: "Portfolio",
    description: "Minimalist visual portfolio package designed for UI/UX designers, developers, and creative directors.",
    pageCount: 3,
    tags: ["portfolio", "designer", "minimal"],
    globalStyles: {
      primaryColor: "#18181b",
      accentColor: "#e11d48",
      backgroundColor: "#fafafa",
      fontFamily: "Space Grotesk, sans-serif",
      buttonBorderRadius: "8px",
    },
    pages: [
      {
        id: "page-folio-home",
        title: "Showcase",
        slug: "home",
        elements: [
          {
            id: "folio-hero",
            type: "container",
            styles: {
              backgroundColor: "#18181b",
              color: "#ffffff",
              padding: "40px",
              borderRadius: "16px",
              flexDirection: "column",
              gap: "16px",
            },
            children: [
              {
                id: "folio-title",
                type: "heading",
                content: "Hello, I'm Alex — Lead Product Designer",
                styles: { color: "#ffffff", fontSize: "32px", fontWeight: "800" },
              },
              {
                id: "folio-btn",
                type: "button",
                content: "Explore My Work ✨",
                styles: { backgroundColor: "#e11d48", color: "#ffffff", padding: "12px", borderRadius: "8px" },
              },
            ],
          },
        ],
      },
      { id: "page-folio-experience", title: "Experience", slug: "experience", elements: [] },
      { id: "page-folio-contact", title: "Contact", slug: "contact", elements: [] },
    ],
  },
];

/**
 * Initialize WebsiteKit table with curated seed data if empty
 */
export async function initWebsiteKitTable() {
  try {
    const websiteKitDelegate = prisma.websiteKit;
    if (!websiteKitDelegate) return;

    const count = await websiteKitDelegate.count();
    if (count === 0) {
      console.log("Seeding initial WebsiteKits in database...");
      for (const kit of DEFAULT_KITS) {
        await websiteKitDelegate.create({
          data: {
            slug: kit.slug,
            name: kit.name,
            category: kit.category,
            description: kit.description,
            pageCount: kit.pageCount,
            tags: kit.tags,
            globalStyles: kit.globalStyles,
            pages: kit.pages,
            isActive: true,
          },
        });
      }
    }
  } catch (error) {
    console.error("Error initializing WebsiteKit table:", error);
  }
}

export interface GetWebsiteKitsParams {
  category?: string;
  search?: string;
  tag?: string;
}

/**
 * Query website kits from PostgreSQL database
 */
export async function getWebsiteKits(params: GetWebsiteKitsParams) {
  const websiteKitDelegate = prisma.websiteKit;
  if (!websiteKitDelegate) {
    throw new AppError("WebsiteKit model delegate is not available", 500, "INTERNAL_SERVER_ERROR");
  }

  // Ensure table is populated
  await initWebsiteKitTable();

  const where: any = {
    isActive: true,
  };

  if (params.category && params.category.trim()) {
    where.category = {
      equals: params.category.trim(),
      mode: "insensitive",
    };
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
    ];
  }

  const kits = await websiteKitDelegate.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  // Client tag filter if requested
  if (params.tag && params.tag.trim()) {
    const targetTag = params.tag.trim().toLowerCase();
    return kits.filter((kit: any) => {
      const tags = Array.isArray(kit.tags) ? kit.tags : [];
      return tags.some((t: string) => String(t).toLowerCase() === targetTag);
    });
  }

  return kits;
}

export interface ApplyWebsiteKitParams {
  userId: string;
  kitId: string;
  websiteId?: string;
}

/**
 * Apply a Website Kit to a website using a Prisma transaction
 */
export async function applyWebsiteKit(params: ApplyWebsiteKitParams) {
  const { userId, kitId, websiteId } = params;

  if (!kitId || typeof kitId !== "string" || !kitId.trim()) {
    throw new AppError("kitId is required", 400, "BAD_REQUEST");
  }

  const websiteKitDelegate = prisma.websiteKit;
  const websiteDelegate = prisma.website;

  if (!websiteKitDelegate || !websiteDelegate) {
    throw new AppError("Database models are not initialized", 500, "INTERNAL_SERVER_ERROR");
  }

  // Ensure table populated
  await initWebsiteKitTable();

  // 1. Fetch Website Kit
  const cleanKitId = kitId.trim();
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isKitUuid = uuidPattern.test(cleanKitId);

  const kit = await websiteKitDelegate.findFirst({
    where: {
      OR: isKitUuid ? [{ id: cleanKitId }, { slug: cleanKitId }] : [{ slug: cleanKitId }],
      isActive: true,
    },
  });

  if (!kit) {
    throw new AppError("Website Kit not found or inactive", 404, "NOT_FOUND");
  }

  // 2. Fetch target Website
  let targetWebsite: any = null;

  if (websiteId && websiteId.trim()) {
    const cleanWebsiteId = websiteId.trim();
    if (!uuidPattern.test(cleanWebsiteId)) {
      throw new AppError("Invalid websiteId format", 400, "BAD_REQUEST");
    }

    targetWebsite = await websiteDelegate.findUnique({
      where: { id: cleanWebsiteId },
    });

    if (!targetWebsite) {
      throw new AppError("Target website not found", 404, "NOT_FOUND");
    }
  } else {
    const userWebsites = await websiteDelegate.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    if (!userWebsites || userWebsites.length === 0) {
      throw new AppError("No website found for user to apply Website Kit to", 404, "NOT_FOUND");
    }

    targetWebsite = userWebsites[0];
  }

  // 3. Ownership / RBAC authorization check
  const isOwner = targetWebsite.userId === userId;
  const isCollaborator = Array.isArray(targetWebsite.collaborators) && targetWebsite.collaborators.includes(userId);

  if (!isOwner && !isCollaborator) {
    throw new AppError("You do not have permission to modify this website", 403, "FORBIDDEN");
  }

  // 4. Build merged/updated editorData
  const currentEditorData = (targetWebsite.editorData as any) || {};
  const pages = Array.isArray(kit.pages) ? kit.pages : [];
  const globalStyles = kit.globalStyles || {};

  const updatedEditorData = {
    ...currentEditorData,
    kitId: kit.id,
    kitSlug: kit.slug,
    kitName: kit.name,
    globalStyles,
    pages,
    elements: (pages[0] as any)?.elements || currentEditorData.elements || [],
    appliedAt: new Date().toISOString(),
  };

  // 5. Execute atomic database transaction
  const updatedWebsite = await prisma.$transaction(async (tx: any) => {
    return await tx.website.update({
      where: { id: targetWebsite.id },
      data: {
        editorData: updatedEditorData,
        updatedAt: new Date(),
      },
    });
  });

  return {
    website: updatedWebsite,
    appliedKit: {
      id: kit.id,
      slug: kit.slug,
      name: kit.name,
      category: kit.category,
    },
  };
}
