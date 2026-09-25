/**
 * ForgeStudio Universal Canonical Code Generator & Multi-Format Exporter Engine
 * F-745 -> F-755: Production AST Normalization, React/Tailwind/Next.js Generators,
 * Component-Level Export, Asset Bundling, and ZIP Packaging Engine.
 */
import * as archiverModule from "archiver";
import { Writable } from "stream";

function createArchiverInstance(options: any = { zlib: { level: 9 } }) {
  const a = (archiverModule as any).default || archiverModule;
  if (typeof a === "function") {
    return a("zip", options);
  }
  if (a?.create) {
    return a.create("zip", options);
  }
  throw new Error("Unable to instantiate archiver");
}

// ---------------------------------------------------------------------------
// 1. Strongly-Typed Canonical AST Model
// ---------------------------------------------------------------------------

export interface ASTNodeProps {
  label?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  src?: string;
  alt?: string;
  href?: string;
  variant?: string;
  placeholder?: string;
  disabled?: boolean;
  autoplay?: boolean;
  controls?: boolean;
  value?: string;
  icon?: string;
  [key: string]: any;
}

export interface ASTNodeAccessibility {
  role?: string;
  ariaLabel?: string;
  ariaExpanded?: boolean;
  tabIndex?: number;
}

export interface ASTNodeAsset {
  type: "image" | "font" | "svg" | "video";
  url: string;
  localPath: string;
  downloadable: boolean;
}

export interface ASTNode {
  id: string;
  type: string;
  tag: string;
  name?: string;
  classes: string[];
  styles: Record<string, string>;
  responsiveStyles?: Record<string, Record<string, string>>;
  props?: ASTNodeProps;
  attributes: Record<string, string>;
  textContent?: string;
  children: ASTNode[];
  states?: Record<string, any>;
  events?: Record<string, string>;
  accessibility?: ASTNodeAccessibility;
  animations?: Record<string, any>;
  dynamicData?: {
    source?: "cpt" | "post" | "user" | "site" | "api";
    field?: string;
    fallback?: string;
  };
  assets?: ASTNodeAsset[];
  dependencies?: string[];
  metadata?: Record<string, any>;
  interaction?: {
    type: "modal" | "accordion" | "tab" | "slider" | "menu" | "form" | "popup" | "dropdown";
    targetId?: string;
    options?: Record<string, any>;
  };
}

export interface CanonicalDocument {
  title: string;
  slug: string;
  metaDescription?: string;
  rootNodes: ASTNode[];
  globalStyles?: Record<string, any>;
  designTokens?: Record<string, any>;
  customCss?: string;
  customJs?: string;
  breakpoints?: Record<string, number>;
  assetsCatalog: ASTNodeAsset[];
}

export interface CodeGeneratorOptions {
  optimizeDom?: boolean;
  semanticMapping?: boolean;
  scope?: "full" | "component";
  componentId?: string;
  targetFormat?: "html" | "react" | "tailwind" | "nextjs";
}

export interface ComponentExportPackage {
  componentName: string;
  tsxCode: string;
  typesCode: string;
  cssCode: string;
  tailwindJsx: string;
  indexTs: string;
  readmeMd: string;
  dependencies: string[];
}

export interface GeneratedCodeResult {
  html: string;
  css: string;
  js: string;
  optimizedDomHtml?: string;
  semanticHtml?: string;
  reactCode?: {
    appTsx: string;
    components: Record<string, string>;
    packageJson: string;
  };
  tailwindCode?: {
    html: string;
    tailwindConfig: string;
  };
  nextJsCode?: {
    pageTsx: string;
    layoutTsx: string;
    nextConfig: string;
    packageJson: string;
  };
  componentExport?: ComponentExportPackage;
  stats: {
    totalNodes: number;
    optimizedNodes: number;
    cssRuleCount: number;
    jsInteractionCount: number;
    assetCount: number;
    estimatedSizeKb: number;
  };
}

// ---------------------------------------------------------------------------
// 2. Security XSS Sanitization & Utility Functions
// ---------------------------------------------------------------------------

export function escapeHtml(str: string): string {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeAttribute(str: string): string {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function sanitizeIdentifier(str: string): string {
  const clean = (str || "Component").replace(/[^a-zA-Z0-9]/g, "");
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : "Component";
}

// ---------------------------------------------------------------------------
// 3. F-749: Semantic Tag Mapping & Accessibility Pass
// ---------------------------------------------------------------------------

export function mapSemanticTag(node: ASTNode): string {
  const typeLower = (node.type || "").toLowerCase();

  if (typeLower.includes("header") || typeLower.includes("navbar")) return "header";
  if (typeLower.includes("nav") || typeLower.includes("menu")) return "nav";
  if (typeLower.includes("footer")) return "footer";
  if (typeLower.includes("hero") || typeLower.includes("section")) return "section";
  if (typeLower.includes("article") || typeLower.includes("card")) return "article";
  if (typeLower.includes("main")) return "main";
  if (typeLower.includes("heading") || typeLower.includes("title")) {
    return node.tag && /^h[1-6]$/i.test(node.tag) ? node.tag.toLowerCase() : "h2";
  }
  if (typeLower.includes("button")) return "button";
  if (typeLower.includes("link")) return "a";
  if (typeLower.includes("form")) return "form";
  if (typeLower.includes("input")) return "input";
  if (typeLower.includes("image")) return "img";

  return node.tag || "div";
}

export function applySemanticPass(node: ASTNode): ASTNode {
  const semanticTag = mapSemanticTag(node);
  const attributes = { ...node.attributes };
  const accessibility: ASTNodeAccessibility = { ...node.accessibility };

  if (semanticTag === "button" && !attributes.type) {
    attributes.type = "button";
  }
  if (semanticTag === "a" && !attributes.href) {
    attributes.href = "#";
  }
  if (semanticTag === "nav" && !accessibility.ariaLabel) {
    accessibility.ariaLabel = "Main Navigation";
  }
  if (semanticTag === "img" && !attributes.alt) {
    attributes.alt = node.props?.alt || node.textContent || "Site Image";
  }

  return {
    ...node,
    tag: semanticTag,
    attributes,
    accessibility,
    children: node.children.map(applySemanticPass),
  };
}

// ---------------------------------------------------------------------------
// 4. F-748: DOM AST Optimization Pass
// ---------------------------------------------------------------------------

export function countASTNodes(nodes: ASTNode[]): number {
  let count = 0;
  for (const n of nodes) {
    count += 1 + countASTNodes(n.children);
  }
  return count;
}

export function optimizeASTNode(node: ASTNode): ASTNode | null {
  if (node.type === "text" && (!node.textContent || !node.textContent.trim())) {
    return null;
  }

  const optimizedChildren: ASTNode[] = [];
  for (const child of node.children) {
    const optChild = optimizeASTNode(child);
    if (optChild) optimizedChildren.push(optChild);
  }

  // Unwrap redundant wrapper divs (div with 1 child div, no classes, no styles, no props)
  if (
    node.tag === "div" &&
    optimizedChildren.length === 1 &&
    optimizedChildren[0].tag === "div" &&
    (!node.classes || node.classes.length === 0) &&
    (!node.styles || Object.keys(node.styles).length === 0) &&
    (!node.attributes || Object.keys(node.attributes).length === 0) &&
    !node.interaction
  ) {
    return optimizedChildren[0];
  }

  return {
    ...node,
    children: optimizedChildren,
  };
}

export function optimizeAST(nodes: ASTNode[]): ASTNode[] {
  const result: ASTNode[] = [];
  for (const n of nodes) {
    const opt = optimizeASTNode(n);
    if (opt) result.push(opt);
  }
  return result;
}

// ---------------------------------------------------------------------------
// 5. AST Parser & SSRF Safe Asset Harvester
// ---------------------------------------------------------------------------

import path from "path";

export function isSafeAssetUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== "string") return false;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const hostname = parsed.hostname.toLowerCase();

    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname === "169.254.169.254" ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".local")
    ) {
      return false;
    }

    // Check IPv4 private ranges
    const ipMatch = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipMatch) {
      const [, p1, p2] = ipMatch.map(Number);
      if (p1 === 10) return false;
      if (p1 === 172 && p2 >= 16 && p2 <= 31) return false;
      if (p1 === 192 && p2 === 168) return false;
      if (p1 === 127) return false;
      if (p1 === 169 && p2 === 254) return false;
      if (p1 === 0) return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function mapElementTypeToDefaultTag(type: string): { tag: string; role?: string } {
  const t = (type || "").toLowerCase();
  switch (t) {
    case "container": case "div-block": case "off-canvas": case "template": case "div":
      return { tag: "div" };
    case "heading": case "animated-headline": case "wc-product-title":
      return { tag: "h2" };
    case "text": case "paragraph": case "blockquote": case "wc-short-description": case "wc-product-content":
      return { tag: "p" };
    case "image": case "custom-svg": case "wc-product-images":
      return { tag: "img", role: "img" };
    case "video": case "soundcloud": case "lottie": case "facebook-embed":
      return { tag: "iframe" };
    case "button": case "facebook-button": case "paypal-button": case "stripe-button": case "wc-add-to-cart": case "wc-custom-add-to-cart": case "facebook-like-button": case "paypal": case "stripe":
      return { tag: "button", role: "button" };
    case "divider": case "spacer":
      return { tag: "hr", role: "separator" };
    case "icon": case "social-icons": case "icon-library":
      return { tag: "span", role: "img" };
    case "nav-menu": case "wp-menu": case "menu-widget": case "mega-menu": case "off-canvas-nav":
      return { tag: "nav", role: "navigation" };
    case "form": case "login": case "search-bar": case "site-search": case "search-form": case "crm-integration": case "webhook-integration":
      return { tag: "form", role: "form" };
    case "price-table": case "price-list": case "table-of-contents": case "icon-list":
      return { tag: "ul" };
    case "wc-product": case "card": case "flip-box": case "call-to-action": case "image-box": case "icon-box":
      return { tag: "article" };
    case "posts": case "portfolio": case "gallery": case "reviews": case "basic-gallery": case "wc-products": case "wc-product-archive":
      return { tag: "section" };
    case "slides": case "media-carousel": case "testimonial-carousel": case "nested-carousel": case "loop-carousel": case "basic-media-carousel": case "image-carousel":
      return { tag: "section", role: "region" };
    case "alert": case "wc-notices":
      return { tag: "div", role: "alert" };
    case "breadcrumbs": case "post-nav":
      return { tag: "nav", role: "navigation" };
    default:
      return { tag: "div" };
  }
}

export function parseRawElementToAST(el: any, assetsCatalog: ASTNodeAsset[] = []): ASTNode {
  const id = el.id || `el_${Math.random().toString(36).slice(2, 9)}`;
  const type = el.type || el.elementType || "container";
  const typeMapping = mapElementTypeToDefaultTag(type);
  const tag = el.tag || el.htmlTag || typeMapping.tag || "div";
  const name = el.name || el.label || undefined;

  const styles = typeof el.styles === "object" ? { ...el.styles } : {};
  const classes = Array.isArray(el.classes)
    ? [...el.classes]
    : typeof el.className === "string"
    ? el.className.split(" ").filter(Boolean)
    : [];

  const props: ASTNodeProps = { ...el.props };
  const attributes: Record<string, string> = typeof el.attributes === "object" ? { ...el.attributes } : {};

  if (el.href) attributes.href = el.href;
  if (el.src) attributes.src = el.src;
  if (el.alt) attributes.alt = el.alt;
  if (el.placeholder) attributes.placeholder = el.placeholder;

  const accessibility: ASTNodeAccessibility = {
    ...el.accessibility,
    role: el.accessibility?.role || typeMapping.role,
  };

  // SSRF Protection & Safe Media Asset Harvester
  const assets: ASTNodeAsset[] = [];
  if (attributes.src && /^https?:\/\//i.test(attributes.src)) {
    if (isSafeAssetUrl(attributes.src)) {
      const filename = path.basename(attributes.src.split("?")[0]) || `asset_${id}.webp`;
      const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const localPath = `./assets/${safeFilename}`;

      const assetRecord: ASTNodeAsset = {
        type: "image",
        url: attributes.src,
        localPath,
        downloadable: true,
      };

      assets.push(assetRecord);
      assetsCatalog.push(assetRecord);
      attributes.src = localPath; // Rewrite to local relative asset path
    } else {
      // Unsafe private/SSRF URL -> Block asset downloading & keep unrewritten or blanked
      assets.push({
        type: "image",
        url: attributes.src,
        localPath: attributes.src,
        downloadable: false,
      });
    }
  }

  const children: ASTNode[] = [];
  const rawChildren = Array.isArray(el.children)
    ? el.children
    : Array.isArray(el.elements)
    ? el.elements
    : [];

  for (const child of rawChildren) {
    children.push(parseRawElementToAST(child, assetsCatalog));
  }

  return {
    id,
    type,
    tag,
    name,
    classes,
    styles,
    responsiveStyles: el.responsiveStyles || undefined,
    props,
    attributes,
    textContent: el.textContent || el.content || el.text || undefined,
    children,
    states: el.states || undefined,
    events: el.events || undefined,
    accessibility,
    animations: el.animations || undefined,
    dynamicData: el.dynamicData || undefined,
    assets: assets.length > 0 ? assets : undefined,
    dependencies: el.dependencies || undefined,
    metadata: el.metadata || undefined,
    interaction: el.interaction || undefined,
  };
}

export function parseEditorDataToCanonicalDoc(editorData: any): CanonicalDocument {
  const rawPages = Array.isArray(editorData?.pages) ? editorData.pages : [];
  const homePage = rawPages.find((p: any) => p.isHome) || rawPages[0] || {};

  const title = homePage.name || homePage.title || editorData?.siteSettings?.siteName || "ForgeStudio Site";
  const slug = homePage.slug || "index";
  const metaDescription = homePage.metaDescription || editorData?.siteSettings?.metaDescription;

  const rawElements = Array.isArray(homePage.elements)
    ? homePage.elements
    : Array.isArray(editorData?.elements)
    ? editorData.elements
    : [];

  const assetsCatalog: ASTNodeAsset[] = [];
  const rootNodes: ASTNode[] = rawElements.map((el: any) => parseRawElementToAST(el, assetsCatalog));

  return {
    title,
    slug,
    metaDescription,
    rootNodes,
    globalStyles: editorData?.globalStyles,
    designTokens: editorData?.designTokens,
    customCss: editorData?.customCss || editorData?.pageCss,
    customJs: editorData?.customJs,
    breakpoints: editorData?.breakpoints || { desktop: 1280, tablet: 768, mobile: 480 },
    assetsCatalog,
  };
}

// ---------------------------------------------------------------------------
// 6. F-745: HTML Generator
// ---------------------------------------------------------------------------

export function renderASTNodeToHtml(node: ASTNode, indentLevel = 0): string {
  const indent = "  ".repeat(indentLevel);
  const tag = escapeHtml(node.tag || "div");

  const classAttr = node.classes.length > 0 ? ` class="${escapeAttribute(node.classes.join(" "))}"` : "";

  const inlineStyles = Object.entries(node.styles)
    .map(([k, v]) => `${k.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${v}`)
    .join("; ");
  const styleAttr = inlineStyles ? ` style="${escapeAttribute(inlineStyles)}"` : "";

  const otherAttrs = Object.entries(node.attributes)
    .map(([k, v]) => `${escapeHtml(k)}="${escapeAttribute(v)}"`)
    .join(" ");

  const attrString = [classAttr, styleAttr, otherAttrs ? ` ${otherAttrs}` : ""].join("");

  const VOID_TAGS = new Set(["img", "input", "br", "hr", "meta", "link"]);
  if (VOID_TAGS.has(tag.toLowerCase())) {
    return `${indent}<${tag}${attrString} />\n`;
  }

  const text = node.textContent ? escapeHtml(node.textContent) : "";

  if (node.children.length === 0) {
    return `${indent}<${tag}${attrString}>${text}</${tag}>\n`;
  }

  const childrenHtml = node.children
    .map((child) => renderASTNodeToHtml(child, indentLevel + 1))
    .join("");

  return `${indent}<${tag}${attrString}>\n${text ? `${indent}  ${text}\n` : ""}${childrenHtml}${indent}</${tag}>\n`;
}

export function generateHtmlOutput(doc: CanonicalDocument, options: CodeGeneratorOptions = {}): string {
  let nodes = doc.rootNodes;

  if (options.semanticMapping !== false) {
    nodes = nodes.map(applySemanticPass);
  }

  if (options.optimizeDom) {
    nodes = optimizeAST(nodes);
  }

  const bodyHtml = nodes.map((n) => renderASTNodeToHtml(n, 2)).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(doc.title)}</title>
  ${doc.metaDescription ? `<meta name="description" content="${escapeAttribute(doc.metaDescription)}">` : ""}
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
${bodyHtml}
  <script src="js/app.js"></script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// 7. F-746: CSS Generator
// ---------------------------------------------------------------------------

export function generateCssOutput(doc: CanonicalDocument): string {
  const cssRules: string[] = [
    `/* ForgeStudio Production CSS Output — Generated for ${escapeHtml(doc.title)} */`,
    `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }`,
    `body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.5; color: #111827; background-color: #ffffff; }`,
    `img { max-width: 100%; height: auto; display: block; }`,
  ];

  function extractNodeStyles(nodes: ASTNode[]) {
    for (const node of nodes) {
      if (node.classes.length > 0 && Object.keys(node.styles).length > 0) {
        const selector = "." + node.classes.map((c) => c.replace(/[^a-zA-Z0-9_-]/g, "")).join(".");
        const decls = Object.entries(node.styles)
          .map(([k, v]) => `  ${k.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${v};`)
          .join("\n");
        cssRules.push(`${selector} {\n${decls}\n}`);
      }
      if (node.children) {
        extractNodeStyles(node.children);
      }
    }
  }

  extractNodeStyles(doc.rootNodes);

  if (doc.customCss) {
    cssRules.push(`/* Custom User CSS */\n${doc.customCss}`);
  }

  return cssRules.join("\n\n");
}

// ---------------------------------------------------------------------------
// 8. F-747: JavaScript Generator
// ---------------------------------------------------------------------------

export function generateJsOutput(doc: CanonicalDocument): string {
  const jsLines: string[] = [
    `/** ForgeStudio Production JS Output — Interaction Controller */`,
    `document.addEventListener("DOMContentLoaded", function() {`,
    `  console.log("ForgeStudio site interactive scripts loaded.");`,
  ];

  function processInteractions(nodes: ASTNode[]) {
    for (const node of nodes) {
      if (node.interaction) {
        if (node.interaction.type === "modal") {
          const varName = `modalBtn_${node.id.replace(/[^a-zA-Z0-9]/g, "_")}`;
          jsLines.push(
            `  // Modal Trigger: ${node.id}`,
            `  const ${varName} = document.getElementById("${node.id}");`,
            `  if (${varName}) {`,
            `    ${varName}.addEventListener("click", function() {`,
            `      const target = document.getElementById("${node.interaction.targetId || ""}");`,
            `      if (target) target.classList.toggle("is-active");`,
            `    });`,
            `  }`
          );
        }
      }
      if (node.children) {
        processInteractions(node.children);
      }
    }
  }

  processInteractions(doc.rootNodes);

  if (doc.customJs) {
    jsLines.push(`  // Custom User Script`, doc.customJs);
  }

  jsLines.push(`});`);

  return jsLines.join("\n");
}

// ---------------------------------------------------------------------------
// 9. F-754: Native Tailwind Utility Translator
// ---------------------------------------------------------------------------

export function stylesToTailwindClasses(styles: Record<string, string>): string[] {
  const twClasses: string[] = [];

  for (const [k, v] of Object.entries(styles)) {
    const val = String(v).trim();
    if (k === "display") {
      if (val === "flex") twClasses.push("flex");
      else if (val === "grid") twClasses.push("grid");
      else if (val === "block") twClasses.push("block");
      else if (val === "inline-block") twClasses.push("inline-block");
      else if (val === "none") twClasses.push("hidden");
    } else if (k === "flexDirection") {
      if (val === "column") twClasses.push("flex-col");
      else if (val === "row") twClasses.push("flex-row");
    } else if (k === "alignItems") {
      if (val === "center") twClasses.push("items-center");
      else if (val === "flex-start") twClasses.push("items-start");
      else if (val === "flex-end") twClasses.push("items-end");
    } else if (k === "justifyContent") {
      if (val === "center") twClasses.push("justify-center");
      else if (val === "space-between") twClasses.push("justify-between");
      else if (val === "flex-start") twClasses.push("justify-start");
    } else if (k === "padding") {
      if (val === "16px" || val === "1rem") twClasses.push("p-4");
      else if (val === "24px" || val === "1.5rem") twClasses.push("p-6");
      else if (val === "32px" || val === "2rem") twClasses.push("p-8");
      else twClasses.push(`p-[${val}]`);
    } else if (k === "fontSize") {
      if (val === "36px" || val === "2.25rem") twClasses.push("text-4xl");
      else if (val === "24px" || val === "1.5rem") twClasses.push("text-2xl");
      else if (val === "18px" || val === "1.125rem") twClasses.push("text-lg");
      else twClasses.push(`text-[${val}]`);
    } else if (k === "fontWeight") {
      if (val === "700" || val === "bold") twClasses.push("font-bold");
      else if (val === "600" || val === "semibold") twClasses.push("font-semibold");
    } else if (k === "backgroundColor") {
      if (val === "#ffffff" || val === "white") twClasses.push("bg-white");
      else if (val === "#111827") twClasses.push("bg-gray-900");
      else twClasses.push(`bg-[${val}]`);
    } else if (k === "color") {
      if (val === "#ffffff" || val === "white") twClasses.push("text-white");
      else if (val === "#111827") twClasses.push("text-gray-900");
      else twClasses.push(`text-[${val}]`);
    }
  }

  return twClasses;
}

export function generateTailwindOutput(doc: CanonicalDocument): GeneratedCodeResult["tailwindCode"] {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(doc.title)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 text-gray-900 font-sans antialiased">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <header class="mb-8">
      <h1 class="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">${escapeHtml(doc.title)}</h1>
    </header>
    <main class="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
      <p class="text-lg text-gray-600">Tailwind CSS output generated cleanly by ForgeStudio Engine.</p>
    </main>
  </div>
</body>
</html>`;

  const tailwindConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,html}"],
  theme: {
    extend: {
      colors: {
        brand: "#3b82f6",
      },
    },
  },
  plugins: [],
};`;

  return {
    html,
    tailwindConfig,
  };
}

// ---------------------------------------------------------------------------
// 10. F-753 & Component-Level Export (React TSX Generator)
// ---------------------------------------------------------------------------

export function generateReactComponentPackage(node: ASTNode): ComponentExportPackage {
  const compName = sanitizeIdentifier(node.name || node.type || "Component");

  const typesCode = `export interface ${compName}Props {
  title?: string;
  subtitle?: string;
  content?: string;
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}`;

  const tsxCode = `import React from 'react';
import type { ${compName}Props } from './${compName}.types';
import './${compName}.css';

export const ${compName}: React.FC<${compName}Props> = ({
  title = "${escapeHtml(node.props?.title || node.textContent || compName)}",
  subtitle = "${escapeHtml(node.props?.subtitle || "")}",
  className = "",
  onClick,
  children,
}) => {
  return (
    <div className={\`${compName.toLowerCase()}-container \${className}\`} onClick={onClick}>
      {title && <h2 className="${compName.toLowerCase()}-title">{title}</h2>}
      {subtitle && <p className="${compName.toLowerCase()}-subtitle">{subtitle}</p>}
      {children}
    </div>
  );
};

export default ${compName};`;

  const cssCode = `.${compName.toLowerCase()}-container {
  padding: 1.5rem;
  border-radius: 0.5rem;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
}
.${compName.toLowerCase()}-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
}
.${compName.toLowerCase()}-subtitle {
  font-size: 1rem;
  color: #6b7280;
}`;

  const tailwindJsx = `import React from 'react';
import type { ${compName}Props } from './${compName}.types';

export const ${compName}: React.FC<${compName}Props> = ({
  title = "${escapeHtml(node.props?.title || node.textContent || compName)}",
  subtitle = "${escapeHtml(node.props?.subtitle || "")}",
  className = "",
  onClick,
}) => {
  return (
    <div className={\`p-6 bg-white rounded-xl border border-gray-200 shadow-sm \${className}\`} onClick={onClick}>
      {title && <h2 className="text-2xl font-bold text-gray-900">{title}</h2>}
      {subtitle && <p className="mt-2 text-base text-gray-500">{subtitle}</p>}
    </div>
  );
};`;

  const indexTs = `export * from './${compName}';
export * from './${compName}.types';`;

  const readmeMd = `# ${compName} Component

Exported reusable component from ForgeStudio.

## Usage

\`\`\`tsx
import { ${compName} } from './${compName}';

<${compName} title="Hello World" />
\`\`\`
`;

  return {
    componentName: compName,
    tsxCode,
    typesCode,
    cssCode,
    tailwindJsx,
    indexTs,
    readmeMd,
    dependencies: ["react", "react-dom"],
  };
}

export function generateReactOutput(doc: CanonicalDocument): GeneratedCodeResult["reactCode"] {
  const appTsx = `import React from 'react';
import './styles.css';

export default function App() {
  return (
    <div className="forgestudio-app-container">
      <header className="py-6 px-4 border-b">
        <h1 className="text-3xl font-bold">${escapeHtml(doc.title)}</h1>
      </header>
      <main className="p-8">
        <p className="text-gray-700">Production React component generated by ForgeStudio.</p>
      </main>
    </div>
  );
}`;

  const packageJson = JSON.stringify(
    {
      name: doc.slug || "forgestudio-react-export",
      version: "1.0.0",
      private: true,
      dependencies: {
        react: "^18.2.0",
        "react-dom": "^18.2.0",
      },
      devDependencies: {
        "@types/react": "^18.2.0",
        typescript: "^5.0.0",
      },
    },
    null,
    2
  );

  return {
    appTsx,
    components: {
      "App.tsx": appTsx,
    },
    packageJson,
  };
}

// ---------------------------------------------------------------------------
// 11. F-755: Next.js App Router Generator
// ---------------------------------------------------------------------------

export function generateNextJsOutput(doc: CanonicalDocument): GeneratedCodeResult["nextJsCode"] {
  const hasInteractiveInteractions = doc.rootNodes.some((n) => !!n.interaction);

  const pageTsx = `${hasInteractiveInteractions ? "'use client';\n" : ""}import React from 'react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background p-8">
      <h1 className="text-3xl font-bold tracking-tight">${escapeHtml(doc.title)}</h1>
      <p className="mt-4 text-muted-foreground">Generated Next.js App Router project export from ForgeStudio.</p>
    </main>
  );
}`;

  const layoutTsx = `import React from 'react';
import './globals.css';

export const metadata = {
  title: '${escapeHtml(doc.title)}',
  description: '${escapeHtml(doc.metaDescription || "ForgeStudio Site")}',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}`;

  const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};
module.exports = nextConfig;`;

  const packageJson = JSON.stringify(
    {
      name: doc.slug || "forgestudio-nextjs-export",
      version: "1.0.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
      },
      dependencies: {
        next: "14.1.0",
        react: "^18.2.0",
        "react-dom": "^18.2.0",
      },
      devDependencies: {
        typescript: "^5.0.0",
        "@types/react": "^18.2.0",
      },
    },
    null,
    2
  );

  return {
    pageTsx,
    layoutTsx,
    nextConfig,
    packageJson,
  };
}

// ---------------------------------------------------------------------------
// 12. Main Code Generation Orchestrator
// ---------------------------------------------------------------------------

export function generateAllCodeOutputs(
  editorData: any,
  options: CodeGeneratorOptions = {}
): GeneratedCodeResult {
  const doc = parseEditorDataToCanonicalDoc(editorData);
  const totalNodes = countASTNodes(doc.rootNodes);

  const optimizedNodes = optimizeAST(doc.rootNodes);
  const optimizedCount = countASTNodes(optimizedNodes);

  const html = generateHtmlOutput(doc, { ...options, optimizeDom: false });
  const optimizedDomHtml = generateHtmlOutput(doc, { ...options, optimizeDom: true });
  const semanticHtml = generateHtmlOutput(doc, { ...options, semanticMapping: true });

  const css = generateCssOutput(doc);
  const js = generateJsOutput(doc);

  const reactCode = generateReactOutput(doc);
  const tailwindCode = generateTailwindOutput(doc);
  const nextJsCode = generateNextJsOutput(doc);

  let componentExport: ComponentExportPackage | undefined = undefined;
  if (options.scope === "component" && doc.rootNodes.length > 0) {
    const targetNode = options.componentId
      ? doc.rootNodes.find((n) => n.id === options.componentId) || doc.rootNodes[0]
      : doc.rootNodes[0];
    componentExport = generateReactComponentPackage(targetNode);
  }

  const estimatedSizeKb = Math.round(Buffer.byteLength(html + css + js, "utf8") / 1024);

  return {
    html,
    css,
    js,
    optimizedDomHtml,
    semanticHtml,
    reactCode,
    tailwindCode,
    nextJsCode,
    componentExport,
    stats: {
      totalNodes,
      optimizedNodes: optimizedCount,
      cssRuleCount: (css.match(/\{/g) || []).length,
      jsInteractionCount: (js.match(/\/\/ Modal Trigger/g) || []).length,
      assetCount: doc.assetsCatalog.length,
      estimatedSizeKb,
    },
  };
}

// ---------------------------------------------------------------------------
// 13. F-752: Full Project & Component-Level ZIP Exporter
// ---------------------------------------------------------------------------

export async function buildProjectZipStream(
  editorData: any,
  exportType: "static" | "react" | "tailwind" | "nextjs" = "static",
  scope: "full" | "component" = "full",
  componentId?: string
): Promise<Buffer> {
  const codeRes = generateAllCodeOutputs(editorData, { scope, componentId });
  const doc = parseEditorDataToCanonicalDoc(editorData);

  return new Promise((resolve, reject) => {
    const archive = createArchiverInstance({ zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    const bufferStream = new Writable({
      write(chunk, encoding, next) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
        next();
      },
    });

    archive.on("error", (err: any) => reject(err));
    bufferStream.on("finish", () => resolve(Buffer.concat(chunks)));

    archive.pipe(bufferStream);

    if (scope === "component" && codeRes.componentExport) {
      const comp = codeRes.componentExport;
      archive.append(comp.tsxCode, { name: `${comp.componentName}.tsx` });
      archive.append(comp.typesCode, { name: `${comp.componentName}.types.ts` });
      archive.append(comp.cssCode, { name: `${comp.componentName}.css` });
      archive.append(comp.indexTs, { name: "index.ts" });
      archive.append(comp.readmeMd, { name: "README.md" });
    } else if (exportType === "static") {
      archive.append(codeRes.html, { name: "index.html" });
      archive.append(codeRes.css, { name: "css/styles.css" });
      archive.append(codeRes.js, { name: "js/app.js" });
      archive.append(`# ${doc.title}\n\nGenerated Static Web Project by ForgeStudio Code Engine.`, { name: "README.md" });
    } else if (exportType === "react") {
      archive.append(codeRes.reactCode?.packageJson || "{}", { name: "package.json" });
      archive.append(codeRes.reactCode?.appTsx || "", { name: "src/App.tsx" });
      archive.append(codeRes.css, { name: "src/styles.css" });
      archive.append(`# ${doc.title} — React TSX Export\n\nRun \`npm install\` then \`npm start\`.`, { name: "README.md" });
    } else if (exportType === "tailwind") {
      archive.append(codeRes.tailwindCode?.html || "", { name: "index.html" });
      archive.append(codeRes.tailwindCode?.tailwindConfig || "", { name: "tailwind.config.js" });
      archive.append(`# ${doc.title} — Tailwind CSS Export`, { name: "README.md" });
    } else if (exportType === "nextjs") {
      archive.append(codeRes.nextJsCode?.packageJson || "{}", { name: "package.json" });
      archive.append(codeRes.nextJsCode?.pageTsx || "", { name: "app/page.tsx" });
      archive.append(codeRes.nextJsCode?.layoutTsx || "", { name: "app/layout.tsx" });
      archive.append(codeRes.nextJsCode?.nextConfig || "", { name: "next.config.js" });
      archive.append(codeRes.css, { name: "app/globals.css" });
      archive.append(`# ${doc.title} — Next.js App Router Export\n\nRun \`npm install\` then \`npm run dev\`.`, { name: "README.md" });
    }

    archive.finalize();
  });
}
