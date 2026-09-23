/**
 * Creative Studio Template Pack Definition
 * Complete 8-page website pack for 3D, CGI, motion design & production houses.
 */

export const creativeStudioTemplatePack = {
  id: "kit-creative-studio",
  slug: "creative-studio",
  name: "Vortex Motion & 3D Studio",
  category: "Portfolio",
  description: "Cyberpunk, high-energy 3D and motion design studio template pack with showreel integration, interactive case studies, and RFP forms.",
  thumbnail: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80",
  globalStyles: {
    primaryColor: "#030712",
    accentColor: "#a855f7",
    secondaryColor: "#ec4899",
    backgroundColor: "#030712",
    textColor: "#f3f4f6",
    fontFamily: "Syne, Inter, sans-serif",
    buttonBorderRadius: "14px",
  },
  siteParts: {
    header: {
      isEnabled: true,
      elements: [
        {
          id: "cs-header",
          type: "container",
          styles: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 32px", backgroundColor: "#030712", color: "#ffffff", borderBottom: "1px solid rgba(168, 85, 247, 0.2)" },
          children: [
            { id: "cs-logo", type: "heading", content: "VORTEX 3D ⚡", styles: { fontSize: "20px", fontWeight: "900", color: "#a855f7" } },
            {
              id: "cs-nav",
              type: "nav-menu",
              navMenuItems: [
                { id: "cs-home", label: "Showreel", url: "/" },
                { id: "cs-projects", label: "Projects", url: "/projects" },
                { id: "cs-capabilities", label: "Tech Stack", url: "/capabilities" },
                { id: "cs-culture", label: "Studio", url: "/culture" },
                { id: "cs-contact", label: "Start Project", url: "/contact" },
              ],
            },
            { id: "cs-cta", type: "button", content: "Send RFP 🚀", href: "/contact", styles: { backgroundColor: "#a855f7", color: "#ffffff", padding: "10px 22px", borderRadius: "14px", fontWeight: "700" } },
          ],
        },
      ],
    },
    footer: {
      isEnabled: true,
      elements: [
        {
          id: "cs-footer",
          type: "container",
          styles: { backgroundColor: "#030712", color: "#9ca3af", padding: "64px 32px", textAlign: "center" },
          children: [
            { id: "cs-f-logo", type: "heading", content: "VORTEX 3D STUDIO", styles: { fontSize: "24px", color: "#ffffff", marginBottom: "8px" } },
            { id: "cs-f-tag", type: "text", content: "Tokyo ✦ London ✦ Los Angeles", styles: { fontSize: "14px", color: "#ec4899", marginBottom: "24px" } },
            { id: "cs-f-copy", type: "text", content: "© 2026 Vortex Creative Studio. Powered by ForgeStudio.", styles: { fontSize: "12px", color: "#6b7280" } },
          ],
        },
      ],
    },
  },
  popups: [],
  pages: [
    { id: "page-cs-home", name: "Showreel Home", slug: "/", isHome: true, elements: [] },
    { id: "page-cs-projects", name: "Commercial Projects", slug: "/projects", isHome: false, elements: [] },
    { id: "page-cs-capabilities", name: "3D & Motion Capabilities", slug: "/capabilities", isHome: false, elements: [] },
    { id: "page-cs-culture", name: "Studio Culture & Team", slug: "/culture", isHome: false, elements: [] },
    { id: "page-cs-pricing", name: "Retainers & Project Sprints", slug: "/pricing", isHome: false, elements: [] },
    { id: "page-cs-awards", name: "Awards & Press", slug: "/awards", isHome: false, elements: [] },
    { id: "page-cs-contact", name: "Request RFP / Quote", slug: "/contact", isHome: false, elements: [] },
    { id: "page-cs-404", name: "404 Not Found", slug: "/404", isHome: false, elements: [] },
  ],
};
