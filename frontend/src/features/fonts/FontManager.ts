/**
 * @file Fonts feature: Font Manager. Keep feature UI, hooks, services and types in this module.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { FontRegistry } from './FontRegistry';

/**
 * Get Clean Font Name.
 * @param fontFamily Font Family supplied to this operation (type: string).
 */
export function getCleanFontName(fontFamily: string): string {
  if (!fontFamily) return '';
  return fontFamily.split(',')[0].replace(/["']/g, '').trim();
}

/**
 * Traverses an element AST tree to collect all active font families used across all devices and states.

 * @param elements Elements supplied to this operation (type: any[]).
 */
export function collectFontsFromElements(elements: any[]): Set<string> {
  const fonts = new Set<string>();

  /**
   * Traverse.
   * @param node Node supplied to this operation (type: any).
   */
  function traverse(node: any) {
    if (!node || typeof node !== 'object') return;

    if (node.style && typeof node.style === 'object') {
      checkStyleObject(node.style);
    }

    if (node.desktopStyle) checkStyleObject(node.desktopStyle);
    if (node.tabletStyle) checkStyleObject(node.tabletStyle);
    if (node.mobileStyle) checkStyleObject(node.mobileStyle);
    if (node.hoverStyle) checkStyleObject(node.hoverStyle);

    if (Array.isArray(node.children)) {
      node.children.forEach(traverse);
    }

    if (Array.isArray(node.items)) {
      node.items.forEach(traverse);
    }
  }

  /**
   * Check Style Object.
   * @param styleObj Style Obj supplied to this operation (type: Record<string, any>).
   */
  function checkStyleObject(styleObj: Record<string, any>) {
    if (styleObj.fontFamily && typeof styleObj.fontFamily === 'string') {
      const cleanName = getCleanFontName(styleObj.fontFamily);
      if (cleanName && cleanName !== 'inherit' && cleanName !== 'sans-serif' && cleanName !== 'serif' && cleanName !== 'monospace' && cleanName !== 'system-ui') {
        fonts.add(cleanName);
      }
    }
  }

  if (Array.isArray(elements)) {
    elements.forEach(traverse);
  }

  return fonts;
}

/**
 * Builds an optimized Google Fonts CSS URL for a set of font family names.

 * @param fontFamilies Font Families supplied to this operation (type: Set<string> | string[]).
 */
export function buildGoogleFontsUrl(fontFamilies: Set<string> | string[]): string | null {
  const families = Array.from(fontFamilies).filter(fontName => {
    const fontMeta = FontRegistry.getFontMetadata(fontName);
    return fontMeta && fontMeta.source === 'google';
  });

  if (families.length === 0) return null;

  const familyQueries = families.map(fontName => {
    const fontMeta = FontRegistry.getFontMetadata(fontName);
    const weights = fontMeta?.weights || [400, 700];
    const hasItalic = fontMeta?.hasItalic;

    const formattedName = fontName.replace(/\s+/g, '+');

    if (hasItalic) {
      const pairs: string[] = [];
      weights.forEach(w => pairs.push(`0,${w}`));
      weights.forEach(w => pairs.push(`1,${w}`));
      return `family=${formattedName}:ital,wght@${pairs.join(';')}`;
    } else {
      return `family=${formattedName}:wght@${weights.join(';')}`;
    }
  });

  return `https://fonts.googleapis.com/css2?${familyQueries.join('&')}&display=swap`;
}

/**
 * Injects or updates a dynamic <link> stylesheet in the DOM document head for active fonts.

 * @param elements Elements supplied to this operation (type: any[]).
 */
export function syncDocumentFonts(elements: any[]): void {
  const usedFonts = collectFontsFromElements(elements);
  const cssUrl = buildGoogleFontsUrl(usedFonts);

  const existingLink = document.getElementById('forgestudio-dynamic-fonts') as HTMLLinkElement | null;

  if (!cssUrl) {
    if (existingLink) {
      existingLink.remove();
    }
    return;
  }

  if (existingLink) {
    if (existingLink.href !== cssUrl) {
      existingLink.href = cssUrl;
    }
  } else {
    const link = document.createElement('link');
    link.id = 'forgestudio-dynamic-fonts';
    link.rel = 'stylesheet';
    link.href = cssUrl;
    document.head.appendChild(link);
  }
}
