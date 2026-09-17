/**
 * E-commerce Store Template Pack Definition
 * Complete 9-page website pack for fashion, lifestyle & retail stores.
 */

export const ecommerceTemplatePack = {
  id: "kit-ecommerce-store",
  slug: "ecommerce-store",
  name: "Luxe & Co E-Commerce",
  category: "Ecommerce",
  description: "Sophisticated boutique and e-commerce storefront with curated product showcases, lookbooks, shopping carts, and trust badges.",
  thumbnail: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80",
  globalStyles: {
    primaryColor: "#18181b",
    accentColor: "#d97706",
    backgroundColor: "#fafaf9",
    textColor: "#27272a",
    fontFamily: "Playfair Display, Inter, serif",
    buttonBorderRadius: "4px",
  },
  siteParts: {
    header: {
      isEnabled: true,
      elements: [
        {
          id: "ecom-header-container",
          type: "container",
          styles: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px", backgroundColor: "#ffffff", borderBottom: "1px solid #f4f4f5" },
          children: [
            { id: "ecom-logo", type: "heading", content: "LUXE & CO.", styles: { fontSize: "22px", fontWeight: "800", letterSpacing: "2px", color: "#18181b" } },
            {
              id: "ecom-nav",
              type: "nav-menu",
              navMenuItems: [
                { id: "e-home", label: "Shop All", url: "/" },
                { id: "e-cat", label: "Collections", url: "/catalog" },
                { id: "e-look", label: "Lookbook", url: "/lookbook" },
                { id: "e-about", label: "Our Story", url: "/about" },
                { id: "e-contact", label: "Contact", url: "/contact" },
              ],
            },
            { id: "ecom-cart-btn", type: "button", content: "Bag (0) 🛍", href: "/catalog", styles: { backgroundColor: "#18181b", color: "#ffffff", padding: "8px 18px", borderRadius: "4px" } },
          ],
        },
      ],
    },
    footer: {
      isEnabled: true,
      elements: [
        {
          id: "ecom-footer-container",
          type: "container",
          styles: { backgroundColor: "#18181b", color: "#a1a1aa", padding: "64px 32px 32px 32px" },
          children: [
            {
              id: "ecom-f-bottom",
              type: "text",
              content: "© 2026 Luxe & Co. Worldwide. Designed on ForgeStudio.",
              styles: { textAlign: "center", fontSize: "12px", borderTop: "1px solid #27272a", paddingTop: "24px" },
            },
          ],
        },
      ],
    },
  },
  popups: [
    {
      id: "popup-vip-discount",
      name: "VIP Welcome 15% Off",
      triggerType: "scroll",
      triggerScrollPercent: 50,
      elements: [
        {
          id: "vip-pop-box",
          type: "container",
          styles: { backgroundColor: "#ffffff", padding: "32px", textAlign: "center", maxWidth: "440px" },
          children: [
            { id: "vip-h", type: "heading", content: "Unlock 15% Off Your First Order", styles: { fontSize: "22px", fontWeight: "700", marginBottom: "8px" } },
            { id: "vip-p", type: "text", content: "Join our complimentary Collector's Circle for early access to seasonal drops.", styles: { color: "#71717a", fontSize: "14px", marginBottom: "16px" } },
            { id: "vip-btn", type: "button", content: "Get My 15% Code →", href: "/catalog", styles: { backgroundColor: "#18181b", color: "#ffffff", padding: "12px", width: "100%" } },
          ],
        },
      ],
    },
  ],
  pages: [
    { id: "page-ecom-home", name: "Home Storefront", slug: "/", isHome: true, elements: [] },
    { id: "page-ecom-catalog", name: "Catalog & Shop", slug: "/catalog", isHome: false, elements: [] },
    { id: "page-ecom-lookbook", name: "Seasonal Lookbook", slug: "/lookbook", isHome: false, elements: [] },
    { id: "page-ecom-about", name: "Our Heritage", slug: "/about", isHome: false, elements: [] },
    { id: "page-ecom-reviews", name: "Customer Reviews", slug: "/reviews", isHome: false, elements: [] },
    { id: "page-ecom-faq", name: "Shipping & Returns", slug: "/faq", isHome: false, elements: [] },
    { id: "page-ecom-contact", name: "Customer Care", slug: "/contact", isHome: false, elements: [] },
    { id: "page-ecom-404", name: "404 Not Found", slug: "/404", isHome: false, elements: [] },
  ],
};
