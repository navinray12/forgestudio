declare const describe: any;
declare const test: any;
declare const expect: any;
import {
  createDocumentHistory,
  pushDocumentSnapshot,
  undoDocumentHistory,
  redoDocumentHistory,
  getCurrentDocumentSnapshot,
  canUndoDocumentHistory,
  canRedoDocumentHistory,
  cloneDocument,
} from "../history/documentHistory";
import type { ForgeEditorDocument } from "../types/document";

const sampleDocument: ForgeEditorDocument = {
  version: 1,
  homePageId: "home",
  pages: [
    {
      id: "home",
      name: "Home",
      slug: "/",
      elements: [
        {
          id: "el_1",
          type: "heading",
          content: "Welcome",
        },
      ],
    },
  ],
  siteSettings: {
    siteName: "My Site",
  },
  globalStyles: {
    colors: { primary: "#000000", secondary: "#ffffff", accent: "#2563eb", background: "#ffffff", text: "#000000" },
    typography: { fontFamily: "Inter", headingFontFamily: "Inter", baseFontSize: "16px" },
    buttonStyles: { borderRadius: "4px", padding: "8px 16px" },
  },
  siteParts: {
    header: { enabled: true, elements: [] },
    footer: { enabled: true, elements: [] },
  },
  navigation: [],
  publishing: { status: "DRAFT" },
  deployment: { provider: "static" },
  elements: [
    {
      id: "el_1",
      type: "heading",
      content: "Welcome",
    },
  ],
};

describe("documentHistory pure abstraction", () => {
  // 1. Create initial history
  test("1. create initial history", () => {
    const history = createDocumentHistory(sampleDocument, 50);
    expect(history.entries.length).toBe(1);
    expect(history.index).toBe(0);
    expect(history.maxEntries).toBe(50);
    expect(history.entries[0].document.siteSettings.siteName).toBe("My Site");
  });

  // 2. Push snapshot
  test("2. push snapshot", () => {
    const h1 = createDocumentHistory(sampleDocument, 50);
    const updatedDoc: ForgeEditorDocument = {
      ...sampleDocument,
      siteSettings: { siteName: "Updated Site" },
    };
    const h2 = pushDocumentSnapshot(h1, updatedDoc, "Update Site Name");
    expect(h2.entries.length).toBe(2);
    expect(h2.index).toBe(1);
    expect(h2.entries[1].document.siteSettings.siteName).toBe("Updated Site");
    expect(h2.entries[1].label).toBe("Update Site Name");
  });

  // 3. Current snapshot
  test("3. current snapshot", () => {
    const history = createDocumentHistory(sampleDocument, 50);
    const snapshot = getCurrentDocumentSnapshot(history);
    expect(snapshot).not.toBeNull();
    if (snapshot) {
      expect(snapshot.homePageId).toBe("home");
    }
  });

  // 4. Undo
  test("4. undo", () => {
    const h1 = createDocumentHistory(sampleDocument, 50);
    const doc2: ForgeEditorDocument = { ...sampleDocument, version: 2 };
    const h2 = pushDocumentSnapshot(h1, doc2);
    const h3 = undoDocumentHistory(h2);
    expect(h3.index).toBe(0);
    const current = getCurrentDocumentSnapshot(h3);
    expect(current?.version).toBe(1);
  });

  // 5. Redo
  test("5. redo", () => {
    const h1 = createDocumentHistory(sampleDocument, 50);
    const doc2: ForgeEditorDocument = { ...sampleDocument, version: 2 };
    const h2 = pushDocumentSnapshot(h1, doc2);
    const h3 = undoDocumentHistory(h2);
    const h4 = redoDocumentHistory(h3);
    expect(h4.index).toBe(1);
    const current = getCurrentDocumentSnapshot(h4);
    expect(current?.version).toBe(2);
  });

  // 6. Undo at beginning
  test("6. undo at beginning", () => {
    const h1 = createDocumentHistory(sampleDocument, 50);
    expect(canUndoDocumentHistory(h1)).toBe(false);
    const h2 = undoDocumentHistory(h1);
    expect(h2.index).toBe(0);
    expect(h2).toBe(h1); // returns same reference
  });

  // 7. Redo at end
  test("7. redo at end", () => {
    const h1 = createDocumentHistory(sampleDocument, 50);
    expect(canRedoDocumentHistory(h1)).toBe(false);
    const h2 = redoDocumentHistory(h1);
    expect(h2.index).toBe(0);
    expect(h2).toBe(h1); // returns same reference
  });

  // 8. Redo branch truncation
  test("8. redo branch truncation", () => {
    const h1 = createDocumentHistory(sampleDocument, 50);
    const doc2: ForgeEditorDocument = { ...sampleDocument, version: 2 };
    const doc3: ForgeEditorDocument = { ...sampleDocument, version: 3 };
    const doc4: ForgeEditorDocument = { ...sampleDocument, version: 4 };

    let state = pushDocumentSnapshot(h1, doc2);
    state = pushDocumentSnapshot(state, doc3); // entries: [v1, v2, v3], index: 2
    state = undoDocumentHistory(state); // index: 1 (v2)

    // Pushing doc4 should truncate v3
    state = pushDocumentSnapshot(state, doc4); // entries: [v1, v2, v4], index: 2
    expect(state.entries.length).toBe(3);
    expect(state.entries[2].document.version).toBe(4);
    expect(canRedoDocumentHistory(state)).toBe(false);
  });

  // 9. Maximum history limit
  test("9. maximum history limit", () => {
    let state = createDocumentHistory(sampleDocument, 3); // limit 3
    for (let i = 2; i <= 10; i++) {
      state = pushDocumentSnapshot(state, { ...sampleDocument, version: i });
    }
    expect(state.entries.length).toBe(3);
    expect(state.index).toBe(2);
    expect(state.entries[2].document.version).toBe(10);
    expect(state.entries[0].document.version).toBe(8);
  });

  // 10. Immutable history state
  test("10. immutable history state", () => {
    const h1 = createDocumentHistory(sampleDocument, 50);
    const doc2: ForgeEditorDocument = { ...sampleDocument, version: 2 };
    const h2 = pushDocumentSnapshot(h1, doc2);
    expect(h1).not.toBe(h2);
    expect(h1.entries).not.toBe(h2.entries);
    expect(h1.entries.length).toBe(1);
  });

  // 11. Snapshot isolation
  test("11. snapshot isolation", () => {
    const mutableDoc = cloneDocument(sampleDocument);
    const history = createDocumentHistory(mutableDoc, 50);

    // Mutate original live document
    mutableDoc.siteSettings.siteName = "MUTATED LIVE NAME";

    // Snapshot in history must remain unchanged
    const snapshot = getCurrentDocumentSnapshot(history);
    expect(snapshot?.siteSettings.siteName).toBe("My Site");
  });

  // 12. Empty/invalid history handling according to chosen contract
  test("12. empty/invalid history handling", () => {
    const invalidState = { entries: [], index: -1, maxEntries: 50 };
    expect(getCurrentDocumentSnapshot(invalidState)).toBeNull();
    expect(canUndoDocumentHistory(invalidState)).toBe(false);
    expect(canRedoDocumentHistory(invalidState)).toBe(false);
  });
});
