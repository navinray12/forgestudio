import React, { useEffect, useState } from "react";
import { useAccessibility } from "../../context/AccessibilityContext";

export const ReadingGuideBar: React.FC = () => {
  const { prefs } = useAccessibility();
  const [mouseY, setMouseY] = useState(0);

  useEffect(() => {
    if (!prefs.readingGuide) return;
    const handleMouseMove = (e: MouseEvent) => {
      setMouseY(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [prefs.readingGuide]);

  if (!prefs.readingGuide) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 right-0 z-[9998] h-8 bg-indigo-500/20 border-y-2 border-indigo-500 shadow-md transition-all duration-75"
      style={{ top: `${mouseY - 16}px` }}
    />
  );
};
