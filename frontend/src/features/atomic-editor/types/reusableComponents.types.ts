/**
 * @file Atomic editor feature: reusable Components types. Keep feature UI, hooks, services and types in this module.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import type { ElementStyles } from "../../../pages/editor/WebsiteEditor";

export interface ComponentElementNode {
  id: string;
  type: string;
  name: string;
  content?: string;
  styles?: Partial<ElementStyles>;
  classes?: string[];
  children?: ComponentElementNode[];
}

export interface ReusableComponentDefinition {
  id: string;
  name: string;
  elementCount: number;
  rootElement: ComponentElementNode;
  description?: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReusableComponentPayload {
  name: string;
  rootElement: ComponentElementNode;
  description?: string;
  category?: string;
}

export interface ReusableComponentUsageInfo {
  componentId: string;
  usageCount: number;
  referencingElements: { id: string; name?: string; pageId?: string }[];
}
