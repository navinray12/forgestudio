/**
 * Healthcare & Medical Clinic Template Pack Definition
 * Complete 8-page website pack for clinics, dental centers & medical practices.
 */

export const healthcareTemplatePack = {
  id: "kit-healthcare-clinic",
  slug: "healthcare-clinic",
  name: "ApexCare Health & Wellness",
  category: "Other",
  description: "Trustworthy medical and healthcare clinic template pack with specialist directories, treatment catalogs, patient portals, and online scheduling.",
  thumbnail: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80",
  globalStyles: {
    primaryColor: "#042f2e",
    accentColor: "#0d9488",
    secondaryColor: "#0284c7",
    backgroundColor: "#ffffff",
    textColor: "#334155",
    fontFamily: "Inter, sans-serif",
    buttonBorderRadius: "8px",
  },
  siteParts: {
    header: {
      isEnabled: true,
      elements: [
        {
          id: "health-header",
          type: "container",
          styles: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px", backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0" },
          children: [
            { id: "health-logo", type: "heading", content: "APEXCARE✦HEALTH", styles: { fontSize: "20px", fontWeight: "800", color: "#042f2e" } },
            {
              id: "health-nav",
              type: "nav-menu",
              navMenuItems: [
                { id: "h-home", label: "Care Services", url: "/" },
                { id: "h-services", label: "Treatments", url: "/services" },
                { id: "h-doctors", label: "Doctors", url: "/doctors" },
                { id: "h-patient", label: "Patient Care", url: "/patient-care" },
                { id: "h-contact", label: "Appointments", url: "/contact" },
              ],
            },
            { id: "health-btn", type: "button", content: "Book Appointment", href: "/contact", styles: { backgroundColor: "#0d9488", color: "#ffffff", padding: "10px 20px", borderRadius: "8px" } },
          ],
        },
      ],
    },
    footer: {
      isEnabled: true,
      elements: [
        {
          id: "health-footer",
          type: "container",
          styles: { backgroundColor: "#042f2e", color: "#99f6e4", padding: "64px 32px", textAlign: "center" },
          children: [
            { id: "health-f-copy", type: "text", content: "© 2026 ApexCare Health Network. In case of emergency please dial 911 immediately. Powered by ForgeStudio.", styles: { fontSize: "12px" } },
          ],
        },
      ],
    },
  },
  popups: [],
  pages: [
    { id: "page-health-home", name: "Clinic Home", slug: "/", isHome: true, elements: [] },
    { id: "page-health-services", name: "Medical Services", slug: "/services", isHome: false, elements: [] },
    { id: "page-health-doctors", name: "Physicians & Specialists", slug: "/doctors", isHome: false, elements: [] },
    { id: "page-health-patient", name: "Patient Portal & Insurance", slug: "/patient-care", isHome: false, elements: [] },
    { id: "page-health-reviews", name: "Patient Testimonials", slug: "/reviews", isHome: false, elements: [] },
    { id: "page-health-faq", name: "Patient FAQ & Billing", slug: "/faq", isHome: false, elements: [] },
    { id: "page-health-contact", name: "Book Visit & Location", slug: "/contact", isHome: false, elements: [] },
    { id: "page-health-404", name: "404 Not Found", slug: "/404", isHome: false, elements: [] },
  ],
};
