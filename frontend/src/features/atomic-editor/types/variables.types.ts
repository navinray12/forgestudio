export type VariableType = "color" | "font" | "spacing" | "number";

export interface AtomicVariable {
  id: string;
  name: string;
  key: string; // CSS custom property format e.g. "--primary-color"
  type: VariableType;
  value: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateVariablePayload = Omit<AtomicVariable, "id" | "key" | "createdAt" | "updatedAt"> & { key?: string };
export type UpdateVariablePayload = Partial<CreateVariablePayload>;
