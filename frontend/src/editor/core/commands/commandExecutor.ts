import type { ForgeEditorDocument } from "../types";
import type { EditorCommand } from "./commands";
import {
  addElement,
  updateElementProps,
  updateElementStyles,
  removeElement,
  duplicateElement,
  moveElement,
} from "../document/documentOperations";

/**
 * executeCommand
 * Pure function that executes an EditorCommand on document and returns a new transformed document.
 */
export function executeCommand(
  doc: ForgeEditorDocument,
  command: EditorCommand
): ForgeEditorDocument {
  switch (command.type) {
    case "ADD_ELEMENT":
      return addElement(doc, command.targetId, command.element, command.pageId);

    case "UPDATE_PROPS":
      return updateElementProps(doc, command.elementId, command.props);

    case "UPDATE_STYLES":
      return updateElementStyles(doc, command.elementId, command.styles);

    case "REMOVE_ELEMENT":
      return removeElement(doc, command.elementId, command.pageId);

    case "DUPLICATE_ELEMENT":
      return duplicateElement(doc, command.elementId, command.pageId);

    case "MOVE_ELEMENT":
      return moveElement(doc, command.sourceId, command.targetId, command.position);

    default:
      return doc;
  }
}
