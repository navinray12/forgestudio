import React from "react";

// ==========================================
// EDITOR TYPES, INTERFACES & REGISTRY
// ==========================================

export type ElementType =
  | "container" | "heading" | "text" | "image" | "video" | "button"
  | "divider" | "spacer" | "icon" | "rating" | "progress-bar" | "counter"
  | "html" | "shortcode" | "alert" | "social-icons" | "google-maps" | "soundcloud"
  | "div-block" | "paragraph" | "posts" | "share-buttons" | "portfolio"
  | "slides" | "form" | "login" | "nav-menu" | "animated-headline"
  | "price-table" | "price-list" | "gallery" | "flip-box" | "call-to-action"
  | "media-carousel" | "testimonial-carousel" | "nested-carousel" | "loop-carousel"
  | "table-of-contents" | "countdown" | "facebook-page" | "blockquote"
  | "template" | "reviews" | "facebook-button" | "facebook-embed"
  | "facebook-comments" | "paypal-button" | "stripe-button" | "lottie"
  | "code-highlight" | "video-playlist" | "image-carousel" | "mega-menu"
  | "off-canvas" | "search-bar" | "import-asset" | "favorite-widgets"
  | "reusable-components" | "basic-media-carousel" | "basic-gallery"
  | "audio-playlist" | "dynamic-lightbox" | "custom-svg" | "icon-library"
  | "wc-product-title" | "wc-product-price" | "wc-product-images"
  | "wc-add-to-cart" | "wc-product-rating" | "wp-menu" | "menu-widget"
  | "breadcrumbs" | "menu-anchor" | "post-nav" | "off-canvas-nav"
  | "site-search" | "search-form" | "taxonomy-filter"
  | "facebook-integration" | "facebook-feed" | "facebook-like-button"
  | "google-calendar" | "paypal" | "stripe" | "wordpress-shortcode"
  | "dynamic-data" | "lms-compat" | "crm-integration" | "webhook-integration";

export interface SiteProduct {
  id: string;
  name: string;
  price: string;
  regularPrice?: string;
  image?: string;
  description?: string;
  rating?: number;
  ratingCount?: number;
  badge?: string;
  category?: string;
  inStock?: boolean;
  url?: string;
}

export interface NavSubmenuItem {
  id: string;
  label: string;
  url: string;
  destinationType?: "page" | "url" | "anchor" | "product";
  pageId?: string;
  productId?: string;
  linkType?: "page" | "url" | "anchor" | "product";
  target?: "_self" | "_blank";
  icon?: string;
  description?: string;
  badge?: string;
  image?: string;
  isDisabled?: boolean;
}

export interface NavMenuItem {
  id: string;
  label: string;
  url: string;
  destinationType?: "page" | "url" | "anchor" | "product";
  pageId?: string;
  productId?: string;
  linkType?: "page" | "url" | "anchor" | "product";
  isActive?: boolean;
  isDisabled?: boolean;
  target?: "_self" | "_blank";
  badge?: string;
  badgeColor?: string;
  icon?: string;
  iconPosition?: "left" | "right";
  dropdownEnabled?: boolean;
  trigger?: "click" | "hover";
  visibility?: {
    desktop?: boolean;
    tablet?: boolean;
    mobile?: boolean;
  };
  submenu?: NavSubmenuItem[];
  children?: Array<{
    id: string;
    label: string;
    url: string;
    linkType?: "page" | "url";
    pageId?: string;
    target?: "_self" | "_blank";
    badge?: string;
    description?: string;
  }>;
}

export interface PricePlanFeature {
  id: string;
  text: string;
  included: boolean;
}

export interface PricingPlan {
  id: string;
  name: string;
  description?: string;
  price: string;
  currency?: string;
  period: string;
  isPopular?: boolean;
  isRecommended?: boolean;
  badgeText?: string;
  showBadge?: boolean;
  buttonText: string;
  buttonUrl: string;
  buttonAlignment?: "left" | "center" | "right" | "full";
  buttonWidth?: "auto" | "full";
  cardBg?: string;
  cardBorder?: string;
  cardTextColor?: string;
  features: PricePlanFeature[];
}

export interface PriceListItem {
  id: string;
  name: string;
  title?: string;
  description?: string;
  price: string;
  imageUrl?: string;
  icon?: string;
  imagePos?: "left" | "right";
}

export interface GalleryImageItem {
  id: string;
  url: string;
  caption?: string;
  altText?: string;
}

export type AnimatedHeadlineStyle = "typing" | "fade" | "slide-up" | "zoom" | "flip" | "highlight";

export interface WidgetRegistryItem {
  type: ElementType;
  name: string;
  category: "Layout" | "Basic" | "Content" | "Interactive" | "Media" | "Commerce" | "Social";
  icon: string;
  description: string;
}

export const ALL_WIDGET_REGISTRY: WidgetRegistryItem[] = [
  // Layout
  { type: "container", name: "Container", category: "Layout", icon: "📦", description: "Flexbox layout section container for nesting elements" },
  { type: "off-canvas", name: "Off Canvas", category: "Layout", icon: "🚪", description: "Sliding drawer panel container for navigation & tools" },
  { type: "mega-menu", name: "Mega Menu", category: "Layout", icon: "📑", description: "Multi-column rich navigation dropdown header" },
  { type: "nav-menu", name: "Nav Menu", category: "Layout", icon: "🧭", description: "Horizontal or vertical site navigation menu" },
  
  // Basic
  { type: "search-bar", name: "Search Bar", category: "Basic", icon: "🔍", description: "Sidebar active widgets search filter bar" },
  { type: "import-asset", name: "Import Asset / File", category: "Basic", icon: "📁", description: "Direct file upload button for images, vectors & media assets" },
  { type: "favorite-widgets", name: "Favorite Widgets", category: "Basic", icon: "⭐", description: "Pinned quick access favorite widgets section" },
  { type: "reusable-components", name: "Reusable Components", category: "Basic", icon: "🧩", description: "Saved custom reusable components section" },
  { type: "heading", name: "Heading", category: "Basic", icon: "🔤", description: "SEO titles and headings (H1 to H6)" },
  { type: "text", name: "Text", category: "Basic", icon: "📝", description: "Paragraph copy and body text blocks" },
  { type: "button", name: "Button", category: "Basic", icon: "🔘", description: "Interactive call-to-action button" },
  { type: "blockquote", name: "Blockquote", category: "Basic", icon: "💬", description: "Stylized quote section with author & citation" },
  { type: "template", name: "Template", category: "Basic", icon: "🧱", description: "Preset section templates (Hero, Features, CTA)" },

  // Content
  { type: "posts", name: "Posts", category: "Content", icon: "📰", description: "Blog posts and articles grid layout" },
  { type: "portfolio", name: "Portfolio", category: "Content", icon: "💼", description: "Filterable project showcase portfolio grid" },
  { type: "price-table", name: "Price Table", category: "Content", icon: "🏷️", description: "SaaS pricing table card with features list" },
  { type: "price-list", name: "Price List", category: "Content", icon: "📋", description: "Menu or service items price list" },
  { type: "reviews", name: "Reviews", category: "Content", icon: "⭐", description: "Customer reviews and rating cards" },
  { type: "table-of-contents", name: "Table of Contents", category: "Content", icon: "📌", description: "Automated table of contents index" },
  { type: "countdown", name: "Countdown", category: "Content", icon: "⏱️", description: "Real-time launch & promotion countdown timer" },

  // Interactive
  { type: "animated-headline", name: "Animated Headline", category: "Interactive", icon: "✨", description: "Dynamic rotating text headline animation" },
  { type: "flip-box", name: "Flip Box", category: "Interactive", icon: "🔄", description: "3D flip card with front and back content" },
  { type: "call-to-action", name: "Call to Action", category: "Interactive", icon: "🎯", description: "High-conversion banner with button" },
  { type: "code-highlight", name: "Code Highlight", category: "Interactive", icon: "💻", description: "Syntax highlighted code snippet viewer" },
  { type: "lottie", name: "Lottie Animation", category: "Interactive", icon: "🎨", description: "JSON vector animation player" },
  { type: "form", name: "Form", category: "Interactive", icon: "📋", description: "Custom contact form builder" },
  { type: "login", name: "Login", category: "Interactive", icon: "🔐", description: "User login interface card" },

  // Media (F-212 to F-222)
  { type: "video", name: "Video Widget", category: "Media", icon: "🎬", description: "Display and embed videos from YouTube, Vimeo, or HTML5 source" },
  { type: "image", name: "Image Widget", category: "Media", icon: "🖼️", description: "Display and style single images with object fit and responsive options" },
  { type: "gallery", name: "Gallery", category: "Media", icon: "🖼️", description: "Responsive image grid with lightbox modal" },
  { type: "basic-gallery", name: "Basic Gallery", category: "Media", icon: "📱", description: "Lightweight simple grid image gallery" },
  { type: "slides", name: "Slides", category: "Media", icon: "🎞️", description: "Interactive hero banner slider" },
  { type: "media-carousel", name: "Media Carousel", category: "Media", icon: "🎡", description: "Image and video slider carousel" },
  { type: "basic-media-carousel", name: "Basic Media Carousel", category: "Media", icon: "🎠", description: "Lightweight mixed media carousel slider" },
  { type: "testimonial-carousel", name: "Testimonial Carousel", category: "Media", icon: "💬", description: "Rotational feedback quote carousel" },
  { type: "nested-carousel", name: "Nested Carousel", category: "Media", icon: "🎠", description: "Container carousel supporting nested elements" },
  { type: "loop-carousel", name: "Loop Carousel", category: "Media", icon: "♾️", description: "Infinite continuous scrolling marquee carousel" },
  { type: "video-playlist", name: "Video Playlist", category: "Media", icon: "📺", description: "Multi-video playlist player with manual controls" },
  { type: "audio-playlist", name: "Audio Playlist", category: "Media", icon: "🎵", description: "Interactive multi-track audio player playlist" },
  { type: "image-carousel", name: "Image Carousel", category: "Media", icon: "🖼️", description: "Rotating image collections with responsive navigation controls" },
  { type: "dynamic-lightbox", name: "Dynamic Lightbox", category: "Media", icon: "🔍", description: "Full-screen media lightbox modal overlay with smooth transitions" },
  { type: "custom-svg", name: "SVG / Custom Icon", category: "Media", icon: "⚡", description: "Sanitized custom SVG vector graphic asset viewer" },
  { type: "icon-library", name: "Icon Library", category: "Media", icon: "🎨", description: "Searchable ready-to-use vector icon picker library" },

  // WooCommerce Store Widgets
  { type: "wc-product-title", name: "Product Title", category: "Commerce", icon: "🏷️", description: "Displays WooCommerce product title" },
  { type: "wc-product-price", name: "Product Price", category: "Commerce", icon: "💰", description: "Displays product pricing & sale discounts" },
  { type: "wc-product-images", name: "Product Images", category: "Commerce", icon: "🖼️", description: "Displays main product gallery & thumbnails" },
  { type: "wc-add-to-cart", name: "Add to Cart", category: "Commerce", icon: "🛒", description: "Customizable purchase & add to cart button" },
  { type: "wc-product-rating", name: "Product Rating", category: "Commerce", icon: "⭐", description: "Displays product review star rating" },

  // Commerce
  { type: "paypal-button", name: "PayPal Button", category: "Commerce", icon: "💳", description: "Direct PayPal express checkout button" },
  { type: "stripe-button", name: "Stripe Button", category: "Commerce", icon: "💳", description: "Stripe payment link checkout button" },

  // Social
  { type: "share-buttons", name: "Share Buttons", category: "Social", icon: "🔗", description: "Social media sharing action buttons" },
  { type: "facebook-page", name: "Facebook Integration", category: "Social", icon: "📘", description: "Facebook Page feed, Like button, Post embed & Comments widget" },
];

export const DEFAULT_VISIBLE_WIDGETS: ElementType[] = ALL_WIDGET_REGISTRY.map((w) => w.type);

export type DeviceMode = "desktop" | "tablet" | "mobile";
export interface Breakpoint { id: string; name: string; width: number; active?: boolean; }

export interface PageConfig {
  id: string;
  name: string;
  slug: string;
  customCss?: string;
  isHome?: boolean;
  pageSettings?: any;
  elements: EditorElement[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PlaylistItem {
  id: string;
  title: string;
  url?: string;
  videoUrl?: string;
  duration?: string;
  thumbnailUrl?: string;
  thumbnail?: string;
}

export interface ImageCarouselItem {
  id: string;
  url: string;
  alt?: string;
  caption?: string;
  title?: string;
  linkUrl?: string;
}

export interface MediaCarouselItem {
  id: string;
  type?: "image" | "video";
  url: string;
  image?: string;
  videoUrl?: string;
  posterUrl?: string;
  title?: string;
  caption?: string;
  altText?: string;
}

export interface MegaMenuColumnLink {
  id?: string;
  label: string;
  href: string;
  destinationType?: "page" | "url" | "anchor" | "product";
  pageId?: string;
  productId?: string;
  linkType?: "page" | "url" | "anchor" | "product";
  target?: "_self" | "_blank";
  icon?: string;
  badge?: string;
  description?: string;
  image?: string;
  children?: MegaMenuColumnLink[];
}

export interface MegaMenuColumn {
  id?: string;
  title: string;
  links: MegaMenuColumnLink[];
}

export interface MegaMenuItem {
  id: string;
  title: string;
  href?: string;
  destinationType?: "page" | "url" | "anchor" | "product";
  pageId?: string;
  productId?: string;
  linkType?: "page" | "url" | "anchor" | "product";
  target?: "_self" | "_blank";
  badge?: string;
  icon?: string;
  trigger?: "click" | "hover";
  columns?: MegaMenuColumn[];
}

export interface TestimonialItem {
  id: string;
  quote: string;
  name: string;
  role: string;
  avatarUrl?: string;
  rating?: number;
}

export interface ReviewItem {
  id: string;
  reviewerName: string;
  reviewerTitle?: string;
  reviewText: string;
  rating: number;
  avatarUrl?: string;
  verified?: boolean;
}

export interface LoopCarouselItem {
  id: string;
  title: string;
  description?: string;
  badge?: string;
  imageUrl?: string;
  linkUrl?: string;
  buttonText?: string;
}

export type FormFieldType =
  | "text"
  | "email"
  | "number"
  | "tel"
  | "textarea"
  | "select"
  | "checkbox"
  | "radio";

export interface FormStepItem {
  id: string;
  title: string;
  description?: string;
}

export interface FormFieldItem {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  defaultValue?: string;
  width?: "full" | "half";
  stepId?: string;
}

export interface SlideItem {
  id: string;
  title: string;
  description?: string;
  bgImage?: string;
  bgColor?: string;
  buttonText?: string;
  buttonUrl?: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  image: string;
  url?: string;
  link?: string;
  category?: string;
}

export type ShareNetworkType =
  | "facebook"
  | "twitter"
  | "linkedin"
  | "whatsapp"
  | "pinterest"
  | "reddit"
  | "email"
  | "copy";

export interface ShareNetworkItem {
  id: string;
  network: ShareNetworkType;
  label?: string;
  urlSource?: "inherit" | "custom";
  customUrl?: string;
  shareText?: string;
  hashtags?: string;
  isDisabled?: boolean;
}

export interface PostItem {
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

export interface ContainerLayout {
  layoutType?: string;
  direction?: "column" | "row";
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
  alignItems?: "stretch" | "flex-start" | "center" | "flex-end";
  gap?: number;
rowGap?: number | string;
  columnGap?: number | string;

  // CSS Grid Controls (F-041, F-043)
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridAutoFlow?: "row" | "column" | "dense" | "row dense" | "column dense";
  justifyItems?: "stretch" | "start" | "center" | "end";

  // Masonry Controls
  masonryColumns?: number;
  masonryGap?: number | string;
}

export interface ElementStyles {
  [key: string]: any;
  objectFit?: string;
  backgroundType?: string;
  backgroundSlideshowUrls?: string[] | string;
  backgroundSlideshowSpeed?: number;
  color?: string;
  fontSize?: string;
  fontWeight?: string;
  textAlign?: "left" | "center" | "right" | "justify";
  backgroundColor?: string;
  padding?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  borderRadius?: string;
  width?: string;
  height?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  lineHeight?: string;

// Alignment & Self Alignment
  alignSelf?: "auto" | "flex-start" | "center" | "flex-end" | "stretch" | "baseline";
  justifySelf?: "auto" | "start" | "center" | "end" | "stretch";

  // Position & Stacking Controls (F-047, F-048, F-049)
  position?: "static" | "relative" | "absolute" | "fixed" | "sticky";
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  zIndex?: string | number;

  // Grid Child Placement
  gridColumn?: string;
  gridRow?: string;
  gridColumnSpan?: number;
  gridRowSpan?: number;

  // Scroll & Scroll Snap
  scrollSnapType?: "none" | "x mandatory" | "y mandatory" | "x proximity" | "y proximity" | "both mandatory";
  scrollSnapAlign?: "none" | "start" | "center" | "end";
  scrollSnapStop?: "normal" | "always";
  scrollPadding?: string;
  scrollMargin?: string;
  scrollBehavior?: "smooth" | "auto";
  overflowX?: "visible" | "hidden" | "scroll" | "auto";
  overflowY?: "visible" | "hidden" | "scroll" | "auto";

  // Typography Controls (F-070, F-089)
  fontFamily?: string;
  fontStyle?: "normal" | "italic";
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  textDecoration?: "none" | "underline" | "overline" | "line-through";
  letterSpacing?: string;
  textShadow?: string;
  backgroundImage?: string;
  backgroundPosition?: "center" | "top" | "bottom" | "left" | "right";
  backgroundSize?: "cover" | "contain" | "auto";
  backgroundRepeat?: "no-repeat" | "repeat" | "repeat-x" | "repeat-y";
  borderStyle?: "none" | "solid" | "dashed" | "dotted";
  borderWidth?: string;
  borderColor?: string;
  borderTopLeftRadius?: string;
  borderTopRightRadius?: string;
  borderBottomRightRadius?: string;
  borderBottomLeftRadius?: string;
  boxShadow?: string;
  objectPosition?: string;
  mixBlendMode?: string;

  // CSS Filters & Masks (F-084, F-085)
  filterBlur?: string;
  filterBrightness?: string;
  filterContrast?: string;
  filterGrayscale?: string;
  filterSaturate?: string;
  filterHueRotate?: string;
  clipPath?: string;

  // CSS Transform
  transformRotate?: string;
  transformScale?: string;
  transformSkewX?: string;
  transformSkewY?: string;
  transformTranslateX?: string;
  transformTranslateY?: string;

  // Text Stroke & Mask (F-087, F-088)
  textStrokeWidth?: string;
  textStrokeColor?: string;
  textMaskType?: "none" | "gradient" | "image";
  textMaskGradient?: string;
  textMaskImage?: string;

  // Ken Burns Effect
  kenBurnsEffect?: "none" | "zoom-in" | "zoom-out";
  textPathEnabled?: "true" | "false";

  // Shape Dividers
  dividerTopEnabled?: "true" | "false";
  dividerTopStyle?: "waves" | "curves" | "slant" | "triangle";
  dividerTopColor?: string;
  dividerTopHeight?: string;
  dividerBottomEnabled?: "true" | "false";
  dividerBottomStyle?: "waves" | "curves" | "slant" | "triangle";
  dividerBottomColor?: string;
  dividerBottomHeight?: string;

  // Motion & Interaction (F-123 - F-141)
  entranceAnimation?: "none" | "fade-in" | "fade-in-up" | "fade-in-down" | "zoom-in" | "slide-up" | "slide-down" | "bounce-in";
  entranceDuration?: string;
  entranceDelay?: string;
  hoverScale?: string;
  hoverRotate?: string;
  hoverTranslateY?: string;
  hoverOpacity?: string;
  hoverTransitionDuration?: string;
  mouseTrackEnabled?: "true" | "false";
  mouseTrackSpeed?: string;
  tilt3DEnabled?: "true" | "false";
  tilt3DMax?: string;
  scrollEffectsEnabled?: "true" | "false";
  scrollSpeedX?: string;
  scrollSpeedY?: string;
  scrollTransparency?: "none" | "fade-in" | "fade-out" | "fade-in-out";
  scrollRotate?: string;
  scrollBlur?: string;
  scrollScale?: string;
  stickyPosition?: "none" | "top" | "bottom";
  stickyOffset?: string;
  interactionTrigger?: "none" | "click" | "hover" | "dblclick";
  interactionAction?: "none" | "toggle-class" | "show-hide" | "alert" | "scroll-to";
  interactionTargetId?: string;
  interactionActionValue?: string;

  // Widget Options (F-142 - F-173)
  videoProvider?: "youtube" | "vimeo" | "hosted";
  videoAutoplay?: "true" | "false";
  videoControls?: "true" | "false";
  dividerStyle?: "solid" | "dashed" | "dotted";
  dividerColor?: string;
  dividerHeight?: string;
  dividerWidth?: string;
  iconName?: string;
  iconSize?: string;
  iconColor?: string;
  ratingStarsCount?: string;
  ratingValue?: string;
  ratingColor?: string;
  ratingSize?: string;
  progressPercent?: string;
  progressColor?: string;
  progressLabel?: string;
  counterStart?: string;
  counterEnd?: string;
  counterPrefix?: string;
  counterSuffix?: string;
  counterDuration?: string;
  alertType?: "info" | "success" | "warning" | "danger";
  alertDismissible?: "true" | "false";
  socialFacebook?: string;
  socialTwitter?: string;
  socialInstagram?: string;
  socialLinkedin?: string;
  socialYoutube?: string;
  socialIconSize?: string;
  socialIconColor?: string;
}

export type ElementState = "normal" | "hover";

export interface EditorElement {
  id: string;
  type: ElementType;
  content: string;
  isProtected?: boolean;
  src?: string;
  alt?: string;
  href?: string;
  linkPageId?: string;
  linkType?: "page" | "url" | "anchor" | "product" | string;
  destinationType?: "page" | "url" | "anchor" | "product";
  pageId?: string;
  rel?: string;
  download?: boolean;
  assetType?: "image" | "video" | "audio" | "file";
  searchPlaceholder?: string;
  searchButtonText?: string;
  searchIcon?: string;
  searchAction?: "modal" | "redirect" | "filter";
  searchRedirectUrl?: string;
  searchShowButton?: boolean;
  posts?: PostItem[];
  postsColumns?: number;
  postsGap?: number;
  postsImageHeight?: string;
  postsShowImage?: boolean;
  postsShowDate?: boolean;
  postsShowExcerpt?: boolean;
  postsShowReadMore?: boolean;
  postsAlignment?: "left" | "center" | "right";
  shareUrlSource?: "current-page" | "custom";
  shareUrl?: string;
  shareText?: string;
  shareHashtags?: string;
  shareNetworks?: ShareNetworkItem[];
  shareLayout?: "horizontal" | "vertical";
  shareAlignment?: "left" | "center" | "right";
  shareGap?: number;
  shareShowLabels?: boolean;
  shareButtonStyle?: "brand" | "solid" | "outline";
  shareButtonSize?: "sm" | "md" | "lg";
  portfolioItems?: PortfolioItem[];
  portfolioColumns?: number;
  portfolioGap?: number;
  portfolioImageHeight?: string;
  portfolioAlignment?: "left" | "center" | "right";
  portfolioShowCategory?: boolean;
  portfolioShowDescription?: boolean;
  portfolioShowLink?: boolean;
  slides?: any[];
  testimonials?: any[];
  reviews?: any[];
  slidesItems?: SlideItem[];
  slidesActiveIndex?: number;
  slidesAutoplay?: boolean;
  slidesAutoplayInterval?: number;
  slidesTransition?: "slide" | "fade";
  slidesHeight?: string;
  slidesAlignment?: "left" | "center" | "right";
  slidesShowArrows?: boolean;
  slidesShowDots?: boolean;
  formMode?: "simple" | "step-by-step";
  formSteps?: FormStepItem[];
  formNextText?: string;
  formBackText?: string;
  formBackBtnBg?: string;
  formBackBtnColor?: string;
  formTitle?: string;
  formSubtitle?: string;
  formCardBg?: string;
  formCardBorder?: string;
  formFields?: FormFieldItem[];
  formSubmitText?: string;
  formSubmitSuccessMsg?: string;
  formLayoutColumns?: 1 | 2;
  formFieldGap?: number;
  formShowLabels?: boolean;
  formSubmitBtnBg?: string;
  formSubmitBtnColor?: string;
  formSubmitBtnFullWidth?: boolean;
  loginTitle?: string;
  loginSubtitle?: string;
  loginEmailLabel?: string;
  loginEmailPlaceholder?: string;
  loginPasswordLabel?: string;
  loginPasswordPlaceholder?: string;
  loginShowRememberMe?: boolean;
  loginShowForgotPassword?: boolean;
  loginForgotPasswordText?: string;
  loginForgotPasswordUrl?: string;
  loginButtonText?: string;
  loginButtonBg?: string;
  loginButtonColor?: string;
  loginCardBg?: string;
  loginCardBorder?: string;
  loginShowSocialButtons?: boolean;
  navMenuItems?: NavMenuItem[];
  navLayout?: "horizontal" | "vertical";
  navAlignment?: "left" | "center" | "right" | "between";
  navGap?: number;
  navItemColor?: string;
  navItemHoverColor?: string;
  navItemActiveColor?: string;
  navItemBg?: string;
  navItemHoverBg?: string;
  navItemActiveBg?: string;
  navFontSize?: string;
  navFontWeight?: string;
  navTextTransform?: "none" | "uppercase" | "capitalize";
  navSubmenuBg?: string;
  navSubmenuTextColor?: string;
  navSubmenuHoverBg?: string;
  navSubmenuHoverColor?: string;
  headlinePrefix?: string;
  headlineAnimatedTexts?: string[];
  headlineSuffix?: string;
  headlineAnimationType?: AnimatedHeadlineStyle;
  headlineAnimationSpeed?: number;
  headlineHighlightColor?: string;
  headlineHighlightBg?: string;
  headlineTag?: "h1" | "h2" | "h3" | "h4" | "p";
  pricingPlans?: PricingPlan[];
  pricingColumns?: 1 | 2 | 3 | 4;
  pricingGap?: number;
  pricingAlignment?: "left" | "center" | "right";
  pricingCardBg?: string;
  pricingCardBorder?: string;
  pricingCardRadius?: string;
  pricingHighlightColor?: string;
  pricingBtnBg?: string;
  pricingBtnColor?: string;
  pricingBtnHoverBg?: string;
  pricingBtnHoverColor?: string;
  priceListItems?: PriceListItem[];
  priceListGap?: number;
  priceListShowImages?: boolean;
  priceListImageSize?: number;
  priceListSeparatorStyle?: "dotted" | "dashed" | "solid" | "none";
  priceListTitleColor?: string;
  priceListPriceColor?: string;
  priceListPriceBg?: string;
  priceListAlignment?: "left" | "center" | "right";
  priceListIconColor?: string;
  galleryImages?: GalleryImageItem[];
  galleryColumns?: 1 | 2 | 3 | 4 | 5 | 6;
  galleryGap?: number;
  galleryRowGap?: number;
  galleryAspectRatio?: "square" | "landscape" | "portrait" | "auto";
  galleryShowCaptions?: boolean;
  galleryCaptionPosition?: "overlay" | "below";
  galleryCaptionColor?: string;
  galleryHoverEffect?: "zoom" | "fade" | "lift" | "none";
  galleryBorderRadius?: string;
  galleryObjectFit?: "cover" | "contain" | "fill";
  flipDirection?: "flip-right" | "flip-left" | "flip-up" | "flip-down";
  flipDuration?: string;
  flipCardHeight?: string;
  flipBorderRadius?: string;
  flipAlignment?: "left" | "center" | "right";
  flipFrontTitle?: string;
  flipFrontDescription?: string;
  flipFrontIcon?: string;
  flipFrontImage?: string;
  flipFrontBg?: string;
  flipFrontTextColor?: string;
  flipBackTitle?: string;
  flipBackDescription?: string;
  flipBackBg?: string;
  flipBackImage?: string;
  flipBackTextColor?: string;
  flipBackBtnText?: string;
  flipBackBtnUrl?: string;
  flipBackBtnBg?: string;
  flipBackBtnTextColor?: string;
  flipBackBtnHoverBg?: string;
  flipBackBtnHoverTextColor?: string;
  flipIsFlippedManual?: boolean;
  ctaHeading?: string;
  ctaDescription?: string;
  ctaButtonText?: string;
  ctaButtonUrl?: string;
  ctaButtonBg?: string;
  ctaButtonTextColor?: string;
  ctaButtonHoverBg?: string;
  ctaButtonBorderRadius?: string;
  ctaIcon?: string;
  ctaImage?: string;
  ctaLayout?: "centered" | "left-aligned" | "split";
  ctaCardBg?: string;
  ctaCardBorderColor?: string;
  ctaCardBorderRadius?: string;
  ctaTextColor?: string;
  mediaCarouselItems?: MediaCarouselItem[];
  mediaCarouselSlidesPerView?: 1 | 2 | 3 | 4;
  mediaCarouselGap?: number;
  mediaCarouselAutoplay?: boolean;
  mediaCarouselAutoplaySpeed?: number;
  mediaCarouselLoop?: boolean;
  mediaCarouselShowNav?: boolean;
  mediaCarouselShowDots?: boolean;
  mediaCarouselAspectRatio?: "square" | "landscape" | "portrait" | "video" | "auto";
  mediaCarouselBorderRadius?: string;
  mediaCarouselTransition?: "slide" | "fade";
  mediaCarouselTransitionSpeed?: number;
  mediaCarouselImageSizing?: "cover" | "contain" | "fill";
  mediaCarouselCardBg?: string;
  mediaCarouselTextColor?: string;
  mediaCarouselOverlayBg?: string;
  testimonialItems?: TestimonialItem[];
  testimonialSlidesPerView?: 1 | 2 | 3;
  testimonialGap?: number;
  testimonialAutoplay?: boolean;
  testimonialAutoplaySpeed?: number;
  testimonialLoop?: boolean;
  testimonialShowNav?: boolean;
  testimonialShowDots?: boolean;
  testimonialCardBg?: string;
  testimonialCardBorderRadius?: string;
  testimonialTextColor?: string;
  testimonialStarColor?: string;
  nestedCarouselSlidesPerView?: 1 | 2 | 3;
  nestedCarouselGap?: number;
  nestedCarouselAutoplay?: boolean;
  nestedCarouselAutoplaySpeed?: number;
  nestedCarouselLoop?: boolean;
  nestedCarouselShowNav?: boolean;
  nestedCarouselShowDots?: boolean;
  nestedCarouselSlideBg?: string;
  nestedCarouselBorderRadius?: string;
  loopCarouselItems?: LoopCarouselItem[];
  loopCarouselSlidesPerView?: 1 | 2 | 3 | 4;
  loopCarouselGap?: number;
  loopCarouselAutoplay?: boolean;
  loopCarouselAutoplaySpeed?: number;
  loopCarouselLoop?: boolean;
  loopCarouselShowNav?: boolean;
  loopCarouselShowDots?: boolean;
  loopCarouselTransition?: "slide" | "fade" | "continuous";
  loopCarouselCardBg?: string;
  loopCarouselBorderRadius?: string;
  loopCarouselTextColor?: string;
  imageCarouselItems?: ImageCarouselItem[];
  imageCarouselSlidesPerView?: 1 | 2 | 3 | 4 | 5 | 6;
  imageCarouselGap?: number;
  imageCarouselAutoplay?: boolean;
  imageCarouselAutoplaySpeed?: number;
  imageCarouselLoop?: boolean;
  imageCarouselShowNav?: boolean;
  imageCarouselShowDots?: boolean;
  imageCarouselTransition?: "slide" | "fade";
  imageCarouselImageSizing?: "cover" | "contain" | "auto" | "fill";
  imageCarouselHeight?: string;
  imageCarouselAlignment?: "left" | "center" | "right";
  imageCarouselBorderRadius?: string;
  imageCarouselAspectRatio?: "square" | "landscape" | "portrait" | "video" | "auto";
  headingLevel?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  tocTitle?: string;
  tocShowTitle?: boolean;
  tocIncludedLevels?: ("h1" | "h2" | "h3" | "h4" | "h5" | "h6")[];
  tocIndentPerLevel?: number;
  tocItemGap?: number;
  tocMarkerStyle?: "none" | "bullet" | "number" | "line" | "badge";
  tocCardBg?: string;
  tocBorderColor?: string;
  tocTextColor?: string;
  tocHoverColor?: string;
  tocTitleColor?: string;
  tocAlignment?: "left" | "center" | "right";
  countdownTargetDate?: string;
  countdownShowDays?: boolean;
  countdownShowHours?: boolean;
  countdownShowMinutes?: boolean;
  countdownShowSeconds?: boolean;
  countdownExpiredMessage?: string;
  countdownAlignment?: "left" | "center" | "right";
  countdownGap?: number;
  countdownBoxBg?: string;
  countdownBoxBorder?: string;
  countdownBoxRadius?: string;
  countdownNumberColor?: string;
  countdownNumberSize?: string;
  countdownLabelColor?: string;
  countdownLabelSize?: string;
  countdownLabelTransform?: "uppercase" | "capitalize" | "lowercase" | "none";
  countdownDaysLabel?: string;
  countdownHoursLabel?: string;
  countdownMinutesLabel?: string;
  countdownSecondsLabel?: string;
  facebookPageUrl?: string;
  facebookMode?: "page" | "button" | "embed" | "comments";
  facebookTabs?: string;
  facebookWidth?: number;
  facebookHeight?: number;
  facebookSmallHeader?: boolean;
  facebookAdaptContainerWidth?: boolean;
  facebookHideCover?: boolean;
  facebookShowFacepile?: boolean;
  facebookAlignment?: "left" | "center" | "right";
  quoteContent?: string;
  quoteAuthor?: string;
  quoteCitation?: string;
  quoteAlignment?: "left" | "center" | "right";
  quoteStyle?: "accent-left" | "boxed" | "centered-clean" | "top-border";
  quoteShowIcon?: boolean;
  quoteIconColor?: string;
  quoteTextColor?: string;
  quoteTextSize?: string;
  quoteTextStyle?: "italic" | "normal";
  quoteAuthorColor?: string;
  quoteAuthorSize?: string;
  quoteCardBg?: string;
  quoteBorderColor?: string;
  templateId?: string;
  templateSource?: "custom" | "preset";
  templatePresetName?: "hero" | "features" | "cta" | "testimonials" | "pricing";
  reviewItems?: ReviewItem[];
  reviewLayout?: "grid" | "list";
  reviewColumns?: number;
  reviewAlignment?: "left" | "center" | "right";
  reviewStarColor?: string;
  reviewCardBg?: string;
  reviewBorderColor?: string;
  reviewShowAvatar?: boolean;
  reviewShowVerified?: boolean;
  reviewAllowSubmission?: boolean;
  reviewSubmissionButtonText?: string;
  fbButtonUrl?: string;
  fbButtonLabel?: string;
  fbButtonAction?: "like" | "share" | "follow" | "custom";
  fbButtonSize?: "sm" | "md" | "lg";
  fbButtonBgColor?: string;
  fbButtonTextColor?: string;
  fbButtonHoverBgColor?: string;
  fbButtonAlignment?: "left" | "center" | "right";
  // F-198 Facebook Embed
  fbEmbedUrl?: string;
  fbEmbedWidth?: string;
  fbEmbedHeight?: string;
  fbEmbedAlignment?: "left" | "center" | "right";
  // F-199 Facebook Comments
  fbCommentsUrl?: string;
  fbCommentsNumPosts?: number;
  fbCommentsWidth?: string;
  fbCommentsAlignment?: "left" | "center" | "right";
  // F-200 PayPal Button
  paypalText?: string;
  paypalAmount?: string;
  paypalCurrency?: string;
  paypalItemName?: string;
  paypalItemDescription?: string;
  paypalItemImage?: string;
  paypalQuantity?: number;
  paypalEnv?: "sandbox" | "live";
  paypalClientId?: string;
  paypalButtonStyle?: "express" | "custom";
  paypalButtonShape?: "pill" | "rect";
  paypalLayout?: "horizontal" | "vertical";
  paypalButtonType?: "checkout" | "donate" | "subscribe";
  paypalButtonSize?: "sm" | "md" | "lg";
  paypalAlignment?: "left" | "center" | "right";
  paypalBgColor?: string;
  paypalTextColor?: string;
  paypalHoverBgColor?: string;
  paypalSuccessAction?: "message" | "redirect";
  paypalSuccessMessage?: string;
  paypalSuccessRedirectUrl?: string;
  paypalCancelMessage?: string;
  // F-201 Stripe Button
  stripeText?: string;
  stripeCheckoutUrl?: string;
  stripeAmount?: string;
  stripeButtonSize?: "sm" | "md" | "lg";
  stripeAlignment?: "left" | "center" | "right";
  stripeBgColor?: string;
  stripeTextColor?: string;
  stripeHoverBgColor?: string;
  // F-202 Lottie
  lottieUrl?: string;
  lottieAutoplay?: boolean;
  lottieLoop?: boolean;
  lottieSpeed?: number;
  lottieWidth?: string;
  lottieHeight?: string;
  lottieAlignment?: "left" | "center" | "right";
  // F-203 Code Highlight
  codeSnippet?: string;
  codeLanguage?: string;
  codeShowLineNumbers?: boolean;
  codeTheme?: "dark" | "light" | "dracula" | "github";
  // Convenience & Alias fields for dynamic inspectors
  buttonText?: string;
  linkUrl?: string;
  icon?: string;
  iconProvider?: string;
  iconPosition?: "left" | "right" | "top" | "bottom" | string;
  iconGap?: number;
  iconSpacing?: number;
  iconRotate?: number;
  iconFlipH?: boolean;
  iconFlipV?: boolean;
  iconStrokeWidth?: number;
  iconStyle?: "outline" | "filled" | "duotone" | "regular" | string;
  target?: string;
  loginUserLabel?: string;
  loginPassLabel?: string;
  animatedStyle?: string;
  animatedPrefix?: string;
  animatedWords?: string[];
  pricePlans?: any[];
  flipFrontDesc?: string;
  flipBackDesc?: string;
  flipButtonText?: string;
  flipButtonUrl?: string;
  ctaDesc?: string;
  carouselPerView?: number;
  carouselAutoplay?: boolean;
  facebookUrl?: string;
  quoteText?: string;
  paymentAmount?: string;
  paymentCurrency?: string;
  paymentProductTitle?: string;
  paymentButtonText?: string;
  buttonBg?: string;
  containerBg?: string;
  buttonColor?: string;
  wooProductTitle?: string;
  wooPrice?: string;
  wooRating?: number;
  productTitle?: string;
  productPrice?: string;
  productImage?: string;
  productRating?: number;
  productRatingText?: string;
  productRatingCount?: number;
  productStarSize?: string;
  productStarColor?: string;
  productSource?: "manual" | "existing";
  productId?: string;
  codeFontSize?: string;
  codePadding?: string;
  codeAlignment?: "left" | "center" | "right";
  // F-204 Video Playlist
  playlistItems?: PlaylistItem[];
  playlistActiveId?: string;
  playlistPosition?: "right" | "bottom";
  playlistPlayerWidth?: string;
  playlistAlignment?: "left" | "center" | "right";
  // F-180 Nav Menu
  navTrigger?: "click" | "hover";
  navMobileBreakpoint?: "mobile" | "tablet" | "none";
  // F-205 Mega Menu
  showMegaMenuLogo?: boolean;
  megaMenuItems?: MegaMenuItem[];
  megaMenuBgColor?: string;
  megaMenuTextColor?: string;
  megaMenuHoverColor?: string;
  megaMenuAccentColor?: string;
  megaMenuAlignment?: "left" | "center" | "right" | "between";
  megaMenuTrigger?: "click" | "hover";
  // F-206 Off Canvas
  offCanvasButtonText?: string;
  offCanvasTitle?: string;
  offCanvasPosition?: "left" | "right";
  offCanvasWidth?: string;
  offCanvasOverlay?: boolean;
  offCanvasButtonBgColor?: string;
  offCanvasButtonTextColor?: string;
  offCanvasPanelBgColor?: string;
  // F-208 Video Widget
  videoPoster?: string;
  videoControls?: boolean;
  videoAutoplay?: boolean;
  videoLoop?: boolean;
  videoMuted?: boolean;
  // F-214 Basic Gallery
  basicGalleryImages?: GalleryImageItem[];
  basicGalleryColumns?: 1 | 2 | 3 | 4 | 5 | 6;
  basicGalleryGap?: number;
  basicGalleryImageSizing?: "cover" | "contain" | "fill";
  basicGalleryAlignment?: "left" | "center" | "right";
  basicGalleryBorderRadius?: string;
  // F-215 Audio Playlist
  audioPlaylistTracks?: { id: string; title: string; artist?: string; url: string; duration?: string }[];
  audioPlaylistActiveId?: string;
  audioPlaylistAutoPlay?: boolean;
  audioPlaylistLoop?: boolean;
  audioPlaylistVolume?: number;
  audioPlaylistCardBg?: string;
  audioPlaylistTextColor?: string;
  audioPlaylistAccentColor?: string;
  // F-216 Lottie Animation
  lottieSource?: string;
  lottieJsonData?: string;
  // F-217 Background Video
  containerBgType?: "color" | "gradient" | "image" | "video" | "slideshow";
  containerVideoUrl?: string;
  containerVideoAutoplay?: boolean;
  containerVideoLoop?: boolean;
  containerVideoMuted?: boolean;
  containerVideoPosition?: string;
  containerVideoFit?: "cover" | "contain" | "fill";
  containerVideoOverlay?: string;
  // F-218 Background Slideshow
  containerSlideshowImages?: GalleryImageItem[];
  containerSlideshowAutoplay?: boolean;
  containerSlideshowSpeed?: number;
  containerSlideshowTransition?: "fade" | "slide";
  containerSlideshowLoop?: boolean;
  containerSlideshowOverlay?: string;
  // F-219 Dynamic Lightbox
  lightboxItems?: GalleryImageItem[];
  lightboxTriggerText?: string;
  lightboxTriggerStyle?: "button" | "card" | "text";
  lightboxAnimation?: "zoom" | "fade" | "slide";
  lightboxAnimationDuration?: number;
  lightboxMaxWidth?: string;
  lightboxOverlayBg?: string;
  // F-220 Image Masks
  imageMaskShape?: "none" | "circle" | "rounded" | "blob" | "hexagon" | "star" | "diamond" | "squircle" | "heart";
  imageMaskSize?: "cover" | "contain" | "100% 100%";
  imageMaskPosition?: "center" | "top" | "bottom";
  // F-221 Custom SVG
  svgRawContent?: string;
  svgUrl?: string;
  svgWidth?: string;
  svgHeight?: string;
  svgColor?: string;
  svgAlignment?: "left" | "center" | "right";
  // F-222 Icon Library
  iconName?: string;
  iconCategory?: string;
  iconSize?: number;
  iconColor?: string;
  iconAlignment?: "left" | "center" | "right";
  iconBgColor?: string;
  iconBorderRadius?: string;
  iconPadding?: number;
  classes?: string[];
  styles?: ElementStyles;
  hoverStyles?: Partial<ElementStyles>;
  layout?: ContainerLayout;
  children?: EditorElement[];
  componentId?: string;
  isComponent?: boolean;
  componentName?: string;
  responsiveStyles?: Record<string, ElementStyles> & {
    desktop?: Partial<ElementStyles>;
    tablet?: Partial<ElementStyles>;
    mobile?: Partial<ElementStyles>;
  };
  responsiveHoverStyles?: Record<string, Partial<ElementStyles>> & {
    desktop?: Partial<ElementStyles>;
    tablet?: Partial<ElementStyles>;
    mobile?: Partial<ElementStyles>;
  };
  responsiveLayouts?: Record<string, ContainerLayout>;
  responsiveLayout?: Record<string, ContainerLayout> & {
    desktop?: Partial<ContainerLayout>;
    tablet?: Partial<ContainerLayout>;
    mobile?: Partial<ContainerLayout>;
  };
  atomicProps?: Record<string, any>;
  navigationConfig?: any;
  integrationConfig?: any;
  protectedRoles?: string[];
  customId?: string;
  customClass?: string;
  customCss?: string;
  customSelectors?: Record<string, any>;
  customAttributes?: Record<string, string> | any[];
}

export interface SitePartsConfig {
  header?: {
    enabled?: boolean;
    isEnabled?: boolean;
    elements: EditorElement[];
    customCss?: string;
  };
  footer?: {
    enabled?: boolean;
    isEnabled?: boolean;
    elements: EditorElement[];
    customCss?: string;
  };
}

export interface GlobalStylesConfig {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    [key: string]: string;
  };
  typography: {
    fontFamily: string;
    headingFontFamily: string;
    baseFontSize: string;
    [key: string]: string;
  };
  buttonStyles: {
    borderRadius: string;
    padding: string;
    [key: string]: string;
  };
  containerStyles?: {
    maxWidth?: string;
    defaultPadding?: string;
  };
  // Backward compatibility / convenience flat properties
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  headingFont?: string;
  bodyFont?: string;
  borderRadius?: string;
  containerMaxWidth?: string;
}

export interface PublishingState {
  status: "DRAFT" | "SAVED" | "PREVIEW" | "PUBLISHED" | "UNPUBLISHED_CHANGES";
  publishedAt?: string;
  publishedVersion?: number;
  publishedBy?: string;
  version?: number;
}

export interface DeploymentConfig {
  provider: "none" | "custom" | "vercel" | "netlify" | "sftp" | "static";
  customDomain?: string;
  stagingUrl?: string;
  productionUrl?: string;
  sslActive?: boolean;
  webhookUrl?: string;
  deployedAt?: string;
}

export interface CanonicalWebsiteData {
  id?: string;
  name?: string;
  slug?: string;
  version: number;
  homePageId: string;
  pages: PageConfig[];
  siteSettings: {
    siteName: string;
    siteLogo?: string;
    favicon?: string;
    siteLanguage?: string;
    customHead?: string;
    isMaintenanceMode?: boolean;
    [key: string]: any;
  };
  globalStyles: GlobalStylesConfig;
  siteParts: SitePartsConfig;
  navigation: NavMenuItem[];
  publishing: PublishingState;
  deployment: DeploymentConfig;
  // Backward compatibility fields
  elements: EditorElement[];
  pageSettings?: any;
  breakpoints?: Breakpoint[];
  popups?: any[];
  pageCss?: string;
  globalSettings?: any;
  publishedData?: any;
}

export interface WebsiteData {
  id: string;
  name: string;
  slug: string;
  status: string;
  userPermission?: string;
  editorData?: CanonicalWebsiteData | any;
}

// ==========================================
// Helpers
