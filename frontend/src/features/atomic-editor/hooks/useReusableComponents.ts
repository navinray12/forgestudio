import { useState, useEffect, useCallback, useMemo } from "react";
import type { ReusableComponentDefinition, CreateReusableComponentPayload } from "../types/reusableComponents.types";
import { ReusableComponentService } from "../services/reusableComponentService";

export function useReusableComponents() {
  const [components, setComponents] = useState<ReusableComponentDefinition[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [editingComponent, setEditingComponent] = useState<ReusableComponentDefinition | null>(null);
  const [deletingComponent, setDeletingComponent] = useState<ReusableComponentDefinition | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);

  const fetchComponents = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      const data = ReusableComponentService.getComponents();
      setComponents(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load Reusable Components.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  const filteredComponents = useMemo(() => {
    if (!searchQuery.trim()) return components;
    const q = searchQuery.toLowerCase().trim();
    return components.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q))
    );
  }, [components, searchQuery]);

  const createComponent = async (payload: CreateReusableComponentPayload) => {
    setError(null);
    try {
      const created = ReusableComponentService.createComponent(payload);
      setComponents((prev) => [...prev, created]);
      return created;
    } catch (err: any) {
      setError(err?.message || "Failed to create Reusable Component.");
      throw err;
    }
  };

  const updateComponent = async (id: string, payload: Partial<CreateReusableComponentPayload>) => {
    setError(null);
    try {
      const updated = ReusableComponentService.updateComponent(id, payload);
      setComponents((prev) => prev.map((item) => (item.id === id ? updated : item)));
      return updated;
    } catch (err: any) {
      setError(err?.message || "Failed to update Reusable Component.");
      throw err;
    }
  };

  const duplicateComponent = async (id: string) => {
    setError(null);
    try {
      const duplicated = ReusableComponentService.duplicateComponent(id);
      setComponents((prev) => [...prev, duplicated]);
      return duplicated;
    } catch (err: any) {
      setError(err?.message || "Failed to duplicate Reusable Component.");
      throw err;
    }
  };

  const deleteComponent = async (id: string) => {
    setError(null);
    try {
      ReusableComponentService.deleteComponent(id);
      setComponents((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      setError(err?.message || "Failed to delete Reusable Component.");
      throw err;
    }
  };

  return {
    components,
    filteredComponents,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    editingComponent,
    setEditingComponent,
    deletingComponent,
    setDeletingComponent,
    isFormOpen,
    setIsFormOpen,
    createComponent,
    updateComponent,
    duplicateComponent,
    deleteComponent,
    refreshComponents: fetchComponents,
  };
}
