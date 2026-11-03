import type { WebsiteKit } from "../types/websiteKit.types";
import { WEBSITE_KITS } from "../data/websiteKitsData";
import { buildCanonicalEditorDataFromKit } from "../../templates/utils/websiteKitValidation";

export interface ApplyKitResult {
  success: boolean;
  message: string;
  website?: any;
  editorData?: any;
}

export interface ApplyWebsiteKitOptions {
  confirmOverwrite?: boolean;
  hasUnsavedChanges?: boolean;
  isAutosaving?: boolean;
}

/**
 * Retrieves all available Website Kits from the local curated catalog.
 * Avoids unnecessary network calls to unmounted backend routes while preserving signature.
 */
export async function getWebsiteKits(_apiUrl?: string): Promise<WebsiteKit[]> {
  return WEBSITE_KITS;
}

/**
 * Applies a Website Kit to a target website using real database persistence
 * and optimistic concurrency control (CAS).
 *
 * Never returns fake success on error, network rejection, or missing target.
 */
export async function applyWebsiteKit(
  apiUrl: string,
  kit: WebsiteKit,
  targetWebsiteId?: string,
  options?: ApplyWebsiteKitOptions
): Promise<ApplyKitResult> {
  // 1. Guard against unsaved editor state or active autosave
  if (options?.isAutosaving) {
    throw new Error("Cannot apply Website Kit: An autosave operation is currently in progress. Please wait for it to complete.");
  }
  if (options?.hasUnsavedChanges) {
    throw new Error("Cannot apply Website Kit: You have unsaved editor changes. Please save or resolve your changes before applying a kit.");
  }

  // 2. Target Website Validation
  const trimmedSiteId = (targetWebsiteId || "").trim();
  if (!trimmedSiteId) {
    throw new Error("Unable to apply Website Kit: No target website selected or active.");
  }

  // 3. Kit Structure Validation
  if (!kit || typeof kit !== "object" || !Array.isArray(kit.pages) || kit.pages.length === 0) {
    throw new Error("Invalid Website Kit structure: Kit must contain at least one valid page.");
  }

  // 4. Read current website state and revision from backend
  let currentWebsite: any = null;
  try {
    const getRes = await fetch(`${apiUrl}/api/websites/${trimmedSiteId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!getRes.ok) {
      if (getRes.status === 404) {
        throw new Error(`Target website not found (ID: ${trimmedSiteId}).`);
      }
      if (getRes.status === 403) {
        throw new Error("You do not have permission to view or modify this website.");
      }
      const errData = await getRes.json().catch(() => ({}));
      throw new Error(errData?.message || `Failed to fetch target website (HTTP ${getRes.status}).`);
    }

    const getData = await getRes.json().catch(() => ({}));
    currentWebsite = getData?.website || getData;
  } catch (fetchErr: any) {
    if (fetchErr.message && !fetchErr.message.includes("fetch")) {
      throw fetchErr;
    }
    throw new Error(`Network error: Unable to connect to server at ${apiUrl}. Kit was not applied.`);
  }

  if (!currentWebsite || typeof currentWebsite !== "object" || !currentWebsite.id) {
    throw new Error("Website fetch failed: Server returned an invalid website record.");
  }

  // Validate that returned ID matches expected ID
  if (currentWebsite.id !== trimmedSiteId) {
    throw new Error(`Website fetch failed: Server returned mismatched website ID "${currentWebsite.id}".`);
  }

  // Fix 3: Strict positive integer revision validation (no guessing or fallback to 1)
  if (
    typeof currentWebsite.version !== "number" ||
    !Number.isInteger(currentWebsite.version) ||
    currentWebsite.version < 1
  ) {
    throw new Error(
      `Target website revision is invalid or missing (version: ${currentWebsite.version}). Kit was not applied.`
    );
  }
  const expectedVersion = currentWebsite.version;

  // Fix 1: Inspect existing website content and prevent silent destructive overwrite
  const existingPages = currentWebsite.editorData?.pages;
  const existingElements = currentWebsite.editorData?.elements;
  const siteHasExistingContent =
    (Array.isArray(existingPages) &&
      existingPages.some((p: any) => Array.isArray(p.elements) && p.elements.length > 0)) ||
    (Array.isArray(existingElements) && existingElements.length > 0);

  if (siteHasExistingContent && !options?.confirmOverwrite) {
    throw new Error(
      "Target website contains existing content. Explicit confirmation is required before replacing website pages and layout."
    );
  }

  // 5. Adapt Kit Pages and Styles into Canonical Editor Data Schema
  const kitPayload = {
    website: {
      name: currentWebsite.name || kit.name,
      description: kit.description,
      settings: {
        backgroundColor: kit.globalStyles?.backgroundColor || "#ffffff",
        siteLanguage: "en",
        ...(currentWebsite.editorData?.globalSettings || {}),
      },
    },
    pages: kit.pages.map((p, idx) => ({
      id: p.id || `page_${idx + 1}`,
      title: p.title,
      name: p.title,
      slug: p.slug.startsWith("/") ? p.slug : (p.slug === "home" ? "/" : `/${p.slug}`),
      path: p.slug.startsWith("/") ? p.slug : (p.slug === "home" ? "/" : `/${p.slug}`),
      isHome: idx === 0 || p.slug === "home" || p.slug === "/",
      elements: Array.isArray(p.elements) ? JSON.parse(JSON.stringify(p.elements)) : [],
      pageSettings: {
        title: p.title,
        path: p.slug.startsWith("/") ? p.slug : (p.slug === "home" ? "/" : `/${p.slug}`),
      },
    })),
    globalStyles: kit.globalStyles ? JSON.parse(JSON.stringify(kit.globalStyles)) : undefined,
    globalSettings: {
      siteIdentity: { name: currentWebsite.name || kit.name },
      backgroundColor: kit.globalStyles?.backgroundColor || "#ffffff",
      ...(currentWebsite.editorData?.globalSettings || {}),
    },
  };

  const canonicalEditorData = buildCanonicalEditorDataFromKit(
    kitPayload,
    currentWebsite.name || kit.name
  );

  // Preserve published release snapshots, deployment, breakpoints, and siteParts if present
  if (currentWebsite.editorData?.publishing) {
    canonicalEditorData.publishing = JSON.parse(JSON.stringify(currentWebsite.editorData.publishing));
  }
  if (currentWebsite.editorData?.deployment) {
    canonicalEditorData.deployment = JSON.parse(JSON.stringify(currentWebsite.editorData.deployment));
  }
  if (currentWebsite.editorData?.breakpoints) {
    canonicalEditorData.breakpoints = JSON.parse(JSON.stringify(currentWebsite.editorData.breakpoints));
  }

  // 6. Persist to Backend using Existing Protected PUT /api/websites/:id
  let saveRes: Response;
  try {
    saveRes = await fetch(`${apiUrl}/api/websites/${trimmedSiteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        expectedVersion,
        editorData: canonicalEditorData,
      }),
    });
  } catch (netErr: any) {
    throw new Error(`Network failure during kit save: ${netErr?.message || "Connection refused"}. Your website was not modified.`);
  }

  // 7. Strict Verification of Response
  if (!saveRes.ok) {
    const errorJson = await saveRes.json().catch(() => ({}));
    if (saveRes.status === 409) {
      throw new Error("Conflict: This website was modified concurrently in another session. Please reload and try again.");
    }
    if (saveRes.status === 400) {
      throw new Error(errorJson?.message || "Revision required or invalid website structure.");
    }
    if (saveRes.status === 403) {
      throw new Error("You do not have permission to modify this website.");
    }
    if (saveRes.status === 500) {
      throw new Error(errorJson?.message || "Internal server error occurred while applying website kit.");
    }
    throw new Error(errorJson?.message || `Failed to save website kit data (HTTP ${saveRes.status}).`);
  }

  const saveJson = await saveRes.json().catch(() => ({}));

  if (saveJson.success === false) {
    throw new Error(saveJson.message || "Server rejected Website Kit update.");
  }

  if (!saveJson.website || typeof saveJson.website !== "object") {
    throw new Error("Website update verification failed: Server did not return the updated website record.");
  }

  if (saveJson.website.id !== trimmedSiteId) {
    throw new Error(`Website update verification failed: Server returned mismatched website ID "${saveJson.website.id}".`);
  }

  // 8. Update Local Storage Cache if in browser environment
  if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
    try {
      window.localStorage.setItem(`forgestudio_editor_${trimmedSiteId}`, JSON.stringify(canonicalEditorData));
    } catch (lsErr) {
      console.warn("Failed to update localStorage fallback cache:", lsErr);
    }
  }

  return {
    success: true,
    message: `Website Kit "${kit.name}" applied successfully.`,
    website: saveJson.website,
    editorData: canonicalEditorData,
  };
}
