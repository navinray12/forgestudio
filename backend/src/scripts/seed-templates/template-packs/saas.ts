/**
 * SaaS Startup Template Pack Definition
 * Complete 9-page website pack for B2B & Cloud software companies.
 */

export const saasTemplatePack = {
  id: "kit-saas-startup",
  slug: "saas-startup",
  name: "SaaS Launchpad Pro",
  category: "Business",
  description: "Conversion-optimized template pack for cloud applications, AI software, and B2B SaaS startups.",
  thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80",
  globalStyles: {
    primaryColor: "#020617",
    accentColor: "#06b6d4",
    secondaryColor: "#10b981",
    backgroundColor: "#ffffff",
    textColor: "#1e293b",
    fontFamily: "Inter, sans-serif",
    buttonBorderRadius: "8px",
  },
  siteParts: {
    header: {
      isEnabled: true,
      elements: [
        {
          id: "saas-header-container",
          type: "container",
          styles: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "14px",
            paddingBottom: "14px",
            paddingLeft: "32px",
            paddingRight: "32px",
            backgroundColor: "rgba(2, 6, 23, 0.95)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            position: "sticky",
            top: "0",
            zIndex: "50",
          },
          children: [
            {
              id: "saas-logo",
              type: "heading",
              content: "SYNAPSE.AI",
              styles: { fontSize: "20px", fontWeight: "800", color: "#ffffff", letterSpacing: "1px" },
            },
            {
              id: "saas-nav-menu",
              type: "nav-menu",
              navMenuItems: [
                { id: "s-nav-home", label: "Product", url: "/" },
                { id: "s-nav-features", label: "Features", url: "/features" },
                { id: "s-nav-integrations", label: "Integrations", url: "/integrations" },
                { id: "s-nav-pricing", label: "Pricing", url: "/pricing" },
                { id: "s-nav-docs", label: "Security", url: "/security" },
                { id: "s-nav-contact", label: "Enterprise", url: "/contact" },
              ],
              styles: { display: "flex", gap: "20px" },
            },
            {
              id: "saas-header-cta",
              type: "button",
              content: "Start Free 14-Day Trial →",
              href: "/pricing",
              styles: { backgroundColor: "#06b6d4", color: "#020617", padding: "10px 20px", borderRadius: "8px", fontWeight: "700", fontSize: "13px" },
            },
          ],
        },
      ],
    },
    footer: {
      isEnabled: true,
      elements: [
        {
          id: "saas-footer-container",
          type: "container",
          styles: { backgroundColor: "#020617", color: "#94a3b8", paddingTop: "64px", paddingBottom: "48px", paddingLeft: "32px", paddingRight: "32px" },
          children: [
            {
              id: "saas-footer-grid",
              type: "container",
              styles: { display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "32px", marginBottom: "40px" },
              children: [
                {
                  id: "saas-f-col1",
                  type: "container",
                  children: [
                    { id: "saas-f-logo", type: "heading", content: "SYNAPSE.AI", styles: { fontSize: "18px", fontWeight: "800", color: "#ffffff", marginBottom: "12px" } },
                    { id: "saas-f-desc", type: "text", content: "Autonomous workflows and real-time intelligence for modern enterprise engineering teams.", styles: { fontSize: "13px", lineHeight: "1.6" } },
                  ],
                },
                {
                  id: "saas-f-col2",
                  type: "container",
                  children: [
                    { id: "saas-f-h2", type: "heading", content: "Product", styles: { fontSize: "13px", fontWeight: "700", color: "#ffffff", marginBottom: "12px", textTransform: "uppercase" } },
                    { id: "saas-f-l1", type: "text", content: "Features", href: "/features", styles: { fontSize: "13px", marginBottom: "6px" } },
                    { id: "saas-f-l2", type: "text", content: "Integrations", href: "/integrations", styles: { fontSize: "13px", marginBottom: "6px" } },
                    { id: "saas-f-l3", type: "text", content: "Pricing Plans", href: "/pricing", styles: { fontSize: "13px" } },
                  ],
                },
                {
                  id: "saas-f-col3",
                  type: "container",
                  children: [
                    { id: "saas-f-h3", type: "heading", content: "Security", styles: { fontSize: "13px", fontWeight: "700", color: "#ffffff", marginBottom: "12px", textTransform: "uppercase" } },
                    { id: "saas-f-l4", type: "text", content: "SOC2 Compliance", href: "/security", styles: { fontSize: "13px", marginBottom: "6px" } },
                    { id: "saas-f-l5", type: "text", content: "GDPR & HIPAA", href: "/security", styles: { fontSize: "13px", marginBottom: "6px" } },
                    { id: "saas-f-l6", type: "text", content: "System Status", href: "/contact", styles: { fontSize: "13px" } },
                  ],
                },
                {
                  id: "saas-f-col4",
                  type: "container",
                  children: [
                    { id: "saas-f-h4", type: "heading", content: "Company", styles: { fontSize: "13px", fontWeight: "700", color: "#ffffff", marginBottom: "12px", textTransform: "uppercase" } },
                    { id: "saas-f-l7", type: "text", content: "About Us", href: "/about", styles: { fontSize: "13px", marginBottom: "6px" } },
                    { id: "saas-f-l8", type: "text", content: "Contact Sales", href: "/contact", styles: { fontSize: "13px" } },
                  ],
                },
              ],
            },
            {
              id: "saas-f-bottom",
              type: "text",
              content: "© 2026 Synapse Technologies Inc. All rights reserved. Powered by ForgeStudio.",
              styles: { fontSize: "12px", textAlign: "center", borderTop: "1px solid #1e293b", paddingTop: "20px" },
            },
          ],
        },
      ],
    },
  },
  popups: [
    {
      id: "popup-saas-discount",
      name: "Annual Discount Modal",
      triggerType: "exit-intent",
      triggerDelay: 10,
      elements: [
        {
          id: "saas-pop-box",
          type: "container",
          styles: { backgroundColor: "#020617", border: "1px solid #06b6d4", padding: "32px", borderRadius: "16px", color: "#ffffff", textAlign: "center" },
          children: [
            { id: "saas-pop-h", type: "heading", content: "Get 2 Months Free on Annual Plans", styles: { fontSize: "22px", fontWeight: "800", color: "#06b6d4", marginBottom: "8px" } },
            { id: "saas-pop-p", type: "text", content: "Upgrade your team workflow today and save 20% on all Pro & Enterprise tiers.", styles: { color: "#94a3b8", fontSize: "14px", marginBottom: "20px" } },
            { id: "saas-pop-btn", type: "button", content: "Claim Annual Discount →", href: "/pricing", styles: { backgroundColor: "#06b6d4", color: "#020617", padding: "12px 24px", borderRadius: "8px", fontWeight: "700", width: "100%" } },
          ],
        },
      ],
    },
  ],
  pages: [
    {
      id: "page-saas-home",
      name: "Home",
      slug: "/",
      isHome: true,
      elements: [
        {
          id: "saas-hero",
          type: "container",
          styles: { backgroundColor: "#020617", color: "#ffffff", paddingTop: "96px", paddingBottom: "96px", paddingLeft: "32px", paddingRight: "32px", textAlign: "center" },
          children: [
            { id: "saas-pill", type: "text", content: "⚡ SYNAPSE 3.0 IS NOW LIVE", styles: { backgroundColor: "rgba(6, 182, 212, 0.1)", color: "#06b6d4", padding: "6px 16px", borderRadius: "20px", display: "inline-block", fontSize: "12px", fontWeight: "700", marginBottom: "20px" } },
            { id: "saas-h1", type: "heading", content: "Next-Generation Intelligence Platform for Cloud Scale", styles: { fontSize: "52px", fontWeight: "900", maxWidth: "880px", margin: "0 auto 20px auto", lineHeight: "1.15" } },
            { id: "saas-sub", type: "text", content: "Streamline continuous deployments, automate pipeline telemetry, and eliminate infrastructure bottlenecks with single-click orchestration.", styles: { fontSize: "18px", color: "#94a3b8", maxWidth: "650px", margin: "0 auto 36px auto", lineHeight: "1.6" } },
            {
              id: "saas-cta-box",
              type: "container",
              styles: { display: "flex", justifyContent: "center", gap: "16px" },
              children: [
                { id: "saas-btn1", type: "button", content: "Start 14-Day Trial →", href: "/pricing", styles: { backgroundColor: "#06b6d4", color: "#020617", padding: "14px 28px", borderRadius: "8px", fontWeight: "700", fontSize: "15px" } },
                { id: "saas-btn2", type: "button", content: "Schedule Demo", href: "/contact", styles: { backgroundColor: "transparent", color: "#ffffff", border: "1px solid #334155", padding: "14px 28px", borderRadius: "8px", fontWeight: "600", fontSize: "15px" } },
              ],
            },
          ],
        },
      ],
    },
    { id: "page-saas-features", name: "Features", slug: "/features", isHome: false, elements: [] },
    { id: "page-saas-integrations", name: "Integrations", slug: "/integrations", isHome: false, elements: [] },
    { id: "page-saas-pricing", name: "Pricing & Plans", slug: "/pricing", isHome: false, elements: [] },
    { id: "page-saas-security", name: "Security & Trust", slug: "/security", isHome: false, elements: [] },
    { id: "page-saas-about", name: "About Company", slug: "/about", isHome: false, elements: [] },
    { id: "page-saas-contact", name: "Enterprise Contact", slug: "/contact", isHome: false, elements: [] },
    { id: "page-saas-404", name: "404 Not Found", slug: "/404", isHome: false, elements: [] },
  ],
};
