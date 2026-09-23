import type { EditorElement } from "../../../pages/editor/WebsiteEditor";

export type WebsiteKitCategory = "All" | "Business" | "Portfolio" | "SaaS" | "Agency";

export interface WebsiteKitPage {
  id: string;
  title: string;
  slug: string;
  elements: EditorElement[];
}

export interface WebsiteKitGlobalStyles {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  fontFamily: string;
  buttonBorderRadius: string;
}

export interface WebsiteKit {
  id: string;
  name: string;
  category: WebsiteKitCategory | string;
  description: string;
  thumbnailUrl?: string;
  pageCount: number;
  pages: WebsiteKitPage[];
  globalStyles: WebsiteKitGlobalStyles;
  createdAt: string;
}
