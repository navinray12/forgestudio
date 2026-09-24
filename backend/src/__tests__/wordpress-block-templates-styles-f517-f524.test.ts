import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  sanitizeCssValue,
  sanitizeCssSelector,
  compileStyleControlsToCssProperties,
  GlobalStyleService,
} from "../services/blocks/globalStyle.service.js";

import { BlockTemplateService } from "../services/blocks/blockTemplate.service.js";
import { convertCssVariableToGutenbergPreset, resolvePresetToCssVariable } from "../../frontend/src/features/blocks/engine/designTokenBridge.js";
import { compileStyleControlsToReactStyles, buildGutenbergStyleObject } from "../../frontend/src/features/blocks/engine/blockStyleEngine.js";
import { serializeBlockToGutenbergMarkup } from "../../frontend/src/features/blocks/engine/gutenbergBridge.js";
import type { BlockNode } from "../../frontend/src/features/blocks/types/block.types.js";

describe("F-517 - F-524 WordPress Block Templates, Template Parts & Global Styles Subsystem", () => {
  // 1. Security & CSS Sanitization Tests
  it("should strictly sanitize CSS values to block XSS and injection vectors", () => {
    assert.equal(sanitizeCssValue("javascript:alert(1)"), "");
    assert.equal(sanitizeCssValue("expression(alert(1))"), "");
    assert.equal(sanitizeCssValue("-moz-binding: url('http://evil.com')"), "");
    assert.equal(sanitizeCssValue("@import url('http://evil.com/styles.css')"), "");
    assert.equal(sanitizeCssValue("red; background: url(x)"), "red background: url(x)".replace(/[;]/g, ""));
    assert.equal(sanitizeCssValue("16px"), "16px");
    assert.equal(sanitizeCssValue("#3699ff"), "#3699ff");
  });

  it("should sanitize CSS selector strings safely", () => {
    assert.equal(sanitizeCssSelector(".my-class > div"), ".my-class > div");
    assert.equal(sanitizeCssSelector("body <script>alert(1)</script>"), "body scriptalert1script");
  });

  // 2. Block Template Locking Policy Tests (F-517)
  it("should correctly enforce template lock action permissions", () => {
    // Lock: 'all'
    const lockAll = BlockTemplateService.validateTemplateLockAction("all", "insert");
    assert.equal(lockAll.allowed, false);

    // Lock: 'insert'
    const lockInsert1 = BlockTemplateService.validateTemplateLockAction("insert", "insert");
    assert.equal(lockInsert1.allowed, false);
    const lockInsert2 = BlockTemplateService.validateTemplateLockAction("insert", "editContent");
    assert.equal(lockInsert2.allowed, true);

    // Lock: 'contentOnly'
    const lockContent1 = BlockTemplateService.validateTemplateLockAction("contentOnly", "insert");
    assert.equal(lockContent1.allowed, false);
    const lockContent2 = BlockTemplateService.validateTemplateLockAction("contentOnly", "editContent");
    assert.equal(lockContent2.allowed, true);

    // Lock: false / undefined
    const unlocked = BlockTemplateService.validateTemplateLockAction(false, "insert");
    assert.equal(unlocked.allowed, true);
  });

  // 3. Design Token Bridge Tests (F-519)
  it("should convert between Gutenberg preset format and ForgeStudio CSS variables", () => {
    assert.equal(resolvePresetToCssVariable("var:preset|color|primary"), "var(--fs-color-primary)");
    assert.equal(resolvePresetToCssVariable("--fs-color-secondary"), "var(--fs-color-secondary)");
    assert.equal(resolvePresetToCssVariable("#3699ff"), "#3699ff");

    assert.equal(convertCssVariableToGutenbergPreset("var(--fs-color-primary)"), "var:preset|color|primary");
    assert.equal(convertCssVariableToGutenbergPreset("#3699ff"), "#3699ff");
  });

  // 4. Global Styles Compilation Tests (F-519)
  it("should compile GlobalStyleData into root CSS custom variables and block defaults", () => {
    const globalStyles = {
      colors: {
        primary: "#3699ff",
        secondary: "#2b2b40",
      },
      typography: {
        fontFamily: "Inter, sans-serif",
        fontSize: "16px",
      },
      blockDefaults: {
        "core/paragraph": {
          color: { text: "#ffffff" },
          typography: { fontSize: "18px" },
        },
      },
    };

    const css = GlobalStyleService.compileGlobalStylesToCss(globalStyles);
    assert.ok(css.includes("--fs-color-primary: #3699ff;"));
    assert.ok(css.includes("--fs-color-secondary: #2b2b40;"));
    assert.ok(css.includes("--fs-typography-font-family: Inter, sans-serif;"));
    assert.ok(css.includes(".wp-block-paragraph {"));
    assert.ok(css.includes("color: #ffffff;"));
    assert.ok(css.includes("font-size: 18px;"));
  });

  // 5. Responsive Style Controls & 4-Way Serialization Contract Tests (F-520 - F-524)
  it("should compile Typography, Color, Spacing, Layout, Dimensions to React styles for Editor preview", () => {
    const styleControls = {
      typography: { fontFamily: "Roboto, sans-serif", fontSize: "20px", fontWeight: "700" },
      color: { text: "#ffffff", background: "var(--fs-color-primary)" },
      spacing: { padding: { top: "16px", bottom: "16px" }, gap: "20px" },
      layout: { type: "flex" as const, orientation: "vertical" as const, justifyContent: "center" },
      dimensions: { width: "100%", minHeight: "300px" },
    };

    const reactStyles = compileStyleControlsToReactStyles(styleControls);
    assert.equal(reactStyles.fontFamily, "Roboto, sans-serif");
    assert.equal(reactStyles.fontSize, "20px");
    assert.equal(reactStyles.fontWeight, "700");
    assert.equal(reactStyles.color, "#ffffff");
    assert.equal(reactStyles.backgroundColor, "var(--fs-color-primary)");
    assert.equal(reactStyles.paddingTop, "16px");
    assert.equal(reactStyles.paddingBottom, "16px");
    assert.equal(reactStyles.gap, "20px");
    assert.equal(reactStyles.display, "flex");
    assert.equal(reactStyles.flexDirection, "column");
    assert.equal(reactStyles.justifyContent, "center");
    assert.equal(reactStyles.width, "100%");
    assert.equal(reactStyles.minHeight, "300px");
  });

  it("should serialize style and layout controls into valid Gutenberg block comment markup", () => {
    const block: BlockNode = {
      id: "block-test-1",
      name: "core/paragraph",
      attributes: { content: "Styled Paragraph" },
      style: {
        color: { text: "#ffffff", background: "var(--fs-color-primary)" },
        typography: { fontSize: "18px", fontFamily: "Inter, sans-serif" },
        spacing: { padding: { top: "10px" } },
      },
    };

    const markup = serializeBlockToGutenbergMarkup(block);
    assert.ok(markup.startsWith("<!-- wp:paragraph"));
    assert.ok(markup.includes('"style":{'));
    assert.ok(markup.includes('"fontSize":"18px"'));
    assert.ok(markup.includes("<p>Styled Paragraph</p>"));
    assert.ok(markup.endsWith("<!-- /wp:paragraph -->"));
  });
});
