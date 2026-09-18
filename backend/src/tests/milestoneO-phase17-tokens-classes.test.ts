import { prisma } from "../config/prisma.js";
import {
  sanitizeTokenName,
  sanitizeClassName,
  validateVariables,
  validateClasses,
  compileDesignSystemCss,
  exportDesignSystem,
  importDesignSystem,
  type DesignVariable,
  type GlobalClass,
} from "../services/tokens/designToken.service.js";
import { compileCanonicalToStaticBundle } from "../services/destinations/staticCompiler.js";
import { createWebsite } from "../services/website.service.js";

const db = prisma as any;

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`, details || "");
    failed++;
  }
}

async function runMilestoneOTests() {
  console.log("=================================================");
  console.log("RUNNING FORGESTUDIO MILESTONE O VERIFICATION SUITE");
  console.log("Global Design System, Tokens & Classes (Phase 17)");
  console.log("=================================================\n");

  let testUser: any = null;
  let testWebsite: any = null;

  try {
    // 0. Setup test user & website
    const email = `phase17_tokens_${Date.now()}@example.com`;
    testUser = await db.user.create({
      data: {
        email,
        passwordHash: "hash_test",
        fullName: "Phase 17 Token Architect",
        role: "USER",
      },
    });

    testWebsite = await createWebsite({
      name: "Phase 17 Design System Site",
      slug: `phase17-tokens-${Date.now()}`,
      userId: testUser.id,
    });

    // 1. Token & Class Sanitization (F-339, F-340)
    console.log("\n--- Group 1: Token & Class Identifier Sanitization ---");
    assert(sanitizeTokenName("color-primary") === "--color-primary", "sanitizeTokenName auto-prepends -- prefix");
    assert(sanitizeTokenName("--fs-accent") === "--fs-accent", "sanitizeTokenName preserves valid -- prefix");
    const sanitizedTestToken = sanitizeTokenName("Bad Token!! <script>");
    assert(sanitizedTestToken.startsWith("--bad-token-") && !sanitizedTestToken.includes("<") && !sanitizedTestToken.includes("!"), "sanitizeTokenName strips dangerous characters");
    assert(sanitizeClassName(".btn-primary") === "btn-primary", "sanitizeClassName removes leading dot");
    assert(sanitizeClassName("fs card-elevated 123") === "fs-card-elevated-123", "sanitizeClassName converts spaces to hyphens");

    // 2. Variables Validation & Anti-CSS Injection (F-339)
    console.log("\n--- Group 2: Variable Token Validation ---");
    const rawVariables = [
      {
        id: "var-1",
        name: "Brand Primary",
        category: "color",
        token: "--fs-color-primary",
        value: "#6366f1; color: red;", // CSS injection attempt
      },
      {
        id: "var-2",
        name: "Base Spacing",
        category: "spacing",
        token: "fs-space-md",
        value: "1.5rem",
      },
      {
        id: "var-3",
        name: "Invalid Category Token",
        category: "non_existent_category",
        token: "--fs-custom-font",
        value: "Inter, sans-serif",
      },
    ];

    const validatedVars = validateVariables(rawVariables);
    assert(validatedVars.length === 3, "All valid object entries parsed");
    assert(validatedVars[0].value === "#6366f1 color: red", "Semicolons and curly braces sanitized from variable value");
    assert(validatedVars[1].token === "--fs-space-md", "Token name normalized with -- prefix");
    assert(validatedVars[2].category === "custom", "Fallback category 'custom' assigned to unknown category");

    // 3. Global Classes Validation & Pseudo Styles (F-340, F-341)
    console.log("\n--- Group 3: Global Class Validation & Pseudo Classes ---");
    const rawClasses = [
      {
        id: "cls-1",
        name: "Elevated Card",
        className: "fs-card-elevated",
        description: "Surface with shadow and padding",
        styles: {
          backgroundColor: "#ffffff",
          padding: "24px",
          borderRadius: "12px",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
        },
        pseudoStyles: {
          hover: {
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.2)",
            transform: "translateY(-2px)",
          },
          active: {
            transform: "translateY(0px)",
          },
        },
        createdByRole: "DESIGNER",
      },
    ];

    const validatedClasses = validateClasses(rawClasses);
    assert(validatedClasses.length === 1, "Global class validated successfully");
    assert(validatedClasses[0].className === "fs-card-elevated", "Class name preserved and validated");
    assert(validatedClasses[0].pseudoStyles?.hover?.boxShadow !== undefined, "Pseudo hover styles retained");
    assert(validatedClasses[0].pseudoStyles?.active?.transform === "translateY(0px)", "Pseudo active styles retained");

    // 4. CSS Compilation Engine (F-344)
    console.log("\n--- Group 4: CSS Compilation (:root & Classes) ---");
    const compiledCss = compileDesignSystemCss(validatedVars, validatedClasses);
    assert(compiledCss.includes(":root {"), "Generated CSS includes :root block for tokens");
    assert(compiledCss.includes("--fs-color-primary: #6366f1 color: red;"), "Generated CSS outputs variable token definitions");
    assert(compiledCss.includes(".fs-card-elevated {"), "Generated CSS outputs class block");
    assert(compiledCss.includes("background-color: #ffffff;"), "CamelCase converted to kebab-case in class properties");
    assert(compiledCss.includes(".fs-card-elevated:hover {"), "Generated CSS outputs hover pseudo-class block");
    assert(compiledCss.includes(".fs-card-elevated:active {"), "Generated CSS outputs active pseudo-class block");

    // 5. Design System Export & Import JSON Format (F-342, F-343)
    console.log("\n--- Group 5: Design Token JSON Export & Import ---");
    const exportedPayload = exportDesignSystem(validatedVars, validatedClasses);
    assert(exportedPayload.version === 1, "Export payload includes schema version");
    assert(Array.isArray(exportedPayload.variables) && exportedPayload.variables.length === 3, "Exported variables match validated count");
    assert(Array.isArray(exportedPayload.classes) && exportedPayload.classes.length === 1, "Exported classes match validated count");

    const jsonString = JSON.stringify(exportedPayload);
    const importedResult = importDesignSystem(jsonString);
    assert(importedResult.variables.length === 3, "Import parsed 3 variables");
    assert(importedResult.classes.length === 1, "Import parsed 1 class");
    assert(importedResult.compiledCss.includes(".fs-card-elevated"), "Import compiled valid CSS string");

    // 6. Tri-Renderer Static Compiler Integration (F-344)
    console.log("\n--- Group 6: Static Compiler Integration ---");
    const testCanonicalData = {
      name: "Token Site",
      slug: "token-site",
      globalStyles: {
        colors: { primary: "#4f46e5" },
        typography: { fontFamily: "Outfit, sans-serif" },
      },
      globalVariables: validatedVars,
      globalClasses: validatedClasses,
      pages: [
        {
          id: "home",
          title: "Home",
          slug: "",
          isHome: true,
          elements: [
            {
              id: "el-card-1",
              type: "container",
              className: "fs-card-elevated",
              styles: {
                backgroundColor: "var(--fs-color-primary)",
              },
              children: [
                {
                  id: "el-title-1",
                  type: "heading",
                  level: 2,
                  content: "Design Tokens in Action",
                  styles: { color: "#ffffff" },
                },
              ],
            },
          ],
        },
      ],
    };

    const bundle = compileCanonicalToStaticBundle(testWebsite.id, 1, testCanonicalData);
    assert(bundle.files.length >= 3, "Static bundle compiles index.html, styles.css, runtime.js, site-manifest.json");

    const stylesFile = bundle.files.find((f) => f.path === "styles.css");
    assert(!!stylesFile, "styles.css generated in bundle");
    assert(stylesFile!.content.includes("--fs-color-primary"), "styles.css contains custom CSS variable tokens");
    assert(stylesFile!.content.includes(".fs-card-elevated"), "styles.css contains global utility class definitions");
    assert(stylesFile!.content.includes(".fs-card-elevated:hover"), "styles.css contains pseudo hover rules");

    const indexHtmlFile = bundle.files.find((f) => f.path === "index.html");
    assert(!!indexHtmlFile, "index.html generated in bundle");
    assert(indexHtmlFile!.content.includes("fs-card-elevated"), "index.html element applies global class");

    // 7. Database Persistence in Website.editorData
    console.log("\n--- Group 7: Database Persistence & Retrieval ---");
    const updatedEditorData = {
      version: 1,
      globalVariables: validatedVars,
      globalClasses: validatedClasses,
      elements: [],
    };

    const savedSite = await db.website.update({
      where: { id: testWebsite.id },
      data: { editorData: updatedEditorData },
    });

    const retrievedEditorData = savedSite.editorData as any;
    assert(Array.isArray(retrievedEditorData.globalVariables) && retrievedEditorData.globalVariables.length === 3, "Website editorData persists globalVariables");
    assert(Array.isArray(retrievedEditorData.globalClasses) && retrievedEditorData.globalClasses.length === 1, "Website editorData persists globalClasses");
    assert(retrievedEditorData.globalVariables[0].token === "--fs-color-primary", "Variable token preserved accurately in PostgreSQL JSONB");

  } catch (err: any) {
    console.error("Unexpected error in Milestone O test suite:", err);
    failed++;
  } finally {
    // Cleanup
    try {
      if (testWebsite) await db.website.delete({ where: { id: testWebsite.id } });
      if (testUser) await db.user.delete({ where: { id: testUser.id } });
    } catch {}
  }

  console.log("\n=================================================");
  console.log(`MILESTONE O TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runMilestoneOTests().then(() => process.exit(0)).catch((err) => {
  console.error("Suite failed to run:", err);
  process.exit(1);
});
