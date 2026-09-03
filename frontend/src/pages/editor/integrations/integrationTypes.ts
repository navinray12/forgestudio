// ==========================================
// Integrations & Ecosystem Element Types & Interfaces (F-411 to F-425)
// ==========================================

export type IntegrationElementType =
  | "google-maps"          // F-411: Embed Google Maps
  | "facebook-integration" // F-412: Embed Facebook Content (Post/Video)
  | "facebook-comments"    // F-413: Facebook Comments Widget
  | "facebook-feed"        // F-414: Facebook Page Feed / Plugin
  | "facebook-like-button" // F-415: Facebook Like & Share Button
  | "soundcloud"           // F-416: Embed SoundCloud Player
  | "google-calendar"      // F-417: Embed Google Calendar
  | "paypal"               // F-418: PayPal Payment Integration Widget
  | "stripe"               // F-419: Stripe Payment Integration Widget
  | "lottie"               // F-420: Lottie Animation Support
  | "wordpress-shortcode"  // F-421: WordPress Shortcode Renderer
  | "dynamic-data"         // F-422: External / Dynamic Data Sources
  | "lms-compat"           // F-423: LMS Compatibility (LearnDash/LifterLMS)
  | "crm-integration"      // F-424: CRM Lead Capture Integration
  | "webhook-integration"; // F-425: Event-Driven Webhook Integration

export interface IntegrationStyles {
  // F-411: Google Maps Options
  mapAddress?: string;
  mapZoom?: string;
  mapType?: "roadmap" | "satellite" | "hybrid" | "terrain";
  mapMarkerTitle?: string;
  mapApiKey?: string;

  // F-412: Facebook Integration Options
  fbEmbedUrl?: string;
  fbEmbedType?: "post" | "video";

  // F-413: Facebook Comments Options
  fbCommentsTargetUrl?: string;
  fbCommentsNumPosts?: string;
  fbCommentsColorScheme?: "light" | "dark";

  // F-414: Facebook Feed Options
  fbPageUrl?: string;
  fbTabs?: string; // e.g. "timeline", "events", "messages"
  fbSmallHeader?: "true" | "false";
  fbHideCover?: "true" | "false";

  // F-415: Facebook Like Button Options
  fbLikeUrl?: string;
  fbLikeLayout?: "standard" | "button_count" | "box_count" | "button";
  fbLikeAction?: "like" | "recommend";
  fbLikeSize?: "small" | "large";
  fbIncludeShare?: "true" | "false";

  // F-416: SoundCloud Options
  soundcloudUrl?: string;
  soundcloudAutoplay?: "true" | "false";
  soundcloudVisualMode?: "true" | "false";
  soundcloudAccentColor?: string;

  // F-417: Google Calendar Options
  gcalEmbedUrl?: string;
  gcalViewMode?: "MONTH" | "WEEK" | "AGENDA";
  gcalShowTitle?: "true" | "false";
  gcalShowNav?: "true" | "false";
  gcalShowDate?: "true" | "false";
  gcalTimeZone?: string;

  // F-418: PayPal Options
  paypalMerchantEmail?: string;
  paypalClientId?: string;
  paypalItemName?: string;
  paypalAmount?: string;
  paypalCurrency?: string;
  paypalButtonLayout?: "horizontal" | "vertical";
  paypalButtonColor?: "gold" | "blue" | "silver" | "black";
  paypalEnv?: "sandbox" | "production";

  // F-419: Stripe Options
  stripePublishableKey?: string;
  stripePriceId?: string;
  stripeAmount?: string;
  stripeCurrency?: string;
  stripeItemName?: string;
  stripeButtonLabel?: string;
  stripeSuccessUrl?: string;
  stripeCancelUrl?: string;

  // F-420: Lottie Options
  lottieJsonUrl?: string;
  lottieLoop?: "true" | "false";
  lottieAutoplay?: "true" | "false";
  lottieHoverPlay?: "true" | "false";
  lottieSpeed?: string;
  lottieBgColor?: string;

  // F-421: WordPress Shortcode Options
  wpShortcodeString?: string;
  wpRenderPreview?: "true" | "false";

  // F-422: Dynamic Data Options
  dynamicApiUrl?: string;
  dynamicHttpMethod?: "GET" | "POST";
  dynamicJsonPath?: string;
  dynamicFallbackText?: string;
  dynamicRefreshInterval?: string; // in seconds

  // F-423: LMS Compatibility Options
  lmsProvider?: "learndash" | "lifterlms" | "generic";
  lmsCourseId?: string;
  lmsCourseTitle?: string;
  lmsCoursePrice?: string;
  lmsShowProgress?: "true" | "false";
  lmsLessonsCount?: string;

  // F-424: CRM Integration Options
  crmProvider?: "hubspot" | "salesforce" | "mailchimp" | "custom";
  crmEndpointUrl?: string;
  crmFormTitle?: string;
  crmSuccessMessage?: string;
  crmFieldMapping?: string; // JSON string for field mappings

  // F-425: Webhook Integration Options
  webhookUrl?: string;
  webhookTriggerEvent?: "onFormSubmit" | "onButtonClick" | "onPageLoad";
  webhookSecret?: string;
  webhookCustomHeaders?: string;
}

export function isIntegrationElement(type: string): type is IntegrationElementType {
  const integrationTypes: IntegrationElementType[] = [
    "google-maps",
    "facebook-integration",
    "facebook-comments",
    "facebook-feed",
    "facebook-like-button",
    "soundcloud",
    "google-calendar",
    "paypal",
    "stripe",
    "lottie",
    "wordpress-shortcode",
    "dynamic-data",
    "lms-compat",
    "crm-integration",
    "webhook-integration",
  ];
  return integrationTypes.includes(type as IntegrationElementType);
}
