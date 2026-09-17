import React, { createContext } from "react";
import type { EditorIdentity } from "../types/editor-state";

export interface EditorContextValue extends EditorIdentity {}

export const EditorContext = createContext<EditorContextValue | null>(null);

export interface EditorProviderProps {
  websiteId?: string;
  pageId?: string;
  readOnly?: boolean;
  children: React.ReactNode;
}

export function EditorProvider({
  websiteId,
  pageId,
  readOnly = false,
  children,
}: EditorProviderProps) {
  const value: EditorContextValue = {
    websiteId,
    pageId,
    readOnly,
  };

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
}
