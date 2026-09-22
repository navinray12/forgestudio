/**
 * @file Website kits feature: website Kit Service. Keep feature UI, hooks, services and types in this module.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import type { WebsiteKit } from "../types/websiteKit.types";
import { WEBSITE_KITS } from "../data/websiteKitsData";

/**
 * Retrieves all available Website Kits

 * @param apiUrl Api Url supplied to this operation (type: string).
 */
export async function getWebsiteKits(apiUrl: string): Promise<WebsiteKit[]> {
  try {
    let res = await fetch(`${apiUrl}/api/v1/website-kits`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!res.ok && res.status === 404) {
      res = await fetch(`${apiUrl}/api/website-kits`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
    }

    if (res.ok) {
      const data = await res.json();
      const kitList = data?.kits || data?.data?.kits;
      if (Array.isArray(kitList)) {
        return kitList;
      }
    }
    throw new Error(`Failed to load website kits: HTTP ${res.status}`);
  } catch (e) {
    console.error("Error fetching website kits from backend:", e);
    // Fallback to local curated website kits only if backend fails
    return WEBSITE_KITS;
  }
}

/**
 * Applies a Website Kit to the active website/editor

 * @param apiUrl Api Url supplied to this operation (type: string).
 * @param kit Kit supplied to this operation (type: WebsiteKit).
 */
export async function applyWebsiteKit(
  apiUrl: string,
  kit: WebsiteKit,
  websiteId?: string
): Promise<{ success: boolean; message: string }> {
  if (!kit || (!kit.id && !kit.pages)) {
    throw new Error("Invalid Website Kit structure.");
  }

  try {
    let res = await fetch(`${apiUrl}/api/v1/website-kits/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ kitId: kit.id, websiteId }),
    });

    if (!res.ok && res.status === 404) {
      res = await fetch(`${apiUrl}/api/website-kits/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ kitId: kit.id, websiteId }),
      });
    }

    if (res.ok) {
      const data = await res.json();
      return { success: true, message: data.message || "Website Kit applied successfully." };
    }

    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || errData?.message || `HTTP ${res.status}: Failed to apply Website Kit.`);
  } catch (e: any) {
    console.error("Error applying website kit:", e);
    throw new Error(e.message || "Failed to apply Website Kit");
  }
}
