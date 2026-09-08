import React, { useState, useEffect } from "react";
import type { EditorElement, ElementStyles } from "../types";

// ==========================================
// EDITOR WIDGET PALETTE ICONS & UTILITIES
// ==========================================

// Range 1: Palette Box Icons
export const ContainerBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-50 text-blue-600">
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="3" strokeDasharray="3 3" />
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
    </svg>
  </div>
);

export const HeadingBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center font-serif text-lg font-bold text-slate-700">
    H
  </div>
);

export const TextBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center font-sans text-lg font-bold text-slate-700">
    T
  </div>
);

export const ImageBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-emerald-50 text-emerald-600">
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  </div>
);

export const ButtonBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center">
    <div className="h-4 w-5 rounded-md border-2 border-slate-700 bg-slate-100" />
  </div>
);

export const PostsBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-purple-50 text-purple-600">
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="7" y1="7" x2="17" y2="7" />
      <line x1="7" y1="11" x2="17" y2="11" />
      <line x1="7" y1="15" x2="13" y2="15" />
    </svg>
  </div>
);

export const ShareButtonsBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-50 text-blue-600">
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  </div>
);

export const PortfolioBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-indigo-50 text-indigo-600">
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  </div>
);

export const SlidesBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-pink-50 text-pink-600">
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <polygon points="10 8 16 10 10 12 10 8" fill="currentColor" />
    </svg>
  </div>
);

export const FormBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-emerald-50 text-emerald-600">
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  </div>
);

export const LoginBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-50 text-blue-600">
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  </div>
);

export const NavMenuBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-amber-50 text-amber-600">
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  </div>
);

export const AnimatedHeadlineBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-violet-50 text-violet-600">
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7V4h16v3" />
      <path d="M9 20h6" />
      <path d="M12 4v16" />
      <path d="M18 12l2 2-2 2" />
    </svg>
  </div>
);

export const PriceTableBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-emerald-50 text-emerald-600">
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
      <path d="M15 21V9" />
    </svg>
  </div>
);

export const PriceListBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-teal-50 text-teal-600">
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="4" cy="6" r="1" fill="currentColor" />
      <circle cx="4" cy="12" r="1" fill="currentColor" />
      <circle cx="4" cy="18" r="1" fill="currentColor" />
    </svg>
  </div>
);

export const GalleryBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-pink-50 text-pink-600">
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  </div>
);

export const FlipBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-amber-50 text-amber-600">
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 1l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 23l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  </div>
);

export const CtaBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-rose-50 text-rose-600">
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 3h6v6" />
      <path d="M10 14L21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  </div>
);

export const MediaCarouselBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-cyan-50 text-cyan-600">
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M7 15l3-3 3 3" />
      <path d="M14 12l2-2 3 3" />
      <circle cx="8" cy="9" r="1" />
      <path d="M2 12h20" strokeDasharray="2 2" />
    </svg>
  </div>
);

export const TestimonialBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-emerald-50 text-emerald-600">
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 10h.01" strokeWidth="3" strokeLinecap="round" />
      <path d="M12 10h.01" strokeWidth="3" strokeLinecap="round" />
      <path d="M16 10h.01" strokeWidth="3" strokeLinecap="round" />
    </svg>
  </div>
);

export const NestedCarouselBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-indigo-50 text-indigo-600">
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <rect x="6" y="6" width="12" height="8" rx="1" strokeDasharray="2 2" />
      <path d="M8 21h8" strokeLinecap="round" />
      <path d="M12 17v4" strokeLinecap="round" />
    </svg>
  </div>
);

export const LoopCarouselBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-purple-50 text-purple-600">
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </svg>
  </div>
);

export const TocBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-teal-50 text-teal-600">
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 6h3" strokeLinecap="round" />
      <path d="M16 12h3" strokeLinecap="round" />
      <path d="M16 18h3" strokeLinecap="round" />
      <path d="M8 6h4" strokeLinecap="round" />
      <path d="M10 12h2" strokeLinecap="round" />
      <path d="M12 18h0" strokeLinecap="round" />
      <circle cx="5" cy="6" r="1" fill="currentColor" />
      <circle cx="5" cy="12" r="1" fill="currentColor" />
      <circle cx="5" cy="18" r="1" fill="currentColor" />
    </svg>
  </div>
);

export const CountdownBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-amber-50 text-amber-600">
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 15" />
      <path d="M12 2v2" strokeLinecap="round" />
    </svg>
  </div>
);

export const FacebookPageBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-50 text-blue-600">
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  </div>
);

export const BlockquoteBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-indigo-50 text-indigo-600">
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
    </svg>
  </div>
);

export const TemplateBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-purple-50 text-purple-600">
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  </div>
);

export const ReviewsBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-amber-50 text-amber-600">
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  </div>
);


// Range 2: Extended Palette Box Icons
export const FacebookButtonBoxIcon = () => (
  <svg className="h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

export const getFacebookTargetUrl = (rawUrl?: string, action?: string) => {
  let cleanedUrl = (rawUrl || "").trim();
  if (!cleanedUrl || cleanedUrl === "#") {
    cleanedUrl = typeof window !== "undefined" ? window.location.href : "https://facebook.com";
  } else if (!/^https?:\/\//i.test(cleanedUrl)) {
    cleanedUrl = `https://${cleanedUrl}`;
  }

  if (action === "share") {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(cleanedUrl)}`;
  }
  return cleanedUrl;
};

export const FacebookButtonWidgetRenderer = ({
  el,
  isPreview: _isPreview,
  mergedStyles,
}: {
  el: EditorElement;
  isPreview?: boolean;
  mergedStyles: ElementStyles;
}) => {
  const url = el.fbButtonUrl || "https://facebook.com";
  const label = el.fbButtonLabel || "Like Us on Facebook";
  const action = el.fbButtonAction || "like";
  const alignment = el.fbButtonAlignment || "left";
  const size = el.fbButtonSize || "md";
  const bgColor = el.fbButtonBgColor || "#1877F2";
  const textColor = el.fbButtonTextColor || "#ffffff";
  const hoverBgColor = el.fbButtonHoverBgColor || "#0d65d9";

  const [isHovered, setIsHovered] = useState(false);

  const targetUrl = getFacebookTargetUrl(url, action);

  const alignClass =
    alignment === "center" ? "justify-center text-center" : alignment === "right" ? "justify-end text-right" : "justify-start text-left";

  const sizeStyles =
    size === "sm"
      ? "px-3 py-1.5 text-xs gap-1.5"
      : size === "lg"
      ? "px-6 py-3 text-base gap-3 font-bold"
      : "px-4 py-2.5 text-sm gap-2 font-semibold";

  const iconSizes = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : "h-4 w-4";

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (targetUrl) {
      window.open(targetUrl, "_blank", "width=600,height=500,scrollbars=yes,resizable=yes");
    }
  };

  return (
    <div
      className={`w-full flex ${alignClass} transition-all`}
      style={{
        marginTop: mergedStyles.marginTop,
        marginBottom: mergedStyles.marginBottom,
        paddingTop: mergedStyles.paddingTop,
        paddingRight: mergedStyles.paddingRight,
        paddingBottom: mergedStyles.paddingBottom,
        paddingLeft: mergedStyles.paddingLeft,
      }}
    >
      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`inline-flex items-center rounded-xl font-sans shadow-xs transition-all duration-200 cursor-pointer hover:shadow-md active:scale-95 ${sizeStyles}`}
        style={{
          backgroundColor: isHovered ? hoverBgColor : bgColor,
          color: textColor,
          fontFamily: mergedStyles.fontFamily,
          borderRadius: mergedStyles.borderRadius,
        }}
      >
        {/* Facebook Official Logo SVG */}
        <svg className={`${iconSizes} shrink-0`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
        <span>{label}</span>
      </a>
    </div>
  );
};

/* Pro Widgets Icons & Renderers (F-198 through F-206) */
export const FacebookEmbedBoxIcon = () => (
  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="3" width="18" height="18" rx="3" strokeWidth="2" />
    <path strokeWidth="2" strokeLinecap="round" d="M10 8h4v8M14 12h-4" />
  </svg>
);

export const FacebookCommentsBoxIcon = () => (
  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

export const PayPalButtonBoxIcon = () => (
  <svg className="h-6 w-6 text-blue-800" fill="currentColor" viewBox="0 0 24 24">
    <path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944 3.72a.767.767 0 01.758-.646h6.848c2.42 0 4.287.525 5.253 1.562.909.975 1.173 2.378.784 4.17-.48 2.208-1.782 3.865-3.666 4.665-.776.33-1.682.502-2.695.51h-2.12a.767.767 0 00-.758.647l-1.39 8.249a.63.63 0 01-.622.506z" />
  </svg>
);

export const StripeButtonBoxIcon = () => (
  <svg className="h-6 w-6 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C17.75.526 15.006 0 12.18 0 6.877 0 3.12 2.766 3.12 7.37c0 7.159 9.852 6.002 9.852 9.094 0 .998-.87 1.48-2.138 1.48-2.584 0-5.58-1.127-7.464-2.227l-.927 5.626c2.083.998 5.145 1.657 8.391 1.657 5.61 0 9.389-2.659 9.389-7.397 0-7.742-10.247-6.529-10.247-9.453z" />
  </svg>
);

export const LottieBoxIcon = () => (
  <svg className="h-6 w-6 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const CodeHighlightBoxIcon = () => (
  <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

export const VideoPlaylistBoxIcon = () => (
  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);

export const MegaMenuBoxIcon = () => (
  <svg className="h-6 w-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
  </svg>
);

export const OffCanvasBoxIcon = () => (
  <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
    <path strokeWidth="2" strokeLinecap="round" d="M15 3v18" />
  </svg>
);

export const ImageCarouselBoxIcon = () => (
  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="2" y="4" width="20" height="16" rx="3" strokeWidth="2" />
    <circle cx="8" cy="10" r="2" strokeWidth="2" />
    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 16l-5-5-4 4-3-3-5 5" />
    <path strokeWidth="2" strokeLinecap="round" d="M6 12l-2-2M18 12l2-2" />
  </svg>
);

// Range 3: General Editor Utility Icons
export const EmptyPictureIcon = () => (
  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54-1.96-2.36L6.5 17h11l-3.54-4.71z" />
    </svg>
  </div>
);

export function renderSvgIcon(name: string, size: string, color: string) {
  const sizePx = `${size || 24}px`;
  const fill = color || "currentColor";
  switch (name) {
    case "heart":
      return <svg style={{ width: sizePx, height: sizePx }} viewBox="0 0 24 24" fill={fill}><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>;
    case "check":
      return <svg style={{ width: sizePx, height: sizePx }} viewBox="0 0 24 24" fill="none" stroke={fill} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
    case "info":
      return <svg style={{ width: sizePx, height: sizePx }} viewBox="0 0 24 24" fill="none" stroke={fill} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>;
    case "alert":
      return <svg style={{ width: sizePx, height: sizePx }} viewBox="0 0 24 24" fill="none" stroke={fill} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
    case "globe":
      return <svg style={{ width: sizePx, height: sizePx }} viewBox="0 0 24 24" fill="none" stroke={fill} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>;
    case "star":
    default:
      return <svg style={{ width: sizePx, height: sizePx }} viewBox="0 0 24 24" fill={fill}><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>;
  }
}

export function AnimatedCounter({ start, end, prefix, suffix, duration }: { start: number; end: number; prefix: string; suffix: string; duration: number }) {
  const [count, setCount] = useState(start);

  useEffect(() => {
    let startTime: number | null = null;
    let frameId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * (end - start) + start));
      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [start, end, duration]);

  return <span>{prefix}{count}{suffix}</span>;
}

// Upload Icon
export const UploadCloudIcon = () => (
  <svg className="h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

// ==========================================
// Default Elements Creator
// ==========================================

