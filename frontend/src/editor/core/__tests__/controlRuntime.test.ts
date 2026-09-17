import { describe, it, expect } from "vitest";
import {
  resolveControl,
  hasControl,
  resolveControls,
} from "../registry/controlRuntime";

describe("ControlRuntime Resolver", () => {
  it("resolves 5 proof-of-concept controls correctly", () => {
    const textCtrl = resolveControl("TEXT");
    const numCtrl = resolveControl("NUMBER");
    const colorCtrl = resolveControl("COLOR");
    const selectCtrl = resolveControl("SELECT");
    const toggleCtrl = resolveControl("TOGGLE");

    expect(textCtrl).toBeDefined();
    expect(textCtrl?.label).toBe("Text Input");

    expect(numCtrl).toBeDefined();
    expect(numCtrl?.label).toBe("Number Input");

    expect(colorCtrl).toBeDefined();
    expect(colorCtrl?.label).toBe("Color Picker");

    expect(selectCtrl).toBeDefined();
    expect(selectCtrl?.label).toBe("Dropdown Select");

    expect(toggleCtrl).toBeDefined();
    expect(toggleCtrl?.label).toBe("Switch Toggle");
  });

  it("hasControl returns true for registered control and false for unknown", () => {
    expect(hasControl("COLOR")).toBe(true);
    expect(hasControl("UNKNOWN_CONTROL")).toBe(false);
  });

  it("resolveControls resolves multiple valid controls", () => {
    const resolved = resolveControls(["TEXT", "COLOR", "NON_EXISTENT"]);
    expect(resolved).toHaveLength(2);
    expect(resolved[0].type).toBe("TEXT");
    expect(resolved[1].type).toBe("COLOR");
  });

  it("safely returns undefined for unknown control without throwing", () => {
    expect(resolveControl("INVALID_TYPE")).toBeUndefined();
    expect(resolveControl("")).toBeUndefined();
  });
});
