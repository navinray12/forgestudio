import type { EditorElement, PostItem, PricingPlan, PriceListItem, SlideItem, GalleryImageItem, TestimonialItem, ReviewItem, NavMenuItem, PortfolioItem, FormFieldItem, MediaCarouselItem } from "../types";
function getMergedStyles(el: EditorElement, _device?: string, _state?: string): Record<string, any> {
  return el.styles || {};
}

function getMergedLayout(el: EditorElement, _device?: string): Record<string, any> {
  return el.layout || {};
}

/**
 * Convert string to PascalCase for component and function names
 */
export function toPascalCase(str?: string): string {
  if (!str) return "Component";
  // Special friendly names for common editor types
  const friendlyMap: Record<string, string> = {
    posts: "BlogPosts",
    portfolio: "PortfolioGrid",
    "animated-headline": "AnimatedHeadline",
    "price-table": "PricingTable",
    "price-list": "PriceList",
    "call-to-action": "CallToAction",
    "flip-box": "FlipBox",
    "nav-menu": "NavMenu",
    "mega-menu": "MegaMenu",
    "code-highlight": "CodeHighlight",
    "countdown": "CountdownTimer",
    "testimonial-carousel": "TestimonialsSlider",
    "basic-gallery": "ImageGallery",
    gallery: "PhotoGallery",
    "media-carousel": "MediaCarousel",
    slides: "HeroSlides",
    "share-buttons": "ShareButtons",
    "social-icons": "SocialIcons",
    "progress-bar": "ProgressBar",
    rating: "RatingStars",
    alert: "AlertBanner",
    counter: "AnimatedCounter",
    blockquote: "QuoteBlock",
    "video-playlist": "VideoPlaylist",
    "audio-playlist": "AudioPlaylist",
    "table-of-contents": "TableOfContents",
    "paypal-button": "PayPalCheckout",
    "stripe-button": "StripeCheckout",
    container: "SectionContainer",
    button: "ActionButton",
    heading: "SectionHeading",
    text: "TextBlock",
    paragraph: "ParagraphBlock",
    image: "ResponsiveImage",
    video: "VideoPlayer",
    divider: "ContentDivider",
    spacer: "LayoutSpacer",
  };

  if (friendlyMap[str.toLowerCase()]) {
    return friendlyMap[str.toLowerCase()];
  }

  return str
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

/**
 * Format CSS styles object into standard inline CSS string
 */
export function formatStylesToCSS(styles: Record<string, any> = {}): string {
  if (!styles || Object.keys(styles).length === 0) return "";
  return Object.entries(styles)
    .filter(([_, val]) => val !== undefined && val !== null && val !== "")
    .map(([key, val]) => {
      const kebabKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
      return `${kebabKey}: ${val};`;
    })
    .join(" ");
}

/**
 * Format CSS styles object into JSX style object
 */
export function formatStylesToJSX(styles: Record<string, any> = {}): string {
  if (!styles || Object.keys(styles).length === 0) return "{}";
  const cleanStyles: Record<string, any> = {};
  for (const [k, v] of Object.entries(styles)) {
    if (v !== undefined && v !== null && v !== "") {
      cleanStyles[k] = v;
    }
  }
  return JSON.stringify(cleanStyles, null, 2);
}

/**
 * Context passed down the recursive export pipeline
 */
export interface ExportContext {
  isTsx: boolean;
  indent: string;
}

// =========================================================================
// RECURSIVE NODE EXPORTER ENGINE
// =========================================================================

/**
 * Recursively export an element node into pure JSX markup
 */
export function exportElementNodeToJSX(el: EditorElement, ctx: ExportContext): string {
  const { indent } = ctx;
  const nextIndent = indent + "  ";
  const stylesObj = getMergedStyles(el, "desktop", "normal");
  const layout = el.type === "container" ? getMergedLayout(el, "desktop") : undefined;

  switch (el.type) {
    // -------------------------------------------------------------------
    // CONTAINER (Recursive traversal of arbitrary children)
    // -------------------------------------------------------------------
    case "container": {
      const containerStyles: Record<string, any> = {
        display: "flex",
        flexDirection: layout?.direction || "column",
        justifyContent: layout?.justifyContent || "flex-start",
        alignItems: layout?.alignItems || "stretch",
        gap: `${layout?.gap ?? 16}px`,
        boxSizing: "border-box",
        width: stylesObj.width || "100%",
        padding: stylesObj.padding || "24px",
        marginTop: stylesObj.marginTop || "0px",
        marginBottom: stylesObj.marginBottom || "0px",
        backgroundColor: stylesObj.backgroundColor,
        borderRadius: stylesObj.borderRadius || "12px",
        border: stylesObj.borderStyle && stylesObj.borderColor ? `${stylesObj.borderWidth || "1px"} ${stylesObj.borderStyle} ${stylesObj.borderColor}` : undefined,
      };

      const childrenJSX = (el.children || [])
        .map((child) => exportElementNodeToJSX(child, { ...ctx, indent: nextIndent }))
        .join("\n");

      return `${indent}<div\n${nextIndent}style={${formatStylesToJSX(containerStyles)}}\n${nextIndent}className="${(el.classes || []).join(" ")}"\n${indent}>\n${childrenJSX || `${nextIndent}{/* Empty Container */}`}\n${indent}</div>`;
    }

    // -------------------------------------------------------------------
    // HEADING
    // -------------------------------------------------------------------
    case "heading": {
      const Tag = (el.headingLevel || "h2") as string;
      const headingStyles: Record<string, any> = {
        fontSize: stylesObj.fontSize || (el.headingLevel === "h1" ? "36px" : el.headingLevel === "h3" ? "24px" : "30px"),
        fontWeight: stylesObj.fontWeight || "800",
        color: stylesObj.color || "#0f172a",
        textAlign: stylesObj.textAlign || "left",
        lineHeight: 1.25,
        margin: "0 0 12px 0",
        fontFamily: stylesObj.fontFamily || "system-ui, -apple-system, sans-serif",
      };
      return `${indent}<${Tag} style={${formatStylesToJSX(headingStyles)}}>${el.content || "Heading Title"}</${Tag}>`;
    }

    // -------------------------------------------------------------------
    // TEXT / PARAGRAPH
    // -------------------------------------------------------------------
    case "text":
    case "paragraph": {
      const textStyles: Record<string, any> = {
        fontSize: stylesObj.fontSize || "16px",
        color: stylesObj.color || "#475569",
        textAlign: stylesObj.textAlign || "left",
        lineHeight: 1.6,
        margin: "0 0 16px 0",
        fontFamily: stylesObj.fontFamily || "system-ui, -apple-system, sans-serif",
      };
      return `${indent}<p style={${formatStylesToJSX(textStyles)}}>${el.content || ""}</p>`;
    }

    // -------------------------------------------------------------------
    // BUTTON
    // -------------------------------------------------------------------
    case "button": {
      const buttonStyles: Record<string, any> = {
        display: "inline-block",
        padding: stylesObj.padding || "12px 24px",
        backgroundColor: stylesObj.backgroundColor || "#2563eb",
        color: stylesObj.color || "#ffffff",
        fontSize: stylesObj.fontSize || "15px",
        fontWeight: stylesObj.fontWeight || "600",
        borderRadius: stylesObj.borderRadius || "8px",
        textDecoration: "none",
        border: "none",
        cursor: "pointer",
        textAlign: "center",
      };
      return `${indent}<a href="${el.href || "#"}" style={${formatStylesToJSX(buttonStyles)}}>${el.content || "Click Here"}</a>`;
    }

    // -------------------------------------------------------------------
    // IMAGE
    // -------------------------------------------------------------------
    case "image": {
      const imageStyles: Record<string, any> = {
        width: stylesObj.width || "100%",
        maxWidth: "100%",
        height: stylesObj.height || "auto",
        borderRadius: stylesObj.borderRadius || "8px",
        objectFit: stylesObj.objectFit || "cover",
        display: "block",
      };
      return `${indent}<img src="${el.src || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80"}" alt="${el.alt || "Image"}" style={${formatStylesToJSX(imageStyles)}} />`;
    }

    // -------------------------------------------------------------------
    // VIDEO
    // -------------------------------------------------------------------
    case "video": {
      const videoSrc = el.src || "";
      if (videoSrc.includes("youtube.com") || videoSrc.includes("youtu.be")) {
        return `${indent}<div style={{ position: "relative", width: "100%", aspectRatio: "16/9", borderRadius: "12px", overflow: "hidden" }}>\n${nextIndent}<iframe src="${videoSrc}" title="Video" allowFullScreen style={{ position: "absolute", width: "100%", height: "100%", border: 0 }} />\n${indent}</div>`;
      }
      return `${indent}<video src="${videoSrc}" poster="${el.videoPoster || ""}" controls autoPlay={${Boolean(el.videoAutoplay)}} loop={${Boolean(el.videoLoop)}} muted={${Boolean(el.videoMuted)}} style={{ width: "100%", borderRadius: "12px" }}>Video not supported</video>`;
    }

    // -------------------------------------------------------------------
    // DIVIDER & SPACER
    // -------------------------------------------------------------------
    case "divider":
      return `${indent}<hr style={{ width: "100%", border: 0, borderTop: "1px solid #e2e8f0", margin: "24px 0" }} />`;
    case "spacer":
      return `${indent}<div style={{ height: "${stylesObj.height || "32px"}", width: "100%" }} />`;

    // -------------------------------------------------------------------
    // RATING
    // -------------------------------------------------------------------
    case "rating":
      return `${indent}<div style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#f59e0b", fontSize: "18px" }}><span>★★★★★</span><span style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>5.0</span></div>`;

    // -------------------------------------------------------------------
    // PROGRESS BAR
    // -------------------------------------------------------------------
    case "progress-bar":
      return `${indent}<div style={{ width: "100%", margin: "16px 0" }}>\n${nextIndent}<div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: "600", marginBottom: "6px" }}><span>Progress</span><span>75%</span></div>\n${nextIndent}<div style={{ width: "100%", height: "10px", backgroundColor: "#e2e8f0", borderRadius: "999px", overflow: "hidden" }}><div style={{ width: "75%", height: "100%", backgroundColor: "#2563eb", borderRadius: "999px" }} /></div>\n${indent}</div>`;

    // -------------------------------------------------------------------
    // SOCIAL ICONS & SHARE BUTTONS
    // -------------------------------------------------------------------
    case "social-icons":
    case "share-buttons":
      return `${indent}<div style={{ display: "flex", gap: "10px", flexWrap: "wrap", margin: "16px 0" }}>\n${nextIndent}<a href="#" style={{ padding: "8px 16px", borderRadius: "8px", backgroundColor: "#1da1f2", color: "#fff", textDecoration: "none", fontSize: "13px", fontWeight: "600" }}>Twitter</a>\n${nextIndent}<a href="#" style={{ padding: "8px 16px", borderRadius: "8px", backgroundColor: "#1877f2", color: "#fff", textDecoration: "none", fontSize: "13px", fontWeight: "600" }}>Facebook</a>\n${nextIndent}<a href="#" style={{ padding: "8px 16px", borderRadius: "8px", backgroundColor: "#0077b5", color: "#fff", textDecoration: "none", fontSize: "13px", fontWeight: "600" }}>LinkedIn</a>\n${indent}</div>`;

    // -------------------------------------------------------------------
    // BLOG POSTS (Data-Driven Cards Rendering from el.posts)
    // -------------------------------------------------------------------
    case "posts": {
      const postsList = el.posts && el.posts.length > 0 ? el.posts : [
        {
          id: "post_1",
          title: "Getting Started with Modern Web Design",
          excerpt: "Discover essential techniques and best practices to craft beautiful, responsive web applications effortlessly.",
          date: "Sep 1, 2026",
          author: "Jane Doe",
          image: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&auto=format&fit=crop&q=80",
          readMoreText: "Read Article →",
          readMoreUrl: "#",
        },
        {
          id: "post_2",
          title: "Mastering Design Systems & Components",
          excerpt: "Learn how to build reusable design tokens and layout grids that scale across team workflows.",
          date: "Aug 28, 2026",
          author: "Alex Smith",
          image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80",
          readMoreText: "Read Article →",
          readMoreUrl: "#",
        },
        {
          id: "post_3",
          title: "Optimizing Web Performance & SEO",
          excerpt: "Boost site load speed and search engine rankings with modern code-splitting and asset management.",
          date: "Aug 24, 2026",
          author: "Chris Lee",
          image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80",
          readMoreText: "Read Article →",
          readMoreUrl: "#",
        },
      ];

      const columns = el.postsColumns || 3;
      const gap = el.postsGap ?? 20;
      const imageHeight = el.postsImageHeight || "180px";
      const align = el.postsAlignment || "left";
      const showImage = el.postsShowImage !== false;
      const showDate = el.postsShowDate !== false;
      const showExcerpt = el.postsShowExcerpt !== false;
      const showReadMore = el.postsShowReadMore !== false;

      const cardsJSX = postsList.map((post) => `
${nextIndent}<article style={{ display: "flex", flexDirection: "column", borderRadius: "16px", border: "1px solid #e2e8f0", backgroundColor: "#ffffff", overflow: "hidden", boxShadow: "0 4px 10px rgba(0,0,0,0.05)", textAlign: "${align}" }}>
${showImage && post.image ? `${nextIndent}  <div style={{ height: "${imageHeight}", overflow: "hidden", backgroundColor: "#f1f5f9" }}><img src="${post.image}" alt="${post.title}" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>` : ""}
${nextIndent}  <div style={{ padding: "20px", display: "flex", flexDirection: "column", flex: 1 }}>
${showDate && (post.date || post.author) ? `${nextIndent}    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px" }}>${post.date || ""}${post.date && post.author ? " • " : ""}${post.author ? `By ${post.author}` : ""}</div>` : ""}
${nextIndent}    <h3 style={{ margin: "0 0 10px 0", fontSize: "18px", fontWeight: "700", color: "#0f172a", lineHeight: 1.3 }}>${post.title}</h3>
${showExcerpt && post.excerpt ? `${nextIndent}    <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "#475569", lineHeight: 1.5, flex: 1 }}>${post.excerpt}</p>` : ""}
${showReadMore ? `${nextIndent}    <div style={{ marginTop: "auto" }}><a href="${post.readMoreUrl || "#"}" style={{ display: "inline-flex", alignItems: "center", fontSize: "13px", fontWeight: "700", color: "#2563eb", textDecoration: "none" }}>${post.readMoreText || "Read More →"}</a></div>` : ""}
${nextIndent}  </div>
${nextIndent}</article>`).join("");

      return `${indent}<div style={{ width: "100%", padding: "24px 0", boxSizing: "border-box" }}>\n${nextIndent}<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "${gap}px" }}>${cardsJSX}\n${nextIndent}</div>\n${indent}</div>`;
    }

    // -------------------------------------------------------------------
    // PORTFOLIO (Data-Driven Cards Rendering from el.portfolioItems)
    // -------------------------------------------------------------------
    case "portfolio": {
      const items = el.portfolioItems && el.portfolioItems.length > 0 ? el.portfolioItems : [
        { id: "1", title: "Brand Identity System", category: "Branding", image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&auto=format&fit=crop&q=80", description: "Complete brand guidelines and digital design assets." },
        { id: "2", title: "Mobile SaaS Application", category: "UI/UX Design", image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80", description: "Modern analytics dashboard built for high-throughput teams." },
        { id: "3", title: "E-Commerce Experience", category: "Development", image: "https://images.unsplash.com/photo-1523726491678-bf852e717f6a?w=800&auto=format&fit=crop&q=80", description: "Fast headless commerce storefront with real-time inventory." },
      ];

      const gap = el.portfolioGap ?? 24;
      const imageHeight = el.portfolioImageHeight || "220px";

      const itemsJSX = items.map((item) => `
${nextIndent}<div style={{ borderRadius: "16px", border: "1px solid #e2e8f0", backgroundColor: "#ffffff", overflow: "hidden", boxShadow: "0 4px 10px rgba(0,0,0,0.05)" }}>
${nextIndent}  <div style={{ height: "${imageHeight}", overflow: "hidden" }}><img src="${item.image || ""}" alt="${item.title}" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
${nextIndent}  <div style={{ padding: "20px" }}>
${nextIndent}    ${item.category ? `<span style={{ fontSize: "11px", fontWeight: "700", color: "#6366f1", textTransform: "uppercase" }}>${item.category}</span>` : ""}
${nextIndent}    <h4 style={{ margin: "6px 0 8px", fontSize: "17px", fontWeight: "700", color: "#0f172a" }}>${item.title}</h4>
${nextIndent}    ${item.description ? `<p style={{ margin: "0 0 16px", fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>${item.description}</p>` : ""}
${nextIndent}    <a href="${item.link || item.url || "#"}" style={{ fontSize: "13px", fontWeight: "700", color: "#2563eb", textDecoration: "none" }}>View Project →</a>
${nextIndent}  </div>
${nextIndent}</div>`).join("");

      return `${indent}<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "${gap}px", width: "100%", padding: "24px 0" }}>${itemsJSX}\n${indent}</div>`;
    }

    // -------------------------------------------------------------------
    // SLIDES / SLIDESHOW
    // -------------------------------------------------------------------
    case "slides": {
      const slidesList = el.slidesItems && el.slidesItems.length > 0 ? el.slidesItems : [
        { id: "slide_1", title: "Empower Your Digital Growth", description: "Build high-converting modern websites with intuitive drag and drop tools.", bgImage: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1600&auto=format&fit=crop&q=80", buttonText: "Explore Features", buttonUrl: "#" },
        { id: "slide_2", title: "Designed for High Performance", description: "Lightning-fast page load speeds, automatic SEO optimization, and flawless mobile experience.", bgImage: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1600&auto=format&fit=crop&q=80", buttonText: "Start Free Trial", buttonUrl: "#" },
      ];
      const height = el.slidesHeight || "450px";
      const align = el.slidesAlignment || "center";
      const currentSlide = slidesList[0];
      return `${indent}<div style={{ position: "relative", width: "100%", height: "${height}", overflow: "hidden", borderRadius: "16px", backgroundColor: "${currentSlide.bgColor || "#0f172a"}", backgroundImage: ${currentSlide.bgImage ? `\`url(${currentSlide.bgImage})\`` : "undefined"}, backgroundSize: "cover", backgroundPosition: "center", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "${align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start"}", textAlign: "${align}", padding: "48px", boxSizing: "border-box" }}>
${nextIndent}<div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.35))", zIndex: 1 }} />
${nextIndent}<div style={{ position: "relative", zIndex: 2, maxWidth: "700px" }}>
${nextIndent}  <h2 style={{ fontSize: "36px", fontWeight: "800", color: "#ffffff", margin: "0 0 16px 0", lineHeight: 1.2 }}>${currentSlide.title}</h2>
${currentSlide.description ? `${nextIndent}  <p style={{ fontSize: "16px", color: "#e2e8f0", margin: "0 0 24px 0", lineHeight: 1.6 }}>${currentSlide.description}</p>\n` : ""}${currentSlide.buttonText ? `${nextIndent}  <a href="${currentSlide.buttonUrl || "#"}" style={{ display: "inline-block", padding: "12px 28px", backgroundColor: "#ffffff", color: "#0f172a", fontWeight: "700", fontSize: "14px", borderRadius: "10px", textDecoration: "none" }}>${currentSlide.buttonText}</a>\n` : ""}${nextIndent}</div>
${indent}</div>`;
    }

    // -------------------------------------------------------------------
    // GALLERY
    // -------------------------------------------------------------------
    case "gallery":
    case "basic-gallery": {
      const images = el.galleryImages && el.galleryImages.length > 0 ? el.galleryImages : [
        { id: "g1", url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80", caption: "Abstract Gradient" },
        { id: "g2", url: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80", caption: "Digital Innovation" },
        { id: "g3", url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80", caption: "Creative Team" },
      ];
      const cols = el.galleryColumns || 3;
      const gap = el.galleryGap ?? 16;
      const itemsJSX = images.map((img) => `
${nextIndent}<div style={{ borderRadius: "12px", overflow: "hidden", position: "relative", aspectRatio: "4/3", backgroundColor: "#f1f5f9" }}>
${nextIndent}  <img src="${img.url}" alt="${img.caption || img.altText || "Gallery Image"}" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
${img.caption ? `${nextIndent}  <div style={{ position: "absolute", bottom: 0, insetInline: 0, padding: "8px 12px", background: "rgba(0,0,0,0.6)", color: "#ffffff", fontSize: "12px" }}>${img.caption}</div>` : ""}
${nextIndent}</div>`).join("");
      return `${indent}<div style={{ display: "grid", gridTemplateColumns: "repeat(${cols}, minmax(0, 1fr))", gap: "${gap}px", width: "100%", padding: "16px 0" }}>${itemsJSX}\n${indent}</div>`;
    }

    // -------------------------------------------------------------------
    // TESTIMONIAL CAROUSEL
    // -------------------------------------------------------------------
    case "testimonial-carousel": {
      const testimonials = el.testimonialItems && el.testimonialItems.length > 0 ? el.testimonialItems : [
        { id: "t1", name: "Sarah Connor", role: "VP of Engineering", quote: "ForgeStudio allowed our team to accelerate production releases tenfold.", rating: 5 },
        { id: "t2", name: "David Miller", role: "Product Lead", quote: "The bidirectional code and visual canvas sync is a complete game changer.", rating: 5 },
      ];
      const gap = el.testimonialGap ?? 20;
      const itemsJSX = testimonials.map((item) => `
${nextIndent}<div style={{ padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0", backgroundColor: "#ffffff", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column" }}>
${nextIndent}  <div style={{ color: "#f59e0b", marginBottom: "12px" }}>${"★".repeat(item.rating || 5)}</div>
${nextIndent}  <p style={{ fontSize: "15px", color: "#334155", fontStyle: "italic", lineHeight: 1.6, flex: 1, margin: "0 0 16px 0" }}>"${item.quote}"</p>
${nextIndent}  <div>
${nextIndent}    <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "14px" }}>${item.name}</div>
${nextIndent}    <div style={{ fontSize: "12px", color: "#64748b" }}>${item.role}</div>
${nextIndent}  </div>
${nextIndent}</div>`).join("");
      return `${indent}<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "${gap}px", width: "100%", padding: "16px 0" }}>${itemsJSX}\n${indent}</div>`;
    }

    // -------------------------------------------------------------------
    // MEDIA CAROUSEL
    // -------------------------------------------------------------------
    case "media-carousel":
    case "image-carousel":
    case "basic-media-carousel": {
      const items = (el.mediaCarouselItems && el.mediaCarouselItems.length > 0 ? el.mediaCarouselItems : el.imageCarouselItems) || [
        { id: "m1", imageUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80", title: "Media 1" },
        { id: "m2", imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80", title: "Media 2" },
        { id: "m3", imageUrl: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=80", title: "Media 3" },
      ];
      const gap = el.mediaCarouselGap ?? 16;
      const itemsJSX = items.map((item) => `
${nextIndent}<div style={{ borderRadius: "12px", overflow: "hidden", aspectRatio: "16/9", backgroundColor: "#f1f5f9" }}>
${nextIndent}  <img src="${item.imageUrl || (item as any).url || ""}" alt="${item.title || "Media"}" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
${nextIndent}</div>`).join("");
      return `${indent}<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "${gap}px", width: "100%", padding: "16px 0" }}>${itemsJSX}\n${indent}</div>`;
    }

    // -------------------------------------------------------------------
    // CUSTOMER REVIEWS
    // -------------------------------------------------------------------
    case "reviews": {
      const reviews = el.reviewItems && el.reviewItems.length > 0 ? el.reviewItems : [
        { id: "r1", reviewerName: "Michael Chang", reviewerTitle: "Verified Buyer", reviewText: "Outstanding build quality and responsive design flexibility.", rating: 5 },
        { id: "r2", reviewerName: "Emma Watson", reviewerTitle: "Verified Buyer", reviewText: "Extremely intuitive and saved us hours of custom code work.", rating: 5 },
      ];
      const itemsJSX = reviews.map((item) => `
${nextIndent}<div style={{ padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", backgroundColor: "#ffffff" }}>
${nextIndent}  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
${nextIndent}    <strong style={{ fontSize: "14px", color: "#0f172a" }}>${item.reviewerName}</strong>
${nextIndent}    <span style={{ color: "#f59e0b" }}>${"★".repeat(item.rating || 5)}</span>
${nextIndent}  </div>
${nextIndent}  <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#475569", lineHeight: 1.5 }}>${item.reviewText}</p>
${nextIndent}  ${item.reviewerTitle ? `<span style={{ fontSize: "11px", color: "#10b981", fontWeight: "600" }}>✓ ${item.reviewerTitle}</span>` : ""}
${nextIndent}</div>`).join("");
      return `${indent}<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", width: "100%", padding: "16px 0" }}>${itemsJSX}\n${indent}</div>`;
    }

    // -------------------------------------------------------------------
    // PRICE LIST
    // -------------------------------------------------------------------
    case "price-list": {
      const items = el.priceListItems && el.priceListItems.length > 0 ? el.priceListItems : [
        { id: "pl1", name: "Espresso Roast", description: "Rich double shot with velvety crema", price: "$4.50" },
        { id: "pl2", name: "Artisanal Pastry", description: "Freshly baked flaky almond croissant", price: "$5.00" },
      ];
      const itemsJSX = items.map((item) => `
${nextIndent}<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px dashed #cbd5e1", paddingBottom: "10px", marginBottom: "14px" }}>
${nextIndent}  <div>
${nextIndent}    <h4 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>${item.name}</h4>
${nextIndent}    ${item.description ? `<p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>${item.description}</p>` : ""}
${nextIndent}  </div>
${nextIndent}  <span style={{ fontWeight: "700", color: "#2563eb", fontSize: "15px" }}>${item.price}</span>
${nextIndent}</div>`).join("");
      return `${indent}<div style={{ width: "100%", maxWidth: "600px", padding: "16px 0" }}>${itemsJSX}\n${indent}</div>`;
    }

    // -------------------------------------------------------------------
    // CONTACT FORM
    // -------------------------------------------------------------------
    case "form": {
      const fields = el.formFields && el.formFields.length > 0 ? el.formFields : [
        { id: "f1", type: "text" as const, label: "Full Name", placeholder: "Jane Doe", required: true },
        { id: "f2", type: "email" as const, label: "Email Address", placeholder: "jane@example.com", required: true },
        { id: "f3", type: "textarea" as const, label: "Message", placeholder: "How can we help?", required: false },
      ];
      const title = el.formTitle || "Contact Us";
      const submitText = el.formSubmitText || "Send Message";
      const fieldsJSX = fields.map((f) => `
${nextIndent}  <div style={{ marginBottom: "14px" }}>
${nextIndent}    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>${f.label}${f.required ? " *" : ""}</label>
${nextIndent}    ${f.type === "textarea" ? `<textarea placeholder="${f.placeholder || ""}" rows={4} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", boxSizing: "border-box" }} />` : `<input type="${f.type}" placeholder="${f.placeholder || ""}" style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", boxSizing: "border-box" }} />`}
${nextIndent}  </div>`).join("");
      return `${indent}<div style={{ width: "100%", maxWidth: "520px", padding: "28px", borderRadius: "16px", border: "1px solid #e2e8f0", backgroundColor: "#ffffff", boxShadow: "0 10px 25px rgba(0,0,0,0.05)" }}>
${nextIndent}<h3 style={{ margin: "0 0 18px 0", fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>${title}</h3>
${fieldsJSX}
${nextIndent}<button type="button" style={{ width: "100%", padding: "12px", borderRadius: "8px", backgroundColor: "#2563eb", color: "#ffffff", fontWeight: "700", border: "none", cursor: "pointer", fontSize: "14px" }}>${submitText}</button>
${indent}</div>`;
    }

    // -------------------------------------------------------------------
    // NAVIGATION MENU
    // -------------------------------------------------------------------
    case "nav-menu":
    case "mega-menu": {
      const items = el.navMenuItems && el.navMenuItems.length > 0 ? el.navMenuItems : [
        { id: "n1", label: "Home", url: "/" },
        { id: "n2", label: "Features", url: "/features" },
        { id: "n3", label: "Pricing", url: "/pricing" },
        { id: "n4", label: "Contact", url: "/contact" },
      ];
      const itemsJSX = items.map((it) => `
${nextIndent}<a href="${it.url || "#"}" style={{ fontSize: "14px", fontWeight: "600", color: "#334155", textDecoration: "none", padding: "8px 12px", borderRadius: "6px" }}>${it.label}</a>`).join("");
      return `${indent}<nav style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", padding: "12px 0" }}>${itemsJSX}\n${indent}</nav>`;
    }

    // -------------------------------------------------------------------
    // CALL TO ACTION
    // -------------------------------------------------------------------
    case "call-to-action": {
      const heading = el.ctaHeading || "Ready to Transform Your Workflow?";
      const desc = el.ctaDescription || "Join thousands of teams building modern high-performance web applications.";
      const btnText = el.ctaButtonText || "Get Started Today";
      const btnUrl = el.ctaButtonUrl || "#";
      return `${indent}<div style={{ width: "100%", padding: "48px", borderRadius: "20px", backgroundColor: "#1e1b4b", color: "#ffffff", textAlign: "center", boxSizing: "border-box" }}>
${nextIndent}<h2 style={{ fontSize: "32px", fontWeight: "800", margin: "0 0 12px 0", color: "#ffffff" }}>${heading}</h2>
${nextIndent}<p style={{ fontSize: "16px", color: "#c7d2fe", margin: "0 auto 28px auto", maxWidth: "600px", lineHeight: 1.6 }}>${desc}</p>
${nextIndent}<a href="${btnUrl}" style={{ display: "inline-block", padding: "14px 32px", backgroundColor: "#ffffff", color: "#1e1b4b", borderRadius: "12px", fontWeight: "700", fontSize: "15px", textDecoration: "none" }}>${btnText}</a>
${indent}</div>`;
    }

    // -------------------------------------------------------------------
    // BLOCKQUOTE
    // -------------------------------------------------------------------
    case "blockquote": {
      const quote = el.quoteContent || "Simplicity is the soul of efficiency.";
      const author = el.quoteAuthor || "Austin Freeman";
      const citation = el.quoteCitation || "";
      return `${indent}<blockquote style={{ borderLeft: "4px solid #2563eb", padding: "16px 24px", margin: "20px 0", backgroundColor: "#f8fafc", borderRadius: "0 12px 12px 0" }}>
${nextIndent}<p style={{ margin: "0 0 8px 0", fontSize: "18px", fontStyle: "italic", color: "#1e293b", lineHeight: 1.6 }}>"${quote}"</p>
${nextIndent}<footer style={{ fontSize: "13px", fontWeight: "600", color: "#64748b" }}>— ${author}${citation ? `, ${citation}` : ""}</footer>
${indent}</blockquote>`;
    }

    // -------------------------------------------------------------------
    // DEFAULT GENERIC FALLBACK
    // -------------------------------------------------------------------
    default: {
      if (el.content && el.content.trim() && el.content !== "Slideshow Section") {
        return `${indent}<div style={${formatStylesToJSX(stylesObj)}} className="${(el.classes || []).join(" ")}">\n${nextIndent}${el.content}\n${indent}</div>`;
      }
      return `${indent}<div style={${formatStylesToJSX(stylesObj)}} className="${(el.classes || []).join(" ")}">\n${nextIndent}{/* Component: ${toPascalCase(el.type)} */}\n${indent}</div>`;
    }
  }
}

// =========================================================================
// STANDALONE COMPONENT WRAPPERS FOR DIRECT TOP-LEVEL DEV-MODE EXPORT
// =========================================================================

/**
 * Generates interactive Animated Headline component
 */
function generateAnimatedHeadlineComponent(el: EditorElement, isTsx = false): string {
  const compName = toPascalCase(el.type || "animated-headline");
  const prefix = el.headlinePrefix ?? "Build Websites That Are";
  const words = el.headlineAnimatedTexts && el.headlineAnimatedTexts.length > 0
    ? el.headlineAnimatedTexts
    : ["Stunning", "Blazing Fast", "Ultra Flexible", "Powerful"];
  const suffix = el.headlineSuffix ?? "With ForgeStudio";
  const animType = el.headlineAnimationType || "typing";
  const speed = el.headlineAnimationSpeed || 2500;
  const highlightColor = el.headlineHighlightColor || "#2563eb";
  const highlightBg = el.headlineHighlightBg || "rgba(239, 246, 255, 1)";
  const tag = el.headlineTag || "h2";
  const stylesObj = getMergedStyles(el, "desktop", "normal");

  const tsInterface = isTsx
    ? `export interface ${compName}Props {
  prefix?: string;
  words?: string[];
  suffix?: string;
  animationType?: "typing" | "fade" | "slide-up" | "zoom" | "flip" | "highlight";
  speed?: number;
  highlightColor?: string;
  highlightBg?: string;
  tag?: "h1" | "h2" | "h3" | "h4" | "p";
  className?: string;
  style?: React.CSSProperties;
}\n\n`
    : "";

  return `// ${compName}.${isTsx ? "tsx" : "jsx"} - Interactive Animated Headline
import React, { useState, useEffect } from 'react';

${tsInterface}export default function ${compName}(${isTsx ? `props: ${compName}Props` : "props"}) {
  const {
    prefix = ${JSON.stringify(prefix)},
    words = ${JSON.stringify(words)},
    suffix = ${JSON.stringify(suffix)},
    animationType = ${JSON.stringify(animType)},
    speed = ${speed},
    highlightColor = ${JSON.stringify(highlightColor)},
    highlightBg = ${JSON.stringify(highlightBg)},
    tag = ${JSON.stringify(tag)},
    className = "",
    style = {},
    ...rest
  } = props;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [animateState, setAnimateState] = useState(true);

  // Typewriter effect logic
  useEffect(() => {
    if (animationType !== "typing") return;

    const currentFullWord = words[currentIndex % words.length];
    let timer;

    if (!isDeleting && displayText === currentFullWord) {
      timer = setTimeout(() => setIsDeleting(true), speed * 0.6);
    } else if (isDeleting && displayText === "") {
      setIsDeleting(false);
      setCurrentIndex((prev) => (prev + 1) % words.length);
    } else {
      const typeSpeed = isDeleting ? 40 : 80;
      timer = setTimeout(() => {
        setDisplayText((prev) =>
          isDeleting
            ? currentFullWord.substring(0, prev.length - 1)
            : currentFullWord.substring(0, prev.length + 1)
        );
      }, typeSpeed);
    }

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, currentIndex, words, animationType, speed]);

  // Non-typing word switching timer
  useEffect(() => {
    if (animationType === "typing") return;

    const interval = setInterval(() => {
      setAnimateState(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % words.length);
        setAnimateState(true);
      }, 250);
    }, speed);

    return () => clearInterval(interval);
  }, [words, animationType, speed]);

  const currentWord = words[currentIndex % words.length];

  let animStyles = {};
  if (animationType === "fade") {
    animStyles = { opacity: animateState ? 1 : 0, transform: animateState ? "scale(1)" : "scale(0.98)" };
  } else if (animationType === "slide-up") {
    animStyles = { opacity: animateState ? 1 : 0, transform: animateState ? "translateY(0px)" : "translateY(12px)" };
  } else if (animationType === "zoom") {
    animStyles = { opacity: animateState ? 1 : 0, transform: animateState ? "scale(1)" : "scale(0.75)" };
  } else if (animationType === "flip") {
    animStyles = { opacity: animateState ? 1 : 0, transform: animateState ? "rotateX(0deg)" : "rotateX(90deg)", transformOrigin: "center center" };
  } else if (animationType === "highlight") {
    animStyles = { backgroundColor: highlightBg, color: highlightColor, borderRadius: "0.5rem", padding: "0.25rem 0.5rem" };
  }

  const Tag = tag;

  const containerStyle = {
    width: "100%",
    fontSize: ${JSON.stringify(stylesObj.fontSize || "36px")},
    fontWeight: ${JSON.stringify(stylesObj.fontWeight || "800")},
    color: ${JSON.stringify(stylesObj.color || "#0f172a")},
    textAlign: ${JSON.stringify(stylesObj.textAlign || "center")},
    marginTop: "20px",
    marginBottom: "20px",
    padding: "12px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    lineHeight: 1.25,
    wordBreak: "break-word",
    ...style,
  };

  return (
    <Tag className={className} style={containerStyle} {...rest}>
      {prefix && <span style={{ marginRight: "0.5rem" }}>{prefix}</span>}

      {animationType === "typing" ? (
        <span
          style={{
            display: "inline-block",
            borderRadius: "6px",
            padding: "2px 8px",
            color: highlightColor,
            backgroundColor: highlightBg,
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          }}
        >
          {displayText}
          <span style={{ marginLeft: "2px", opacity: 0.8, fontFamily: "monospace" }}>|</span>
        </span>
      ) : (
        <span
          style={{
            display: "inline-block",
            transition: "all 0.3s ease",
            color: animationType !== "highlight" ? highlightColor : undefined,
            ...animStyles,
          }}
        >
          {currentWord}
        </span>
      )}

      {suffix && <span style={{ marginLeft: "0.5rem" }}>{suffix}</span>}
    </Tag>
  );
}
`;
}

/**
 * Generates standalone Blog Posts component
 */
function generateBlogPostsComponent(el: EditorElement, isTsx = false): string {
  const compName = toPascalCase(el.type || "posts");
  const postsList = el.posts && el.posts.length > 0 ? el.posts : [
    {
      id: "post_1",
      title: "Getting Started with Modern Web Design",
      excerpt: "Discover essential techniques and best practices to craft beautiful, responsive web applications effortlessly.",
      date: "Sep 1, 2026",
      author: "Jane Doe",
      image: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&auto=format&fit=crop&q=80",
      readMoreText: "Read Article →",
      readMoreUrl: "#",
    },
    {
      id: "post_2",
      title: "Mastering Design Systems & Components",
      excerpt: "Learn how to build reusable design tokens and layout grids that scale across team workflows.",
      date: "Aug 28, 2026",
      author: "Alex Smith",
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80",
      readMoreText: "Read Article →",
      readMoreUrl: "#",
    },
    {
      id: "post_3",
      title: "Optimizing Web Performance & SEO",
      excerpt: "Boost site load speed and search engine rankings with modern code-splitting and asset management.",
      date: "Aug 24, 2026",
      author: "Chris Lee",
      image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80",
      readMoreText: "Read Article →",
      readMoreUrl: "#",
    },
  ];

  const columns = el.postsColumns || 3;
  const gap = el.postsGap ?? 20;
  const imageHeight = el.postsImageHeight || "180px";
  const align = el.postsAlignment || "left";
  const showImage = el.postsShowImage !== false;
  const showDate = el.postsShowDate !== false;
  const showExcerpt = el.postsShowExcerpt !== false;
  const showReadMore = el.postsShowReadMore !== false;

  const tsInterface = isTsx
    ? `export interface PostItem {
  id: string;
  title: string;
  excerpt: string;
  date?: string;
  author?: string;
  image?: string;
  category?: string;
  link?: string;
  readMoreText?: string;
  readMoreUrl?: string;
}

export interface ${compName}Props {
  posts?: PostItem[];
  columns?: number;
  gap?: number;
  imageHeight?: string;
  showImage?: boolean;
  showDate?: boolean;
  showExcerpt?: boolean;
  showReadMore?: boolean;
  alignment?: "left" | "center" | "right";
  className?: string;
  style?: React.CSSProperties;
}\n\n`
    : "";

  return `// ${compName}.${isTsx ? "tsx" : "jsx"} - Standalone Blog Posts Grid
import React from 'react';

${tsInterface}export default function ${compName}(${isTsx ? `props: ${compName}Props` : "props"}) {
  const {
    posts = ${JSON.stringify(postsList, null, 2)},
    columns = ${columns},
    gap = ${gap},
    imageHeight = "${imageHeight}",
    showImage = ${showImage},
    showDate = ${showDate},
    showExcerpt = ${showExcerpt},
    showReadMore = ${showReadMore},
    alignment = "${align}",
    className = "",
    style = {},
    ...rest
  } = props;

  return (
    <div
      className={className}
      style={{
        width: "100%",
        padding: "24px 0",
        boxSizing: "border-box",
        fontFamily: "system-ui, -apple-system, sans-serif",
        ...style,
      }}
      {...rest}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: \`repeat(auto-fit, minmax(280px, 1fr))\`,
          gap: \`\${gap}px\`,
        }}
      >
        {posts.map((post) => (
          <article
            key={post.id}
            style={{
              display: "flex",
              flexDirection: "column",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              backgroundColor: "#ffffff",
              overflow: "hidden",
              boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
              textAlign: alignment,
            }}
          >
            {showImage && post.image && (
              <div style={{ height: imageHeight, overflow: "hidden", backgroundColor: "#f1f5f9" }}>
                <img
                  src={post.image}
                  alt={post.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            )}
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", flex: 1 }}>
              {post.category && (
                <div style={{ marginBottom: "8px" }}>
                  <span style={{ display: "inline-block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: "#2563eb", backgroundColor: "#eff6ff", padding: "3px 8px", borderRadius: "9999px" }}>
                    {post.category}
                  </span>
                </div>
              )}
              {showDate && (post.date || post.author) && (
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px" }}>
                  {post.date}
                  {post.date && post.author && " • "}
                  {post.author && \`By \${post.author}\`}
                </div>
              )}
              <h3 style={{ margin: "0 0 10px 0", fontSize: "18px", fontWeight: "700", color: "#0f172a", lineHeight: 1.3 }}>
                {post.title}
              </h3>
              {showExcerpt && post.excerpt && (
                <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "#475569", lineHeight: 1.5, flex: 1 }}>
                  {post.excerpt}
                </p>
              )}
              {showReadMore && (
                <div style={{ marginTop: "auto" }}>
                  <a
                    href={post.readMoreUrl || post.link || "#"}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "#2563eb",
                      textDecoration: "none",
                    }}
                  >
                    {post.readMoreText || "Read More →"}
                  </a>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
`;
}

/**
 * Generates standalone Pricing Table component
 */
function generatePricingTableComponent(el: EditorElement, isTsx = false): string {
  const compName = toPascalCase(el.type || "price-table");
  const plans = el.pricingPlans && el.pricingPlans.length > 0 ? el.pricingPlans : [
    {
      id: "1",
      name: "Starter",
      price: "$19",
      period: "/ month",
      description: "Essential tools for personal projects & freelancers.",
      isPopular: false,
      buttonText: "Get Started",
      buttonUrl: "#",
      features: [
        { id: "f1", text: "5 Projects included", included: true },
        { id: "f2", text: "10GB SSD Storage", included: true },
        { id: "f3", text: "Basic Analytics", included: true },
      ],
    },
    {
      id: "2",
      name: "Professional",
      price: "$49",
      period: "/ month",
      description: "Best for growing teams & expanding SaaS startups.",
      isPopular: true,
      badgeText: "MOST POPULAR",
      buttonText: "Start Free Trial",
      buttonUrl: "#",
      features: [
        { id: "f1", text: "Unlimited Projects", included: true },
        { id: "f2", text: "100GB SSD Storage", included: true },
        { id: "f3", text: "Priority Support", included: true },
      ],
    },
  ];

  const tsInterface = isTsx
    ? `export interface PricingPlan {
  id: string;
  name: string;
  price: string;
  period?: string;
  description?: string;
  isPopular?: boolean;
  badgeText?: string;
  buttonText: string;
  buttonUrl?: string;
  features: { id: string; text: string; included: boolean }[];
}

export interface ${compName}Props {
  plans?: PricingPlan[];
  className?: string;
  style?: React.CSSProperties;
}\n\n`
    : "";

  return `// ${compName}.${isTsx ? "tsx" : "jsx"} - Standalone Pricing Table
import React from 'react';

${tsInterface}export default function ${compName}(${isTsx ? `props: ${compName}Props` : "props"}) {
  const {
    plans = ${JSON.stringify(plans, null, 2)},
    className = "",
    style = {},
    ...rest
  } = props;

  return (
    <div
      className={className}
      style={{
        width: "100%",
        padding: "40px 16px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        ...style,
      }}
      {...rest}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "24px",
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        {plans.map((plan) => (
          <div
            key={plan.id}
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              borderRadius: "20px",
              backgroundColor: "#ffffff",
              border: plan.isPopular ? "2px solid #2563eb" : "1px solid #e2e8f0",
              padding: "32px 24px",
              boxShadow: plan.isPopular ? "0 20px 25px -5px rgba(37,99,235,0.15)" : "0 4px 6px -1px rgba(0,0,0,0.05)",
            }}
          >
            {plan.isPopular && (
              <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#2563eb", color: "#fff", fontSize: "11px", fontWeight: "bold", padding: "4px 14px", borderRadius: "9999px" }}>
                {plan.badgeText || "POPULAR"}
              </div>
            )}
            <h3 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: "bold", color: "#0f172a" }}>{plan.name}</h3>
            {plan.description && <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#64748b" }}>{plan.description}</p>}
            <div style={{ display: "flex", alignItems: "baseline", margin: "12px 0 20px" }}>
              <span style={{ fontSize: "36px", fontWeight: "800", color: "#0f172a" }}>{plan.price}</span>
              {plan.period && <span style={{ marginLeft: "6px", fontSize: "14px", color: "#64748b" }}>{plan.period}</span>}
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", flexGrow: 1 }}>
              {plan.features.map((f) => (
                <li key={f.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", fontSize: "14px", color: f.included ? "#334155" : "#94a3b8" }}>
                  <span>{f.included ? "✓" : "✕"}</span>
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
            <a href={plan.buttonUrl || "#"} style={{ display: "block", textAlign: "center", padding: "12px", borderRadius: "10px", backgroundColor: plan.isPopular ? "#2563eb" : "#0f172a", color: "#fff", fontSize: "14px", fontWeight: "600", textDecoration: "none" }}>
              {plan.buttonText}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
`;
}

/**
 * Generates standalone Code Highlight component
 */
function generateCodeHighlightComponent(el: EditorElement, isTsx = false): string {
  const compName = toPascalCase(el.type || "code-highlight");
  const code = el.codeSnippet || `// Welcome to ForgeStudio Code Highlight\nfunction greet(name: string): string {\n  return \`Hello, \${name}!\`;\n}\n\nconsole.log(greet("Developer"));`;
  const language = el.codeLanguage || "typescript";
  const showLineNumbers = el.codeShowLineNumbers ?? true;
  const theme = el.codeTheme || "dark";
  const fontSize = el.codeFontSize || "14px";

  const tsInterface = isTsx
    ? `export interface ${compName}Props {
  code?: string;
  language?: string;
  showLineNumbers?: boolean;
  theme?: "dark" | "light" | "dracula" | "github";
  fontSize?: string;
  className?: string;
  style?: React.CSSProperties;
}\n\n`
    : "";

  return `// ${compName}.${isTsx ? "tsx" : "jsx"} - Code Highlight Box
import React, { useState } from 'react';

${tsInterface}export default function ${compName}(${isTsx ? `props: ${compName}Props` : "props"}) {
  const {
    code = ${JSON.stringify(code)},
    language = ${JSON.stringify(language)},
    showLineNumbers = ${showLineNumbers},
    theme = ${JSON.stringify(theme)},
    fontSize = ${JSON.stringify(fontSize)},
    className = "",
    style = {},
    ...rest
  } = props;

  const [copied, setCopied] = useState(false);
  const lines = code.split("\\n");

  const themeBg = theme === "light" ? "#f8fafc" : theme === "dracula" ? "#282a36" : "#0f172a";
  const themeText = theme === "light" ? "#0f172a" : "#f8fafc";
  const themeBorder = theme === "light" ? "#e2e8f0" : "#334155";

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={className}
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        padding: "16px 0",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        ...style,
      }}
      {...rest}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "800px",
          borderRadius: "16px",
          border: \`1px solid \${themeBorder}\`,
          backgroundColor: themeBg,
          color: themeText,
          overflow: "hidden",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            borderBottom: \`1px solid \${themeBorder}\`,
            backgroundColor: "rgba(0, 0, 0, 0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#ef4444", display: "inline-block" }} />
            <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#f59e0b", display: "inline-block" }} />
            <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#10b981", display: "inline-block" }} />
            <span style={{ marginLeft: "8px", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.75 }}>
              {language}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 10px",
              fontSize: "12px",
              fontWeight: 500,
              borderRadius: "6px",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            {copied ? "✓ Copied!" : "📋 Copy"}
          </button>
        </div>

        <div style={{ padding: "16px", overflowX: "auto", fontSize }}>
          <pre style={{ margin: 0, lineHeight: 1.6, fontFamily: "inherit" }}>
            {lines.map((line, idx) => (
              <div key={idx} style={{ display: "flex" }}>
                {showLineNumbers && (
                  <span
                    style={{
                      userSelect: "none",
                      width: "36px",
                      marginRight: "16px",
                      textAlign: "right",
                      opacity: 0.35,
                      fontSize: "0.85em",
                    }}
                  >
                    {idx + 1}
                  </span>
                )}
                <span style={{ whiteSpace: "pre" }}>{line || " "}</span>
              </div>
            ))}
          </pre>
        </div>
      </div>
    </div>
  );
}
`;
}

/**
 * Generates standalone Countdown Timer component
 */
function generateCountdownComponent(el: EditorElement, isTsx = false): string {
  const compName = toPascalCase(el.type || "countdown");
  const targetDate = el.countdownTargetDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const tsInterface = isTsx
    ? `export interface ${compName}Props {
  targetDate?: string;
  className?: string;
  style?: React.CSSProperties;
}\n\n`
    : "";

  return `// ${compName}.${isTsx ? "tsx" : "jsx"} - Countdown Timer
import React, { useState, useEffect } from 'react';

${tsInterface}export default function ${compName}(${isTsx ? `props: ${compName}Props` : "props"}) {
  const {
    targetDate = ${JSON.stringify(targetDate)},
    className = "",
    style = {},
    ...rest
  } = props;

  const calculateTimeLeft = () => {
    const diff = +new Date(targetDate) - +new Date();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / 1000 / 60) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        flexWrap: "wrap",
        margin: "24px 0",
        fontFamily: "system-ui, -apple-system, sans-serif",
        ...style,
      }}
      {...rest}
    >
      {[
        { label: "Days", value: timeLeft.days },
        { label: "Hours", value: timeLeft.hours },
        { label: "Minutes", value: timeLeft.minutes },
        { label: "Seconds", value: timeLeft.seconds },
      ].map((u) => (
        <div key={u.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "85px", padding: "16px 12px", borderRadius: "16px", backgroundColor: "#0f172a", color: "#fff", boxShadow: "0 8px 16px rgba(0,0,0,0.15)" }}>
          <span style={{ fontSize: "36px", fontWeight: "800", fontVariantNumeric: "tabular-nums" }}>{String(u.value).padStart(2, "0")}</span>
          <span style={{ fontSize: "11px", fontWeight: "bold", opacity: 0.7, letterSpacing: "0.08em", marginTop: "4px" }}>{u.label}</span>
        </div>
      ))}
    </div>
  );
}
`;
}

/**
 * Generates standalone Flip Box component
 */
function generateFlipBoxComponent(el: EditorElement, isTsx = false): string {
  const compName = toPascalCase(el.type || "flip-box");
  const height = el.flipCardHeight || "320px";
  const frontTitle = el.flipFrontTitle || "Interactive Solutions";
  const frontDesc = el.flipFrontDescription || "Hover or tap to flip card and explore custom features.";
  const frontBg = el.flipFrontBg || "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)";
  const frontIcon = el.flipFrontIcon || "🚀";
  const backTitle = el.flipBackTitle || "Ready to Start?";
  const backDesc = el.flipBackDescription || "Join thousands of creators building high-converting websites.";
  const backBg = el.flipBackBg || "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)";
  const backBtnText = el.flipBackBtnText || "Get Started Now";
  const backBtnUrl = el.flipBackBtnUrl || "";

  const tsInterface = isTsx
    ? `export interface ${compName}Props {
  frontTitle?: string;
  frontDesc?: string;
  frontIcon?: string;
  backTitle?: string;
  backDesc?: string;
  backBtnText?: string;
  backBtnUrl?: string;
  height?: string;
  className?: string;
  style?: React.CSSProperties;
}\n\n`
    : "";

  return `// ${compName}.${isTsx ? "tsx" : "jsx"} - 3D Flip Card
import React, { useState } from 'react';

${tsInterface}export default function ${compName}(${isTsx ? `props: ${compName}Props` : "props"}) {
  const {
    frontTitle = ${JSON.stringify(frontTitle)},
    frontDesc = ${JSON.stringify(frontDesc)},
    frontIcon = ${JSON.stringify(frontIcon)},
    backTitle = ${JSON.stringify(backTitle)},
    backDesc = ${JSON.stringify(backDesc)},
    backBtnText = ${JSON.stringify(backBtnText)},
    backBtnUrl = ${JSON.stringify(backBtnUrl)},
    height = ${JSON.stringify(height)},
    className = "",
    style = {},
    ...rest
  } = props;

  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className={className}
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
      onClick={() => setIsFlipped((prev) => !prev)}
      style={{
        perspective: "1000px",
        width: "100%",
        maxWidth: "420px",
        height,
        margin: "20px auto",
        cursor: "pointer",
        fontFamily: "system-ui, -apple-system, sans-serif",
        ...style,
      }}
      {...rest}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transition: "transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          borderRadius: "20px",
          boxShadow: "0 15px 35px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ position: "absolute", width: "100%", height: "100%", backfaceVisibility: "hidden", borderRadius: "20px", background: ${JSON.stringify(frontBg)}, color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>{frontIcon}</div>
          <h3 style={{ margin: "0 0 12px", fontSize: "24px", fontWeight: "bold" }}>{frontTitle}</h3>
          <p style={{ margin: 0, fontSize: "14px", opacity: 0.85, lineHeight: 1.6 }}>{frontDesc}</p>
        </div>
        <div style={{ position: "absolute", width: "100%", height: "100%", backfaceVisibility: "hidden", transform: "rotateY(180deg)", borderRadius: "20px", background: ${JSON.stringify(backBg)}, color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px", textAlign: "center" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: "24px", fontWeight: "bold" }}>{backTitle}</h3>
          <p style={{ margin: "0 0 24px", fontSize: "14px", opacity: 0.9, lineHeight: 1.6 }}>{backDesc}</p>
          {backBtnUrl ? (
            <a href={backBtnUrl} style={{ display: "inline-block", textDecoration: "none", padding: "10px 24px", borderRadius: "8px", border: "none", backgroundColor: "#fff", color: "#4f46e5", fontSize: "14px", fontWeight: "bold", cursor: "pointer" }}>
              {backBtnText}
            </a>
          ) : (
            <button type="button" style={{ padding: "10px 24px", borderRadius: "8px", border: "none", backgroundColor: "#fff", color: "#4f46e5", fontSize: "14px", fontWeight: "bold", cursor: "pointer" }}>
              {backBtnText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
`;
}

/**
 * Generates standalone interactive Slides / Slideshow component
 */
function generateSlidesComponent(el: EditorElement, isTsx = false): string {
  const compName = toPascalCase(el.type || "slides");
  const slidesList: SlideItem[] = el.slidesItems && el.slidesItems.length > 0 ? el.slidesItems : [
    {
      id: "slide_1",
      title: "Empower Your Digital Growth",
      description: "Build high-converting modern websites with intuitive drag and drop tools and responsive controls.",
      bgImage: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1600&auto=format&fit=crop&q=80",
      bgColor: "#1e1b4b",
      buttonText: "Explore Features",
      buttonUrl: "#",
    },
    {
      id: "slide_2",
      title: "Designed for High Performance",
      description: "Lightning-fast page load speeds, automatic SEO optimization, and flawless mobile experience.",
      bgImage: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1600&auto=format&fit=crop&q=80",
      bgColor: "#0f172a",
      buttonText: "Start Free Trial",
      buttonUrl: "#",
    },
    {
      id: "slide_3",
      title: "Seamless Team Collaboration",
      description: "Work together in real-time, manage brand components, and deploy updates instantly.",
      bgImage: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1600&auto=format&fit=crop&q=80",
      bgColor: "#111827",
      buttonText: "Contact Sales",
      buttonUrl: "#",
    },
  ];

  const height = el.slidesHeight || "450px";
  const autoplay = el.slidesAutoplay !== false;
  const autoplayInterval = el.slidesAutoplayInterval || 4000;
  const transition = el.slidesTransition || "slide";
  const alignment = el.slidesAlignment || "center";
  const showArrows = el.slidesShowArrows !== false;
  const showDots = el.slidesShowDots !== false;

  const tsInterface = isTsx
    ? `export interface SlideItem {
  id: string;
  title: string;
  description?: string;
  bgImage?: string;
  bgColor?: string;
  buttonText?: string;
  buttonUrl?: string;
}

export interface ${compName}Props {
  slides?: SlideItem[];
  height?: string;
  autoplay?: boolean;
  autoplayInterval?: number;
  transition?: "slide" | "fade";
  alignment?: "left" | "center" | "right";
  showArrows?: boolean;
  showDots?: boolean;
  className?: string;
  style?: React.CSSProperties;
}\n\n`
    : "";

  return `// ${compName}.${isTsx ? "tsx" : "jsx"} - Interactive Hero Slideshow
import React, { useState, useEffect } from 'react';

${tsInterface}export default function ${compName}(${isTsx ? `props: ${compName}Props` : "props"}) {
  const {
    slides = ${JSON.stringify(slidesList, null, 2)},
    height = ${JSON.stringify(height)},
    autoplay = ${autoplay},
    autoplayInterval = ${autoplayInterval},
    transition = ${JSON.stringify(transition)},
    alignment = ${JSON.stringify(alignment)},
    showArrows = ${showArrows},
    showDots = ${showDots},
    className = "",
    style = {},
    ...rest
  } = props;

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!autoplay || slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, autoplayInterval);
    return () => clearInterval(timer);
  }, [autoplay, slides.length, autoplayInterval]);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  if (!slides || slides.length === 0) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a", color: "#94a3b8", borderRadius: "16px", ...style }}>
        <p>No slides configured</p>
      </div>
    );
  }

  const currentSlide = slides[currentIndex] || slides[0];

  const textAlign = alignment === "center" ? "center" : alignment === "right" ? "right" : "left";
  const alignItems = alignment === "center" ? "center" : alignment === "right" ? "flex-end" : "flex-start";

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: height,
        overflow: "hidden",
        borderRadius: "16px",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
        backgroundColor: currentSlide.bgColor || "#0f172a",
        ...style,
      }}
      {...rest}
    >
      {slides.map((slide, idx) => {
        const isActive = idx === currentIndex;
        return (
          <div
            key={slide.id || idx}
            style={{
              position: "absolute",
              inset: 0,
              opacity: isActive ? 1 : 0,
              transform: isActive ? "translateX(0px)" : transition === "fade" ? "none" : "translateX(40px)",
              transition: "all 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
              pointerEvents: isActive ? "auto" : "none",
              backgroundImage: slide.bgImage ? \`url(\${slide.bgImage})\` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundColor: slide.bgColor || "#0f172a",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            {/* Gradient Overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.45) 50%, rgba(0, 0, 0, 0.3) 100%)",
              }}
            />

            {/* Slide Content */}
            <div
              style={{
                position: "relative",
                zIndex: 10,
                display: "flex",
                flexDirection: "column",
                alignItems: alignItems,
                textAlign: textAlign,
                padding: "48px",
                maxWidth: "750px",
                margin: alignment === "center" ? "0 auto" : alignment === "right" ? "0 0 0 auto" : "0",
              }}
            >
              <h2
                style={{
                  fontSize: "36px",
                  fontWeight: "800",
                  color: "#ffffff",
                  lineHeight: 1.2,
                  margin: "0 0 16px 0",
                  textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                }}
              >
                {slide.title}
              </h2>

              {slide.description && (
                <p
                  style={{
                    fontSize: "16px",
                    color: "#e2e8f0",
                    lineHeight: 1.6,
                    margin: "0 0 24px 0",
                    maxWidth: "550px",
                    textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                  }}
                >
                  {slide.description}
                </p>
              )}

              {slide.buttonText && (
                <a
                  href={slide.buttonUrl || "#"}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    backgroundColor: "#ffffff",
                    color: "#0f172a",
                    fontWeight: "700",
                    fontSize: "14px",
                    padding: "12px 28px",
                    borderRadius: "10px",
                    textDecoration: "none",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2)",
                  }}
                >
                  <span>{slide.buttonText}</span>
                  <span>→</span>
                </a>
              )}
            </div>
          </div>
        );
      })}

      {/* Navigation Arrows */}
      {showArrows && slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous Slide"
            style={{
              position: "absolute",
              left: "16px",
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 20,
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              color: "#ffffff",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next Slide"
            style={{
              position: "absolute",
              right: "16px",
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 20,
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              color: "#ffffff",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            ›
          </button>
        </>
      )}

      {/* Pagination Dots */}
      {showDots && slides.length > 1 && (
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 20,
            display: "flex",
            gap: "8px",
          }}
        >
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              aria-label={\`Go to slide \${idx + 1}\`}
              style={{
                width: idx === currentIndex ? "28px" : "10px",
                height: "10px",
                borderRadius: "5px",
                backgroundColor: idx === currentIndex ? "#ffffff" : "rgba(255, 255, 255, 0.4)",
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
`;
}

/**
 * Generates standalone Photo Gallery component
 */
function generateGalleryComponent(el: EditorElement, isTsx = false): string {
  const compName = toPascalCase(el.type || "gallery");
  const images = el.galleryImages && el.galleryImages.length > 0 ? el.galleryImages : [
    { id: "g1", url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80", caption: "Vibrant Color Gradients" },
    { id: "g2", url: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80", caption: "Digital Innovation Space" },
    { id: "g3", url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80", caption: "High Performance Collaboration" },
  ];
  const columns = el.galleryColumns || 3;
  const gap = el.galleryGap ?? 16;

  const tsInterface = isTsx
    ? `export interface GalleryImageItem {
  id: string;
  url: string;
  caption?: string;
  altText?: string;
}

export interface ${compName}Props {
  images?: GalleryImageItem[];
  columns?: number;
  gap?: number;
  className?: string;
  style?: React.CSSProperties;
}\n\n`
    : "";

  return `// ${compName}.${isTsx ? "tsx" : "jsx"} - Photo Gallery Component
import React, { useState } from 'react';

${tsInterface}export default function ${compName}(${isTsx ? `props: ${compName}Props` : "props"}) {
  const {
    images = ${JSON.stringify(images, null, 2)},
    columns = ${columns},
    gap = ${gap},
    className = "",
    style = {},
    ...rest
  } = props;

  const [activeImage, setActiveImage] = useState<any>(null);

  return (
    <div className={className} style={{ width: "100%", padding: "24px 0", ...style }} {...rest}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: \`repeat(auto-fit, minmax(280px, 1fr))\`,
          gap: \`\${gap}px\`,
        }}
      >
        {images.map((img) => (
          <div
            key={img.id}
            onClick={() => setActiveImage(img)}
            style={{
              position: "relative",
              borderRadius: "12px",
              overflow: "hidden",
              aspectRatio: "4/3",
              backgroundColor: "#f1f5f9",
              cursor: "pointer",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
            }}
          >
            <img
              src={img.url}
              alt={img.caption || img.altText || "Gallery item"}
              style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s ease" }}
            />
            {img.caption && (
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  insetInline: 0,
                  padding: "10px 14px",
                  background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: "600",
                }}
              >
                {img.caption}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {activeImage && (
        <div
          onClick={() => setActiveImage(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            backgroundColor: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            cursor: "zoom-out",
          }}
        >
          <img
            src={activeImage.url}
            alt={activeImage.caption || "Preview"}
            style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: "12px", objectFit: "contain" }}
          />
        </div>
      )}
    </div>
  );
}
`;
}

/**
 * Generates standalone Testimonials Slider component
 */
function generateTestimonialsComponent(el: EditorElement, isTsx = false): string {
  const compName = toPascalCase(el.type || "testimonial-carousel");
  const testimonials = el.testimonialItems && el.testimonialItems.length > 0 ? el.testimonialItems : [
    { id: "t1", name: "Sarah Connor", role: "VP of Engineering", quote: "ForgeStudio allowed our team to accelerate production releases tenfold.", rating: 5 },
    { id: "t2", name: "David Miller", role: "Product Lead", quote: "The bidirectional code and visual canvas sync is a complete game changer for developers.", rating: 5 },
  ];
  const gap = el.testimonialGap ?? 24;

  const tsInterface = isTsx
    ? `export interface TestimonialItem {
  id: string;
  name: string;
  role: string;
  quote: string;
  rating?: number;
  avatarUrl?: string;
}

export interface ${compName}Props {
  testimonials?: TestimonialItem[];
  gap?: number;
  className?: string;
  style?: React.CSSProperties;
}\n\n`
    : "";

  return `// ${compName}.${isTsx ? "tsx" : "jsx"} - Testimonials Slider
import React from 'react';

${tsInterface}export default function ${compName}(${isTsx ? `props: ${compName}Props` : "props"}) {
  const {
    testimonials = ${JSON.stringify(testimonials, null, 2)},
    gap = ${gap},
    className = "",
    style = {},
    ...rest
  } = props;

  return (
    <div className={className} style={{ width: "100%", padding: "32px 0", ...style }} {...rest}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: \`\${gap}px\`,
        }}
      >
        {testimonials.map((item) => (
          <div
            key={item.id}
            style={{
              padding: "28px",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              backgroundColor: "#ffffff",
              boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ color: "#f59e0b", fontSize: "18px", marginBottom: "14px" }}>
              {"★".repeat(item.rating || 5)}
            </div>
            <p style={{ fontSize: "15px", color: "#334155", fontStyle: "italic", lineHeight: 1.6, flex: 1, margin: "0 0 20px 0" }}>
              "{item.quote}"
            </p>
            <div>
              <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "15px" }}>{item.name}</div>
              <div style={{ fontSize: "13px", color: "#64748b" }}>{item.role}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
`;
}

/**
 * Generates standalone Media Carousel component
 */
function generateMediaCarouselComponent(el: EditorElement, isTsx = false): string {
  const compName = toPascalCase(el.type || "media-carousel");
  const items = (el.mediaCarouselItems && el.mediaCarouselItems.length > 0 ? el.mediaCarouselItems : el.imageCarouselItems) || [
    { id: "m1", imageUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80", title: "Media 1" },
    { id: "m2", imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80", title: "Media 2" },
    { id: "m3", imageUrl: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=80", title: "Media 3" },
  ];
  const gap = el.mediaCarouselGap ?? 16;

  const tsInterface = isTsx
    ? `export interface MediaCarouselProps {
  items?: any[];
  gap?: number;
  className?: string;
  style?: React.CSSProperties;
}\n\n`
    : "";

  return `// ${compName}.${isTsx ? "tsx" : "jsx"} - Media Carousel
import React from 'react';

${tsInterface}export default function ${compName}(${isTsx ? `props: MediaCarouselProps` : "props"}) {
  const {
    items = ${JSON.stringify(items, null, 2)},
    gap = ${gap},
    className = "",
    style = {},
    ...rest
  } = props;

  return (
    <div className={className} style={{ width: "100%", padding: "24px 0", ...style }} {...rest}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: \`\${gap}px\`,
        }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              borderRadius: "14px",
              overflow: "hidden",
              aspectRatio: "16/9",
              backgroundColor: "#f1f5f9",
              boxShadow: "0 4px 10px rgba(0,0,0,0.06)",
            }}
          >
            <img
              src={item.imageUrl || item.url || ""}
              alt={item.title || "Media Item"}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
`;
}

/**
 * Generates standalone Customer Reviews component
 */
function generateReviewsComponent(el: EditorElement, isTsx = false): string {
  const compName = toPascalCase(el.type || "reviews");
  const reviews = el.reviewItems && el.reviewItems.length > 0 ? el.reviewItems : [
    { id: "r1", reviewerName: "Michael Chang", reviewerTitle: "Verified Buyer", reviewText: "Outstanding build quality and responsive design flexibility.", rating: 5 },
    { id: "r2", reviewerName: "Emma Watson", reviewerTitle: "Verified Buyer", reviewText: "Extremely intuitive and saved us hours of custom code work.", rating: 5 },
  ];

  const tsInterface = isTsx
    ? `export interface ReviewItem {
  id: string;
  reviewerName: string;
  reviewerTitle?: string;
  reviewText: string;
  rating: number;
  avatarUrl?: string;
}

export interface ${compName}Props {
  reviews?: ReviewItem[];
  className?: string;
  style?: React.CSSProperties;
}\n\n`
    : "";

  return `// ${compName}.${isTsx ? "tsx" : "jsx"} - Verified Reviews
import React from 'react';

${tsInterface}export default function ${compName}(${isTsx ? `props: ${compName}Props` : "props"}) {
  const {
    reviews = ${JSON.stringify(reviews, null, 2)},
    className = "",
    style = {},
    ...rest
  } = props;

  return (
    <div className={className} style={{ width: "100%", padding: "24px 0", ...style }} {...rest}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
        {reviews.map((item) => (
          <div key={item.id} style={{ padding: "24px", borderRadius: "14px", border: "1px solid #e2e8f0", backgroundColor: "#ffffff", boxShadow: "0 4px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <strong style={{ fontSize: "15px", color: "#0f172a" }}>{item.reviewerName}</strong>
              <span style={{ color: "#f59e0b" }}>{"★".repeat(item.rating || 5)}</span>
            </div>
            <p style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#475569", lineHeight: 1.5 }}>{item.reviewText}</p>
            {item.reviewerTitle && <span style={{ fontSize: "11px", color: "#10b981", fontWeight: "600" }}>✓ {item.reviewerTitle}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
`;
}

/**
 * Generates standalone Price List component
 */
function generatePriceListComponent(el: EditorElement, isTsx = false): string {
  const compName = toPascalCase(el.type || "price-list");
  const items = el.priceListItems && el.priceListItems.length > 0 ? el.priceListItems : [
    { id: "pl1", name: "Espresso Roast", description: "Rich double shot with velvety crema", price: "$4.50" },
    { id: "pl2", name: "Artisanal Pastry", description: "Freshly baked flaky almond croissant", price: "$5.00" },
  ];

  const tsInterface = isTsx
    ? `export interface PriceListItem {
  id: string;
  name: string;
  description?: string;
  price: string;
}

export interface ${compName}Props {
  items?: PriceListItem[];
  className?: string;
  style?: React.CSSProperties;
}\n\n`
    : "";

  return `// ${compName}.${isTsx ? "tsx" : "jsx"} - Price List
import React from 'react';

${tsInterface}export default function ${compName}(${isTsx ? `props: ${compName}Props` : "props"}) {
  const {
    items = ${JSON.stringify(items, null, 2)},
    className = "",
    style = {},
    ...rest
  } = props;

  return (
    <div className={className} style={{ width: "100%", maxWidth: "600px", margin: "0 auto", padding: "24px 0", ...style }} {...rest}>
      {items.map((item) => (
        <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px dashed #cbd5e1", paddingBottom: "12px", marginBottom: "16px" }}>
          <div>
            <h4 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>{item.name}</h4>
            {item.description && <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>{item.description}</p>}
          </div>
          <span style={{ fontWeight: "700", color: "#2563eb", fontSize: "16px" }}>{item.price}</span>
        </div>
      ))}
    </div>
  );
}
`;
}

/**
 * Generates standalone Contact Form component
 */
function generateFormComponent(el: EditorElement, isTsx = false): string {
  const compName = toPascalCase(el.type || "form");
  const fields = el.formFields && el.formFields.length > 0 ? el.formFields : [
    { id: "f1", type: "text" as const, label: "Full Name", placeholder: "Jane Doe", required: true },
    { id: "f2", type: "email" as const, label: "Email Address", placeholder: "jane@example.com", required: true },
    { id: "f3", type: "textarea" as const, label: "Message", placeholder: "How can we help?", required: false },
  ];
  const title = el.formTitle || "Contact Us";
  const submitText = el.formSubmitText || "Send Message";

  const tsInterface = isTsx
    ? `export interface FormFieldItem {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}

export interface ${compName}Props {
  title?: string;
  fields?: FormFieldItem[];
  submitText?: string;
  className?: string;
  style?: React.CSSProperties;
}\n\n`
    : "";

  return `// ${compName}.${isTsx ? "tsx" : "jsx"} - Contact Form
import React, { useState } from 'react';

${tsInterface}export default function ${compName}(${isTsx ? `props: ${compName}Props` : "props"}) {
  const {
    title = ${JSON.stringify(title)},
    fields = ${JSON.stringify(fields, null, 2)},
    submitText = ${JSON.stringify(submitText)},
    className = "",
    style = {},
    ...rest
  } = props;

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className={className} style={{ width: "100%", maxWidth: "520px", margin: "0 auto", padding: "32px", borderRadius: "16px", border: "1px solid #e2e8f0", backgroundColor: "#ffffff", boxShadow: "0 10px 25px rgba(0,0,0,0.05)", ...style }} {...rest}>
      <h3 style={{ margin: "0 0 20px 0", fontSize: "22px", fontWeight: "800", color: "#0f172a" }}>{title}</h3>
      {submitted ? (
        <div style={{ padding: "16px", borderRadius: "8px", backgroundColor: "#ecfdf5", color: "#065f46", fontSize: "14px", fontWeight: "600" }}>
          ✓ Thank you! Your message has been sent successfully.
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {fields.map((f) => (
            <div key={f.id} style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                {f.label}{f.required ? " *" : ""}
              </label>
              {f.type === "textarea" ? (
                <textarea
                  rows={4}
                  required={f.required}
                  placeholder={f.placeholder}
                  value={formData[f.id] || ""}
                  onChange={(e) => setFormData({ ...formData, [f.id]: e.target.value })}
                  style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", boxSizing: "border-box" }}
                />
              ) : (
                <input
                  type={f.type || "text"}
                  required={f.required}
                  placeholder={f.placeholder}
                  value={formData[f.id] || ""}
                  onChange={(e) => setFormData({ ...formData, [f.id]: e.target.value })}
                  style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", boxSizing: "border-box" }}
                />
              )}
            </div>
          ))}
          <button type="submit" style={{ width: "100%", padding: "14px", borderRadius: "8px", backgroundColor: "#2563eb", color: "#ffffff", fontWeight: "700", border: "none", cursor: "pointer", fontSize: "15px", marginTop: "8px" }}>
            {submitText}
          </button>
        </form>
      )}
    </div>
  );
}
`;
}

/**
 * Generates standalone Navigation Menu component
 */
function generateNavMenuComponent(el: EditorElement, isTsx = false): string {
  const compName = toPascalCase(el.type || "nav-menu");
  const items = el.navMenuItems && el.navMenuItems.length > 0 ? el.navMenuItems : [
    { id: "n1", label: "Home", url: "/" },
    { id: "n2", label: "Features", url: "/features" },
    { id: "n3", label: "Pricing", url: "/pricing" },
    { id: "n4", label: "Contact", url: "/contact" },
  ];

  const tsInterface = isTsx
    ? `export interface NavMenuItem {
  id: string;
  label: string;
  url: string;
}

export interface ${compName}Props {
  items?: NavMenuItem[];
  className?: string;
  style?: React.CSSProperties;
}\n\n`
    : "";

  return `// ${compName}.${isTsx ? "tsx" : "jsx"} - Navigation Menu
import React from 'react';

${tsInterface}export default function ${compName}(${isTsx ? `props: ${compName}Props` : "props"}) {
  const {
    items = ${JSON.stringify(items, null, 2)},
    className = "",
    style = {},
    ...rest
  } = props;

  return (
    <nav className={className} style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap", padding: "16px 0", ...style }} {...rest}>
      {items.map((it) => (
        <a key={it.id} href={it.url || "#"} style={{ fontSize: "15px", fontWeight: "600", color: "#334155", textDecoration: "none", padding: "8px 14px", borderRadius: "8px" }}>
          {it.label}
        </a>
      ))}
    </nav>
  );
}
`;
}

/**
 * Generates standalone Call To Action component
 */
function generateCTAComponent(el: EditorElement, isTsx = false): string {
  const compName = toPascalCase(el.type || "call-to-action");
  const heading = el.ctaHeading || "Ready to Transform Your Workflow?";
  const desc = el.ctaDescription || "Join thousands of teams building modern high-performance web applications.";
  const btnText = el.ctaButtonText || "Get Started Today";
  const btnUrl = el.ctaButtonUrl || "#";

  const tsInterface = isTsx
    ? `export interface ${compName}Props {
  heading?: string;
  description?: string;
  buttonText?: string;
  buttonUrl?: string;
  className?: string;
  style?: React.CSSProperties;
}\n\n`
    : "";

  return `// ${compName}.${isTsx ? "tsx" : "jsx"} - Call To Action
import React from 'react';

${tsInterface}export default function ${compName}(${isTsx ? `props: ${compName}Props` : "props"}) {
  const {
    heading = ${JSON.stringify(heading)},
    description = ${JSON.stringify(desc)},
    buttonText = ${JSON.stringify(btnText)},
    buttonUrl = ${JSON.stringify(btnUrl)},
    className = "",
    style = {},
    ...rest
  } = props;

  return (
    <div className={className} style={{ width: "100%", padding: "56px 32px", borderRadius: "20px", backgroundColor: "#1e1b4b", color: "#ffffff", textAlign: "center", boxSizing: "border-box", ...style }} {...rest}>
      <h2 style={{ fontSize: "36px", fontWeight: "800", margin: "0 0 16px 0", color: "#ffffff" }}>{heading}</h2>
      <p style={{ fontSize: "17px", color: "#c7d2fe", margin: "0 auto 32px auto", maxWidth: "620px", lineHeight: 1.6 }}>{description}</p>
      <a href={buttonUrl} style={{ display: "inline-block", padding: "14px 36px", backgroundColor: "#ffffff", color: "#1e1b4b", borderRadius: "12px", fontWeight: "700", fontSize: "15px", textDecoration: "none" }}>
        {buttonText}
      </a>
    </div>
  );
}
`;
}

/**
 * Generates standalone Blockquote component
 */
function generateBlockquoteComponent(el: EditorElement, isTsx = false): string {
  const compName = toPascalCase(el.type || "blockquote");
  const quote = el.quoteContent || "Simplicity is the soul of efficiency.";
  const author = el.quoteAuthor || "Austin Freeman";
  const citation = el.quoteCitation || "";

  const tsInterface = isTsx
    ? `export interface ${compName}Props {
  quote?: string;
  author?: string;
  citation?: string;
  className?: string;
  style?: React.CSSProperties;
}\n\n`
    : "";

  return `// ${compName}.${isTsx ? "tsx" : "jsx"} - Blockquote
import React from 'react';

${tsInterface}export default function ${compName}(${isTsx ? `props: ${compName}Props` : "props"}) {
  const {
    quote = ${JSON.stringify(quote)},
    author = ${JSON.stringify(author)},
    citation = ${JSON.stringify(citation)},
    className = "",
    style = {},
    ...rest
  } = props;

  return (
    <blockquote className={className} style={{ borderLeft: "4px solid #2563eb", padding: "20px 28px", margin: "24px 0", backgroundColor: "#f8fafc", borderRadius: "0 14px 14px 0", ...style }} {...rest}>
      <p style={{ margin: "0 0 10px 0", fontSize: "19px", fontStyle: "italic", color: "#1e293b", lineHeight: 1.6 }}>
        "{quote}"
      </p>
      <footer style={{ fontSize: "14px", fontWeight: "600", color: "#64748b" }}>
        — {author}{citation ? \`, \${citation}\` : ""}
      </footer>
    </blockquote>
  );
}
`;
}

/**
 * Master React JSX/TSX Generator for any element
 */
function generateGenericComponent(el: EditorElement, isTsx = false): string {
  const compName = toPascalCase(el.type);
  const innerJSX = exportElementNodeToJSX(el, { isTsx, indent: "    " });

  const tsInterface = isTsx
    ? `export interface ${compName}Props {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}\n\n`
    : "";

  return `// ${compName}.${isTsx ? "tsx" : "jsx"} - Standalone Component
import React from 'react';

${tsInterface}export default function ${compName}(${isTsx ? `props: ${compName}Props` : "props"}) {
  const { className = "", style = {}, children, ...rest } = props;

  return (
${innerJSX}
  );
}
`;
}

// =========================================================================
// MAIN PUBLIC API
// =========================================================================

/**
 * 1. Generate Functional React (.jsx)
 */
export function generateJSXCode(el: EditorElement): string {
  if (!el) return "// No element selected";

  switch (el.type) {
    case "slides":
      return generateSlidesComponent(el, false);
    case "gallery":
    case "basic-gallery":
      return generateGalleryComponent(el, false);
    case "testimonial-carousel":
      return generateTestimonialsComponent(el, false);
    case "media-carousel":
    case "image-carousel":
    case "basic-media-carousel":
      return generateMediaCarouselComponent(el, false);
    case "reviews":
      return generateReviewsComponent(el, false);
    case "price-list":
      return generatePriceListComponent(el, false);
    case "form":
      return generateFormComponent(el, false);
    case "nav-menu":
    case "mega-menu":
      return generateNavMenuComponent(el, false);
    case "call-to-action":
      return generateCTAComponent(el, false);
    case "blockquote":
      return generateBlockquoteComponent(el, false);
    case "animated-headline":
      return generateAnimatedHeadlineComponent(el, false);
    case "posts":
      return generateBlogPostsComponent(el, false);
    case "price-table":
      return generatePricingTableComponent(el, false);
    case "code-highlight":
      return generateCodeHighlightComponent(el, false);
    case "countdown":
      return generateCountdownComponent(el, false);
    case "flip-box":
      return generateFlipBoxComponent(el, false);
    default:
      return generateGenericComponent(el, false);
  }
}

/**
 * 2. Generate Fully Typed React + TSX (.tsx)
 */
export function generateTSXCode(el: EditorElement): string {
  if (!el) return "// No element selected";

  switch (el.type) {
    case "slides":
      return generateSlidesComponent(el, true);
    case "gallery":
    case "basic-gallery":
      return generateGalleryComponent(el, true);
    case "testimonial-carousel":
      return generateTestimonialsComponent(el, true);
    case "media-carousel":
    case "image-carousel":
    case "basic-media-carousel":
      return generateMediaCarouselComponent(el, true);
    case "reviews":
      return generateReviewsComponent(el, true);
    case "price-list":
      return generatePriceListComponent(el, true);
    case "form":
      return generateFormComponent(el, true);
    case "nav-menu":
    case "mega-menu":
      return generateNavMenuComponent(el, true);
    case "call-to-action":
      return generateCTAComponent(el, true);
    case "blockquote":
      return generateBlockquoteComponent(el, true);
    case "animated-headline":
      return generateAnimatedHeadlineComponent(el, true);
    case "posts":
      return generateBlogPostsComponent(el, true);
    case "price-table":
      return generatePricingTableComponent(el, true);
    case "code-highlight":
      return generateCodeHighlightComponent(el, true);
    case "countdown":
      return generateCountdownComponent(el, true);
    case "flip-box":
      return generateFlipBoxComponent(el, true);
    default:
      return generateGenericComponent(el, true);
  }
}

/**
 * 3. Generate Vanilla JavaScript (.js)
 * Must be pure DOM JavaScript, NO JSX syntax!
 */
export function generateJSCode(el: EditorElement): string {
  if (!el) return "// No element selected";
  const compName = toPascalCase(el.type);

  if (el.type === "slides") {
    const slidesList = el.slidesItems && el.slidesItems.length > 0 ? el.slidesItems : [
      { id: "slide_1", title: "Empower Your Digital Growth", description: "Build high-converting modern websites with intuitive drag and drop tools.", bgImage: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1600&auto=format&fit=crop&q=80", buttonText: "Explore Features", buttonUrl: "#" },
      { id: "slide_2", title: "Designed for High Performance", description: "Lightning-fast page load speeds, automatic SEO optimization, and flawless mobile experience.", bgImage: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1600&auto=format&fit=crop&q=80", buttonText: "Start Free Trial", buttonUrl: "#" },
    ];
    const height = el.slidesHeight || "450px";

    return `// ${compName}.js - Vanilla JavaScript DOM Slideshow
export function render${compName}(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const wrap = document.createElement("div");
  wrap.style.cssText = "position: relative; width: 100%; height: ${height}; overflow: hidden; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); font-family: system-ui, sans-serif;";

  const slides = ${JSON.stringify(slidesList, null, 2)};
  let currentIdx = 0;
  const slideEls = [];

  slides.forEach((slide, idx) => {
    const s = document.createElement("div");
    s.style.cssText = "position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; padding: 48px; box-sizing: border-box; transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1); background-size: cover; background-position: center; " + (idx === 0 ? "opacity: 1; pointer-events: auto;" : "opacity: 0; pointer-events: none;");
    if (slide.bgImage) s.style.backgroundImage = "url(" + slide.bgImage + ")";
    if (slide.bgColor) s.style.backgroundColor = slide.bgColor;

    const overlay = document.createElement("div");
    overlay.style.cssText = "position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.35)); z-index: 1;";
    s.appendChild(overlay);

    const content = document.createElement("div");
    content.style.cssText = "position: relative; z-index: 2; max-width: 700px;";

    const h2 = document.createElement("h2");
    h2.textContent = slide.title;
    h2.style.cssText = "font-size: 36px; font-weight: 800; color: #fff; margin: 0 0 16px 0; line-height: 1.2;";
    content.appendChild(h2);

    if (slide.description) {
      const p = document.createElement("p");
      p.textContent = slide.description;
      p.style.cssText = "font-size: 16px; color: #e2e8f0; margin: 0 0 24px 0; line-height: 1.6;";
      content.appendChild(p);
    }

    if (slide.buttonText) {
      const btn = document.createElement("a");
      btn.textContent = slide.buttonText + " →";
      btn.href = slide.buttonUrl || "#";
      btn.style.cssText = "display: inline-block; padding: 12px 28px; background-color: #fff; color: #0f172a; border-radius: 10px; font-weight: 700; text-decoration: none;";
      content.appendChild(btn);
    }

    s.appendChild(content);
    wrap.appendChild(s);
    slideEls.push(s);
  });

  container.appendChild(wrap);

  if (slides.length > 1) {
    setInterval(() => {
      slideEls[currentIdx].style.opacity = "0";
      slideEls[currentIdx].style.pointerEvents = "none";
      currentIdx = (currentIdx + 1) % slides.length;
      slideEls[currentIdx].style.opacity = "1";
      slideEls[currentIdx].style.pointerEvents = "auto";
    }, 4000);
  }
}
`;
  }

  if (el.type === "posts") {
    const postsList = el.posts && el.posts.length > 0 ? el.posts : [
      {
        id: "post_1",
        title: "Getting Started with Modern Web Design",
        excerpt: "Discover essential techniques and best practices to craft beautiful, responsive web applications effortlessly.",
        date: "Sep 1, 2026",
        author: "Jane Doe",
        image: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&auto=format&fit=crop&q=80",
      },
      {
        id: "post_2",
        title: "Mastering Design Systems & Components",
        excerpt: "Learn how to build reusable design tokens and layout grids that scale across team workflows.",
        date: "Aug 28, 2026",
        author: "Alex Smith",
        image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80",
      }
    ];

    return `// ${compName}.js - Vanilla JavaScript DOM Component
export function render${compName}(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const grid = document.createElement("div");
  grid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; width: 100%; box-sizing: border-box; font-family: system-ui, sans-serif;";

  const posts = ${JSON.stringify(postsList, null, 2)};

  posts.forEach((post) => {
    const card = document.createElement("article");
    card.style.cssText = "display: flex; flex-direction: column; border-radius: 16px; border: 1px solid #e2e8f0; background: #fff; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);";

    if (post.image) {
      const imgWrap = document.createElement("div");
      imgWrap.style.cssText = "height: 180px; overflow: hidden;";
      const img = document.createElement("img");
      img.src = post.image;
      img.alt = post.title;
      img.style.cssText = "width: 100%; height: 100%; object-fit: cover;";
      imgWrap.appendChild(img);
      card.appendChild(imgWrap);
    }

    const body = document.createElement("div");
    body.style.cssText = "padding: 20px; display: flex; flex-direction: column; flex: 1;";

    const title = document.createElement("h3");
    title.textContent = post.title;
    title.style.cssText = "margin: 0 0 10px 0; font-size: 18px; font-weight: 700; color: #0f172a;";
    body.appendChild(title);

    if (post.excerpt) {
      const p = document.createElement("p");
      p.textContent = post.excerpt;
      p.style.cssText = "margin: 0 0 16px 0; font-size: 14px; color: #475569; line-height: 1.5; flex: 1;";
      body.appendChild(p);
    }

    card.appendChild(body);
    grid.appendChild(card);
  });

  container.appendChild(grid);
}
`;
  }

  if (el.type === "animated-headline") {
    const prefix = el.headlinePrefix ?? "Build Websites That Are";
    const words = el.headlineAnimatedTexts && el.headlineAnimatedTexts.length > 0
      ? el.headlineAnimatedTexts
      : ["Stunning", "Blazing Fast", "Ultra Flexible", "Powerful"];
    const suffix = el.headlineSuffix ?? "With ForgeStudio";
    const highlightColor = el.headlineHighlightColor || "#2563eb";
    const highlightBg = el.headlineHighlightBg || "rgba(239, 246, 255, 1)";

    return `// ${compName}.js - Vanilla JavaScript Animated Headline
export function render${compName}(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const wrap = document.createElement("div");
  wrap.style.cssText = "width: 100%; text-align: center; font-size: 32px; font-weight: 800; color: #0f172a; margin: 20px 0; font-family: system-ui, sans-serif;";

  const prefixSpan = document.createElement("span");
  prefixSpan.textContent = ${JSON.stringify(prefix + " ")};

  const badge = document.createElement("span");
  badge.style.cssText = "display: inline-block; border-radius: 6px; padding: 2px 8px; color: ${highlightColor}; background-color: ${highlightBg};";

  const suffixSpan = document.createElement("span");
  suffixSpan.textContent = ${JSON.stringify(" " + suffix)};

  wrap.appendChild(prefixSpan);
  wrap.appendChild(badge);
  wrap.appendChild(suffixSpan);
  container.appendChild(wrap);

  const words = ${JSON.stringify(words)};
  let wordIdx = 0;
  let charIdx = 0;
  let isDeleting = false;

  function type() {
    const currentWord = words[wordIdx % words.length];
    if (isDeleting) {
      badge.textContent = currentWord.substring(0, charIdx - 1) + "|";
      charIdx--;
      if (charIdx === 0) {
        isDeleting = false;
        wordIdx++;
        setTimeout(type, 300);
        return;
      }
    } else {
      badge.textContent = currentWord.substring(0, charIdx + 1) + "|";
      charIdx++;
      if (charIdx === currentWord.length) {
        isDeleting = true;
        setTimeout(type, 1800);
        return;
      }
    }
    setTimeout(type, isDeleting ? 40 : 80);
  }
  type();
}
`;
  }

  // Generic Vanilla JS DOM renderer
  const tag = el.type === "button" ? "button" : el.type === "heading" ? (el.headingLevel || "h2") : el.type === "image" ? "img" : "div";
  const stylesObj = getMergedStyles(el, "desktop", "normal");

  return `// ${compName}.js - Vanilla JavaScript DOM Component
export function render${compName}(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const element = document.createElement("${tag}");
  ${el.customId ? `element.id = "${el.customId}";` : ""}
  ${el.classes && el.classes.length > 0 ? `element.className = "${el.classes.join(" ")}";` : ""}
  element.style.cssText = "${formatStylesToCSS(stylesObj)}";

  ${el.content ? `element.textContent = ${JSON.stringify(el.content)};` : ""}
  ${el.src ? `element.setAttribute("src", ${JSON.stringify(el.src)});` : ""}
  ${el.href ? `element.setAttribute("href", ${JSON.stringify(el.href)});` : ""}

  container.appendChild(element);
}
`;
}

/**
 * 4. Generate Type-Safe TypeScript (.ts)
 * Must be pure TypeScript DOM class, NO JSX syntax!
 */
export function generateTSCode(el: EditorElement): string {
  if (!el) return "// No element selected";
  const compName = toPascalCase(el.type);
  const stylesObj = getMergedStyles(el, "desktop", "normal");
  const tag = el.type === "button" ? "button" : el.type === "heading" ? (el.headingLevel || "h2") : el.type === "image" ? "img" : "div";

  return `// ${compName}.ts - Type-Safe DOM Component Generator
export interface ${compName}Props {
  id?: string;
  className?: string;
  content?: string;
  src?: string;
  href?: string;
  styles?: Partial<CSSStyleDeclaration>;
}

export class ${compName}Component {
  private props: ${compName}Props;

  constructor(props: ${compName}Props = {}) {
    this.props = {
      id: ${JSON.stringify(el.customId || "")},
      className: ${JSON.stringify((el.classes || []).join(" "))},
      content: ${JSON.stringify(el.content || "")},
      src: ${JSON.stringify(el.src || "")},
      href: ${JSON.stringify(el.href || "")},
      ...props
    };
  }

  public render(target: HTMLElement): HTMLElement {
    const el = document.createElement("${tag}");
    if (this.props.id) el.id = this.props.id;
    if (this.props.className) el.className = this.props.className;
    el.style.cssText = "${formatStylesToCSS(stylesObj)}";

    if (this.props.content) el.textContent = this.props.content;
    if (this.props.src) el.setAttribute("src", this.props.src);
    if (this.props.href) el.setAttribute("href", this.props.href);

    target.appendChild(el);
    return el;
  }
}
`;
}

/**
 * Universal code export helper for any element and format
 */
export function exportCode(el: EditorElement, format: "js" | "ts" | "jsx" | "tsx" = "jsx"): string {
  switch (format) {
    case "js":
      return generateJSCode(el);
    case "ts":
      return generateTSCode(el);
    case "jsx":
      return generateJSXCode(el);
    case "tsx":
      return generateTSXCode(el);
    default:
      return generateJSXCode(el);
  }
}
