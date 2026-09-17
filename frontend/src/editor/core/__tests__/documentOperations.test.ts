import { describe, it, expect } from "vitest";
import type { ForgeEditorDocument, EditorElement } from "../types";
import { getElementById, getActivePage, getPageElements } from "../selectors/documentSelectors";
import { findElement, findParent, containsElement, getElementIndex } from "../document/elementTree";
import {
  updateElementProps,
  updateElementStyles,
  addElement,
  removeElement,
  duplicateElement,
  moveElement,
} from "../document/documentOperations";
import { executeCommand } from "../commands/commandExecutor";

function createTestDocument(): ForgeEditorDocument {
  return {
    version: 1,
    homePageId: "home",
    pages: [
      {
        id: "home",
        name: "Home",
        slug: "/",
        isHome: true,
        elements: [
          {
            id: "heading_1",
            type: "heading",
            content: "Welcome to ForgeStudio",
            styles: { color: "#000000", fontSize: "32px" },
          },
          {
            id: "container_1",
            type: "container",
            content: "",
            children: [
              {
                id: "button_1",
                type: "button",
                content: "Click Me",
                styles: { backgroundColor: "#0066ff" },
              },
            ],
          },
        ],
      },
    ],
    siteSettings: { siteName: "Test Site" },
    globalStyles: {
      colors: { primary: "#0066ff", secondary: "#10b981", accent: "#f59e0b", background: "#ffffff", text: "#000000" },
      typography: { fontFamily: "Inter", headingFontFamily: "Inter", baseFontSize: "16px" },
      buttonStyles: { borderRadius: "8px", padding: "10px 20px" },
    },
    siteParts: { header: { elements: [] }, footer: { elements: [] } },
    navigation: [],
    publishing: { status: "DRAFT" },
    deployment: { provider: "none" },
    elements: [],
  };
}

describe("Document Model & Operations", () => {
  it("getElementById finds top-level and nested elements", () => {
    const doc = createTestDocument();
    const heading = getElementById(doc, "heading_1");
    expect(heading).not.toBeNull();
    expect(heading?.type).toBe("heading");

    const button = getElementById(doc, "button_1");
    expect(button).not.toBeNull();
    expect(button?.type).toBe("button");
  });

  it("findParent locates correct parent node", () => {
    const doc = createTestDocument();
    const elements = getPageElements(doc, "home");
    const parent = findParent(elements, "button_1");
    expect(parent).not.toBeNull();
    expect(parent?.id).toBe("container_1");
  });

  it("updateElementProps immutably updates element without mutating original document", () => {
    const original = createTestDocument();
    const updated = updateElementProps(original, "heading_1", { content: "Updated Title" });

    expect(updated).not.toBe(original);
    expect(getElementById(original, "heading_1")?.content).toBe("Welcome to ForgeStudio");
    expect(getElementById(updated, "heading_1")?.content).toBe("Updated Title");
  });

  it("updateElementStyles immutably updates inline styles", () => {
    const original = createTestDocument();
    const updated = updateElementStyles(original, "button_1", { backgroundColor: "#ff0000" });

    expect(updated).not.toBe(original);
    expect(getElementById(original, "button_1")?.styles?.backgroundColor).toBe("#0066ff");
    expect(getElementById(updated, "button_1")?.styles?.backgroundColor).toBe("#ff0000");
  });

  it("addElement adds new element to container", () => {
    const original = createTestDocument();
    const newEl: EditorElement = { id: "text_1", type: "text", content: "Subtext" };
    const updated = addElement(original, "container_1", newEl, "home");

    const textEl = getElementById(updated, "text_1");
    expect(textEl).not.toBeNull();
    expect(textEl?.content).toBe("Subtext");
  });

  it("removeElement immutably deletes element", () => {
    const original = createTestDocument();
    const updated = removeElement(original, "heading_1", "home");

    expect(getElementById(original, "heading_1")).not.toBeNull();
    expect(getElementById(updated, "heading_1")).toBeNull();
  });

  it("executeCommand runs UPDATE_PROPS command immutably", () => {
    const original = createTestDocument();
    const updated = executeCommand(original, {
      type: "UPDATE_PROPS",
      elementId: "heading_1",
      props: { content: "Command Output" },
    });

    expect(getElementById(original, "heading_1")?.content).toBe("Welcome to ForgeStudio");
    expect(getElementById(updated, "heading_1")?.content).toBe("Command Output");
  });
});
