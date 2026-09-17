/**
 * WordPress Integration Types
 */

export interface WordPressPage {
  id: number;
  title: string;
  slug: string;
  status: "publish" | "draft" | "pending" | "private";
  modifiedAt?: string;
  link?: string;
  forgePageId?: string;
}

export interface WordPressConnectionStatus {
  isConnected: boolean;
  siteUrl?: string;
  wpSiteName?: string;
  lastVerifiedAt?: string;
  mappingsCount?: number;
  mappings?: Array<{
    forgePageId: string;
    wpPostId: number;
    wpPostSlug: string;
    wpPostUrl: string;
  }>;
}

export interface WordPressPublishPayload {
  websiteId: string;
  forgePageId: string;
  wpPostId?: number;
  document: any;
}

export interface WordPressMediaItem {
  id: number;
  url: string;
  thumbnailUrl: string;
  title: string;
  alt: string;
  mimeType: string;
  width: number;
  height: number;
}

export interface WordPressMediaResponse {
  success: boolean;
  items: WordPressMediaItem[];
  page: number;
  perPage: number;
  total: number;
}

export interface WordPressMenuItem {
  id: number;
  title: string;
  url: string;
  parentId?: number | null;
  order: number;
  target?: string;
}

export interface WordPressMenu {
  id: number;
  name: string;
  slug?: string;
  count?: number;
  items?: WordPressMenuItem[];
}

export interface WordPressMenusResponse {
  success: boolean;
  menus: WordPressMenu[];
}

export interface WordPressMenuResponse {
  success: boolean;
  menu: WordPressMenu;
}


