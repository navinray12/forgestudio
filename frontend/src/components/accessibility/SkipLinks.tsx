import React from "react";

export interface SkipLinksProps {
  targetId?: string;
  label?: string;
}

export const SkipLinks: React.FC<SkipLinksProps> = ({
  targetId = "main-content",
  label = "Skip to main content",
}) => {
  const handleSkip = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId) || document.querySelector("main") || document.querySelector("[role='main']");
    if (target) {
      target.tabIndex = -1;
      target.focus();
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav role="region" aria-label="Keyboard Skip Navigation">
      <a
        href={`#${targetId}`}
        role="link"
        aria-label={label}
        onClick={handleSkip}
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[99999] focus:px-6 focus:py-3 focus:bg-gradient-to-r focus:from-indigo-600 focus:to-purple-600 focus:text-white focus:font-extrabold focus:text-xs focus:rounded-2xl focus:shadow-2xl focus:outline-none focus:ring-4 focus:ring-indigo-400 focus:border-2 focus:border-white transition-all animate-bounce"
      >
        <span>⚡ {label}</span>
      </a>
    </nav>
  );
};
