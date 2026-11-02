import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import type {
  AtomicVariable,
  CreateVariablePayload,
  UpdateVariablePayload,
  VariableType,
} from "../types/variables.types";
import { fetchVariables, saveVariables } from "../services/variableService";
import { formatVariableKey, validateVariableValue } from "../utils/variable.utils";

export function useVariables(explicitWebsiteId?: string) {
  const routeParams = useParams<{ websiteId?: string }>();
  const websiteId = explicitWebsiteId || routeParams.websiteId;

  const [variables, setVariables] = useState<AtomicVariable[]>([]);
  const [serverVersion, setServerVersion] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedType, setSelectedType] = useState<VariableType | "All">("All");

  const [editingVariable, setEditingVariable] = useState<AtomicVariable | null>(null);
  const [deletingVariable, setDeletingVariable] = useState<AtomicVariable | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);

  // Stale request guard to prevent responses from a previously selected website from overwriting new data
  const activeWebsiteIdRef = useRef<string | undefined>(websiteId);
  useLayoutEffect(() => {
    activeWebsiteIdRef.current = websiteId;
  }, [websiteId]);

  const loadVariables = useCallback(async () => {
    const targetWebsiteId = websiteId;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchVariables(targetWebsiteId);
      if (activeWebsiteIdRef.current !== targetWebsiteId) {
        return; // Ignore response from switched website
      }
      setVariables(res.variables);
      setServerVersion(res.version);
    } catch (err: any) {
      if (activeWebsiteIdRef.current === targetWebsiteId) {
        setError(err?.message || "Unable to load variables.");
      }
    } finally {
      if (activeWebsiteIdRef.current === targetWebsiteId) {
        setIsLoading(false);
      }
    }
  }, [websiteId]);

  useEffect(() => {
    queueMicrotask(() => {
      loadVariables();
    });
  }, [loadVariables]);

  // Synchronize on external design system update (e.g. from VariablesManagerModal, WebsiteEditor, or another tab)
  useEffect(() => {
    const handleUpdate = (e: any) => {
      const detail = e?.detail;
      if (!detail) return;
      if (detail.websiteId && websiteId && detail.websiteId !== websiteId) return;
      if (detail.source === "useVariables") return; // Ignore own event to prevent redundant loops

      if (Array.isArray(detail.variables)) {
        const mapped: AtomicVariable[] = detail.variables.map((v: any, idx: number) => ({
          id: String(v.id || `var-${idx}`),
          name: String(v.name || `Variable ${idx + 1}`),
          key: String(v.token || v.key || `--fs-custom-${idx + 1}`),
          token: String(v.token || v.key || `--fs-custom-${idx + 1}`),
          type: (v.category || v.type || "custom") as any,
          category: (v.category || v.type || "custom") as any,
          value: String(v.value || ""),
          description: v.description,
          defaultMode: v.defaultMode || "light",
          modes: v.modes,
          createdAt: v.createdAt || new Date().toISOString(),
          updatedAt: v.updatedAt || new Date().toISOString(),
        }));
        setVariables(mapped);
        if (typeof detail.version === "number") {
          setServerVersion(detail.version);
        }
      } else {
        loadVariables();
      }
    };

    window.addEventListener("fs-design-system-updated" as any, handleUpdate);
    return () => {
      window.removeEventListener("fs-design-system-updated" as any, handleUpdate);
    };
  }, [websiteId, loadVariables]);

  const filteredVariables = useMemo(() => {
    return variables.filter((v) => {
      if (selectedType !== "All" && v.type !== selectedType) {
        return false;
      }
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      return (
        v.name.toLowerCase().includes(q) ||
        v.key.toLowerCase().includes(q) ||
        v.value.toLowerCase().includes(q) ||
        (v.description && v.description.toLowerCase().includes(q))
      );
    });
  }, [variables, searchQuery, selectedType]);

  const handleCreateVariable = useCallback(
    async (payload: CreateVariablePayload): Promise<AtomicVariable> => {
      setError(null);
      if (!payload.name || !payload.name.trim()) {
        throw new Error("Variable name is required.");
      }

      const formattedKey = formatVariableKey(payload.name);

      // Unique key validation check
      const duplicate = variables.find(
        (v) => v.key.toLowerCase() === formattedKey.toLowerCase()
      );
      if (duplicate) {
        throw new Error(`Variable with key "${formattedKey}" already exists.`);
      }

      const valCheck = validateVariableValue(payload.type, payload.value);
      if (!valCheck.isValid) {
        throw new Error(valCheck.message || "Invalid variable value.");
      }

      const newVar: AtomicVariable = {
        id: `var-${Date.now()}`,
        name: payload.name.trim(),
        key: formattedKey,
        type: payload.type,
        value: payload.value.trim(),
        description: payload.description ? payload.description.trim() : "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedList = [newVar, ...variables];

      // Priority 0: Do NOT optimistically update state before server acknowledges save
      try {
        const res = await saveVariables(updatedList, websiteId, serverVersion, undefined, "useVariables");
        setVariables(updatedList);
        if (typeof res.version === "number") {
          setServerVersion(res.version);
        }
        setIsFormOpen(false);
        return newVar;
      } catch (err: any) {
        if (err?.code === "STALE_VERSION_CONFLICT" || String(err?.message).includes("STALE_VERSION_CONFLICT") || err?.status === 409) {
          setError("Design system was modified in another session. Reconciling with latest server changes.");
          await loadVariables();
        } else {
          setError(err?.message || "Failed to save new variable.");
        }
        throw err;
      }
    },
    [variables, websiteId, serverVersion, loadVariables]
  );

  const handleUpdateVariable = useCallback(
    async (id: string, payload: UpdateVariablePayload): Promise<AtomicVariable> => {
      setError(null);
      const existing = variables.find((v) => v.id === id);
      if (!existing) {
        throw new Error("Variable not found.");
      }

      const updatedName = payload.name !== undefined ? payload.name.trim() : existing.name;
      const updatedKey = payload.name ? formatVariableKey(payload.name) : existing.key;
      const updatedType = payload.type !== undefined ? payload.type : existing.type;
      const updatedValue = payload.value !== undefined ? payload.value.trim() : existing.value;

      // Duplicate key check (if key changed)
      if (updatedKey.toLowerCase() !== existing.key.toLowerCase()) {
        const duplicate = variables.find(
          (v) => v.id !== id && v.key.toLowerCase() === updatedKey.toLowerCase()
        );
        if (duplicate) {
          throw new Error(`Variable name already exists with key "${updatedKey}".`);
        }
      }

      const valCheck = validateVariableValue(updatedType, updatedValue);
      if (!valCheck.isValid) {
        throw new Error(valCheck.message || "Invalid variable value.");
      }

      const updatedVar: AtomicVariable = {
        ...existing,
        name: updatedName,
        key: updatedKey,
        type: updatedType,
        value: updatedValue,
        description: payload.description !== undefined ? payload.description.trim() : existing.description,
        updatedAt: new Date().toISOString(),
      };

      const updatedList = variables.map((v) => (v.id === id ? updatedVar : v));

      // Priority 0: Do NOT optimistically persist until acknowledged
      try {
        const res = await saveVariables(updatedList, websiteId, serverVersion, undefined, "useVariables");
        setVariables(updatedList);
        if (typeof res.version === "number") {
          setServerVersion(res.version);
        }
        setEditingVariable(null);
        setIsFormOpen(false);
        return updatedVar;
      } catch (err: any) {
        if (err?.code === "STALE_VERSION_CONFLICT" || String(err?.message).includes("STALE_VERSION_CONFLICT") || err?.status === 409) {
          setError("Design system was modified in another session. Reconciling with latest server changes.");
          await loadVariables();
        } else {
          setError(err?.message || "Failed to update variable.");
        }
        throw err;
      }
    },
    [variables, websiteId, serverVersion, loadVariables]
  );

  const handleDeleteVariable = useCallback(
    async (id: string): Promise<void> => {
      setError(null);
      const updatedList = variables.filter((v) => v.id !== id);

      // Priority 0: Do NOT optimistically persist until acknowledged
      try {
        const res = await saveVariables(updatedList, websiteId, serverVersion, undefined, "useVariables");
        setVariables(updatedList);
        if (typeof res.version === "number") {
          setServerVersion(res.version);
        }
        setDeletingVariable(null);
      } catch (err: any) {
        if (err?.code === "STALE_VERSION_CONFLICT" || String(err?.message).includes("STALE_VERSION_CONFLICT") || err?.status === 409) {
          setError("Design system was modified in another session. Reconciling with latest server changes.");
          await loadVariables();
        } else {
          setError(err?.message || "Failed to delete variable.");
        }
        throw err;
      }
    },
    [variables, websiteId, serverVersion, loadVariables]
  );

  return {
    variables,
    filteredVariables,
    serverVersion,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    selectedType,
    setSelectedType,
    editingVariable,
    setEditingVariable,
    deletingVariable,
    setDeletingVariable,
    isFormOpen,
    setIsFormOpen,
    createVariable: handleCreateVariable,
    updateVariable: handleUpdateVariable,
    deleteVariable: handleDeleteVariable,
    refetchVariables: loadVariables,
  };
}
