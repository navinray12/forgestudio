export type FormFieldType =
  | "text"
  | "email"
  | "tel"
  | "textarea"
  | "select"
  | "checkbox"
  | "radio"
  | "number"
  | "date"
  | "hidden";

export type FieldColumnWidth = "20%" | "25%" | "33.33%" | "50%" | "66.66%" | "75%" | "100%";

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormFieldConfig {
  id: string;
  name: string; // Machine-readable key (e.g., "customer_email")
  type: FormFieldType;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  required: boolean;
  width: FieldColumnWidth;
  stepIndex?: number; // 0-based index for Multi-Step grouping (F-275)
  options?: FormFieldOption[]; // For select, radio, checkbox
  validationRegex?: string;
  customErrorMessage?: string;
}

export interface FormStepConfig {
  stepIndex: number;
  title: string;
  description?: string;
}

export type PostSubmitActionType = "database" | "email" | "redirect" | "popup" | "webhook";

export interface EmailActionConfig {
  toEmail: string;
  subject: string;
  fromName?: string;
  replyToField?: string;
  includeMetadata: boolean;
}

export interface RedirectActionConfig {
  url: string;
  openInNewTab: boolean;
}

export interface PopupActionConfig {
  popupId: string; // Integration with F-279 & F-282 Popup Engine
}

export interface WebhookActionConfig {
  endpointUrl: string;
  secretKey?: string;
}

export interface FormPostSubmitConfig {
  activeActions: PostSubmitActionType[];
  emailConfig?: EmailActionConfig;
  redirectConfig?: RedirectActionConfig;
  popupConfig?: PopupActionConfig;
  webhookConfig?: WebhookActionConfig;
  successMessage: string;
  errorMessage: string;
}

export interface FormSpamProtectionConfig {
  enableHoneypot: boolean;
  honeypotFieldName: string; // Defaults to "_form_hp_trap"
  rateLimitPerMinute: number; // Max submissions per IP per min
}

export interface FormWidgetConfig {
  id: string;
  formName: string;
  isMultiStep: boolean; // F-275
  steps: FormStepConfig[];
  fields: FormFieldConfig[]; // F-271
  submitButtonText: string;
  submitButtonWidth: "auto" | "100%";
  actions: FormPostSubmitConfig; // F-276, F-280, F-281
  spamProtection: FormSpamProtectionConfig; // F-277
}

export interface FormSubmissionRecord {
  id: string;
  websiteId: string;
  formId: string;
  formName: string;
  data: Record<string, any>;
  metadata: {
    ip?: string;
    userAgent?: string;
    referer?: string;
    submittedAt: string;
  };
  createdAt: string;
}

export function generateFieldId(): string {
  return "fld_" + Math.random().toString(36).substring(2, 9);
}

export function generateFormId(): string {
  return "form_" + Math.random().toString(36).substring(2, 9);
}

export function createDefaultFormConfig(formName = "Contact Form"): FormWidgetConfig {
  const formId = generateFormId();
  return {
    id: formId,
    formName,
    isMultiStep: false,
    steps: [
      { stepIndex: 0, title: "Personal Info", description: "Let us know who you are" },
      { stepIndex: 1, title: "Message Details", description: "Tell us about your inquiry" },
    ],
    fields: [
      {
        id: generateFieldId(),
        name: "full_name",
        type: "text",
        label: "Full Name",
        placeholder: "John Doe",
        required: true,
        width: "50%",
        stepIndex: 0,
      },
      {
        id: generateFieldId(),
        name: "email",
        type: "email",
        label: "Email Address",
        placeholder: "john@example.com",
        required: true,
        width: "50%",
        stepIndex: 0,
      },
      {
        id: generateFieldId(),
        name: "phone",
        type: "tel",
        label: "Phone Number",
        placeholder: "+1 (555) 000-0000",
        required: false,
        width: "50%",
        stepIndex: 0,
      },
      {
        id: generateFieldId(),
        name: "subject",
        type: "select",
        label: "Inquiry Subject",
        required: true,
        width: "50%",
        stepIndex: 0,
        options: [
          { label: "General Question", value: "general" },
          { label: "Sales & Pricing", value: "sales" },
          { label: "Customer Support", value: "support" },
        ],
      },
      {
        id: generateFieldId(),
        name: "message",
        type: "textarea",
        label: "Your Message",
        placeholder: "How can we help you today?",
        required: true,
        width: "100%",
        stepIndex: 1,
      },
    ],
    submitButtonText: "Send Message",
    submitButtonWidth: "100%",
    actions: {
      activeActions: ["database"],
      emailConfig: {
        toEmail: "admin@example.com",
        subject: "New Website Lead Received",
        fromName: "ForgeStudio Leads",
        includeMetadata: true,
      },
      redirectConfig: {
        url: "",
        openInNewTab: false,
      },
      popupConfig: {
        popupId: "",
      },
      webhookConfig: {
        endpointUrl: "",
      },
      successMessage: "Thank you! Your message has been sent successfully. We will get back to you shortly.",
      errorMessage: "Oops! Something went wrong while submitting. Please check the fields and try again.",
    },
    spamProtection: {
      enableHoneypot: true,
      honeypotFieldName: "_form_hp_trap",
      rateLimitPerMinute: 5,
    },
  };
}

export const FORM_TEMPLATES = [
  {
    id: "contact-us",
    name: "Standard Contact Us",
    category: "Communication",
    description: "Classic 4-field contact form with Name, Email, Subject, and Message textarea.",
    create: () => createDefaultFormConfig("Contact Us Form"),
  },
  {
    id: "lead-magnet",
    name: "High-Converting Lead Opt-in",
    category: "Lead Generation",
    description: "Compact 2-field lead magnet form capturing First Name & Email Address.",
    create: () => {
      const cfg = createDefaultFormConfig("Lead Capture Opt-In");
      cfg.fields = [
        {
          id: generateFieldId(),
          name: "first_name",
          type: "text",
          label: "First Name",
          placeholder: "Jane",
          required: true,
          width: "50%",
          stepIndex: 0,
        },
        {
          id: generateFieldId(),
          name: "email",
          type: "email",
          label: "Work Email",
          placeholder: "jane@company.com",
          required: true,
          width: "50%",
          stepIndex: 0,
        },
      ];
      cfg.submitButtonText = "Download Free Guide Now →";
      cfg.actions.successMessage = "Success! Check your inbox for your free download link.";
      return cfg;
    },
  },
  {
    id: "multistep-quote",
    name: "Multi-Step Project Quote",
    category: "Quote & Survey",
    description: "Multi-step interactive form with step progress, project scope, and budget estimation.",
    create: () => {
      const cfg = createDefaultFormConfig("Multi-Step Quote Request");
      cfg.isMultiStep = true;
      cfg.steps = [
        { stepIndex: 0, title: "Your Project", description: "Tell us what you want to build" },
        { stepIndex: 1, title: "Budget & Timeline", description: "Estimated budget range" },
        { stepIndex: 2, title: "Contact Info", description: "Where should we send the proposal?" },
      ];
      cfg.fields = [
        {
          id: generateFieldId(),
          name: "project_type",
          type: "select",
          label: "Project Type",
          required: true,
          width: "100%",
          stepIndex: 0,
          options: [
            { label: "Custom Web Application", value: "web_app" },
            { label: "Ecommerce Online Store", value: "ecommerce" },
            { label: "Corporate Landing Page", value: "corporate" },
          ],
        },
        {
          id: generateFieldId(),
          name: "project_description",
          type: "textarea",
          label: "Project Summary",
          placeholder: "Describe key features, goals, and target audience...",
          required: true,
          width: "100%",
          stepIndex: 0,
        },
        {
          id: generateFieldId(),
          name: "budget_range",
          type: "radio",
          label: "Approximate Budget",
          required: true,
          width: "100%",
          stepIndex: 1,
          options: [
            { label: "$1,000 - $5,000", value: "1k_5k" },
            { label: "$5,000 - $15,000", value: "5k_15k" },
            { label: "$15,000+", value: "15k_plus" },
          ],
        },
        {
          id: generateFieldId(),
          name: "target_deadline",
          type: "date",
          label: "Desired Launch Date",
          required: false,
          width: "100%",
          stepIndex: 1,
        },
        {
          id: generateFieldId(),
          name: "full_name",
          type: "text",
          label: "Full Name",
          placeholder: "Alex Taylor",
          required: true,
          width: "50%",
          stepIndex: 2,
        },
        {
          id: generateFieldId(),
          name: "email",
          type: "email",
          label: "Email Address",
          placeholder: "alex@example.com",
          required: true,
          width: "50%",
          stepIndex: 2,
        },
        {
          id: generateFieldId(),
          name: "phone",
          type: "tel",
          label: "Phone Number",
          placeholder: "+1 (555) 123-4567",
          required: false,
          width: "100%",
          stepIndex: 2,
        },
      ];
      cfg.submitButtonText = "Submit Quote Request";
      return cfg;
    },
  },
  {
    id: "newsletter-signup",
    name: "Newsletter Inline Subscription",
    category: "Newsletter",
    description: "Minimalist horizontal-ready email subscription form.",
    create: () => {
      const cfg = createDefaultFormConfig("Newsletter Signup");
      cfg.fields = [
        {
          id: generateFieldId(),
          name: "email",
          type: "email",
          label: "Email Address",
          placeholder: "Enter your email...",
          required: true,
          width: "100%",
          stepIndex: 0,
        },
      ];
      cfg.submitButtonText = "Subscribe";
      cfg.actions.successMessage = "You're all set! Thanks for subscribing to our newsletter.";
      return cfg;
    },
  },
];
