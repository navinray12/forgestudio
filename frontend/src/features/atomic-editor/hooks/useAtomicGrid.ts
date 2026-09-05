import { useState, useEffect, useCallback, useMemo } from "react";
import type { GridContainerConfig, GridBreakpoint, CreateGridPayload } from "../types/atomicGrid.types";
import { AtomicGridService } from "../services/atomicGridService";

export function useAtomicGrid() {
  const [grids, setGrids] = useState<GridContainerConfig[]>([]);
  const [activeGrid, setActiveGrid] = useState<GridContainerConfig | null>(null);
  const [activeBreakpoint, setActiveBreakpoint] = useState<GridBreakpoint>("desktop");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchGrids = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      const list = AtomicGridService.getGrids();
      setGrids(list);
      if (list.length > 0 && !activeGrid) {
        setActiveGrid(list[0]);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load Atomic Grids.");
    } finally {
      setIsLoading(false);
    }
  }, [activeGrid]);

  useEffect(() => {
    fetchGrids();
  }, [fetchGrids]);

  const filteredGrids = useMemo(() => {
    if (!searchQuery.trim()) return grids;
    const q = searchQuery.toLowerCase().trim();
    return grids.filter(
      (g) => g.name.toLowerCase().includes(q) || (g.category && g.category.toLowerCase().includes(q))
    );
  }, [grids, searchQuery]);

  const createGrid = async (payload: CreateGridPayload) => {
    try {
      const created = AtomicGridService.createGrid(payload);
      setGrids((prev) => [...prev, created]);
      setActiveGrid(created);
      return created;
    } catch (err: any) {
      setError(err?.message || "Failed to create Grid.");
      throw err;
    }
  };

  const updateActiveGrid = async (payload: Partial<GridContainerConfig>) => {
    if (!activeGrid) return;
    try {
      const updated = AtomicGridService.updateGrid(activeGrid.id, payload);
      setGrids((prev) => prev.map((g) => (g.id === activeGrid.id ? updated : g)));
      setActiveGrid(updated);
    } catch (err: any) {
      setError(err?.message || "Failed to update Grid.");
    }
  };

  const deleteGrid = async (id: string) => {
    try {
      AtomicGridService.deleteGrid(id);
      const remaining = grids.filter((g) => g.id !== id);
      setGrids(remaining);
      if (activeGrid?.id === id) {
        setActiveGrid(remaining[0] || null);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to delete Grid.");
    }
  };

  return {
    grids,
    filteredGrids,
    activeGrid,
    setActiveGrid,
    activeBreakpoint,
    setActiveBreakpoint,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    createGrid,
    updateActiveGrid,
    deleteGrid,
    refreshGrids: fetchGrids,
  };
}
