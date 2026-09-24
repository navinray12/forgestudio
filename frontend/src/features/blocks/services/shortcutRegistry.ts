import type { ShortcutCommand } from "../types/block.types";

export const DEFAULT_COMMANDS: ShortcutCommand[] = [
  {
    id: "toggle-spotlight",
    name: "Toggle Spotlight Mode",
    category: "editor",
    defaultKey: "Ctrl+Alt+S",
    description: "Focus visual emphasis on selected block and dim others",
  },
  {
    id: "toggle-top-toolbar",
    name: "Toggle Top Toolbar Mode",
    category: "editor",
    defaultKey: "Ctrl+Alt+T",
    description: "Dock block toolbar to top editor header",
  },
  {
    id: "toggle-fullscreen",
    name: "Toggle Fullscreen Mode",
    category: "editor",
    defaultKey: "Ctrl+Shift+F",
    description: "Toggle browser-safe fullscreen workspace mode",
  },
  {
    id: "toggle-distraction-free",
    name: "Toggle Distraction-Free Mode",
    category: "editor",
    defaultKey: "Ctrl+Shift+\\",
    description: "Hide sidebars and Chrome toolbars for focused editing",
  },
  {
    id: "toggle-outline",
    name: "Toggle Document Outline",
    category: "navigation",
    defaultKey: "Ctrl+Alt+O",
    description: "Open block tree document outline & heading inspector",
  },
  {
    id: "toggle-inserter",
    name: "Toggle Block Inserter",
    category: "blocks",
    defaultKey: "Ctrl+Alt+I",
    description: "Open block and pattern inserter panel",
  },
  {
    id: "duplicate-block",
    name: "Duplicate Selected Block",
    category: "formatting",
    defaultKey: "Ctrl+D",
    description: "Duplicate active selected block element",
  },
  {
    id: "delete-block",
    name: "Delete Selected Block",
    category: "formatting",
    defaultKey: "Delete",
    description: "Delete active selected block element",
  },
];

export class ShortcutRegistry {
  /**
   * Helper to format a KeyboardEvent into a normalized key combo string e.g. "Ctrl+Alt+S"
   */
  static parseEventToKeyCombo(e: KeyboardEvent): string {
    const parts: string[] = [];

    if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
    if (e.shiftKey) parts.push("Shift");
    if (e.altKey) parts.push("Alt");

    let key = e.key;
    if (key === " ") key = "Space";
    else if (key === "Escape") key = "Esc";
    else if (key === "\\") key = "\\";
    else if (key.length === 1) key = key.toUpperCase();

    // Ignore standalone modifier keypresses
    if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
      return "";
    }

    parts.push(key);
    return parts.join("+");
  }

  /**
   * Checks if an incoming KeyboardEvent matches a registered command keybinding
   */
  static isMatchingCombo(e: KeyboardEvent, targetCombo: string): boolean {
    const parsed = this.parseEventToKeyCombo(e);
    if (!parsed || !targetCombo) return false;

    // Normalize both for comparison
    const normParsed = parsed.toLowerCase().replace("meta", "ctrl");
    const normTarget = targetCombo.toLowerCase().replace("meta", "ctrl");

    return normParsed === normTarget;
  }
}
