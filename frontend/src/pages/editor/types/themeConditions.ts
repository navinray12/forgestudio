export type ThemePageContext = { pageId?: string; isHome?: boolean; slug?: string };

/** Pure theme condition evaluation shared by editor and published rendering. */
export function matchesThemeCondition(conditions: string[] | undefined, page: ThemePageContext): boolean {
  if (!conditions || !Array.isArray(conditions) || conditions.length === 0) return true;
  for (const condition of conditions) {
    if (condition === "exclude:all") return false;
    if (condition === "exclude:singular:home" && page.isHome) return false;
    if (condition.startsWith("exclude:page:")) {
      const target = condition.replace("exclude:page:", "").trim();
      if (target === page.pageId || target === page.slug) return false;
    }
  }
  let included = false;
  let hasInclusion = false;
  for (const condition of conditions) {
    if (!condition.startsWith("include:")) continue;
    hasInclusion = true;
    if (condition === "include:all") included = true;
    if (condition === "include:singular:home" && page.isHome) included = true;
    if (condition.startsWith("include:page:")) {
      const target = condition.replace("include:page:", "").trim();
      if (target === page.pageId || target === page.slug) included = true;
    }
  }
  return hasInclusion ? included : true;
}
