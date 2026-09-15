/**
 * @file Autosave feature: autosave types. Keep feature UI, hooks, services and types in this module.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
export type { SaveStatus as AutosaveStatus } from '@forgestudio/editor-persistence';
import type { SaveStatus as AutosaveStatus } from '@forgestudio/editor-persistence';

export interface AutosaveState {
  status: AutosaveStatus;
  lastSavedAt: number | null;
  errorMessage: string | null;
  isDirty: boolean;
}
