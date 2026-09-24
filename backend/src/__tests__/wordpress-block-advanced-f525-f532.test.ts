import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  validateAndCleanCssClasses,
  normalizeHtmlAnchor,
  validateUniqueAnchor,
  sanitizeHtmlAttributes,
} from "../../frontend/src/features/blocks/engine/attributeSanitizer.js";

import { compileStyleControlsToReactStyles, buildGutenbergStyleObject } from "../../frontend/src/features/blocks/engine/blockStyleEngine.js";
import { serializeBlockToGutenbergMarkup } from "../../frontend/src/features/blocks/engine/gutenbergBridge.js";
import { compileStyleControlsToCssProperties } from "../services/blocks/globalStyle.service.js";
import type { BlockNode } from "../../frontend/src/features/blocks/types/block.types.js";

describe("F-525 - F-532 WordPress Block Advanced Design Controls, Security & Distraction-Free Mode", () => {
  // 1. F-525 Border Controls
  it("should compile border width, style, color, and per-side radius into React & CSS properties", () => {
    const styleObj = {
      border: {
        width: "2px",
        style: "solid",
        color: "#3699ff",
        radius: "8px",
        top: { width: "4px", style: "dashed", color: "#ff0000" },
      },
    };

    const reactStyles = compileStyleControlsToReactStyles(styleObj as any);
    assert.equal(reactStyles.borderWidth, "2px");
    assert.equal(reactStyles.borderStyle, "solid");
    assert.equal(reactStyles.borderColor, "#3699ff");
    assert.equal(reactStyles.borderRadius, "8px");
    assert.equal(reactStyles.borderTopWidth, "4px");
    assert.equal(reactStyles.borderTopStyle, "dashed");
    assert.equal(reactStyles.borderTopColor, "#ff0000");

    const cssProps = compileStyleControlsToCssProperties(styleObj as any);
    assert.equal(cssProps["border-width"], "2px");
    assert.equal(cssProps["border-style"], "solid");
    assert.equal(cssProps["border-color"], "#3699ff");
    assert.equal(cssProps["border-radius"], "8px");
  });

  // 2. F-526 Shadow Controls
  it("should compile single and multiple box shadow items correctly", () => {
    const singleShadow = {
      shadow: {
        x: "0px",
        y: "4px",
        blur: "12px",
        spread: "0px",
        color: "rgba(0,0,0,0.2)",
        inset: true,
      },
    };

    const reactSingle = compileStyleControlsToReactStyles(singleShadow as any);
    assert.equal(reactSingle.boxShadow, "inset 0px 4px 12px 0px rgba(0,0,0,0.2)");

    const multipleShadows = {
      shadow: {
        multiple: [
          { x: "0px", y: "2px", blur: "4px", spread: "0px", color: "rgba(0,0,0,0.1)", inset: false },
          { x: "0px", y: "8px", blur: "16px", spread: "0px", color: "rgba(0,0,0,0.15)", inset: true },
        ],
      },
    };

    const reactMultiple = compileStyleControlsToReactStyles(multipleShadows as any);
    assert.equal(
      reactMultiple.boxShadow,
      "0px 2px 4px 0px rgba(0,0,0,0.1), inset 0px 8px 16px 0px rgba(0,0,0,0.15)"
    );
  });

  // 3. F-527 Background Controls
  it("should compile background image, gradient, position, and repeat settings", () => {
    const bgStyle = {
      background: {
        color: "#151521",
        gradient: "linear-gradient(135deg, #3699ff 0%, #2b2b40 100%)",
        image: "https://example.com/hero.jpg",
        size: "cover",
        repeat: "no-repeat",
        position: "center center",
      },
    };

    const reactStyles = compileStyleControlsToReactStyles(bgStyle as any);
    assert.equal(reactStyles.backgroundColor, "#151521");
    assert.equal(reactStyles.backgroundImage, 'url("https://example.com/hero.jpg")');
    assert.equal(reactStyles.backgroundSize, "cover");
    assert.equal(reactStyles.backgroundRepeat, "no-repeat");
    assert.equal(reactStyles.backgroundPosition, "center center");
  });

  // 4. F-528 Responsive Image Handling
  it("should generate responsive HTML markup with srcset, sizes, and lazy loading for core/image blocks", () => {
    const imageBlock: BlockNode = {
      id: "img-1",
      name: "core/image",
      attributes: {
        url: "https://example.com/hero-large.jpg",
        alt: "Hero Banner",
        srcset: "https://example.com/hero-300.jpg 300w, https://example.com/hero-768.jpg 768w",
        sizes: "(max-width: 768px) 100vw, 50vw",
        loading: "lazy",
      },
    };

    const markup = serializeBlockToGutenbergMarkup(imageBlock);
    assert.ok(markup.includes('<!-- wp:image'));
    assert.ok(markup.includes('<figure class="wp-block-image">'));
    assert.ok(markup.includes('src="https://example.com/hero-large.jpg"'));
    assert.ok(markup.includes('alt="Hero Banner"'));
    assert.ok(markup.includes('srcset="https://example.com/hero-300.jpg 300w, https://example.com/hero-768.jpg 768w"'));
    assert.ok(markup.includes('sizes="(max-width: 768px) 100vw, 50vw"'));
    assert.ok(markup.includes('loading="lazy"'));
  });

  // 5. F-529 Custom CSS Classes Validation
  it("should validate and clean CSS classes, stripping illegal injection symbols", () => {
    const result1 = validateAndCleanCssClasses("my-card  highlight-section ");
    assert.equal(result1.valid, true);
    assert.equal(result1.cleaned, "my-card highlight-section");

    const result2 = validateAndCleanCssClasses('my-card <script>alert(1)</script> style="color:red"');
    assert.equal(result2.valid, false);
    assert.ok(result2.errors.length > 0);
    assert.equal(result2.cleaned, "my-card scriptalert1script stylecolorred");
  });

  // 6. F-530 HTML Anchor Normalization & Duplicate Detection
  it("should normalize HTML anchors into clean slugs and detect duplicates across block tree", () => {
    assert.equal(normalizeHtmlAnchor("#My Awesome Section!!"), "my-awesome-section");

    const blocks: BlockNode[] = [
      { id: "b1", name: "core/paragraph", anchor: "hero-section" },
      { id: "b2", name: "core/heading", anchor: "about-us" },
    ];

    const uniqueCheck = validateUniqueAnchor("contact-us", "b3", blocks);
    assert.equal(uniqueCheck.unique, true);

    const dupCheck = validateUniqueAnchor("hero-section", "b3", blocks);
    assert.equal(dupCheck.unique, false);
    assert.equal(dupCheck.duplicateBlockId, "b1");
  });

  // 7. F-531 Safe HTML Attributes Whitelist & XSS Protection
  it("should allow safe attributes (aria-*, data-*, role, title) and strictly block event handlers and JS URLs", () => {
    const rawAttrs = [
      { name: "aria-label", value: "Navigation Region" },
      { name: "data-analytics-id", value: "btn_123" },
      { name: "role", value: "banner" },
      { name: "onclick", value: "alert(1)" }, // Blocked!
      { name: "href", value: "javascript:alert(1)" }, // Blocked!
      { name: "onload", value: "doEvil()" }, // Blocked!
    ];

    const sanitized = sanitizeHtmlAttributes(rawAttrs);
    assert.equal(sanitized.length, 3);
    assert.equal(sanitized[0].name, "aria-label");
    assert.equal(sanitized[1].name, "data-analytics-id");
    assert.equal(sanitized[2].name, "role");
  });
});
