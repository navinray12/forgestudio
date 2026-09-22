/**
 * Restaurant & Hospitality Template Pack Definition
 * Complete 8-page website pack for bistros, fine dining & wineries.
 */

export const restaurantTemplatePack = {
  id: "kit-restaurant-bistro",
  slug: "restaurant-bistro",
  name: "Osteria Bella Bistro",
  category: "Other",
  description: "Rustic fine-dining and culinary template pack with interactive digital menu, reservation system, wine pairings, and chef profiles.",
  thumbnail: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80",
  globalStyles: {
    primaryColor: "#2c1810",
    accentColor: "#c2410c",
    backgroundColor: "#fffbeb",
    textColor: "#451a03",
    fontFamily: "Cormorant Garamond, Inter, serif",
    buttonBorderRadius: "2px",
  },
  siteParts: {
    header: {
      isEnabled: true,
      elements: [
        {
          id: "rest-header",
          type: "container",
          styles: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 40px", backgroundColor: "#2c1810", color: "#fef3c7" },
          children: [
            { id: "rest-logo", type: "heading", content: "OSTERIA BELLA", styles: { fontSize: "24px", fontWeight: "700", letterSpacing: "3px" } },
            {
              id: "rest-nav",
              type: "nav-menu",
              navMenuItems: [
                { id: "r-menu", label: "Menu", url: "/menu" },
                { id: "r-wine", label: "Wine List", url: "/wine" },
                { id: "r-story", label: "Our Story", url: "/about" },
                { id: "r-events", label: "Private Events", url: "/events" },
                { id: "r-contact", label: "Contact", url: "/contact" },
              ],
            },
            { id: "rest-res-btn", type: "button", content: "Reserve a Table", href: "/contact", styles: { backgroundColor: "#c2410c", color: "#ffffff", padding: "10px 24px" } },
          ],
        },
      ],
    },
    footer: {
      isEnabled: true,
      elements: [
        {
          id: "rest-footer",
          type: "container",
          styles: { backgroundColor: "#2c1810", color: "#d6d3d1", padding: "64px 32px", textAlign: "center" },
          children: [
            { id: "rest-f-h", type: "heading", content: "OSTERIA BELLA", styles: { fontSize: "20px", color: "#fef3c7", marginBottom: "8px" } },
            { id: "rest-f-addr", type: "text", content: "450 Culinary Boulevard, San Francisco, CA | (415) 555-0198", styles: { fontSize: "14px", marginBottom: "24px" } },
            { id: "rest-f-copy", type: "text", content: "© 2026 Osteria Bella. Powered by ForgeStudio.", styles: { fontSize: "12px", color: "#78716c" } },
          ],
        },
      ],
    },
  },
  popups: [],
  pages: [
    { id: "page-rest-home", name: "Welcome Home", slug: "/", isHome: true, elements: [] },
    { id: "page-rest-menu", name: "Seasonal Dinner Menu", slug: "/menu", isHome: false, elements: [] },
    { id: "page-rest-wine", name: "Sommelier Wine Selection", slug: "/wine", isHome: false, elements: [] },
    { id: "page-rest-about", name: "Chef's Story & Farm Partners", slug: "/about", isHome: false, elements: [] },
    { id: "page-rest-events", name: "Private Dining & Catering", slug: "/events", isHome: false, elements: [] },
    { id: "page-rest-gallery", name: "Atmosphere & Dishes", slug: "/gallery", isHome: false, elements: [] },
    { id: "page-rest-contact", name: "Reservations & Hours", slug: "/contact", isHome: false, elements: [] },
    { id: "page-rest-404", name: "404 Not Found", slug: "/404", isHome: false, elements: [] },
  ],
};
