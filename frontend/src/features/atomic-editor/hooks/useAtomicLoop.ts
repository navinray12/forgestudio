import { useState, useEffect, useCallback, useMemo } from "react";
import type { LoopContainerConfig, CreateLoopPayload } from "../types/atomicLoop.types";
import { AtomicLoopService } from "../services/atomicLoopService";
import { resolveLoopItems } from "../utils/loopData.utils";

export function useAtomicLoop() {
  const [loops, setLoops] = useState<LoopContainerConfig[]>([]);
  const [activeLoop, setActiveLoop] = useState<LoopContainerConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchLoops = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      const list = AtomicLoopService.getLoops();
      setLoops(list);
      if (list.length > 0 && !activeLoop) {
        setActiveLoop(list[0]);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load Atomic Loops.");
    } finally {
      setIsLoading(false);
    }
  }, [activeLoop]);

  useEffect(() => {
    fetchLoops();
  }, [fetchLoops]);

  const filteredLoops = useMemo(() => {
    if (!searchQuery.trim()) return loops;
    const q = searchQuery.toLowerCase().trim();
    return loops.filter(
      (l) => l.name.toLowerCase().includes(q) || (l.category && l.category.toLowerCase().includes(q))
    );
  }, [loops, searchQuery]);

  const activeLoopItems = useMemo(() => {
    if (!activeLoop) return [];
    return resolveLoopItems(activeLoop);
  }, [activeLoop]);

  const createLoop = async (payload: CreateLoopPayload) => {
    try {
      const created = AtomicLoopService.createLoop(payload);
      setLoops((prev) => [...prev, created]);
      setActiveLoop(created);
      return created;
    } catch (err: any) {
      setError(err?.message || "Failed to create Atomic Loop.");
      throw err;
    }
  };

  const updateActiveLoop = async (payload: Partial<LoopContainerConfig>) => {
    if (!activeLoop) return;
    try {
      const updated = AtomicLoopService.updateLoop(activeLoop.id, payload);
      setLoops((prev) => prev.map((l) => (l.id === activeLoop.id ? updated : l)));
      setActiveLoop(updated);
    } catch (err: any) {
      setError(err?.message || "Failed to update Atomic Loop.");
    }
  };

  const deleteLoop = async (id: string) => {
    try {
      AtomicLoopService.deleteLoop(id);
      const remaining = loops.filter((l) => l.id !== id);
      setLoops(remaining);
      if (activeLoop?.id === id) {
        setActiveLoop(remaining[0] || null);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to delete Atomic Loop.");
    }
  };

  return {
    loops,
    filteredLoops,
    activeLoop,
    activeLoopItems,
    setActiveLoop,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    createLoop,
    updateActiveLoop,
    deleteLoop,
    refreshLoops: fetchLoops,
  };
}
