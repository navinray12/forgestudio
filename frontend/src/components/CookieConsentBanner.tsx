import React, { useState, useEffect } from "react";
import { Cookie, Shield, X } from "lucide-react";

export interface CookieConsentConfig {
  enabled?: boolean;
  message?: string;
  buttonText?: string;
  policyUrl?: string;
  theme?: "dark" | "light";
}

interface CookieConsentBannerProps {
  config?: CookieConsentConfig;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({ config }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // If not explicitly enabled, do not render
    if (!config?.enabled) {
      setVisible(false);
      return;
    }

    try {
      const consented = localStorage.getItem("cookie_consent_accepted");
      if (!consented) {
        // Subtle delay for smoother entrance
        const timer = setTimeout(() => setVisible(true), 600);
        return () => clearTimeout(timer);
      }
    } catch {
      setVisible(false);
    }
  }, [config?.enabled]);

  const handleAccept = () => {
    try {
      localStorage.setItem(
        "cookie_consent_accepted",
        JSON.stringify({
          acceptedAt: new Date().toISOString(),
          version: "1.0",
        })
      );
    } catch {}
    setVisible(false);
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  if (!visible || !config?.enabled) return null;

  const isDark = config.theme !== "light";
  const message = config.message || "We use cookies to improve your experience on our website.";
  const buttonText = config.buttonText || "Accept All";

  return (
    <div
      role="region"
      aria-label="Cookie Consent"
      className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 p-4 rounded-2xl shadow-2xl border transition-all duration-300 animate-in slide-in-from-bottom-5 ${
        isDark
          ? "bg-slate-900/95 text-slate-100 border-slate-700/80 backdrop-blur-md"
          : "bg-white/95 text-slate-800 border-slate-200 backdrop-blur-md"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-xl shrink-0 ${isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
          <Cookie className="w-5 h-5" />
        </div>

        <div className="flex-1 text-xs">
          <div className="font-bold mb-1 flex items-center justify-between">
            <span>Cookie &amp; Privacy Notice</span>
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-slate-200 p-0.5"
              aria-label="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className={`leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            {message}
          </p>

          {config.policyUrl && (
            <div className="mt-1.5">
              <a
                href={config.policyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] underline font-medium text-blue-400 hover:text-blue-300"
              >
                Learn more in our Privacy Policy
              </a>
            </div>
          )}

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              onClick={handleAccept}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-sm transition active:scale-95 cursor-pointer"
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
