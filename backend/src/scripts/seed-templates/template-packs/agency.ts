/**
 * Modern Agency Template Pack Definition
 * Complete 9-page website pack for creative and digital agencies.
 */

export const agencyTemplatePack = {
  id: "kit-modern-agency",
  slug: "modern-agency",
  name: "Modern Agency Pro",
  category: "Business",
  description: "High-impact, conversion-focused website template pack designed for creative agencies, branding studios, and digital consultancies.",
  thumbnail: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&auto=format&fit=crop&q=80",
  globalStyles: {
    primaryColor: "#0f172a",
    accentColor: "#6366f1",
    secondaryColor: "#8b5cf6",
    backgroundColor: "#ffffff",
    textColor: "#334155",
    fontFamily: "Outfit, Inter, sans-serif",
    buttonBorderRadius: "12px",
  },
  siteParts: {
    header: {
      isEnabled: true,
      elements: [
        {
          id: "agency-header-container",
          type: "container",
          styles: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "16px",
            paddingBottom: "16px",
            paddingLeft: "32px",
            paddingRight: "32px",
            backgroundColor: "#ffffff",
            borderBottom: "1px solid #e2e8f0",
            position: "sticky",
            top: "0",
            zIndex: "50",
          },
          children: [
            {
              id: "agency-logo",
              type: "heading",
              content: "AURA✦STUDIO",
              styles: {
                fontSize: "22px",
                fontWeight: "900",
                letterSpacing: "-0.5px",
                color: "#0f172a",
              },
            },
            {
              id: "agency-nav-menu",
              type: "nav-menu",
              navMenuItems: [
                { id: "nav-home", label: "Home", url: "/" },
                { id: "nav-about", label: "About", url: "/about" },
                { id: "nav-services", label: "Services", url: "/services" },
                { id: "nav-cases", label: "Work", url: "/portfolio" },
                { id: "nav-pricing", label: "Pricing", url: "/pricing" },
                { id: "nav-contact", label: "Contact", url: "/contact" },
              ],
              styles: { display: "flex", gap: "24px" },
            },
            {
              id: "agency-header-btn",
              type: "button",
              content: "Book a Call →",
              href: "/contact",
              styles: {
                backgroundColor: "#6366f1",
                color: "#ffffff",
                paddingTop: "10px",
                paddingBottom: "10px",
                paddingLeft: "20px",
                paddingRight: "20px",
                borderRadius: "10px",
                fontWeight: "600",
                fontSize: "14px",
              },
            },
          ],
        },
      ],
    },
    footer: {
      isEnabled: true,
      elements: [
        {
          id: "agency-footer-container",
          type: "container",
          styles: {
            backgroundColor: "#0f172a",
            color: "#f8fafc",
            paddingTop: "64px",
            paddingBottom: "48px",
            paddingLeft: "32px",
            paddingRight: "32px",
          },
          children: [
            {
              id: "agency-footer-grid",
              type: "container",
              styles: {
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1.5fr",
                gap: "40px",
                marginBottom: "48px",
              },
              children: [
                {
                  id: "footer-brand-col",
                  type: "container",
                  children: [
                    { id: "footer-brand-logo", type: "heading", content: "AURA✦STUDIO", styles: { fontSize: "20px", fontWeight: "800", color: "#ffffff", marginBottom: "16px" } },
                    { id: "footer-brand-desc", type: "text", content: "We design and build iconic brand experiences that accelerate growth for venture-backed companies worldwide.", styles: { color: "#94a3b8", fontSize: "14px", lineHeight: "1.6" } },
                  ],
                },
                {
                  id: "footer-links-col1",
                  type: "container",
                  children: [
                    { id: "footer-links-title1", type: "heading", content: "Company", styles: { fontSize: "14px", fontWeight: "700", color: "#ffffff", marginBottom: "16px", textTransform: "uppercase" } },
                    { id: "footer-link-about", type: "text", content: "About Us", href: "/about", styles: { color: "#94a3b8", fontSize: "14px", marginBottom: "8px" } },
                    { id: "footer-link-services", type: "text", content: "Services", href: "/services", styles: { color: "#94a3b8", fontSize: "14px", marginBottom: "8px" } },
                    { id: "footer-link-work", type: "text", content: "Selected Work", href: "/portfolio", styles: { color: "#94a3b8", fontSize: "14px", marginBottom: "8px" } },
                    { id: "footer-link-careers", type: "text", content: "Careers", href: "/careers", styles: { color: "#94a3b8", fontSize: "14px" } },
                  ],
                },
                {
                  id: "footer-links-col2",
                  type: "container",
                  children: [
                    { id: "footer-links-title2", type: "heading", content: "Resources", styles: { fontSize: "14px", fontWeight: "700", color: "#ffffff", marginBottom: "16px", textTransform: "uppercase" } },
                    { id: "footer-link-pricing", type: "text", content: "Pricing", href: "/pricing", styles: { color: "#94a3b8", fontSize: "14px", marginBottom: "8px" } },
                    { id: "footer-link-faq", type: "text", content: "FAQ", href: "/faq", styles: { color: "#94a3b8", fontSize: "14px", marginBottom: "8px" } },
                    { id: "footer-link-team", type: "text", content: "Team", href: "/team", styles: { color: "#94a3b8", fontSize: "14px", marginBottom: "8px" } },
                    { id: "footer-link-contact", type: "text", content: "Contact", href: "/contact", styles: { color: "#94a3b8", fontSize: "14px" } },
                  ],
                },
                {
                  id: "footer-newsletter-col",
                  type: "container",
                  children: [
                    { id: "footer-newsletter-title", type: "heading", content: "Stay in the loop", styles: { fontSize: "14px", fontWeight: "700", color: "#ffffff", marginBottom: "12px", textTransform: "uppercase" } },
                    { id: "footer-newsletter-desc", type: "text", content: "Join 15,000+ founders receiving our bi-weekly design and product insights.", styles: { color: "#94a3b8", fontSize: "13px", marginBottom: "16px" } },
                  ],
                },
              ],
            },
            {
              id: "agency-footer-copyright",
              type: "text",
              content: "© 2026 Aura Studio Inc. All rights reserved. Powered by ForgeStudio.",
              styles: { color: "#64748b", fontSize: "13px", textAlign: "center", borderTop: "1px solid #1e293b", paddingTop: "24px" },
            },
          ],
        },
      ],
    },
  },
  popups: [
    {
      id: "popup-strategy-session",
      name: "Free Discovery Session",
      triggerType: "exit-intent",
      triggerDelay: 5,
      elements: [
        {
          id: "popup-container",
          type: "container",
          styles: {
            backgroundColor: "#ffffff",
            padding: "32px",
            borderRadius: "20px",
            textAlign: "center",
            maxWidth: "480px",
          },
          children: [
            { id: "popup-title", type: "heading", content: "Ready to Scale Your Brand?", styles: { fontSize: "24px", fontWeight: "800", color: "#0f172a", marginBottom: "8px" } },
            { id: "popup-text", type: "text", content: "Claim your complimentary 30-minute design audit and growth roadmap with our Creative Director.", styles: { color: "#64748b", fontSize: "14px", marginBottom: "20px" } },
            { id: "popup-cta", type: "button", content: "Claim Free Audit →", href: "/contact", styles: { backgroundColor: "#6366f1", color: "#ffffff", padding: "12px 24px", borderRadius: "10px", fontWeight: "600", width: "100%" } },
          ],
        },
      ],
    },
  ],
  pages: [
    {
      id: "page-agency-home",
      name: "Home",
      slug: "/",
      isHome: true,
      elements: [
        {
          id: "hero-section",
          type: "container",
          styles: {
            backgroundColor: "#0f172a",
            color: "#ffffff",
            paddingTop: "96px",
            paddingBottom: "96px",
            paddingLeft: "32px",
            paddingRight: "32px",
            textAlign: "center",
            backgroundImage: "radial-gradient(ellipse at top, #1e1b4b 0%, #0f172a 70%)",
          },
          children: [
            { id: "hero-badge", type: "text", content: "✦ TOP RATED DIGITAL AGENCY 2026", styles: { color: "#818cf8", fontSize: "12px", fontWeight: "700", letterSpacing: "2px", marginBottom: "16px" } },
            { id: "hero-title", type: "heading", content: "We Design Iconic Products & Transform Digital Brands", styles: { fontSize: "52px", fontWeight: "900", lineHeight: "1.15", maxWidth: "900px", margin: "0 auto 24px auto", letterSpacing: "-1px" } },
            { id: "hero-subtitle", type: "text", content: "Aura Studio partners with ambitious technology brands to engineer delightful digital products, websites, and brand identities that convert.", styles: { fontSize: "18px", color: "#94a3b8", maxWidth: "680px", margin: "0 auto 36px auto", lineHeight: "1.6" } },
            {
              id: "hero-actions",
              type: "container",
              styles: { display: "flex", justifyContent: "center", gap: "16px" },
              children: [
                { id: "hero-primary-btn", type: "button", content: "Explore Our Work →", href: "/portfolio", styles: { backgroundColor: "#6366f1", color: "#ffffff", padding: "14px 28px", borderRadius: "12px", fontWeight: "600", fontSize: "16px" } },
                { id: "hero-secondary-btn", type: "button", content: "View Pricing", href: "/pricing", styles: { backgroundColor: "transparent", color: "#ffffff", border: "1px solid #334155", padding: "14px 28px", borderRadius: "12px", fontWeight: "600", fontSize: "16px" } },
              ],
            },
          ],
        },
        {
          id: "services-summary-section",
          type: "container",
          styles: { paddingTop: "80px", paddingBottom: "80px", paddingLeft: "32px", paddingRight: "32px", backgroundColor: "#f8fafc" },
          children: [
            { id: "services-header", type: "heading", content: "Our Core Capabilities", styles: { fontSize: "36px", fontWeight: "800", textAlign: "center", color: "#0f172a", marginBottom: "12px" } },
            { id: "services-sub", type: "text", content: "Full-cycle product design, frontend engineering, and brand positioning.", styles: { fontSize: "16px", color: "#64748b", textAlign: "center", marginBottom: "48px" } },
          ],
        },
      ],
    },
    {
      id: "page-agency-about",
      name: "About Us",
      slug: "/about",
      isHome: false,
      elements: [
        {
          id: "about-hero",
          type: "container",
          styles: { paddingTop: "80px", paddingBottom: "64px", paddingLeft: "32px", paddingRight: "32px", backgroundColor: "#f8fafc", textAlign: "center" },
          children: [
            { id: "about-title", type: "heading", content: "We Are Craftsmen of Modern Digital Experiences", styles: { fontSize: "44px", fontWeight: "800", color: "#0f172a", marginBottom: "16px" } },
            { id: "about-desc", type: "text", content: "Founded in 2021, Aura Studio is an award-winning team of 28 designers, technologists, and brand strategists operating across San Francisco, London, and Tokyo.", styles: { fontSize: "18px", color: "#475569", maxWidth: "720px", margin: "0 auto", lineHeight: "1.6" } },
          ],
        },
      ],
    },
    {
      id: "page-agency-services",
      name: "Services",
      slug: "/services",
      isHome: false,
      elements: [
        {
          id: "services-hero",
          type: "container",
          styles: { paddingTop: "80px", paddingBottom: "64px", paddingLeft: "32px", paddingRight: "32px", textAlign: "center" },
          children: [
            { id: "serv-title", type: "heading", content: "End-to-End Design & Engineering Services", styles: { fontSize: "40px", fontWeight: "800", color: "#0f172a", marginBottom: "16px" } },
            { id: "serv-sub", type: "text", content: "From initial napkin sketch to Series B scale, we provide dedicated agile pods tailored to your product roadmap.", styles: { fontSize: "16px", color: "#64748b", maxWidth: "600px", margin: "0 auto" } },
          ],
        },
      ],
    },
    {
      id: "page-agency-portfolio",
      name: "Work & Case Studies",
      slug: "/portfolio",
      isHome: false,
      elements: [
        {
          id: "portfolio-hero",
          type: "container",
          styles: { paddingTop: "80px", paddingBottom: "64px", paddingLeft: "32px", paddingRight: "32px", textAlign: "center" },
          children: [
            { id: "port-title", type: "heading", content: "Featured Client Transformations", styles: { fontSize: "40px", fontWeight: "800", color: "#0f172a", marginBottom: "16px" } },
            { id: "port-sub", type: "text", content: "Explore our recent case studies across FinTech, HealthTech, and AI infrastructure.", styles: { fontSize: "16px", color: "#64748b" } },
          ],
        },
      ],
    },
    {
      id: "page-agency-pricing",
      name: "Pricing & Retainers",
      slug: "/pricing",
      isHome: false,
      elements: [
        {
          id: "pricing-hero",
          type: "container",
          styles: { paddingTop: "80px", paddingBottom: "64px", paddingLeft: "32px", paddingRight: "32px", textAlign: "center" },
          children: [
            { id: "price-title", type: "heading", content: "Simple, Transparent Project & Retainer Pricing", styles: { fontSize: "40px", fontWeight: "800", color: "#0f172a", marginBottom: "16px" } },
            { id: "price-sub", type: "text", content: "No surprise hourly overages. Predictable sprints with senior designers and engineers.", styles: { fontSize: "16px", color: "#64748b" } },
          ],
        },
      ],
    },
    {
      id: "page-agency-team",
      name: "Leadership & Team",
      slug: "/team",
      isHome: false,
      elements: [
        {
          id: "team-hero",
          type: "container",
          styles: { paddingTop: "80px", paddingBottom: "64px", paddingLeft: "32px", paddingRight: "32px", textAlign: "center" },
          children: [
            { id: "team-title", type: "heading", content: "Meet the Minds Behind Aura Studio", styles: { fontSize: "40px", fontWeight: "800", color: "#0f172a", marginBottom: "16px" } },
            { id: "team-sub", type: "text", content: "Former design leads from Apple, Stripe, and Figma united to build the future.", styles: { fontSize: "16px", color: "#64748b" } },
          ],
        },
      ],
    },
    {
      id: "page-agency-careers",
      name: "Careers",
      slug: "/careers",
      isHome: false,
      elements: [
        {
          id: "careers-hero",
          type: "container",
          styles: { paddingTop: "80px", paddingBottom: "64px", paddingLeft: "32px", paddingRight: "32px", textAlign: "center" },
          children: [
            { id: "car-title", type: "heading", content: "Join Our Distributed Design Collective", styles: { fontSize: "40px", fontWeight: "800", color: "#0f172a", marginBottom: "16px" } },
            { id: "car-sub", type: "text", content: "We offer 100% remote flexibility, competitive equity, and an annual learning stipend.", styles: { fontSize: "16px", color: "#64748b" } },
          ],
        },
      ],
    },
    {
      id: "page-agency-contact",
      name: "Contact Us",
      slug: "/contact",
      isHome: false,
      elements: [
        {
          id: "contact-hero",
          type: "container",
          styles: { paddingTop: "80px", paddingBottom: "64px", paddingLeft: "32px", paddingRight: "32px", textAlign: "center" },
          children: [
            { id: "con-title", type: "heading", content: "Let's Build Something Unforgettable Together", styles: { fontSize: "40px", fontWeight: "800", color: "#0f172a", marginBottom: "16px" } },
            { id: "con-sub", type: "text", content: "Tell us about your upcoming project or request an RFP response within 24 hours.", styles: { fontSize: "16px", color: "#64748b" } },
          ],
        },
      ],
    },
    {
      id: "page-agency-404",
      name: "Page Not Found",
      slug: "/404",
      isHome: false,
      elements: [
        {
          id: "404-container",
          type: "container",
          styles: { paddingTop: "120px", paddingBottom: "120px", textAlign: "center" },
          children: [
            { id: "404-code", type: "heading", content: "404", styles: { fontSize: "96px", fontWeight: "900", color: "#6366f1" } },
            { id: "404-msg", type: "text", content: "The page you are looking for has been moved or doesn't exist.", styles: { fontSize: "18px", color: "#64748b", marginBottom: "24px" } },
            { id: "404-btn", type: "button", content: "Return Home →", href: "/", styles: { backgroundColor: "#0f172a", color: "#ffffff", padding: "12px 24px", borderRadius: "10px" } },
          ],
        },
      ],
    },
  ],
};
