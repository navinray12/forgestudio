import { useState, useEffect, useCallback, useMemo } from "react";
import type { Template } from "../types/template.types";
import { getUserTemplates, updateTemplate, toggleFavorite, toggleTemplateSharing, deleteTemplate, importTemplate, duplicateTemplate } from "../services/templateService";
import { PRO_TEMPLATES } from "../data/proTemplatesData";

interface UseTemplateLibraryParams {
  apiUrl: string;
}

export function useTemplateLibrary({ apiUrl }: UseTemplateLibraryParams) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isFavoritesOnly, setIsFavoritesOnly] = useState<boolean>(false);
  const [pendingFavoriteIds, setPendingFavoriteIds] = useState<Set<string>>(new Set());
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getUserTemplates(apiUrl);
      setTemplates([...PRO_TEMPLATES, ...data]);
    } catch (err: any) {
      setTemplates(PRO_TEMPLATES);
      setError(err?.message || "Unable to load user templates.");
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Local case-insensitive search, category, and favorite filtering
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      // Favorites filter check
      if (isFavoritesOnly || selectedCategory === "FAVORITES") {
        if (!template.isFavorite) {
          return false;
        }
      }

      // Pro filter check
      if (selectedCategory === "PRO") {
        if (!template.isPro) {
          return false;
        }
      } else if (
        selectedCategory !== "ALL" &&
        selectedCategory !== "FAVORITES" &&
        selectedCategory !== "MY_TEMPLATES"
      ) {
        const itemCat = template.category || "Other";
        const catMatch = itemCat.toLowerCase() === selectedCategory.toLowerCase();
        const typeMatch = template.type.toLowerCase() === selectedCategory.toLowerCase();
        if (!catMatch && !typeMatch) {
          return false;
        }
      }

      // Search query check
      if (!searchQuery.trim()) {
        return true;
      }

      const q = searchQuery.toLowerCase().trim();
      const nameMatch = template.name.toLowerCase().includes(q);
      const descMatch = template.description
        ? template.description.toLowerCase().includes(q)
        : false;
      const catMatch = template.category
        ? template.category.toLowerCase().includes(q)
        : false;

      return nameMatch || descMatch || catMatch;
    });
  }, [templates, searchQuery, selectedCategory, isFavoritesOnly]);

  const openPreview = useCallback((template: Template) => {
    setPreviewTemplate(template);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewTemplate(null);
  }, []);

  const toggleFavoriteItem = useCallback(
    async (templateId: string) => {
      if (pendingFavoriteIds.has(templateId)) return;

      const target = templates.find((t) => t.id === templateId);
      if (!target) return;

      const newFavoriteState = !target.isFavorite;

      // Optimistic local update
      setTemplates((prev) =>
        prev.map((t) => (t.id === templateId ? { ...t, isFavorite: newFavoriteState } : t))
      );
      if (previewTemplate?.id === templateId) {
        setPreviewTemplate((prev) => (prev ? { ...prev, isFavorite: newFavoriteState } : null));
      }

      setPendingFavoriteIds((prev) => new Set(prev).add(templateId));

      try {
        await toggleFavorite(apiUrl, templateId, newFavoriteState);
      } catch (err: any) {
        // Revert state on failure
        setTemplates((prev) =>
          prev.map((t) => (t.id === templateId ? { ...t, isFavorite: !newFavoriteState } : t))
        );
        if (previewTemplate?.id === templateId) {
          setPreviewTemplate((prev) => (prev ? { ...prev, isFavorite: !newFavoriteState } : null));
        }
        setError("Unable to update favorite.");
        setTimeout(() => setError(null), 3000);
      } finally {
        setPendingFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(templateId);
          return next;
        });
      }
    },
    [apiUrl, templates, previewTemplate, pendingFavoriteIds]
  );

  const toggleShareItem = useCallback(
    async (templateId: string, isShared: boolean) => {
      const updated = await toggleTemplateSharing(apiUrl, templateId, isShared);
      setTemplates((prev) =>
        prev.map((t) => (t.id === templateId ? updated : t))
      );
      if (previewTemplate?.id === templateId) {
        setPreviewTemplate(updated);
      }
      return updated;
    },
    [apiUrl, previewTemplate]
  );

  const renameTemplateItem = useCallback(
    async (templateId: string, name: string, description?: string, category?: string) => {
      const updated = await updateTemplate(apiUrl, templateId, { name, description, category });
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === templateId
            ? {
                ...t,
                name: updated.name,
                description: updated.description,
                category: updated.category || t.category,
              }
            : t
        )
      );
      if (previewTemplate?.id === templateId) {
        setPreviewTemplate((prev) =>
          prev
            ? {
                ...prev,
                name: updated.name,
                description: updated.description,
                category: updated.category || prev.category,
              }
            : null
        );
      }
      return updated;
    },
    [apiUrl, previewTemplate]
  );

  const deleteTemplateItem = useCallback(
    async (templateId: string) => {
      await deleteTemplate(apiUrl, templateId);
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      if (previewTemplate?.id === templateId) {
        setPreviewTemplate(null);
      }
    },
    [apiUrl, previewTemplate]
  );

  const importTemplateItem = useCallback(
    async (payload: any) => {
      const created = await importTemplate(apiUrl, payload);
      setTemplates((prev) => [created, ...prev]);
      return created;
    },
    [apiUrl]
  );

  const duplicateTemplateItem = useCallback(
    async (sourceTemplate: Template) => {
      const duplicated = await duplicateTemplate(apiUrl, sourceTemplate);
      setTemplates((prev) => [duplicated, ...prev]);
      return duplicated;
    },
    [apiUrl]
  );

  return {
    templates,
    filteredTemplates,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    isFavoritesOnly,
    setIsFavoritesOnly,
    pendingFavoriteIds,
    toggleFavoriteItem,
    toggleShareItem,
    previewTemplate,
    openPreview,
    closePreview,
    renameTemplateItem,
    deleteTemplateItem,
    importTemplateItem,
    duplicateTemplateItem,
    refetchTemplates: loadTemplates,
  };

}
