import type { ElementStyles } from "../../../pages/editor/WebsiteEditor";

export type ClassScope = "global" | "local";

export interface AtomicClass {
  id: string;
  name: string; // e.g. "heading-primary" or ".heading-primary"
  key: string;  // formatted className e.g. "heading-primary"
  className?: string; // Canonical alias for key
  styles: Partial<ElementStyles>;
  pseudoStyles?: {

    hover?: Record<string, string | number>;
    focus?: Record<string, string | number>;
    active?: Record<string, string | number>;
  };
  description?: string;
  isGlobal?: boolean; // true for Global Class, false for Local Class
  scope?: ClassScope;
  assignedCount?: number;
  createdByRole?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateClassPayload = Omit<AtomicClass, "id" | "key" | "createdAt" | "updatedAt"> & {
  key?: string;
  className?: string;
};
export type UpdateClassPayload = Partial<CreateClassPayload>;

