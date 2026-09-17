/**
 * Corporate Business Template Pack Definition
 * Complete 9-page website pack for consulting, finance & enterprises.
 */

export const corporateTemplatePack = {
  id: "kit-corporate-business",
  slug: "corporate-business",
  name: "Apex Global Consulting",
  category: "Business",
  description: "Prestigious corporate template pack for institutional finance, management consulting, and global enterprises.",
  thumbnail: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80",
  globalStyles: {
    primaryColor: "#0a192f",
    accentColor: "#0284c7",
    secondaryColor: "#eab308",
    backgroundColor: "#ffffff",
    textColor: "#334155",
    fontFamily: "Plus Jakarta Sans, sans-serif",
    buttonBorderRadius: "6px",
  },
  siteParts: {
    header: {
      isEnabled: true,
      elements: [
        {
          id: "corp-header-container",
          type: "container",
          styles: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px", backgroundColor: "#0a192f", color: "#ffffff" },
          children: [
            { id: "corp-logo", type: "heading", content: "APEX GLOBAL", styles: { fontSize: "20px", fontWeight: "800", color: "#ffffff", letterSpacing: "1px" } },
            {
              id: "corp-nav",
              type: "nav-menu",
              navMenuItems: [
                { id: "c-home", label: "Overview", url: "/" },
                { id: "c-about", label: "About", url: "/about" },
                { id: "c-services", label: "Practices", url: "/services" },
                { id: "c-cases", label: "Case Studies", url: "/cases" },
                { id: "c-leadership", label: "Leadership", url: "/team" },
                { id: "c-contact", label: "Contact", url: "/contact" },
              ],
            },
            { id: "corp-cta", type: "button", content: "Client Portal →", href: "/contact", styles: { backgroundColor: "#0284c7", color: "#ffffff", padding: "10px 20px", borderRadius: "6px", fontWeight: "600" } },
          ],
        },
      ],
    },
    footer: {
      isEnabled: true,
      elements: [
        {
          id: "corp-footer-container",
          type: "container",
          styles: { backgroundColor: "#0a192f", color: "#94a3b8", padding: "64px 32px 32px 32px" },
          children: [
            {
              id: "corp-f-copy",
              type: "text",
              content: "© 2026 Apex Global Advisory Partners LLC. All rights reserved. Powered by ForgeStudio.",
              styles: { textAlign: "center", fontSize: "12px", borderTop: "1px solid #1e293b", paddingTop: "24px" },
            },
          ],
        },
      ],
    },
  },
  popups: [
    {
      id: "popup-market-report",
      name: "Quarterly Market Report Download",
      triggerType: "time-delay",
      triggerDelay: 15,
      elements: [
        {
          id: "corp-pop-box",
          type: "container",
          styles: { backgroundColor: "#ffffff", padding: "32px", borderRadius: "12px", textAlign: "center", maxWidth: "460px" },
          children: [
            { id: "corp-pop-h", type: "heading", content: "2026 Global Capital Markets Outlook", styles: { fontSize: "20px", fontWeight: "800", color: "#0a192f", marginBottom: "8px" } },
            { id: "corp-pop-p", type: "text", content: "Download our definitive 48-page executive summary on macro liquidity trends and AI capital efficiency.", styles: { color: "#64748b", fontSize: "14px", marginBottom: "16px" } },
            { id: "corp-pop-btn", type: "button", content: "Download PDF (Instant) →", href: "/contact", styles: { backgroundColor: "#0284c7", color: "#ffffff", padding: "12px 24px", borderRadius: "6px", width: "100%" } },
          ],
        },
      ],
    },
  ],
  pages: [
    { id: "page-corp-home", name: "Corporate Home", slug: "/", isHome: true, elements: [] },
    { id: "page-corp-about", name: "Corporate Overview", slug: "/about", isHome: false, elements: [] },
    { id: "page-corp-services", name: "Consulting Practices", slug: "/services", isHome: false, elements: [] },
    { id: "page-corp-cases", name: "Client Impact & Cases", slug: "/cases", isHome: false, elements: [] },
    { id: "page-corp-team", name: "Executive Leadership", slug: "/team", isHome: false, elements: [] },
    { id: "page-corp-insights", name: "Market Insights", slug: "/insights", isHome: false, elements: [] },
    { id: "page-corp-contact", name: "Advisory Contact", slug: "/contact", isHome: false, elements: [] },
    { id: "page-corp-404", name: "404 Not Found", slug: "/404", isHome: false, elements: [] },
  ],
};
