import React, { useState } from "react";
import type { EditorElement, ElementStyles, PageConfig } from "../types";
import { resolveImageUrl } from "../utils";

// --- COUNTER WIDGET ---
export const CounterWidgetRenderer: React.FC<{
  el: EditorElement;
  mergedStyles?: ElementStyles;
  isPreview?: boolean;
}> = ({ el }) => {
  return (
    <div className="w-full p-5 rounded-xl bg-white border border-slate-100 text-center shadow-xs">
      <div className="text-3xl font-extrabold text-blue-600 tracking-tight font-mono">
        <span>{el.counterPrefix || ""}</span>
        <span>{el.counterEnd ?? el.content ?? 100}</span>
        <span>{el.counterSuffix || "+"}</span>
      </div>
      <p className="text-xs font-semibold text-slate-600 mt-1 uppercase tracking-wider">
        {el.counterTitle || el.title || "Happy Customers"}
      </p>
    </div>
  );
};

// --- PROGRESS BAR WIDGET ---
export const ProgressBarWidgetRenderer: React.FC<{
  el: EditorElement;
  mergedStyles?: ElementStyles;
  isPreview?: boolean;
}> = ({ el }) => {
  const value = el.progressValue ?? (el as any).percentage ?? 85;
  const height = el.progressHeight || 12;
  const label = el.progressLabel || el.title || el.content || "Skill Level";
  return (
    <div className="w-full space-y-1.5 text-left">
      <div className="flex justify-between text-xs font-bold text-slate-700">
        <span>{label}</span>
        <span className="font-mono text-teal-600">{value}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full overflow-hidden" style={{ height: `${height}px` }}>
        <div
          className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full transition-all duration-1000"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
};

// --- RATING WIDGET ---
export const RatingWidgetRenderer: React.FC<{
  el: EditorElement;
  mergedStyles?: ElementStyles;
  isPreview?: boolean;
}> = ({ el }) => {
  const max = el.ratingMax || 5;
  const score = el.ratingValue ?? 4.8;
  const stars = Array.from({ length: max }, (_, i) => i + 1);
  return (
    <div className="w-full flex items-center gap-2">
      <div className="flex items-center gap-1">
        {stars.map((s) => (
          <span
            key={s}
            style={{ color: s <= Math.round(score) ? el.ratingColor || "#f59e0b" : "#cbd5e1" }}
            className="text-lg"
          >
            ★
          </span>
        ))}
      </div>
      {el.ratingShowText !== false && (
        <span className="text-xs font-bold text-slate-700 font-mono">
          {score} / {max}
        </span>
      )}
    </div>
  );
};

// --- ALERT WIDGET ---
export const AlertWidgetRenderer: React.FC<{
  el: EditorElement;
  mergedStyles?: ElementStyles;
  isPreview?: boolean;
}> = ({ el }) => {
  const type = el.alertType || "info";
  const bgMap: Record<string, string> = {
    info: "bg-blue-50 border-blue-200 text-blue-900",
    success: "bg-emerald-50 border-emerald-200 text-emerald-900",
    warning: "bg-amber-50 border-amber-200 text-amber-900",
    danger: "bg-rose-50 border-rose-200 text-rose-900",
  };
  const iconMap: Record<string, string> = {
    info: "ℹ️",
    success: "✅",
    warning: "⚠️",
    danger: "🚨",
  };
  return (
    <div className={`w-full p-4 rounded-xl border flex items-start justify-between gap-3 text-left ${bgMap[type] || bgMap.info}`}>
      <div className="flex items-start gap-2.5">
        <span className="text-base leading-none">{iconMap[type]}</span>
        <div className="space-y-0.5">
          <h5 className="font-bold text-xs">{el.alertTitle || "Notice"}</h5>
          <p className="text-xs opacity-90">{el.content || (el as any).alertMessage || "This is an important alert banner message."}</p>
        </div>
      </div>
    </div>
  );
};

// --- GOOGLE MAPS WIDGET ---
export const GoogleMapsWidgetRenderer: React.FC<{
  el: EditorElement;
  mergedStyles?: ElementStyles;
  isPreview?: boolean;
}> = ({ el }) => {
  const height = el.mapHeight || 350;
  const addr = el.mapAddress || (el as any).address || "San Francisco, CA";
  const zoom = el.mapZoom || 14;
  return (
    <div
      className="w-full rounded-xl overflow-hidden border border-slate-200 shadow-xs bg-slate-100 relative"
      style={{ height: `${height}px` }}
    >
      <iframe
        title="Google Map Location"
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        allowFullScreen
        src={`https://maps.google.com/maps?q=${encodeURIComponent(addr)}&t=&z=${zoom}&ie=UTF8&iwloc=&output=embed`}
      />
    </div>
  );
};

// --- SOUNDCLOUD WIDGET ---
export const SoundcloudWidgetRenderer: React.FC<{
  el: EditorElement;
  mergedStyles?: ElementStyles;
  isPreview?: boolean;
}> = ({ el }) => {
  const url = (el as any).soundcloudTrackUrl || el.src || el.content || "https://soundcloud.com/forss/flickermood";
  const height = (el as any).soundcloudHeight || 166;
  return (
    <div className="w-full rounded-xl overflow-hidden border border-slate-200 shadow-xs bg-slate-900">
      <iframe
        title="SoundCloud Player"
        width="100%"
        height={height}
        scrolling="no"
        frameBorder="no"
        allow="autoplay"
        src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`}
      />
    </div>
  );
};

// --- LINK IN BIO WIDGET ---
export const LinkInBioWidgetRenderer: React.FC<{
  el: EditorElement;
  mergedStyles?: ElementStyles;
  isPreview?: boolean;
  apiUrl?: string;
}> = ({ el, isPreview, apiUrl = "" }) => {
  const links = el.bioLinks || [
    { id: "b1", label: "My Portfolio", url: "https://example.com", icon: "🌐", badge: "New" },
    { id: "b2", label: "Subscribe to Newsletter", url: "#", icon: "📩" },
  ];
  return (
    <div className="w-full max-w-sm mx-auto p-6 rounded-2xl bg-white shadow-xl border border-slate-100 text-center space-y-4">
      {el.bioAvatarUrl ? (
        <img
          src={resolveImageUrl(el.bioAvatarUrl, apiUrl)}
          alt="Bio Avatar"
          className="w-20 h-20 rounded-full mx-auto object-cover ring-4 ring-pink-100 shadow-md"
        />
      ) : (
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-pink-500 to-rose-400 text-white flex items-center justify-center text-2xl font-bold mx-auto shadow-md ring-4 ring-pink-100">
          {(el.bioName || "@user").charAt(0).toUpperCase()}
        </div>
      )}
      <div>
        <h3 className="font-bold text-base text-slate-900">{el.bioName || "@username"}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{el.bioTagline || "Digital Creator & Designer"}</p>
      </div>
      <div className="space-y-2.5 pt-2">
        {links.map((link: any) => (
          <a
            key={link.id}
            href={link.url || "#"}
            onClick={(e) => {
              if (!isPreview) e.preventDefault();
            }}
            className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 hover:bg-pink-50 border border-slate-200/80 hover:border-pink-200 text-xs font-semibold text-slate-700 hover:text-pink-600 transition shadow-xs group"
          >
            <span className="flex items-center gap-2">
              <span>{link.icon || "🔗"}</span>
              <span>{link.label}</span>
            </span>
            {link.badge && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-pink-100 text-pink-700">
                {link.badge}
              </span>
            )}
          </a>
        ))}
      </div>
    </div>
  );
};

// --- IMAGE BOX WIDGET ---
export const ImageBoxWidgetRenderer: React.FC<{
  el: EditorElement;
  mergedStyles?: ElementStyles;
  isPreview?: boolean;
  apiUrl?: string;
}> = ({ el, isPreview, apiUrl = "" }) => {
  const pos = el.imageBoxPosition || "top";
  const isRow = pos === "left" || pos === "right";
  const isReverse = pos === "right";
  return (
    <div
      className={`w-full flex ${isRow ? "flex-row" : "flex-col"} ${
        isReverse ? "flex-row-reverse" : ""
      } items-center gap-4 p-4 rounded-xl border border-slate-100 bg-white shadow-xs group hover:shadow-md transition`}
    >
      {el.src ? (
        <img
          src={resolveImageUrl(el.src, apiUrl)}
          alt={el.title || "Image Box"}
          className={`${isRow ? "w-1/3" : "w-full"} h-44 object-cover rounded-lg group-hover:scale-102 transition duration-300`}
        />
      ) : (
        <div
          className={`${
            isRow ? "w-1/3" : "w-full"
          } h-36 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs font-medium`}
        >
          🖼️ Image Box
        </div>
      )}
      <div className="flex-1 text-left space-y-1">
        <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition">
          {el.title || "Image Box Feature"}
        </h4>
        <p className="text-xs text-slate-600 leading-relaxed">
          {el.content || "Detailed description of the feature or highlight box element."}
        </p>
        {el.href && (
          <a
            href={el.href}
            onClick={(e) => {
              if (!isPreview) e.preventDefault();
            }}
            className="inline-block pt-1 text-xs font-bold text-blue-600 hover:underline"
          >
            Learn More →
          </a>
        )}
      </div>
    </div>
  );
};

// --- ICON BOX WIDGET ---
export const IconBoxWidgetRenderer: React.FC<{
  el: EditorElement;
  mergedStyles?: ElementStyles;
  isPreview?: boolean;
}> = ({ el }) => {
  const pos = el.iconBoxPosition || "top";
  const isRow = pos === "left" || pos === "right";
  const isReverse = pos === "right";
  return (
    <div
      className={`w-full flex ${isRow ? "flex-row" : "flex-col"} ${
        isReverse ? "flex-row-reverse" : ""
      } items-start gap-3.5 p-5 rounded-xl border border-slate-100 bg-white shadow-xs group hover:shadow-md transition`}
    >
      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition">
        {el.iconName || el.icon || "⚡"}
      </div>
      <div className="space-y-1 text-left">
        <h4 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition">
          {el.title || "Icon Box Heading"}
        </h4>
        <p className="text-xs text-slate-600 leading-relaxed">
          {el.content || "Brief explanatory text about this service, capability, or key benefit."}
        </p>
      </div>
    </div>
  );
};

// --- ICON LIST WIDGET ---
export const IconListWidgetRenderer: React.FC<{
  el: EditorElement;
  mergedStyles?: ElementStyles;
  isPreview?: boolean;
}> = ({ el, isPreview }) => {
  const items = el.iconListItems || [
    { id: "1", text: "High priority SLA support", icon: "✓", color: "#10b981" },
    { id: "2", text: "Unlimited custom domains", icon: "✓", color: "#10b981" },
    { id: "3", text: "Advanced analytics dashboard", icon: "✓", color: "#10b981" },
  ];
  return (
    <div className="w-full space-y-2 text-left">
      {items.map((item: any) => (
        <div key={item.id} className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
            style={{ backgroundColor: `${item.color || "#10b981"}20`, color: item.color || "#10b981" }}
          >
            {item.icon || "✓"}
          </span>
          {item.url ? (
            <a
              href={item.url}
              onClick={(e) => {
                if (!isPreview) e.preventDefault();
              }}
              className="hover:underline"
              style={{ color: "inherit" }}
            >
              {item.text}
            </a>
          ) : (
            <span>{item.text}</span>
          )}
        </div>
      ))}
    </div>
  );
};

// --- POSTS WIDGET ---
export const PostsWidgetRenderer: React.FC<{
  el: EditorElement;
  mergedStyles?: ElementStyles;
  activeDevice?: string;
  isPreview?: boolean;
  apiUrl?: string;
}> = ({ el, activeDevice = "desktop", isPreview, apiUrl = "" }) => {
  const postsList = el.posts && el.posts.length > 0 ? el.posts : [];
  const columns = el.postsColumns || 3;
  const gap = el.postsGap ?? 20;
  const imageHeight = el.postsImageHeight || "180px";
  const align = el.postsAlignment || "left";
  const showImage = el.postsShowImage !== false;
  const showDate = el.postsShowDate !== false;
  const showExcerpt = el.postsShowExcerpt !== false;
  const showReadMore = el.postsShowReadMore !== false;

  let gridColsStyle: React.CSSProperties = {};
  if (activeDevice === "mobile") {
    gridColsStyle = { gridTemplateColumns: "repeat(1, minmax(0, 1fr))" };
  } else if (activeDevice === "tablet") {
    gridColsStyle = { gridTemplateColumns: `repeat(${Math.min(columns, 2)}, minmax(0, 1fr))` };
  } else {
    gridColsStyle = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };
  }

  return (
    <div style={{ width: "100%", boxSizing: "border-box" }}>
      {postsList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-8 text-center bg-slate-50/50">
          <p className="text-xs font-bold text-slate-600">No Posts Configured</p>
          <p className="text-[10px] text-slate-400 mt-1">Use the right properties panel to add blog posts.</p>
        </div>
      ) : (
        <div className="grid" style={{ gap: `${gap}px`, ...gridColsStyle }}>
          {postsList.map((post) => (
            <article
              key={post.id}
              className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs transition hover:shadow-md hover:-translate-y-0.5"
              style={{ textAlign: align as any }}
            >
              {showImage && post.image && (
                <div className="relative overflow-hidden bg-slate-100" style={{ height: imageHeight }}>
                  <img
                    src={resolveImageUrl(post.image, apiUrl)}
                    alt={post.title}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                </div>
              )}
              <div className="flex flex-1 flex-col p-5">
                {showDate && (post.date || post.author) && (
                  <div className="mb-2 flex items-center text-[11px] font-medium text-slate-400 gap-2">
                    {post.date && <span>{post.date}</span>}
                    {post.date && post.author && <span>•</span>}
                    {post.author && <span>By {post.author}</span>}
                  </div>
                )}
                <h3 className="text-base font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition mb-2">
                  {post.title}
                </h3>
                {showExcerpt && post.excerpt && (
                  <p className="text-xs text-slate-600 leading-relaxed flex-1 mb-4">
                    {post.excerpt}
                  </p>
                )}
                {showReadMore && (
                  <div className="mt-auto">
                    <a
                      href={post.readMoreUrl || "#"}
                      onClick={(e) => {
                        if (!isPreview) e.preventDefault();
                      }}
                      className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-800 transition gap-1"
                    >
                      <span>{post.readMoreText || "Read More →"}</span>
                    </a>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

// --- PORTFOLIO WIDGET ---
export const PortfolioWidgetRenderer: React.FC<{
  el: EditorElement;
  mergedStyles?: ElementStyles;
  activeDevice?: string;
  isPreview?: boolean;
}> = ({ el, mergedStyles = {}, activeDevice = "desktop", isPreview }) => {
  const items = el.portfolioItems && el.portfolioItems.length > 0 ? el.portfolioItems : [];
  const columns = el.portfolioColumns || 3;
  const gap = el.portfolioGap ?? 24;
  const imageHeight = el.portfolioImageHeight || "240px";
  const align = el.portfolioAlignment || "left";
  const showCategory = el.portfolioShowCategory !== false;
  const showDescription = el.portfolioShowDescription !== false;
  const showLink = el.portfolioShowLink !== false;

  let colClass = "grid-cols-3";
  if (columns === 1) colClass = "grid-cols-1";
  else if (columns === 2) colClass = "grid-cols-1 md:grid-cols-2";
  else if (columns === 3) colClass = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
  else if (columns === 4) colClass = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";

  if (activeDevice === "mobile") colClass = "grid-cols-1";
  else if (activeDevice === "tablet" && columns > 2) colClass = "grid-cols-2";

  const textAlignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  const flexJustifyClass = align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start";

  return (
    <div style={{ width: "100%", boxSizing: "border-box" }}>
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-8 text-center bg-slate-50/50">
          <p className="text-sm font-bold text-slate-600">No Portfolio Items Created</p>
          <p className="text-xs text-slate-400 mt-1">Use the properties panel to add projects & works.</p>
        </div>
      ) : (
        <div className={`grid ${colClass}`} style={{ gap: `${gap}px` }}>
          {items.map((item) => (
            <div
              key={item.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-slate-300"
            >
              <div className="relative overflow-hidden bg-slate-100" style={{ height: imageHeight }}>
                <img
                  src={item.image || "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&auto=format&fit=crop&q=80"}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {showCategory && item.category && (
                  <div className="absolute top-3 left-3">
                    <span className="inline-block rounded-full bg-slate-900/80 backdrop-blur-md px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
                      {item.category}
                    </span>
                  </div>
                )}
              </div>
              <div className={`flex flex-col flex-1 p-5 ${textAlignClass}`}>
                <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition" style={{ fontFamily: mergedStyles.fontFamily }}>
                  {item.title}
                </h4>
                {showDescription && item.description && (
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed flex-1 line-clamp-3" style={{ fontFamily: mergedStyles.fontFamily }}>
                    {item.description}
                  </p>
                )}
                {showLink && (
                  <div className={`mt-4 flex items-center ${flexJustifyClass}`}>
                    <a
                      href={item.url || "#"}
                      onClick={(e) => {
                        if (!isPreview) e.preventDefault();
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
                    >
                      <span>View Project</span>
                      <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- VIDEO PLAYLIST WIDGET ---
export const VideoPlaylistWidgetRenderer: React.FC<{
  el: EditorElement;
  mergedStyles?: ElementStyles;
  isPreview?: boolean;
  onSelectElement?: (id: string) => void;
  onUpdateElement?: (updater: (prev: EditorElement) => EditorElement) => void;
  apiUrl?: string;
}> = ({ el, mergedStyles = {}, isPreview, onSelectElement, onUpdateElement, apiUrl = "" }) => {
  const items = el.playlistItems || [];
  const [internalActiveId, setInternalActiveId] = useState<string>(el.playlistActiveId || items[0]?.id || "");

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 py-10 px-6 text-center transition hover:border-blue-400">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 text-xl font-bold">
          📺
        </div>
        <h4 className="mt-3 text-xs font-bold text-slate-700">No video playlist items</h4>
        <p className="mt-1 text-[11px] text-slate-400 mb-4 max-w-xs">Add videos to this playlist from the properties sidebar</p>
        {!isPreview && onSelectElement && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectElement(el.id);
            }}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
          >
            Manage Playlist
          </button>
        )}
      </div>
    );
  }

  const activeId = el.playlistActiveId || internalActiveId || items[0]?.id;
  const activeIndex = Math.max(0, items.findIndex((it) => it.id === activeId));
  const activeItem = items[activeIndex] || items[0];
  const isRightPosition = (el.playlistPosition || "right") === "right";
  const playerWidthPercentage = el.playlistPlayerWidth || "65%";

  const handleSelectItem = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setInternalActiveId(itemId);
    if (onUpdateElement) {
      onUpdateElement((prev) => ({ ...prev, playlistActiveId: itemId }));
    }
  };

  const srcUrl = (activeItem?.url || activeItem?.videoUrl || "").trim();
  const posterUrl = activeItem?.thumbnailUrl || activeItem?.thumbnail;

  const ytMatch = srcUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  const ytId = ytMatch?.[1];
  const vimeoMatch = srcUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  const vimeoId = vimeoMatch?.[1];

  let videoNode: React.ReactNode;
  if (ytId) {
    videoNode = (
      <iframe
        src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
        title={activeItem?.title || "Video"}
        className="h-full w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  } else if (vimeoId) {
    videoNode = (
      <iframe
        src={`https://player.vimeo.com/video/${vimeoId}`}
        title={activeItem?.title || "Video"}
        className="h-full w-full border-0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    );
  } else {
    videoNode = (
      <video
        src={srcUrl ? (srcUrl.startsWith("http") ? srcUrl : `${apiUrl}${srcUrl}`) : undefined}
        poster={posterUrl ? (posterUrl.startsWith("http") ? posterUrl : `${apiUrl}${posterUrl}`) : undefined}
        controls
        className="h-full w-full object-cover"
      >
        Your browser does not support HTML5 video.
      </video>
    );
  }

  return (
    <div
      style={{
        textAlign: (mergedStyles.textAlign as any) || "left",
        width: "100%",
        boxSizing: "border-box",
      }}
      className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm"
    >
      <div className={isRightPosition ? "flex flex-col md:flex-row" : "flex flex-col"}>
        <div
          style={{ width: isRightPosition ? playerWidthPercentage : "100%" }}
          className="relative aspect-video bg-black flex items-center justify-center shrink-0"
        >
          {videoNode}
        </div>
        <div
          style={{ width: isRightPosition ? `calc(100% - ${playerWidthPercentage})` : "100%" }}
          className="flex flex-col border-t md:border-t-0 md:border-l border-slate-200 bg-slate-50 max-h-[460px]"
        >
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shrink-0">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Playlist ({items.length})
            </h4>
            <span className="text-[10px] font-semibold text-slate-400">
              #{activeIndex + 1} of {items.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-200/80 p-1 space-y-1">
            {items.map((item, idx) => {
              const isActive = item.id === activeId;
              return (
                <button
                  key={item.id || idx}
                  type="button"
                  onClick={(e) => handleSelectItem(item.id, e)}
                  className={`w-full text-left p-2.5 rounded-lg transition flex items-center gap-3 group ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/60"
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {isActive ? "▶" : String(idx + 1).padStart(2, "0")}
                  </div>
                  {item.thumbnailUrl && (
                    <img
                      src={resolveImageUrl(item.thumbnailUrl, apiUrl)}
                      alt={item.title}
                      className="h-9 w-14 object-cover rounded border border-black/10 shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h5 className={`truncate text-xs font-semibold ${isActive ? "text-white" : "text-slate-800"}`}>
                      {item.title || `Video ${idx + 1}`}
                    </h5>
                    {item.duration && (
                      <span className={`text-[10px] font-mono ${isActive ? "text-blue-100" : "text-slate-400"}`}>
                        ⏱️ {item.duration}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
