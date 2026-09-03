import React from "react";
import type { EditorElement } from "../WebsiteEditor";
import type { IntegrationElementType } from "./integrationTypes";

interface IntegrationSettingsProps {
  selectedElement: EditorElement;
  updateSelectedElementStyle: (prop: any, val: any) => void;
}

export const IntegrationSettingsPanel: React.FC<IntegrationSettingsProps> = ({
  selectedElement,
  updateSelectedElementStyle,
}) => {
  const getStyleVal = (prop: string, fallback = ""): string => {
    return (selectedElement.styles as any)?.[prop] || fallback;
  };

  const type = selectedElement.type as IntegrationElementType;

  return (
    <div className="space-y-4 text-xs text-slate-300">
      {/* F-411: Google Maps Settings */}
      {type === "google-maps" && (
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Target Address / Coordinates</label>
            <input
              type="text"
              value={getStyleVal("mapAddress", "1600 Amphitheatre Parkway, Mountain View, CA")}
              onChange={(e) => updateSelectedElementStyle("mapAddress", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Zoom Level (1-20)</label>
            <input
              type="number"
              min="1"
              max="20"
              value={getStyleVal("mapZoom", "14")}
              onChange={(e) => updateSelectedElementStyle("mapZoom", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Marker Title</label>
            <input
              type="text"
              value={getStyleVal("mapMarkerTitle", "Google Headquarters")}
              onChange={(e) => updateSelectedElementStyle("mapMarkerTitle", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            />
          </div>
        </div>
      )}

      {/* F-412: Facebook Integration Settings */}
      {type === "facebook-integration" && (
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Facebook Post or Video URL</label>
            <input
              type="text"
              value={getStyleVal("fbEmbedUrl", "https://www.facebook.com/facebook/videos/10153231379946729/")}
              onChange={(e) => updateSelectedElementStyle("fbEmbedUrl", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Embed Type</label>
            <select
              value={getStyleVal("fbEmbedType", "post")}
              onChange={(e) => updateSelectedElementStyle("fbEmbedType", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            >
              <option value="post">Post</option>
              <option value="video">Video</option>
            </select>
          </div>
        </div>
      )}

      {/* F-413: Facebook Comments Settings */}
      {type === "facebook-comments" && (
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Target Page URL</label>
            <input
              type="text"
              value={getStyleVal("fbCommentsTargetUrl", "https://example.com/blog-post")}
              onChange={(e) => updateSelectedElementStyle("fbCommentsTargetUrl", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Number of Posts</label>
            <input
              type="number"
              min="1"
              max="20"
              value={getStyleVal("fbCommentsNumPosts", "5")}
              onChange={(e) => updateSelectedElementStyle("fbCommentsNumPosts", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Color Scheme</label>
            <select
              value={getStyleVal("fbCommentsColorScheme", "light")}
              onChange={(e) => updateSelectedElementStyle("fbCommentsColorScheme", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
      )}

      {/* F-414: Facebook Feed Settings */}
      {type === "facebook-feed" && (
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Facebook Page URL</label>
            <input
              type="text"
              value={getStyleVal("fbPageUrl", "https://www.facebook.com/facebook")}
              onChange={(e) => updateSelectedElementStyle("fbPageUrl", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Tabs (timeline, events, messages)</label>
            <input
              type="text"
              value={getStyleVal("fbTabs", "timeline")}
              onChange={(e) => updateSelectedElementStyle("fbTabs", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            />
          </div>
        </div>
      )}

      {/* F-415: Facebook Like Button Settings */}
      {type === "facebook-like-button" && (
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Target Like URL</label>
            <input
              type="text"
              value={getStyleVal("fbLikeUrl", "https://facebook.com")}
              onChange={(e) => updateSelectedElementStyle("fbLikeUrl", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Layout</label>
            <select
              value={getStyleVal("fbLikeLayout", "standard")}
              onChange={(e) => updateSelectedElementStyle("fbLikeLayout", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            >
              <option value="standard">Standard</option>
              <option value="button_count">Button Count</option>
              <option value="box_count">Box Count</option>
              <option value="button">Button Only</option>
            </select>
          </div>
        </div>
      )}

      {/* F-416: SoundCloud Settings */}
      {type === "soundcloud" && (
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">SoundCloud Track / Playlist URL</label>
            <input
              type="text"
              value={getStyleVal("soundcloudUrl", "https://soundcloud.com/octobersveryown/drake-gods-plan")}
              onChange={(e) => updateSelectedElementStyle("soundcloudUrl", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Accent Color Code</label>
            <input
              type="color"
              value={getStyleVal("soundcloudAccentColor", "#ff5500")}
              onChange={(e) => updateSelectedElementStyle("soundcloudAccentColor", e.target.value)}
              className="w-full h-8 rounded bg-slate-900 border border-slate-700 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* F-417: Google Calendar Settings */}
      {type === "google-calendar" && (
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Calendar ID or Public Address</label>
            <input
              type="text"
              value={getStyleVal("gcalEmbedUrl", "en.usa#holiday@group.v.calendar.google.com")}
              onChange={(e) => updateSelectedElementStyle("gcalEmbedUrl", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Default View Mode</label>
            <select
              value={getStyleVal("gcalViewMode", "MONTH")}
              onChange={(e) => updateSelectedElementStyle("gcalViewMode", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            >
              <option value="MONTH">Month View</option>
              <option value="WEEK">Week View</option>
              <option value="AGENDA">Agenda View</option>
            </select>
          </div>
        </div>
      )}

      {/* F-418: PayPal Settings */}
      {type === "paypal" && (
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Item / Plan Title</label>
            <input
              type="text"
              value={getStyleVal("paypalItemName", "Premium Subscription")}
              onChange={(e) => updateSelectedElementStyle("paypalItemName", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Price Amount</label>
            <input
              type="text"
              value={getStyleVal("paypalAmount", "29.99")}
              onChange={(e) => updateSelectedElementStyle("paypalAmount", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Button Color</label>
            <select
              value={getStyleVal("paypalButtonColor", "gold")}
              onChange={(e) => updateSelectedElementStyle("paypalButtonColor", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            >
              <option value="gold">Gold</option>
              <option value="blue">Blue</option>
              <option value="silver">Silver</option>
              <option value="black">Black</option>
            </select>
          </div>
        </div>
      )}

      {/* F-419: Stripe Settings */}
      {type === "stripe" && (
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Product Title</label>
            <input
              type="text"
              value={getStyleVal("stripeItemName", "Pro License Plan")}
              onChange={(e) => updateSelectedElementStyle("stripeItemName", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Amount ($)</label>
            <input
              type="text"
              value={getStyleVal("stripeAmount", "49.00")}
              onChange={(e) => updateSelectedElementStyle("stripeAmount", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Button Label</label>
            <input
              type="text"
              value={getStyleVal("stripeButtonLabel", "Pay with Credit Card")}
              onChange={(e) => updateSelectedElementStyle("stripeButtonLabel", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            />
          </div>
        </div>
      )}

      {/* F-420: Lottie Settings */}
      {type === "lottie" && (
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Lottie JSON URL</label>
            <input
              type="text"
              value={getStyleVal("lottieJsonUrl", "https://assets9.lottiefiles.com/packages/lf20_m64r8sub.json")}
              onChange={(e) => updateSelectedElementStyle("lottieJsonUrl", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            />
          </div>
        </div>
      )}

      {/* F-421: WordPress Shortcode Settings */}
      {type === "wordpress-shortcode" && (
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Shortcode Expression</label>
            <textarea
              rows={3}
              value={getStyleVal("wpShortcodeString", '[contact-form-7 id="101" title="Contact form 1"]')}
              onChange={(e) => updateSelectedElementStyle("wpShortcodeString", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-emerald-400"
            />
          </div>
        </div>
      )}

      {/* F-422: Dynamic Data Source Settings */}
      {type === "dynamic-data" && (
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">API Endpoint URL</label>
            <input
              type="text"
              value={getStyleVal("dynamicApiUrl", "https://api.github.com/repos/facebook/react")}
              onChange={(e) => updateSelectedElementStyle("dynamicApiUrl", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">JSON Property Path</label>
            <input
              type="text"
              value={getStyleVal("dynamicJsonPath", "stargazers_count")}
              onChange={(e) => updateSelectedElementStyle("dynamicJsonPath", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            />
          </div>
        </div>
      )}

      {/* F-423: LMS Compatibility Settings */}
      {type === "lms-compat" && (
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">LMS Platform</label>
            <select
              value={getStyleVal("lmsProvider", "learndash")}
              onChange={(e) => updateSelectedElementStyle("lmsProvider", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            >
              <option value="learndash">LearnDash</option>
              <option value="lifterlms">LifterLMS</option>
              <option value="generic">Generic LMS</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Course Title</label>
            <input
              type="text"
              value={getStyleVal("lmsCourseTitle", "Mastering Modern Web Development")}
              onChange={(e) => updateSelectedElementStyle("lmsCourseTitle", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            />
          </div>
        </div>
      )}

      {/* F-424: CRM Settings */}
      {type === "crm-integration" && (
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">CRM Platform</label>
            <select
              value={getStyleVal("crmProvider", "hubspot")}
              onChange={(e) => updateSelectedElementStyle("crmProvider", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            >
              <option value="hubspot">HubSpot CRM</option>
              <option value="salesforce">Salesforce</option>
              <option value="mailchimp">Mailchimp</option>
              <option value="custom">Custom Webhook CRM</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Form Heading</label>
            <input
              type="text"
              value={getStyleVal("crmFormTitle", "Subscribe for Enterprise Updates")}
              onChange={(e) => updateSelectedElementStyle("crmFormTitle", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            />
          </div>
        </div>
      )}

      {/* F-425: Webhook Settings */}
      {type === "webhook-integration" && (
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Webhook Endpoint URL</label>
            <input
              type="text"
              value={getStyleVal("webhookUrl", "https://hooks.zapier.com/hooks/catch/12345/abcde")}
              onChange={(e) => updateSelectedElementStyle("webhookUrl", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Trigger Event</label>
            <select
              value={getStyleVal("webhookTriggerEvent", "onButtonClick")}
              onChange={(e) => updateSelectedElementStyle("webhookTriggerEvent", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            >
              <option value="onButtonClick">Button Click Event</option>
              <option value="onFormSubmit">Form Submission Event</option>
              <option value="onPageLoad">Page Load Event</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
