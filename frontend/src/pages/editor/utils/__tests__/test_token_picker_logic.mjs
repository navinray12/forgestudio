import assert from "node:assert";

// Logic mirroring DesignTokenPickerControl and resolveTokenColorHex helper

export function resolveTokenColorHex(val, variables = []) {
  if (!val || typeof val !== "string") return "#000000";
  const clean = val.trim();
  if (clean.startsWith("#") && (clean.length === 4 || clean.length === 7)) {
    return clean;
  }
  const match = clean.match(/var\(\s*(--[a-zA-Z0-9_-]+)\s*\)/);
  const tokenName = match ? match[1] : (clean.startsWith("--") ? clean : null);
  if (tokenName && Array.isArray(variables)) {
    const found = variables.find((v) => v && v.token === tokenName);
    if (found) {
      const hex = found.modes?.light || found.value;
      if (hex && typeof hex === "string" && hex.startsWith("#")) {
        return hex;
      }
    }
  }
  return "#000000";
}

export function filterTokensByCategory(variables = [], category) {
  if (!Array.isArray(variables)) return [];
  return variables.filter(
    (v) => v && v.category === category && typeof v.token === "string" && v.token.trim().length > 0
  );
}

export function isTokenReference(val) {
  if (!val || typeof val !== "string") return false;
  return /^var\(\s*--[a-zA-Z0-9_-]+\s*\)$/.test(val.trim());
}

export function extractTokenName(val) {
  if (!val || typeof val !== "string") return null;
  const match = val.trim().match(/var\(\s*(--[a-zA-Z0-9_-]+)\s*\)/);
  return match ? match[1] : (val.trim().startsWith("--") ? val.trim() : null);
}

// Sample test dataset
const mockVariables = [
  {
    id: "var-1",
    name: "Brand Primary",
    category: "color",
    token: "--fs-color-primary",
    value: "#2563eb",
    modes: { light: "#2563eb", dark: "#1d4ed8" },
  },
  {
    id: "var-2",
    name: "Brand Accent",
    category: "color",
    token: "--fs-color-accent",
    value: "#f59e0b",
  },
  {
    id: "var-3",
    name: "Heading Font",
    category: "typography",
    token: "--fs-typography-heading",
    value: "Inter, sans-serif",
  },
  {
    id: "var-4",
    name: "Container Spacing",
    category: "spacing",
    token: "--fs-spacing-lg",
    value: "24px",
  },
  {
    id: "var-5",
    name: "Card Radius",
    category: "radius",
    token: "--fs-radius-md",
    value: "8px",
  },
];

console.log("=== Testing Token Picker Logic ===");

// Test 1: Category Filtering
console.log("Test 1: Category filtering only returns matching category tokens");
const colorTokens = filterTokensByCategory(mockVariables, "color");
assert.strictEqual(colorTokens.length, 2, "Should return exactly 2 color tokens");
assert.strictEqual(colorTokens[0].token, "--fs-color-primary");
assert.strictEqual(colorTokens[1].token, "--fs-color-accent");

const typographyTokens = filterTokensByCategory(mockVariables, "typography");
assert.strictEqual(typographyTokens.length, 1);
assert.strictEqual(typographyTokens[0].token, "--fs-typography-heading");

const emptyTokens = filterTokensByCategory(mockVariables, "shadow");
assert.strictEqual(emptyTokens.length, 0, "Non-existent category should return empty array");
console.log("✓ Category filtering passed.");

// Test 2: Token Reference Detection
console.log("Test 2: Token reference detection");
assert.strictEqual(isTokenReference("var(--fs-color-primary)"), true);
assert.strictEqual(isTokenReference("var( --fs-color-accent )"), true);
assert.strictEqual(isTokenReference("#2563eb"), false);
assert.strictEqual(isTokenReference("rgb(37, 99, 235)"), false);
assert.strictEqual(isTokenReference(""), false);
assert.strictEqual(isTokenReference(undefined), false);
console.log("✓ Token reference detection passed.");

// Test 3: Token Name Extraction
console.log("Test 3: Token name extraction");
assert.strictEqual(extractTokenName("var(--fs-color-primary)"), "--fs-color-primary");
assert.strictEqual(extractTokenName("var( --fs-color-accent )"), "--fs-color-accent");
assert.strictEqual(extractTokenName("--fs-color-primary"), "--fs-color-primary");
assert.strictEqual(extractTokenName("#ffffff"), null);
console.log("✓ Token name extraction passed.");

// Test 4: resolveTokenColorHex
console.log("Test 4: resolveTokenColorHex resolves direct hex, var() reference, and fallback");
// Direct hex
assert.strictEqual(resolveTokenColorHex("#2563eb", mockVariables), "#2563eb");
assert.strictEqual(resolveTokenColorHex("#fff", mockVariables), "#fff");

// Variable reference with modes.light
assert.strictEqual(resolveTokenColorHex("var(--fs-color-primary)", mockVariables), "#2563eb");

// Variable reference with value only
assert.strictEqual(resolveTokenColorHex("var(--fs-color-accent)", mockVariables), "#f59e0b");

// Unknown token fallback
assert.strictEqual(resolveTokenColorHex("var(--fs-color-unknown)", mockVariables), "#000000");

// Empty or invalid inputs
assert.strictEqual(resolveTokenColorHex("", mockVariables), "#000000");
assert.strictEqual(resolveTokenColorHex(null, mockVariables), "#000000");
console.log("✓ resolveTokenColorHex passed.");

// Test 5: Detach token converts var(--...) to raw value
console.log("Test 5: Detach token converts var() to current raw value");
const tokenToDetach = mockVariables.find((v) => v.token === extractTokenName("var(--fs-color-primary)"));
assert.ok(tokenToDetach, "Token should be found");
const detachedValue = tokenToDetach.modes?.light || tokenToDetach.value;
assert.strictEqual(detachedValue, "#2563eb", "Detached value should match token light/base value");
console.log("✓ Detach token passed.");

// Test 6: Empty state handling
console.log("Test 6: Empty variables list handled gracefully");
assert.deepStrictEqual(filterTokensByCategory([], "color"), []);
assert.deepStrictEqual(filterTokensByCategory(null, "color"), []);
assert.strictEqual(resolveTokenColorHex("var(--fs-color-primary)", []), "#000000");
console.log("✓ Empty state handling passed.");

console.log("\nALL 6 DESIGN TOKEN PICKER LOGIC TESTS PASSED SUCCESSFULLY!");
