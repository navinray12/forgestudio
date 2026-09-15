/**
 * @file Autosave feature: use Autosave. Keep feature UI, hooks, services and types in this module.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { SaveCoordinator, SaveFailure, type SaveState } from '@forgestudio/editor-persistence';
import type { EditorElement } from '../../../pages/editor/types';
import type { PageSettingsData } from '../../revision-history/types/revisionHistory.types';
import { createCloudDraftAdapter } from '../persistence/cloud-draft-adapter';
import { writeRecovery } from '../persistence/local-recovery-store';

interface UseAutosaveParams {
  websiteId: string | undefined;
  accountId: string | undefined;
  hostRevision: string | null;
  elements: EditorElement[];
  pageSettings: PageSettingsData;
  pages?: unknown[];
  homePageId?: string;
  siteParts?: unknown;
  globalSettings?: unknown;
  globalStyles?: unknown;
  publishing?: unknown;
  deployment?: unknown;
  breakpoints?: unknown[];
  popups?: unknown[];
  pageCss?: string;
  apiUrl: string;
  isLoadingWebsite: boolean;
  debounceMs?: number;
}
/**
 * Serialize.
 * @param params Params supplied to this operation (type: UseAutosaveParams).
 */
function serialize(params: UseAutosaveParams) {
  return JSON.stringify({ version: 1, elements: params.elements, pageSettings: params.pageSettings,
    pages: params.pages ?? [], homePageId: params.homePageId, siteParts: params.siteParts,
    globalSettings: params.globalSettings, globalStyles: params.globalStyles,
    deployment: params.deployment, breakpoints: params.breakpoints, popups: params.popups, pageCss: params.pageCss });
}
const emptyState: SaveState = { status: 'unsaved', localSequence: 0, persistedSequence: 0, hostRevision: '', acceptedAt: null, error: null };

/** Manual save and autosave share one coordinator and one immutable retry intent.
 * @param params Params supplied to this operation (type: UseAutosaveParams).
 */
export function useAutosave(params: UseAutosaveParams) {
  const latest = useRef(params);
  latest.current = params;
  const coordinator = useRef<SaveCoordinator | null>(null);
  const tabId = useRef(crypto.randomUUID());
  const quietTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(false);
  const [state, setState] = useState<SaveState>(emptyState);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const cancelTimers = useCallback(() => {
    if (quietTimer.current) clearTimeout(quietTimer.current);
    if (maxTimer.current) clearTimeout(maxTimer.current);
    quietTimer.current = maxTimer.current = null;
  }, []);
  const saveNow = useCallback(async (document?: unknown) => {
    cancelTimers();
    const current = coordinator.current;
    if (!current) throw new SaveFailure('Load the current host draft before saving. Local changes can still be exported.', 'HOST_DRAFT_UNAVAILABLE');
    const snapshot = document === undefined ? serialize(latest.current) : JSON.stringify(document);
    pending.current = false;
    current.change(snapshot);
    const { accountId, websiteId } = latest.current;
    if (accountId && websiteId) {
      try { await writeRecovery(accountId, websiteId, tabId.current, 'local', snapshot); setRecoveryError(null); }
      catch { setRecoveryError('Browser recovery is unavailable. Keep this tab open or export your changes.'); }
    }
    await current.flush();
  }, [cancelTimers]);

  useEffect(() => {
    if (params.isLoadingWebsite || !params.websiteId || !params.accountId || !params.hostRevision) return;
    const current = new SaveCoordinator(createCloudDraftAdapter(params.apiUrl, params.websiteId, params.accountId, tabId.current),
      { document: serialize(latest.current), revision: params.hostRevision, authorityEpoch: '1' });
    coordinator.current = current;
    setState(current.getSnapshot());
    const unsubscribe = current.subscribe(() => {
      const snapshot = current.getSnapshot();
      setState(pending.current && snapshot.status === 'saved' ? { ...snapshot, status: 'unsaved' } : snapshot);
    });
    return () => { cancelTimers(); unsubscribe(); current.dispose(); coordinator.current = null; };
  }, [params.websiteId, params.accountId, params.hostRevision, params.apiUrl, params.isLoadingWebsite, cancelTimers]);

  useEffect(() => {
    if (params.isLoadingWebsite || !coordinator.current) return;
    pending.current = true;
    setState(previous => previous.status === 'conflict' || previous.status === 'error' ? previous : { ...previous, status: 'unsaved' });
    if (quietTimer.current) clearTimeout(quietTimer.current);
    /**
     * Dispatch.
     */
    const dispatch = () => { void saveNow().catch(() => undefined); };
    quietTimer.current = setTimeout(dispatch, params.debounceMs ?? 750);
    maxTimer.current ??= setTimeout(dispatch, 2000);
    // The max-wait timer intentionally survives subsequent keystrokes.
  }, [params.elements, params.pageSettings, params.pages, params.homePageId, params.siteParts,
    params.globalSettings, params.globalStyles, params.deployment, params.breakpoints,
    params.popups, params.pageCss, params.isLoadingWebsite, params.debounceMs, saveNow]);

  useEffect(() => {
    /**
     * Warn.
     * @param event Event being handled; its type determines the available target and payload.
     */
    const warn = (event: BeforeUnloadEvent) => {
      if (pending.current || coordinator.current?.getSnapshot().status !== 'saved') { event.preventDefault(); }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  // Legacy restore callers no longer invent a saved acknowledgement.
  const updateBaseline = useCallback((..._restoredValues: unknown[]) => { pending.current = true; setState(previous => ({ ...previous, status: 'unsaved' })); }, []);
  return { status: state.status, lastSavedAt: state.acceptedAt ? Date.parse(state.acceptedAt) : null,
    errorMessage: state.error ?? recoveryError, isDirty: state.status !== 'saved', updateBaseline, saveNow,
    currentDocument: () => serialize(latest.current) };
}
