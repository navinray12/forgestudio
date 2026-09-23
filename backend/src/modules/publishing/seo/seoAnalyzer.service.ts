/**
 * ForgeStudio SEO & Quality Analyzer Service
 * 
 * Provides deterministic, real-time algorithmic auditing for:
 * 1. Search Engine Optimization (Title, Description, H1 uniqueness, Heading Hierarchy, Canonical, Social Graph)
 * 2. Image Alternative Text Inspection (Missing, empty, and generic alt detection)
 * 3. Programmatic WCAG 2.1 Accessibility (Level A/AA checks)
 * 4. Schema.org JSON-LD Structured Data Generation and Validation
 */

export interface SeoAuditItem {
  id: string;
  category: "seo" | "images" | "a11y" | "social";
  severity: "critical" | "warning" | "passed";
  title: string;
  description: string;
  recommendation: string;
  elementId?: string;
  penalty: number;
}

export interface SeoAuditResult {
  score: number; // 0 - 100
  grade: "A" | "B" | "C" | "D" | "F";
  critical: SeoAuditItem[];
  warnings: SeoAuditItem[];
  passed: SeoAuditItem[];
  stats: {
    headingCount: number;
    wordCount: number;
    imageCount: number;
    linkCount: number;
    h1Count: number;
  };
}

export interface ImageAuditItem {
  elementId: string;
  pageId?: string;
  elementName?: string;
  src: string;
  alt: string;
  isDecorative: boolean;
  issueType: "missing" | "empty" | "generic" | "valid";
  recommendation: string;
}

export interface ImageAuditResult {
  total: number;
  valid: number;
  missing: number;
  empty: number;
  generic: number;
  items: ImageAuditItem[];
}

export interface A11yViolation {
  id: string;
  elementId?: string;
  elementName?: string;
  rule: string;
  level: "A" | "AA";
  severity: "critical" | "warning";
  message: string;
  recommendation: string;
}

export interface A11yAuditResult {
  complianceScore: number; // 0 - 100
  violations: A11yViolation[];
  passedChecks: string[];
}

/**
 * Traverses an element tree recursively and collects all matching elements
 */
export function flattenElementTree(elements: any[]): any[] {
  const result: any[] = [];
  if (!Array.isArray(elements)) return result;

  for (const el of elements) {
    if (!el) continue;
    result.push(el);
    if (Array.isArray(el.children) && el.children.length > 0) {
      result.push(...flattenElementTree(el.children));
    }
    // Also check nested elements in special widgets (e.g. columns, containers, slides)
    if (Array.isArray(el.elements) && el.elements.length > 0) {
      result.push(...flattenElementTree(el.elements));
    }
  }
  return result;
}

/**
 * Extracts headings from element tree in reading order
 */
export function extractHeadings(elements: any[]): { id: string; level: number; text: string }[] {
  const flat = flattenElementTree(elements);
  const headings: { id: string; level: number; text: string }[] = [];

  for (const el of flat) {
    if (el.type === "heading" || el.type === "animated-headline") {
      const levelStr = String(el.props?.level || el.props?.tag || "h2").toLowerCase();
      const match = levelStr.match(/h([1-6])/);
      const level = match ? parseInt(match[1], 10) : 2;
      const text = el.props?.text || el.content || el.props?.title || "";
      headings.push({ id: el.id, level, text: String(text).trim() });
    }
  }
  return headings;
}

/**
 * Scans elements for all images
 */
export function auditPageImages(elements: any[], pageId?: string): ImageAuditResult {
  const flat = flattenElementTree(elements);
  const items: ImageAuditItem[] = [];
  const genericPatterns = [
    /^image(\.[a-z]{3,4})?$/i,
    /^img(\.[a-z]{3,4})?$/i,
    /^untitled(\.[a-z]{3,4})?$/i,
    /^photo(\.[a-z]{3,4})?$/i,
    /^picture(\.[a-z]{3,4})?$/i,
    /^screenshot(\.[a-z]{3,4})?$/i,
    /^dsc[0-9_-]+(\.[a-z]{3,4})?$/i,
    /^p[0-9_-]+(\.[a-z]{3,4})?$/i,
  ];

  for (const el of flat) {
    if (el.type === "image") {
      const src = el.props?.src || el.props?.url || "";
      const alt = el.props?.alt !== undefined ? String(el.props.alt).trim() : undefined;
      const isDecorative = Boolean(el.props?.ariaHidden || el.props?.isDecorative || el.props?.decorative);
      const elementName = el.name || el.props?.name || "Image";

      let issueType: "missing" | "empty" | "generic" | "valid" = "valid";
      let recommendation = "Image has descriptive alternative text.";

      if (isDecorative) {
        issueType = "valid";
        recommendation = "Marked as decorative (aria-hidden). Screen readers will ignore.";
      } else if (alt === undefined) {
        issueType = "missing";
        recommendation = "Add descriptive alternative text explaining the image's subject or purpose.";
      } else if (alt === "") {
        issueType = "empty";
        recommendation = "Alt attribute is empty. If decorative, mark as decorative; otherwise provide descriptive text.";
      } else if (genericPatterns.some((pattern) => pattern.test(alt))) {
        issueType = "generic";
        recommendation = `The alt text '${alt}' is too generic. Replace it with a meaningful description.`;
      }

      items.push({
        elementId: el.id,
        pageId,
        elementName,
        src,
        alt: alt ?? "",
        isDecorative,
        issueType,
        recommendation,
      });
    } else if (el.type === "gallery" || el.type === "basic-gallery") {
      const galleryImages = Array.isArray(el.props?.images) ? el.props.images : [];
      galleryImages.forEach((img: any, idx: number) => {
        const src = img.url || img.src || "";
        const alt = img.alt !== undefined ? String(img.alt).trim() : undefined;
        let issueType: "missing" | "empty" | "generic" | "valid" = "valid";
        let recommendation = "Gallery image has valid alt text.";

        if (alt === undefined) {
          issueType = "missing";
          recommendation = "Add descriptive alt text for this gallery image.";
        } else if (alt === "") {
          issueType = "empty";
          recommendation = "Alt text is empty for this gallery image.";
        } else if (genericPatterns.some((pattern) => pattern.test(alt))) {
          issueType = "generic";
          recommendation = `The alt text '${alt}' is generic. Replace with specific context.`;
        }

        items.push({
          elementId: `${el.id}-img-${idx}`,
          pageId,
          elementName: `${el.name || "Gallery"} (Image ${idx + 1})`,
          src,
          alt: alt ?? "",
          isDecorative: false,
          issueType,
          recommendation,
        });
      });
    }
  }

  const missing = items.filter((i) => i.issueType === "missing").length;
  const empty = items.filter((i) => i.issueType === "empty").length;
  const generic = items.filter((i) => i.issueType === "generic").length;
  const valid = items.filter((i) => i.issueType === "valid").length;

  return {
    total: items.length,
    valid,
    missing,
    empty,
    generic,
    items,
  };
}

/**
 * Runs programmatic accessibility checks on page elements
 */
export function auditPageAccessibility(page: any, websiteData: any): A11yAuditResult {
  const elements = page.elements || [];
  const flat = flattenElementTree(elements);
  const violations: A11yViolation[] = [];
  const passedChecks: string[] = [];

  // 1. Button Accessible Names (WCAG 4.1.2 Level A)
  let buttonCount = 0;
  let invalidButtons = 0;
  for (const el of flat) {
    if (el.type === "button" || el.type === "cta-button") {
      buttonCount++;
      const text = el.props?.text || el.content || el.props?.label || "";
      const ariaLabel = el.props?.ariaLabel || el.props?.["aria-label"];
      const title = el.props?.title;

      if (!String(text).trim() && !String(ariaLabel || "").trim() && !String(title || "").trim()) {
        invalidButtons++;
        violations.push({
          id: `a11y-btn-${el.id}`,
          elementId: el.id,
          elementName: el.name || "Button",
          rule: "Buttons must have discernible text",
          level: "A",
          severity: "critical",
          message: "Button has no visible text or aria-label attribute.",
          recommendation: "Add descriptive button text or an aria-label for screen reader users.",
        });
      }
    }
  }
  if (buttonCount > 0 && invalidButtons === 0) {
    passedChecks.push(`All ${buttonCount} buttons have discernible accessible names.`);
  }

  // 2. Empty Link Hrefs (WCAG 2.4.4 Level A)
  let linkCount = 0;
  let invalidLinks = 0;
  for (const el of flat) {
    if (el.type === "link" || (el.props?.href !== undefined && el.type !== "button")) {
      linkCount++;
      const href = String(el.props?.href || "").trim();
      const text = String(el.props?.text || el.content || el.props?.ariaLabel || "").trim();

      if (!href || href === "#") {
        invalidLinks++;
        violations.push({
          id: `a11y-link-href-${el.id}`,
          elementId: el.id,
          elementName: el.name || "Link",
          rule: "Links must have a valid destination",
          level: "A",
          severity: "warning",
          message: "Link has empty href or placeholder '#' destination.",
          recommendation: "Point link to a valid URL or convert to an interactive button.",
        });
      }

      if (!text) {
        invalidLinks++;
        violations.push({
          id: `a11y-link-name-${el.id}`,
          elementId: el.id,
          elementName: el.name || "Link",
          rule: "Links must have discernible text",
          level: "A",
          severity: "critical",
          message: "Link contains no visible text or aria-label.",
          recommendation: "Provide meaningful link text describing the destination.",
        });
      }
    }
  }
  if (linkCount > 0 && invalidLinks === 0) {
    passedChecks.push(`All ${linkCount} links have valid destinations and accessible names.`);
  }

  // 3. Form Input Labels (WCAG 1.3.1 / 4.1.2 Level A)
  let inputCount = 0;
  let invalidInputs = 0;
  for (const el of flat) {
    if (["input", "text-input", "textarea", "select"].includes(el.type)) {
      inputCount++;
      const label = el.props?.label || el.props?.ariaLabel || el.props?.["aria-label"];
      if (!label || !String(label).trim()) {
        invalidInputs++;
        violations.push({
          id: `a11y-input-label-${el.id}`,
          elementId: el.id,
          elementName: el.name || "Form Input",
          rule: "Form controls must have associated labels",
          level: "A",
          severity: "critical",
          message: "Input element lacks an associated label or aria-label.",
          recommendation: "Add a visible <label> or specify an aria-label for assistive technologies.",
        });
      }
    }
  }
  if (inputCount > 0 && invalidInputs === 0) {
    passedChecks.push(`All ${inputCount} form controls have associated accessible labels.`);
  }

  // 4. Heading Hierarchy Sequence (WCAG 1.3.1 Level A)
  const headings = extractHeadings(elements);
  let hierarchyIssue = false;
  if (headings.length > 0) {
    for (let i = 0; i < headings.length - 1; i++) {
      const cur = headings[i].level;
      const next = headings[i + 1].level;
      // Heading level jumps by more than 1 (e.g. H1 -> H3 or H2 -> H5)
      if (next > cur + 1) {
        hierarchyIssue = true;
        violations.push({
          id: `a11y-heading-jump-${headings[i + 1].id}`,
          elementId: headings[i + 1].id,
          elementName: `Heading H${next}`,
          rule: "Heading levels should not skip levels",
          level: "AA",
          severity: "warning",
          message: `Heading jumps from H${cur} directly to H${next} without an intervening H${cur + 1}.`,
          recommendation: `Change heading tag from H${next} to H${cur + 1} to maintain logical document outline.`,
        });
      }
    }
    if (!hierarchyIssue) {
      passedChecks.push(`Logical heading hierarchy preserved without skipped levels across ${headings.length} headings.`);
    }
  }

  // 5. Image Alt Text Accessibility Check
  const imageAudit = auditPageImages(elements, page.id);
  const badImages = imageAudit.items.filter((i) => i.issueType === "missing" || i.issueType === "empty");
  if (badImages.length > 0) {
    badImages.forEach((img) => {
      violations.push({
        id: `a11y-img-alt-${img.elementId}`,
        elementId: img.elementId,
        elementName: img.elementName,
        rule: "Non-text content must have text alternatives",
        level: "A",
        severity: "critical",
        message: `Image is missing alternative text.`,
        recommendation: "Add descriptive alt text or mark as decorative if purely ornamental.",
      });
    });
  } else if (imageAudit.total > 0) {
    passedChecks.push(`All ${imageAudit.total} images have valid alternative text or are marked decorative.`);
  }

  // Calculate compliance score
  let penalty = 0;
  for (const v of violations) {
    penalty += v.severity === "critical" ? 15 : 7;
  }
  const complianceScore = Math.max(0, 100 - penalty);

  return {
    complianceScore,
    violations,
    passedChecks,
  };
}

/**
 * Computes full SEO Audit for a single page
 */
export function analyzePageSeo(page: any, websiteData: any): SeoAuditResult {
  const siteSettings = websiteData.siteSettings || {};
  const pSettings = page.pageSettings || {};
  const elements = page.elements || [];

  const rawTitle = pSettings.title || page.title || page.name || "";
  const pageTitle = rawTitle.trim();
  const metaDesc = (pSettings.description || page.metaDescription || siteSettings.metaDescription || "").trim();
  const canonicalUrl = (pSettings.canonicalUrl || "").trim();
  const ogTitle = (pSettings.ogTitle || pageTitle).trim();
  const ogDesc = (pSettings.ogDescription || metaDesc).trim();
  const ogImage = (pSettings.ogImage || siteSettings.ogImage || siteSettings.logo || "").trim();

  const critical: SeoAuditItem[] = [];
  const warnings: SeoAuditItem[] = [];
  const passed: SeoAuditItem[] = [];
  let scorePenalty = 0;

  // 1. Page Title Check
  if (!pageTitle) {
    critical.push({
      id: "seo-title-missing",
      category: "seo",
      severity: "critical",
      title: "Missing Page Title",
      description: "Page has no title configured in page settings.",
      recommendation: "Add a concise, keyword-rich title between 30 and 60 characters.",
      penalty: 25,
    });
    scorePenalty += 25;
  } else if (pageTitle.length < 30) {
    warnings.push({
      id: "seo-title-short",
      category: "seo",
      severity: "warning",
      title: `Page Title Too Short (${pageTitle.length} chars)`,
      description: `Title is shorter than the recommended minimum of 30 characters.`,
      recommendation: "Expand your title with relevant keywords and branding to maximize SERP CTR.",
      penalty: 10,
    });
    scorePenalty += 10;
  } else if (pageTitle.length > 65) {
    warnings.push({
      id: "seo-title-long",
      category: "seo",
      severity: "warning",
      title: `Page Title Too Long (${pageTitle.length} chars)`,
      description: `Title exceeds the recommended limit of 65 characters and may be truncated by Google.`,
      recommendation: "Shorten your title to under 65 characters to prevent truncation in search snippets.",
      penalty: 10,
    });
    scorePenalty += 10;
  } else {
    passed.push({
      id: "seo-title-optimal",
      category: "seo",
      severity: "passed",
      title: `Optimal Page Title (${pageTitle.length} chars)`,
      description: `Title length is in the ideal 30–65 character window.`,
      recommendation: "Keep this descriptive title format.",
      penalty: 0,
    });
  }

  // 2. Meta Description Check
  if (!metaDesc) {
    critical.push({
      id: "seo-desc-missing",
      category: "seo",
      severity: "critical",
      title: "Missing Meta Description",
      description: "No meta description provided. Search engines will generate an arbitrary snippet from page text.",
      recommendation: "Add an engaging summary of this page between 50 and 160 characters.",
      penalty: 20,
    });
    scorePenalty += 20;
  } else if (metaDesc.length < 50) {
    warnings.push({
      id: "seo-desc-short",
      category: "seo",
      severity: "warning",
      title: `Meta Description Too Short (${metaDesc.length} chars)`,
      description: `Description is shorter than the recommended minimum of 50 characters.`,
      recommendation: "Provide more compelling context to encourage user clicks from search results.",
      penalty: 8,
    });
    scorePenalty += 8;
  } else if (metaDesc.length > 165) {
    warnings.push({
      id: "seo-desc-long",
      category: "seo",
      severity: "warning",
      title: `Meta Description Too Long (${metaDesc.length} chars)`,
      description: `Description exceeds the recommended limit of 165 characters and will likely be truncated.`,
      recommendation: "Trim the description to fit under 160 characters.",
      penalty: 8,
    });
    scorePenalty += 8;
  } else {
    passed.push({
      id: "seo-desc-optimal",
      category: "seo",
      severity: "passed",
      title: `Optimal Meta Description (${metaDesc.length} chars)`,
      description: "Meta description length is in the optimal 50–165 character range.",
      recommendation: "Maintain this concise, value-driven description.",
      penalty: 0,
    });
  }

  // 3. Headings & H1 Uniqueness Check
  const headings = extractHeadings(elements);
  const h1Headings = headings.filter((h) => h.level === 1);

  if (h1Headings.length === 0) {
    critical.push({
      id: "seo-h1-missing",
      category: "seo",
      severity: "critical",
      title: "Missing H1 Heading",
      description: "Every page must have exactly one H1 heading representing its primary topic.",
      recommendation: "Add an H1 heading or change the main section title tag to H1.",
      penalty: 20,
    });
    scorePenalty += 20;
  } else if (h1Headings.length > 1) {
    warnings.push({
      id: "seo-h1-multiple",
      category: "seo",
      severity: "warning",
      title: `Multiple H1 Headings Detected (${h1Headings.length})`,
      description: "Having more than one H1 heading dilutes keyword relevance and confuses search crawlers.",
      recommendation: "Ensure only the main hero title uses H1; use H2/H3 for subsequent sub-sections.",
      elementId: h1Headings[1].id,
      penalty: 10,
    });
    scorePenalty += 10;
  } else {
    passed.push({
      id: "seo-h1-single",
      category: "seo",
      severity: "passed",
      title: "Single H1 Heading Present",
      description: `Found 1 primary H1 heading: "${h1Headings[0].text}".`,
      recommendation: "Maintains optimal semantic heading structure.",
      penalty: 0,
    });
  }

  // 4. Heading Sequence Hierarchy Check
  let headingSkipFound = false;
  for (let i = 0; i < headings.length - 1; i++) {
    if (headings[i + 1].level > headings[i].level + 1) {
      headingSkipFound = true;
      warnings.push({
        id: `seo-heading-skip-${headings[i + 1].id}`,
        category: "seo",
        severity: "warning",
        title: "Heading Hierarchy Skipped",
        description: `Heading jumps from H${headings[i].level} directly to H${headings[i + 1].level}.`,
        recommendation: `Restructure to sequential heading levels (H${headings[i].level + 1}).`,
        elementId: headings[i + 1].id,
        penalty: 8,
      });
      scorePenalty += 8;
      break;
    }
  }
  if (!headingSkipFound && headings.length > 1) {
    passed.push({
      id: "seo-heading-sequence",
      category: "seo",
      severity: "passed",
      title: "Heading Hierarchy Sequence",
      description: "Headings follow a logical sequential order (H1 -> H2 -> H3).",
      recommendation: "Keep heading hierarchy structured.",
      penalty: 0,
    });
  }

  // 5. Canonical URL Validation
  if (!canonicalUrl) {
    warnings.push({
      id: "seo-canonical-missing",
      category: "seo",
      severity: "warning",
      title: "Canonical URL Not Specified",
      description: "Without a canonical tag, search engines may index duplicate URL variations (http vs https, trailing slashes).",
      recommendation: "Set a self-referencing canonical URL in Page Settings > SEO.",
      penalty: 5,
    });
    scorePenalty += 5;
  } else {
    try {
      new URL(canonicalUrl);
      passed.push({
        id: "seo-canonical-valid",
        category: "seo",
        severity: "passed",
        title: "Canonical URL Configured",
        description: `Canonical link points to ${canonicalUrl}.`,
        recommendation: "Prevents duplicate content penalties.",
        penalty: 0,
      });
    } catch {
      critical.push({
        id: "seo-canonical-invalid",
        category: "seo",
        severity: "critical",
        title: "Invalid Canonical URL",
        description: `The URL '${canonicalUrl}' is not a valid absolute URL.`,
        recommendation: "Provide a valid absolute URL starting with https://.",
        penalty: 15,
      });
      scorePenalty += 15;
    }
  }

  // 6. Social Graph / OpenGraph Check
  if (!ogTitle || !ogDesc || !ogImage) {
    const missingItems: string[] = [];
    if (!ogTitle) missingItems.push("og:title");
    if (!ogDesc) missingItems.push("og:description");
    if (!ogImage) missingItems.push("og:image");

    warnings.push({
      id: "seo-og-incomplete",
      category: "social",
      severity: "warning",
      title: "Incomplete Social Graph (OpenGraph & Twitter)",
      description: `Missing social sharing metadata: ${missingItems.join(", ")}.`,
      recommendation: "Configure social title, description, and share image for rich link previews on social networks.",
      penalty: 6,
    });
    scorePenalty += 6;
  } else {
    passed.push({
      id: "seo-og-complete",
      category: "social",
      severity: "passed",
      title: "Social Graph Metadata Configured",
      description: "OpenGraph and Twitter card metadata are complete with title, description, and share image.",
      recommendation: "Social cards will display rich preview snippets when shared.",
      penalty: 0,
    });
  }

  // 7. Robots Indexing Check
  if (pSettings.noindex) {
    warnings.push({
      id: "seo-robots-noindex",
      category: "seo",
      severity: "warning",
      title: "Search Indexing Disabled (noindex)",
      description: "The 'noindex' directive is active. Google and Bing will NOT index this page in search results.",
      recommendation: "If this page should be publicly discoverable, uncheck 'Prevent search engine indexing' in Page Settings.",
      penalty: 10,
    });
    scorePenalty += 10;
  } else {
    passed.push({
      id: "seo-robots-indexable",
      category: "seo",
      severity: "passed",
      title: "Search Indexing Enabled",
      description: "Page is configured to allow search engines to crawl and index content.",
      recommendation: "Search engines will index this page once published.",
      penalty: 0,
    });
  }

  // 8. Image Alt Text Integration
  const imageAudit = auditPageImages(elements, page.id);
  const badImages = imageAudit.items.filter((i) => i.issueType !== "valid");
  if (badImages.length > 0) {
    warnings.push({
      id: "seo-images-alt-issues",
      category: "images",
      severity: "warning",
      title: `${badImages.length} Image(s) With Alt Text Issues`,
      description: `Found ${imageAudit.missing} missing, ${imageAudit.empty} empty, and ${imageAudit.generic} generic alt descriptions.`,
      recommendation: "Open the Alt Text Audit tab to fix image descriptions in place.",
      penalty: Math.min(15, badImages.length * 4),
    });
    scorePenalty += Math.min(15, badImages.length * 4);
  } else if (imageAudit.total > 0) {
    passed.push({
      id: "seo-images-alt-passed",
      category: "images",
      severity: "passed",
      title: "All Images Have Descriptive Alt Text",
      description: `Verified ${imageAudit.total} image(s) on this page.`,
      recommendation: "Enhances image search indexing and accessibility.",
      penalty: 0,
    });
  }

  // Calculate final score
  const finalScore = Math.max(0, Math.min(100, 100 - scorePenalty));
  let grade: "A" | "B" | "C" | "D" | "F" = "F";
  if (finalScore >= 90) grade = "A";
  else if (finalScore >= 80) grade = "B";
  else if (finalScore >= 70) grade = "C";
  else if (finalScore >= 60) grade = "D";

  // Stats calculation
  const flat = flattenElementTree(elements);
  const links = flat.filter((el) => el.type === "link" || el.props?.href !== undefined);
  let totalWordCount = 0;
  for (const el of flat) {
    const text = el.props?.text || el.content || el.props?.description || "";
    if (typeof text === "string" && text.trim()) {
      totalWordCount += text.trim().split(/\s+/).length;
    }
  }

  return {
    score: finalScore,
    grade,
    critical,
    warnings,
    passed,
    stats: {
      headingCount: headings.length,
      wordCount: totalWordCount,
      imageCount: imageAudit.total,
      linkCount: links.length,
      h1Count: h1Headings.length,
    },
  };
}

/**
 * Escapes JSON-LD strings against script breakout attacks (anti-XSS)
 */
export function escapeJsonLd(obj: any): string {
  const jsonStr = JSON.stringify(obj, null, 2);
  // Neutralize closing tags and HTML entities
  return jsonStr
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

/**
 * Generates Schema.org structured data JSON-LD objects for supported schema types
 */
export function generateStructuredData(
  type: string,
  page: any,
  websiteData: any,
  customFields?: Record<string, any>
): Record<string, any> {
  const siteSettings = websiteData.siteSettings || {};
  const pSettings = page.pageSettings || {};
  const siteName = siteSettings.siteName || websiteData.name || "ForgeStudio";
  const siteUrl = siteSettings.canonicalUrl || websiteData.domain || "https://example.com";
  const pageTitle = pSettings.title || page.title || page.name || siteName;
  const pageDescription = pSettings.description || page.metaDescription || siteSettings.metaDescription || "";
  const pageUrl = pSettings.canonicalUrl || (siteUrl.replace(/\/$/, "") + (page.slug ? `/${page.slug}` : ""));
  const logoUrl = siteSettings.logo || siteSettings.favicon || "";

  switch (type.toLowerCase()) {
    case "website":
      return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: siteName,
        url: siteUrl,
        description: siteSettings.metaDescription || pageDescription,
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl.replace(/\/$/, "")}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
        ...customFields,
      };

    case "webpage":
      return {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: pageTitle,
        description: pageDescription,
        url: pageUrl,
        isPartOf: {
          "@type": "WebSite",
          name: siteName,
          url: siteUrl,
        },
        ...customFields,
      };

    case "organization":
      return {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: siteName,
        url: siteUrl,
        logo: logoUrl || undefined,
        sameAs: siteSettings.socialLinks ? Object.values(siteSettings.socialLinks).filter(Boolean) : undefined,
        ...customFields,
      };

    case "article":
      return {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: pageTitle,
        description: pageDescription,
        image: pSettings.ogImage || siteSettings.ogImage || undefined,
        datePublished: page.createdAt || new Date().toISOString(),
        dateModified: page.updatedAt || new Date().toISOString(),
        author: {
          "@type": "Person",
          name: customFields?.authorName || siteSettings.author || siteName,
        },
        publisher: {
          "@type": "Organization",
          name: siteName,
          logo: logoUrl ? { "@type": "ImageObject", url: logoUrl } : undefined,
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": pageUrl,
        },
        ...customFields,
      };

    case "localbusiness":
      return {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: customFields?.businessName || siteName,
        image: customFields?.businessImage || pSettings.ogImage || logoUrl || undefined,
        telephone: customFields?.telephone || siteSettings.phone || "",
        email: customFields?.email || siteSettings.email || "",
        address: {
          "@type": "PostalAddress",
          streetAddress: customFields?.streetAddress || "",
          addressLocality: customFields?.locality || "",
          addressRegion: customFields?.region || "",
          postalCode: customFields?.postalCode || "",
          addressCountry: customFields?.country || "US",
        },
        url: siteUrl,
        ...customFields,
      };

    case "breadcrumblist":
      const allPages = Array.isArray(websiteData.pages) ? websiteData.pages : [];
      const itemListElement = [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: siteUrl,
        },
      ];
      if (!page.isHome) {
        itemListElement.push({
          "@type": "ListItem",
          position: 2,
          name: pageTitle,
          item: pageUrl,
        });
      }
      return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement,
        ...customFields,
      };

    case "faqpage":
      const faqItems = Array.isArray(customFields?.faqs) ? customFields.faqs : [];
      return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqItems.map((faq: { question: string; answer: string }) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      };

    default:
      return {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: pageTitle,
        description: pageDescription,
        url: pageUrl,
        ...customFields,
      };
  }
}
