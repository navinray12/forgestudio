import { useState, useCallback, useMemo } from "react";
import type { AtomicEditorSection, AtomicSectionConfig } from "../types/atomicEditor.types";
import { ATOMIC_SECTIONS, getSectionConfig } from "../services/atomicEditorService";

export function useAtomicEditor() {
  const [activeSection, setActiveSection] = useState<AtomicEditorSection>("variables");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const currentSectionConfig = useMemo<AtomicSectionConfig>(() => {
    return getSectionConfig(activeSection) || ATOMIC_SECTIONS[0];
  }, [activeSection]);

  const openAtomicEditor = useCallback(() => setIsOpen(true), []);
  const closeAtomicEditor = useCallback(() => setIsOpen(false), []);

  return {
    isOpen,
    openAtomicEditor,
    closeAtomicEditor,
    activeSection,
    setActiveSection,
    currentSectionConfig,
    searchQuery,
    setSearchQuery,
    isLoading,
    setIsLoading,
    error,
    setError,
    sections: ATOMIC_SECTIONS,
  };
}
