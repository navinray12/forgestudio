import { useState, useCallback } from "react";
import type { EditorElement } from "../../../pages/editor/WebsiteEditor";
import type { PageSettingsData } from "../../revision-history/types/revisionHistory.types";
import type { TemplateCategory, TemplateType } from "../types/template.types";
import { saveAsTemplate, updateTemplate } from "../services/templateService";

interface UseSaveTemplateParams {
  apiUrl: string;
}

export interface TemplateToUpdateInfo {
  id: string;
  name: string;
  description?: string;
  type?: TemplateType;
  category?: TemplateCategory | string;
}

export function useSaveTemplate({ apiUrl }: UseSaveTemplateParams) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [targetTemplateId, setTargetTemplateId] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [type, setType] = useState<TemplateType>("PAGE");
  const [category, setCategory] = useState<TemplateCategory | string>("Other");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const openDialog = useCallback((templateToUpdate?: TemplateToUpdateInfo) => {
    if (templateToUpdate) {
      setTargetTemplateId(templateToUpdate.id);
      setName(templateToUpdate.name || "");
      setDescription(templateToUpdate.description || "");
      setType(templateToUpdate.type || "PAGE");
      setCategory(templateToUpdate.category || "Other");
    } else {
      setTargetTemplateId(null);
      setName("");
      setDescription("");
      setType("PAGE");
      setCategory("Other");
    }
    setError(null);
    setValidationError(null);
    setSuccessMessage(null);
    setIsOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    if (!isSaving) {
      setIsOpen(false);
      setTargetTemplateId(null);
      setValidationError(null);
      setError(null);
    }
  }, [isSaving]);

  const handleSave = useCallback(
    async (elements: EditorElement[], pageSettings: PageSettingsData): Promise<boolean> => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setValidationError("Template name is required.");
        return false;
      }

      setValidationError(null);
      setError(null);
      setIsSaving(true);

      try {
        if (targetTemplateId) {
          const updatedTemplate = await updateTemplate(apiUrl, targetTemplateId, {
            name: trimmedName,
            description,
            category,
            templateData: {
              elements,
              pageSettings,
            },
          });

          setIsSaving(false);
          setIsOpen(false);
          setSuccessMessage(`Template "${updatedTemplate.name}" updated successfully!`);
          setTimeout(() => {
            setSuccessMessage(null);
          }, 4000);
          return true;
        } else {
          const createdTemplate = await saveAsTemplate(apiUrl, {
            name: trimmedName,
            description,
            type,
            category,
            templateData: {
              elements,
              pageSettings,
            },
          });

          setIsSaving(false);
          setIsOpen(false);
          setSuccessMessage(`Template "${createdTemplate.name}" saved successfully!`);
          setTimeout(() => {
            setSuccessMessage(null);
          }, 4000);
          return true;
        }
      } catch (err: any) {
        setIsSaving(false);
        setError(err.message || (targetTemplateId ? "Failed to update template. Please try again." : "Failed to save template. Please try again."));
        return false;
      }
    },
    [name, description, type, category, targetTemplateId, apiUrl]
  );

  return {
    isOpen,
    isUpdateMode: Boolean(targetTemplateId),
    targetTemplateId,
    name,
    setName,
    description,
    setDescription,
    type,
    setType,
    category,
    setCategory,
    isSaving,
    error,
    validationError,
    successMessage,
    openDialog,
    closeDialog,
    handleSave,
  };
}

