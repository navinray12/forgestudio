import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
    resolveElementStyles,
    getInnerStyles,
    getMergedLayout,
    resolveMotionAttrs,
    resolveStickyStyles,
    initMotionRuntime
} from "../editor/utils";
import type { EditorElement, Breakpoint } from "../editor/types";
import { resolveDynamicTokens } from "../editor/types";
import type { PopupConfig } from "../../types/popup.types";

const BackgroundSlideshow: React.FC<{ urls: string[]; interval?: number }> = ({ urls, interval }) => {
    const [index, setIndex] = useState(0);
    useEffect(() => {
        if (!urls || urls.length <= 1) return;
        const timer = setInterval(() => {
            setIndex((i) => (i + 1) % urls.length);
        }, interval || 5000);
        return () => clearInterval(timer);
    }, [urls, interval]);

    if (!urls || urls.length === 0) return null;
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {urls.map((url, i) => (
                <div
                    key={url + i}
                    className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
                        i === index ? "opacity-100" : "opacity-0"
                    }`}
                    style={{ backgroundImage: `url(${url})` }}
                />
            ))}
        </div>
    );
};

export interface PageConfig {
    id: string;
    name: string;
    slug: string;
    customCss: string;
    elements: EditorElement[];
    isHome?: boolean;
}

export function f352_getMediaOptimizationProps(src: string, _apiUrl: string, _styles: any) {
    return { src };
}

export function getGlobalCustomCss(pages: any, _popups: any, _breakpoints: any, globalSettings: any, _id: any) {
    let css = "";
    const gStyles = globalSettings?.globalStyles || globalSettings || {};
    const vars = globalSettings?.variables || gStyles.variables || {};
    const classes = globalSettings?.globalClasses || gStyles.globalClasses || {};
    
    // 1. CSS Root Variables (F-066, F-067, F-071)
    css += ":root {\n";
    if (gStyles.primaryColor || gStyles.colors?.primary) css += `  --primary-color: ${gStyles.colors?.primary || gStyles.primaryColor};\n`;
    if (gStyles.secondaryColor || gStyles.colors?.secondary) css += `  --secondary-color: ${gStyles.colors?.secondary || gStyles.secondaryColor};\n`;
    if (gStyles.accentColor || gStyles.colors?.accent) css += `  --accent-color: ${gStyles.colors?.accent || gStyles.accentColor};\n`;
    if (gStyles.backgroundColor || gStyles.colors?.background) css += `  --bg-color: ${gStyles.colors?.background || gStyles.backgroundColor};\n`;
    if (gStyles.textColor || gStyles.colors?.text) css += `  --text-color: ${gStyles.colors?.text || gStyles.textColor};\n`;
    if (gStyles.headingFont || gStyles.typography?.headingFontFamily) css += `  --heading-font: ${gStyles.typography?.headingFontFamily || gStyles.headingFont};\n`;
    if (gStyles.bodyFont || gStyles.typography?.fontFamily) css += `  --body-font: ${gStyles.typography?.fontFamily || gStyles.bodyFont};\n`;
    if (gStyles.borderRadius || gStyles.buttonStyles?.borderRadius) css += `  --border-radius: ${gStyles.buttonStyles?.borderRadius || gStyles.borderRadius};\n`;
    if (gStyles.containerMaxWidth || gStyles.containerStyles?.maxWidth) css += `  --container-max-width: ${gStyles.containerStyles?.maxWidth || gStyles.containerMaxWidth};\n`;

    if (vars && typeof vars === "object") {
        Object.entries(vars).forEach(([k, v]: [string, any]) => {
            const varName = k.startsWith("--") ? k : `--${k}`;
            const val = typeof v === "object" ? v.value : v;
            if (val) css += `  ${varName}: ${val};\n`;
        });
    }
    css += "}\n\n";

    // 2. Global Classes (F-068)
    if (classes && typeof classes === "object") {
        Object.entries(classes).forEach(([className, styleObj]: [string, any]) => {
            if (styleObj && typeof styleObj === "object") {
                const rules = Object.entries(styleObj)
                    .map(([prop, val]) => {
                        const kebab = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
                        return `${kebab}: ${val};`;
                    })
                    .join(" ");
                if (rules) css += `.${className} { ${rules} }\n`;
            }
        });
    }

    // 3. Custom Page CSS
    if (Array.isArray(pages)) {
        pages.forEach((p: any) => {
            if (p?.customCss) css += `\n/* Page: ${p.name || p.id} */\n${p.customCss}\n`;
        });
    }

    return css;
}

const CodeInjectionRuntime = React.lazy(() => import("../editor/components/CodeInjectionRuntime"));
const HtmlNode = React.lazy(() => import("../../components/HtmlNode"));
import { CookieConsentBanner } from "../../components/CookieConsentBanner";
import { useLazyLoad } from "../../hooks/useLazyLoad";
import { useDynamicFonts } from "../../utils/FontManager";
import { SkipLinks } from "../../components/accessibility/SkipLinks";
import { ReadingGuideBar } from "../../components/accessibility/ReadingGuideBar";
import { AccessibilityWidget } from "../../components/accessibility/AccessibilityWidget";
import { AccessibilityStatementModal } from "../../components/accessibility/AccessibilityStatementModal";
import { WooCommerceProvider } from "../../context/WooCommerceContext";

import {
    SlidesWidgetRenderer,
    FormWidgetRenderer,
    LoginWidgetRenderer,
    NavMenuWidgetRenderer,
    AnimatedHeadlineWidgetRenderer,
    PriceTableWidgetRenderer,
    PriceListWidgetRenderer,
    GalleryWidgetRenderer,
    FlipBoxWidgetRenderer,
    CtaWidgetRenderer,
    MediaCarouselWidgetRenderer,
    TestimonialCarouselWidgetRenderer,
    NestedCarouselWidgetRenderer,
    LoopCarouselWidgetRenderer,
    ImageCarouselWidgetRenderer,
    TocWidgetRenderer,
    CountdownWidgetRenderer,
    FacebookPageWidgetRenderer,
    BlockquoteWidgetRenderer,
    ReviewsWidgetRenderer,
    FacebookButtonWidgetRenderer,
    FacebookEmbedWidgetRenderer,
    FacebookCommentsWidgetRenderer,
    PayPalButtonWidgetRenderer,
    StripeButtonWidgetRenderer,
    LottieWidgetRenderer,
    CodeHighlightWidgetRenderer,
    BasicMediaCarouselWidgetRenderer,
    BasicGalleryWidgetRenderer,
    AudioPlaylistWidgetRenderer,
    DynamicLightboxWidgetRenderer,
    CustomSvgWidgetRenderer,
    IconLibraryWidgetRenderer,
    MegaMenuWidgetRenderer,
    OffCanvasWidgetRenderer,
    ShareButtonsWidgetRenderer,
    WcProductTitleWidgetRenderer,
    WcProductPriceWidgetRenderer,
    WcProductImagesWidgetRenderer,
    WcAddToCartWidgetRenderer,
    WcProductRatingWidgetRenderer,
    WcBuilderWidgetRenderer,
    WcProductWidgetRenderer,
    WcProductStockWidgetRenderer,
    WcProductMetaWidgetRenderer,
    WcProductContentWidgetRenderer,
    WcShortDescriptionWidgetRenderer,
    WcProductDataTabsWidgetRenderer,
    WcAdditionalInfoWidgetRenderer,
    WcRelatedProductsWidgetRenderer,
    WcUpsellsWidgetRenderer,
    WcProductsWidgetRenderer,
    WcCustomAddToCartWidgetRenderer,
    WcProductCategoriesWidgetRenderer,
    WcMenuCartWidgetRenderer,
    WcCartWidgetRenderer,
    WcCheckoutWidgetRenderer,
    WcMyAccountWidgetRenderer,
    WcPurchaseSummaryWidgetRenderer,
    WcNoticesWidgetRenderer,
    WcShopLayoutsWidgetRenderer,
    WcProductArchiveWidgetRenderer,
    WcProductPageTemplatesWidgetRenderer,
    WcProductArchiveTemplatesWidgetRenderer,
    resolveButtonHref,
    SearchBarWidgetRenderer,
    LoopGridWidgetRenderer,
    DEFAULT_LOOP_ITEMS
} from "../editor/widgets";
import {
    BreadcrumbsRenderer,
    WpMenuRenderer,
    PostNavigationRenderer,
    TaxonomyFilterRenderer,
    SiteSearchRenderer,
    MenuAnchorRenderer
} from "../editor/navigation/NavigationRenderers";
import { IconRenderer } from "../editor/widgets/icons";

// Default breakpoints (mirror core for stability)
const DEFAULT_BREAKPOINTS: Breakpoint[] = [
    { id: "widescreen", name: "Widescreen", width: 1440, active: false },
    { id: "laptop", name: "Laptop", width: 1200, active: false },
    { id: "desktop", name: "Desktop (Base)", width: 1024, active: true },
    { id: "tabletExtra", name: "Tablet Extra", width: 880, active: false },
    { id: "tablet", name: "Tablet", width: 768, active: true },
    { id: "mobileExtra", name: "Mobile Extra", width: 480, active: false },
    { id: "mobile", name: "Mobile", width: 360, active: true },
];

const renderSvgIcon = (_name: string, size: string, color: string) => (
    <svg width={size} height={size} fill={color} viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
);

const findTargetPage = (pagesList: PageConfig[] | undefined, target: string): PageConfig | undefined => {
    if (!target || !pagesList || pagesList.length === 0) return undefined;
    const clean = target.replace(/^\//, "").split("?")[0].split("#")[0];
    return pagesList.find(
        (p) =>
            p.id === target ||
            p.slug === target ||
            p.slug === `/${clean}` ||
            p.slug.replace(/^\//, "") === clean ||
            p.name.toLowerCase() === target.toLowerCase() ||
            p.name.toLowerCase() === clean.toLowerCase() ||
            (clean === "" && (p.isHome || p.id === "home"))
    );
};

export function renderPublicElement(el: EditorElement, isPreview: boolean = true): React.ReactNode | null {
    switch (el.type) {
        case "breadcrumbs":
            return <BreadcrumbsRenderer element={el} isPreview={isPreview} />;
        case "wp-menu":
            return <WpMenuRenderer element={el} isPreview={isPreview} />;
        case "menu-anchor":
            return (
                <div
                    id={(el as any).anchorId || (el as any).styles?.anchorId || el.content || el.id}
                    style={{ scrollMarginTop: `${(el as any).anchorOffset || (el as any).styles?.anchorScrollOffset || 80}px`, height: 0 }}
                />
            );
        case "post-nav":
            return <PostNavigationRenderer element={el} isPreview={isPreview} />;
        case "taxonomy-filter":
            return <TaxonomyFilterRenderer element={el} isPreview={isPreview} />;
        case "search-bar":
        case "search-form":
            return typeof SearchBarWidgetRenderer !== "undefined" ? (
                <SearchBarWidgetRenderer el={el} isPreview={isPreview} mergedStyles={el.styles} />
            ) : (
                <SiteSearchRenderer element={el} isPreview={isPreview} />
            );
        case "site-search":
            return <SiteSearchRenderer element={el} isPreview={isPreview} />;
        default:
            return null;
    }
}

interface RenderNodeProps {
    el: EditorElement;
    isCritical: boolean;
    activeBreakpointId: string;
    breakpoints: Breakpoint[];
    globalSettings: any;
    elementClassMap: Map<string, string>;
    apiUrl: string;
    websiteId?: string;
    allElements?: EditorElement[];
    pages?: PageConfig[];
    onSwitchPage?: (page: PageConfig) => void;
}

// F-358: Safely caches execution overhead per Element in PublishedSite skipping massive style hashing recalculations
const RenderNode: React.FC<RenderNodeProps> = React.memo(({ el, isCritical, activeBreakpointId, breakpoints, globalSettings, elementClassMap, apiUrl, websiteId, allElements, pages, onSwitchPage }) => {
    // F-351 logic exactly as website outputs
    const resolvedStyles = resolveElementStyles(el, activeBreakpointId, breakpoints, globalSettings);

    const hasBgImage = !!resolvedStyles.backgroundImage;

    // F-355: Lazy Loading Observer for Background Images
    const { ref: observerRef, isVisible } = useLazyLoad({
        enabled: !isCritical && hasBgImage,
        rootMargin: "400px"
    });

    const customAttrs = (Array.isArray(el.customAttributes) ? el.customAttributes : []).filter((a: any) => a.enabled !== false).reduce((acc: any, attr: any) => {
        if (attr.name) acc[attr.name] = attr.value || "";
        return acc;
    }, {}) || {};

    const optClass = elementClassMap.get(el.id);
    const optInnerClass = optClass ? `${optClass}-inner` : "";

    const motionAttrs = resolveMotionAttrs(el);
    const stickyStyles = resolveStickyStyles(el);

    // Defer Background Image safely via F-355
    let finalMergedStyles: any = {
        ...(optClass ? {} : resolvedStyles),
        ...stickyStyles
    };
    let finalInnerStyles: any = optClass ? {} : getInnerStyles(resolvedStyles);

    // Keep backgroundImage strictly inline safely
    if (resolvedStyles.backgroundImage) {
        if (!isCritical && hasBgImage && !isVisible) {
            // Wait for intersection
        } else {
            // It is visible or critical, apply it inline
            finalMergedStyles.backgroundImage = resolvedStyles.backgroundImage;
        }
    }

    const mergedProps: any = {
        id: (el as any).cssId || undefined,
        "data-el-id": el.id,
        ...customAttrs,
        ...motionAttrs,
        className: `fs-el-${el.id} ${(el as any).cssClasses?.join(" ") || ""} ${el.customClass || ""} relative transition duration-150${optClass ? " " + optClass : ""}`,
        style: finalMergedStyles,
        "data-lazy": (!isCritical && hasBgImage) ? (isVisible ? "loaded" : "waiting") : undefined
    };

    // Forward ref natively avoiding wrappers (F-351 / F-355 bounds)
    const assignRefIfTracked = (!isCritical && hasBgImage) ? observerRef : undefined;

    // F-260, F-261: Client-Side Dynamic Token Interpolation Runtime
    const urlQueryParams: Record<string, string> = {};
    if (typeof window !== "undefined" && window.location.search) {
        new URLSearchParams(window.location.search).forEach((val, key) => {
            urlQueryParams[key] = val;
        });
    }
    const tokenContext = {
        siteName: globalSettings?.siteIdentity?.name || "ForgeStudio",
        pageTitle: pages?.find(p => p.id === (el as any).pageId)?.name || "Page",
        request: urlQueryParams,
        query: urlQueryParams,
        post: {
            title: pages?.find(p => p.id === (el as any).pageId)?.name || "Dynamic Post",
            date: new Date().toLocaleDateString(),
        }
    };

    if (el.type === "heading") {
        const resolvedHeading = resolveDynamicTokens(el.content || "", tokenContext);
        return <React.Fragment key={el.id}><h2 ref={assignRefIfTracked as any} {...mergedProps} className={`${mergedProps.className} ${optInnerClass}`} style={{ fontSize: "32px", fontWeight: "700", color: "#0f172a", ...mergedProps.style, ...finalInnerStyles }}>{resolvedHeading}</h2></React.Fragment>;
    }

    if (el.type === "text") {
        const resolvedText = resolveDynamicTokens(el.content || "", tokenContext);
        return <React.Fragment key={el.id}><p ref={assignRefIfTracked as any} {...mergedProps} className={`${mergedProps.className} ${optInnerClass}`} style={{ fontSize: "16px", color: "#475569", ...mergedProps.style, ...finalInnerStyles }}>{resolvedText}</p></React.Fragment>;
    }

    if (el.type === "image") {
        const imageHref = (el.href || el.linkUrl || (el.pageId ? `page:${el.pageId}` : "") || "").trim();
        const target = el.target || "_self";
        const rel = target === "_blank" ? (el.rel || "noopener noreferrer") : el.rel;
        const isDownload = el.download;
        const imgElement = el.src && <img {...f352_getMediaOptimizationProps(el.src, apiUrl, resolvedStyles)} alt={el.alt || "Image"} loading={isCritical ? "eager" : "lazy"} fetchPriority={isCritical ? "high" : "auto"} decoding="async" className="max-w-full rounded-lg" />;

        const wrappedImg = imageHref ? (
            <a
                href={imageHref.startsWith("page:") ? (pages?.find(p => p.id === imageHref.replace("page:", ""))?.slug || "#") : imageHref}
                target={target}
                rel={rel}
                download={isDownload ? true : undefined}
                onClick={(e) => {
                    let targetPage: PageConfig | undefined;
                    if (el.pageId && pages) {
                        targetPage = pages.find((p) => p.id === el.pageId);
                    }
                    if (!targetPage && imageHref && pages) {
                        targetPage = findTargetPage(pages, imageHref);
                    }
                    if (targetPage && target !== "_blank" && onSwitchPage) {
                        e.preventDefault();
                        onSwitchPage(targetPage);
                    } else if (imageHref.startsWith("#") && imageHref.length > 1) {
                        e.preventDefault();
                        const targetEl = document.querySelector(imageHref);
                        if (targetEl) targetEl.scrollIntoView({ behavior: "smooth" });
                    }
                }}
            >
                {imgElement}
            </a>
        ) : imgElement;

        return (
            <React.Fragment key={el.id}>
                <div ref={assignRefIfTracked as any} {...mergedProps} className={`${mergedProps.className} ${optInnerClass}`} style={{ textAlign: (resolvedStyles.textAlign as any) || "left", ...mergedProps.style }}>
                    {wrappedImg}
                </div>
            </React.Fragment>
        );
    }

    if (el.type === "button") {
        const resolvedHref = resolveButtonHref(el, pages || []);
        const target = el.target || "_self";
        const rel = target === "_blank" ? (el.rel || "noopener noreferrer") : el.rel;
        const isDownload = el.download;

        const iconName = el.iconName || el.icon || "";
        const iconPos = el.iconPosition || "left";
        const gap = el.iconGap ?? el.iconSpacing ?? 8;
        const iconSize = el.iconSize || 18;
        const iconColor = el.iconColor || el.buttonColor || "#ffffff";
        const textLabel = el.content || el.buttonText || "Button";

        const isFlexCol = iconPos === "top" || iconPos === "bottom";
        const isReverse = iconPos === "right" || iconPos === "bottom";

        const renderIcon = iconName ? (
            <IconRenderer
                iconName={iconName}
                size={iconSize}
                color={iconColor}
                rotate={el.iconRotate || 0}
                flipH={Boolean(el.iconFlipH)}
                flipV={Boolean(el.iconFlipV)}
                strokeWidth={el.iconStrokeWidth || 2}
            />
        ) : null;

        const buttonBgColor = resolvedStyles.backgroundColor || el.styles?.backgroundColor || el.buttonBg || "#2563eb";
        const buttonTextColor = resolvedStyles.color || el.styles?.color || el.buttonColor || "#ffffff";

        return (
            <React.Fragment key={el.id}>
                <div ref={assignRefIfTracked as any} {...mergedProps} style={{ ...mergedProps.style, textAlign: (resolvedStyles.textAlign as any) || "left" }}>
                    <a
                        href={resolvedHref}
                        target={target}
                        rel={rel}
                        download={isDownload ? true : undefined}
                        onClick={(e) => {
                            let targetPage: PageConfig | undefined;
                            if (el.pageId && pages) {
                                targetPage = pages.find((p) => p.id === el.pageId);
                            }
                            if (!targetPage && resolvedHref && pages) {
                                targetPage = findTargetPage(pages, resolvedHref);
                            }

                            if (targetPage && target !== "_blank" && onSwitchPage) {
                                e.preventDefault();
                                onSwitchPage(targetPage);
                            } else if (resolvedHref.startsWith("#") && resolvedHref.length > 1) {
                                e.preventDefault();
                                const targetEl = document.querySelector(resolvedHref);
                                if (targetEl) targetEl.scrollIntoView({ behavior: "smooth" });
                            }
                        }}
                        className={`inline-block rounded-lg px-5 py-2 text-sm font-semibold shadow ${optInnerClass}`}
                        style={{
                            backgroundColor: buttonBgColor,
                            color: buttonTextColor,
                            fontSize: resolvedStyles.fontSize,
                            fontFamily: resolvedStyles.fontFamily,
                            fontWeight: resolvedStyles.fontWeight,
                            borderRadius: resolvedStyles.borderRadius || "8px",
                            boxShadow: resolvedStyles.boxShadow,
                            ...finalInnerStyles,
                        }}
                    >
                        <span
                            className={`inline-flex items-center justify-center ${
                                isFlexCol ? "flex-col" : "flex-row"
                            } ${isReverse ? "flex-col-reverse" : ""}`}
                            style={{ gap: `${gap}px` }}
                        >
                            {!isReverse && renderIcon}
                            <span>{textLabel}</span>
                            {isReverse && renderIcon}
                        </span>
                    </a>
                </div>
            </React.Fragment>
        );
    }

    if (el.type === "video") {
        const srcUrl = (el.src || "").trim();
        const isAutoplay = Boolean(el.videoAutoplay);
        const isLoop = Boolean(el.videoLoop);
        const isMuted = Boolean(el.videoMuted);
        const isControls = el.videoControls !== false;

        const ytMatch = srcUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
        const ytId = ytMatch?.[1];
        const vimeoMatch = srcUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        const vimeoId = vimeoMatch?.[1];

        let videoEl: React.ReactNode;
        if (ytId) {
            const params = [`rel=0`, `modestbranding=1`, isControls ? `controls=1` : `controls=0`, isAutoplay ? `autoplay=1` : `autoplay=0`, isLoop ? `loop=1&playlist=${ytId}` : ``].filter(Boolean).join("&");
            videoEl = (
                <div className="relative w-full aspect-video">
                    <iframe
                        src={`https://www.youtube.com/embed/${ytId}?${params}`}
                        title={el.alt || "YouTube video player"}
                        className="absolute inset-0 w-full h-full border-0 rounded-[inherit]"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        loading={isCritical ? "eager" : "lazy"}
                    />
                </div>
            );
        } else if (vimeoId) {
            const params = [isAutoplay ? `autoplay=1` : ``, isLoop ? `loop=1` : ``].filter(Boolean).join("&");
            videoEl = (
                <div className="relative w-full aspect-video">
                    <iframe
                        src={`https://player.vimeo.com/video/${vimeoId}?${params}`}
                        title={el.alt || "Vimeo video player"}
                        className="absolute inset-0 w-full h-full border-0 rounded-[inherit]"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                        loading={isCritical ? "eager" : "lazy"}
                    />
                </div>
            );
        } else {
            videoEl = (
                <video
                    src={srcUrl ? `${apiUrl}${srcUrl.startsWith("/") ? srcUrl : "/" + srcUrl}` : undefined}
                    poster={el.videoPoster ? `${apiUrl}${el.videoPoster.startsWith("/") ? el.videoPoster : "/" + el.videoPoster}` : undefined}
                    controls={isControls}
                    autoPlay={isAutoplay}
                    loop={isLoop}
                    muted={isMuted}
                    playsInline
                    className="w-full max-w-full rounded-lg"
                    style={{ maxHeight: "500px" }}
                >
                    Your browser does not support HTML5 video playback.
                </video>
            );
        }

        return (
            <React.Fragment key={el.id}>
                <div ref={assignRefIfTracked as any} {...mergedProps} className={`${mergedProps.className} w-full ${optInnerClass}`}>
                    {videoEl}
                </div>
            </React.Fragment>
        );
    }

    if (el.type === "icon") return <React.Fragment key={el.id}><div ref={assignRefIfTracked as any} {...mergedProps} className={`${mergedProps.className} ${optInnerClass}`} style={{ display: "flex", justifyContent: resolvedStyles.textAlign || "center", ...mergedProps.style }}>{renderSvgIcon(el.styles?.iconName || "star", el.styles?.iconSize || "32", el.styles?.iconColor || "#2563eb")}</div></React.Fragment>;

    if (el.type === "spacer") return <React.Fragment key={el.id}><div ref={assignRefIfTracked as any} {...mergedProps} className={`${mergedProps.className} ${optInnerClass}`} style={{ height: resolvedStyles.height || "40px", ...mergedProps.style, ...finalInnerStyles }} /></React.Fragment>;

    if (el.type === "divider") return <React.Fragment key={el.id}><hr ref={assignRefIfTracked as any} {...mergedProps} className={`${mergedProps.className} ${optInnerClass}`} style={{ borderColor: "#cbd5e1", ...mergedProps.style, ...finalInnerStyles }} /></React.Fragment>;

    if (el.type === "html") return (
        <React.Suspense fallback={null} key={el.id}>
            <HtmlNode el={el} mergedProps={{ ...mergedProps, ref: assignRefIfTracked as any }} optInnerClass={optInnerClass} finalInnerStyles={finalInnerStyles} />
        </React.Suspense>
    );

    if (el.type === "shortcode") return (
        <React.Fragment key={el.id}>
            <div ref={assignRefIfTracked as any} {...mergedProps} className={`${mergedProps.className} ${optInnerClass}`} style={{ ...mergedProps.style, ...finalInnerStyles }}>
                {el.content}
            </div>
        </React.Fragment>
    );

    // Module 10: Navigation & Search Runtime
    const navNode = renderPublicElement(el, true);
    if (navNode !== null) {
        if (el.type === "menu-anchor") {
            return navNode;
        }
        return <div ref={assignRefIfTracked as any} {...mergedProps}>{navNode}</div>;
    }

    // Dynamic Widgets
    if (el.type === "slides") return <div ref={assignRefIfTracked as any} {...mergedProps}><SlidesWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "form") return <div ref={assignRefIfTracked as any} {...mergedProps}><FormWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} websiteId={websiteId} /></div>;
    if (el.type === "login") return <div ref={assignRefIfTracked as any} {...mergedProps}><LoginWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "nav-menu") return (
        <div ref={assignRefIfTracked as any} {...mergedProps}>
            <NavMenuWidgetRenderer
                el={el}
                isPreview={true}
                mergedStyles={finalMergedStyles}
                pages={pages}
                websiteId={websiteId}
                isPublicSite={true}
                onNavigatePage={(targetIdOrSlug) => {
                    if (!pages || !onSwitchPage) return;
                    const targetPage = findTargetPage(pages, targetIdOrSlug);
                    if (targetPage) onSwitchPage(targetPage);
                }}
            />
        </div>
    );
    if (el.type === "animated-headline") return <div ref={assignRefIfTracked as any} {...mergedProps}><AnimatedHeadlineWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "price-table") return <div ref={assignRefIfTracked as any} {...mergedProps}><PriceTableWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "price-list") return <div ref={assignRefIfTracked as any} {...mergedProps}><PriceListWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "gallery") return <div ref={assignRefIfTracked as any} {...mergedProps}><GalleryWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "basic-gallery") return <div ref={assignRefIfTracked as any} {...mergedProps}><BasicGalleryWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "flip-box") return <div ref={assignRefIfTracked as any} {...mergedProps}><FlipBoxWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "call-to-action") return (
        <div ref={assignRefIfTracked as any} {...mergedProps}>
            <CtaWidgetRenderer
                el={el}
                isPreview={true}
                mergedStyles={finalMergedStyles}
                pages={pages}
                onNavigatePage={(targetIdOrSlug) => {
                    if (!pages || !onSwitchPage) return;
                    const targetPage = findTargetPage(pages, targetIdOrSlug);
                    if (targetPage) onSwitchPage(targetPage);
                }}
            />
        </div>
    );
    if (el.type === "media-carousel") return <div ref={assignRefIfTracked as any} {...mergedProps}><MediaCarouselWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "basic-media-carousel") return <div ref={assignRefIfTracked as any} {...mergedProps}><BasicMediaCarouselWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "testimonial-carousel") return <div ref={assignRefIfTracked as any} {...mergedProps}><TestimonialCarouselWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "loop-carousel") return <div ref={assignRefIfTracked as any} {...mergedProps}><LoopCarouselWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "image-carousel") return <div ref={assignRefIfTracked as any} {...mergedProps}><ImageCarouselWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "table-of-contents") return <div ref={assignRefIfTracked as any} {...mergedProps}><TocWidgetRenderer el={el} elements={allElements || []} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "countdown") return <div ref={assignRefIfTracked as any} {...mergedProps}><CountdownWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "facebook-page" || el.type === "facebook-button" || el.type === "facebook-embed" || el.type === "facebook-comments") return <div ref={assignRefIfTracked as any} {...mergedProps}><FacebookPageWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "blockquote") return <div ref={assignRefIfTracked as any} {...mergedProps}><BlockquoteWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "reviews") return <div ref={assignRefIfTracked as any} {...mergedProps}><ReviewsWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "paypal-button") return <div ref={assignRefIfTracked as any} {...mergedProps}><PayPalButtonWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "stripe-button") return <div ref={assignRefIfTracked as any} {...mergedProps}><StripeButtonWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "lottie") return <div ref={assignRefIfTracked as any} {...mergedProps}><LottieWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "code-highlight") return <div ref={assignRefIfTracked as any} {...mergedProps}><CodeHighlightWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "audio-playlist") return <div ref={assignRefIfTracked as any} {...mergedProps}><AudioPlaylistWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "dynamic-lightbox") return <div ref={assignRefIfTracked as any} {...mergedProps}><DynamicLightboxWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "custom-svg") return <div ref={assignRefIfTracked as any} {...mergedProps}><CustomSvgWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "mega-menu") return (
        <div ref={assignRefIfTracked as any} {...mergedProps}>
            <MegaMenuWidgetRenderer
                el={el}
                isPreview={true}
                mergedStyles={finalMergedStyles}
                pages={pages}
                onNavigatePage={(targetIdOrSlug) => {
                    if (!pages || !onSwitchPage) return;
                    const targetPage = findTargetPage(pages, targetIdOrSlug);
                    if (targetPage) onSwitchPage(targetPage);
                }}
            />
        </div>
    );
    if (el.type === "share-buttons") return <div ref={assignRefIfTracked as any} {...mergedProps}><ShareButtonsWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} pages={pages} activePageId={pages?.find(p => p.elements?.some(e => e.id === el.id))?.id || pages?.[0]?.id} /></div>;

    if (el.type === "wc-product-title") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcProductTitleWidgetRenderer el={el} getMergedStyles={() => finalMergedStyles} activeDevice="desktop" /></div>;
    if (el.type === "wc-product-price") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcProductPriceWidgetRenderer el={el} getMergedStyles={() => finalMergedStyles} activeDevice="desktop" /></div>;
    if (el.type === "wc-product-images") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcProductImagesWidgetRenderer el={el} getMergedStyles={() => finalMergedStyles} activeDevice="desktop" /></div>;
    if (el.type === "wc-add-to-cart") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcAddToCartWidgetRenderer el={el} getMergedStyles={() => finalMergedStyles} activeDevice="desktop" /></div>;
    if (el.type === "wc-product-rating") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcProductRatingWidgetRenderer el={el} getMergedStyles={() => finalMergedStyles} activeDevice="desktop" /></div>;

    if (el.type === "wc-builder") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcBuilderWidgetRenderer el={el} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "wc-product") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcProductWidgetRenderer el={el} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "wc-product-stock") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcProductStockWidgetRenderer el={el} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "wc-product-meta") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcProductMetaWidgetRenderer el={el} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "wc-product-content") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcProductContentWidgetRenderer el={el} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "wc-short-description") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcShortDescriptionWidgetRenderer el={el} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "wc-product-data-tabs") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcProductDataTabsWidgetRenderer el={el} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "wc-additional-info") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcAdditionalInfoWidgetRenderer el={el} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "wc-related-products") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcRelatedProductsWidgetRenderer el={el} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "wc-upsells") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcUpsellsWidgetRenderer el={el} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "wc-products") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcProductsWidgetRenderer el={el} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "wc-custom-add-to-cart") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcCustomAddToCartWidgetRenderer el={el} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "wc-product-categories") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcProductCategoriesWidgetRenderer el={el} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "wc-menu-cart") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcMenuCartWidgetRenderer el={el} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "wc-cart") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcCartWidgetRenderer el={el} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "wc-checkout") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcCheckoutWidgetRenderer el={el} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "wc-my-account") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcMyAccountWidgetRenderer el={el} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "wc-purchase-summary") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcPurchaseSummaryWidgetRenderer el={el} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "wc-notices") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcNoticesWidgetRenderer el={el} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "wc-shop-layouts") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcShopLayoutsWidgetRenderer el={el} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "wc-product-archive") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcProductArchiveWidgetRenderer el={el} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "wc-product-page-templates") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcProductPageTemplatesWidgetRenderer el={el} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "wc-product-archive-templates") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcProductArchiveTemplatesWidgetRenderer el={el} mergedStyles={finalMergedStyles} /></div>;

    if (el.type === "loop-grid") return <div ref={assignRefIfTracked as any} {...mergedProps}><LoopGridWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} activeDevice={activeBreakpointId === "mobile" ? "mobile" : activeBreakpointId === "tablet" ? "tablet" : "desktop"} pages={pages} onSwitchPage={onSwitchPage} apiUrl={apiUrl} /></div>;

    if (el.type === "nested-carousel") return (
        <div ref={assignRefIfTracked as any} {...mergedProps}>
            <NestedCarouselWidgetRenderer
                el={el}
                isPreview={true}
                mergedStyles={finalMergedStyles}
                renderElementTree={(childEl) => (
                    <RenderNode
                        key={childEl.id}
                        el={childEl}
                        isCritical={false}
                        activeBreakpointId={activeBreakpointId}
                        breakpoints={breakpoints}
                        globalSettings={globalSettings}
                        elementClassMap={elementClassMap}
                        apiUrl={apiUrl}
                        allElements={allElements}
                    />
                )}
            />
        </div>
    );

    if (el.type === "off-canvas") return (
        <div ref={assignRefIfTracked as any} {...mergedProps}>
            <OffCanvasWidgetRenderer
                el={el}
                isPreview={true}
                mergedStyles={finalMergedStyles}
                renderChildren={(childElements) =>
                    (childElements || []).map((child) => (
                        <RenderNode
                            key={child.id}
                            el={child}
                            isCritical={false}
                            activeBreakpointId={activeBreakpointId}
                            breakpoints={breakpoints}
                            globalSettings={globalSettings}
                            elementClassMap={elementClassMap}
                            apiUrl={apiUrl}
                            allElements={allElements}
                        />
                    ))
                }
            />
        </div>
    );

    if (el.type === "container" || el.type === "div-block") {
        const deviceMode = (activeBreakpointId === "mobile" || activeBreakpointId === "tablet") ? activeBreakpointId : "desktop";
        const containerLayout = getMergedLayout(el, deviceMode);
        const isMasonry = containerLayout.layoutType === "masonry";
        const isGrid = containerLayout.layoutType === "grid";

        const containerLayoutStyles: React.CSSProperties = isMasonry ? {
            display: "block",
            columnCount: containerLayout.masonryColumns || 3,
            columnGap: containerLayout.columnGap !== undefined
                ? (typeof containerLayout.columnGap === "number" ? `${containerLayout.columnGap}px` : containerLayout.columnGap)
                : `${containerLayout.gap ?? 16}px`,
        } : isGrid ? {
            display: "grid",
            gridTemplateColumns: containerLayout.gridTemplateColumns || "repeat(2, minmax(0, 1fr))",
            gridTemplateRows: containerLayout.gridTemplateRows,
            gridAutoFlow: containerLayout.gridAutoFlow,
            justifyItems: containerLayout.justifyItems,
            alignItems: containerLayout.alignItems || "stretch",
            gap: `${containerLayout.gap ?? 10}px`,
            rowGap: containerLayout.rowGap !== undefined ? (typeof containerLayout.rowGap === "number" ? `${containerLayout.rowGap}px` : containerLayout.rowGap) : undefined,
            columnGap: containerLayout.columnGap !== undefined ? (typeof containerLayout.columnGap === "number" ? `${containerLayout.columnGap}px` : containerLayout.columnGap) : undefined,
        } : {
            display: "flex",
            flexDirection: containerLayout.direction || "column",
            justifyContent: containerLayout.justifyContent || "flex-start",
            alignItems: containerLayout.alignItems || "stretch",
            gap: `${containerLayout.gap ?? 10}px`,
            rowGap: containerLayout.rowGap !== undefined ? (typeof containerLayout.rowGap === "number" ? `${containerLayout.rowGap}px` : containerLayout.rowGap) : undefined,
            columnGap: containerLayout.columnGap !== undefined ? (typeof containerLayout.columnGap === "number" ? `${containerLayout.columnGap}px` : containerLayout.columnGap) : undefined,
        };

        if (containerLayout.scrollSnapType && containerLayout.scrollSnapType !== "none") {
            containerLayoutStyles.scrollSnapType = containerLayout.scrollSnapType as any;
        }
        if (containerLayout.overflowX) {
            containerLayoutStyles.overflowX = containerLayout.overflowX as any;
        }
        if (containerLayout.overflowY) {
            containerLayoutStyles.overflowY = containerLayout.overflowY as any;
        }

        const containerMergedProps = {
            ...mergedProps,
            style: {
                ...containerLayoutStyles,
                ...mergedProps.style,
            }
        };

        return (
            <React.Fragment key={el.id}>
                <div ref={assignRefIfTracked as any} {...containerMergedProps}>
                    {el.styles?.backgroundType === "slideshow" && el.styles.backgroundSlideshowUrls && (
                        <BackgroundSlideshow
                            urls={
                                Array.isArray(el.styles.backgroundSlideshowUrls)
                                    ? el.styles.backgroundSlideshowUrls
                                    : typeof el.styles.backgroundSlideshowUrls === "string"
                                    ? el.styles.backgroundSlideshowUrls.split(",")
                                    : []
                            }
                            interval={Number(el.styles.backgroundSlideshowSpeed) || 5000}
                        />
                    )}
                    {el.children?.map(child => (
                        <RenderNode
                            key={child.id}
                            el={child}
                            isCritical={isCritical}
                            activeBreakpointId={activeBreakpointId}
                            breakpoints={breakpoints}
                            globalSettings={globalSettings}
                            elementClassMap={elementClassMap}
                            apiUrl={apiUrl}
                            allElements={allElements}
                        />
                    ))}
                </div>
            </React.Fragment>
        );
    }
    return null;
}, (prev, next) => {
    // Custom F-358 Comparator: Avoid full page rerender on style dedupe sweeps (elementClassMap mutations)
    return prev.el === next.el &&
        prev.activeBreakpointId === next.activeBreakpointId &&
        prev.globalSettings === next.globalSettings &&
        prev.breakpoints === next.breakpoints &&
        prev.isCritical === next.isCritical &&
        prev.elementClassMap.get(prev.el.id) === next.elementClassMap.get(next.el.id);
});

function PublishedSite() {
    const { websiteId, pageSlug } = useParams<{ websiteId: string; pageSlug?: string }>();
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [elements, setElements] = useState<EditorElement[]>([]);
    const [pages, setPages] = useState<PageConfig[]>([]);
    const [activePageId, setActivePageId] = useState<string>("home");
    const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
    const [popups, setPopups] = useState<PopupConfig[]>([]);
    const [globalSettings, setGlobalSettings] = useState<any>({});
    const [breakpoints, setBreakpoints] = useState<Breakpoint[]>(DEFAULT_BREAKPOINTS);
    const [activeBreakpointId, setActiveBreakpointId] = useState<string>("desktop");
    const [customCodeSnippets, setCustomCodeSnippets] = useState<any[]>([]);
    const [globalVariables, setGlobalVariables] = useState<any[]>([]);
    const [globalClasses, setGlobalClasses] = useState<any[]>([]);
    const [cookieConsentConfig, setCookieConsentConfig] = useState<any>(null);
    const [experiments, setExperiments] = useState<any[]>([]);
    const [assignedVariants, setAssignedVariants] = useState<Record<string, string>>({});

    // F-339 & F-344: Compile Design System CSS Variables (:root) and Global Classes
    const compiledDesignTokensCss = useMemo(() => {
        let css = "";
        if (globalVariables && globalVariables.length > 0) {
            css += "/* --- ForgeStudio Design Tokens (:root) --- */\n:root {\n";
            for (const v of globalVariables) {
                if (v && v.token) {
                    const lightVal = v.modes?.light || v.value;
                    if (lightVal) {
                        css += `  ${v.token}: ${lightVal};\n`;
                    }
                }
            }
            css += "}\n\n";

            // Multi-mode Dark Theme overrides
            const darkModeVars = globalVariables.filter((v: any) => v && v.token && v.modes?.dark);
            if (darkModeVars.length > 0) {
                css += "/* --- ForgeStudio Design Tokens (Dark Theme Overrides) --- */\n[data-theme=\"dark\"], .dark {\n";
                for (const v of darkModeVars) {
                    css += `  ${v.token}: ${v.modes.dark};\n`;
                }
                css += "}\n\n";

                css += "@media (prefers-color-scheme: dark) {\n  :root:not([data-theme=\"light\"]) {\n";
                for (const v of darkModeVars) {
                    css += `    ${v.token}: ${v.modes.dark};\n`;
                }
                css += "  }\n}\n\n";
            }
        }
        if (globalClasses && globalClasses.length > 0) {
            for (const c of globalClasses) {
                if (c && c.className && c.styles) {
                    const toCss = (obj: any) =>
                        Object.entries(obj)
                            .map(([k, v]) => `  ${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}: ${v};`)
                            .join("\n");
                    css += `.${c.className} {\n${toCss(c.styles)}\n}\n`;
                    if (c.pseudoStyles?.hover && Object.keys(c.pseudoStyles.hover).length > 0) {
                        css += `.${c.className}:hover {\n${toCss(c.pseudoStyles.hover)}\n}\n`;
                    }
                    if (c.pseudoStyles?.focus && Object.keys(c.pseudoStyles.focus).length > 0) {
                        css += `.${c.className}:focus {\n${toCss(c.pseudoStyles.focus)}\n}\n`;
                    }
                    if (c.pseudoStyles?.active && Object.keys(c.pseudoStyles.active).length > 0) {
                        css += `.${c.className}:active {\n${toCss(c.pseudoStyles.active)}\n}\n`;
                    }
                }
            }
        }
        return css;
    }, [globalVariables, globalClasses]);

    // F-356 dynamic font analyzer integration
    useDynamicFonts(elements, globalSettings.fonts);

    useEffect(() => {
        if (!websiteId) return;

        const fetchWebsite = async () => {
            try {
                setLoading(true);
                let res = await fetch(`${apiUrl}/api/v1/websites/public/${websiteId}`);
                if (!res.ok && res.status !== 404) {
                    const fallback = await fetch(`${apiUrl}/api/websites/public/${websiteId}`);
                    if (fallback.ok) res = fallback;
                }
                const data = await res.json();

                if (!res.ok) throw new Error("This website is unavailable.");

                const site = data.website || data;
                let rawEditorData = site?.editorData;
                if (typeof rawEditorData === "string") {
                    try {
                        rawEditorData = JSON.parse(rawEditorData);
                    } catch (_e) {
                        rawEditorData = {};
                    }
                }
                const editorData = rawEditorData?.publishedData || rawEditorData || {};

                if (editorData?.siteParts) setSitePartsState(editorData.siteParts);
                const loadedSiteParts = editorData?.siteParts;

                if (editorData?.pages && editorData.pages.length > 0) {
                    const pagesList: PageConfig[] = editorData.pages;
                    setPages(pagesList);
                    const urlParams = new URLSearchParams(window.location.search);
                    const queryPage = urlParams.get("page");
                    const initialSlug = pageSlug || queryPage;
                    const cleanSlug = initialSlug ? initialSlug.replace(/^\//, "") : "";
                    const isPostRoute = cleanSlug.startsWith("post/") || cleanSlug.startsWith("blog/");
                    const isTermRoute = cleanSlug.startsWith("category/") || cleanSlug.startsWith("tag/");
                    const matchedPage = initialSlug ? findTargetPage(pagesList, initialSlug) : undefined;

                    if (matchedPage) {
                        setActivePageId(matchedPage.id || "home");
                        setElements(matchedPage.elements?.length ? matchedPage.elements : (editorData.elements || []));
                    } else if (isPostRoute && loadedSiteParts?.single?.elements?.length && (loadedSiteParts.single.isEnabled ?? true)) {
                        // F-237: Single Post Template Fallback
                        setActivePageId("single-post-template");
                        setElements(loadedSiteParts.single.elements);
                    } else if (isTermRoute && loadedSiteParts?.archive?.elements?.length && (loadedSiteParts.archive.isEnabled ?? true)) {
                        // F-256: Term / Taxonomy Archive Template Fallback
                        setActivePageId("archive-template");
                        setElements(loadedSiteParts.archive.elements);
                    } else if (isTermRoute) {
                        // F-256: Fallback to archive page or home page with loop feed
                        const archivePage = pagesList.find((p) => p.slug === "/archive" || p.slug === "archive" || p.slug === "/blog" || p.slug === "blog") || pagesList.find((p: any) => p.isHome || p.slug === "/") || pagesList[0];
                        setActivePageId(archivePage?.id || "home");
                        setElements(archivePage?.elements?.length ? archivePage.elements : (editorData.elements || []));
                    } else if (initialSlug && loadedSiteParts?.notFound404?.elements?.length && (loadedSiteParts.notFound404.isEnabled ?? true)) {
                        // F-239: 404 Template Fallback for unmatched route
                        setActivePageId("404-template");
                        setElements(loadedSiteParts.notFound404.elements);
                    } else {
                        const activePage = pagesList.find((p: any) => p.isHome || p.slug === "/") || pagesList[0];
                        setActivePageId(activePage.id || "home");
                        setElements(activePage.elements?.length ? activePage.elements : (editorData.elements || []));
                    }
                } else if (editorData?.elements && editorData.elements.length > 0) {
                    const defaultPage = { id: "home", name: "Home", slug: "/", customCss: "", elements: editorData.elements };
                    setPages([defaultPage]);
                    setActivePageId("home");
                    setElements(editorData.elements);
                }
                if (editorData?.popups) setPopups(editorData.popups);
                if (editorData?.breakpoints) setBreakpoints(editorData.breakpoints);
                if (editorData?.globalSettings) setGlobalSettings(editorData.globalSettings);
                if (editorData?.globalVariables) setGlobalVariables(editorData.globalVariables);
                if (editorData?.globalClasses) setGlobalClasses(editorData.globalClasses);
                if (site?.customCodeSnippets) setCustomCodeSnippets(site.customCodeSnippets);
                if (site?.status) setSiteStatus(site.status);
                if (site?.themeLocationRules) _setThemeRules(site.themeLocationRules);
                if (editorData?.siteSettings?.cookieConsent || editorData?.cookieConsent) {
                    setCookieConsentConfig(editorData.siteSettings?.cookieConsent || editorData.cookieConsent);
                }
                if (site?.editorData?.experiments) {
                    setExperiments(site.editorData.experiments);
                }

            } catch (_err: any) {
                setErrorMessage("This website is unavailable.");
            } finally {
                setLoading(false);
            }
        };
        fetchWebsite();
    }, [websiteId, apiUrl, pageSlug]);

    // Phase 3 Subsystem 2: A/B Split Testing & Impression Telemetry
    useEffect(() => {
        if (!experiments || experiments.length === 0 || !websiteId) return;

        const running = experiments.filter((e) => e.status === "RUNNING");
        if (running.length === 0) return;

        const assignments: Record<string, string> = {};

        for (const exp of running) {
            const storageKey = `fs_exp_${exp.id}`;
            let variantId = localStorage.getItem(storageKey);

            if (!variantId || !exp.variants.some((v: any) => v.id === variantId)) {
                // Weighted random traffic allocation
                const rand = Math.random() * 100;
                let cumulative = 0;
                let selected = exp.variants[0]?.id || "control";

                for (const v of exp.variants) {
                    cumulative += v.trafficAllocation || 50;
                    if (rand <= cumulative) {
                        selected = v.id;
                        break;
                    }
                }
                variantId = selected;
                try {
                    localStorage.setItem(storageKey, variantId);
                } catch {}
            }

            assignments[exp.id] = variantId;

            // Dispatch impression telemetry (fire-and-forget)
            fetch(`${apiUrl}/api/websites/${websiteId}/experiments/${exp.id}/impression`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ variantId }),
            }).catch(() => {});
        }

        setAssignedVariants(assignments);
    }, [experiments, websiteId, apiUrl]);

    const recordConversionForGoal = (action: string) => {
        if (!experiments || experiments.length === 0 || !websiteId) return;
        const matching = experiments.filter((e) => e.status === "RUNNING" && e.goalAction === action);
        for (const exp of matching) {
            const variantId = assignedVariants[exp.id] || localStorage.getItem(`fs_exp_${exp.id}`);
            if (variantId) {
                fetch(`${apiUrl}/api/websites/${websiteId}/experiments/${exp.id}/conversion`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ variantId }),
                }).catch(() => {});
            }
        }
    };

    const handleSwitchPage = (page: PageConfig) => {
        setActivePageId(page.id);
        setElements(page.elements || []);
        if (websiteId) {
            const isHome = page.isHome || page.slug === "/" || page.id === "home";
            const cleanSlug = page.slug ? page.slug.replace(/^\//, "") : page.id;
            const newPath = isHome ? `/site/${websiteId}` : `/site/${websiteId}/${cleanSlug}`;
            if (window.location.pathname !== newPath) {
                window.history.pushState({ pageId: page.id }, "", newPath);
            }
        }
    };

    useEffect(() => {
        const handlePopState = () => {
            if (!pages || pages.length === 0) return;
            const currentPath = window.location.pathname;
            const parts = currentPath.split("/").filter(Boolean);
            const slugFromPath = parts.length >= 2 && parts[0] === "site" ? parts.slice(2).join("/") : undefined;
            const queryPage = new URLSearchParams(window.location.search).get("page");
            const targetSlug = slugFromPath || queryPage;

            const matched = targetSlug
                ? findTargetPage(pages, targetSlug)
                : pages.find((p) => p.isHome || p.slug === "/" || p.id === "home") || pages[0];

            if (matched && matched.id !== activePageId) {
                setActivePageId(matched.id);
                setElements(matched.elements || []);
            } else if (!matched && targetSlug && (targetSlug.startsWith("category/") || targetSlug.startsWith("tag/"))) {
                const archivePage = pages.find((p) => p.slug === "/archive" || p.slug === "archive" || p.slug === "/blog" || p.slug === "blog") || pages.find((p: any) => p.isHome || p.slug === "/") || pages[0];
                if (archivePage && archivePage.id !== activePageId) {
                    setActivePageId(archivePage.id);
                    setElements(archivePage.elements || []);
                }
            }
        };

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, [pages, activePageId]);

    // Page-Level SEO, OpenGraph, Twitter Cards & Structured Data
    useEffect(() => {
        if (!pages || pages.length === 0) return;
        const curPage = pages.find(p => p.id === activePageId) || pages[0];
        if (!curPage) return;

        const pSettings = (curPage as any).pageSettings || {};
        const siteSettings = (globalSettings as any)?.siteSettings || globalSettings || {};
        const title = pSettings.title || curPage.name || siteSettings.siteName || "Published Website";
        document.title = title;

        // F-379 & F-380: Sync HTML language and RTL direction for published site
        const siteLang = pSettings.siteLanguage || siteSettings.siteLanguage || "en";
        const rtlLangs = ["ar", "he", "fa", "ur", "ar-sa", "he-il"];
        const isRtl = pSettings.siteDirection === "rtl" || siteSettings.siteDirection === "rtl" || rtlLangs.includes(siteLang.toLowerCase());

        document.documentElement.lang = siteLang;
        document.documentElement.dir = isRtl ? "rtl" : "ltr";

        const upsertMeta = (name: string, content: string | undefined, isProperty = false) => {
            if (!content) return;
            const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
            let el = document.querySelector(selector);
            if (!el) {
                el = document.createElement("meta");
                if (isProperty) el.setAttribute("property", name);
                else el.setAttribute("name", name);
                document.head.appendChild(el);
            }
            el.setAttribute("content", content);
        };

        const ogImg = pSettings.ogImage || siteSettings.ogImage || siteSettings.logo;
        const ogTitle = pSettings.ogTitle || title;
        const ogDesc = pSettings.ogDescription || pSettings.description || siteSettings.metaDescription;

        if (pSettings.description || siteSettings.metaDescription) {
            upsertMeta("description", pSettings.description || siteSettings.metaDescription);
        }
        upsertMeta("og:title", ogTitle, true);
        if (ogDesc) {
            upsertMeta("og:description", ogDesc, true);
        }
        if (ogImg) upsertMeta("og:image", ogImg, true);

        // Twitter Cards
        const twitterCard = pSettings.twitterCard || siteSettings.twitterCard || (ogImg ? "summary_large_image" : "summary");
        upsertMeta("twitter:card", twitterCard);
        upsertMeta("twitter:title", pSettings.twitterTitle || ogTitle);
        if (ogDesc) upsertMeta("twitter:description", pSettings.twitterDescription || ogDesc);
        if (ogImg) upsertMeta("twitter:image", pSettings.twitterImage || ogImg);

        if (pSettings.canonicalUrl) {
            let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
            if (!link) {
                link = document.createElement("link");
                link.rel = "canonical";
                document.head.appendChild(link);
            }
            link.href = pSettings.canonicalUrl;
        }

        const robots: string[] = [];
        if (pSettings.noindex) robots.push("noindex");
        if (pSettings.nofollow) robots.push("nofollow");
        if (robots.length > 0) {
            upsertMeta("robots", robots.join(", "));
        }

        // Schema.org Structured Data (JSON-LD)
        const structuredData = pSettings.structuredData || siteSettings.structuredData;
        if (structuredData) {
            let script = document.querySelector('script[data-forgestudio-schema="true"]') as HTMLScriptElement | null;
            if (!script) {
                script = document.createElement("script");
                script.type = "application/ld+json";
                script.setAttribute("data-forgestudio-schema", "true");
                document.head.appendChild(script);
            }
            script.textContent = JSON.stringify(structuredData);
        }
    }, [pages, activePageId, globalSettings]);

    const [siteStatus, setSiteStatus] = useState<string>("DRAFT");
    const [_themeRules, _setThemeRules] = useState<any[]>([]);

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            const sorted = [...breakpoints].filter(b => b.active).sort((a, b) => b.width - a.width);
            let match = "desktop";
            for (const bp of sorted) {
                if (width <= bp.width) match = bp.id;
            }
            setActiveBreakpointId(match);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [breakpoints]);

    // F-102 - F-141: Initialize Motion & Interaction runtime
    useEffect(() => {
        if (!loading && elements && elements.length > 0) {
            const controller = initMotionRuntime(document);
            return () => {
                controller.cleanup();
            };
        }
    }, [loading, elements, activePageId]);

    const { optimizedGlobalCss, elementClassMap } = useMemo(() => {
        const classMap = new Map<string, string>();
        const styleHashToClass = new Map<string, string>();
        const customCssBuffer: string[] = [];

        const hashStr = (str: string) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = (hash << 5) - hash + str.charCodeAt(i);
                hash |= 0;
            }
            return Math.abs(hash).toString(36);
        };

        const processElement = (el: EditorElement) => {
            const resolved = resolveElementStyles(el, activeBreakpointId, breakpoints, globalSettings);
            const innerProps = getInnerStyles(resolved);
            const outerProps = { ...resolved };
            Object.keys(innerProps).forEach(k => delete (outerProps as any)[k]);

            // F-355: Strip backgroundImage out of F-353 compiler Hash pipeline.
            delete (outerProps as any).backgroundImage;
            delete (innerProps as any).backgroundImage;

            const stylePayload = JSON.stringify({ inner: innerProps, outer: outerProps });
            if (stylePayload !== '{"inner":{},"outer":{}}') {
                const hash = "fs-s-" + hashStr(stylePayload);
                if (!styleHashToClass.has(stylePayload)) {
                    let cssRulesOuter = "";
                    let cssRulesInner = "";
                    const toCss = (obj: any) => Object.entries(obj)
                        .filter(([_, v]) => v !== undefined && v !== "")
                        .map(([k, v]) => `${k.replace(/[A-Z]/g, m => "-" + m.toLowerCase())}: ${v};`)
                        .join(" ");

                    const outerCss = toCss(outerProps);
                    const innerCss = toCss(innerProps);

                    if (outerCss) cssRulesOuter += `.${hash} { ${outerCss} }\n`;
                    if (innerCss) cssRulesInner += `.${hash}-inner { ${innerCss} }\n`;

                    styleHashToClass.set(stylePayload, hash);
                    customCssBuffer.push(cssRulesOuter + cssRulesInner);
                }
                classMap.set(el.id, styleHashToClass.get(stylePayload)!);
            }

            if (el.children) el.children.forEach(processElement);
        };

        elements.forEach(processElement);

        return {
            optimizedGlobalCss: customCssBuffer.join("\n"),
            elementClassMap: classMap
        };
    }, [elements, activeBreakpointId, breakpoints, globalSettings]);

    if (loading) {
        return (
            <div className="min-h-screen text-slate-500 bg-slate-50 flex items-center justify-center text-sm font-medium">
                Loading...
            </div>
        );
    }
    if (errorMessage) {
        return (
            <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-6 text-center">
                <div className="text-5xl mb-4">🌐</div>
                <h1 className="text-2xl font-bold mb-2">This website is unavailable.</h1>
                <p className="text-slate-500 max-w-md text-sm">
                    The requested page cannot be found or is not currently published.
                </p>
            </div>
        );
    }

    if (siteStatus === "MAINTENANCE") {
        return (
            <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
                <div className="text-6xl mb-4">🚧</div>
                <h1 className="text-3xl font-bold mb-2">Website Under Maintenance</h1>
                <p className="text-slate-400 max-w-md">We are currently performing scheduled maintenance. Please check back shortly.</p>
            </div>
        );
    }

    const [statementOpen, setStatementOpen] = useState<boolean>(false);

    return (
        <WooCommerceProvider websiteId={websiteId}>
        <div data-website-id={websiteId} data-page-id={activePageId} className={`fs-global-canvas-${websiteId || 'default'} fs-page-canvas-${websiteId || 'default'} w-full min-h-screen font-sans bg-white relative m-auto`} style={{ maxWidth: '100%', overflowX: 'hidden' }}>
            {/* F-366: Keyboard Skip Link */}
            <SkipLinks targetId="main-content" />

            {/* F-376: Reading Guide Bar */}
            <ReadingGuideBar />

            <style dangerouslySetInnerHTML={{ __html: getGlobalCustomCss(pages, popups, breakpoints, globalSettings, websiteId) }} />
            {compiledDesignTokensCss && <style id="fs-design-tokens-styles">{compiledDesignTokensCss}</style>}
            {optimizedGlobalCss && <style id="f353-optimized-styles">{optimizedGlobalCss}</style>}
            {customCodeSnippets && customCodeSnippets.length > 0 && (
                <React.Suspense fallback={null}>
                    <CodeInjectionRuntime snippets={customCodeSnippets} />
                </React.Suspense>
            )}

            {/* Configured Global Header */}
            {sitePartsState?.header?.elements && sitePartsState.header.elements.length > 0 && (sitePartsState.header.isEnabled ?? true) && (
                <header className="site-global-header w-full">
                    {sitePartsState.header.elements.map((el: EditorElement, index: number) => (
                        <RenderNode
                            key={el.id}
                            el={el}
                            isCritical={index === 0}
                            activeBreakpointId={activeBreakpointId}
                            breakpoints={breakpoints}
                            globalSettings={globalSettings}
                            elementClassMap={elementClassMap}
                            apiUrl={apiUrl}
                            allElements={elements}
                            pages={pages}
                            onSwitchPage={handleSwitchPage}
                            websiteId={websiteId}
                        />
                    ))}
                </header>
            )}

            {/* Dynamic Published Website Navigation Header fallback (only if multiple pages and no custom global header) */}
            {(!sitePartsState?.header?.elements || sitePartsState.header.elements.length === 0) && pages && pages.length > 1 && (
                <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs transition-all">
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-3.5">
                        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => {
                            const home = pages.find(p => p.slug === "/" || p.id === "home") || pages[0];
                            if (home) handleSwitchPage(home);
                        }}>
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-sm shadow-md">
                                {(pages[0]?.name || "W").charAt(0).toUpperCase()}
                            </div>
                            <span className="text-base font-extrabold tracking-tight text-slate-900">
                                {globalSettings?.siteIdentity?.name || pages[0]?.name || "My Website"}
                            </span>
                        </div>

                        {/* Desktop Header Navigation Links */}
                        <nav className="hidden sm:flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/70">
                            {pages.map((p) => {
                                const isCurrent = activePageId === p.id;
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => handleSwitchPage(p)}
                                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                            isCurrent
                                                ? "bg-white text-blue-600 shadow-sm border border-slate-200/60 font-extrabold"
                                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                                        }`}
                                    >
                                        {p.name || "Untitled"}
                                    </button>
                                );
                            })}
                        </nav>

                        {/* Mobile Hamburger Toggle Button */}
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="sm:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                        >
                            <span className="text-base">{mobileMenuOpen ? "✕" : "☰"}</span>
                        </button>
                    </div>

                    {/* Mobile Drawer */}
                    {mobileMenuOpen && (
                        <div className="sm:hidden border-t border-slate-200 bg-slate-50 p-3 space-y-1">
                            {pages.map((p) => {
                                const isCurrent = activePageId === p.id;
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => {
                                            handleSwitchPage(p);
                                            setMobileMenuOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-xs font-bold rounded-lg transition flex items-center justify-between ${
                                            isCurrent
                                                ? "bg-blue-600 text-white font-extrabold shadow-sm"
                                                : "text-slate-700 hover:bg-slate-200/70"
                                        }`}
                                    >
                                        <span>{p.name}</span>
                                        <span className="text-[10px] opacity-70 font-mono">{p.slug}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </header>
            )}

            {/* F-361: Semantic Main Container */}
            <main id="main-content" className="w-full">
                {elements.map((el, index) => (
                    <RenderNode
                        key={el.id}
                        el={el}
                        isCritical={index === 0}
                        activeBreakpointId={activeBreakpointId}
                        breakpoints={breakpoints}
                        globalSettings={globalSettings}
                        elementClassMap={elementClassMap}
                        apiUrl={apiUrl}
                        allElements={elements}
                        pages={pages}
                        onSwitchPage={handleSwitchPage}
                        websiteId={websiteId}
                    />
                ))}
            </main>

            {/* F-364 & F-367 & F-374: Accessibility Visitor Widget */}
            <AccessibilityWidget
                config={globalSettings?.accessibilityWidget}
                onOpenStatement={() => setStatementOpen(true)}
            />

            {/* F-373: Accessibility Statement Modal */}
            <AccessibilityStatementModal
                isOpen={statementOpen}
                onClose={() => setStatementOpen(false)}
                organizationName={globalSettings?.siteIdentity?.name || "Website"}
            />

            {/* Configured Global Footer */}
            {sitePartsState?.footer?.elements && sitePartsState.footer.elements.length > 0 && (sitePartsState.footer.isEnabled ?? true) && (
                <footer className="site-global-footer w-full">
                    {sitePartsState.footer.elements.map((el: EditorElement, index: number) => (
                        <RenderNode
                            key={el.id}
                            el={el}
                            isCritical={false}
                            activeBreakpointId={activeBreakpointId}
                            breakpoints={breakpoints}
                            globalSettings={globalSettings}
                            elementClassMap={elementClassMap}
                            apiUrl={apiUrl}
                            allElements={elements}
                            pages={pages}
                            onSwitchPage={handleSwitchPage}
                            websiteId={websiteId}
                        />
                    ))}
                </footer>
            )}

            {/* F-438: Cookie Consent Runtime Banner */}
            <CookieConsentBanner config={cookieConsentConfig} />
        </div>
        </WooCommerceProvider>
    );
}

class PublishedSiteErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("PublishedSite rendering error:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
                    <div className="text-5xl mb-4">⚠️</div>
                    <h1 className="text-2xl font-bold mb-2">Unable to render published page</h1>
                    <p className="text-slate-400 max-w-md text-sm mb-4">
                        A rendering error occurred while displaying this page.
                    </p>
                    {import.meta.env.DEV && this.state.error && (
                        <pre className="bg-slate-950 p-4 rounded-lg text-left text-xs text-red-300 font-mono overflow-auto max-w-xl max-h-48 border border-red-900/50">
                            {this.state.error.toString()}
                            {"\n"}
                            {this.state.error.stack}
                        </pre>
                    )}
                </div>
            );
        }
        return this.props.children;
    }
}

export default function PublishedSiteWithBoundary() {
    return (
        <PublishedSiteErrorBoundary>
            <PublishedSite />
        </PublishedSiteErrorBoundary>
    );
}
