import { useEffect, useMemo } from 'react';
import type { EditorElement } from '../pages/editor/WebsiteEditor';

/**
 * F-356: Faster Font Loading Architecture
 * 
 * Extracts only REQUIRED font families and font weights from the active 
 * ForgeStudio document AST. Generates a perfectly scoped Google Fonts URL.
 * Automatically injects preconnects and loads non-critical fonts async minimizing CLS.
 */

// Default font configurations (Standard system fallbacks prevent invisible text)

export interface FontUsageInfo {
    family: string;
    weights: Set<number>;
    isCritical: boolean; // e.g. appears in first element / heading
}

function analyzeFontUsage(elements: EditorElement[], globalFonts: any): Map<string, FontUsageInfo> {
    const usage = new Map<string, FontUsageInfo>();

    const safeAdd = (family: string, weight: number, isCritical: boolean) => {
        if (!family || family === 'inherit' || family.includes('system-ui') || family.toLowerCase() === "sans-serif") return;

        // Google fonts typically uses spaces or + for families
        const cleanFamily = family.replace(/["']/g, '');

        let entry = usage.get(cleanFamily);
        if (!entry) {
            entry = { family: cleanFamily, weights: new Set<number>(), isCritical: false };
            usage.set(cleanFamily, entry);
        }

        entry.weights.add(weight);
        if (isCritical) entry.isCritical = true;
    };

    // Include globally defined fonts immediately (assuming they are critical)
    if (globalFonts?.heading) safeAdd(globalFonts.heading, 700, true);
    if (globalFonts?.heading) safeAdd(globalFonts.heading, 600, true);
    if (globalFonts?.body) safeAdd(globalFonts.body, 400, true);
    if (globalFonts?.body) safeAdd(globalFonts.body, 500, true);

    const traverse = (el: EditorElement, isInitiallyCritical: boolean) => {
        let isNodeCritical = isInitiallyCritical;
        if (el.type === 'heading') isNodeCritical = true;

        const fam = el.styles?.fontFamily || el.responsiveStyles?.desktop?.fontFamily;

        // fontWeight could be string 'bold', 'normal', or a number
        let rawWeight = el.styles?.fontWeight || el.responsiveStyles?.desktop?.fontWeight || "400";
        if (rawWeight === "bold") rawWeight = "700";
        if (rawWeight === "normal") rawWeight = "400";
        let weightNum = parseInt(String(rawWeight), 10);
        if (isNaN(weightNum)) weightNum = 400;

        if (fam) {
            safeAdd(fam, weightNum, isNodeCritical);
        }

        if (el.children) {
            // Only first few children usually critical
            el.children.forEach((child, index) => {
                traverse(child, isInitiallyCritical && index < 2);
            });
        }
    };

    // Standard LCP bound analysis
    elements.forEach((el, index) => traverse(el, index === 0));

    return usage;
}

export function generateGoogleFontsUrl(usage: Map<string, FontUsageInfo>): string | null {
    if (usage.size === 0) return null;

    // Format: family=Inter:wght@400;500;700&family=Roboto:wght@300;400
    const familyStrings: string[] = [];

    usage.forEach((info) => {
        const sortedWeights = Array.from(info.weights).sort((a, b) => a - b);
        const weightString = sortedWeights.join(';');
        const encodedFamily = info.family.replace(/\s+/g, '+');
        familyStrings.push(`family=${encodedFamily}:wght@${weightString}`);
    });

    if (familyStrings.length === 0) return null;

    // F-356 restriction: always append font-display: swap for performance!
    return `https://fonts.googleapis.com/css2?${familyStrings.join('&')}&display=swap`;
}

export function useDynamicFonts(elements: EditorElement[], globalFonts: any) {
    const fontUrl = useMemo(() => {
        const usage = analyzeFontUsage(elements, globalFonts);
        return generateGoogleFontsUrl(usage);
    }, [elements, globalFonts]);

    useEffect(() => {
        if (!fontUrl) return;

        // F-356: Ensure preconnects exist
        const injectPreconnect = (href: string, crossOrigin: boolean = false) => {
            if (!document.querySelector(`link[rel="preconnect"][href="${href}"]`)) {
                const link = document.createElement('link');
                link.rel = 'preconnect';
                link.href = href;
                if (crossOrigin) link.crossOrigin = 'anonymous';
                document.head.appendChild(link);
            }
        };

        injectPreconnect("https://fonts.googleapis.com");
        injectPreconnect("https://fonts.gstatic.com", true);

        const linkId = 'fs-dynamic-fonts';
        let existingLink = document.getElementById(linkId) as HTMLLinkElement;

        if (!existingLink) {
            existingLink = document.createElement('link');
            existingLink.id = linkId;
            existingLink.rel = 'stylesheet';
            // F-356 FCP Optimization: async loading using media="print"
            existingLink.media = 'print';
            existingLink.onload = function () {
                (this as HTMLLinkElement).media = 'all';
            };
            document.head.appendChild(existingLink);
        }

        // Only update if URL actually changed deeply minimizing duplicate execution overheads
        if (existingLink.href !== fontUrl) {
            existingLink.href = fontUrl;
        }

        // In F-356, removing old fonts isn't strictly necessary during session as browsers cache them,
        // but we overwrite the singular dynamic link so we don't have multiple heavy requests stacked.
    }, [fontUrl]);

    return { fontUrl };
}
