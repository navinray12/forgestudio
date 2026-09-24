import type { MultilingualExportOptions } from "../types/accessibility.types";

export interface HreflangTag {
  lang: string;
  url: string;
}

/**
 * Generates <link rel="alternate" hreflang="..." href="..."> tags for SEO multilingual indexing
 */
export function generateHreflangTags(baseUrl: string, pageSlug: string, languages: string[]): HreflangTag[] {
  const cleanBase = baseUrl.replace(/\/$/, "");
  const cleanSlug = pageSlug ? pageSlug.replace(/^\//, "") : "";
  const path = cleanSlug ? `/${cleanSlug}` : "";

  return languages.map((lang) => ({
    lang,
    url: lang === "en" ? `${cleanBase}${path}` : `${cleanBase}/${lang}${path}`,
  }));
}

/**
 * Exports site content strings into format compatible with WPML, Polylang, TranslatePress, or Weglot
 */
export function exportMultilingualStrings(elements: any[], options: MultilingualExportOptions): string {
  const stringsToTranslate: { id: string; type: string; originalText: string }[] = [];

  const extractStrings = (items: any[]) => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      if (!item) continue;
      if (item.content && typeof item.content === "string" && item.content.trim()) {
        stringsToTranslate.push({ id: item.id, type: item.type, originalText: item.content.trim() });
      }
      if (item.children) extractStrings(item.children);
    }
  };

  extractStrings(elements);

  if (options.engine === "wpml") {
    return JSON.stringify(
      {
        wpml_package: {
          title: "ForgeStudio Page Translation Package",
          source_language: options.sourceLanguage,
          target_languages: options.targetLanguages,
          strings: stringsToTranslate.map((s) => ({
            name: `element_${s.id}_${s.type}`,
            value: s.originalText,
            type: "LINE",
          })),
        },
      },
      null,
      2
    );
  }

  if (options.engine === "polylang" || options.engine === "translatepress") {
    return JSON.stringify(
      {
        engine: options.engine,
        source: options.sourceLanguage,
        targets: options.targetLanguages,
        translations: stringsToTranslate.map((s) => ({
          key: s.id,
          context: s.type,
          singular: s.originalText,
          translation: "",
        })),
      },
      null,
      2
    );
  }

  // Weglot format default
  return JSON.stringify(
    {
      version: "1.0",
      source: options.sourceLanguage,
      targets: options.targetLanguages,
      words: stringsToTranslate.map((s) => ({
        w: s.originalText,
        t: "",
      })),
    },
    null,
    2
  );
}
