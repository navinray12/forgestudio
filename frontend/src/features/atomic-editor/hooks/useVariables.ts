import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  AtomicVariable,
  CreateVariablePayload,
  UpdateVariablePayload,
  VariableType,
} from "../types/variables.types";
import { fetchVariables, saveVariables } from "../services/variableService";
import { formatVariableKey, validateVariableValue } from "../utils/variable.utils";

export function useVariables() {
  const [variables, setVariables] = useState<AtomicVariable[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedType, setSelectedType] = useState<VariableType | "All">("All");

  const [editingVariable, setEditingVariable] = useState<AtomicVariable | null>(null);
  const [deletingVariable, setDeletingVariable] = useState<AtomicVariable | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);

  const loadVariables = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchVariables();
      setVariables(data);
    } catch (err: any) {
      setError("Unable to load variables.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVariables();
  }, [loadVariables]);

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
      setVariables(updatedList);
      await saveVariables(updatedList);
      setIsFormOpen(false);
      return newVar;
    },
    [variables]
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
      setVariables(updatedList);
      await saveVariables(updatedList);
      setEditingVariable(null);
      setIsFormOpen(false);
      return updatedVar;
    },
    [variables]
  );

  const handleDeleteVariable = useCallback(
    async (id: string): Promise<void> => {
      setError(null);
      const updatedList = variables.filter((v) => v.id !== id);
      setVariables(updatedList);
      await saveVariables(updatedList);
      setDeletingVariable(null);
    },
    [variables]
  );

  return {
    variables,
    filteredVariables,
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
