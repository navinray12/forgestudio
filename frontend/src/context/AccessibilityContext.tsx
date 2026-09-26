import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { VisitorA11yPreferences, ContrastMode } from "../types/accessibility.types";

const DEFAULT_PREFERENCES: VisitorA11yPreferences = {
  fontScale: 100,
  dyslexicFont: false,
  letterSpacing: "normal",
  lineHeight: "normal",
  contrastMode: "normal",
  pauseAnimations: false,
  readingGuide: false,
  hideImages: false,
  keyboardFocusRing: false,
  bigCursor: false,
  highlightLinks: false,
  textToSpeech: false,
  saturation: "normal",
};

const STORAGE_KEY = "forgestudio_visitor_a11y_prefs";

interface AccessibilityContextType {
  prefs: VisitorA11yPreferences;
  setFontScale: (scale: number) => void;
  toggleDyslexicFont: () => void;
  setContrastMode: (mode: ContrastMode) => void;
  togglePauseAnimations: () => void;
  toggleReadingGuide: () => void;
  toggleHideImages: () => void;
  toggleKeyboardFocusRing: () => void;
  toggleBigCursor: () => void;
  toggleHighlightLinks: () => void;
  toggleTextToSpeech: () => void;
  speakText: (text: string) => void;
  resetPreferences: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [prefs, setPrefs] = useState<VisitorA11yPreferences>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) } : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  // Apply root DOM mutations & save state to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (_e) {
      // Fallback
    }

    const root = document.documentElement;

    // F-365: Text Size Scaling
    root.style.setProperty("--fs-a11y-font-scale", `${prefs.fontScale / 100}`);

    // F-370: Font Accessibility Controls
    if (prefs.dyslexicFont) {
      root.classList.add("fs-a11y-dyslexic-font");
    } else {
      root.classList.remove("fs-a11y-dyslexic-font");
    }

    root.setAttribute("data-a11y-spacing", prefs.letterSpacing);
    root.setAttribute("data-a11y-lineheight", prefs.lineHeight);

    // F-375: Contrast Controls
    const contrastModes: ContrastMode[] = ["high-contrast", "dark-contrast", "light-contrast", "monochrome"];
    contrastModes.forEach((mode) => root.classList.remove(`fs-a11y-${mode}`));
    if (prefs.contrastMode !== "normal") {
      root.classList.add(`fs-a11y-${prefs.contrastMode}`);
    }

    // F-369: Pause Animations
    if (prefs.pauseAnimations) {
      root.classList.add("fs-a11y-pause-animations");
    } else {
      root.classList.remove("fs-a11y-pause-animations");
    }

    // F-377: Hide Images
    if (prefs.hideImages) {
      root.classList.add("fs-a11y-hide-images");
    } else {
      root.classList.remove("fs-a11y-hide-images");
    }

    // F-368: High-Contrast Focus Ring
    if (prefs.keyboardFocusRing) {
      root.classList.add("fs-a11y-focus-ring");
    } else {
      root.classList.remove("fs-a11y-focus-ring");
    }

    // Big Cursor
    if (prefs.bigCursor) {
      root.classList.add("fs-a11y-big-cursor");
    } else {
      root.classList.remove("fs-a11y-big-cursor");
    }

    // Highlight Links
    if (prefs.highlightLinks) {
      root.classList.add("fs-a11y-highlight-links");
    } else {
      root.classList.remove("fs-a11y-highlight-links");
    }
  }, [prefs]);

  const speakText = useCallback((text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const setFontScale = useCallback((scale: number) => {
    setPrefs((prev) => ({ ...prev, fontScale: Math.min(150, Math.max(90, scale)) }));
  }, []);

  const toggleDyslexicFont = useCallback(() => {
    setPrefs((prev) => ({ ...prev, dyslexicFont: !prev.dyslexicFont }));
  }, []);

  const setContrastMode = useCallback((contrastMode: ContrastMode) => {
    setPrefs((prev) => ({ ...prev, contrastMode }));
  }, []);

  const togglePauseAnimations = useCallback(() => {
    setPrefs((prev) => ({ ...prev, pauseAnimations: !prev.pauseAnimations }));
  }, []);

  const toggleReadingGuide = useCallback(() => {
    setPrefs((prev) => ({ ...prev, readingGuide: !prev.readingGuide }));
  }, []);

  const toggleHideImages = useCallback(() => {
    setPrefs((prev) => ({ ...prev, hideImages: !prev.hideImages }));
  }, []);

  const toggleKeyboardFocusRing = useCallback(() => {
    setPrefs((prev) => ({ ...prev, keyboardFocusRing: !prev.keyboardFocusRing }));
  }, []);

  const toggleBigCursor = useCallback(() => {
    setPrefs((prev) => ({ ...prev, bigCursor: !prev.bigCursor }));
  }, []);

  const toggleHighlightLinks = useCallback(() => {
    setPrefs((prev) => ({ ...prev, highlightLinks: !prev.highlightLinks }));
  }, []);

  const toggleTextToSpeech = useCallback(() => {
    setPrefs((prev) => {
      const next = !prev.textToSpeech;
      if (next) {
        speakText("Text to speech screen reader enabled");
      } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      return { ...prev, textToSpeech: next };
    });
  }, [speakText]);

  // F-378: Accessibility Reset
  const resetPreferences = useCallback(() => {
    setPrefs(DEFAULT_PREFERENCES);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_e) {
      // Fallback
    }
  }, []);

  return (
    <AccessibilityContext.Provider
      value={{
        prefs,
        setFontScale,
        toggleDyslexicFont,
        setContrastMode,
        togglePauseAnimations,
        toggleReadingGuide,
        toggleHideImages,
        toggleKeyboardFocusRing,
        toggleBigCursor,
        toggleHighlightLinks,
        toggleTextToSpeech,
        speakText,
        resetPreferences,
      }}
    >
      {/* ARIA Live Region for Screen Reader Announcements */}
      <div id="fs-a11y-live-region" className="sr-only" aria-live="polite" aria-atomic="true" />
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    // Graceful fallback if invoked outside provider
    return {
      prefs: DEFAULT_PREFERENCES,
      setFontScale: () => {},
      toggleDyslexicFont: () => {},
      setContrastMode: () => {},
      togglePauseAnimations: () => {},
      toggleReadingGuide: () => {},
      toggleHideImages: () => {},
      toggleKeyboardFocusRing: () => {},
      toggleBigCursor: () => {},
      toggleHighlightLinks: () => {},
      toggleTextToSpeech: () => {},
      speakText: () => {},
      resetPreferences: () => {},
    };
  }
  return context;
};
