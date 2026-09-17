import { useContext } from "react";
import { EditorContext, type EditorContextValue } from "./EditorContext";

export function useEditorContext(): EditorContextValue {
  const context = useContext(EditorContext);

  if (!context) {
    throw new Error("useEditorContext must be used inside an EditorProvider");
  }

  return context;
}
