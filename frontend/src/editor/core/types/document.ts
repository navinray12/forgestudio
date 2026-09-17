import type {
  CanonicalWebsiteData,
  PageConfig,
  EditorElement,
  SitePartsConfig,
  GlobalStylesConfig,
  PublishingState,
  DeploymentConfig,
  Breakpoint
} from "../../../pages/editor/types";

/**
 * ForgeEditorDocument
 * Canonical representation of Website.editorData.
 * Reuses existing CanonicalWebsiteData structure.
 */
export type ForgeEditorDocument = CanonicalWebsiteData;

export type {
  PageConfig,
  EditorElement,
  SitePartsConfig,
  GlobalStylesConfig,
  PublishingState,
  DeploymentConfig,
  Breakpoint
};
