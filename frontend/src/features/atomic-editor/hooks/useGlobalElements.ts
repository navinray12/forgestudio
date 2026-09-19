import { useState, useEffect, useCallback, useMemo } from "react";
import type { GlobalElementDefinition, CreateGlobalElementPayload } from "../types/globalElements.types";
import { GlobalElementService } from "../services/globalElementService";

export function useGlobalElements() {
  const [globalElements, setGlobalElements] = useState<GlobalElementDefinition[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [editingGlobalElement, setEditingGlobalElement] = useState<GlobalElementDefinition | null>(null);
  const [deletingGlobalElement, setDeletingGlobalElement] = useState<GlobalElementDefinition | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);

  const fetchGlobalElements = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      const data = GlobalElementService.getGlobalElements();
      setGlobalElements(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load Global Elements.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGlobalElements();
  }, [fetchGlobalElements]);

  const filteredGlobalElements = useMemo(() => {
    if (!searchQuery.trim()) return globalElements;
    const q = searchQuery.toLowerCase().trim();
    return globalElements.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.elementType.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
    );
  }, [globalElements, searchQuery]);

  const createGlobalElement = async (payload: CreateGlobalElementPayload) => {
    setError(null);
    try {
      const created = GlobalElementService.createGlobalElement(payload);
      setGlobalElements((prev) => [...prev, created]);
      return created;
    } catch (err: any) {
      setError(err?.message || "Failed to create Global Element.");
      throw err;
    }
  };

  const updateGlobalElement = async (id: string, payload: Partial<CreateGlobalElementPayload>) => {
    setError(null);
    try {
      const updated = GlobalElementService.updateGlobalElement(id, payload);
      setGlobalElements((prev) => prev.map((item) => (item.id === id ? updated : item)));
      return updated;
    } catch (err: any) {
      setError(err?.message || "Failed to update Global Element.");
      throw err;
    }
  };

  const deleteGlobalElement = async (id: string) => {
    setError(null);
    try {
      GlobalElementService.deleteGlobalElement(id);
      setGlobalElements((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      setError(err?.message || "Failed to delete Global Element.");
      throw err;
    }
  };

  return {
    globalElements,
    filteredGlobalElements,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    editingGlobalElement,
    setEditingGlobalElement,
    deletingGlobalElement,
    setDeletingGlobalElement,
    isFormOpen,
    setIsFormOpen,
    createGlobalElement,
    updateGlobalElement,
    deleteGlobalElement,
    refreshGlobalElements: fetchGlobalElements,
  };
}
