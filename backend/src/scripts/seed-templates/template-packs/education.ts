/**
 * Education & Academy Template Pack Definition
 * Complete 8-page website pack for bootcamps, academies & online courses.
 */

export const educationTemplatePack = {
  id: "kit-education-academy",
  slug: "education-academy",
  name: "Elevate Tech Academy",
  category: "Other",
  description: "Dynamic learning platform and bootcamp template pack with curriculum outlines, instructor bios, tuition breakdowns, and enrollment workflows.",
  thumbnail: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80",
  globalStyles: {
    primaryColor: "#1e1b4b",
    accentColor: "#2563eb",
    secondaryColor: "#f97316",
    backgroundColor: "#ffffff",
    textColor: "#334155",
    fontFamily: "Outfit, Inter, sans-serif",
    buttonBorderRadius: "10px",
  },
  siteParts: {
    header: {
      isEnabled: true,
      elements: [
        {
          id: "edu-header",
          type: "container",
          styles: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px", backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0" },
          children: [
            { id: "edu-logo", type: "heading", content: "ELEVATE ACADEMY", styles: { fontSize: "20px", fontWeight: "800", color: "#1e1b4b" } },
            {
              id: "edu-nav",
              type: "nav-menu",
              navMenuItems: [
                { id: "ed-home", label: "Programs", url: "/" },
                { id: "ed-courses", label: "Courses", url: "/courses" },
                { id: "ed-mentors", label: "Mentors", url: "/mentors" },
                { id: "ed-tuition", label: "Tuition", url: "/tuition" },
                { id: "ed-contact", label: "Admissions", url: "/contact" },
              ],
            },
            { id: "edu-btn", type: "button", content: "Apply Now →", href: "/contact", styles: { backgroundColor: "#2563eb", color: "#ffffff", padding: "10px 20px", borderRadius: "10px" } },
          ],
        },
      ],
    },
    footer: {
      isEnabled: true,
      elements: [
        {
          id: "edu-footer",
          type: "container",
          styles: { backgroundColor: "#1e1b4b", color: "#94a3b8", padding: "64px 32px", textAlign: "center" },
          children: [
            { id: "edu-f-copy", type: "text", content: "© 2026 Elevate Academy of Technology. Empowering next-generation engineers. Powered by ForgeStudio.", styles: { fontSize: "12px" } },
          ],
        },
      ],
    },
  },
  popups: [],
  pages: [
    { id: "page-edu-home", name: "Academy Home", slug: "/", isHome: true, elements: [] },
    { id: "page-edu-courses", name: "Course Catalog", slug: "/courses", isHome: false, elements: [] },
    { id: "page-edu-detail", name: "Full-Stack Bootcamp Curriculum", slug: "/course-detail", isHome: false, elements: [] },
    { id: "page-edu-mentors", name: "Industry Mentors", slug: "/mentors", isHome: false, elements: [] },
    { id: "page-edu-stories", name: "Alumni Outcomes", slug: "/stories", isHome: false, elements: [] },
    { id: "page-edu-tuition", name: "Tuition & Financing", slug: "/tuition", isHome: false, elements: [] },
    { id: "page-edu-contact", name: "Admissions & Advising", slug: "/contact", isHome: false, elements: [] },
    { id: "page-edu-404", name: "404 Not Found", slug: "/404", isHome: false, elements: [] },
  ],
};
