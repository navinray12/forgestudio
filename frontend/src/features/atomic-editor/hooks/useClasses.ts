import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from "react";
import type { AtomicClass, CreateClassPayload, UpdateClassPayload } from "../types/classes.types";
import { fetchClasses, saveClasses } from "../services/classService";
import { formatClassName, validateClassName } from "../utils/class.utils";

export function useClasses(websiteId?: string) {
  const [classes, setClasses] = useState<AtomicClass[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeScopeFilter, setActiveScopeFilter] = useState<"all" | "global" | "local">("all");

  const [editingClass, setEditingClass] = useState<AtomicClass | null>(null);
  const [deletingClass, setDeletingClass] = useState<AtomicClass | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [defaultIsGlobal, setDefaultIsGlobal] = useState<boolean>(true);

  // Stale request guard to prevent responses from a previously selected website from overwriting new data
  const activeWebsiteIdRef = useRef<string | undefined>(websiteId);
  useLayoutEffect(() => {
    activeWebsiteIdRef.current = websiteId;
  }, [websiteId]);

  const loadClasses = useCallback(async () => {
    const targetWebsiteId = websiteId;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchClasses(targetWebsiteId);
      // Ignore response if the user has navigated or switched to another website in the meantime
      if (activeWebsiteIdRef.current !== targetWebsiteId) {
        return;
      }
      setClasses(data);
    } catch (err: any) {
      if (activeWebsiteIdRef.current === targetWebsiteId) {
        setError("Unable to load classes.");
      }
    } finally {
      if (activeWebsiteIdRef.current === targetWebsiteId) {
        setIsLoading(false);
      }
    }
  }, [websiteId]);

  useEffect(() => {
    queueMicrotask(() => {
      loadClasses();
    });
  }, [loadClasses]);

  // Synchronize on external design system update (e.g. import in ClassManagerModal)
  useEffect(() => {
    const handleUpdate = (e: any) => {
      const detail = e?.detail;
      if (!detail) return;
      if (detail.websiteId && websiteId && detail.websiteId !== websiteId) return;
      loadClasses();
    };
    window.addEventListener("fs-design-system-updated" as any, handleUpdate);
    return () => {
      window.removeEventListener("fs-design-system-updated" as any, handleUpdate);
    };
  }, [websiteId, loadClasses]);

  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      // Scope filter
      const isGlob = Boolean(c.isGlobal || c.scope === "global");
      if (activeScopeFilter === "global" && !isGlob) return false;
      if (activeScopeFilter === "local" && isGlob) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = c.name.toLowerCase().includes(q);
        const matchKey = c.key.toLowerCase().includes(q);
        const matchDesc = c.description ? c.description.toLowerCase().includes(q) : false;
        if (!matchName && !matchKey && !matchDesc) return false;
      }

      return true;
    });
  }, [classes, searchQuery, activeScopeFilter]);

  const handleCreateClass = useCallback(
    async (payload: CreateClassPayload): Promise<AtomicClass> => {
      setError(null);
      const valCheck = validateClassName(payload.name);
      if (!valCheck.isValid) {
        throw new Error(valCheck.message || "Class name is required.");
      }

      const formattedKey = formatClassName(payload.name);

      const duplicate = classes.find(
        (c) => c.key.toLowerCase() === formattedKey.toLowerCase()
      );
      if (duplicate) {
        throw new Error(`Class with name ".${formattedKey}" already exists.`);
      }

      const isGlobal = payload.isGlobal !== undefined ? payload.isGlobal : true;

      const newClass: AtomicClass = {
        id: `cls-${Date.now()}`,
        name: payload.name.trim(),
        key: formattedKey,
        isGlobal,
        scope: isGlobal ? "global" : "local",
        styles: payload.styles || {},
        description: payload.description ? payload.description.trim() : "",
        assignedCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedList = [newClass, ...classes];
      setClasses(updatedList);
      await saveClasses(updatedList, websiteId);
      setIsFormOpen(false);
      return newClass;
    },
    [classes, websiteId]
  );

  const handleUpdateClass = useCallback(
    async (id: string, payload: UpdateClassPayload): Promise<AtomicClass> => {
      setError(null);
      const existing = classes.find((c) => c.id === id);
      if (!existing) {
        throw new Error("Class not found.");
      }

      const updatedName = payload.name !== undefined ? payload.name.trim() : existing.name;
      const updatedKey = payload.name ? formatClassName(payload.name) : existing.key;

      if (updatedKey.toLowerCase() !== existing.key.toLowerCase()) {
        const duplicate = classes.find(
          (c) => c.id !== id && c.key.toLowerCase() === updatedKey.toLowerCase()
        );
        if (duplicate) {
          throw new Error(`Class name ".${updatedKey}" already exists.`);
        }
      }

      const isGlobal = payload.isGlobal !== undefined ? payload.isGlobal : existing.isGlobal;

      const updatedClass: AtomicClass = {
        ...existing,
        name: updatedName,
        key: updatedKey,
        isGlobal,
        scope: isGlobal ? "global" : "local",
        styles: payload.styles !== undefined ? payload.styles : existing.styles,
        description: payload.description !== undefined ? payload.description.trim() : existing.description,
        updatedAt: new Date().toISOString(),
      };

      const updatedList = classes.map((c) => (c.id === id ? updatedClass : c));
      setClasses(updatedList);
      await saveClasses(updatedList, websiteId);
      setEditingClass(null);
      setIsFormOpen(false);
      return updatedClass;
    },
    [classes, websiteId]
  );

  const handleDeleteClass = useCallback(
    async (id: string): Promise<void> => {
      setError(null);
      const updatedList = classes.filter((c) => c.id !== id);
      setClasses(updatedList);
      await saveClasses(updatedList, websiteId);
      setDeletingClass(null);
    },
    [classes, websiteId]
  );

  return {
    classes,
    filteredClasses,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    activeScopeFilter,
    setActiveScopeFilter,
    editingClass,
    setEditingClass,
    deletingClass,
    setDeletingClass,
    isFormOpen,
    setIsFormOpen,
    defaultIsGlobal,
    setDefaultIsGlobal,
    createClass: handleCreateClass,
    updateClass: handleUpdateClass,
    deleteClass: handleDeleteClass,
    refetchClasses: loadClasses,
  };
}
