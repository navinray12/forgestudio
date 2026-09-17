import { useParams } from "react-router-dom";
import WebsiteEditor from "../pages/editor/WebsiteEditor";
import { EditorProvider } from "./core/context/EditorContext";

export interface ForgeEditorProps {
  websiteId?: string;
  pageId?: string;
  readOnly?: boolean;
}

/**
 * ForgeEditor
 * Internal Editor Entry Point Boundary for ForgeStudio.
 * Wraps WebsiteEditor in EditorProvider to expose editor identity context.
 */
export function ForgeEditor(props: ForgeEditorProps) {
  const params = useParams<{ websiteId?: string; pageId?: string }>();
  const websiteId = props.websiteId || params.websiteId;
  const pageId = props.pageId || params.pageId;
  const readOnly = props.readOnly ?? false;

  return (
    <EditorProvider websiteId={websiteId} pageId={pageId} readOnly={readOnly}>
      <WebsiteEditor
        websiteId={websiteId}
        pageId={pageId}
        readOnly={readOnly}
      />
    </EditorProvider>
  );
}

export default ForgeEditor;
