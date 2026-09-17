import type { DeviceMode } from "../types";

export type CanvasTargetMode = "page" | "header" | "footer";

/**
 * EditorViewState
 * Strongly typed interface for editor device breakpoint mode, canvas target mode, preview, and fullscreen view state.
 */
export interface EditorViewState {
  activeDevice: DeviceMode;
  canvasMode: CanvasTargetMode;
  isPreview: boolean;
  isFullScreenCanvas: boolean;
}
