import React, { useEffect } from "react";

export interface AccessibilityStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationName?: string;
  contactEmail?: string;
  complianceLevel?: string;
}

export const AccessibilityStatementModal: React.FC<AccessibilityStatementModalProps> = ({
  isOpen,
  onClose,
  organizationName = "ForgeStudio Website",
  contactEmail = "accessibility@forgestudio.com",
  complianceLevel = "WCAG 2.1 Level AA",
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 font-sans animate-in fade-in"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="a11y-statement-title"
        aria-describedby="a11y-statement-desc"
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl space-y-5 text-slate-800 text-xs border border-slate-200"
      >
        <header role="banner" className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white text-xl shadow-md">
              📜
            </span>
            <div>
              <h2 id="a11y-statement-title" className="text-base font-extrabold text-slate-900 tracking-tight">
                Accessibility Statement
              </h2>
              <p className="text-xs text-slate-500">Universal design, standards compliance & contact declaration</p>
            </div>
          </div>
          <button
            type="button"
            role="button"
            aria-label="Close Accessibility Statement Modal"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition cursor-pointer"
          >
            ✕
          </button>
        </header>

        <div id="a11y-statement-desc" className="space-y-4 leading-relaxed text-slate-600">
          <p>
            <strong className="text-slate-900">{organizationName}</strong> is committed to ensuring digital accessibility for people of all abilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards.
          </p>

          <div role="region" aria-label="Conformance Status" className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-1.5 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-base">🏆</span>
              <h3 className="font-extrabold text-slate-900 text-sm">Conformance Status</h3>
            </div>
            <p className="text-indigo-950 font-medium">
              The Web Content Accessibility Guidelines (WCAG) defines requirements for designers and developers to improve accessibility for people with disabilities. This website is configured to conform with <strong className="text-indigo-700 font-extrabold">{complianceLevel}</strong>.
            </p>
          </div>

          <div role="region" aria-label="Built-in Features" className="space-y-2">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
              <span>✨</span>
              <span>Accessibility Features Built-In</span>
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
              <li className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-indigo-600 font-bold">✓</span> Semantic HTML5 layout tags (`header`, `nav`, `main`, `footer`)
              </li>
              <li className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-indigo-600 font-bold">✓</span> Full keyboard navigation with high contrast focus rings
              </li>
              <li className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-indigo-600 font-bold">✓</span> Alternative text attributes for non-text media content
              </li>
              <li className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-indigo-600 font-bold">✓</span> Visitor font scaling, dyslexia font, and contrast modes
              </li>
              <li className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-indigo-600 font-bold">✓</span> Motion pause controls adhering to `prefers-reduced-motion`
              </li>
              <li className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-indigo-600 font-bold">✓</span> Built-in text-to-speech screen reader assistant
              </li>
            </ul>
          </div>

          <div role="region" aria-label="Feedback and Support" className="space-y-2 pt-3 border-t border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-sm">Feedback & Accessibility Support</h3>
            <p>
              We welcome your feedback on the accessibility of {organizationName}. Please let us know if you encounter accessibility barriers:
            </p>
            <p className="font-mono text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 p-2.5 rounded-xl flex items-center justify-between">
              <span>Email: <a href={`mailto:${contactEmail}`} className="underline text-indigo-800">{contactEmail}</a></span>
              <span className="text-[10px] text-indigo-600 font-sans font-extrabold bg-white px-2 py-0.5 rounded-md border border-indigo-200">24-hour response</span>
            </p>
          </div>
        </div>

        <footer role="contentinfo" className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            role="button"
            aria-label="Close Statement Modal"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-extrabold text-xs hover:from-indigo-700 hover:to-purple-700 transition shadow-md cursor-pointer"
          >
            Close Statement
          </button>
        </footer>
      </div>
    </div>
  );
};
