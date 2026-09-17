declare const describe: any;
declare const it: any;
declare const expect: any;
import { getActivePage, getPageById, getPageElements } from "../selectors/documentSelectors";
import type { ForgeEditorDocument } from "../types";

describe("useEditorDocument State Contract & Selectors", () => {
  const mockDoc: any = {
    elements: [
      { id: "el_1", type: "heading", content: "Main Title" },
    ],
    pages: [
      {
        id: "home",
        name: "Home",
        slug: "/",
        isHome: true,
        elements: [{ id: "el_2", type: "text", content: "Welcome" }],
      },
      {
        id: "about",
        name: "About",
        slug: "/about",
        isHome: false,
        elements: [{ id: "el_3", type: "image", content: "Image" }],
      },
    ],
  };

  it("resolves active home page correctly", () => {
    const page = getActivePage(mockDoc, "home");
    expect(page).toBeDefined();
    expect(page?.id).toBe("home");
    expect(page?.name).toBe("Home");
  });

  it("resolves secondary page by id", () => {
    const page = getPageById(mockDoc, "about");
    expect(page).toBeDefined();
    expect(page?.slug).toBe("/about");
  });

  it("returns active page elements safely", () => {
    const elements = getPageElements(mockDoc, "about");
    expect(elements).toHaveLength(1);
    expect(elements[0].id).toBe("el_3");
  });

  it("safely handles undefined/null documents without throwing", () => {
    const nullDoc: any = null;
    expect(getActivePage(nullDoc, "home")).toBeNull();
    expect(getPageById(nullDoc, "home")).toBeNull();
    expect(getPageElements(nullDoc, "home")).toEqual([]);
  });
});
