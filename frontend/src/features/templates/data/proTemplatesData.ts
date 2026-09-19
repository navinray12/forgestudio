import type { Template } from "../types/template.types";

export const PRO_TEMPLATES: Template[] = [
  {
    id: "pro-template-saas-launch",
    userId: "system-pro",
    name: "SaaS Launchpad Hero & Features",
    description: "High-converting modern SaaS hero header section with call-to-action button, features grid, and dark glassmorphic styling.",
    type: "PAGE",
    category: "Landing Page",
    isFavorite: false,
    isShared: true,
    isPro: true,
    shareToken: "pro-saas-launchpad",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    templateData: {
      elements: [
        {
          id: "pro-elem-saas-container",
          type: "container",
          styles: {
            backgroundColor: "#0f172a",
            color: "#f8fafc",
            padding: "40px",
            borderRadius: "24px",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          },
          children: [
            {
              id: "pro-elem-saas-badge",
              type: "text",
              content: "⚡ FORGESTUDIO PRO TEMPLATE",
              styles: {
                color: "#a855f7",
                fontSize: "12px",
                fontWeight: "700",
                letterSpacing: "1px",
              },
            },
            {
              id: "pro-elem-saas-title",
              type: "heading",
              content: "Supercharge Your Web Workflow",
              styles: {
                color: "#ffffff",
                fontSize: "36px",
                fontWeight: "800",
                textAlign: "center",
              },
            },
            {
              id: "pro-elem-saas-desc",
              type: "text",
              content: "Build, customize, and publish stunning web applications in minutes with full visual control and instant AI assistance.",
              styles: {
                color: "#94a3b8",
                fontSize: "16px",
                textAlign: "center",
              },
            },
            {
              id: "pro-elem-saas-btn",
              type: "button",
              content: "Start Free Trial →",
              styles: {
                backgroundColor: "#9333ea",
                color: "#ffffff",
                padding: "14px",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: "700",
              },
            },
          ],
        },
      ] as any,
      pageSettings: {
        pageTitle: "SaaS Launchpad Pro Template",
        metaDescription: "Curated premium SaaS template for high conversion",
      },
    },
  },
  {
    id: "pro-template-agency-portfolio",
    userId: "system-pro",
    name: "Creative Agency Showcase",
    description: "Sleek portfolio showcase section featuring project cards, client ratings, and modern typography.",
    type: "PAGE",
    category: "Portfolio",
    isFavorite: false,
    isShared: true,
    isPro: true,
    shareToken: "pro-agency-showcase",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    templateData: {
      elements: [
        {
          id: "pro-elem-agency-container",
          type: "container",
          styles: {
            backgroundColor: "#1e1b4b",
            color: "#e0e7ff",
            padding: "36px",
            borderRadius: "20px",
            flexDirection: "column",
            gap: "20px",
          },
          children: [
            {
              id: "pro-elem-agency-heading",
              type: "heading",
              content: "Selected Work & Case Studies",
              styles: {
                color: "#ffffff",
                fontSize: "28px",
                fontWeight: "700",
              },
            },
            {
              id: "pro-elem-agency-quote",
              type: "blockquote",
              content: "Design is not just what it looks like and feels like. Design is how it works.",
              styles: {
                color: "#c7d2fe",
                fontSize: "14px",
              },
            },
            {
              id: "pro-elem-agency-btn",
              type: "button",
              content: "Explore All Projects 🎨",
              styles: {
                backgroundColor: "#4f46e5",
                color: "#ffffff",
                padding: "12px",
                borderRadius: "10px",
              },
            },
          ],
        },
      ] as any,
      pageSettings: {
        pageTitle: "Creative Agency Showcase Pro",
      },
    },
  },
  {
    id: "pro-template-ecommerce-hero",
    userId: "system-pro",
    name: "E-Commerce Product Spotlight",
    description: "Vibrant e-commerce product feature card with discount badge, image gallery frame, and instant buy button.",
    type: "SECTION",
    category: "Ecommerce",
    isFavorite: false,
    isShared: true,
    isPro: true,
    shareToken: "pro-ecommerce-spotlight",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    templateData: {
      elements: [
        {
          id: "pro-elem-ecom-container",
          type: "container",
          styles: {
            backgroundColor: "#ffffff",
            padding: "30px",
            borderRadius: "20px",
            flexDirection: "column",
            gap: "14px",
          },
          children: [
            {
              id: "pro-elem-ecom-title",
              type: "heading",
              content: "Limited Edition Wireless Headphones",
              styles: {
                color: "#0f172a",
                fontSize: "24px",
                fontWeight: "800",
              },
            },
            {
              id: "pro-elem-ecom-price",
              type: "text",
              content: "$199.00 (Save 20% Today)",
              styles: {
                color: "#16a34a",
                fontSize: "18px",
                fontWeight: "700",
              },
            },
            {
              id: "pro-elem-ecom-btn",
              type: "button",
              content: "Add to Cart 🛒",
              styles: {
                backgroundColor: "#0284c7",
                color: "#ffffff",
                padding: "12px",
                borderRadius: "10px",
              },
            },
          ],
        },
      ] as any,
      pageSettings: {},
    },
  },
  {
    id: "pro-template-popup-newsletter",
    userId: "system-pro",
    name: "VIP Newsletter Lead Magnet",
    description: "High-conversion modal popup template with email signup prompt, discount coupon offer, and close controls.",
    type: "POPUP",
    category: "Landing Page",
    isFavorite: false,
    isShared: true,
    isPro: true,
    shareToken: "pro-vip-newsletter-popup",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    templateData: {
      elements: [
        {
          id: "pro-elem-popup-container",
          type: "container",
          styles: {
            backgroundColor: "#0f172a",
            color: "#f8fafc",
            padding: "32px",
            borderRadius: "24px",
            alignItems: "center",
            gap: "14px",
          },
          children: [
            {
              id: "pro-elem-popup-badge",
              type: "text",
              content: "🎁 EXCLUSIVE OFFER",
              styles: {
                color: "#f59e0b",
                fontSize: "12px",
                fontWeight: "800",
              },
            },
            {
              id: "pro-elem-popup-heading",
              type: "heading",
              content: "Get 15% Off Your First Order!",
              styles: {
                color: "#ffffff",
                fontSize: "22px",
                fontWeight: "800",
                textAlign: "center",
              },
            },
            {
              id: "pro-elem-popup-text",
              type: "text",
              content: "Subscribe to our VIP newsletter to unlock instant discounts, pro templates, and exclusive updates.",
              styles: {
                color: "#94a3b8",
                fontSize: "13px",
                textAlign: "center",
              },
            },
            {
              id: "pro-elem-popup-btn",
              type: "button",
              content: "Claim 15% Discount ✨",
              styles: {
                backgroundColor: "#ec4899",
                color: "#ffffff",
                padding: "12px",
                borderRadius: "12px",
                fontWeight: "700",
              },
            },
          ],
        },
      ] as any,
      pageSettings: {},
    },
  },
];
