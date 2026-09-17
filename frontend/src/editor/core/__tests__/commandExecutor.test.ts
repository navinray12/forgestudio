import { describe, it, expect } from "vitest";
import { executeCommand } from "../commands/commandExecutor";
import type { ForgeEditorDocument } from "../types";

const mockDoc: ForgeEditorDocument = {
  version: 1,
  homePageId: "home",
  pages: [],
  siteSettings: { siteName: "Test Site" },
  globalStyles: {
    colors: {
      primary: "#000000",
      secondary: "#ffffff",
      accent: "#0066cc",
      background: "#ffffff",
      text: "#333333",
    },
    typography: {
      fontFamily: "Inter",
      headingFontFamily: "Inter",
      baseFontSize: "16px",
      h1Size: "32px",
      h2Size: "24px",
      h3Size: "20px",
      lineHeight: "1.5",
    },
    buttonStyles: {
      borderRadius: "4px",
      padding: "8px 16px",
      backgroundColor: "#000000",
      textColor: "#ffffff",
    },
  },
  siteParts: {},
  navigation: [],
  publishing: { status: "DRAFT" },
  deployment: { provider: "none" },
  elements: [
    {
      id: "el_container",
      type: "container",
      content: "",
      children: [
        {
          id: "el_heading",
          type: "heading",
          content: "Initial Title",
          styles: { color: "#333333" },
        },
        {
          id: "el_button",
          type: "button",
          content: "Click me",
        },
      ],
    },
  ],
};

describe("commandExecutor Pure Document Transformations", () => {
  it("UPDATE_PROPS immutably updates target element props", () => {
    const updated = executeCommand(mockDoc, {
      type: "UPDATE_PROPS",
      elementId: "el_heading",
      props: { content: "Updated Title" },
    });

    expect(updated.elements[0].children?.[0].content).toBe("Updated Title");
    expect(mockDoc.elements[0].children?.[0].content).toBe("Initial Title"); // Original unchanged
  });

  it("UPDATE_STYLES immutably updates target element styles", () => {
    const updated = executeCommand(mockDoc, {
      type: "UPDATE_STYLES",
      elementId: "el_heading",
      styles: { color: "#ff0000" },
    });

    expect(updated.elements[0].children?.[0].styles?.color).toBe("#ff0000");
    expect(mockDoc.elements[0].children?.[0].styles?.color).toBe("#333333");
  });

  it("ADD_ELEMENT inserts new element into root or container immutably preserving element ID", () => {
    const newEl = { id: "el_text_unique_123", type: "text" as const, content: "Paragraph text" };
    const updated = executeCommand(mockDoc, {
      type: "ADD_ELEMENT",
      targetId: "el_container",
      element: newEl,
    });

    expect(updated.elements[0].children?.length).toBe(3);
    expect(updated.elements[0].children?.[2].id).toBe("el_text_unique_123");
    expect(mockDoc.elements[0].children?.length).toBe(2); // Original unchanged
  });

  it("ADD_ELEMENT inserts complex reusable component subtree immutably", () => {
    const componentSubtree = {
      id: "comp_root_1",
      type: "container" as const,
      content: "",
      children: [
        { id: "comp_child_1", type: "heading" as const, content: "Component Title" },
        { id: "comp_child_2", type: "button" as const, content: "Component CTA" },
      ],
    };

    const updated = executeCommand(mockDoc, {
      type: "ADD_ELEMENT",
      targetId: null,
      element: componentSubtree,
    });

    expect(updated.elements.length).toBe(2);
    expect(updated.elements[1].id).toBe("comp_root_1");
    expect(updated.elements[1].children?.length).toBe(2);
    expect(mockDoc.elements.length).toBe(1); // Original unchanged
  });

  it("DUPLICATE_ELEMENT clones target element and descendants with fresh unique IDs", () => {
    const updated = executeCommand(mockDoc, {
      type: "DUPLICATE_ELEMENT",
      elementId: "el_container",
    });

    expect(updated.elements.length).toBe(2);
    expect(updated.elements[0].id).toBe("el_container");
    expect(updated.elements[1].id).not.toBe("el_container");
    expect(updated.elements[1].children?.[0].id).not.toBe("el_heading");
    expect(mockDoc.elements.length).toBe(1); // Original unchanged
  });

  it("MOVE_ELEMENT reorders elements immutably preserving element IDs", () => {
    const updated = executeCommand(mockDoc, {
      type: "MOVE_ELEMENT",
      sourceId: "el_button",
      targetId: "el_heading",
      position: "before",
    });

    expect(updated.elements[0].children?.[0].id).toBe("el_button");
    expect(updated.elements[0].children?.[1].id).toBe("el_heading");
    expect(mockDoc.elements[0].children?.[0].id).toBe("el_heading"); // Original unchanged
  });

  it("REMOVE_ELEMENT removes element immutably", () => {
    const updated = executeCommand(mockDoc, {
      type: "REMOVE_ELEMENT",
      elementId: "el_heading",
    });

    expect(updated.elements[0].children?.length).toBe(1);
    expect(mockDoc.elements[0].children?.length).toBe(2);
  });
});
