export type FormFieldType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "tel"
  | "url"
  | "textarea"
  | "select"
  | "checkbox"
  | "radio";

export interface SelectOption {
  label: string;
  value: string;
}

export interface FormValidationRules {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface FormFieldConfig {
  id: string;
  name: string; // Unique field key used for form submission payloads
  label: string;
  type: FormFieldType;
  placeholder?: string;
  defaultValue?: string;
  required: boolean;
  options?: SelectOption[]; // For select & radio fields
  validation?: FormValidationRules;
}

export interface FormSubmissionConfig {
  method: "POST" | "API";
  actionUrl?: string;
  successMessage: string;
  errorMessage: string;
}

export interface FormSubmitButtonConfig {
  text: string;
  variant: "primary" | "secondary" | "outline";
}

export interface FormContainerConfig {
  id: string;
  name: string;
  category?: string;
  fields: FormFieldConfig[];
  submitButton: FormSubmitButtonConfig;
  submission: FormSubmissionConfig;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFormPayload {
  name: string;
  category?: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>; // Keyed by field name
}
