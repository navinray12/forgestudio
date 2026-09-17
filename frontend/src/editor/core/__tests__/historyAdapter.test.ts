declare const describe: any;
declare const test: any;
declare const expect: any;
import {
  createDocumentSnapshotFromState,
  restoreDocumentSnapshot,
} from "../history/adapter";
import type {
  EditorStateAdapterState,
  EditorStateAdapterContext,
} from "../history/adapter";

const sampleEditorState: EditorStateAdapterState = {
  elements: [
    { id: "el_1", type: "heading", content: "Active Page Heading" },
  ],
  pages: [
    {
      id: "home",
      name: "Home",
      slug: "/",
      elements: [{ id: "el_home_old", type: "text", content: "Old Home Content" }],
      pageSettings: { title: "Home Page", path: "/" },
    },
    {
      id: "about",
      name: "About",
      slug: "/about",
      elements: [{ id: "el_about_1", type: "text", content: "About Us" }],
      pageSettings: { title: "About Us", path: "/about" },
    },
  ],
  pageSettings: { title: "Home Updated", path: "/" },
  homePageId: "home",
  siteParts: {
    header: { enabled: true, elements: [{ id: "el_hdr_1", type: "container", content: "Header" }] },
    footer: { enabled: true, elements: [{ id: "el_ftr_1", type: "container", content: "Footer" }] },
  },
  globalSettings: {
    siteIdentity: { name: "Test Site Name" },
    globalStyles: { colors: { primary: "#2563eb" } },
  },
  popups: [{ id: "pop_1", title: "Promo Popup" }],
  pageCss: ".custom-class { color: red; }",
  breakpoints: [
    { id: "desktop", name: "Desktop", width: 1200 },
    { id: "mobile", name: "Mobile", width: 375 },
  ],
  publishing: { status: "DRAFT", publishedVersion: 1 },
  deployment: { provider: "static" },
};

describe("historyAdapter pure adapter functions", () => {
  // 1. Creates canonical document from editor state
  test("1. creates canonical document from editor state", () => {
    const doc = createDocumentSnapshotFromState(sampleEditorState, {
      activePageId: "home",
      canvasMode: "page",
    });
    expect(doc.version).toBe(1);
    expect(doc.homePageId).toBe("home");
    expect(doc.siteSettings.siteName).toBe("Test Site Name");
  });

  // 2. Active page elements are synchronized correctly
  test("2. active page elements are synchronized correctly", () => {
    const doc = createDocumentSnapshotFromState(sampleEditorState, {
      activePageId: "home",
      canvasMode: "page",
    });
    const homePage = doc.pages.find((p) => p.id === "home");
    expect(homePage?.elements).toHaveLength(1);
    expect(homePage?.elements[0].content).toBe("Active Page Heading");
  });

  // 3. Active page settings are synchronized correctly
  test("3. active page settings are synchronized correctly", () => {
    const doc = createDocumentSnapshotFromState(sampleEditorState, {
      activePageId: "home",
      canvasMode: "page",
    });
    const homePage = doc.pages.find((p) => p.id === "home");
    expect(homePage?.pageSettings?.title).toBe("Home Updated");
  });

  // 4. Other pages remain unchanged
  test("4. other pages remain unchanged", () => {
    const doc = createDocumentSnapshotFromState(sampleEditorState, {
      activePageId: "home",
      canvasMode: "page",
    });
    const aboutPage = doc.pages.find((p) => p.id === "about");
    expect(aboutPage?.elements[0].content).toBe("About Us");
    expect(aboutPage?.pageSettings?.title).toBe("About Us");
  });

  // 5. Header mode synchronizes header elements
  test("5. header mode synchronizes header elements", () => {
    const headerState: EditorStateAdapterState = {
      ...sampleEditorState,
      elements: [{ id: "el_hdr_new", type: "button", content: "New Header Button" }],
    };
    const doc = createDocumentSnapshotFromState(headerState, {
      activePageId: "home",
      canvasMode: "header",
    });
    expect(doc.siteParts.header.elements).toHaveLength(1);
    expect(doc.siteParts.header.elements[0].content).toBe("New Header Button");
  });

  // 6. Footer mode synchronizes footer elements
  test("6. footer mode synchronizes footer elements", () => {
    const footerState: EditorStateAdapterState = {
      ...sampleEditorState,
      elements: [{ id: "el_ftr_new", type: "text", content: "New Footer Copyright" }],
    };
    const doc = createDocumentSnapshotFromState(footerState, {
      activePageId: "home",
      canvasMode: "footer",
    });
    expect(doc.siteParts.footer.elements).toHaveLength(1);
    expect(doc.siteParts.footer.elements[0].content).toBe("New Footer Copyright");
  });

  // 7. Global settings are preserved
  test("7. global settings are preserved", () => {
    const doc = createDocumentSnapshotFromState(sampleEditorState, {
      activePageId: "home",
      canvasMode: "page",
    });
    expect(doc.globalSettings?.siteIdentity?.name).toBe("Test Site Name");
  });

  // 8. Site parts are preserved
  test("8. site parts are preserved", () => {
    const doc = createDocumentSnapshotFromState(sampleEditorState, {
      activePageId: "home",
      canvasMode: "page",
    });
    expect(doc.siteParts.header.enabled).toBe(true);
    expect(doc.siteParts.footer.enabled).toBe(true);
  });

  // 9. Popups are preserved
  test("9. popups are preserved", () => {
    const doc = createDocumentSnapshotFromState(sampleEditorState, {
      activePageId: "home",
      canvasMode: "page",
    });
    expect(doc.popups).toHaveLength(1);
    expect(doc.popups?.[0].title).toBe("Promo Popup");
  });

  // 10. Page CSS is preserved
  test("10. page CSS is preserved", () => {
    const doc = createDocumentSnapshotFromState(sampleEditorState, {
      activePageId: "home",
      canvasMode: "page",
    });
    expect(doc.pageCss).toBe(".custom-class { color: red; }");
  });

  // 11. Breakpoints are preserved
  test("11. breakpoints are preserved", () => {
    const doc = createDocumentSnapshotFromState(sampleEditorState, {
      activePageId: "home",
      canvasMode: "page",
    });
    expect(doc.breakpoints).toHaveLength(2);
  });

  // 12. Publishing/deployment are preserved
  test("12. publishing and deployment are preserved", () => {
    const doc = createDocumentSnapshotFromState(sampleEditorState, {
      activePageId: "home",
      canvasMode: "page",
    });
    expect(doc.publishing.status).toBe("DRAFT");
    expect(doc.deployment.provider).toBe("static");
  });

  // 13. Input state is not mutated
  test("13. input state is not mutated", () => {
    const inputState: EditorStateAdapterState = JSON.parse(JSON.stringify(sampleEditorState));
    createDocumentSnapshotFromState(inputState, {
      activePageId: "home",
      canvasMode: "page",
    });
    expect(inputState).toEqual(sampleEditorState);
  });

  // 14. Document restoration reconstructs the expected editor state
  test("14. document restoration reconstructs the expected editor state", () => {
    const doc = createDocumentSnapshotFromState(sampleEditorState, {
      activePageId: "home",
      canvasMode: "page",
    });
    const restored = restoreDocumentSnapshot(doc, {
      activePageId: "home",
      canvasMode: "page",
    });
    expect(restored.elements).toHaveLength(1);
    expect(restored.elements[0].content).toBe("Active Page Heading");
    expect(restored.pages).toHaveLength(2);
    expect(restored.homePageId).toBe("home");
    expect(restored.pageCss).toBe(".custom-class { color: red; }");
  });

  // 15. Snapshot isolation prevents mutation leaks
  test("15. snapshot isolation prevents mutation leaks", () => {
    const doc = createDocumentSnapshotFromState(sampleEditorState, {
      activePageId: "home",
      canvasMode: "page",
    });

    // Mutate output doc
    doc.siteParts.header.elements.push({ id: "el_leak", type: "text", content: "Leak" });

    // Restoring original state shouldn't have the leak
    const restored = restoreDocumentSnapshot(doc, {
      activePageId: "home",
      canvasMode: "page",
    });
    const freshDoc = createDocumentSnapshotFromState(sampleEditorState, {
      activePageId: "home",
      canvasMode: "page",
    });
    expect(freshDoc.siteParts.header.elements).toHaveLength(1);
  });

  // 16. Missing/invalid active page is handled safely
  test("16. missing or invalid active page is handled safely", () => {
    const doc = createDocumentSnapshotFromState(sampleEditorState, {
      activePageId: "non_existent_page",
      canvasMode: "page",
    });
    expect(doc.pages.some((p) => p.id === "non_existent_page")).toBe(true);

    const restored = restoreDocumentSnapshot(doc, {
      activePageId: "unknown_page_2",
      canvasMode: "page",
    });
    expect(restored.elements).toBeDefined();
    expect(Array.isArray(restored.elements)).toBe(true);
  });
});
