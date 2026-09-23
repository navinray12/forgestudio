import type { FormContainerConfig, CreateFormPayload } from "../types/atomicForm.types";

const STORAGE_KEY = "forge_studio_atomic_forms";

const INITIAL_FORM_PRESETS: FormContainerConfig[] = [
  {
    id: "form-contact-us",
    name: "Contact Us Form",
    category: "Standard Forms",
    fields: [
      {
        id: "f-name",
        name: "fullName",
        label: "Full Name",
        type: "text",
        placeholder: "John Doe",
        required: true,
      },
      {
        id: "f-email",
        name: "email",
        label: "Email Address",
        type: "email",
        placeholder: "john@example.com",
        required: true,
      },
      {
        id: "f-message",
        name: "message",
        label: "Your Message",
        type: "textarea",
        placeholder: "How can we help you?",
        required: true,
      },
    ],
    submitButton: {
      text: "Send Message",
      variant: "primary",
    },
    submission: {
      method: "POST",
      actionUrl: "/api/contact",
      successMessage: "Thank you! Your message has been submitted successfully.",
      errorMessage: "Unable to submit your message. Please try again.",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "form-newsletter",
    name: "Newsletter Signup Form",
    category: "Lead Capture",
    fields: [
      {
        id: "f-news-email",
        name: "newsletterEmail",
        label: "Email Address",
        type: "email",
        placeholder: "you@company.com",
        required: true,
      },
      {
        id: "f-terms",
        name: "agreeTerms",
        label: "I agree to receive weekly tech updates",
        type: "checkbox",
        required: true,
      },
    ],
    submitButton: {
      text: "Subscribe Now",
      variant: "primary",
    },
    submission: {
      method: "POST",
      actionUrl: "/api/subscribe",
      successMessage: "Awesome! You are now subscribed to our newsletter.",
      errorMessage: "Subscription failed. Please verify your email address.",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export class AtomicFormService {
  /**
   * Gets all stored form definitions
   */
  static getForms(): FormContainerConfig[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        this.saveForms(INITIAL_FORM_PRESETS);
        return INITIAL_FORM_PRESETS;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : INITIAL_FORM_PRESETS;
    } catch {
      return INITIAL_FORM_PRESETS;
    }
  }

  /**
   * Persists form definitions to LocalStorage
   */
  static saveForms(forms: FormContainerConfig[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(forms));
    } catch (err) {
      console.error("Failed to save atomic forms:", err);
    }
  }

  /**
   * Creates a new Form Container definition
   */
  static createForm(payload: CreateFormPayload): FormContainerConfig {
    const list = this.getForms();

    const newForm: FormContainerConfig = {
      id: `form-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: payload.name.trim(),
      category: payload.category || "Custom Forms",
      fields: [
        { id: "field-1", name: "fullName", label: "Full Name", type: "text", placeholder: "Enter name...", required: true },
        { id: "field-2", name: "email", label: "Email Address", type: "email", placeholder: "Enter email...", required: true },
      ],
      submitButton: { text: "Submit Form", variant: "primary" },
      submission: {
        method: "POST",
        successMessage: "Thank you! Your form has been submitted successfully.",
        errorMessage: "Something went wrong. Please try again.",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    list.push(newForm);
    this.saveForms(list);
    return newForm;
  }

  /**
   * Updates an existing Form Container definition
   */
  static updateForm(id: string, payload: Partial<FormContainerConfig>): FormContainerConfig {
    const list = this.getForms();
    const idx = list.findIndex((f) => f.id === id);
    if (idx === -1) throw new Error(`Form with ID "${id}" not found.`);

    const updated: FormContainerConfig = {
      ...list[idx],
      ...payload,
      updatedAt: new Date().toISOString(),
    };

    list[idx] = updated;
    this.saveForms(list);
    return updated;
  }

  /**
   * Deletes a Form Container
   */
  static deleteForm(id: string): void {
    const list = this.getForms();
    const filtered = list.filter((f) => f.id !== id);
    this.saveForms(filtered);
  }
}
