/**
 * Real Estate Template Pack Definition
 * Complete 8-page website pack for property developments, brokers & agencies.
 */

export const realEstateTemplatePack = {
  id: "kit-real-estate",
  slug: "real-estate",
  name: "Haven Luxury Real Estate",
  category: "Business",
  description: "Architectural real estate and property showcase template pack with property filters, floor plans, neighborhood spotlights, and agent profiles.",
  thumbnail: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80",
  globalStyles: {
    primaryColor: "#1e293b",
    accentColor: "#059669",
    backgroundColor: "#ffffff",
    textColor: "#334155",
    fontFamily: "DM Sans, sans-serif",
    buttonBorderRadius: "8px",
  },
  siteParts: {
    header: {
      isEnabled: true,
      elements: [
        {
          id: "re-header",
          type: "container",
          styles: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px", backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0" },
          children: [
            { id: "re-logo", type: "heading", content: "HAVEN REALTY", styles: { fontSize: "20px", fontWeight: "800", color: "#1e293b", letterSpacing: "1px" } },
            {
              id: "re-nav",
              type: "nav-menu",
              navMenuItems: [
                { id: "re-home", label: "Properties", url: "/" },
                { id: "re-cat", label: "Exclusive Listings", url: "/listings" },
                { id: "re-neigh", label: "Neighborhoods", url: "/neighborhoods" },
                { id: "re-agents", label: "Agents", url: "/agents" },
                { id: "re-contact", label: "Contact", url: "/contact" },
              ],
            },
            { id: "re-btn", type: "button", content: "Schedule Viewing", href: "/contact", styles: { backgroundColor: "#059669", color: "#ffffff", padding: "10px 20px", borderRadius: "8px" } },
          ],
        },
      ],
    },
    footer: {
      isEnabled: true,
      elements: [
        {
          id: "re-footer",
          type: "container",
          styles: { backgroundColor: "#1e293b", color: "#94a3b8", padding: "64px 32px", textAlign: "center" },
          children: [
            { id: "re-f-copy", type: "text", content: "© 2026 Haven Luxury Real Estate Group. Equal Housing Opportunity. Powered by ForgeStudio.", styles: { fontSize: "12px" } },
          ],
        },
      ],
    },
  },
  popups: [],
  pages: [
    { id: "page-re-home", name: "Featured Properties", slug: "/", isHome: true, elements: [] },
    { id: "page-re-listings", name: "Property Catalog", slug: "/listings", isHome: false, elements: [] },
    { id: "page-re-detail", name: "Listing Showcase", slug: "/listing-detail", isHome: false, elements: [] },
    { id: "page-re-neighborhoods", name: "Neighborhood Guides", slug: "/neighborhoods", isHome: false, elements: [] },
    { id: "page-re-sell", name: "Selling Your Estate", slug: "/sell", isHome: false, elements: [] },
    { id: "page-re-agents", name: "Our Advisory Agents", slug: "/agents", isHome: false, elements: [] },
    { id: "page-re-contact", name: "Valuation & Contact", slug: "/contact", isHome: false, elements: [] },
    { id: "page-re-404", name: "404 Not Found", slug: "/404", isHome: false, elements: [] },
  ],
};
