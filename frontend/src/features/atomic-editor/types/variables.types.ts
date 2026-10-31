export type VariableType =
  | "color"
  | "font"
  | "typography"
  | "spacing"
  | "number"
  | "dimension"
  | "shadow"
  | "radius"
  | "custom";

export interface AtomicVariable {
  id: string;
  name: string;
  key: string; // CSS custom property format e.g. "--primary-color" or "--fs-color-primary"
  token?: string; // Canonical alias for key
  type: VariableType;
  category?: VariableType;
  value: string;
  description?: string;
  defaultMode?: "light" | "dark";
  modes?: Record<string, string>; // e.g. { light: '#2563eb', dark: '#3b82f6' }
  createdAt: string;
  updatedAt: string;
}

export type CreateVariablePayload = Omit<AtomicVariable, "id" | "key" | "createdAt" | "updatedAt"> & {
  key?: string;
  token?: string;
};
export type UpdateVariablePayload = Partial<CreateVariablePayload>;

