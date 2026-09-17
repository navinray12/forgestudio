import { describe, it, expect, beforeEach } from "vitest";
import { WidgetRegistry } from "../registry/widgetRegistry";
import { adaptExistingWidget, initializeWidgetRegistry } from "../registry/widgetRegistryAdapter";
import { ALL_WIDGET_REGISTRY } from "../../../pages/editor/types";

describe("WidgetRegistry", () => {
  let registry: WidgetRegistry;

  beforeEach(() => {
    registry = new WidgetRegistry();
  });

  it("registers and retrieves a widget by type", () => {
    registry.register({
      type: "heading",
      label: "Heading",
      category: "Basic",
      icon: "🔤",
      description: "SEO title heading",
    });

    expect(registry.has("heading")).toBe(true);
    const widget = registry.get("heading");
    expect(widget).toBeDefined();
    expect(widget?.label).toBe("Heading");
  });

  it("retrieves widgets by category", () => {
    registry.register({ type: "heading", label: "Heading", category: "Basic", icon: "🔤", description: "" });
    registry.register({ type: "container", label: "Container", category: "Layout", icon: "📦", description: "" });

    const basicWidgets = registry.getByCategory("Basic");
    expect(basicWidgets).toHaveLength(1);
    expect(basicWidgets[0].type).toBe("heading");
  });

  it("populates from ALL_WIDGET_REGISTRY via adapter", () => {
    initializeWidgetRegistry(registry);

    expect(registry.getAll().length).toBeGreaterThan(30);

    // Proof-of-concept widget verification
    const heading = registry.get("heading");
    const text = registry.get("text");
    const image = registry.get("image");
    const button = registry.get("button");
    const container = registry.get("container");

    expect(heading).toBeDefined();
    expect(text).toBeDefined();
    expect(image).toBeDefined();
    expect(button).toBeDefined();
    expect(container).toBeDefined();
  });
});
