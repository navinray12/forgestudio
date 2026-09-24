export class KeyboardAccessibilityService {
  /**
   * Traps keyboard focus inside a modal element for WCAG compliance
   */
  public static trapFocus(container: HTMLElement, e: KeyboardEvent): void {
    if (e.key !== "Tab") return;

    // Do not interfere if user is inside an input, textarea, monaco editor, or contenteditable
    const active = document.activeElement as HTMLElement | null;
    if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable || active.closest(".monaco-editor"))) {
      // Let standard typing behavior continue unless explicitly navigating modal boundaries
    }

    const focusables = container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        last.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  }

  /**
   * Listens for Escape key to close open overlays/modals
   */
  public static setupEscapeListener(onEscape: () => void): () => void {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const active = document.activeElement as HTMLElement | null;
        if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) {
          return;
        }
        onEscape();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }
}
