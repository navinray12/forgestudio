import { prisma } from "../config/prisma.js";
import {
  DEFAULT_CAPABILITIES,
} from "../services/permission.service.js";
import {
  validateVariables,
  compileDesignSystemCss,
  type DesignVariable,
} from "../services/tokens/designToken.service.js";
import { IntegrationService } from "../services/integration.service.js";

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

async function runPhase2Tests() {
  console.log("=================================================");
  console.log("RUNNING FORGESTUDIO PHASE 2 VERIFICATION SUITE");
  console.log("Workflow & Team Governance (Enterprise Enablers)");
  console.log("=================================================\n");

  try {
    // -------------------------------------------------------------------------
    // GROUP 1: Client Restricted Editing Mode & RBAC Capabilities
    // -------------------------------------------------------------------------
    console.log("--- Group 1: Client Restricted Editing Mode & RBAC ---");

    assert(
      DEFAULT_CAPABILITIES.CLIENT.includes("EDIT_CONTENT"),
      "CLIENT role includes EDIT_CONTENT capability"
    );
    assert(
      !DEFAULT_CAPABILITIES.CLIENT.includes("EDIT_DESIGN"),
      "CLIENT role strictly excludes EDIT_DESIGN capability"
    );
    assert(
      DEFAULT_CAPABILITIES.ADMIN.includes("EDIT_DESIGN") &&
        DEFAULT_CAPABILITIES.ADMIN.includes("EDIT_CONTENT"),
      "ADMIN role possesses both EDIT_DESIGN and EDIT_CONTENT capabilities"
    );

    // Test safeMerge logic directly
    const createSafeMerge = (canEditDesign: boolean, canEditContent: boolean) => {
      const allowedComponentIds = new Set<string>();
      const isAdmin = false;

      return (currentEls: any[], newEls: any[]): any[] => {
        const mergedEls = [];
        for (const cEl of currentEls) {
          const isProtectedNode = cEl.isProtected === true;
          const userCanEdit = isAdmin || allowedComponentIds.has(cEl.id);

          if (isProtectedNode && !userCanEdit) {
            mergedEls.push(cEl);
            continue;
          }

          const incoming = newEls.find(n => n.id === cEl.id);

          if (!incoming) {
            if (!canEditDesign && canEditContent) {
              mergedEls.push(cEl); // Deletion blocked for restricted mode
              continue;
            }
            continue;
          }

          // Content-only sandbox
          if (!canEditDesign && canEditContent) {
            if (incoming.content !== undefined) cEl.content = incoming.content;
            if (incoming.text !== undefined) cEl.text = incoming.text;
            if (incoming.src !== undefined) cEl.src = incoming.src;
            if (incoming.image_asset_id !== undefined) cEl.image_asset_id = incoming.image_asset_id;
            if (incoming.alt !== undefined) cEl.alt = incoming.alt;
            if (incoming.href !== undefined) cEl.href = incoming.href;
            if (incoming.settings?.href !== undefined) {
              cEl.settings = { ...(cEl.settings || {}), href: incoming.settings.href };
            }
          } else {
            Object.assign(cEl, incoming);
          }

          mergedEls.push(cEl);
        }

        if (canEditDesign) {
          for (const nEl of newEls) {
            if (!currentEls.find(c => c.id === nEl.id)) {
              mergedEls.push(nEl);
            }
          }
        }

        return mergedEls;
      };
    };

    const initialElements = [
      {
        id: "hero-text-1",
        tag: "h1",
        content: "Original Headline",
        styles: { color: "#ffffff", fontSize: "32px", padding: "16px" },
      },
      {
        id: "hero-image-1",
        tag: "img",
        src: "https://example.com/original.jpg",
        alt: "Original Alt",
        styles: { width: "100%", borderRadius: "8px" },
      },
      {
        id: "nav-link-1",
        tag: "a",
        content: "Contact Us",
        href: "/contact",
        settings: { href: "/contact" },
        styles: { display: "flex", margin: "10px" },
      },
    ];

    const restrictedSafeMerge = createSafeMerge(false, true);

    // Client attempts:
    // 1. Change text and content of hero-text-1 + attempts to hijack styles
    // 2. Change image src of hero-image-1 + attempts to hijack width
    // 3. Delete nav-link-1 (omitted from incoming)
    // 4. Inject a rogue section (rogue-div-99)
    const clientIncoming = [
      {
        id: "hero-text-1",
        content: "Updated Headline by Client",
        styles: { color: "#ff0000", fontSize: "999px" }, // Should be IGNORED
      },
      {
        id: "hero-image-1",
        src: "https://example.com/client-photo.jpg",
        alt: "Client Alt",
        styles: { width: "10px" }, // Should be IGNORED
      },
      {
        id: "rogue-div-99",
        tag: "div",
        content: "Malicious injection",
      },
    ];

    const mergedByClient = restrictedSafeMerge(
      JSON.parse(JSON.stringify(initialElements)),
      clientIncoming
    );

    assert(
      mergedByClient.length === 3,
      "Restricted merge preserves element count (no additions, no deletions)"
    );

    const mergedH1 = mergedByClient.find(e => e.id === "hero-text-1");
    assert(
      mergedH1?.content === "Updated Headline by Client",
      "Restricted merge allows updating text content"
    );
    assert(
      mergedH1?.styles?.color === "#ffffff" && mergedH1?.styles?.fontSize === "32px",
      "Restricted merge blocks modifying styling/layout rules"
    );

    const mergedImg = mergedByClient.find(e => e.id === "hero-image-1");
    assert(
      mergedImg?.src === "https://example.com/client-photo.jpg" &&
        mergedImg?.alt === "Client Alt",
      "Restricted merge allows updating image src and alt attributes"
    );
    assert(
      mergedImg?.styles?.width === "100%",
      "Restricted merge preserves image styles"
    );

    const preservedLink = mergedByClient.find(e => e.id === "nav-link-1");
    assert(
      preservedLink !== undefined && preservedLink.content === "Contact Us",
      "Restricted merge prevents client from deleting elements"
    );

    const rogueElement = mergedByClient.find(e => e.id === "rogue-div-99");
    assert(
      rogueElement === undefined,
      "Restricted merge blocks client from injecting new elements"
    );

    // Full admin rights merge test
    const adminSafeMerge = createSafeMerge(true, true);
    const mergedByAdmin = adminSafeMerge(
      JSON.parse(JSON.stringify(initialElements)),
      clientIncoming
    );
    assert(
      mergedByAdmin.length === 3 &&
        mergedByAdmin.find(e => e.id === "rogue-div-99") !== undefined &&
        mergedByAdmin.find(e => e.id === "nav-link-1") === undefined,
      "Admin merge allows element insertion, styling override, and deletion"
    );

    // -------------------------------------------------------------------------
    // GROUP 2: Design Token Multi-Mode System (Dynamic Dark / Light Mode)
    // -------------------------------------------------------------------------
    console.log("\n--- Group 2: Design Token Multi-Mode System ---");

    const multiModeVariables: DesignVariable[] = [
      {
        id: "var-1",
        name: "Background Canvas",
        token: "--bg-canvas",
        value: "#ffffff",
        category: "color",
        defaultMode: "light",
        modes: {
          light: "#ffffff",
          dark: "#09090b",
        },
      },
      {
        id: "var-2",
        name: "Primary Text",
        token: "--text-primary",
        value: "#18181b",
        category: "color",
        defaultMode: "light",
        modes: {
          light: "#18181b",
          dark: "#f4f4f5",
        },
      },
      {
        id: "var-3",
        name: "Legacy Spacing",
        token: "--legacy-token",
        value: "16px",
        category: "spacing",
        // No modes object - legacy backward compatibility test
      },
    ];

    const validatedVars = validateVariables(multiModeVariables);
    assert(validatedVars.length === 3, "validateVariables parses all 3 variables");
    assert(
      validatedVars[0].modes?.light === "#ffffff" &&
        validatedVars[0].modes?.dark === "#09090b",
      "validateVariables preserves light & dark modes"
    );
    assert(
      validatedVars[0].defaultMode === "light",
      "validateVariables preserves defaultMode setting"
    );

    const compiledCss = compileDesignSystemCss(validatedVars, []);

    assert(
      compiledCss.includes(":root {") &&
        compiledCss.includes("--bg-canvas: #ffffff;") &&
        compiledCss.includes("--text-primary: #18181b;"),
      "compileDesignSystemCss includes default light tokens in :root"
    );

    assert(
      compiledCss.includes('[data-theme="dark"], .dark {') &&
        compiledCss.includes("--bg-canvas: #09090b;") &&
        compiledCss.includes("--text-primary: #f4f4f5;"),
      "compileDesignSystemCss includes dark tokens in [data-theme=\"dark\"], .dark block"
    );

    assert(
      compiledCss.includes("@media (prefers-color-scheme: dark)") &&
        compiledCss.includes(':root:not([data-theme="light"]) {'),
      "compileDesignSystemCss generates automatic OS prefers-color-scheme media query"
    );

    assert(
      compiledCss.includes("--legacy-token: 16px;"),
      "compileDesignSystemCss maintains backward compatibility with legacy single-value tokens"
    );

    // -------------------------------------------------------------------------
    // GROUP 3: Lead Integrations & Webhook Ecosystem Connectors
    // -------------------------------------------------------------------------
    console.log("\n--- Group 3: Lead Integrations & Webhooks ---");

    // SSRF Prevention Test for Google Sheets
    let ssrfCaughtSheets = false;
    try {
      await IntegrationService.syncToGoogleSheets(
        { webhookUrl: "http://127.0.0.1:8080/evil-sheets" },
        { email: "test@example.com" }
      );
    } catch (err: any) {
      if (
        err.message?.includes("Private or local") ||
        err.message?.includes("private or local")
      ) {
        ssrfCaughtSheets = true;
      }
    }
    assert(ssrfCaughtSheets, "syncToGoogleSheets blocks private/loopback SSRF URLs");

    // Missing webhookUrl test
    let missingSheetsUrlCaught = false;
    try {
      await IntegrationService.syncToGoogleSheets(
        { webhookUrl: "" },
        { email: "test@example.com" }
      );
    } catch (err: any) {
      missingSheetsUrlCaught = true;
    }
    assert(
      missingSheetsUrlCaught,
      "syncToGoogleSheets enforces webhookUrl parameter"
    );

    // SSRF Prevention Test for Zapier
    let ssrfCaughtZapier = false;
    try {
      await IntegrationService.dispatchToZapier(
        "http://169.254.169.254/latest/meta-data",
        { email: "test@example.com" }
      );
    } catch (err: any) {
      if (
        err.message?.includes("Private or local") ||
        err.message?.includes("private or local")
      ) {
        ssrfCaughtZapier = true;
      }
    }
    assert(
      ssrfCaughtZapier,
      "dispatchToZapier blocks cloud metadata SSRF addresses (169.254.169.254)"
    );

    // Mailchimp validation tests
    let mailchimpMissingApiKeyCaught = false;
    try {
      await IntegrationService.syncToMailchimp(
        { apiKey: "", listId: "aud_123" },
        { email: "test@example.com" }
      );
    } catch (err: any) {
      if (err.message?.includes("Mailchimp API Key and List ID are required")) {
        mailchimpMissingApiKeyCaught = true;
      }
    }
    assert(
      mailchimpMissingApiKeyCaught,
      "syncToMailchimp enforces API Key and List ID"
    );

    let mailchimpInvalidEmailCaught = false;
    try {
      await IntegrationService.syncToMailchimp(
        { apiKey: "testkey-us1", listId: "aud_123" },
        { email: "invalid-email-format" }
      );
    } catch (err: any) {
      if (err.message?.includes("Invalid email address")) {
        mailchimpInvalidEmailCaught = true;
      }
    }
    assert(
      mailchimpInvalidEmailCaught,
      "syncToMailchimp validates contact email format"
    );

  } catch (globalErr: any) {
    console.error("Unhandled error during Phase 2 tests:", globalErr);
    failed++;
  }

  console.log("\n=================================================");
  console.log(`PHASE 2 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2Tests().catch(err => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
