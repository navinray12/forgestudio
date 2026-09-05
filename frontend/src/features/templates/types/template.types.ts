import type { EditorElement } from "../../../pages/editor/WebsiteEditor";
import type { PageSettingsData } from "../../revision-history/types/revisionHistory.types";

export type TemplateType = "PAGE" | "SECTION" | "POPUP" | "WEBSITE" | "GLOBAL_WIDGET";

export type TemplateCategory =
  | "Landing Page"
  | "Business"
  | "Portfolio"
  | "Blog"
  | "Ecommerce"
  | "Personal"
  | "Other";

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  "Landing Page",
  "Business",
  "Portfolio",
  "Blog",
  "Ecommerce",
  "Personal",
  "Other",
];

export interface TemplateDataPayload {
  elements: EditorElement[];
  pageSettings: PageSettingsData;
}

export interface CreateTemplatePayload {
  name: string;
  description?: string;
  type?: TemplateType;
  category?: TemplateCategory | string;
  isFavorite?: boolean;
  isShared?: boolean;
  shareToken?: string | null;
  templateData: TemplateDataPayload;
}

export interface Template {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  type: TemplateType;
  category?: TemplateCategory | string;
  isFavorite?: boolean;
  isShared?: boolean;
  isPro?: boolean;
  shareToken?: string | null;
  templateData: TemplateDataPayload;
  createdAt: string;
  updatedAt: string;
}
