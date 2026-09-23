import { useState, useEffect, useCallback, useMemo } from "react";
import type { WebsiteKit, WebsiteKitCategory } from "../types/websiteKit.types";
import { getWebsiteKits, applyWebsiteKit } from "../services/websiteKitService";

interface UseWebsiteKitsParams {
  apiUrl: string;
}

export function useWebsiteKits({ apiUrl }: UseWebsiteKitsParams) {
  const [kits, setKits] = useState<WebsiteKit[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<WebsiteKitCategory | string>("All");

  const [previewKit, setPreviewKit] = useState<WebsiteKit | null>(null);
  const [confirmKit, setConfirmKit] = useState<WebsiteKit | null>(null);

  const fetchKits = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getWebsiteKits(apiUrl);
      setKits(data);
    } catch (err: any) {
      setError(err?.message || "Unable to load Website Kits.");
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchKits();
  }, [fetchKits]);

  const filteredKits = useMemo(() => {
    return kits.filter((kit) => {
      // Category filter check
      if (selectedCategory !== "All") {
        if (kit.category.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      // Search query check
      if (!searchQuery.trim()) {
        return true;
      }

      const q = searchQuery.toLowerCase().trim();
      const nameMatch = kit.name.toLowerCase().includes(q);
      const descMatch = kit.description ? kit.description.toLowerCase().includes(q) : false;
      const catMatch = kit.category ? kit.category.toLowerCase().includes(q) : false;

      return nameMatch || descMatch || catMatch;
    });
  }, [kits, searchQuery, selectedCategory]);

  const handleApplyKit = useCallback(
    async (kit: WebsiteKit) => {
      setIsApplying(true);
      setError(null);
      try {
        const result = await applyWebsiteKit(apiUrl, kit);
        setConfirmKit(null);
        setPreviewKit(null);
        return result;
      } catch (err: any) {
        setError(err?.message || "Unable to apply this Website Kit.");
        throw err;
      } finally {
        setIsApplying(false);
      }
    },
    [apiUrl]
  );

  return {
    kits,
    filteredKits,
    isLoading,
    isApplying,
    error,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    previewKit,
    setPreviewKit,
    confirmKit,
    setConfirmKit,
    applyKit: handleApplyKit,
    refetchKits: fetchKits,
  };
}
