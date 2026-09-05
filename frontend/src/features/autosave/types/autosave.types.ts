export type AutosaveStatus = "saved" | "unsaved" | "saving" | "error";

export interface AutosaveState {
  status: AutosaveStatus;
  lastSavedAt: number | null;
  errorMessage: string | null;
  isDirty: boolean;
}
