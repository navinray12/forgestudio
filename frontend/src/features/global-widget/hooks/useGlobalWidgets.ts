import { useState, useEffect, useCallback, useMemo } from "react";
import type { GlobalWidget, CreateGlobalWidgetPayload, UpdateGlobalWidgetPayload } from "../types/globalWidget.types";
import {
  getGlobalWidgets,
  saveGlobalWidget,
  updateGlobalWidgetService,
  deleteGlobalWidgetService,
} from "../services/globalWidgetService";

interface UseGlobalWidgetsParams {
  apiUrl: string;
}

export function useGlobalWidgets({ apiUrl }: UseGlobalWidgetsParams) {
  const [globalWidgets, setGlobalWidgets] = useState<GlobalWidget[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [previewWidget, setPreviewWidget] = useState<GlobalWidget | null>(null);

  const fetchWidgets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getGlobalWidgets(apiUrl);
      setGlobalWidgets(data);
    } catch (err: any) {
      setError(err?.message || "Unable to load Global Widgets.");
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchWidgets();
  }, [fetchWidgets]);

  const filteredWidgets = useMemo(() => {
    if (!searchQuery.trim()) {
      return globalWidgets;
    }
    const q = searchQuery.toLowerCase().trim();
    return globalWidgets.filter((w) => {
      const nameMatch = w.name.toLowerCase().includes(q);
      const descMatch = w.description ? w.description.toLowerCase().includes(q) : false;
      return nameMatch || descMatch;
    });
  }, [globalWidgets, searchQuery]);

  const createWidget = useCallback(
    async (payload: CreateGlobalWidgetPayload) => {
      setIsSaving(true);
      setError(null);
      try {
        const created = await saveGlobalWidget(apiUrl, payload);
        setGlobalWidgets((prev) => [created, ...prev.filter((w) => w.id !== created.id)]);
        return created;
      } catch (err: any) {
        setError(err?.message || "Unable to save Global Widget.");
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [apiUrl]
  );

  const updateWidget = useCallback(
    async (id: string, payload: UpdateGlobalWidgetPayload) => {
      setIsSaving(true);
      setError(null);
      try {
        const updated = await updateGlobalWidgetService(apiUrl, id, payload);
        setGlobalWidgets((prev) => prev.map((w) => (w.id === id ? updated : w)));
        if (previewWidget?.id === id) {
          setPreviewWidget(updated);
        }
        return updated;
      } catch (err: any) {
        setError(err?.message || "Unable to update Global Widget.");
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [apiUrl, previewWidget]
  );

  const removeWidget = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await deleteGlobalWidgetService(apiUrl, id);
        setGlobalWidgets((prev) => prev.filter((w) => w.id !== id));
        if (previewWidget?.id === id) {
          setPreviewWidget(null);
        }
      } catch (err: any) {
        setError(err?.message || "Unable to delete Global Widget.");
        throw err;
      }
    },
    [apiUrl, previewWidget]
  );

  return {
    globalWidgets,
    filteredWidgets,
    isLoading,
    isSaving,
    error,
    searchQuery,
    setSearchQuery,
    previewWidget,
    setPreviewWidget,
    createWidget,
    updateWidget,
    removeWidget,
    refetchGlobalWidgets: fetchWidgets,
  };
}
