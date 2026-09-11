import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { resolveElementStyles, getInnerStyles } from "../editor/utils";
import type { EditorElement, Breakpoint } from "../editor/types";
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
}

export function f352_getMediaOptimizationProps(src: string, _apiUrl: string, _styles: any) {
    return { src };
}

export function getGlobalCustomCss(_pages: any, _popups: any, _breakpoints: any, _globalSettings: any, _id: any) {
    return "";
}

const CodeInjectionRuntime = React.lazy(() => import("../editor/components/CodeInjectionRuntime"));
const HtmlNode = React.lazy(() => import("../../components/HtmlNode"));
import { useLazyLoad } from "../../hooks/useLazyLoad";
import { useDynamicFonts } from "../../utils/FontManager";

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
    WcProductRatingWidgetRenderer
} from "../editor/widgets";

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

interface RenderNodeProps {
    el: EditorElement;
    isCritical: boolean;
    activeBreakpointId: string;
    breakpoints: Breakpoint[];
    globalSettings: any;
    elementClassMap: Map<string, string>;
    apiUrl: string;
    allElements?: EditorElement[];
}

// F-358: Safely caches execution overhead per Element in PublishedSite skipping massive style hashing recalculations
const RenderNode: React.FC<RenderNodeProps> = React.memo(({ el, isCritical, activeBreakpointId, breakpoints, globalSettings, elementClassMap, apiUrl, allElements }) => {
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

    // Defer Background Image safely via F-355
    let finalMergedStyles: any = optClass ? {} : { ...resolvedStyles };
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
        ...customAttrs,
        className: `fs-el-${el.id} ${(el as any).cssClasses?.join(" ") || ""} ${el.customClass || ""} relative transition duration-150${optClass ? " " + optClass : ""}`,
        style: finalMergedStyles,
        "data-lazy": (!isCritical && hasBgImage) ? (isVisible ? "loaded" : "waiting") : undefined
    };

    // Forward ref natively avoiding wrappers (F-351 / F-355 bounds)
    const assignRefIfTracked = (!isCritical && hasBgImage) ? observerRef : undefined;

    if (el.type === "heading") return <React.Fragment key={el.id}><h2 ref={assignRefIfTracked as any} {...mergedProps} className={`${mergedProps.className} ${optInnerClass}`} style={{ fontSize: "32px", fontWeight: "700", color: "#0f172a", ...mergedProps.style, ...finalInnerStyles }}>{el.content}</h2></React.Fragment>;

    if (el.type === "text") return <React.Fragment key={el.id}><p ref={assignRefIfTracked as any} {...mergedProps} className={`${mergedProps.className} ${optInnerClass}`} style={{ fontSize: "16px", color: "#475569", ...mergedProps.style, ...finalInnerStyles }}>{el.content}</p></React.Fragment>;

    if (el.type === "image") return (
        <React.Fragment key={el.id}>
            <div ref={assignRefIfTracked as any} {...mergedProps} className={`${mergedProps.className} ${optInnerClass}`} style={{ textAlign: (resolvedStyles.textAlign as any) || "left", ...mergedProps.style }}>
                {el.src && <img {...f352_getMediaOptimizationProps(el.src, apiUrl, resolvedStyles)} alt={el.alt || "Image"} loading={isCritical ? "eager" : "lazy"} fetchPriority={isCritical ? "high" : "auto"} decoding="async" className="max-w-full rounded-lg" />}
            </div>
        </React.Fragment>
    );

    if (el.type === "button") return (
        <React.Fragment key={el.id}>
            <div ref={assignRefIfTracked as any} {...mergedProps} style={{ ...mergedProps.style, textAlign: (resolvedStyles.textAlign as any) || "left" }}>
                <a href={el.href || "#"} className={`inline-block rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow ${optInnerClass}`} style={finalInnerStyles}>{el.content}</a>
            </div>
        </React.Fragment>
    );

    if (el.type === "video") return (
        <React.Fragment key={el.id}>
            <div ref={assignRefIfTracked as any} {...mergedProps} className={`${mergedProps.className} aspect-video w-full ${optInnerClass}`}>
                <iframe src={el.src || "https://www.youtube.com/embed/dQw4w9WgXcQ"} loading={isCritical ? "eager" : "lazy"} className="w-full h-full rounded-lg" />
            </div>
        </React.Fragment>
    );

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

    // Dynamic Widgets
    if (el.type === "slides") return <div ref={assignRefIfTracked as any} {...mergedProps}><SlidesWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "form") return <div ref={assignRefIfTracked as any} {...mergedProps}><FormWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "login") return <div ref={assignRefIfTracked as any} {...mergedProps}><LoginWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "nav-menu") return <div ref={assignRefIfTracked as any} {...mergedProps}><NavMenuWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "animated-headline") return <div ref={assignRefIfTracked as any} {...mergedProps}><AnimatedHeadlineWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "price-table") return <div ref={assignRefIfTracked as any} {...mergedProps}><PriceTableWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "price-list") return <div ref={assignRefIfTracked as any} {...mergedProps}><PriceListWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "gallery") return <div ref={assignRefIfTracked as any} {...mergedProps}><GalleryWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "basic-gallery") return <div ref={assignRefIfTracked as any} {...mergedProps}><BasicGalleryWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "flip-box") return <div ref={assignRefIfTracked as any} {...mergedProps}><FlipBoxWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "call-to-action") return <div ref={assignRefIfTracked as any} {...mergedProps}><CtaWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
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
    if (el.type === "icon-library") return <div ref={assignRefIfTracked as any} {...mergedProps}><IconLibraryWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "mega-menu") return <div ref={assignRefIfTracked as any} {...mergedProps}><MegaMenuWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;
    if (el.type === "share-buttons") return <div ref={assignRefIfTracked as any} {...mergedProps}><ShareButtonsWidgetRenderer el={el} isPreview={true} mergedStyles={finalMergedStyles} /></div>;

    if (el.type === "wc-product-title") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcProductTitleWidgetRenderer el={el} getMergedStyles={() => finalMergedStyles} activeDevice="desktop" /></div>;
    if (el.type === "wc-product-price") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcProductPriceWidgetRenderer el={el} getMergedStyles={() => finalMergedStyles} activeDevice="desktop" /></div>;
    if (el.type === "wc-product-images") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcProductImagesWidgetRenderer el={el} getMergedStyles={() => finalMergedStyles} activeDevice="desktop" /></div>;
    if (el.type === "wc-add-to-cart") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcAddToCartWidgetRenderer el={el} getMergedStyles={() => finalMergedStyles} activeDevice="desktop" /></div>;
    if (el.type === "wc-product-rating") return <div ref={assignRefIfTracked as any} {...mergedProps}><WcProductRatingWidgetRenderer el={el} getMergedStyles={() => finalMergedStyles} activeDevice="desktop" /></div>;

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

    if (el.type === "container" || el.type === "div-block") return (
        <React.Fragment key={el.id}>
            <div ref={assignRefIfTracked as any} {...mergedProps}>
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

export default function PublishedSite() {
    const { websiteId } = useParams<{ websiteId: string }>();
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

    // F-356 dynamic font analyzer integration
    useDynamicFonts(elements, globalSettings.fonts);

    useEffect(() => {
        if (!websiteId) return;

        const fetchWebsite = async () => {
            try {
                setLoading(true);
                const res = await fetch(`${apiUrl}/api/websites/${websiteId}`);
                const data = await res.json();

                if (!res.ok) throw new Error(data?.message || "Failed to load website runtime.");

                const site = data.website || data;

                if (site?.editorData?.pages && site.editorData.pages.length > 0) {
                    setPages(site.editorData.pages);
                    const homePage = site.editorData.pages.find((p: any) => p.isHome || p.slug === "/") || site.editorData.pages[0];
                    setActivePageId(homePage.id || "home");
                    setElements(homePage.elements || []);
                } else if (site?.editorData?.elements) {
                    const defaultPage = { id: "home", name: "Home", slug: "/", customCss: "", elements: site.editorData.elements };
                    setPages([defaultPage]);
                    setActivePageId("home");
                    setElements(site.editorData.elements);
                }

                if (site?.editorData?.popups) setPopups(site.editorData.popups);
                if (site?.editorData?.breakpoints) setBreakpoints(site.editorData.breakpoints);
                if (site?.editorData?.globalSettings) setGlobalSettings(site.editorData.globalSettings);
                if (site?.customCodeSnippets) setCustomCodeSnippets(site.customCodeSnippets);
                if (site?.status) setSiteStatus(site.status);
                if (site?.themeLocationRules) _setThemeRules(site.themeLocationRules);

            } catch (err: any) {
                setErrorMessage(err.message || "Failed to boot published runtime");
            } finally {
                setLoading(false);
            }
        };
        fetchWebsite();
    }, [websiteId, apiUrl]);

    const handleSwitchPage = (page: PageConfig) => {
        setActivePageId(page.id);
        setElements(page.elements || []);
    };
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

    if (loading) return <div className="min-h-screen text-slate-500 bg-slate-50 text-center flex items-center justify-center">Loading Website...</div>;
    if (errorMessage) return <div className="text-red-500 m-4">Error: {errorMessage}</div>;

    if (siteStatus === "MAINTENANCE") {
        return (
            <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
                <div className="text-6xl mb-4">🚧</div>
                <h1 className="text-3xl font-bold mb-2">Website Under Maintenance</h1>
                <p className="text-slate-400 max-w-md">We are currently performing scheduled maintenance. Please check back shortly.</p>
            </div>
        );
    }

    return (
        <div data-website-id={websiteId} data-page-id={activePageId} className={`fs-global-canvas-${websiteId || 'default'} fs-page-canvas-${websiteId || 'default'} w-full min-h-screen font-sans bg-white relative m-auto`} style={{ maxWidth: '100%', overflowX: 'hidden' }}>
            <style dangerouslySetInnerHTML={{ __html: getGlobalCustomCss(pages, popups, breakpoints, globalSettings, websiteId) }} />
            {optimizedGlobalCss && <style id="f353-optimized-styles">{optimizedGlobalCss}</style>}
            {customCodeSnippets && customCodeSnippets.length > 0 && (
                <React.Suspense fallback={null}>
                    <CodeInjectionRuntime snippets={customCodeSnippets} />
                </React.Suspense>
            )}

            {/* Dynamic Published Website Navigation Header */}
            {pages && pages.length > 0 && (
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
                />
            ))}
        </div>
    );
}
