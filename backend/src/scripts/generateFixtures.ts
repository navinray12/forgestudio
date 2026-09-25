import fs from "fs";
import path from "path";
import { generateAllCodeOutputs } from "../services/codeGenerator.service.js";

const FIXTURES_DIR = path.resolve(__dirname, "../../../fixtures/export");

const fixtureDefinitions: Record<string, any> = {
  simple: {
    siteSettings: { siteName: "Simple Fixture" },
    pages: [
      {
        name: "Home",
        slug: "index",
        elements: [
          { id: "s1", type: "container", tag: "div", children: [{ id: "t1", type: "text", textContent: "Hello World Simple Fixture" }] }
        ]
      }
    ]
  },
  button: {
    siteSettings: { siteName: "Button Fixture" },
    pages: [
      {
        name: "Home",
        slug: "index",
        elements: [
          { id: "b1", type: "button", tag: "button", textContent: "Click Me", props: { variant: "primary" }, classes: ["btn", "btn-primary"] }
        ]
      }
    ]
  },
  hero: {
    siteSettings: { siteName: "Hero Fixture" },
    pages: [
      {
        name: "Home",
        slug: "index",
        elements: [
          {
            id: "h1",
            type: "hero",
            tag: "section",
            classes: ["hero-banner"],
            props: { title: "Welcome to ForgeStudio", subtitle: "Build anything visually" },
            children: [
              { id: "h1_t", type: "heading", tag: "h1", textContent: "Welcome to ForgeStudio" },
              { id: "h1_p", type: "text", tag: "p", textContent: "Build anything visually with zero bloat." },
              { id: "h1_b", type: "button", tag: "button", textContent: "Get Started" }
            ]
          }
        ]
      }
    ]
  },
  navbar: {
    siteSettings: { siteName: "Navbar Fixture" },
    pages: [
      {
        name: "Home",
        slug: "index",
        elements: [
          {
            id: "nav1",
            type: "navbar",
            tag: "nav",
            classes: ["main-nav"],
            children: [
              { id: "brand", type: "text", textContent: "BrandLogo" },
              { id: "link1", type: "text", textContent: "Home" },
              { id: "link2", type: "text", textContent: "About" },
              { id: "link3", type: "text", textContent: "Contact" }
            ]
          }
        ]
      }
    ]
  },
  modal: {
    siteSettings: { siteName: "Modal Fixture" },
    pages: [
      {
        name: "Home",
        slug: "index",
        elements: [
          { id: "m_btn", type: "button", tag: "button", textContent: "Open Modal", interaction: { type: "modal", targetId: "m_dlg" } },
          { id: "m_dlg", type: "alert", tag: "div", classes: ["modal-dialog"], textContent: "This is a modal dialog container" }
        ]
      }
    ]
  },
  accordion: {
    siteSettings: { siteName: "Accordion Fixture" },
    pages: [
      {
        name: "Home",
        slug: "index",
        elements: [
          {
            id: "acc1",
            type: "nested-accordion",
            tag: "div",
            classes: ["accordion-group"],
            children: [
              { id: "acc_h1", type: "heading", tag: "h3", textContent: "Accordion Item 1" },
              { id: "acc_c1", type: "text", tag: "p", textContent: "Accordion Content 1" }
            ]
          }
        ]
      }
    ]
  },
  tabs: {
    siteSettings: { siteName: "Tabs Fixture" },
    pages: [
      {
        name: "Home",
        slug: "index",
        elements: [
          {
            id: "tabs1",
            type: "nested-tabs",
            tag: "div",
            classes: ["tabs-container"],
            children: [
              { id: "t_head1", type: "button", textContent: "Tab 1" },
              { id: "t_head2", type: "button", textContent: "Tab 2" },
              { id: "t_panel1", type: "container", textContent: "Tab 1 Content" }
            ]
          }
        ]
      }
    ]
  },
  carousel: {
    siteSettings: { siteName: "Carousel Fixture" },
    pages: [
      {
        name: "Home",
        slug: "index",
        elements: [
          {
            id: "car1",
            type: "media-carousel",
            tag: "section",
            classes: ["carousel-slider"],
            children: [
              { id: "slide1", type: "image", tag: "img", attributes: { src: "https://images.unsplash.com/photo-slide1.jpg", alt: "Slide 1" } },
              { id: "slide2", type: "image", tag: "img", attributes: { src: "https://images.unsplash.com/photo-slide2.jpg", alt: "Slide 2" } }
            ]
          }
        ]
      }
    ]
  },
  form: {
    siteSettings: { siteName: "Form Fixture" },
    pages: [
      {
        name: "Home",
        slug: "index",
        elements: [
          {
            id: "f1",
            type: "form",
            tag: "form",
            classes: ["contact-form"],
            children: [
              { id: "input_email", type: "text", tag: "input", attributes: { type: "email", placeholder: "Your Email" } },
              { id: "submit_btn", type: "button", tag: "button", attributes: { type: "submit" }, textContent: "Send Message" }
            ]
          }
        ]
      }
    ]
  },
  nested: {
    siteSettings: { siteName: "Nested Component Fixture" },
    pages: [
      {
        name: "Home",
        slug: "index",
        elements: [
          {
            id: "parent",
            type: "container",
            tag: "div",
            classes: ["outer-container"],
            children: [
              {
                id: "child1",
                type: "card",
                tag: "article",
                classes: ["card-item"],
                children: [
                  { id: "child1_title", type: "heading", tag: "h3", textContent: "Card Title" },
                  { id: "child1_text", type: "text", tag: "p", textContent: "Nested text content." }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  responsive: {
    siteSettings: { siteName: "Responsive Fixture" },
    pages: [
      {
        name: "Home",
        slug: "index",
        elements: [
          {
            id: "resp1",
            type: "container",
            tag: "div",
            classes: ["grid", "grid-cols-1", "md:grid-cols-3"],
            responsiveStyles: {
              desktop: { display: "flex", flexDirection: "row" },
              tablet: { display: "flex", flexDirection: "column" },
              mobile: { display: "block" }
            },
            children: [{ id: "c1", type: "text", textContent: "Responsive Grid Column" }]
          }
        ]
      }
    ]
  },
  animation: {
    siteSettings: { siteName: "Animation Fixture" },
    pages: [
      {
        name: "Home",
        slug: "index",
        elements: [
          {
            id: "anim1",
            type: "animated-headline",
            tag: "h2",
            animations: { animationType: "fadeInUp", duration: 0.8 },
            textContent: "Fading Animated Headline"
          }
        ]
      }
    ]
  },
  dynamic: {
    siteSettings: { siteName: "Dynamic Data Fixture" },
    pages: [
      {
        name: "Home",
        slug: "index",
        elements: [
          {
            id: "dyn1",
            type: "posts",
            tag: "section",
            dynamicData: { source: "cpt", field: "post_title", fallback: "Recent Blog Posts" },
            textContent: "Recent Blog Posts"
          }
        ]
      }
    ]
  },
  "custom-code": {
    siteSettings: { siteName: "Custom Code Fixture" },
    customCss: ".custom-widget { color: #3b82f6; }",
    customJs: "console.log('Custom user code initialized');",
    pages: [
      {
        name: "Home",
        slug: "index",
        elements: [
          { id: "cc1", type: "html", tag: "div", classes: ["custom-widget"], textContent: "Custom HTML Block" }
        ]
      }
    ]
  }
};

export function generateFixtures() {
  console.log("Generating permanent fixtures in fixtures/export/...");
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  }

  for (const [name, def] of Object.entries(fixtureDefinitions)) {
    const dir = path.join(FIXTURES_DIR, name);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const code = generateAllCodeOutputs(def, { scope: "full" });

    fs.writeFileSync(path.join(dir, "index.html"), code.html, "utf8");

    const cssDir = path.join(dir, "css");
    if (!fs.existsSync(cssDir)) fs.mkdirSync(cssDir, { recursive: true });
    fs.writeFileSync(path.join(cssDir, "styles.css"), code.css, "utf8");

    const jsDir = path.join(dir, "js");
    if (!fs.existsSync(jsDir)) fs.mkdirSync(jsDir, { recursive: true });
    fs.writeFileSync(path.join(jsDir, "app.js"), code.js, "utf8");

    fs.writeFileSync(path.join(dir, "App.tsx"), code.reactCode?.appTsx || "", "utf8");
    fs.writeFileSync(path.join(dir, "README.md"), `# ${name.toUpperCase()} Export Fixture\n\nGenerated buildable fixture for ForgeStudio validation.\n`, "utf8");

    console.log(`✓ Fixture [${name}] created at ${dir}`);
  }
}

if (require.main === module) {
  generateFixtures();
}
