import type { Breakpoint, EditorElement } from "../editor/types";

export interface PageConfig {
  id: string;
  name: string;
  slug: string;
  customCss: string;
  elements: EditorElement[];
  isHome?: boolean;
}

export const DEFAULT_PUBLIC_BREAKPOINTS: Breakpoint[] = [
  { id: "widescreen", name: "Widescreen", width: 1440, active: false },
  { id: "laptop", name: "Laptop", width: 1200, active: false },
  { id: "desktop", name: "Desktop (Base)", width: 1024, active: true },
  { id: "tabletExtra", name: "Tablet Extra", width: 880, active: false },
  { id: "tablet", name: "Tablet", width: 768, active: true },
  { id: "mobileExtra", name: "Mobile Extra", width: 480, active: false },
  { id: "mobile", name: "Mobile", width: 360, active: true },
];

export function findTargetPage(pages: PageConfig[] | undefined, target: string): PageConfig | undefined {
  if (!target || !pages?.length) return undefined;
  const clean = target.replace(/^\//, "").split("?")[0].split("#")[0];
  return pages.find((page) =>
    page.id === target || page.slug === target || page.slug === `/${clean}` ||
    page.slug.replace(/^\//, "") === clean || page.name.toLowerCase() === target.toLowerCase() ||
    page.name.toLowerCase() === clean.toLowerCase() || (clean === "" && (page.isHome || page.id === "home")),
  );
}
