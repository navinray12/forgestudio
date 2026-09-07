import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
    resolveElementStyles,
    getInnerStyles,
    BackgroundSlideshow
} from "../editor/WebsiteEditor";
import type { EditorElement, Breakpoint } from "../editor/WebsiteEditor";
import type { PopupConfig } from "../../types/popup.types";

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
}

// F-358: Safely caches execution overhead per Element in PublishedSite skipping massive style hashing recalculations
const RenderNode: React.FC<RenderNodeProps> = React.memo(({ el, isCritical, activeBreakpointId, breakpoints, globalSettings, elementClassMap, apiUrl }) => {
    // F-351 logic exactly as website outputs
    const resolvedStyles = resolveElementStyles(el, activeBreakpointId, breakpoints, globalSettings);

    const hasBgImage = !!resolvedStyles.backgroundImage;

    // F-355: Lazy Loading Observer for Background Images
    const { ref: observerRef, isVisible } = useLazyLoad({
        enabled: !isCritical && hasBgImage,
        rootMargin: "400px"
    });

    // Pass attributes securely
    const customAttrs = el.customAttributes?.filter((a: any) => a.enabled !== false).reduce((acc: any, attr: any) => {
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

    if (el.type === "icon") return <React.Fragment key={el.id}><div ref={assignRefIfTracked as any} {...mergedProps} className={`${mergedProps.className} ${optInnerClass}`} style={{ display: "flex", justifyContent: resolvedStyles.textAlign || "center", ...mergedProps.style }}>{renderSvgIcon(el.styles.iconName || "star", el.styles.iconSize || "32", el.styles.iconColor || "#2563eb")}</div></React.Fragment>;

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

    if (el.type === "container" || el.type === "div-block") return (
        <React.Fragment key={el.id}>
            <div ref={assignRefIfTracked as any} {...mergedProps}>
                {el.styles?.backgroundType === "slideshow" && el.styles.backgroundSlideshowUrls && (
                    <BackgroundSlideshow urls={Array.isArray(el.styles.backgroundSlideshowUrls) ? el.styles.backgroundSlideshowUrls : String(el.styles.backgroundSlideshowUrls).split(",")} interval={Number(el.styles.backgroundSlideshowSpeed) || 5000} />
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
                    // Currently published site loads home page (first page) by default
                    setElements(site.editorData.pages[0].elements);
                } else if (site?.editorData?.elements) {
                    setPages([{ id: "home", name: "Home", slug: "/", customCss: "", elements: site.editorData.elements }]);
                    setElements(site.editorData.elements);
                }

                if (site?.editorData?.popups) setPopups(site.editorData.popups);
                if (site?.editorData?.breakpoints) setBreakpoints(site.editorData.breakpoints);
                if (site?.editorData?.globalSettings) setGlobalSettings(site.editorData.globalSettings);
                if (site?.customCodeSnippets) setCustomCodeSnippets(site.customCodeSnippets);

            } catch (err: any) {
                setErrorMessage(err.message || "Failed to boot published runtime");
            } finally {
                setLoading(false);
            }
        };
        fetchWebsite();
    }, [websiteId, apiUrl]);

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
            // This forces it to be applied natively via the RenderNode so we can defer its application!
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

            // F-355: Prevent global CSS from overriding deferred inline background images eagerly
            // (If they are deferred, we don't dump them into the external CSS. Wait, if F-353 puts background-image in CSS, all instances fetch eagerly!)
            // We should NOT include `backgroundImage` in outer/inner props if we want to defer it lazily globally?
            // Actually, if it goes to CSS, it evaluates on parse! 
            // So we MUST intercept `backgroundImage` from F-353 compiler for lazy elements.

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

    return (
        <div data-website-id={websiteId} data-page-id={pages[0]?.id || "home"} className={`fs-global-canvas-${websiteId || 'default'} fs-page-canvas-${websiteId || 'default'} w-full min-h-screen font-sans bg-white relative m-auto`} style={{ maxWidth: '100%', overflowX: 'hidden' }}>
            <style dangerouslySetInnerHTML={{ __html: getGlobalCustomCss(pages, popups, breakpoints, globalSettings, websiteId) }} />
            {optimizedGlobalCss && <style id="f353-optimized-styles">{optimizedGlobalCss}</style>}
            {customCodeSnippets && customCodeSnippets.length > 0 && (
                <React.Suspense fallback={null}>
                    <CodeInjectionRuntime snippets={customCodeSnippets} />
                </React.Suspense>
            )}
            {elements.map((el, index) => (
                <RenderNode
                    key={el.id}
                    el={el}
                    isCritical={index === 0} // F-355: Mark top-level 0 as eager LCP
                    activeBreakpointId={activeBreakpointId}
                    breakpoints={breakpoints}
                    globalSettings={globalSettings}
                    elementClassMap={elementClassMap}
                    apiUrl={apiUrl}
                />
            ))}
        </div>
    );
}
