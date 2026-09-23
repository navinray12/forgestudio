import type { ElementStyles } from "../../../pages/editor/WebsiteEditor";

export type GlobalElementType = "button" | "heading" | "paragraph" | "container" | "card" | "badge";

export interface GlobalElementDefinition {
  id: string;
  name: string;
  elementType: GlobalElementType;
  content?: string;
  styles: Partial<ElementStyles>;
  classes?: string[];
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGlobalElementPayload {
  name: string;
  elementType: GlobalElementType;
  content?: string;
  styles: Partial<ElementStyles>;
  classes?: string[];
  description?: string;
}

export interface GlobalElementUsageInfo {
  globalElementId: string;
  usageCount: number;
  referencingElements: { id: string; name?: string; pageId?: string }[];
}
