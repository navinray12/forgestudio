export type AutosaveStatus = "saved" | "unsaved" | "saving" | "error" | "offline" | "conflict";

export interface AutosaveState {
  status: AutosaveStatus;
  lastSavedAt: number | null;
  errorMessage: string | null;
  isDirty: boolean;
}
