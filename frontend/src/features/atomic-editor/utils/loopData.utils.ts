import type { LoopContainerConfig, LoopDataItem } from "../types/atomicLoop.types";

export const SAMPLE_PRODUCTS: LoopDataItem[] = [
  {
    id: "prod-1",
    title: "Atomic Wireless Earbuds",
    price: "$129.00",
    description: "Active noise canceling with spatial audio support.",
    image: "🎧",
    url: "/products/earbuds",
  },
  {
    id: "prod-2",
    title: "Forge Mechanical Keyboard",
    price: "$189.00",
    description: "Custom RGB switches with hot-swappable PCB layout.",
    image: "⌨️",
    url: "/products/keyboard",
  },
  {
    id: "prod-3",
    title: "UltraWide Curved Monitor",
    price: "$599.00",
    description: "34-inch 144Hz HDR display with USB-C power delivery.",
    image: "🖥️",
    url: "/products/monitor",
  },
];

export const SAMPLE_BLOG_POSTS: LoopDataItem[] = [
  {
    id: "post-1",
    title: "Building Scaleable Web Architecture with Atomic Layouts",
    author: "Alex Rivers",
    date: "Sep 01, 2026",
    excerpt: "Learn how atomic design principles improve component reusability across pages.",
    image: "📰",
    url: "/blog/atomic-architecture",
  },
  {
    id: "post-2",
    title: "Mastering CSS Grid and Responsive Breakpoints",
    author: "Elena Rostova",
    date: "Aug 28, 2026",
    excerpt: "A comprehensive deep-dive into multi-column responsive grid structures.",
    image: "📐",
    url: "/blog/css-grid-mastery",
  },
];

/**
 * Resolves current dataset based on Loop Data Source settings
 */
export function resolveLoopItems(loop: LoopContainerConfig): LoopDataItem[] {
  let items: LoopDataItem[] = [];

  if (loop.dataSourceType === "cms_products") {
    items = SAMPLE_PRODUCTS;
  } else if (loop.dataSourceType === "cms_blog") {
    items = SAMPLE_BLOG_POSTS;
  } else if (loop.dataSourceType === "static" && loop.staticDataJson) {
    try {
      const parsed = JSON.parse(loop.staticDataJson);
      items = Array.isArray(parsed) ? parsed : [];
    } catch {
      items = [];
    }
  }

  if (loop.itemsLimit && loop.itemsLimit > 0) {
    items = items.slice(0, loop.itemsLimit);
  }

  return items;
}

/**
 * Evaluates dynamic property value for a rendered loop item
 */
export function evaluateDynamicField(
  item: LoopDataItem,
  propertyKey: string,
  prefix = "",
  suffix = ""
): string {
  const val = item[propertyKey];
  if (val === undefined || val === null) return `${prefix}${suffix}`;
  return `${prefix}${val}${suffix}`;
}
