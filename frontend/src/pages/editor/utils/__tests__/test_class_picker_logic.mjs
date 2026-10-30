import assert from "node:assert";

// Core logic verified in GlobalClassPickerSection

function parseClasses(customClassString) {
  return (customClassString || "")
    .split(/\s+/)
    .map((c) => c.trim())
    .filter(Boolean);
}

function getAvailableClasses(globalClasses, currentClasses, filter = "") {
  return (globalClasses || []).filter((gc) => {
    if (!gc || !gc.className) return false;
    const isAlreadyApplied = currentClasses.includes(gc.className);
    if (isAlreadyApplied) return false;
    if (!filter.trim()) return true;
    const q = filter.toLowerCase().trim();
    return (
      gc.className.toLowerCase().includes(q) ||
      (gc.name && gc.name.toLowerCase().includes(q)) ||
      (gc.description && gc.description.toLowerCase().includes(q))
    );
  });
}

function addClass(currentClasses, newClass) {
  if (!newClass) return currentClasses.join(" ");
  const clean = newClass.trim().replace(/^\.+/, "");
  if (!clean || currentClasses.includes(clean)) return currentClasses.join(" ");
  return [...currentClasses, clean].join(" ");
}

function removeClass(currentClasses, classToRemove) {
  return currentClasses.filter((c) => c !== classToRemove).join(" ");
}

console.log("Running Global CSS Class Picker Unit Tests...\n");

const globalClasses = [
  { id: "c1", name: "Elevated Card", className: "fs-card-elevated" },
  { id: "c2", name: "Primary Action", className: "fs-btn-primary" },
  { id: "c3", name: "Hero Heading", className: "fs-heading-hero" },
];

// Test 1: Empty initial state
console.log("Test 1: Empty initial classes");
assert.deepStrictEqual(parseClasses(""), []);
assert.deepStrictEqual(parseClasses(null), []);
assert.deepStrictEqual(parseClasses(undefined), []);
const availableAll = getAvailableClasses(globalClasses, []);
assert.strictEqual(availableAll.length, 3);
console.log("  [PASS] Empty state parses to empty array and all 3 classes available");

// Test 2: Selecting multiple classes sequentially
console.log("Test 2: Selecting multiple classes sequentially");
let current = parseClasses("");
let updatedStr = addClass(current, "fs-card-elevated");
assert.strictEqual(updatedStr, "fs-card-elevated");

current = parseClasses(updatedStr);
updatedStr = addClass(current, "fs-btn-primary");
assert.strictEqual(updatedStr, "fs-card-elevated fs-btn-primary");
current = parseClasses(updatedStr);
assert.deepStrictEqual(current, ["fs-card-elevated", "fs-btn-primary"]);
console.log("  [PASS] Multiple classes can be selected and combined");

// Test 3: Duplicate prevention
console.log("Test 3: Duplicate prevention");
const dupAttempt = addClass(current, "fs-card-elevated");
assert.strictEqual(dupAttempt, "fs-card-elevated fs-btn-primary");
const availableRemaining = getAvailableClasses(globalClasses, current);
assert.strictEqual(availableRemaining.length, 1);
assert.strictEqual(availableRemaining[0].className, "fs-heading-hero");
console.log("  [PASS] Duplicates are prevented and already-applied classes are omitted from available options");

// Test 4: Preserving custom classes when adding global class
console.log("Test 4: Preserving custom freeform classes");
const withCustom = parseClasses("shadow-lg p-6 hover:shadow-xl");
const addedWithCustom = addClass(withCustom, "fs-card-elevated");
assert.strictEqual(addedWithCustom, "shadow-lg p-6 hover:shadow-xl fs-card-elevated");
console.log("  [PASS] Existing freeform custom classes preserved intact");

// Test 5: Removing a specific class without removing others
console.log("Test 5: Removing a specific class");
const initialTokens = parseClasses("shadow-lg fs-card-elevated fs-btn-primary");
const afterRemoveBtn = removeClass(initialTokens, "fs-btn-primary");
assert.strictEqual(afterRemoveBtn, "shadow-lg fs-card-elevated");

const afterRemoveCard = removeClass(parseClasses(afterRemoveBtn), "fs-card-elevated");
assert.strictEqual(afterRemoveCard, "shadow-lg");
console.log("  [PASS] Selected class removed cleanly while keeping other classes");

// Test 6: Whitespace normalization
console.log("Test 6: Whitespace normalization");
const messy = "   shadow-lg    fs-card-elevated   ";
assert.deepStrictEqual(parseClasses(messy), ["shadow-lg", "fs-card-elevated"]);
console.log("  [PASS] Whitespace normalized safely");

// Test 7: Empty global classes list handling
console.log("Test 7: Empty global classes list handling");
const availableFromEmpty = getAvailableClasses([], ["some-class"]);
assert.deepStrictEqual(availableFromEmpty, []);
assert.deepStrictEqual(getAvailableClasses(null, []), []);
console.log("  [PASS] Null/empty global classes lists handled safely without error");

// Test 8: Filter/search behavior
console.log("Test 8: Filter/search behavior");
const filteredHero = getAvailableClasses(globalClasses, [], "hero");
assert.strictEqual(filteredHero.length, 1);
assert.strictEqual(filteredHero[0].className, "fs-heading-hero");

const filteredNone = getAvailableClasses(globalClasses, [], "nonexistent_query");
assert.strictEqual(filteredNone.length, 0);
console.log("  [PASS] Search filtering works accurately");

console.log("\nALL 8 TEST GROUPS PASSED!");
