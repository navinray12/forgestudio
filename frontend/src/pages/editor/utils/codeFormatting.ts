/** Convert editor identifiers to stable generated component names. */
export function toPascalCase(value?: string): string {
  if (!value) return "Component";
  const friendly: Record<string, string> = {
    posts: "BlogPosts", portfolio: "PortfolioGrid", "animated-headline": "AnimatedHeadline",
    "price-table": "PricingTable", "price-list": "PriceList", "call-to-action": "CallToAction",
    "flip-box": "FlipBox", "nav-menu": "NavMenu", "mega-menu": "MegaMenu",
    "code-highlight": "CodeHighlight", countdown: "CountdownTimer", "testimonial-carousel": "TestimonialsSlider",
    "basic-gallery": "ImageGallery", gallery: "PhotoGallery", "media-carousel": "MediaCarousel",
    slides: "HeroSlides", "share-buttons": "ShareButtons", "social-icons": "SocialIcons",
    "progress-bar": "ProgressBar", rating: "RatingStars", alert: "AlertBanner",
    counter: "AnimatedCounter", blockquote: "QuoteBlock", "video-playlist": "VideoPlaylist",
    "audio-playlist": "AudioPlaylist", "table-of-contents": "TableOfContents",
    "paypal-button": "PayPalCheckout", "stripe-button": "StripeCheckout", container: "SectionContainer",
    button: "ActionButton", heading: "SectionHeading", text: "TextBlock", paragraph: "ParagraphBlock",
    image: "ResponsiveImage", video: "VideoPlayer", divider: "ContentDivider", spacer: "LayoutSpacer",
  };
  if (friendly[value.toLowerCase()]) return friendly[value.toLowerCase()];
  let result = value.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join("");
  if (/^[0-9]/.test(result)) result = `Comp${result}`;
  return result || "Component";
}

export function formatStylesToCSS(styles: Record<string, unknown> = {}): string {
  if (!styles || Object.keys(styles).length === 0) return "";
  return Object.entries(styles)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${value};`)
    .join(" ");
}

export function formatStylesToJSX(styles: Record<string, unknown> = {}): string {
  if (!styles || Object.keys(styles).length === 0) return "{}";
  return JSON.stringify(Object.fromEntries(Object.entries(styles)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")), null, 2);
}
