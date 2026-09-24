import type { EditorPreferences } from "../types/block.types";

const STORAGE_KEY = "fs_editor_preferences";

export const DEFAULT_PREFERENCES: EditorPreferences = {
  spotlightMode: false,
  fullscreen: false,
  topToolbarMode: false,
  distractionFree: false,
  panelPreferences: {
    inspectorOpen: true,
    navigatorOpen: false,
    outlineOpen: false,
    inserterOpen: false,
  },
  keyboardShortcuts: {
    "toggle-spotlight": "Ctrl+Alt+S",
    "toggle-top-toolbar": "Ctrl+Alt+T",
    "toggle-fullscreen": "Ctrl+Shift+F",
    "toggle-distraction-free": "Ctrl+Shift+\\",
    "toggle-outline": "Ctrl+Alt+O",
    "toggle-inserter": "Ctrl+Alt+I",
    "duplicate-block": "Ctrl+D",
    "delete-block": "Delete",
  },
  fitTextDefaults: {
    minFontSize: 12,
    maxFontSize: 120,
  },
};

export class EditorPreferencesService {
  /**
   * Load preferences from localStorage or return defaults
   */
  static getPreferences(workspaceId?: string): EditorPreferences {
    try {
      const key = workspaceId ? `${STORAGE_KEY}_${workspaceId}` : STORAGE_KEY;
      const raw = localStorage.getItem(key);
      if (!raw) return { ...DEFAULT_PREFERENCES };

      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_PREFERENCES,
        ...parsed,
        panelPreferences: {
          ...DEFAULT_PREFERENCES.panelPreferences,
          ...(parsed.panelPreferences || {}),
        },
        keyboardShortcuts: {
          ...DEFAULT_PREFERENCES.keyboardShortcuts,
          ...(parsed.keyboardShortcuts || {}),
        },
        fitTextDefaults: {
          ...DEFAULT_PREFERENCES.fitTextDefaults,
          ...(parsed.fitTextDefaults || {}),
        },
      };
    } catch {
      return { ...DEFAULT_PREFERENCES };
    }
  }

  /**
   * Save updated preferences to localStorage
   */
  static savePreferences(preferences: EditorPreferences, workspaceId?: string): EditorPreferences {
    try {
      const key = workspaceId ? `${STORAGE_KEY}_${workspaceId}` : STORAGE_KEY;
      localStorage.setItem(key, JSON.stringify(preferences));
    } catch (e) {
      console.warn("Failed to persist editor preferences to localStorage:", e);
    }
    return preferences;
  }

  /**
   * Reset preferences back to factory defaults
   */
  static resetPreferences(workspaceId?: string): EditorPreferences {
    try {
      const key = workspaceId ? `${STORAGE_KEY}_${workspaceId}` : STORAGE_KEY;
      localStorage.removeItem(key);
    } catch {}
    return { ...DEFAULT_PREFERENCES };
  }
}
