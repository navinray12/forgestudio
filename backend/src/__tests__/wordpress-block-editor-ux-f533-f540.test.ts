import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { EditorPreferencesService, DEFAULT_PREFERENCES } from "../../frontend/src/features/blocks/services/editorPreferencesService.js";
import { ShortcutRegistry, DEFAULT_COMMANDS } from "../../frontend/src/features/blocks/services/shortcutRegistry.js";
import { DocumentOutlineService } from "../../frontend/src/features/blocks/services/documentOutlineService.js";
import { DragDropEngine } from "../../frontend/src/features/blocks/engine/dragDropEngine.js";
import { FitTextEngine } from "../../frontend/src/features/blocks/engine/fitTextEngine.js";
import type { BlockNode } from "../../frontend/src/features/blocks/types/block.types.js";

describe("F-533 - F-540 WordPress Block Editor UX & Advanced Features", () => {
  // 1. F-536 Editor Preferences Persistence
  it("should load default editor preferences and merge custom overrides correctly", () => {
    const prefs = EditorPreferencesService.getPreferences("test-ws");
    assert.equal(prefs.spotlightMode, false);
    assert.equal(prefs.fullscreen, false);
    assert.equal(prefs.topToolbarMode, false);
    assert.equal(prefs.keyboardShortcuts["toggle-spotlight"], "Ctrl+Alt+S");

    const updated = {
      ...prefs,
      spotlightMode: true,
      topToolbarMode: true,
    };
    EditorPreferencesService.savePreferences(updated, "test-ws");
    const loaded = EditorPreferencesService.getPreferences("test-ws");
    assert.equal(loaded.spotlightMode, true);
    assert.equal(loaded.topToolbarMode, true);
  });

  // 2. F-537 Shortcut Registry & Key Combo Matching
  it("should parse keyboard events and accurately match command keybindings", () => {
    const mockEvent = {
      ctrlKey: true,
      altKey: true,
      shiftKey: false,
      key: "s",
    } as any;

    const parsed = ShortcutRegistry.parseEventToKeyCombo(mockEvent);
    assert.equal(parsed, "Ctrl+Alt+S");

    const match = ShortcutRegistry.isMatchingCombo(mockEvent, "Ctrl+Alt+S");
    assert.equal(match, true);

    const matchCaseInsensitive = ShortcutRegistry.isMatchingCombo(mockEvent, "ctrl+alt+s");
    assert.equal(matchCaseInsensitive, true);

    const noMatch = ShortcutRegistry.isMatchingCombo(mockEvent, "Ctrl+Shift+F");
    assert.equal(noMatch, false);
  });

  // 3. F-538 Document Outline & Heading Hierarchy Analysis
  it("should generate outline tree, calculate stats, and detect missing H1 & skipped heading levels", () => {
    const blocks: BlockNode[] = [
      {
        id: "b-h2",
        name: "core/heading",
        attributes: { level: 2, content: "First Section Header" },
      },
      {
        id: "b-p1",
        name: "core/paragraph",
        attributes: { content: "This is a simple paragraph text with words." },
      },
      {
        id: "b-h4",
        name: "core/heading",
        attributes: { level: 4, content: "Sub Header Skipped Level" }, // Skipped level H2 -> H4!
      },
      {
        id: "b-img",
        name: "core/image",
        attributes: { url: "https://example.com/banner.jpg" }, // Missing alt text!
      },
    ];

    const outline = DocumentOutlineService.generateDocumentOutline(blocks);
    assert.equal(outline.length, 2); // 2 headings
    assert.equal(outline[0].headingLevel, 2);
    assert.equal(outline[0].text, "First Section Header");

    const stats = DocumentOutlineService.calculateDocumentStats(blocks);
    assert.equal(stats.blocks, 4);
    assert.equal(stats.headings, 2);
    assert.equal(stats.paragraphs, 1);
    assert.equal(stats.images, 1);
    assert.ok(stats.words > 5);

    const issues = DocumentOutlineService.validateHeadingHierarchy(blocks);
    assert.ok(issues.length >= 3);
    assert.ok(issues.some((i) => i.type === "missing-h1"));
    assert.ok(issues.some((i) => i.type === "skipped-level"));
    assert.ok(issues.some((i) => i.type === "missing-alt"));
  });

  // 4. F-539 Visual Drag & Drop Circular Nesting Check
  it("should prevent circular block nesting when dragging parent into descendant", () => {
    const blocks: BlockNode[] = [
      {
        id: "parent-1",
        name: "core/group",
        innerBlocks: [
          {
            id: "child-1",
            name: "core/column",
            innerBlocks: [
              {
                id: "grandchild-1",
                name: "core/paragraph",
              },
            ],
          },
        ],
      },
    ];

    // Attempting to drop parent-1 into grandchild-1 MUST be rejected!
    const isChild = DragDropEngine.isChildOf("parent-1", "grandchild-1", blocks);
    assert.equal(isChild, true);

    const validation = DragDropEngine.validateDropTarget("parent-1", "grandchild-1", "inside", blocks);
    assert.equal(validation.allowed, false);
    assert.ok(validation.reason?.includes("circular nesting"));

    // Dropping an independent block should be allowed
    const validCheck = DragDropEngine.validateDropTarget("other-block", "child-1", "inside", blocks);
    assert.equal(validCheck.allowed, true);
  });

  // 5. F-540 Fit Text to Container
  it("should calculate responsive font sizes within min and max constraints", () => {
    // 500px width container, 10 characters -> raw size 500 / (10 * 0.6) = 83.3px
    const fontSize1 = FitTextEngine.calculateFontSize(500, 10, { minFontSize: 12, maxFontSize: 120 });
    assert.equal(fontSize1, 83.3);

    // Extreme large text length should hit minFontSize (12px)
    const minSize = FitTextEngine.calculateFontSize(100, 500, { minFontSize: 14, maxFontSize: 100 });
    assert.equal(minSize, 14);

    // Small text length on massive container should hit maxFontSize (120px)
    const maxSize = FitTextEngine.calculateFontSize(2000, 2, { minFontSize: 12, maxFontSize: 100 });
    assert.equal(maxSize, 100);
  });
});
