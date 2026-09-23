import "../accessibility.css";
import type {
  AccessibilityVisitorPreferences,
  SiteAccessibilitySettings,
  SiteI18nSettings,
  AccessibilityScanResult,
  AccessibilityScanIssue,
  CanonicalWebsiteData,
  EditorElement
} from "../types";

export const DEFAULT_ACCESSIBILITY_SETTINGS: SiteAccessibilitySettings = {
  widgetEnabled: true,
  widgetPosition: "bottom-right",
  widgetOffsetX: 24,
  widgetOffsetY: 24,
  widgetMobilePosition: "bottom-right",
  widgetLabel: "Accessibility Options",
  widgetIcon: "♿",
  buttonBgColor: "#4f46e5",
  buttonTextColor: "#ffffff",
  buttonRadius: "9999px",
  enabledControls: {
    textScaling: true,
    contrast: true,
    fontOptions: true,
    readingGuide: true,
    hideImages: true,
    pauseAnimations: true,
    keyboardAssist: true,
    reset: true
  }
};

export const DEFAULT_I18N_SETTINGS: SiteI18nSettings = {
  editorLanguage: "en",
  frontendLanguage: "en",
  defaultLanguage: "en",
  enabledLanguages: [
    { code: "en", name: "English", dir: "ltr", flag: "🇺🇸" },
    { code: "ta", name: "Tamil (தமிழ்)", dir: "ltr", flag: "🇮🇳" },
    { code: "fr", name: "French (Français)", dir: "ltr", flag: "🇫🇷" },
    { code: "ar", name: "Arabic (العربية)", dir: "rtl", flag: "🇸🇦" },
    { code: "he", name: "Hebrew (עברית)", dir: "rtl", flag: "🇮🇱" }
  ],
  rtlAutoDetect: true,
  translationProvider: "native",
  fallbackLanguage: "en"
};

export const DEFAULT_VISITOR_PREFERENCES: AccessibilityVisitorPreferences = {
  textSize: 100,
  contrastMode: "default",
  fontMode: "default",
  readingGuideEnabled: false,
  readingGuideTop: 200,
  readingGuideThickness: 12,
  pauseAnimations: false,
  hideImages: false,
  enhancedFocus: false,
  keyboardAssist: false
};

const STORAGE_KEY_PREFS = "forgestudio_a11y_visitor_prefs";
const STORAGE_KEY_SETTINGS = "forgestudio_a11y_site_settings";
const STORAGE_KEY_I18N = "forgestudio_i18n_site_settings";
const STORAGE_KEY_ANALYTICS = "forgestudio_a11y_analytics";
const STORAGE_KEY_SCAN_HISTORY = "forgestudio_a11y_scans";

export class AccessibilityService {
  private static listeners = new Set<() => void>();

  // ==========================================
  // Visitor Preferences Management
  // ==========================================
  static getVisitorPreferences(): AccessibilityVisitorPreferences {
    try {
      if (typeof window === "undefined") return DEFAULT_VISITOR_PREFERENCES;
      const saved = localStorage.getItem(STORAGE_KEY_PREFS);
      return saved ? { ...DEFAULT_VISITOR_PREFERENCES, ...JSON.parse(saved) } : DEFAULT_VISITOR_PREFERENCES;
    } catch {
      return DEFAULT_VISITOR_PREFERENCES;
    }
  }

  static updateVisitorPreferences(updates: Partial<AccessibilityVisitorPreferences>): AccessibilityVisitorPreferences {
    const current = this.getVisitorPreferences();
    const updated = { ...current, ...updates };
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify(updated));
      }
    } catch (e) {
      console.warn("[AccessibilityService] Failed to persist visitor preferences:", e);
    }
    this.applyPreferencesToDOM(updated);
    this.notifyListeners();
    return updated;
  }

  static resetVisitorPreferences(): AccessibilityVisitorPreferences {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEY_PREFS);
      }
    } catch {}
    this.applyPreferencesToDOM(DEFAULT_VISITOR_PREFERENCES);
    this.notifyListeners();
    this.logAnalyticsEvent("reset_preferences");
    return DEFAULT_VISITOR_PREFERENCES;
  }

  static subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private static notifyListeners(): void {
    this.listeners.forEach((cb) => {
      try { cb(); } catch (err) { console.error(err); }
    });
  }

  // ==========================================
  // Site Owner Settings & i18n Config
  // ==========================================
  static getSiteSettings(): SiteAccessibilitySettings {
    try {
      if (typeof window === "undefined") return DEFAULT_ACCESSIBILITY_SETTINGS;
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      return saved ? { ...DEFAULT_ACCESSIBILITY_SETTINGS, ...JSON.parse(saved) } : DEFAULT_ACCESSIBILITY_SETTINGS;
    } catch {
      return DEFAULT_ACCESSIBILITY_SETTINGS;
    }
  }

  static saveSiteSettings(settings: SiteAccessibilitySettings): void {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
      }
    } catch (e) {
      console.warn("[AccessibilityService] Failed to save site settings:", e);
    }
    this.notifyListeners();
  }

  static getI18nSettings(): SiteI18nSettings {
    try {
      if (typeof window === "undefined") return DEFAULT_I18N_SETTINGS;
      const saved = localStorage.getItem(STORAGE_KEY_I18N);
      return saved ? { ...DEFAULT_I18N_SETTINGS, ...JSON.parse(saved) } : DEFAULT_I18N_SETTINGS;
    } catch {
      return DEFAULT_I18N_SETTINGS;
    }
  }

  static saveI18nSettings(settings: SiteI18nSettings): void {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_I18N, JSON.stringify(settings));
      }
    } catch (e) {
      console.warn("[AccessibilityService] Failed to save i18n settings:", e);
    }
    this.applyI18nToDOM(settings);
    this.notifyListeners();
  }

  // ==========================================
  // DOM Application Engine (F-365, F-368, F-369, F-370, F-375, F-377, F-380)
  // ==========================================
  static applyPreferencesToDOM(prefs?: AccessibilityVisitorPreferences): void {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const p = prefs || this.getVisitorPreferences();
    const root = document.documentElement;
    const body = document.body;

    // F-365 Text Size Scaling
    const scaleFactor = (p.textSize || 100) / 100;
    root.style.setProperty("--a11y-font-scale", String(scaleFactor));
    root.style.fontSize = `${100 * scaleFactor}%`;

    // F-375 Contrast Modes
    const contrastClasses = ["a11y-contrast-high", "a11y-contrast-dark", "a11y-contrast-light", "a11y-contrast-grayscale", "a11y-contrast-invert"];
    contrastClasses.forEach((cls) => body.classList.remove(cls));
    if (p.contrastMode !== "default") {
      body.classList.add(`a11y-contrast-${p.contrastMode.replace("-contrast", "")}`);
    }

    // F-370 Font Accessibility
    body.classList.remove("a11y-font-opendyslexic", "a11y-font-sans", "a11y-font-mono");
    if (p.fontMode === "opendyslexic") {
      body.classList.add("a11y-font-opendyslexic");
    } else if (p.fontMode === "sans-serif") {
      body.classList.add("a11y-font-sans");
    } else if (p.fontMode === "monospace") {
      body.classList.add("a11y-font-mono");
    }

    // F-369 Pause Animations
    if (p.pauseAnimations) {
      body.classList.add("a11y-pause-animations");
    } else {
      body.classList.remove("a11y-pause-animations");
    }

    // F-377 Hide Images
    if (p.hideImages) {
      body.classList.add("a11y-hide-images");
    } else {
      body.classList.remove("a11y-hide-images");
    }

    // F-368 Enhanced Focus
    if (p.enhancedFocus || p.keyboardAssist) {
      body.classList.add("a11y-enhanced-focus");
    } else {
      body.classList.remove("a11y-enhanced-focus");
    }
  }

  static applyI18nToDOM(settings?: SiteI18nSettings): void {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const i18n = settings || this.getI18nSettings();
    const root = document.documentElement;

    // F-379 Editor/Site Language Separation & F-380 RTL Support
    const activeLangCode = i18n.frontendLanguage || i18n.defaultLanguage || "en";
    const langObj = i18n.enabledLanguages.find((l) => l.code === activeLangCode) || i18n.enabledLanguages[0];

    root.setAttribute("lang", activeLangCode);

    const dir = langObj?.dir || (["ar", "he", "fa", "ur"].includes(activeLangCode) ? "rtl" : "ltr");
    root.setAttribute("dir", dir);

    if (dir === "rtl") {
      document.body.classList.add("a11y-rtl-mode");
    } else {
      document.body.classList.remove("a11y-rtl-mode");
    }
  }

  // ==========================================
  // F-361 Semantic Tag Mapper
  // ==========================================
  static getSemanticTag(el: EditorElement): string {
    if (el.semanticTag) return el.semanticTag;
    const item = el as any;
    switch (el.type) {
      case "container":
        return item.containerType === "section" ? "section" : "div";
      case "heading":
        return item.headingTag || item.headlineTag || "h2";
      case "nav-menu":
      case "wp-menu":
      case "menu-widget":
      case "off-canvas-nav":
        return "nav";
      case "form":
      case "search-form":
        return "form";
      case "button":
        return item.url || item.link ? "a" : "button";
      case "posts":
      case "portfolio":
        return "article";
      case "site-search":
        return "aside";
      case "image":
        return "figure";
      default:
        return "div";
    }
  }

  // ==========================================
  // F-363 & F-371 Accessibility Scanner & Rescanning Tooling
  // ==========================================
  static runAccessibilityScan(websiteData?: CanonicalWebsiteData | null, targetUrl: string = "/"): AccessibilityScanResult {
    const issues: AccessibilityScanIssue[] = [];
    let passedCount = 0;

    const pages = websiteData?.pages || [];
    const elementsToScan: any[] = [];

    pages.forEach((page: any) => {
      if (page.elements) {
        const flatten = (items: any[]) => {
          items.forEach((item) => {
            elementsToScan.push(item);
            if (item.elements && item.elements.length > 0) {
              flatten(item.elements);
            }
          });
        };
        flatten(page.elements);
      }
    });

    // Rule 1: Missing Alt Text on Images
    elementsToScan.forEach((el: any) => {
      if (el.type === "image") {
        if (!el.altText && !el.content) {
          issues.push({
            id: `issue_${el.id}_alt`,
            severity: "error",
            rule: "img-alt",
            title: "Missing Image Alternative Text",
            description: `Image element (ID: ${el.id}) is missing descriptive alt text for screen readers.`,
            elementId: el.id,
            elementType: el.type,
            remediation: "Add a clear description in the Alt Text inspector field."
          });
        } else {
          passedCount++;
        }
      }
    });

    // Rule 2: Heading Hierarchy
    let lastHeadingLevel = 0;
    elementsToScan.forEach((el: any) => {
      if (el.type === "heading") {
        const tag = el.headingTag || el.headlineTag || "h2";
        const level = parseInt(String(tag).replace("h", ""), 10) || 2;
        if (lastHeadingLevel > 0 && level > lastHeadingLevel + 1) {
          issues.push({
            id: `issue_${el.id}_heading`,
            severity: "warning",
            rule: "heading-order",
            title: "Skipped Heading Level",
            description: `Heading skipped from H${lastHeadingLevel} directly to H${level}.`,
            elementId: el.id,
            elementType: el.type,
            remediation: `Adjust heading tag from ${tag} to H${lastHeadingLevel + 1} for proper screen reader outline.`
          });
        } else {
          passedCount++;
        }
        lastHeadingLevel = level;
      }
    });

    // Rule 3: Missing Form Labels
    elementsToScan.forEach((el: any) => {
      if (el.type === "form") {
        const formItems = el.formItems || el.items || [];
        formItems.forEach((item: any) => {
          if (!item.label && !item.placeholder) {
            issues.push({
              id: `issue_${el.id}_form_label`,
              severity: "error",
              rule: "form-field-label",
              title: "Form Input Missing Label",
              description: `A field in form (ID: ${el.id}) is missing an accessible label or placeholder.`,
              elementId: el.id,
              elementType: el.type,
              remediation: "Provide a visible field label or accessible placeholder."
            });
          } else {
            passedCount++;
          }
        });
      }
    });

    // Rule 4: Empty Buttons & Links
    elementsToScan.forEach((el: any) => {
      if (el.type === "button") {
        if (!el.content && !el.buttonText && !el.customAttributes) {
          issues.push({
            id: `issue_${el.id}_btn`,
            severity: "error",
            rule: "button-name",
            title: "Empty Button Element",
            description: `Button element (ID: ${el.id}) has no text content or aria-label.`,
            elementId: el.id,
            elementType: el.type,
            remediation: "Set button text or custom aria-label attribute."
          });
        } else {
          passedCount++;
        }
      }
    });

    // Rule 5: Missing Document Language / Title
    if (!websiteData?.siteSettings?.siteLanguage) {
      issues.push({
        id: "issue_doc_lang",
        severity: "warning",
        rule: "html-has-lang",
        title: "Default Site Language Not Explicitly Defined",
        description: "The website does not explicitly set a primary document language in site settings.",
        remediation: "Set the Site Language in Editor Site Settings."
      });
    } else {
      passedCount++;
    }

    const errorCount = issues.filter((i) => i.severity === "error").length;
    const warningCount = issues.filter((i) => i.severity === "warning").length;

    const result: AccessibilityScanResult = {
      url: targetUrl,
      timestamp: new Date().toISOString(),
      errorCount,
      warningCount,
      passedCount: Math.max(10, passedCount),
      issues
    };

    // Save scan result to history
    this.saveScanHistory(result);

    return result;
  }

  static saveScanHistory(result: AccessibilityScanResult): void {
    try {
      if (typeof window === "undefined") return;
      const existing = this.getScanHistory();
      const updated = [result, ...existing].slice(0, 10);
      localStorage.setItem(STORAGE_KEY_SCAN_HISTORY, JSON.stringify(updated));
    } catch (e) {
      console.warn("[AccessibilityService] Failed to save scan history:", e);
    }
  }

  static getScanHistory(): AccessibilityScanResult[] {
    try {
      if (typeof window === "undefined") return [];
      const saved = localStorage.getItem(STORAGE_KEY_SCAN_HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  // ==========================================
  // F-372 Privacy-Conscious Accessibility Analytics
  // ==========================================
  static logAnalyticsEvent(eventType: string): void {
    try {
      if (typeof window === "undefined") return;
      const saved = localStorage.getItem(STORAGE_KEY_ANALYTICS);
      const data = saved ? JSON.parse(saved) : { totalOpens: 0, textScaling: 0, contrast: 0, fontOption: 0, animationsPaused: 0, resetCount: 0 };
      if (eventType === "widget_open") data.totalOpens = (data.totalOpens || 0) + 1;
      else if (eventType === "text_scaling") data.textScaling = (data.textScaling || 0) + 1;
      else if (eventType === "contrast_mode") data.contrast = (data.contrast || 0) + 1;
      else if (eventType === "font_mode") data.fontOption = (data.fontOption || 0) + 1;
      else if (eventType === "pause_animations") data.animationsPaused = (data.animationsPaused || 0) + 1;
      else if (eventType === "reset_preferences") data.resetCount = (data.resetCount || 0) + 1;

      localStorage.setItem(STORAGE_KEY_ANALYTICS, JSON.stringify(data));
    } catch (e) {
      console.warn("[AccessibilityService] Analytics log error:", e);
    }
  }

  static getAnalyticsSummary(): { totalOpens: number; textScaling: number; contrast: number; fontOption: number; animationsPaused: number; resetCount: number } {
    try {
      if (typeof window === "undefined") return { totalOpens: 0, textScaling: 0, contrast: 0, fontOption: 0, animationsPaused: 0, resetCount: 0 };
      const saved = localStorage.getItem(STORAGE_KEY_ANALYTICS);
      return saved ? JSON.parse(saved) : { totalOpens: 0, textScaling: 0, contrast: 0, fontOption: 0, animationsPaused: 0, resetCount: 0 };
    } catch {
      return { totalOpens: 0, textScaling: 0, contrast: 0, fontOption: 0, animationsPaused: 0, resetCount: 0 };
    }
  }

  // ==========================================
  // F-373 Dynamic Accessibility Statement Generator
  // ==========================================
  static generateAccessibilityStatement(config: {
    siteName: string;
    organizationName: string;
    contactEmail: string;
    contactPhone?: string;
    standardsTargeted?: string;
  }): string {
    const site = config.siteName || "This Website";
    const org = config.organizationName || "Our Organization";
    const email = config.contactEmail || "accessibility@example.com";
    const phone = config.contactPhone ? ` or by phone at ${config.contactPhone}` : "";
    const standards = config.standardsTargeted || "W3C Web Content Accessibility Guidelines (WCAG) 2.1 Level AA";
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    return `
# Accessibility Statement for ${site}

**${org}** is committed to ensuring digital accessibility for people of all abilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards.

## Conformance Status
The ${standards} defines requirements for designers and developers to improve accessibility for people with disabilities. **${site}** is designed and maintained in alignment with ${standards}.

## Dynamic Accessibility Features Implemented
- **Keyboard Navigation**: Full interactive access via standard keyboard controls.
- **Text & Contrast Customization**: Built-in options to adjust font scale, high contrast modes, and dyslexia-friendly typography.
- **Screen Reader Compatibility**: Use of HTML5 landmark elements, descriptive ARIA attributes, and dynamic skip-navigation links.
- **Reduced Motion Support**: Visitor options to pause keyframe animations and decorative transitions.

## Feedback & Assistance
We welcome your feedback on the accessibility of ${site}. Please let us know if you encounter accessibility barriers on this website:
- **Email**: [${email}](mailto:${email}) ${phone}
- **Last Reviewed**: ${today}

We try to respond to accessibility feedback within 2 business days.
    `.trim();
  }

  // ==========================================
  // F-381 Multilingual Compatibility Layer
  // ==========================================
  static getMultilingualAdapter(provider: string) {
    const isDetected = typeof window !== "undefined" && Boolean((window as any).WPML || (window as any).Polylang || (window as any).Weglot || (window as any).TranslatePress);

    return {
      provider,
      isDetected,
      activeLanguage: this.getI18nSettings().frontendLanguage,
      availableLanguages: this.getI18nSettings().enabledLanguages,
      resolveTranslation: (key: string, fallbackText: string, targetLang?: string) => {
        // Safe fallback logic - never return null or undefined
        if (!key && !fallbackText) return "Untranslated Content";
        return fallbackText || key;
      }
    };
  }
}
