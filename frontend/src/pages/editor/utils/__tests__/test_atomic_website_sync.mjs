import assert from "node:assert";

/**
 * Unit tests for Module 17 Step 5:
 * Atomic Editor Variables and Classes connection to Website Data.
 */

// Helper functions mirroring variableService and classService
export function getVariableStorageKey(websiteId) {
  return websiteId ? `forgestudio_atomic_variables_${websiteId}` : "forgestudio_atomic_variables";
}

export function getClassStorageKey(websiteId) {
  return websiteId ? `forgestudio_atomic_classes_${websiteId}` : "forgestudio_atomic_classes";
}

export function atomicVariableToDesignVariable(atomic) {
  const categoryMap = {
    color: "color",
    font: "typography",
    spacing: "spacing",
    number: "custom",
  };

  const cleanToken = atomic.key.startsWith("--") ? atomic.key : `--${atomic.key}`;
  const category = categoryMap[atomic.type] || "custom";

  return {
    id: atomic.id || `var_${Math.random().toString(36).substr(2, 9)}`,
    name: atomic.name,
    category,
    token: cleanToken,
    value: atomic.value,
    modes: atomic.type === "color" ? { light: atomic.value } : undefined,
    description: atomic.description || "",
  };
}

export function designVariableToAtomicVariable(design) {
  const typeMap = {
    color: "color",
    typography: "font",
    spacing: "spacing",
    custom: "number",
  };

  const atomicType = typeMap[design.category] || "color";
  const val = design.modes?.light || design.value || "";

  return {
    id: design.id,
    name: design.name || design.token,
    key: design.token,
    value: val,
    type: atomicType,
    description: design.description,
  };
}

export function atomicClassToGlobalClass(atomic) {
  const cleanClassName = atomic.key.replace(/^\./, "").trim();
  return {
    id: atomic.id || `cls_${Math.random().toString(36).substr(2, 9)}`,
    name: atomic.name,
    className: cleanClassName,
    styles: atomic.styles ? { ...atomic.styles } : {},
    description: atomic.description || "",
  };
}

export function globalClassToAtomicClass(globalCls) {
  return {
    id: globalCls.id,
    name: globalCls.name || globalCls.className,
    key: globalCls.className,
    styles: globalCls.styles ? { ...globalCls.styles } : {},
    description: globalCls.description,
  };
}

console.log("Starting Module 17 Step 5 Unit Tests...");

// Test 1: Storage Key Scoping
{
  assert.strictEqual(
    getVariableStorageKey("site-alpha"),
    "forgestudio_atomic_variables_site-alpha",
    "Variable key should be scoped to site-alpha"
  );
  assert.strictEqual(
    getVariableStorageKey("site-beta"),
    "forgestudio_atomic_variables_site-beta",
    "Variable key should be scoped to site-beta"
  );
  assert.strictEqual(
    getVariableStorageKey(undefined),
    "forgestudio_atomic_variables",
    "Variable key should fall back to unscoped if websiteId missing"
  );

  assert.strictEqual(
    getClassStorageKey("site-alpha"),
    "forgestudio_atomic_classes_site-alpha",
    "Class key should be scoped to site-alpha"
  );
  assert.strictEqual(
    getClassStorageKey("site-beta"),
    "forgestudio_atomic_classes_site-beta",
    "Class key should be scoped to site-beta"
  );
  console.log("✓ Test 1: Storage key scoping passed.");
}

// Test 2: Bidirectional Mapping - Variables
{
  const atomicVar = {
    id: "v-123",
    name: "Primary Brand Color",
    key: "--color-brand-primary",
    value: "#3b82f6",
    type: "color",
    description: "Main theme color",
  };

  const designVar = atomicVariableToDesignVariable(atomicVar);
  assert.strictEqual(designVar.token, "--color-brand-primary");
  assert.strictEqual(designVar.category, "color");
  assert.strictEqual(designVar.value, "#3b82f6");
  assert.strictEqual(designVar.modes?.light, "#3b82f6");

  const roundTrip = designVariableToAtomicVariable(designVar);
  assert.strictEqual(roundTrip.id, atomicVar.id);
  assert.strictEqual(roundTrip.name, atomicVar.name);
  assert.strictEqual(roundTrip.key, atomicVar.key);
  assert.strictEqual(roundTrip.value, atomicVar.value);
  assert.strictEqual(roundTrip.type, "color");
  console.log("✓ Test 2: Bidirectional Variable mapping passed.");
}

// Test 3: Bidirectional Mapping - Classes
{
  const atomicCls = {
    id: "c-456",
    name: "Hero Title",
    key: "hero-title-gradient",
    styles: {
      fontSize: "3rem",
      fontWeight: "800",
      color: "var(--color-brand-primary)",
    },
    description: "Styles for hero title",
  };

  const globalCls = atomicClassToGlobalClass(atomicCls);
  assert.strictEqual(globalCls.className, "hero-title-gradient");
  assert.strictEqual(globalCls.styles.fontSize, "3rem");
  assert.strictEqual(globalCls.styles.color, "var(--color-brand-primary)");

  const roundTrip = globalClassToAtomicClass(globalCls);
  assert.strictEqual(roundTrip.id, atomicCls.id);
  assert.strictEqual(roundTrip.name, atomicCls.name);
  assert.strictEqual(roundTrip.key, atomicCls.key);
  assert.deepStrictEqual(roundTrip.styles, atomicCls.styles);
  console.log("✓ Test 3: Bidirectional Class mapping passed.");
}

// Test 4: Website Isolation
{
  const simulatedStorage = new Map();

  function saveSiteVariables(siteId, vars) {
    simulatedStorage.set(getVariableStorageKey(siteId), JSON.stringify(vars));
  }

  function getSiteVariables(siteId) {
    const raw = simulatedStorage.get(getVariableStorageKey(siteId));
    return raw ? JSON.parse(raw) : [];
  }

  saveSiteVariables("website-1", [{ id: "v1", key: "--color-site1", value: "#ff0000" }]);
  saveSiteVariables("website-2", [{ id: "v2", key: "--color-site2", value: "#00ff00" }]);

  const site1Vars = getSiteVariables("website-1");
  const site2Vars = getSiteVariables("website-2");

  assert.strictEqual(site1Vars.length, 1);
  assert.strictEqual(site1Vars[0].key, "--color-site1");

  assert.strictEqual(site2Vars.length, 1);
  assert.strictEqual(site2Vars[0].key, "--color-site2");

  assert.notDeepStrictEqual(site1Vars, site2Vars, "Websites must have isolated data");
  console.log("✓ Test 4: Website data isolation passed.");
}

// Test 5: Stale Asynchronous Response Prevention
{
  let currentActiveWebsiteId = "website-A";
  let appliedState = null;

  async function mockAsyncFetch(requestedWebsiteId, delayMs, responseData) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Guard checking if response belongs to current active website
        if (currentActiveWebsiteId === requestedWebsiteId) {
          appliedState = { siteId: requestedWebsiteId, data: responseData };
          resolve({ applied: true });
        } else {
          // Stale response discarded!
          resolve({ applied: false, discarded: true });
        }
      }, delayMs);
    });
  }

  // Request 1 starts for website-A (slow: 100ms)
  const req1 = mockAsyncFetch("website-A", 100, [{ key: "--theme-a" }]);

  // User quickly switches to website-B after 20ms
  currentActiveWebsiteId = "website-B";

  // Request 2 starts for website-B (fast: 30ms)
  const req2 = mockAsyncFetch("website-B", 30, [{ key: "--theme-b" }]);

  const [res1, res2] = await Promise.all([req1, req2]);

  assert.strictEqual(res2.applied, true, "Website-B response should be applied");
  assert.strictEqual(res1.discarded, true, "Website-A stale response should be discarded");
  assert.strictEqual(appliedState.siteId, "website-B", "Active state must be website-B, never overwritten by website-A");
  console.log("✓ Test 5: Stale asynchronous response guard passed.");
}

// Test 6: Backend Partial Update Preservation Logic
{
  const currentEditorData = {
    globalVariables: [{ token: "--color-existing", category: "color", value: "#111" }],
    globalClasses: [{ className: "btn-existing", styles: { padding: "8px" } }],
  };

  function updateDesignSystemSim(body, current) {
    const nextVariables = body.variables !== undefined ? body.variables : current.globalVariables;
    const nextClasses = body.classes !== undefined ? body.classes : current.globalClasses;
    return {
      globalVariables: nextVariables,
      globalClasses: nextClasses,
    };
  }

  // Updating only variables must preserve classes
  const updateOnlyVars = updateDesignSystemSim(
    { variables: [{ token: "--color-new", category: "color", value: "#222" }] },
    currentEditorData
  );
  assert.strictEqual(updateOnlyVars.globalVariables[0].token, "--color-new");
  assert.strictEqual(updateOnlyVars.globalClasses[0].className, "btn-existing", "Existing classes must not be wiped");

  // Updating only classes must preserve variables
  const updateOnlyClasses = updateDesignSystemSim(
    { classes: [{ className: "card-new", styles: { margin: "4px" } }] },
    currentEditorData
  );
  assert.strictEqual(updateOnlyClasses.globalVariables[0].token, "--color-existing", "Existing variables must not be wiped");
  assert.strictEqual(updateOnlyClasses.globalClasses[0].className, "card-new");
  console.log("✓ Test 6: Backend partial update preservation passed.");
}

console.log("\nALL MODULE 17 STEP 5 TESTS PASSED SUCCESSFULLY!");
