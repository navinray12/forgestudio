export type ContrastMode = "normal" | "high-contrast" | "dark-contrast" | "light-contrast" | "monochrome";
export type WidgetPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left";
export type WidgetTheme = "indigo" | "dark" | "emerald" | "amber" | "slate";

export interface VisitorA11yPreferences {
  fontScale: number; // 100, 110, 120, 130, 140, 150
  dyslexicFont: boolean;
  letterSpacing: "normal" | "wide" | "extra-wide";
  lineHeight: "normal" | "loose" | "extra-loose";
  contrastMode: ContrastMode;
  pauseAnimations: boolean;
  readingGuide: boolean;
  hideImages: boolean;
  keyboardFocusRing: boolean;
  bigCursor: boolean;
  highlightLinks: boolean;
  textToSpeech: boolean;
  saturation: "normal" | "low" | "high" | "grayscale";
}

export interface AccessibilityWidgetConfig {
  enabled?: boolean;
  position?: WidgetPosition;
  theme?: WidgetTheme;
  customIcon?: string;
  offsetX?: number;
  offsetY?: number;
  showTextScale?: boolean;
  showContrast?: boolean;
  showFontOptions?: boolean;
  showPauseAnimations?: boolean;
  showReadingGuide?: boolean;
  showHideImages?: boolean;
  statementEmail?: string;
  organizationName?: string;
}

export interface MultilingualExportOptions {
  engine: "wpml" | "polylang" | "translatepress" | "weglot";
  sourceLanguage: string;
  targetLanguages: string[];
}
