import { describe, it, expect, beforeEach } from "vitest";
import { ControlRegistry } from "../registry/controlRegistry";
import { initializeControlRegistry } from "../registry/controlRegistryAdapter";

describe("ControlRegistry", () => {
  let registry: ControlRegistry;

  beforeEach(() => {
    registry = new ControlRegistry();
  });

  it("registers and retrieves control definitions", () => {
    registry.register({ type: "COLOR", label: "Color Picker", category: "style" });

    expect(registry.has("COLOR")).toBe(true);
    const ctrl = registry.get("COLOR");
    expect(ctrl?.label).toBe("Color Picker");
  });

  it("populates built-in controls via adapter", () => {
    initializeControlRegistry(registry);

    expect(registry.getAll().length).toBeGreaterThanOrEqual(10);
    expect(registry.has("TEXT")).toBe(true);
    expect(registry.has("MEDIA")).toBe(true);
    expect(registry.has("SPACING")).toBe(true);
  });
});
