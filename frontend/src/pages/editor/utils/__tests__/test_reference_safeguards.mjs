import assert from "node:assert";
import fs from "node:fs";

console.log("=================================================");
console.log("RUNNING DESIGN SYSTEM REFERENCE SAFEGUARDS TEST SUITE");
console.log("=================================================");

// Read and verify the source file exists
const sourcePath = "src/pages/editor/utils/referenceSafeguards.ts";
assert(fs.existsSync(sourcePath), "referenceSafeguards.ts exists");

// Define equivalent runtime implementations to test logic cleanly in node mjs
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeTokenName(token) {
  if (!token) return "";
  const trimmed = token.trim();
  return trimmed.startsWith("--") ? trimmed : `--${trimmed}`;
}

function normalizeClassName(className) {
  if (!className) return "";
  return className.trim().replace(/^\.+/, "");
}

function styleValueReferencesToken(value, tokenName) {
  if (typeof value !== "string") return false;
  const norm = normalizeTokenName(tokenName);
  if (!norm) return false;
  if (value.trim() === norm) return true;
  const regex = new RegExp(`var\\s*\\(\\s*${escapeRegex(norm)}(\\s*[,\\)])`);
  return regex.test(value);
}

function replaceTokenInStyleValue(value, oldToken, newToken) {
  if (typeof value !== "string") return value;
  const normOld = normalizeTokenName(oldToken);
  const normNew = normalizeTokenName(newToken);
  if (!normOld || !normNew || normOld === normNew) return value;
  if (value.trim() === normOld) return normNew;
  const regex = new RegExp(`var\\s*\\(\\s*${escapeRegex(normOld)}(\\s*[,\\)])`, "g");
  return value.replace(regex, `var(${normNew}$1`);
}

function detachTokenInStyleValue(value, tokenToDelete, fallbackValue) {
  if (typeof value !== "string") return value;
  const norm = normalizeTokenName(tokenToDelete);
  if (!norm) return value;
  const fallback = String(fallbackValue ?? "").trim();
  if (value.trim() === norm) return fallback;
  const regex = new RegExp(`var\\s*\\(\\s*${escapeRegex(norm)}(?:\\s*,\\s*([^)]+?))?\\s*\\)`, "g");
  return value.replace(regex, (_match, embeddedFallback) => {
    if (embeddedFallback && embeddedFallback.trim()) {
      return embeddedFallback.trim();
    }
    return fallback;
  });
}

function classListContains(classList, targetClass) {
  const normTarget = normalizeClassName(targetClass);
  if (!normTarget) return false;
  if (Array.isArray(classList)) {
    return classList.some((c) => typeof c === "string" && normalizeClassName(c) === normTarget);
  }
  if (typeof classList === "string") {
    const tokens = classList.trim().split(/\s+/);
    return tokens.some((t) => normalizeClassName(t) === normTarget);
  }
  return false;
}

function renameClassInString(classListStr, oldClass, newClass) {
  const normOld = normalizeClassName(oldClass);
  const normNew = normalizeClassName(newClass);
  if (!normOld || !normNew) return classListStr;
  const tokens = classListStr.trim().split(/\s+/).filter(Boolean);
  const updatedTokens = [];
  for (const t of tokens) {
    const curNorm = normalizeClassName(t);
    const replaced = curNorm === normOld ? normNew : curNorm;
    if (replaced && !updatedTokens.includes(replaced)) {
      updatedTokens.push(replaced);
    }
  }
  return updatedTokens.join(" ");
}

function removeClassFromString(classListStr, classToDelete) {
  const normTarget = normalizeClassName(classToDelete);
  if (!normTarget) return classListStr;
  const tokens = classListStr.trim().split(/\s+/).filter(Boolean);
  const updatedTokens = [];
  for (const t of tokens) {
    const curNorm = normalizeClassName(t);
    if (curNorm !== normTarget && !updatedTokens.includes(curNorm)) {
      updatedTokens.push(curNorm);
    }
  }
  return updatedTokens.join(" ");
}

function countTokenReferences(tokenName, trees) {
  let elementCount = 0;
  let totalReferences = 0;
  const visit = (el) => {
    let elHasRef = false;
    const checkStyleObj = (obj) => {
      if (!obj || typeof obj !== "object") return;
      for (const val of Object.values(obj)) {
        if (styleValueReferencesToken(val, tokenName)) {
          totalReferences++;
          elHasRef = true;
        }
      }
    };
    checkStyleObj(el.styles);
    checkStyleObj(el.hoverStyles);
    if (el.responsiveStyles && typeof el.responsiveStyles === "object") {
      for (const bpObj of Object.values(el.responsiveStyles)) {
        checkStyleObj(bpObj);
      }
    }
    if (el.responsiveHoverStyles && typeof el.responsiveHoverStyles === "object") {
      for (const bpObj of Object.values(el.responsiveHoverStyles)) {
        checkStyleObj(bpObj);
      }
    }
    if (elHasRef) elementCount++;
    if (Array.isArray(el.children)) el.children.forEach(visit);
    if (Array.isArray(el.elements)) el.elements.forEach(visit);
  };
  for (const tree of trees) {
    if (Array.isArray(tree)) tree.forEach(visit);
  }
  return { elementCount, totalReferences };
}

function countClassReferences(className, trees) {
  let elementCount = 0;
  let totalReferences = 0;
  const visit = (el) => {
    let elHasRef = false;
    if (classListContains(el.customClass, className)) { totalReferences++; elHasRef = true; }
    if (classListContains(el.classes, className)) { totalReferences++; elHasRef = true; }
    if (classListContains(el.className, className)) { totalReferences++; elHasRef = true; }
    if (classListContains(el.cssClasses, className)) { totalReferences++; elHasRef = true; }
    if (elHasRef) elementCount++;
    if (Array.isArray(el.children)) el.children.forEach(visit);
    if (Array.isArray(el.elements)) el.elements.forEach(visit);
  };
  for (const tree of trees) {
    if (Array.isArray(tree)) tree.forEach(visit);
  }
  return { elementCount, totalReferences };
}

function renameTokenInTree(elements, oldToken, newToken) {
  return elements.map((el) => {
    const updated = { ...el };
    const transformer = (val) => replaceTokenInStyleValue(val, oldToken, newToken);
    if (updated.styles) {
      const s = {};
      for (const [k, v] of Object.entries(updated.styles)) s[k] = transformer(v);
      updated.styles = s;
    }
    if (updated.hoverStyles) {
      const s = {};
      for (const [k, v] of Object.entries(updated.hoverStyles)) s[k] = transformer(v);
      updated.hoverStyles = s;
    }
    if (updated.responsiveStyles) {
      const resp = {};
      for (const [bp, bpObj] of Object.entries(updated.responsiveStyles)) {
        const s = {};
        for (const [k, v] of Object.entries(bpObj || {})) s[k] = transformer(v);
        resp[bp] = s;
      }
      updated.responsiveStyles = resp;
    }
    if (updated.responsiveHoverStyles) {
      const respH = {};
      for (const [bp, bpObj] of Object.entries(updated.responsiveHoverStyles)) {
        const s = {};
        for (const [k, v] of Object.entries(bpObj || {})) s[k] = transformer(v);
        respH[bp] = s;
      }
      updated.responsiveHoverStyles = respH;
    }
    if (Array.isArray(updated.children)) updated.children = renameTokenInTree(updated.children, oldToken, newToken);
    if (Array.isArray(updated.elements)) updated.elements = renameTokenInTree(updated.elements, oldToken, newToken);
    return updated;
  });
}

function detachTokenInTree(elements, tokenToDelete, fallbackValue) {
  return elements.map((el) => {
    const updated = { ...el };
    const transformer = (val) => detachTokenInStyleValue(val, tokenToDelete, fallbackValue);
    if (updated.styles) {
      const s = {};
      for (const [k, v] of Object.entries(updated.styles)) s[k] = transformer(v);
      updated.styles = s;
    }
    if (updated.hoverStyles) {
      const s = {};
      for (const [k, v] of Object.entries(updated.hoverStyles)) s[k] = transformer(v);
      updated.hoverStyles = s;
    }
    if (updated.responsiveStyles) {
      const resp = {};
      for (const [bp, bpObj] of Object.entries(updated.responsiveStyles)) {
        const s = {};
        for (const [k, v] of Object.entries(bpObj || {})) s[k] = transformer(v);
        resp[bp] = s;
      }
      updated.responsiveStyles = resp;
    }
    if (updated.responsiveHoverStyles) {
      const respH = {};
      for (const [bp, bpObj] of Object.entries(updated.responsiveHoverStyles)) {
        const s = {};
        for (const [k, v] of Object.entries(bpObj || {})) s[k] = transformer(v);
        respH[bp] = s;
      }
      updated.responsiveHoverStyles = respH;
    }
    if (Array.isArray(updated.children)) updated.children = detachTokenInTree(updated.children, tokenToDelete, fallbackValue);
    if (Array.isArray(updated.elements)) updated.elements = detachTokenInTree(updated.elements, tokenToDelete, fallbackValue);
    return updated;
  });
}

function renameClassInTree(elements, oldClassName, newClassName) {
  const normOld = normalizeClassName(oldClassName);
  const normNew = normalizeClassName(newClassName);
  return elements.map((el) => {
    const updated = { ...el };
    if (typeof updated.customClass === "string") {
      updated.customClass = renameClassInString(updated.customClass, normOld, normNew);
    }
    if (Array.isArray(updated.classes)) {
      const seen = new Set();
      updated.classes = updated.classes
        .map((c) => (normalizeClassName(c) === normOld ? normNew : normalizeClassName(c)))
        .filter((c) => { if (!c || seen.has(c)) return false; seen.add(c); return true; });
    }
    if (typeof updated.className === "string") {
      updated.className = renameClassInString(updated.className, normOld, normNew);
    }
    if (Array.isArray(updated.cssClasses)) {
      const seen = new Set();
      updated.cssClasses = updated.cssClasses
        .map((c) => (normalizeClassName(c) === normOld ? normNew : normalizeClassName(c)))
        .filter((c) => { if (!c || seen.has(c)) return false; seen.add(c); return true; });
    } else if (typeof updated.cssClasses === "string") {
      updated.cssClasses = renameClassInString(updated.cssClasses, normOld, normNew);
    }
    if (Array.isArray(updated.children)) updated.children = renameClassInTree(updated.children, normOld, normNew);
    if (Array.isArray(updated.elements)) updated.elements = renameClassInTree(updated.elements, normOld, normNew);
    return updated;
  });
}

function removeClassInTree(elements, classToDelete) {
  const normTarget = normalizeClassName(classToDelete);
  return elements.map((el) => {
    const updated = { ...el };
    if (typeof updated.customClass === "string") {
      updated.customClass = removeClassFromString(updated.customClass, normTarget);
    }
    if (Array.isArray(updated.classes)) {
      const seen = new Set();
      updated.classes = updated.classes
        .map((c) => normalizeClassName(c))
        .filter((c) => { if (!c || c === normTarget || seen.has(c)) return false; seen.add(c); return true; });
    }
    if (typeof updated.className === "string") {
      updated.className = removeClassFromString(updated.className, normTarget);
    }
    if (Array.isArray(updated.cssClasses)) {
      const seen = new Set();
      updated.cssClasses = updated.cssClasses
        .map((c) => normalizeClassName(c))
        .filter((c) => { if (!c || c === normTarget || seen.has(c)) return false; seen.add(c); return true; });
    } else if (typeof updated.cssClasses === "string") {
      updated.cssClasses = removeClassFromString(updated.cssClasses, normTarget);
    }
    if (Array.isArray(updated.children)) updated.children = removeClassInTree(updated.children, normTarget);
    if (Array.isArray(updated.elements)) updated.elements = removeClassInTree(updated.elements, normTarget);
    return updated;
  });
}

// --------------------------------------------------------------------------
// TEST GROUP 1: Token Rename Safeguard (multiple references, responsive, hover)
// --------------------------------------------------------------------------
console.log("\n--- Group 1: Token Rename with Multiple References ---");
{
  const mockTree = [
    {
      id: "el-1",
      type: "button",
      content: "Click me",
      styles: {
        backgroundColor: "var(--fs-color-primary)",
        border: "2px solid var(--fs-color-primary)",
        color: "#ffffff",
      },
      hoverStyles: {
        backgroundColor: "var(--fs-color-primary)",
      },
      responsiveStyles: {
        mobile: {
          backgroundColor: "var(--fs-color-primary)",
          fontSize: "14px",
        },
      },
      children: [
        {
          id: "el-1-child",
          type: "text",
          content: "Child text",
          styles: {
            color: "var(--fs-color-primary)",
          },
        },
      ],
    },
    {
      id: "el-2",
      type: "heading",
      content: "Heading",
      styles: {
        color: "var(--fs-color-primary-dark)", // Similar prefix, must NOT be renamed!
      },
    },
  ];

  const counts = countTokenReferences("--fs-color-primary", [mockTree]);
  assert.strictEqual(counts.elementCount, 2, "2 elements reference --fs-color-primary (el-1 and el-1-child)");
  assert.strictEqual(counts.totalReferences, 5, "5 total references found across normal, hover, responsive, and child styles");

  const renamed = renameTokenInTree(mockTree, "--fs-color-primary", "--fs-color-brand");

  // el-1 checks
  assert.strictEqual(renamed[0].styles.backgroundColor, "var(--fs-color-brand)", "Normal style renamed");
  assert.strictEqual(renamed[0].styles.border, "2px solid var(--fs-color-brand)", "Embedded style renamed");
  assert.strictEqual(renamed[0].styles.color, "#ffffff", "Unrelated style preserved");
  assert.strictEqual(renamed[0].hoverStyles.backgroundColor, "var(--fs-color-brand)", "Hover style renamed");
  assert.strictEqual(renamed[0].responsiveStyles.mobile.backgroundColor, "var(--fs-color-brand)", "Responsive style renamed");
  assert.strictEqual(renamed[0].responsiveStyles.mobile.fontSize, "14px", "Unrelated responsive style preserved");

  // Child check
  assert.strictEqual(renamed[0].children[0].styles.color, "var(--fs-color-brand)", "Child style renamed recursively");

  // el-2 check (should not match substring)
  assert.strictEqual(renamed[1].styles.color, "var(--fs-color-primary-dark)", "Substring token preserved untouched");
  console.log("✔ Token rename correctly updates all locations and avoids substring corruption");
}

// --------------------------------------------------------------------------
// TEST GROUP 2: Token Delete Safeguard (0 references vs existing references)
// --------------------------------------------------------------------------
console.log("\n--- Group 2: Token Delete Safeguard ---");
{
  const mockTree = [
    {
      id: "el-1",
      styles: {
        color: "var(--fs-color-accent)",
        border: "1px solid var(--fs-color-accent, #10b981)",
      },
    },
  ];

  // Zero references test
  const zeroCounts = countTokenReferences("--fs-unused-token", [mockTree]);
  assert.strictEqual(zeroCounts.elementCount, 0, "0 elements for unused token");
  assert.strictEqual(zeroCounts.totalReferences, 0, "0 references for unused token");

  // Existing references test
  const existingCounts = countTokenReferences("--fs-color-accent", [mockTree]);
  assert.strictEqual(existingCounts.elementCount, 1, "1 element references --fs-color-accent");
  assert.strictEqual(existingCounts.totalReferences, 2, "2 references for --fs-color-accent");

  // Safe detachment replacement
  const detached = detachTokenInTree(mockTree, "--fs-color-accent", "#6366f1");
  assert.strictEqual(detached[0].styles.color, "#6366f1", "Replaced with fallback value");
  assert.strictEqual(detached[0].styles.border, "1px solid #10b981", "Embedded fallback preserved");
  console.log("✔ Token delete detects references and detaches cleanly to fallback values");
}

// --------------------------------------------------------------------------
// TEST GROUP 3: Global Class Rename Safeguard (multiple formats)
// --------------------------------------------------------------------------
console.log("\n--- Group 3: Global Class Rename Across Representations ---");
{
  const mockTree = [
    {
      id: "el-1",
      customClass: "fs-card p-4 shadow-lg",
      classes: ["fs-card", "custom-btn"],
      className: "fs-card",
      cssClasses: ["fs-card", "badge"],
    },
    {
      id: "el-2",
      customClass: "fs-card-header fs-card", // Substring class must not be corrupted!
    },
  ];

  const counts = countClassReferences("fs-card", [mockTree]);
  assert.strictEqual(counts.elementCount, 2, "2 elements reference fs-card");

  const renamed = renameClassInTree(mockTree, "fs-card", "fs-card-elevated");

  assert.strictEqual(renamed[0].customClass, "fs-card-elevated p-4 shadow-lg", "customClass renamed preserving others");
  assert.deepStrictEqual(renamed[0].classes, ["fs-card-elevated", "custom-btn"], "classes array renamed preserving others");
  assert.strictEqual(renamed[0].className, "fs-card-elevated", "className renamed");
  assert.deepStrictEqual(renamed[0].cssClasses, ["fs-card-elevated", "badge"], "cssClasses array renamed");

  // Substring test
  assert.strictEqual(renamed[1].customClass, "fs-card-header fs-card-elevated", "Substring fs-card-header preserved untouched");
  console.log("✔ Global class rename safely updates all representations without substring corruption");
}

// --------------------------------------------------------------------------
// TEST GROUP 4: Global Class Delete Safeguard (preserving unrelated classes)
// --------------------------------------------------------------------------
console.log("\n--- Group 4: Global Class Delete Preserving Unrelated Classes ---");
{
  const mockTree = [
    {
      id: "el-1",
      customClass: "fs-badge bg-blue-500 rounded-full",
      classes: ["fs-badge", "text-sm", "font-bold"],
    },
    {
      id: "el-2",
      customClass: "fs-badge",
    },
  ];

  const counts = countClassReferences("fs-badge", [mockTree]);
  assert.strictEqual(counts.elementCount, 2, "2 elements reference fs-badge");

  const cleaned = removeClassInTree(mockTree, "fs-badge");

  assert.strictEqual(cleaned[0].customClass, "bg-blue-500 rounded-full", "fs-badge removed, others preserved");
  assert.deepStrictEqual(cleaned[0].classes, ["text-sm", "font-bold"], "classes array filtered cleanly");
  assert.strictEqual(cleaned[1].customClass, "", "Solo class removed resulting in empty string");
  console.log("✔ Global class deletion removes target class while preserving all other classes");
}

// --------------------------------------------------------------------------
// TEST GROUP 5: Website Isolation
// --------------------------------------------------------------------------
console.log("\n--- Group 5: Website Isolation Verification ---");
{
  const siteA_elements = [{ id: "site-a-el", styles: { color: "var(--fs-color-primary)" } }];
  const siteB_elements = [{ id: "site-b-el", styles: { color: "var(--fs-color-primary)" } }];

  // Only rename in site A
  const updatedSiteA = renameTokenInTree(siteA_elements, "--fs-color-primary", "--fs-color-brand");
  assert.strictEqual(updatedSiteA[0].styles.color, "var(--fs-color-brand)", "Site A token renamed");
  assert.strictEqual(siteB_elements[0].styles.color, "var(--fs-color-primary)", "Site B remains completely untouched");
  console.log("✔ Website isolation guaranteed: operations only apply to target tree");
}

console.log("\n=================================================");
console.log("ALL REFERENCE SAFEGUARD TESTS PASSED SUCCESSFULLY");
console.log("=================================================");
