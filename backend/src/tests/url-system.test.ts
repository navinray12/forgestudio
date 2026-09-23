import { compileCanonicalToStaticBundle } from "../services/destinations/staticCompiler.js";
import { transformPageToWordPress } from "../services/wordpress/transformer.service.js";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    throw new Error(message);
  }
  console.log(`[PASS] ${message}`);
}

async function runUrlSystemSuite() {
  console.log("=================================================");
  console.log("RUNNING FORGESTUDIO URL / LINK SYSTEM TEST SUITE");
  console.log("=================================================");

  const allPages = [
    {
      id: "home-page-id",
      name: "Home",
      title: "Home",
      slug: "/",
      isHome: true,
      elements: [],
    },
    {
      id: "about-page-id",
      name: "About Us",
      title: "About",
      slug: "/about",
      isHome: false,
      elements: [],
    },
    {
      id: "contact-page-id",
      name: "Contact",
      title: "Contact",
      slug: "contact",
      isHome: false,
      elements: [],
    },
  ];

  // -------------------------------------------------------------
  // Test 1: Static Compiler - Button with page:id resolves to slug.html
  // -------------------------------------------------------------
  const websiteWithLegacyButton = {
    name: "Test Site",
    pages: [
      {
        ...allPages[0],
        elements: [
          { id: "btn-legacy", type: "button", text: "Go to About", link: "page:about-page-id" },
        ],
      },
      allPages[1],
      allPages[2],
    ],
  };
  const bundle1 = compileCanonicalToStaticBundle("site-1", 1, websiteWithLegacyButton);
  const index1 = bundle1.files.find((f) => f.path === "index.html");
  assert(
    index1 !== undefined && index1.content.includes('href="about.html"'),
    "Test 1: Static compiler resolves button with page:id to about.html"
  );

  // -------------------------------------------------------------
  // Test 2: Static Compiler - Button with Custom URL /about resolves to about.html
  // -------------------------------------------------------------
  const websiteWithCustomUrlButton = {
    name: "Test Site",
    pages: [
      {
        ...allPages[0],
        elements: [
          { id: "btn-custom", type: "button", text: "About Custom", href: "/about" },
        ],
      },
      allPages[1],
      allPages[2],
    ],
  };
  const bundle2 = compileCanonicalToStaticBundle("site-2", 1, websiteWithCustomUrlButton);
  const index2 = bundle2.files.find((f) => f.path === "index.html");
  assert(
    index2 !== undefined && index2.content.includes('href="about.html"'),
    "Test 2: Static compiler resolves button with Custom URL /about to about.html"
  );

  // -------------------------------------------------------------
  // Test 3: Static Compiler - Nav Menu with Custom URL /about and submenus
  // -------------------------------------------------------------
  const websiteWithNavMenu = {
    name: "Test Site",
    pages: [
      {
        ...allPages[0],
        elements: [
          {
            id: "nav-1",
            type: "nav-menu",
            navMenuItems: [
              { id: "n1", label: "Home", url: "/" },
              { id: "n2", label: "About", url: "/about" },
              { id: "n3", label: "Contact", url: "page:contact-page-id" },
              { id: "n4", label: "Section", url: "#pricing" },
              { id: "n5", label: "External", url: "https://google.com" },
              {
                id: "n6",
                label: "More",
                url: "#",
                submenu: [
                  { id: "s1", label: "About Sub", url: "/about" },
                ],
              },
            ],
          },
        ],
      },
      allPages[1],
      allPages[2],
    ],
  };
  const bundle3 = compileCanonicalToStaticBundle("site-3", 1, websiteWithNavMenu);
  const index3 = bundle3.files.find((f) => f.path === "index.html");
  const content3 = index3?.content || "";
  assert(
    content3.includes('<nav class="nav-menu"') &&
    content3.includes('href="index.html">Home</a>') &&
    content3.includes('href="about.html">About</a>') &&
    content3.includes('href="contact.html">Contact</a>') &&
    content3.includes('href="#pricing">Section</a>') &&
    content3.includes('href="https://google.com">External</a>') &&
    content3.includes('href="about.html">About Sub</a>'),
    "Test 3: Static compiler compiles nav-menu widget with internal, anchor, external, and submenu URLs"
  );

  // -------------------------------------------------------------
  // Test 4: Static Compiler - Image element with href is wrapped in <a>
  // -------------------------------------------------------------
  const websiteWithImageLink = {
    name: "Test Site",
    pages: [
      {
        ...allPages[0],
        elements: [
          { id: "img-link", type: "image", src: "/photo.jpg", alt: "Photo", href: "/about" },
          { id: "img-nolink", type: "image", src: "/banner.jpg", alt: "Banner" },
        ],
      },
      allPages[1],
      allPages[2],
    ],
  };
  const bundle4 = compileCanonicalToStaticBundle("site-4", 1, websiteWithImageLink);
  const index4 = bundle4.files.find((f) => f.path === "index.html")?.content || "";
  assert(
    index4.includes('<a href="about.html"><img src="/photo.jpg" alt="Photo"') &&
    !index4.includes('<a href=""><img src="/banner.jpg"'),
    "Test 4: Static compiler wraps linked images in <a> tag and leaves unlinked images clean"
  );

  // -------------------------------------------------------------
  // Test 5: Static Compiler - Security sanitization of unsafe protocols
  // -------------------------------------------------------------
  const websiteWithUnsafeLinks = {
    name: "Test Site",
    pages: [
      {
        ...allPages[0],
        elements: [
          { id: "btn-xss1", type: "button", text: "XSS 1", href: "javascript:alert(1)" },
          { id: "btn-xss2", type: "button", text: "XSS 2", link: "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==" },
        ],
      },
    ],
  };
  const bundle5 = compileCanonicalToStaticBundle("site-5", 1, websiteWithUnsafeLinks);
  const index5 = bundle5.files.find((f) => f.path === "index.html")?.content || "";
  assert(
    !index5.includes("javascript:") &&
    !index5.includes("data:text/html") &&
    index5.includes('href="#"'),
    "Test 5: Static compiler strictly blocks javascript: and data: URLs"
  );

  // -------------------------------------------------------------
  // Test 6: WordPress Transformer - Buttons with href, linkUrl, and pageId
  // -------------------------------------------------------------
  const wpElements = [
    { id: "wp-b1", type: "button", text: "Custom URL", href: "/about" },
    { id: "wp-b2", type: "button", text: "Page ID", pageId: "contact-page-id" },
    { id: "wp-b3", type: "button", text: "Legacy Page", link: "page:pricing" },
  ];
  const wpResult = transformPageToWordPress({ id: "p1", elements: wpElements });
  assert(
    wpResult.content.includes('href="/about"') &&
    wpResult.content.includes('href="/contact-page-id/"') &&
    wpResult.content.includes('href="/pricing/"'),
    "Test 6: WordPress transformer correctly resolves button URLs across href, pageId, and page: syntax"
  );

  // -------------------------------------------------------------
  // Test 7: Static Compiler - Query and hash parameters preserved
  // -------------------------------------------------------------
  const websiteWithParams = {
    name: "Test Site",
    pages: [
      {
        ...allPages[0],
        elements: [
          { id: "btn-hash", type: "button", text: "Section", href: "/about#team" },
          { id: "btn-query", type: "button", text: "Search", href: "/contact?ref=banner" },
        ],
      },
      allPages[1],
      allPages[2],
    ],
  };
  const bundle7 = compileCanonicalToStaticBundle("site-7", 1, websiteWithParams);
  const index7 = bundle7.files.find((f) => f.path === "index.html")?.content || "";
  assert(
    index7.includes('href="about.html#team"') &&
    index7.includes('href="contact.html?ref=banner"'),
    "Test 7: Static compiler preserves query parameters and hash anchors when mapping internal pages"
  );

  console.log("=================================================");
  console.log("TOTAL TESTS: 7");
  console.log("PASSED: 7");
  console.log("FAILED: 0");
  console.log("=================================================");
}

runUrlSystemSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
