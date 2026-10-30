import assert from "node:assert";
import {
  exportDesignSystem,
  importDesignSystem,
  validateVariables,
  validateClasses,
  compileDesignSystemCss,
  DesignVariable,
  GlobalClass,
} from "../services/tokens/designToken.service.js";

console.log("=================================================");
console.log("RUNNING DESIGN SYSTEM IMPORT / EXPORT TEST SUITE");
console.log("=================================================");

// Test Data
const mockVariables: DesignVariable[] = [
  {
    id: "var-1",
    name: "Primary Color",
    category: "color",
    token: "--fs-color-primary",
    value: "#2563eb",
    modes: { light: "#2563eb", dark: "#1d4ed8" },
  },
  {
    id: "var-2",
    name: "Body Font",
    category: "typography",
    token: "--fs-font-body",
    value: "Inter, sans-serif",
  },
];

const mockClasses: GlobalClass[] = [
  {
    id: "cls-1",
    name: "Hero Container",
    className: "fs-hero-container",
    styles: {
      padding: "32px",
      borderRadius: "12px",
      backgroundColor: "var(--fs-color-primary)",
    },
    pseudoStyles: {
      hover: {
        backgroundColor: "#1e40af",
      },
    },
  },
];

// Group 1: Round-trip Export & Import Compatibility
console.log("\n--- Group 1: Round-Trip Export and Import ---");
{
  const exported = exportDesignSystem(mockVariables, mockClasses);
  assert.strictEqual(exported.version, 1, "Export version is 1 for full design system");
  assert.strictEqual(exported.variables.length, 2, "2 variables exported");
  assert.strictEqual(exported.classes.length, 1, "1 class exported");

  const jsonStr = JSON.stringify(exported, null, 2);
  const reimported = importDesignSystem(jsonStr);

  assert.strictEqual(reimported.hasVariables, true, "hasVariables flag is true");
  assert.strictEqual(reimported.hasClasses, true, "hasClasses flag is true");
  assert.strictEqual(reimported.variables.length, 2, "2 variables reimported");
  assert.strictEqual(reimported.classes.length, 1, "1 class reimported");
  assert.strictEqual(reimported.variables[0].token, "--fs-color-primary");
  assert.strictEqual(reimported.variables[0].modes?.dark, "#1d4ed8");
  assert.strictEqual(reimported.classes[0].className, "fs-hero-container");
  assert.ok(reimported.compiledCss.includes("--fs-color-primary: #2563eb;"), "CSS has token definition");
  assert.ok(reimported.compiledCss.includes(".fs-hero-container {"), "CSS has class definition");
  console.log("  [PASS] Full design system round-trip preserved all variables, classes, and dark modes");
}

// Group 2: Variables-Only Payload (F-339 / F-342)
console.log("\n--- Group 2: Variables-Only Payload ---");
{
  const varsPayload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    variables: mockVariables,
  };
  const imported = importDesignSystem(varsPayload);
  assert.strictEqual(imported.hasVariables, true, "hasVariables is true");
  assert.strictEqual(imported.hasClasses, false, "hasClasses is false");
  assert.strictEqual(imported.variables.length, 2, "Imported 2 variables");
  assert.strictEqual(imported.classes.length, 0, "No classes in payload");
  console.log("  [PASS] Variables-only payload imported successfully with hasClasses=false");
}

// Group 3: Classes-Only Payload (F-340 / F-343)
console.log("\n--- Group 3: Classes-Only Payload ---");
{
  const classesPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    classes: mockClasses,
  };
  const imported = importDesignSystem(classesPayload);
  assert.strictEqual(imported.hasVariables, false, "hasVariables is false");
  assert.strictEqual(imported.hasClasses, true, "hasClasses is true");
  assert.strictEqual(imported.classes.length, 1, "Imported 1 class");
  assert.strictEqual(imported.variables.length, 0, "No variables in payload");
  console.log("  [PASS] Classes-only payload imported successfully with hasVariables=false");
}

// Group 4: Malformed & Invalid JSON Handling
console.log("\n--- Group 4: Malformed & Invalid JSON Handling ---");
{
  // Non-JSON string
  assert.throws(
    () => importDesignSystem("this is { not valid json"),
    /Invalid JSON string/,
    "Throws descriptive error on broken JSON string"
  );

  // Null or primitive
  assert.throws(
    () => importDesignSystem(null as any),
    /must be an object or array/,
    "Throws descriptive error on null"
  );

  // Empty object with no variables or classes
  assert.throws(
    () => importDesignSystem({}),
    /payload must contain 'variables' or 'classes' array/,
    "Throws error on empty object"
  );

  // Empty array
  assert.throws(
    () => importDesignSystem([]),
    /Empty array supplied/,
    "Throws error on empty array"
  );
  console.log("  [PASS] All invalid payloads cleanly rejected with descriptive errors");
}

// Group 5: Schema Version Compatibility & Validation
console.log("\n--- Group 5: Schema Version Validation ---");
{
  // Version 1 is supported
  const v1 = importDesignSystem({ version: 1, variables: mockVariables });
  assert.strictEqual(v1.version, 1, "Version 1 accepted");

  // Version 2 is supported
  const v2 = importDesignSystem({ version: 2, variables: mockVariables });
  assert.strictEqual(v2.version, 2, "Version 2 accepted");

  // Version 99 is unsupported
  assert.throws(
    () => importDesignSystem({ version: 99, variables: mockVariables }),
    /Unsupported schema version: 99/,
    "Rejects unsupported version 99"
  );

  // Version 0 or negative is unsupported
  assert.throws(
    () => importDesignSystem({ version: 0, variables: mockVariables }),
    /Unsupported schema version: 0/,
    "Rejects version 0"
  );
  console.log("  [PASS] Schema versions strictly validated (v1 and v2 supported; unsupported rejected)");
}

// Group 6: Website Isolation Simulation
console.log("\n--- Group 6: Website Isolation & Partial Update Preservation ---");
{
  // Simulate website state store
  const mockWebsites: Record<string, { editorData: any }> = {
    "site-alpha": {
      editorData: {
        globalVariables: [
          { token: "--alpha-var", category: "color", value: "#111111" },
        ],
        globalClasses: [
          { className: "alpha-box", styles: { padding: "10px" } },
        ],
      },
    },
    "site-beta": {
      editorData: {
        globalVariables: [
          { token: "--beta-var", category: "color", value: "#222222" },
        ],
        globalClasses: [
          { className: "beta-box", styles: { margin: "20px" } },
        ],
      },
    },
  };

  // Controller update logic simulation
  function simulateImport(
    siteId: string,
    payload: any,
    mode: "replace" | "merge" = "replace"
  ) {
    const site = mockWebsites[siteId];
    assert.ok(site, "Target website must exist");

    const imported = importDesignSystem(payload);
    const current = site.editorData;
    const existingVars = validateVariables(current.globalVariables || []);
    const existingClasses = validateClasses(current.globalClasses || []);

    let finalVariables: any[];
    let finalClasses: any[];

    if (!imported.hasVariables) {
      finalVariables = existingVars;
    } else if (mode === "merge") {
      const varMap = new Map();
      for (const v of existingVars) varMap.set(v.token, v);
      for (const v of imported.variables) varMap.set(v.token, v);
      finalVariables = Array.from(varMap.values());
    } else {
      finalVariables = imported.variables;
    }

    if (!imported.hasClasses) {
      finalClasses = existingClasses;
    } else if (mode === "merge") {
      const clsMap = new Map();
      for (const c of existingClasses) clsMap.set(c.className, c);
      for (const c of imported.classes) clsMap.set(c.className, c);
      finalClasses = Array.from(clsMap.values());
    } else {
      finalClasses = imported.classes;
    }

    site.editorData = {
      ...current,
      globalVariables: finalVariables,
      globalClasses: finalClasses,
    };

    return site.editorData;
  }

  // Import into site-alpha only variables
  simulateImport("site-alpha", {
    version: 2,
    variables: [{ token: "--alpha-new", category: "color", value: "#333333" }],
  });

  // Verify site-alpha updated its variables AND kept its existing classes
  assert.strictEqual(mockWebsites["site-alpha"].editorData.globalVariables[0].token, "--alpha-new");
  assert.strictEqual(mockWebsites["site-alpha"].editorData.globalClasses[0].className, "alpha-box", "Classes preserved on variable import");

  // Verify site-beta was completely untouched!
  assert.strictEqual(mockWebsites["site-beta"].editorData.globalVariables[0].token, "--beta-var", "Site Beta isolated from Site Alpha");
  assert.strictEqual(mockWebsites["site-beta"].editorData.globalClasses[0].className, "beta-box", "Site Beta isolated from Site Alpha");

  // Test merge mode
  simulateImport(
    "site-beta",
    {
      version: 1,
      variables: [{ token: "--beta-merged", category: "color", value: "#444444" }],
    },
    "merge"
  );
  assert.strictEqual(mockWebsites["site-beta"].editorData.globalVariables.length, 2, "Merge mode combined variables");

  console.log("  [PASS] Website isolation and partial update preservation verified");
}

console.log("\n=================================================");
console.log("ALL DESIGN SYSTEM IMPORT/EXPORT TESTS PASSED!");
console.log("=================================================");
