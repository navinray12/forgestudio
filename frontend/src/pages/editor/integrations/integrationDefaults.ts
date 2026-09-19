import type { EditorElement } from "../WebsiteEditor";
import type { IntegrationElementType } from "./integrationTypes";

function generateId(): string {
  return "el_int_" + Math.random().toString(36).substring(2, 9);
}

export function getIntegrationDefaultElement(type: IntegrationElementType): EditorElement {
  const id = generateId();

  switch (type) {
    case "google-maps":
      return {
        id,
        type: "google-maps",
        content: "Google Maps",
        styles: {
          width: "100%",
          height: "380px",
          borderRadius: "12px",
          marginTop: "10px",
          marginBottom: "10px",
          mapAddress: "1600 Amphitheatre Parkway, Mountain View, CA",
          mapZoom: "14",
          mapType: "roadmap",
          mapMarkerTitle: "Google Headquarters",
        },
      };

    case "facebook-integration":
      return {
        id,
        type: "facebook-integration",
        content: "Facebook Embed",
        styles: {
          width: "100%",
          height: "450px",
          borderRadius: "8px",
          marginTop: "10px",
          marginBottom: "10px",
          fbEmbedUrl: "https://www.facebook.com/facebook/videos/10153231379946729/",
          fbEmbedType: "video",
        },
      };

    case "facebook-comments":
      return {
        id,
        type: "facebook-comments",
        content: "Facebook Comments",
        styles: {
          width: "100%",
          marginTop: "10px",
          marginBottom: "10px",
          fbCommentsTargetUrl: "https://example.com/blog-post",
          fbCommentsNumPosts: "5",
          fbCommentsColorScheme: "light",
        },
      };

    case "facebook-feed":
      return {
        id,
        type: "facebook-feed",
        content: "Facebook Page Feed",
        styles: {
          width: "100%",
          height: "500px",
          borderRadius: "8px",
          marginTop: "10px",
          marginBottom: "10px",
          fbPageUrl: "https://www.facebook.com/facebook",
          fbTabs: "timeline",
          fbSmallHeader: "false",
          fbHideCover: "false",
        },
      };

    case "facebook-like-button":
      return {
        id,
        type: "facebook-like-button",
        content: "Facebook Like Button",
        styles: {
          width: "auto",
          marginTop: "10px",
          marginBottom: "10px",
          fbLikeUrl: "https://facebook.com",
          fbLikeLayout: "standard",
          fbLikeAction: "like",
          fbLikeSize: "small",
          fbIncludeShare: "true",
        },
      };

    case "soundcloud":
      return {
        id,
        type: "soundcloud",
        content: "SoundCloud Audio Player",
        styles: {
          width: "100%",
          height: "166px",
          borderRadius: "12px",
          marginTop: "10px",
          marginBottom: "10px",
          soundcloudUrl: "https://soundcloud.com/octobersveryown/drake-gods-plan",
          soundcloudAutoplay: "false",
          soundcloudVisualMode: "false",
          soundcloudAccentColor: "#ff5500",
        },
      };

    case "google-calendar":
      return {
        id,
        type: "google-calendar",
        content: "Google Calendar",
        styles: {
          width: "100%",
          height: "500px",
          borderRadius: "12px",
          marginTop: "10px",
          marginBottom: "10px",
          gcalEmbedUrl: "en.usa#holiday@group.v.calendar.google.com",
          gcalViewMode: "MONTH",
          gcalShowTitle: "true",
          gcalShowNav: "true",
          gcalShowDate: "true",
          gcalTimeZone: "UTC",
        },
      };

    case "paypal":
      return {
        id,
        type: "paypal",
        content: "PayPal Payment",
        styles: {
          width: "100%",
          marginTop: "15px",
          marginBottom: "15px",
          paypalMerchantEmail: "merchant@example.com",
          paypalItemName: "Premium Subscription",
          paypalAmount: "29.99",
          paypalCurrency: "USD",
          paypalButtonLayout: "vertical",
          paypalButtonColor: "gold",
          paypalEnv: "sandbox",
        },
      };

    case "stripe":
      return {
        id,
        type: "stripe",
        content: "Stripe Checkout",
        styles: {
          width: "100%",
          marginTop: "15px",
          marginBottom: "15px",
          stripePublishableKey: "pk_test_samplekey123",
          stripeItemName: "Pro License Plan",
          stripeAmount: "49.00",
          stripeCurrency: "USD",
          stripeButtonLabel: "Pay with Credit Card",
          stripeSuccessUrl: "https://example.com/success",
          stripeCancelUrl: "https://example.com/cancel",
        },
      };

    case "lottie":
      return {
        id,
        type: "lottie",
        content: "Lottie Animation",
        styles: {
          width: "100%",
          height: "300px",
          marginTop: "10px",
          marginBottom: "10px",
          lottieJsonUrl: "https://assets9.lottiefiles.com/packages/lf20_m64r8sub.json",
          lottieLoop: "true",
          lottieAutoplay: "true",
          lottieHoverPlay: "false",
          lottieSpeed: "1",
        },
      };

    case "wordpress-shortcode":
      return {
        id,
        type: "wordpress-shortcode",
        content: "WordPress Shortcode",
        styles: {
          width: "100%",
          marginTop: "10px",
          marginBottom: "10px",
          wpShortcodeString: '[contact-form-7 id="101" title="Contact form 1"]',
          wpRenderPreview: "true",
        },
      };

    case "dynamic-data":
      return {
        id,
        type: "dynamic-data",
        content: "Dynamic Data Source",
        styles: {
          width: "100%",
          marginTop: "10px",
          marginBottom: "10px",
          dynamicApiUrl: "https://api.github.com/repos/facebook/react",
          dynamicHttpMethod: "GET",
          dynamicJsonPath: "stargazers_count",
          dynamicFallbackText: "Loading dynamic stats...",
          dynamicRefreshInterval: "30",
        },
      };

    case "lms-compat":
      return {
        id,
        type: "lms-compat",
        content: "LMS Course Compatibility",
        styles: {
          width: "100%",
          marginTop: "15px",
          marginBottom: "15px",
          lmsProvider: "learndash",
          lmsCourseId: "c-101",
          lmsCourseTitle: "Mastering Modern Web Development",
          lmsCoursePrice: "$99.00",
          lmsShowProgress: "true",
          lmsLessonsCount: "12 Modules",
        },
      };

    case "crm-integration":
      return {
        id,
        type: "crm-integration",
        content: "CRM Lead Capture",
        styles: {
          width: "100%",
          marginTop: "15px",
          marginBottom: "15px",
          crmProvider: "hubspot",
          crmFormTitle: "Subscribe for Enterprise Updates",
          crmSuccessMessage: "Thank you! Your information has been synced to CRM.",
          crmEndpointUrl: "https://api.hsforms.com/submissions/v3/integration/submit/portalId/formId",
        },
      };

    case "webhook-integration":
      return {
        id,
        type: "webhook-integration",
        content: "Webhook Trigger",
        styles: {
          width: "100%",
          marginTop: "15px",
          marginBottom: "15px",
          webhookUrl: "https://hooks.zapier.com/hooks/catch/12345/abcde",
          webhookTriggerEvent: "onButtonClick",
          webhookSecret: "whsec_supersecretkey123",
        },
      };

    default:
      throw new Error(`Unsupported integration element type: ${type}`);
  }
}
