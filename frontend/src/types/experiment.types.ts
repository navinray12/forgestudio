export type ExperimentTargetType = "POPUP" | "SECTION";
export type ExperimentStatus = "DRAFT" | "RUNNING" | "PAUSED" | "CONCLUDED";
export type ExperimentGoalAction = "FORM_SUBMIT" | "CLICK" | "LINK_REDIRECT";

export interface ExperimentVariant {
  id: string;              // 'control', 'variant_b'
  name: string;
  trafficAllocation: number; // e.g. 50 (percentage)
  targetEntityId: string;    // popupId or elementId
  impressions: number;
  conversions: number;
}

export interface Experiment {
  id: string;
  websiteId: string;
  title: string;
  targetType: ExperimentTargetType;
  status: ExperimentStatus;
  winningVariantId?: string;
  variants: ExperimentVariant[];
  goalAction: ExperimentGoalAction;
  createdAt: string;
  updatedAt?: string;
}

export interface ExperimentTelemetryPayload {
  websiteId: string;
  experimentId: string;
  variantId: string;
  action: "impression" | "conversion";
  timestamp: string;
}
