import { describe, it, expect, vi } from "vitest";
import { useEditorViewState } from "../state/useEditorViewState";

describe("useEditorViewState Contract & Helpers", () => {
  it("exposes passed view state pointers correctly", () => {
    const setActiveDevice = vi.fn();
    const setCanvasMode = vi.fn();
    const setIsPreview = vi.fn();
    const setIsFullScreenCanvas = vi.fn();

    const state = useEditorViewState({
      activeDevice: "desktop",
      setActiveDevice,
      canvasMode: "page",
      setCanvasMode,
      isPreview: false,
      setIsPreview,
      isFullScreenCanvas: false,
      setIsFullScreenCanvas,
    });

    expect(state.activeDevice).toBe("desktop");
    expect(state.canvasMode).toBe("page");
    expect(state.isPreview).toBe(false);
    expect(state.isFullScreenCanvas).toBe(false);
  });

  it("togglePreview toggles preview state", () => {
    const setActiveDevice = vi.fn();
    const setCanvasMode = vi.fn();
    const setIsPreview = vi.fn();
    const setIsFullScreenCanvas = vi.fn();

    const state = useEditorViewState({
      activeDevice: "desktop",
      setActiveDevice,
      canvasMode: "page",
      setCanvasMode,
      isPreview: false,
      setIsPreview,
      isFullScreenCanvas: false,
      setIsFullScreenCanvas,
    });

    state.togglePreview();
    expect(setIsPreview).toHaveBeenCalledTimes(1);
  });

  it("toggleFullscreen toggles fullscreen state", () => {
    const setActiveDevice = vi.fn();
    const setCanvasMode = vi.fn();
    const setIsPreview = vi.fn();
    const setIsFullScreenCanvas = vi.fn();

    const state = useEditorViewState({
      activeDevice: "desktop",
      setActiveDevice,
      canvasMode: "page",
      setCanvasMode,
      isPreview: false,
      setIsPreview,
      isFullScreenCanvas: false,
      setIsFullScreenCanvas,
    });

    state.toggleFullscreen();
    expect(setIsFullScreenCanvas).toHaveBeenCalledTimes(1);
  });

  it("setDevice and setTargetCanvasMode set target pointers", () => {
    const setActiveDevice = vi.fn();
    const setCanvasMode = vi.fn();
    const setIsPreview = vi.fn();
    const setIsFullScreenCanvas = vi.fn();

    const state = useEditorViewState({
      activeDevice: "desktop",
      setActiveDevice,
      canvasMode: "page",
      setCanvasMode,
      isPreview: false,
      setIsPreview,
      isFullScreenCanvas: false,
      setIsFullScreenCanvas,
    });

    state.setDevice("mobile");
    expect(setActiveDevice).toHaveBeenCalledWith("mobile");

    state.setTargetCanvasMode("header");
    expect(setCanvasMode).toHaveBeenCalledWith("header");
  });
});
