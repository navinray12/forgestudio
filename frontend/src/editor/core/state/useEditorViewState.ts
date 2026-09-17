import { useCallback } from "react";
import type { DeviceMode } from "../types";
import type { CanvasTargetMode } from "./editorViewState";

export interface UseEditorViewStateOptions {
  activeDevice: DeviceMode;
  setActiveDevice: (device: DeviceMode | ((prev: DeviceMode) => DeviceMode)) => void;
  canvasMode: CanvasTargetMode;
  setCanvasMode: (mode: CanvasTargetMode | ((prev: CanvasTargetMode) => CanvasTargetMode)) => void;
  isPreview: boolean;
  setIsPreview: (isPreview: boolean | ((prev: boolean) => boolean)) => void;
  isFullScreenCanvas: boolean;
  setIsFullScreenCanvas: (isFullScreen: boolean | ((prev: boolean) => boolean)) => void;
}

/**
 * useEditorViewState
 * React adapter hook providing a structured view state boundary over existing editor state pointers.
 * Does NOT maintain duplicate local React state.
 */
export function useEditorViewState(options: UseEditorViewStateOptions) {
  const {
    activeDevice,
    setActiveDevice,
    canvasMode,
    setCanvasMode,
    isPreview,
    setIsPreview,
    isFullScreenCanvas,
    setIsFullScreenCanvas,
  } = options;

  const togglePreview = useCallback(() => {
    setIsPreview((prev) => !prev);
  }, [setIsPreview]);

  const toggleFullscreen = useCallback(() => {
    setIsFullScreenCanvas((prev) => !prev);
  }, [setIsFullScreenCanvas]);

  const setDevice = useCallback(
    (device: DeviceMode) => {
      setActiveDevice(device);
    },
    [setActiveDevice]
  );

  const setTargetCanvasMode = useCallback(
    (mode: CanvasTargetMode) => {
      setCanvasMode(mode);
    },
    [setCanvasMode]
  );

  return {
    activeDevice,
    setActiveDevice,
    canvasMode,
    setCanvasMode,
    isPreview,
    setIsPreview,
    isFullScreenCanvas,
    setIsFullScreenCanvas,
    togglePreview,
    toggleFullscreen,
    setDevice,
    setTargetCanvasMode,
  };
}
