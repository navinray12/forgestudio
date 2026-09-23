import type { WebsiteKit } from "../types/websiteKit.types";

export const WEBSITE_KITS: WebsiteKit[] = [
  {
    id: "kit-business-starter",
    name: "Business Starter Kit",
    category: "Business",
    description: "Complete professional corporate website design package including high-conversion landing page, about company section, services showcase, and contact form.",
    pageCount: 4,
    createdAt: new Date().toISOString(),
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
          } as any,
        ],
      },
      { id: "page-about", title: "About Us", slug: "about", elements: [] },
      { id: "page-services", title: "Services", slug: "services", elements: [] },
      { id: "page-contact", title: "Contact", slug: "contact", elements: [] },
    ],
  },
  {
    id: "kit-creative-agency",
    name: "Creative Agency Pro Kit",
    category: "Agency",
    description: "Stunning modern agency template kit featuring dynamic project showcase, client testimonial block, team biography cards, and direct quote calculator.",
    pageCount: 4,
    createdAt: new Date().toISOString(),
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
          } as any,
        ],
      },
      { id: "page-agency-portfolio", title: "Portfolio", slug: "portfolio", elements: [] },
      { id: "page-agency-cases", title: "Case Studies", slug: "case-studies", elements: [] },
      { id: "page-agency-contact", title: "Contact", slug: "contact", elements: [] },
    ],
  },
  {
    id: "kit-saas-launch",
    name: "SaaS Platform Launch Kit",
    category: "SaaS",
    description: "High-conversion SaaS product website kit with feature grid breakdown, interactive pricing toggle tables, customer reviews, and FAQ accordion.",
    pageCount: 4,
    createdAt: new Date().toISOString(),
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
          } as any,
        ],
      },
      { id: "page-saas-features", title: "Features", slug: "features", elements: [] },
      { id: "page-saas-pricing", title: "Pricing", slug: "pricing", elements: [] },
      { id: "page-saas-signup", title: "Signup", slug: "signup", elements: [] },
    ],
  },
  {
    id: "kit-designer-portfolio",
    name: "Modern Designer Portfolio Kit",
    category: "Portfolio",
    description: "Minimalist visual portfolio package designed for UI/UX designers, developers, and creative directors.",
    pageCount: 3,
    createdAt: new Date().toISOString(),
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
          } as any,
        ],
      },
      { id: "page-folio-experience", title: "Experience", slug: "experience", elements: [] },
      { id: "page-folio-contact", title: "Contact", slug: "contact", elements: [] },
    ],
  },
];
