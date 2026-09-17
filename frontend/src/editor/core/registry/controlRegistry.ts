import React from "react";

export type ControlCategory = "content" | "style" | "advanced" | "layout";

export interface ForgeControlDefinition {
  type: string;
  label: string;
  category?: ControlCategory;
  render?: React.ComponentType<any>;
  defaultVal?: any;
  options?: any;
}

export class ControlRegistry {
  private controls = new Map<string, ForgeControlDefinition>();

  public register(definition: ForgeControlDefinition): void {
    if (!definition || !definition.type) return;
    this.controls.set(definition.type, definition);
  }

  public get(type: string): ForgeControlDefinition | undefined {
    return this.controls.get(type);
  }

  public has(type: string): boolean {
    return this.controls.has(type);
  }

  public getAll(): ForgeControlDefinition[] {
    return Array.from(this.controls.values());
  }
}

export const controlRegistry = new ControlRegistry();
