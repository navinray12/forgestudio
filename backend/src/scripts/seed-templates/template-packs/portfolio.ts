/**
 * Portfolio Template Pack Definition
 * Complete 8-page website pack for designers, artists & creative professionals.
 */

export const portfolioTemplatePack = {
  id: "kit-portfolio-creative",
  slug: "portfolio-creative",
  name: "Neo Portfolio Minimal",
  category: "Portfolio",
  description: "Ultra-clean, avant-garde design portfolio with dynamic grid layouts, case study showcases, and bold typography.",
  thumbnail: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80",
  globalStyles: {
    primaryColor: "#09090b",
    accentColor: "#84cc16",
    backgroundColor: "#09090b",
    textColor: "#fafafa",
    fontFamily: "Space Grotesk, Inter, sans-serif",
    buttonBorderRadius: "999px",
  },
  siteParts: {
    header: {
      isEnabled: true,
      elements: [
        {
          id: "port-header",
          type: "container",
          styles: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 32px", backgroundColor: "#09090b", color: "#ffffff" },
          children: [
            { id: "port-logo", type: "heading", content: "KAI CHEN ✦", styles: { fontSize: "18px", fontWeight: "700" } },
            {
              id: "port-nav",
              type: "nav-menu",
              navMenuItems: [
                { id: "p-work", label: "Works", url: "/" },
                { id: "p-about", label: "About", url: "/about" },
                { id: "p-photography", label: "Photography", url: "/photography" },
                { id: "p-contact", label: "Contact", url: "/contact" },
              ],
            },
            { id: "port-status", type: "text", content: "🟢 Available for Q2/Q3 Projects", styles: { fontSize: "12px", color: "#84cc16" } },
          ],
        },
      ],
    },
    footer: {
      isEnabled: true,
      elements: [
        {
          id: "port-footer",
          type: "container",
          styles: { backgroundColor: "#09090b", color: "#71717a", padding: "64px 32px", textAlign: "center" },
          children: [
            { id: "port-f-h", type: "heading", content: "Let's create something iconic.", styles: { fontSize: "32px", color: "#ffffff", marginBottom: "16px" } },
            { id: "port-f-email", type: "text", content: "hello@kaichen.design", styles: { fontSize: "18px", color: "#84cc16", marginBottom: "32px" } },
            { id: "port-f-copy", type: "text", content: "© 2026 Kai Chen. Powered by ForgeStudio.", styles: { fontSize: "12px" } },
          ],
        },
      ],
    },
  },
  popups: [],
  pages: [
    { id: "page-port-home", name: "Selected Works", slug: "/", isHome: true, elements: [] },
    { id: "page-port-case", name: "Project Case Study", slug: "/case-study", isHome: false, elements: [] },
    { id: "page-port-about", name: "About & Background", slug: "/about", isHome: false, elements: [] },
    { id: "page-port-photo", name: "Photography Archive", slug: "/photography", isHome: false, elements: [] },
    { id: "page-port-reviews", name: "Client Testimonials", slug: "/reviews", isHome: false, elements: [] },
    { id: "page-port-rates", name: "Services & Rates", slug: "/rates", isHome: false, elements: [] },
    { id: "page-port-contact", name: "Get In Touch", slug: "/contact", isHome: false, elements: [] },
    { id: "page-port-404", name: "404 Not Found", slug: "/404", isHome: false, elements: [] },
  ],
};
