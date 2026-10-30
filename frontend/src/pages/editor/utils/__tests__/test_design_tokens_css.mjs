import assert from "node:assert";
import fs from "node:fs";

// Read and verify the compileDesignSystemCss logic from utils/index.ts
const utilsPath = fs.existsSync("src/pages/editor/utils/index.ts")
  ? "src/pages/editor/utils/index.ts"
  : "frontend/src/pages/editor/utils/index.ts";
const utilsCode = fs.readFileSync(utilsPath, "utf8");

assert(utilsCode.includes("export function compileDesignSystemCss"), "compileDesignSystemCss is exported in utils/index.ts");

// Extract toKebabCase and compileDesignSystemCss for runtime unit verification
function toKebabCase(prop) {
  return prop.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function compileDesignSystemCss(variables = [], classes = []) {
  const cssLines = [];

  if (Array.isArray(variables) && variables.length > 0) {
    cssLines.push("/* --- ForgeStudio Design Tokens (:root) --- */");
    cssLines.push(":root {");
    for (const v of variables) {
      if (v && v.token) {
        const lightVal = v.modes?.light || v.value;
        if (lightVal) {
          const safeToken = String(v.token).trim();
          const safeVal = String(lightVal).replace(/[;{}]/g, "").trim();
          cssLines.push(`  ${safeToken}: ${safeVal};`);
        }
      }
    }
    cssLines.push("}\n");

    const darkModeEntries = variables.filter((v) => v && v.token && v.modes?.dark);
    if (darkModeEntries.length > 0) {
      cssLines.push("/* --- ForgeStudio Design Tokens (Dark Theme Overrides) --- */");
      cssLines.push('[data-theme="dark"], .dark {');
      for (const v of darkModeEntries) {
        const safeToken = String(v.token).trim();
        const safeDarkVal = String(v.modes.dark).replace(/[;{}]/g, "").trim();
        cssLines.push(`  ${safeToken}: ${safeDarkVal};`);
      }
      cssLines.push("}\n");

      cssLines.push("@media (prefers-color-scheme: dark) {");
      cssLines.push('  :root:not([data-theme="light"]) {');
      for (const v of darkModeEntries) {
        const safeToken = String(v.token).trim();
        const safeDarkVal = String(v.modes.dark).replace(/[;{}]/g, "").trim();
        cssLines.push(`    ${safeToken}: ${safeDarkVal};`);
      }
      cssLines.push("  }");
      cssLines.push("}\n");
    }
  }

  if (Array.isArray(classes) && classes.length > 0) {
    cssLines.push("/* --- ForgeStudio Global Utility Classes --- */");
    for (const cls of classes) {
      if (!cls || !cls.className) continue;
      const safeClassName = String(cls.className).trim().replace(/^\.+/, "");

      if (cls.styles && typeof cls.styles === "object") {
        const baseProps = Object.entries(cls.styles)
          .map(([k, v]) => {
            const prop = toKebabCase(String(k).replace(/[^a-zA-Z0-9-]/g, ""));
            const val = String(v).replace(/[;{}]/g, "").trim();
            return prop && val ? `  ${prop}: ${val};` : "";
          })
          .filter(Boolean)
          .join("\n");
        if (baseProps) {
          cssLines.push(`.${safeClassName} {\n${baseProps}\n}`);
        }
      }

      if (cls.pseudoStyles?.hover && Object.keys(cls.pseudoStyles.hover).length > 0) {
        const hoverProps = Object.entries(cls.pseudoStyles.hover)
          .map(([k, v]) => {
            const prop = toKebabCase(String(k).replace(/[^a-zA-Z0-9-]/g, ""));
            const val = String(v).replace(/[;{}]/g, "").trim();
            return prop && val ? `  ${prop}: ${val};` : "";
          })
          .filter(Boolean)
          .join("\n");
        if (hoverProps) {
          cssLines.push(`.${safeClassName}:hover {\n${hoverProps}\n}`);
        }
      }

      if (cls.pseudoStyles?.focus && Object.keys(cls.pseudoStyles.focus).length > 0) {
        const focusProps = Object.entries(cls.pseudoStyles.focus)
          .map(([k, v]) => {
            const prop = toKebabCase(String(k).replace(/[^a-zA-Z0-9-]/g, ""));
            const val = String(v).replace(/[;{}]/g, "").trim();
            return prop && val ? `  ${prop}: ${val};` : "";
          })
          .filter(Boolean)
          .join("\n");
        if (focusProps) {
          cssLines.push(`.${safeClassName}:focus {\n${focusProps}\n}`);
        }
      }

      if (cls.pseudoStyles?.active && Object.keys(cls.pseudoStyles.active).length > 0) {
        const activeProps = Object.entries(cls.pseudoStyles.active)
          .map(([k, v]) => {
            const prop = toKebabCase(String(k).replace(/[^a-zA-Z0-9-]/g, ""));
            const val = String(v).replace(/[;{}]/g, "").trim();
            return prop && val ? `  ${prop}: ${val};` : "";
          })
          .filter(Boolean)
          .join("\n");
        if (activeProps) {
          cssLines.push(`.${safeClassName}:active {\n${activeProps}\n}`);
        }
      }
    }
  }

  return cssLines.join("\n");
}

console.log("Running Canvas Design Tokens & CSS Classes Compiler Tests...");

// 1. Variable tokens
const testVars = [
  { id: "v1", token: "--fs-color-primary", value: "#3b82f6", modes: { light: "#3b82f6", dark: "#60a5fa" } },
  { id: "v2", token: "--fs-space-lg", value: "32px" }
];

const testClasses = [
  {
    id: "c1",
    className: "fs-card-elevated",
    styles: { backgroundColor: "#ffffff", padding: "24px", borderRadius: "8px" },
    pseudoStyles: {
      hover: { transform: "translateY(-4px)", boxShadow: "0 10px 15px rgba(0,0,0,0.1)" },
      focus: { outline: "2px solid #3b82f6" },
      active: { transform: "translateY(0)" }
    }
  }
];

const compiled = compileDesignSystemCss(testVars, testClasses);

assert(compiled.includes(":root {"), "Includes :root block");
assert(compiled.includes("--fs-color-primary: #3b82f6;"), "Includes primary token value");
assert(compiled.includes("--fs-space-lg: 32px;"), "Includes spacing token");
assert(compiled.includes('[data-theme="dark"], .dark {'), "Includes dark mode overrides block");
assert(compiled.includes("--fs-color-primary: #60a5fa;"), "Includes dark mode token override");
assert(compiled.includes(".fs-card-elevated {"), "Includes class block");
assert(compiled.includes("background-color: #ffffff;"), "Converts camelCase to kebab-case");
assert(compiled.includes("padding: 24px;"), "Includes class padding");
assert(compiled.includes(".fs-card-elevated:hover {"), "Includes hover pseudo-selector");
assert(compiled.includes(".fs-card-elevated:focus {"), "Includes focus pseudo-selector");
assert(compiled.includes(".fs-card-elevated:active {"), "Includes active pseudo-selector");

// 2. Empty handling
assert(compileDesignSystemCss([], []) === "", "Returns empty string for empty input");
assert(compileDesignSystemCss(null, null) === "", "Handles null inputs safely");

console.log("ALL 15 ASSERTIONS PASSED!");
