import { useEffect, useRef, useState, useCallback } from "react";
import type { AutosaveStatus } from "../types/autosave.types";
import type { EditorElement } from "../../../pages/editor/WebsiteEditor";
import type { PageSettingsData } from "../../revision-history/types/revisionHistory.types";
import { revisionHistoryService } from "../../revision-history/services/revisionHistoryService";

interface UseAutosaveParams {
  websiteId: string | undefined;
  elements: EditorElement[];
  pageSettings: PageSettingsData;
  pages?: any[];
  homePageId?: string;
  siteParts?: any;
  globalSettings?: any;
  globalStyles?: any;
  publishing?: any;
  deployment?: any;
  breakpoints?: any[];
  popups?: any[];
  pageCss?: string;
  apiUrl: string;
  isLoadingWebsite: boolean;
  debounceMs?: number;
}

interface SavePayload {
  snapshot: string;
  elements: EditorElement[];
  pageSettings: PageSettingsData;
  pages?: any[];
  homePageId?: string;
  siteParts?: any;
  globalSettings?: any;
  globalStyles?: any;
  publishing?: any;
  deployment?: any;
  breakpoints?: any[];
  popups?: any[];
  pageCss?: string;
}

export function useAutosave({
  websiteId,
  elements,
  pageSettings,
  pages = [],
  homePageId,
  siteParts,
  globalSettings,
  globalStyles,
  publishing,
  deployment,
  breakpoints,
  popups,
  pageCss,
  apiUrl,
  isLoadingWebsite,
  debounceMs = 1500,
}: UseAutosaveParams) {
  const [status, setStatus] = useState<AutosaveStatus>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // References for tracking state without causing extra renders
  const baselineRef = useRef<string | null>(null);
  const isInitializedRef = useRef<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef<boolean>(false);
  const queuedPayloadRef = useRef<SavePayload | null>(null);

  // Latest props stored in refs for access inside async callbacks
  const latestPropsRef = useRef({
    websiteId,
    elements,
    pageSettings,
    pages,
    homePageId,
    siteParts,
    globalSettings,
    globalStyles,
    publishing,
    deployment,
    breakpoints,
    popups,
    pageCss,
    apiUrl,
  });

  useEffect(() => {
    latestPropsRef.current = {
      websiteId,
      elements,
      pageSettings,
      pages,
      homePageId,
      siteParts,
      globalSettings,
      globalStyles,
      publishing,
      deployment,
      breakpoints,
      popups,
      pageCss,
      apiUrl,
    };
  }, [
    websiteId,
    elements,
    pageSettings,
    pages,
    homePageId,
    siteParts,
    globalSettings,
    globalStyles,
    publishing,
    deployment,
    breakpoints,
    popups,
    pageCss,
    apiUrl,
  ]);

  /**
   * Helper to serialize meaningful editor data to a JSON string comparison key
   */
  const serializeState = useCallback(
    (
      currentElements: EditorElement[],
      currentPageSettings: PageSettingsData,
      currentPages: any[] = [],
      currentHomePageId?: string,
      currentSiteParts?: any,
      currentGlobalSettings?: any,
      currentGlobalStyles?: any,
      currentPublishing?: any,
      currentDeployment?: any,
      currentBreakpoints?: any[],
      currentPopups?: any[],
      currentPageCss?: string
    ): string => {
      try {
        return JSON.stringify({
          elements: currentElements || [],
          pageSettings: currentPageSettings || {},
          pages: currentPages || [],
          homePageId: currentHomePageId || "",
          siteParts: currentSiteParts || null,
          globalSettings: currentGlobalSettings || null,
          globalStyles: currentGlobalStyles || currentGlobalSettings?.globalStyles || null,
          publishing: currentPublishing || null,
          deployment: currentDeployment || null,
          breakpoints: currentBreakpoints || null,
          popups: currentPopups || null,
          pageCss: currentPageCss || "",
        });
      } catch (err) {
        console.error("Failed to serialize editor state for autosave:", err);
        return "";
      }
    },
    []
  );

  /**
   * Method to manually update the baseline (e.g. after manual save or revision restore)
   */
  const updateBaseline = useCallback(
    (
      newElements: EditorElement[],
      newPageSettings?: PageSettingsData,
      newPages?: any[],
      newHomePageId?: string,
      newSiteParts?: any,
      newGlobalSettings?: any,
      newGlobalStyles?: any,
      newPublishing?: any,
      newDeployment?: any,
      newBreakpoints?: any[],
      newPopups?: any[],
      newPageCss?: string
    ) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      queuedPayloadRef.current = null;
      const snapshot = serializeState(
        newElements,
        newPageSettings || {},
        newPages || [],
        newHomePageId || latestPropsRef.current.homePageId,
        newSiteParts || latestPropsRef.current.siteParts,
        newGlobalSettings || latestPropsRef.current.globalSettings,
        newGlobalStyles || latestPropsRef.current.globalStyles || latestPropsRef.current.globalSettings?.globalStyles,
        newPublishing || latestPropsRef.current.publishing,
        newDeployment || latestPropsRef.current.deployment,
        newBreakpoints || latestPropsRef.current.breakpoints,
        newPopups || latestPropsRef.current.popups,
        newPageCss !== undefined ? newPageCss : latestPropsRef.current.pageCss
      );
      baselineRef.current = snapshot;
      isInitializedRef.current = true;
      setStatus("saved");
      setLastSavedAt(Date.now());
      setErrorMessage(null);
    },
    [serializeState]
  );

  /**
   * Executes the actual save network request for a specific immutable payload
   */
  const performSave = useCallback(
    async (payload: SavePayload) => {
      const { websiteId: currentWebId, apiUrl: currentApiUrl } = latestPropsRef.current;

      if (!currentWebId || !payload || !payload.snapshot) {
        isSavingRef.current = false;
        return;
      }

      try {
        isSavingRef.current = true;
        setStatus("saving");
        setErrorMessage(null);

        const bodyPayload = {
          editorData: {
            version: 1,
            elements: payload.elements,
            pageSettings: payload.pageSettings,
            pages: payload.pages || [],
            homePageId: payload.homePageId,
            siteParts: payload.siteParts,
            globalSettings: payload.globalSettings,
            globalStyles: payload.globalStyles,
            publishing: payload.publishing,
            deployment: payload.deployment,
            breakpoints: payload.breakpoints,
            popups: payload.popups,
            pageCss: payload.pageCss,
          },
        };

        // 1. Always persist snapshot to local storage as immediate fail-safe
        try {
          localStorage.setItem(`forgestudio_editor_${currentWebId}`, JSON.stringify(bodyPayload.editorData));
        } catch (lsErr) {
          console.warn("Failed to write to localStorage fallback:", lsErr);
        }

        // 2. Attempt backend API save
        try {
          const res = await fetch(`${currentApiUrl}/api/websites/${currentWebId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify(bodyPayload),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            console.warn("Backend save endpoint returned non-OK status, saved locally:", data);
          }
        } catch (netErr) {
          console.warn("Backend save network request failed, saved locally:", netErr);
        }

        // Update baseline to the snapshot that was persisted
        baselineRef.current = payload.snapshot;
        const now = Date.now();
        setLastSavedAt(now);

        // Create F-320 Revision History snapshot safely
        try {
          revisionHistoryService.saveRevision(
            currentWebId,
            payload.elements,
            payload.pageSettings,
            "Autosaved design update"
          );
        } catch (revErr) {
          console.error("Autosave: failed to write revision history snapshot:", revErr);
        }

        isSavingRef.current = false;

        // Check if newer changes arrived while the save request was in-flight
        if (queuedPayloadRef.current) {
          const nextPayload = queuedPayloadRef.current;
          queuedPayloadRef.current = null;
          performSave(nextPayload);
        } else {
          const currentLiveSnapshot = serializeState(
            latestPropsRef.current.elements,
            latestPropsRef.current.pageSettings,
            latestPropsRef.current.pages,
            latestPropsRef.current.homePageId,
            latestPropsRef.current.siteParts,
            latestPropsRef.current.globalSettings,
            latestPropsRef.current.globalStyles || latestPropsRef.current.globalSettings?.globalStyles,
            latestPropsRef.current.publishing,
            latestPropsRef.current.deployment,
            latestPropsRef.current.breakpoints,
            latestPropsRef.current.popups,
            latestPropsRef.current.pageCss
          );

          if (currentLiveSnapshot !== baselineRef.current) {
            setStatus("unsaved");
          } else {
            setStatus("saved");
          }
        }
      } catch (err: any) {
        isSavingRef.current = false;
        queuedPayloadRef.current = null;
        console.error("Autosave error:", err);
        setStatus("saved"); // Local save succeeded
      }
    },
    [serializeState]
  );

  // Initial Load Baseline Setup (Initial Load Protection)
  useEffect(() => {
    if (isLoadingWebsite || !websiteId) {
      return;
    }

    // Establish initial baseline on first load completion
    if (!isInitializedRef.current || baselineRef.current === null) {
      const initialSnapshot = serializeState(
        elements,
        pageSettings,
        pages,
        homePageId,
        siteParts,
        globalSettings,
        globalStyles || globalSettings?.globalStyles,
        publishing,
        deployment,
        breakpoints,
        popups,
        pageCss
      );
      baselineRef.current = initialSnapshot;
      isInitializedRef.current = true;
      setStatus("saved");
    }
  }, [
    isLoadingWebsite,
    websiteId,
    elements,
    pageSettings,
    pages,
    homePageId,
    siteParts,
    globalSettings,
    globalStyles,
    publishing,
    deployment,
    breakpoints,
    popups,
    pageCss,
    serializeState,
  ]);

  // Change Detection & Debouncing
  useEffect(() => {
    if (isLoadingWebsite || !websiteId || !isInitializedRef.current || baselineRef.current === null) {
      return;
    }

    const currentSnapshot = serializeState(
      elements,
      pageSettings,
      pages,
      homePageId,
      siteParts,
      globalSettings,
      globalStyles || globalSettings?.globalStyles,
      publishing,
      deployment,
      breakpoints,
      popups,
      pageCss
    );

    // If current state matches baseline, status is saved
    if (currentSnapshot === baselineRef.current) {
      if (status !== "saving" && status !== "saved") {
        setStatus("saved");
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Meaningful change detected -> status becomes unsaved
    setStatus("unsaved");

    // Clear existing debounce timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Start debounce timer
    timerRef.current = setTimeout(() => {
      const snapshotToSave = serializeState(
        latestPropsRef.current.elements,
        latestPropsRef.current.pageSettings,
        latestPropsRef.current.pages,
        latestPropsRef.current.homePageId,
        latestPropsRef.current.siteParts,
        latestPropsRef.current.globalSettings,
        latestPropsRef.current.globalStyles || latestPropsRef.current.globalSettings?.globalStyles,
        latestPropsRef.current.publishing,
        latestPropsRef.current.deployment,
        latestPropsRef.current.breakpoints,
        latestPropsRef.current.popups,
        latestPropsRef.current.pageCss
      );

      if (snapshotToSave === baselineRef.current) {
        return;
      }

      const payloadToSave: SavePayload = {
        snapshot: snapshotToSave,
        elements: JSON.parse(JSON.stringify(latestPropsRef.current.elements || [])),
        pageSettings: JSON.parse(JSON.stringify(latestPropsRef.current.pageSettings || {})),
        pages: JSON.parse(JSON.stringify(latestPropsRef.current.pages || [])),
        homePageId: latestPropsRef.current.homePageId,
        siteParts: latestPropsRef.current.siteParts
          ? JSON.parse(JSON.stringify(latestPropsRef.current.siteParts))
          : undefined,
        globalSettings: latestPropsRef.current.globalSettings
          ? JSON.parse(JSON.stringify(latestPropsRef.current.globalSettings))
          : undefined,
        globalStyles: latestPropsRef.current.globalStyles || latestPropsRef.current.globalSettings?.globalStyles
          ? JSON.parse(JSON.stringify(latestPropsRef.current.globalStyles || latestPropsRef.current.globalSettings?.globalStyles))
          : undefined,
        publishing: latestPropsRef.current.publishing
          ? JSON.parse(JSON.stringify(latestPropsRef.current.publishing))
          : undefined,
        deployment: latestPropsRef.current.deployment
          ? JSON.parse(JSON.stringify(latestPropsRef.current.deployment))
          : undefined,
        breakpoints: latestPropsRef.current.breakpoints
          ? JSON.parse(JSON.stringify(latestPropsRef.current.breakpoints))
          : undefined,
        popups: latestPropsRef.current.popups
          ? JSON.parse(JSON.stringify(latestPropsRef.current.popups))
          : undefined,
        pageCss: latestPropsRef.current.pageCss,
      };

      if (isSavingRef.current) {
        queuedPayloadRef.current = payloadToSave;
      } else {
        performSave(payloadToSave);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [
    elements,
    pageSettings,
    pages,
    homePageId,
    siteParts,
    globalSettings,
    globalStyles,
    publishing,
    deployment,
    breakpoints,
    popups,
    pageCss,
    websiteId,
    isLoadingWebsite,
    debounceMs,
    serializeState,
    performSave,
    status,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    status,
    lastSavedAt,
    errorMessage,
    isDirty: status === "unsaved" || status === "saving",
    updateBaseline,
  };
}
