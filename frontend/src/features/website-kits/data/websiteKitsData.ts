/**
 * @file Website kits feature: website Kits Data.
 * Contains 10 complete, curated website template packs for ForgeStudio.
 */
import type { WebsiteKit } from "../types/websiteKit.types";

export const WEBSITE_KITS: WebsiteKit[] = [
  // 1. Creative Agency
  {
    id: "kit-aura-agency",
    name: "Aura Creative Agency",
    category: "Agency",
    description: "High-end digital agency & design studio template pack featuring dark glass aesthetics, animated hero showcases, portfolio grids, interactive pricing tables, and client case studies.",
    thumbnailUrl: "https://images.unsplash.com/photo-1558655146-d09347e92766?w=800&auto=format&fit=crop&q=80",
    pageCount: 9,
    createdAt: "2026-03-01T00:00:00.000Z",
    globalStyles: {
      primaryColor: "#0f172a",
      accentColor: "#6366f1",
      backgroundColor: "#090d16",
      fontFamily: "Outfit, Inter, sans-serif",
      buttonBorderRadius: "14px",
    },
    siteParts: {
      header: {
        elements: [
          {
            id: "agency-hdr-nav",
            type: "container",
            styles: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "20px 48px",
              backgroundColor: "rgba(15, 23, 42, 0.8)",
              backdropFilter: "blur(12px)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            },
            children: [
              {
                id: "agency-logo",
                type: "heading",
                content: "AURA STUDIO.",
                styles: { fontSize: "22px", fontWeight: "900", color: "#ffffff", letterSpacing: "-0.5px" },
              },
              {
                id: "agency-hdr-cta",
                type: "button",
                content: "Start a Project →",
                styles: { backgroundColor: "#6366f1", color: "#ffffff", padding: "10px 22px", borderRadius: "12px", fontWeight: "600" },
              },
            ],
          } as any,
        ],
      },
      footer: {
        elements: [
          {
            id: "agency-ftr",
            type: "container",
            styles: {
              backgroundColor: "#05080f",
              color: "#94a3b8",
              padding: "64px 48px 32px 48px",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              flexDirection: "column",
              gap: "40px",
            },
            children: [
              {
                id: "agency-ftr-copy",
                type: "text",
                content: "© 2026 Aura Creative Studio Inc. All rights reserved. Crafted with ForgeStudio.",
                styles: { fontSize: "14px", textAlign: "center", color: "#64748b" },
              },
            ],
          } as any,
        ],
      },
    },
    popups: [
      {
        id: "popup-discovery-call",
        name: "Discovery Call Consultation",
        triggerType: "EXIT_INTENT",
        triggerDelay: 0,
        elements: [
          {
            id: "pop-modal-content",
            type: "container",
            styles: {
              backgroundColor: "#0f172a",
              padding: "36px",
              borderRadius: "20px",
              border: "1px solid #6366f1",
              flexDirection: "column",
              gap: "16px",
            },
            children: [
              {
                id: "pop-title",
                type: "heading",
                content: "Schedule a 30-Min Strategy Call",
                styles: { color: "#ffffff", fontSize: "24px", fontWeight: "700" },
              },
              {
                id: "pop-btn",
                type: "button",
                content: "Book Free Slot Now",
                styles: { backgroundColor: "#6366f1", color: "#ffffff", padding: "14px", borderRadius: "10px" },
              },
            ],
          } as any,
        ],
      },
    ],
    pages: [
      { id: "page-home", title: "Home", slug: "home", elements: [] },
      { id: "page-about", title: "About Us", slug: "about", elements: [] },
      { id: "page-services", title: "Services", slug: "services", elements: [] },
      { id: "page-projects", title: "Selected Works", slug: "projects", elements: [] },
      { id: "page-portfolio-detail", title: "Case Study Detail", slug: "case-study", elements: [] },
      { id: "page-pricing", title: "Pricing & Retainers", slug: "pricing", elements: [] },
      { id: "page-team", title: "Our Collective", slug: "team", elements: [] },
      { id: "page-contact", title: "Contact Us", slug: "contact", elements: [] },
      { id: "page-404", title: "404 Page Not Found", slug: "404", elements: [] },
    ],
  },

  // 2. SaaS Startup
  {
    id: "kit-synapse-saas",
    name: "Synapse AI & SaaS Platform",
    category: "SaaS",
    description: "Enterprise SaaS landing and app website template pack with metric counter widgets, interactive feature comparison matrices, pricing switcher tables, docs, and customer testimonials.",
    thumbnailUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80",
    pageCount: 8,
    createdAt: "2026-03-01T00:00:00.000Z",
    globalStyles: {
      primaryColor: "#0284c7",
      accentColor: "#38bdf8",
      backgroundColor: "#030712",
      fontFamily: "Inter, system-ui, sans-serif",
      buttonBorderRadius: "10px",
    },
    pages: [
      { id: "page-home", title: "Home", slug: "home", elements: [] },
      { id: "page-features", title: "Platform Features", slug: "features", elements: [] },
      { id: "page-solutions", title: "Enterprise Solutions", slug: "solutions", elements: [] },
      { id: "page-pricing", title: "Plans & Pricing", slug: "pricing", elements: [] },
      { id: "page-docs", title: "API Documentation", slug: "docs", elements: [] },
      { id: "page-blog", title: "Product Engineering Blog", slug: "blog", elements: [] },
      { id: "page-blog-post", title: "Blog Article", slug: "blog-article", elements: [] },
      { id: "page-contact", title: "Book Enterprise Demo", slug: "contact", elements: [] },
    ],
  },

  // 3. E-commerce Store
  {
    id: "kit-luxe-ecommerce",
    name: "Luxe & Co. Fashion Store",
    category: "Ecommerce",
    description: "Refined minimalist e-commerce storefront pack featuring high-conversion product card grids, sticky filter headers, lookbooks, reviews, and promotional discount popups.",
    thumbnailUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80",
    pageCount: 8,
    createdAt: "2026-03-01T00:00:00.000Z",
    globalStyles: {
      primaryColor: "#171717",
      accentColor: "#d97706",
      backgroundColor: "#ffffff",
      fontFamily: "Cinzel, Cormorant Garamond, serif",
      buttonBorderRadius: "0px",
    },
    pages: [
      { id: "page-home", title: "Home", slug: "home", elements: [] },
      { id: "page-shop", title: "Catalog / Shop", slug: "shop", elements: [] },
      { id: "page-product-detail", title: "Product Details", slug: "product-detail", elements: [] },
      { id: "page-collections", title: "Seasonal Collections", slug: "collections", elements: [] },
      { id: "page-lookbook", title: "Editorial Lookbook", slug: "lookbook", elements: [] },
      { id: "page-about", title: "Our Heritage", slug: "about", elements: [] },
      { id: "page-faq", title: "Shipping & Returns FAQ", slug: "faq", elements: [] },
      { id: "page-contact", title: "Customer Concierge", slug: "contact", elements: [] },
    ],
  },

  // 4. Corporate Business
  {
    id: "kit-apex-corporate",
    name: "Apex Global Holdings",
    category: "Business",
    description: "Stately corporate & investment firm website pack designed for multi-national organizations, advisory firms, and investor relations.",
    thumbnailUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80",
    pageCount: 8,
    createdAt: "2026-03-01T00:00:00.000Z",
    globalStyles: {
      primaryColor: "#0f233a",
      accentColor: "#0284c7",
      backgroundColor: "#f8fafc",
      fontFamily: "Inter, Merriweather, sans-serif",
      buttonBorderRadius: "6px",
    },
    pages: [
      { id: "page-home", title: "Home", slug: "home", elements: [] },
      { id: "page-overview", title: "Corporate Overview", slug: "overview", elements: [] },
      { id: "page-solutions", title: "Advisory & Asset Management", slug: "solutions", elements: [] },
      { id: "page-leadership", title: "Leadership & Board", slug: "leadership", elements: [] },
      { id: "page-investors", title: "Investor Relations & ESG", slug: "investors", elements: [] },
      { id: "page-careers", title: "Executive Careers", slug: "careers", elements: [] },
      { id: "page-insights", title: "Market Reports & News", slug: "insights", elements: [] },
      { id: "page-contact", title: "Global Offices", slug: "contact", elements: [] },
    ],
  },

  // 5. Portfolio Website
  {
    id: "kit-kai-portfolio",
    name: "Kai Chen — Principal Designer",
    category: "Portfolio",
    description: "Editorial designer & architect portfolio kit featuring full-bleed visual case studies, typography focus, project breakdowns, toolchains, and client reviews.",
    thumbnailUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80",
    pageCount: 8,
    createdAt: "2026-03-01T00:00:00.000Z",
    globalStyles: {
      primaryColor: "#111827",
      accentColor: "#f43f5e",
      backgroundColor: "#fafaf9",
      fontFamily: "Plus Jakarta Sans, sans-serif",
      buttonBorderRadius: "100px",
    },
    pages: [
      { id: "page-home", title: "Home", slug: "home", elements: [] },
      { id: "page-works", title: "Featured Works", slug: "works", elements: [] },
      { id: "page-case-study", title: "Fintech App Redesign", slug: "case-study", elements: [] },
      { id: "page-about", title: "Philosophy & Bio", slug: "about", elements: [] },
      { id: "page-stack", title: "Toolchain & Stack", slug: "stack", elements: [] },
      { id: "page-writing", title: "Essays & Notes", slug: "writing", elements: [] },
      { id: "page-experience", title: "Experience & Awards", slug: "experience", elements: [] },
      { id: "page-contact", title: "Initiate Collab", slug: "contact", elements: [] },
    ],
  },

  // 6. Restaurant Website
  {
    id: "kit-bella-restaurant",
    name: "Osteria Bella Cucina & Lounge",
    category: "Restaurant",
    description: "Warm artisanal dining & hospitality template pack with tasting menus, sommelier wine list, private dining booking cards, chef story, and reservations.",
    thumbnailUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80",
    pageCount: 8,
    createdAt: "2026-03-01T00:00:00.000Z",
    globalStyles: {
      primaryColor: "#291811",
      accentColor: "#ea580c",
      backgroundColor: "#faf5ef",
      fontFamily: "Playfair Display, Georgia, serif",
      buttonBorderRadius: "4px",
    },
    pages: [
      { id: "page-home", title: "Home", slug: "home", elements: [] },
      { id: "page-menus", title: "Seasonal Menus", slug: "menus", elements: [] },
      { id: "page-wine-list", title: "Sommelier Wine Reserve", slug: "wine-list", elements: [] },
      { id: "page-private-dining", title: "Private Dining & Events", slug: "private-dining", elements: [] },
      { id: "page-our-story", title: "Chef Philosophy & Story", slug: "our-story", elements: [] },
      { id: "page-gallery", title: "Atmosphere Gallery", slug: "gallery", elements: [] },
      { id: "page-reservations", title: "Reserve Table Online", slug: "reservations", elements: [] },
      { id: "page-contact", title: "Hours & Location", slug: "contact", elements: [] },
    ],
  },

  // 7. Real Estate
  {
    id: "kit-haven-realestate",
    name: "Haven Luxury Estates",
    category: "Real Estate",
    description: "Prestigious real estate broker & luxury development template kit with property listing grids, interactive amenity badges, neighborhood guides, and agent cards.",
    thumbnailUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80",
    pageCount: 8,
    createdAt: "2026-03-01T00:00:00.000Z",
    globalStyles: {
      primaryColor: "#0f172a",
      accentColor: "#059669",
      backgroundColor: "#f8fafc",
      fontFamily: "Plus Jakarta Sans, sans-serif",
      buttonBorderRadius: "8px",
    },
    pages: [
      { id: "page-home", title: "Home", slug: "home", elements: [] },
      { id: "page-properties", title: "Property Showcase", slug: "properties", elements: [] },
      { id: "page-featured-estate", title: "The Grand Bel Air Estate", slug: "featured-estate", elements: [] },
      { id: "page-neighborhoods", title: "Prime Neighborhoods", slug: "neighborhoods", elements: [] },
      { id: "page-developments", title: "New Developments", slug: "developments", elements: [] },
      { id: "page-agents", title: "Our Advisors", slug: "agents", elements: [] },
      { id: "page-market-report", title: "Quarterly Market Report", slug: "market-report", elements: [] },
      { id: "page-contact", title: "Private VIP Inquiry", slug: "contact", elements: [] },
    ],
  },

  // 8. Education Platform
  {
    id: "kit-elevate-education",
    name: "Elevate Academy & Masterclasses",
    category: "Education",
    description: "Comprehensive education, online university & cohort masterclass kit with curriculum module accordions, student video reviews, instructor profiles, and tuition tables.",
    thumbnailUrl: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=80",
    pageCount: 8,
    createdAt: "2026-03-01T00:00:00.000Z",
    globalStyles: {
      primaryColor: "#1e1b4b",
      accentColor: "#4f46e5",
      backgroundColor: "#f5f3ff",
      fontFamily: "Outfit, Inter, sans-serif",
      buttonBorderRadius: "12px",
    },
    pages: [
      { id: "page-home", title: "Home", slug: "home", elements: [] },
      { id: "page-courses", title: "Course Catalog", slug: "courses", elements: [] },
      { id: "page-curriculum", title: "Full-Stack AI Bootcamp", slug: "curriculum", elements: [] },
      { id: "page-instructors", title: "Master Faculty", slug: "instructors", elements: [] },
      { id: "page-reviews", title: "Student Outcomes & Reviews", slug: "reviews", elements: [] },
      { id: "page-pricing", title: "Tuition & Cohorts", slug: "pricing", elements: [] },
      { id: "page-faq", title: "Admissions FAQ", slug: "faq", elements: [] },
      { id: "page-contact", title: "Admissions Office", slug: "contact", elements: [] },
    ],
  },

  // 9. Healthcare & Wellness
  {
    id: "kit-apexcare-healthcare",
    name: "ApexCare Medical & Wellness",
    category: "Healthcare",
    description: "Reassuring, modern clinic and healthcare template pack with specialist department listings, doctor directories, online appointment booking, and patient insurance guides.",
    thumbnailUrl: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800&auto=format&fit=crop&q=80",
    pageCount: 8,
    createdAt: "2026-03-01T00:00:00.000Z",
    globalStyles: {
      primaryColor: "#0f766e",
      accentColor: "#0284c7",
      backgroundColor: "#f0fdfa",
      fontFamily: "Plus Jakarta Sans, system-ui, sans-serif",
      buttonBorderRadius: "10px",
    },
    pages: [
      { id: "page-home", title: "Home", slug: "home", elements: [] },
      { id: "page-specialties", title: "Clinical Specialties", slug: "specialties", elements: [] },
      { id: "page-doctors", title: "Physicians & Specialists", slug: "doctors", elements: [] },
      { id: "page-patient-resources", title: "Patient Resources", slug: "patient-resources", elements: [] },
      { id: "page-technology", title: "Surgical Tech & Facilities", slug: "technology", elements: [] },
      { id: "page-insurance", title: "Insurance & Coverage", slug: "insurance", elements: [] },
      { id: "page-reviews", title: "Patient Testimonials", slug: "reviews", elements: [] },
      { id: "page-book-appointment", title: "Schedule Visit", slug: "book-appointment", elements: [] },
    ],
  },

  // 10. Creative 3D Studio
  {
    id: "kit-vortex-studio",
    name: "Vortex 3D Studio & Motion Lab",
    category: "Creative",
    description: "Futuristic dark-mode creative studio template kit with neon accents, 3D motion showreel banners, project case studies, capability breakdown, and collab inquiries.",
    thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
    pageCount: 8,
    createdAt: "2026-03-01T00:00:00.000Z",
    globalStyles: {
      primaryColor: "#0a0a0c",
      accentColor: "#a855f7",
      backgroundColor: "#050507",
      fontFamily: "Space Grotesk, Outfit, sans-serif",
      buttonBorderRadius: "16px",
    },
    pages: [
      { id: "page-home", title: "Home", slug: "home", elements: [] },
      { id: "page-showreel", title: "Showreel & Works", slug: "showreel", elements: [] },
      { id: "page-case-study", title: "Cyberpunk 2099 Motion Piece", slug: "case-study", elements: [] },
      { id: "page-capabilities", title: "VFX & CGI Capabilities", slug: "capabilities", elements: [] },
      { id: "page-studio", title: "The Studio & Tech Lab", slug: "studio", elements: [] },
      { id: "page-journal", title: "Behind The Scenes & R&D", slug: "journal", elements: [] },
      { id: "page-careers", title: "Artist Casting & Open Roles", slug: "careers", elements: [] },
      { id: "page-initiate", title: "Initiate Production", slug: "initiate", elements: [] },
    ],
  },
];
