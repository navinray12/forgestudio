/**
 * Page management for WordPress Integration
 */

import { wordpressApi } from "./wordpress-api";
import type { WordPressPage } from "./wordpress-types";

export const wordpressPages = {
  /**
   * Fetch connected WordPress pages for a website
   */
  async fetchPages(websiteId: string): Promise<WordPressPage[]> {
    return await wordpressApi.getPages(websiteId);
  },

  /**
   * Build the editor URL to open a specific WordPress page in ForgeStudio editor
   */
  getEditUrl(websiteId: string, pageId?: string): string {
    if (pageId) {
      return `/websites/${websiteId}/pages/${pageId}/edit`;
    }
    return `/editor/${websiteId}`;
  },
};
