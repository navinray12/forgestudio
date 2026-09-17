/**
 * @file Global widget feature: global Widget types. Keep feature UI, hooks, services and types in this module.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import type { EditorElement } from "../../../pages/editor/WebsiteEditor";

export interface GlobalWidget {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  category?: string;
  elements: EditorElement[];
  isGlobalWidget: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGlobalWidgetPayload {
  name: string;
  description?: string;
  category?: string;
  elements: EditorElement[];
}

export interface UpdateGlobalWidgetPayload {
  name?: string;
  description?: string;
  elements?: EditorElement[];
}
