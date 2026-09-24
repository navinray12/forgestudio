import { useMemo } from "react";

export interface UserAccessContext {
  role: string;
  isRestrictedMode: boolean; // True for CLIENT and CONTENT_EDITOR (Content-Only Sandbox)
  canEditDesign: boolean;
  canEditContent: boolean;
  canManageSettings: boolean;
  canPublish: boolean;
  isComponentEditable: (componentId?: string, isProtected?: boolean) => boolean;
}

/**
 * Enterprise Access & Role Evaluation Hook
 * Enforces Client Restricted Editing Mode ("Content-Only Sandbox") and granular component access.
 */
export function useComponentAccess(
  website: any,
  allowedComponentIds?: Set<string>
): UserAccessContext {
  return useMemo(() => {
    const rawRole = (website?.userPermission || website?.role || "OWNER").toUpperCase();
    
    // Normalization: CLIENT or CONTENT_EDITOR enters restricted content-only mode
    const isRestrictedMode = rawRole === "CLIENT" || rawRole === "CONTENT_EDITOR";
    const isOwner = rawRole === "OWNER" || rawRole === "PROJECT_OWNER";
    const isAdmin = isOwner || rawRole === "ADMIN" || rawRole === "PROJECT_ADMIN";
    const isDesigner = rawRole === "DESIGNER";

    const canEditDesign = !isRestrictedMode && (isAdmin || isDesigner);
    const canEditContent = isAdmin || isDesigner || isRestrictedMode;
    const canManageSettings = isAdmin;
    const canPublish = isAdmin || isDesigner;

    const isComponentEditable = (componentId?: string, isProtected?: boolean): boolean => {
      if (!componentId) return canEditContent;
      if (isAdmin) return true;
      if (isProtected && allowedComponentIds && !allowedComponentIds.has(componentId)) {
        return false;
      }
      return canEditContent;
    };

    return {
      role: rawRole,
      isRestrictedMode,
      canEditDesign,
      canEditContent,
      canManageSettings,
      canPublish,
      isComponentEditable,
    };
  }, [website?.userPermission, website?.role, allowedComponentIds]);
}

export default useComponentAccess;
