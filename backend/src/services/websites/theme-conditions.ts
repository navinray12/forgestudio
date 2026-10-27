export type ThemePageContext = {
  pageId?: string;
  isHome?: boolean;
  slug?: string;
  isSearch?: boolean;
  is404?: boolean;
  isArchive?: boolean;
};

/** Pure evaluation used by public rendering; exclusions always win. */
export function matchesThemeCondition(
  conditions: Array<string | { type?: string; condition?: string }> | undefined,
  pageContext: ThemePageContext,
): boolean {
  if (!conditions || !Array.isArray(conditions) || conditions.length === 0) return true;
  const normalized: string[] = [];
  for (const item of conditions) {
    if (typeof item === "string") normalized.push(item);
    else if (item && typeof item === "object") {
      const type = (item.type || "INCLUDE").toLowerCase();
      const raw = (item.condition || "").toLowerCase().replace(/_/g, ":");
      if (raw === "search:results" || raw === "search") normalized.push(`${type}:search`);
      else if (raw === "404" || raw === "notfound") normalized.push(`${type}:404`);
      else if (raw === "archive") normalized.push(`${type}:archive`);
      else if (raw) normalized.push(`${type}:${raw}`);
    }
  }
  for (const condition of normalized) {
    if (condition === "exclude:all") return false;
    if (condition === "exclude:singular:home" && pageContext.isHome) return false;
    if (condition === "exclude:search" && pageContext.isSearch) return false;
    if (condition === "exclude:404" && pageContext.is404) return false;
    if (condition === "exclude:archive" && pageContext.isArchive) return false;
    if (condition.startsWith("exclude:page:")) {
      const target = condition.replace("exclude:page:", "").trim();
      if (target === pageContext.pageId || target === pageContext.slug) return false;
    }
  }
  let included = false;
  let hasInclusion = false;
  for (const condition of normalized) {
    if (!condition.startsWith("include:")) continue;
    hasInclusion = true;
    if (condition === "include:all") included = true;
    if (condition === "include:singular:home" && pageContext.isHome) included = true;
    if (condition === "include:search" && pageContext.isSearch) included = true;
    if (condition === "include:404" && pageContext.is404) included = true;
    if (condition === "include:archive" && pageContext.isArchive) included = true;
    if (condition.startsWith("include:page:")) {
      const target = condition.replace("include:page:", "").trim();
      if (target === pageContext.pageId || target === pageContext.slug) included = true;
    }
  }
  return hasInclusion ? included : true;
}
