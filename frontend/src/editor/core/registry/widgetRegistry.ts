import type { ElementType } from "../../../pages/editor/types";

export interface ForgeWidgetDefaults {
  props?: Record<string, any>;
  styles?: Record<string, any>;
}

export interface ForgeWidgetDefinition {
  type: ElementType | string;
  label: string;
  category: string;
  icon: string;
  description: string;
  defaults?: ForgeWidgetDefaults;
  controls?: string[];
  renderer?: any;
}

export class WidgetRegistry {
  private widgets = new Map<string, ForgeWidgetDefinition>();

  public register(definition: ForgeWidgetDefinition): void {
    if (!definition || !definition.type) return;
    this.widgets.set(definition.type, definition);
  }

  public get(type: string): ForgeWidgetDefinition | undefined {
    return this.widgets.get(type);
  }

  public has(type: string): boolean {
    return this.widgets.has(type);
  }

  public getAll(): ForgeWidgetDefinition[] {
    return Array.from(this.widgets.values());
  }

  public getByCategory(category: string): ForgeWidgetDefinition[] {
    return this.getAll().filter(
      (w) => w.category.toLowerCase() === category.toLowerCase()
    );
  }
}

export const widgetRegistry = new WidgetRegistry();
