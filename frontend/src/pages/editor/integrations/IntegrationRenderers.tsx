import React, { useEffect, useState } from "react";
import type { EditorElement } from "../WebsiteEditor";

interface IntegrationRendererProps {
  el: EditorElement;
  isPreview?: boolean;
  apiUrl?: string;
  getStyleVal: (prop: string) => string | undefined;
  getInnerStyles: (resolved: React.CSSProperties) => React.CSSProperties;
  resolvedStyles: React.CSSProperties;
}

export const IntegrationElementRenderer: React.FC<IntegrationRendererProps> = ({
  el,
  isPreview = false,
  apiUrl = "http://localhost:5000",
  getStyleVal,
  getInnerStyles,
  resolvedStyles,
}) => {
  const innerStyles = getInnerStyles(resolvedStyles);

  // Helper for safe style value getters with fallback defaults
  const getProp = (prop: string, fallback: string): string => {
    const val = getStyleVal(prop);
    return val !== undefined && val !== "" ? val : fallback;
  };

  // ==========================================
  // F-411: Google Maps Renderer
  // ==========================================
  if (el.type === "google-maps") {
    const address = getProp("mapAddress", "1600 Amphitheatre Parkway, Mountain View, CA");
    const zoom = getProp("mapZoom", "14");
    const encodedAddress = encodeURIComponent(address);
    const embedUrl = `https://maps.google.com/maps?q=${encodedAddress}&t=m&z=${zoom}&output=embed&iwloc=near`;

    return (
      <div className="w-full relative overflow-hidden rounded-xl shadow-md border border-slate-200/80 bg-slate-900">
        <iframe
          src={embedUrl}
          title="Google Maps"
          width="100%"
          height={getProp("height", "380px")}
          style={{ border: 0, ...innerStyles }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full rounded-xl transition duration-300"
        />
        <div className="absolute bottom-2 left-3 bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-md text-[11px] font-medium text-slate-200 shadow border border-slate-700/50 flex items-center gap-1.5 pointer-events-none">
          <svg className="w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
          <span>{getProp("mapMarkerTitle", address)}</span>
        </div>
      </div>
    );
  }

  // ==========================================
  // F-412: Facebook Integration (Embed Post/Video)
  // ==========================================
  if (el.type === "facebook-integration") {
    const rawUrl = getProp("fbEmbedUrl", "https://www.facebook.com/facebook/videos/10153231379946729/");
    const encodedUrl = encodeURIComponent(rawUrl);
    const embedType = getProp("fbEmbedType", "post");
    const iframeUrl = `https://www.facebook.com/plugins/${embedType}.php?href=${encodedUrl}&show_text=true&width=500`;

    return (
      <div className="w-full flex justify-center items-center p-2 rounded-xl bg-slate-50 border border-slate-200">
        <iframe
          src={iframeUrl}
          title="Facebook Integration"
          width="100%"
          height={getProp("height", "450px")}
          style={{ border: "none", overflow: "hidden", ...innerStyles }}
          scrolling="no"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          allowFullScreen
          className="rounded-lg shadow-sm max-w-full"
        />
      </div>
    );
  }

  // ==========================================
  // F-413: Facebook Comments Widget
  // ==========================================
  if (el.type === "facebook-comments") {
    const targetUrl = getProp("fbCommentsTargetUrl", "https://example.com/blog-post");
    const numPosts = getProp("fbCommentsNumPosts", "5");
    const colorScheme = getProp("fbCommentsColorScheme", "light");
    const encodedUrl = encodeURIComponent(targetUrl);
    const commentsUrl = `https://www.facebook.com/plugins/comments.php?href=${encodedUrl}&numposts=${numPosts}&colorscheme=${colorScheme}`;

    return (
      <div className={`w-full p-4 rounded-xl border ${colorScheme === "dark" ? "bg-slate-900 text-white border-slate-800" : "bg-white border-slate-200"} shadow-sm`}>
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200/60 dark:border-slate-800">
          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          <span className="text-xs font-semibold tracking-wide uppercase text-slate-500">Facebook Discussion</span>
        </div>
        <iframe
          src={commentsUrl}
          title="Facebook Comments"
          width="100%"
          height="320"
          style={{ border: "none", overflow: "hidden", ...innerStyles }}
          scrolling="no"
          frameBorder="0"
        />
      </div>
    );
  }

  // ==========================================
  // F-414: Facebook Feed / Page Plugin
  // ==========================================
  if (el.type === "facebook-feed") {
    const pageUrl = getProp("fbPageUrl", "https://www.facebook.com/facebook");
    const tabs = getProp("fbTabs", "timeline");
    const smallHeader = getProp("fbSmallHeader", "false") === "true";
    const hideCover = getProp("fbHideCover", "false") === "true";
    const encodedUrl = encodeURIComponent(pageUrl);
    const feedUrl = `https://www.facebook.com/plugins/page.php?href=${encodedUrl}&tabs=${tabs}&width=500&height=500&small_header=${smallHeader}&hide_cover=${hideCover}&adapt_container_width=true`;

    return (
      <div className="w-full flex justify-center p-3 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
        <iframe
          src={feedUrl}
          title="Facebook Page Feed"
          width="100%"
          height={getProp("height", "500px")}
          style={{ border: "none", overflow: "hidden", ...innerStyles }}
          scrolling="no"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          className="rounded-lg max-w-full"
        />
      </div>
    );
  }

  // ==========================================
  // F-415: Facebook Like Button
  // ==========================================
  if (el.type === "facebook-like-button") {
    const likeUrl = getProp("fbLikeUrl", "https://facebook.com");
    const layout = getProp("fbLikeLayout", "standard");
    const action = getProp("fbLikeAction", "like");
    const size = getProp("fbLikeSize", "small");
    const share = getProp("fbIncludeShare", "true") === "true";
    const encodedUrl = encodeURIComponent(likeUrl);
    const pluginUrl = `https://www.facebook.com/plugins/like.php?href=${encodedUrl}&width=450&layout=${layout}&action=${action}&size=${size}&share=${share}&height=40`;

    return (
      <div className="inline-flex items-center p-2 rounded-lg bg-white border border-slate-200 shadow-sm">
        <iframe
          src={pluginUrl}
          title="Facebook Like Button"
          width="100%"
          height={size === "large" ? "40" : "28"}
          style={{ border: "none", overflow: "hidden", ...innerStyles }}
          scrolling="no"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
        />
      </div>
    );
  }

  // ==========================================
  // F-416: SoundCloud Player Renderer
  // ==========================================
  if (el.type === "soundcloud") {
    const rawUrl = getProp("soundcloudUrl", "https://soundcloud.com/octobersveryown/drake-gods-plan");
    const autoplay = getProp("soundcloudAutoplay", "false") === "true";
    const visual = getProp("soundcloudVisualMode", "false") === "true";
    const color = getProp("soundcloudAccentColor", "#ff5500").replace("#", "");
    const encodedTrackUrl = encodeURIComponent(rawUrl);
    const playerUrl = `https://w.soundcloud.com/player/?url=${encodedTrackUrl}&color=%23${color}&auto_play=${autoplay}&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=${visual}`;

    return (
      <div className="w-full rounded-xl overflow-hidden shadow-lg border border-slate-800 bg-slate-950">
        <iframe
          src={playerUrl}
          title="SoundCloud Audio Player"
          width="100%"
          height={visual ? "300" : getProp("height", "166px")}
          style={{ border: "none", ...innerStyles }}
          scrolling="no"
          frameBorder="no"
          allow="autoplay"
        />
      </div>
    );
  }

  // ==========================================
  // F-417: Google Calendar Embed Renderer
  // ==========================================
  if (el.type === "google-calendar") {
    const calendarId = getProp("gcalEmbedUrl", "en.usa#holiday@group.v.calendar.google.com");
    const mode = getProp("gcalViewMode", "MONTH");
    const showTitle = getProp("gcalShowTitle", "true") === "true" ? "1" : "0";
    const showNav = getProp("gcalShowNav", "true") === "true" ? "1" : "0";
    const showDate = getProp("gcalShowDate", "true") === "true" ? "1" : "0";
    const tz = encodeURIComponent(getProp("gcalTimeZone", "UTC"));
    const encodedId = encodeURIComponent(calendarId);
    const embedUrl = `https://calendar.google.com/calendar/embed?src=${encodedId}&mode=${mode}&showTitle=${showTitle}&showNav=${showNav}&showDate=${showDate}&ctz=${tz}`;

    return (
      <div className="w-full rounded-xl overflow-hidden border border-slate-200 shadow-md bg-white">
        <iframe
          src={embedUrl}
          title="Google Calendar"
          width="100%"
          height={getProp("height", "500px")}
          style={{ border: 0, ...innerStyles }}
          frameBorder="0"
          scrolling="no"
        />
      </div>
    );
  }

  // ==========================================
  // F-418: PayPal Payment Integration Widget
  // ==========================================
  if (el.type === "paypal") {
    const itemName = getProp("paypalItemName", "Premium Subscription");
    const amount = getProp("paypalAmount", "29.99");
    const currency = getProp("paypalCurrency", "USD");
    const btnColor = getProp("paypalButtonColor", "gold");
    const env = getProp("paypalEnv", "sandbox");

    const colorClasses: Record<string, string> = {
      gold: "bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold",
      blue: "bg-blue-600 hover:bg-blue-700 text-white font-bold",
      silver: "bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold",
      black: "bg-slate-950 hover:bg-slate-900 text-white font-bold",
    };

    return (
      <div className="w-full max-w-md mx-auto p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-xl text-white">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black italic tracking-tighter text-blue-400">Pay<span className="text-sky-400">Pal</span></span>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800">
              {env}
            </span>
          </div>
          <span className="text-lg font-extrabold text-amber-400">${amount} <span className="text-xs font-semibold text-slate-400">{currency}</span></span>
        </div>
        <p className="text-xs text-slate-300 mb-4 font-medium">{itemName}</p>
        <button
          onClick={async () => {
            if (!isPreview) return;
            try {
              const res = await fetch(`${apiUrl}/api/integrations/paypal/create-order`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount, currency, itemName }),
              });
              const data = await res.json();
              if (data?.approveUrl) {
                window.open(data.approveUrl, "_blank");
              } else {
                alert(`PayPal Checkout Initialized for ${itemName} ($${amount} ${currency})! Order ID: ${data?.orderId || "demo-id"}`);
              }
            } catch {
              alert(`PayPal Payment Demo Mode: Checkout trigger for ${itemName} ($${amount} ${currency})`);
            }
          }}
          className={`w-full py-3 px-6 rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${colorClasses[btnColor] || colorClasses.gold}`}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.76.76 0 0 1 .752-.64h6.732c3.153 0 5.485.672 6.574 2.2.984 1.38.995 3.328.324 5.753-.946 3.42-3.322 5.378-6.737 5.378H9.865a.76.76 0 0 0-.75.645l-.94 5.922a.642.642 0 0 1-.633.36zm10.742-13.88c-.672-.942-2.196-1.378-4.303-1.378H8.096l-2.02 12.755h2.518l.81-5.114a1.478 1.478 0 0 1 1.46-1.248h1.868c2.656 0 4.542-1.468 5.275-4.116.48-1.745.474-3.15-.189-4.072z" />
          </svg>
          Pay with PayPal
        </button>
      </div>
    );
  }

  // ==========================================
  // F-419: Stripe Payment Integration Widget
  // ==========================================
  if (el.type === "stripe") {
    const itemName = getProp("stripeItemName", "Pro License Plan");
    const amount = getProp("stripeAmount", "49.00");
    const currency = getProp("stripeCurrency", "USD");
    const btnLabel = getProp("stripeButtonLabel", "Pay with Credit Card");

    return (
      <div className="w-full max-w-md mx-auto p-5 rounded-2xl bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 border border-indigo-900/50 shadow-xl text-white">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-indigo-900/40">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-indigo-400">stripe</span>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
              Secure
            </span>
          </div>
          <span className="text-lg font-bold text-indigo-200">${amount} <span className="text-xs font-normal text-slate-400">{currency}</span></span>
        </div>
        <p className="text-xs text-slate-300 mb-4 font-medium">{itemName}</p>
        <button
          onClick={async () => {
            if (!isPreview) return;
            try {
              const res = await fetch(`${apiUrl}/api/integrations/stripe/create-checkout-session`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount, currency, itemName }),
              });
              const data = await res.json();
              if (data?.sessionUrl) {
                window.location.href = data.sessionUrl;
              } else {
                alert(`Stripe Checkout Triggered for ${itemName} ($${amount} ${currency})! Session ID: ${data?.sessionId || "demo-session"}`);
              }
            } catch {
              alert(`Stripe Payment Demo Mode: Triggered checkout for ${itemName} ($${amount} ${currency})`);
            }
          }}
          className="w-full py-3 px-6 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {btnLabel}
        </button>
      </div>
    );
  }

  // ==========================================
  // F-420: Lottie Animation Renderer
  // ==========================================
  if (el.type === "lottie") {
    const lottieUrl = getProp("lottieJsonUrl", "https://assets9.lottiefiles.com/packages/lf20_m64r8sub.json");

    return (
      <div className="w-full flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 bg-slate-900 shadow-md">
        <div className="w-48 h-48 flex items-center justify-center relative">
          <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-xl animate-pulse" />
          <svg className="w-24 h-24 text-sky-400 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span className="mt-2 text-xs font-semibold text-slate-300">Lottie Animation Source</span>
        <span className="text-[10px] text-slate-500 truncate max-w-xs">{lottieUrl}</span>
      </div>
    );
  }

  // ==========================================
  // F-421: WordPress Shortcode Renderer
  // ==========================================
  if (el.type === "wordpress-shortcode") {
    const shortcode = getProp("wpShortcodeString", '[contact-form-7 id="101" title="Contact form 1"]');

    return (
      <div className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono shadow-md">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800 text-xs font-semibold text-slate-400 font-sans">
          <svg className="w-4 h-4 text-sky-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.158 0C5.457 0 0 5.457 0 12.158c0 6.701 5.457 12.158 12.158 12.158 6.701 0 12.158-5.457 12.158-12.158C24.316 5.457 18.859 0 12.158 0zm-7.79 12.158c0-1.892.656-3.633 1.76-5.01l4.896 13.414c-3.896-1.127-6.656-4.707-6.656-8.404zm7.79 10.428c-1.393 0-2.707-.323-3.876-.902l3.416-9.923 3.513 9.61c-1.02.775-2.29 1.215-3.053 1.215zm1.538-12.825l3.292 9.012c1.88-1.57 3.09-3.92 3.09-6.615 0-1.528-.41-2.956-1.128-4.186l-5.254 1.789z" />
          </svg>
          WordPress Shortcode Processor
        </div>
        <div className="p-3 bg-slate-900 rounded-lg text-emerald-400 text-xs tracking-wide">
          {shortcode}
        </div>
      </div>
    );
  }

  // ==========================================
  // F-422: Dynamic Data Source Renderer
  // ==========================================
  if (el.type === "dynamic-data") {
    const apiUrlEndpoint = getProp("dynamicApiUrl", "https://api.github.com/repos/facebook/react");
    const jsonPath = getProp("dynamicJsonPath", "stargazers_count");
    const fallback = getProp("dynamicFallbackText", "Loading dynamic stats...");
    const [fetchedData, setFetchedData] = useState<string>(fallback);
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
      let isMounted = true;
      const fetchData = async () => {
        setLoading(true);
        try {
          // Use backend dynamic data proxy for CORS safety
          const proxyUrl = `${apiUrl}/api/integrations/dynamic-data/fetch?url=${encodeURIComponent(apiUrlEndpoint)}&jsonPath=${encodeURIComponent(jsonPath)}`;
          const res = await fetch(proxyUrl);
          const json = await res.json();
          if (isMounted && json?.value !== undefined) {
            setFetchedData(String(json.value));
          } else if (isMounted) {
            setFetchedData(fallback);
          }
        } catch {
          if (isMounted) setFetchedData(fallback);
        } finally {
          if (isMounted) setLoading(false);
        }
      };

      fetchData();
      return () => {
        isMounted = false;
      };
    }, [apiUrlEndpoint, jsonPath, apiUrl]);

    return (
      <div className="w-full p-4 rounded-xl bg-slate-900 border border-slate-800 text-white shadow-md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dynamic Data Source</span>
          {loading && <span className="text-[10px] text-sky-400 animate-pulse">Syncing live...</span>}
        </div>
        <div className="text-2xl font-bold text-sky-300">
          {fetchedData}
        </div>
        <div className="text-[10px] text-slate-500 mt-2 truncate">
          Source: {apiUrlEndpoint} &rarr; Path: {jsonPath}
        </div>
      </div>
    );
  }

  // ==========================================
  // F-423: LMS Compatibility Renderer
  // ==========================================
  if (el.type === "lms-compat") {
    const provider = getProp("lmsProvider", "learndash");
    const courseTitle = getProp("lmsCourseTitle", "Mastering Modern Web Development");
    const coursePrice = getProp("lmsCoursePrice", "$99.00");
    const lessonsCount = getProp("lmsLessonsCount", "12 Modules");

    return (
      <div className="w-full max-w-md mx-auto p-5 rounded-2xl bg-white border border-slate-200 shadow-xl text-slate-900">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
            {provider}
          </span>
          <span className="text-base font-extrabold text-slate-900">{coursePrice}</span>
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-2 leading-snug">{courseTitle}</h3>
        <div className="flex items-center gap-4 text-xs font-medium text-slate-500 mb-4">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            {lessonsCount}
          </span>
          <span className="flex items-center gap-1 text-amber-600 font-semibold">
            ★ 4.9 (120 reviews)
          </span>
        </div>
        <button
          onClick={() => {
            if (isPreview) alert(`Enrolled in LMS Course: ${courseTitle}`);
          }}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-all shadow"
        >
          Enroll Now & Start Learning
        </button>
      </div>
    );
  }

  // ==========================================
  // F-424: CRM Lead Capture Renderer
  // ==========================================
  if (el.type === "crm-integration") {
    const provider = getProp("crmProvider", "hubspot");
    const title = getProp("crmFormTitle", "Subscribe for Enterprise Updates");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isPreview) return;
      try {
        const res = await fetch(`${apiUrl}/api/integrations/crm/submit-lead`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, name, email }),
        });
        const data = await res.json();
        setStatus(data?.message || "Lead successfully synced with CRM!");
      } catch {
        setStatus("Synced lead data with CRM (Demo Mode).");
      }
    };

    return (
      <div className="w-full max-w-md mx-auto p-5 rounded-2xl bg-slate-950 border border-slate-800 text-white shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-slate-100">{title}</h4>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
            {provider} CRM
          </span>
        </div>
        {status ? (
          <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs font-medium">
            {status}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              required
            />
            <input
              type="email"
              placeholder="Work Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              required
            />
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition shadow-md"
            >
              Submit Lead Data
            </button>
          </form>
        )}
      </div>
    );
  }

  // ==========================================
  // F-425: Webhook Integration Renderer
  // ==========================================
  if (el.type === "webhook-integration") {
    const webhookUrl = getProp("webhookUrl", "https://hooks.zapier.com/hooks/catch/12345/abcde");
    const eventType = getProp("webhookTriggerEvent", "onButtonClick");
    const [triggered, setTriggered] = useState(false);

    const handleWebhookTrigger = async () => {
      setTriggered(true);
      try {
        await fetch(`${apiUrl}/api/integrations/webhook/dispatch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ webhookUrl, eventType, timestamp: new Date().toISOString() }),
        });
      } catch {
        // Fallback for demo mode
      }
      setTimeout(() => setTriggered(false), 3000);
    };

    return (
      <div className="w-full max-w-md mx-auto p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 text-white shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-200">Webhook Dispatcher</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
            {eventType}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mb-4 font-mono truncate">{webhookUrl}</p>
        <button
          onClick={handleWebhookTrigger}
          className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all shadow ${
            triggered
              ? "bg-emerald-500 text-slate-950"
              : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white"
          }`}
        >
          {triggered ? "Webhook Triggered Successfully ✓" : "Fire Webhook Event"}
        </button>
      </div>
    );
  }

  return null;
};
