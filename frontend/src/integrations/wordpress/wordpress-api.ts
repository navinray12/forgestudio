/**
 * Client API methods for WordPress Integration
 */

import type { WordPressConnectionStatus, WordPressPage } from "./wordpress-types";

const getApiBase = () => import.meta.env.VITE_API_URL || "";

export const wordpressApi = {
  /**
   * Fetch status of WordPress connection for a website
   */
  async getStatus(websiteId: string): Promise<WordPressConnectionStatus> {
    const res = await fetch(`${getApiBase()}/api/websites/${websiteId}/wordpress/status`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to fetch WordPress connection status");
    }

    return {
      isConnected: Boolean(data.isConnected),
      siteUrl: data.connection?.siteUrl,
      wpSiteName: data.connection?.wpSiteName,
      lastVerifiedAt: data.connection?.lastVerifiedAt,
      mappingsCount: data.mappingsCount || 0,
      mappings: data.mappings || [],
    };
  },

  /**
   * Connect a website to a WordPress site
   */
  async connect(websiteId: string, siteUrl: string, apiKey: string, siteName?: string): Promise<any> {
    const res = await fetch(`${getApiBase()}/api/websites/${websiteId}/wordpress/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ siteUrl, apiKey, siteName }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to connect WordPress site");
    }
    return data;
  },

  /**
   * Verify connection health
   */
  async verify(websiteId: string): Promise<any> {
    const res = await fetch(`${getApiBase()}/api/websites/${websiteId}/wordpress/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to verify connection");
    }
    return data;
  },

  /**
   * Disconnect integration
   */
  async disconnect(websiteId: string): Promise<any> {
    const res = await fetch(`${getApiBase()}/api/websites/${websiteId}/wordpress/disconnect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to disconnect WordPress");
    }
    return data;
  },

  /**
   * Get mapped WordPress pages list
   */
  async getPages(websiteId: string): Promise<WordPressPage[]> {
    const status = await this.getStatus(websiteId);
    if (!status.isConnected || !status.mappings) {
      return [];
    }

    return status.mappings.map((m) => ({
      id: m.wpPostId,
      title: m.wpPostSlug ? m.wpPostSlug.charAt(0).toUpperCase() + m.wpPostSlug.slice(1) : `Page ${m.wpPostId}`,
      slug: m.wpPostSlug,
      status: "publish",
      link: m.wpPostUrl,
      forgePageId: m.forgePageId,
    }));
  },

  /**
   * Fetch Media items from connected WordPress Media Library
   */
  async getMedia(
    websiteId: string,
    page: number = 1,
    perPage: number = 20,
    search: string = ""
  ): Promise<import("./wordpress-types").WordPressMediaResponse> {
    const query = new URLSearchParams({
      page: String(page),
      perPage: String(perPage),
    });
    if (search) {
      query.set("search", search);
    }

    const res = await fetch(`${getApiBase()}/api/websites/${websiteId}/wordpress/media?${query.toString()}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to fetch WordPress Media Library");
    }

    return data;
  },

  /**
   * Fetch available Navigation Menus from WordPress
   */
  async getMenus(websiteId: string): Promise<import("./wordpress-types").WordPressMenusResponse> {
    const res = await fetch(`${getApiBase()}/api/websites/${websiteId}/wordpress/menus`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to fetch WordPress Navigation Menus");
    }

    return data;
  },

  /**
   * Fetch specific Navigation Menu item details from WordPress
   */
  async getMenu(websiteId: string, menuId: string | number): Promise<import("./wordpress-types").WordPressMenuResponse> {
    const res = await fetch(`${getApiBase()}/api/websites/${websiteId}/wordpress/menus/${menuId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || `Failed to fetch WordPress Navigation Menu #${menuId}`);
    }

    return data;
  },

  /**
   * Update Navigation Menu structure back to WordPress
   */
  async updateMenu(websiteId: string, menuId: string | number, items: any[]): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${getApiBase()}/api/websites/${websiteId}/wordpress/menus/${menuId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ items }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || `Failed to update WordPress Navigation Menu #${menuId}`);
    }

    return data;
  },
};


