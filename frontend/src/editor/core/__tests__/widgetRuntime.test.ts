import { describe, it, expect } from "vitest";
import {
  resolveWidget,
  hasWidget,
  resolveWidgetMetadata,
  resolveWidgetDefaults,
} from "../registry/widgetRuntime";

describe("WidgetRuntime Resolver", () => {
  it("resolves 5 proof-of-concept widgets correctly", () => {
    const heading = resolveWidget("heading");
    const text = resolveWidget("text");
    const image = resolveWidget("image");
    const button = resolveWidget("button");
    const container = resolveWidget("container");

    expect(heading).toBeDefined();
    expect(heading?.label).toBe("Heading");

    expect(text).toBeDefined();
    expect(text?.label).toBe("Text");

    expect(image).toBeDefined();
    expect(image?.label).toBe("Image");

    expect(button).toBeDefined();
    expect(button?.label).toBe("Button");

    expect(container).toBeDefined();
    expect(container?.label).toBe("Container");
  });

  it("hasWidget returns true for registered widget and false for unknown", () => {
    expect(hasWidget("heading")).toBe(true);
    expect(hasWidget("unknown_widget_xyz")).toBe(false);
  });

  it("resolveWidgetMetadata returns metadata object for registered widget", () => {
    const meta = resolveWidgetMetadata("button");
    expect(meta).toBeDefined();
    expect(meta?.category).toBe("Basic");
    expect(meta?.label).toBe("Button");
  });

  it("safely returns undefined for unknown or empty widget types without throwing", () => {
    expect(resolveWidget("non_existent")).toBeUndefined();
    expect(resolveWidget("")).toBeUndefined();
    expect(resolveWidgetMetadata("non_existent")).toBeUndefined();
  });
});
