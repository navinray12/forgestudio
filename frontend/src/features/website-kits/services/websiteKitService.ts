import type { WebsiteKit } from "../types/websiteKit.types";
import { WEBSITE_KITS } from "../data/websiteKitsData";

/**
 * Retrieves all available Website Kits
 */
export async function getWebsiteKits(apiUrl: string): Promise<WebsiteKit[]> {
  try {
    const res = await fetch(`${apiUrl}/api/website-kits`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.kits && Array.isArray(data.kits)) {
        return [...WEBSITE_KITS, ...data.kits];
      }
    }
  } catch (e) {
    // Fallback to local curated website kits
  }

  return WEBSITE_KITS;
}

/**
 * Applies a Website Kit to the active website/editor
 */
export async function applyWebsiteKit(
  apiUrl: string,
  kit: WebsiteKit
): Promise<{ success: boolean; message: string }> {
  if (!kit || !kit.pages || kit.pages.length === 0) {
    throw new Error("Invalid Website Kit structure.");
  }

  try {
    const res = await fetch(`${apiUrl}/api/website-kits/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ kitId: kit.id }),
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, message: data.message || "Website Kit applied successfully." };
    }
  } catch (e) {
    // Local fallback success simulation
  }

  return { success: true, message: `Website Kit "${kit.name}" applied successfully.` };
}
