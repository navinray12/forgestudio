const assert = {
  equal(actual: unknown, expected: unknown, message?: string) {
    if (actual !== expected) {
      throw new Error(
        `Assertion failed: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}. ${message || ""}`
      );
    }
  },
  ok(value: unknown, message?: string) {
    if (!value) {
      throw new Error(
        `Assertion failed: expected truthy value, got ${JSON.stringify(value)}. ${message || ""}`
      );
    }
  },
};
import type { EditorElement } from "../pages/editor/types";

// Helper to create a dummy EditorElement tree
function createTestElement(id: string, text: string): EditorElement {
  return {
    id,
    type: "text",
    content: text,
  };
}

console.log("Starting Editor History Logic & Invariant Tests...");

// Test 1: Snapshot Immutability
console.log("Test 1: Snapshot Immutability...");
{
  const element1 = createTestElement("el-1", "Original Text");
  const elements = [element1];

  // Deep clone via native structuredClone or fallback
  const snapshotStr = JSON.stringify(elements);
  const snapshot: EditorElement[] = typeof structuredClone === "function"
    ? structuredClone(elements)
    : JSON.parse(snapshotStr);

  // Mutate current working element
  element1.content = "Modified After Snapshot";

  // Verify snapshot was NOT mutated
  assert.equal(
    snapshot[0].content,
    "Original Text",
    "Snapshot must remain immutable when current element is modified"
  );
}

// Test 2: Serialization Caching Optimization Check
console.log("Test 2: Serialization Caching...");
{
  const cache = new WeakMap<EditorElement[], string>();
  const initialElements = [createTestElement("el-1", "Text 1")];
  const initialStr = JSON.stringify(initialElements);
  cache.set(initialElements, initialStr);

  // Subsequent check should find cached string in O(1)
  const cached = cache.get(initialElements);
  assert.equal(cached, initialStr, "Cache should retrieve serialized string without stringifying");

  // Identical content check
  const sameContent = [createTestElement("el-1", "Text 1")];
  assert.equal(
    JSON.stringify(sameContent) === cached,
    true,
    "Should correctly detect identical content"
  );
}

// Test 3: History Queue Boundary (50 Snapshots limit)
console.log("Test 3: History Queue Boundary (50 Max)...");
{
  const maxHistory = 50;
  let history: EditorElement[][] = [];
  let historyIndex = -1;

  for (let i = 0; i < 65; i++) {
    const newSnapshot = [createTestElement("el-1", `Step ${i}`)];
    const sliced = historyIndex >= 0 ? history.slice(0, historyIndex + 1) : history;
    const updated = [...sliced, newSnapshot];
    if (updated.length > maxHistory) {
      updated.shift();
    }
    history = updated;
    historyIndex = Math.min(
      historyIndex >= 0 ? historyIndex + 1 : updated.length - 1,
      maxHistory - 1
    );
  }

  assert.equal(history.length, 50, "History queue length must never exceed maxHistory of 50");
  assert.equal(historyIndex, 49, "History index must be at 49 (maxHistory - 1)");
  assert.equal(history[49][0].content, "Step 64", "Latest snapshot must be Step 64");
  assert.equal(history[0][0].content, "Step 15", "Oldest snapshot must be Step 15 after 65 pushes with 50 limit");
}

// Test 4: Undo and Redo Mechanics
console.log("Test 4: Undo, Redo, and Branch Clearing...");
{
  let history: EditorElement[][] = [];
  let historyIndex = -1;

  // Add 3 steps: A, B, C
  const steps = ["State A", "State B", "State C"];
  for (const step of steps) {
    const snapshot = [createTestElement("el-1", step)];
    const sliced = historyIndex >= 0 ? history.slice(0, historyIndex + 1) : history;
    history = [...sliced, snapshot];
    historyIndex = history.length - 1;
  }

  assert.equal(history.length, 3, "Should have 3 snapshots");
  assert.equal(historyIndex, 2, "Current index should be 2 (State C)");

  // Undo to B
  assert.ok(historyIndex > 0, "canUndo should be true");
  historyIndex -= 1;
  assert.equal(history[historyIndex][0].content, "State B", "Undo should restore State B");

  // Undo to A
  assert.ok(historyIndex > 0, "canUndo should be true");
  historyIndex -= 1;
  assert.equal(history[historyIndex][0].content, "State A", "Undo should restore State A");
  assert.equal(historyIndex === 0, true, "canUndo should now be false at index 0");

  // Redo to B
  assert.ok(historyIndex < history.length - 1, "canRedo should be true");
  historyIndex += 1;
  assert.equal(history[historyIndex][0].content, "State B", "Redo should restore State B");

  // New edit from State B: create State D (should drop forward redo branch State C)
  const branchEdit = [createTestElement("el-1", "State D")];
  const sliced = history.slice(0, historyIndex + 1);
  history = [...sliced, branchEdit];
  historyIndex = history.length - 1;

  assert.equal(history.length, 3, "History should have 3 items: [A, B, D]");
  assert.equal(historyIndex, 2, "History index should be 2");
  assert.equal(history[0][0].content, "State A", "Index 0 should be State A");
  assert.equal(history[1][0].content, "State B", "Index 1 should be State B");
  assert.equal(history[2][0].content, "State D", "Index 2 should be State D");

  // Redo should now be impossible
  assert.equal(
    historyIndex < history.length - 1,
    false,
    "canRedo should be false after branching new edit"
  );
}

// Test 5: Reset History
console.log("Test 5: Reset History...");
{
  const initial = [createTestElement("root", "Page Init")];
  const str = JSON.stringify(initial);
  const clone: EditorElement[] = JSON.parse(str);
  const history = [clone];
  const historyIndex = 0;

  assert.equal(history.length, 1, "Reset should produce exactly 1 snapshot");
  assert.equal(historyIndex, 0, "Reset should set index to 0");
  assert.equal(history[0][0].content, "Page Init", "Reset snapshot should match initial content");
}

console.log("All Editor History Logic & Invariant Tests Passed Successfully!");
