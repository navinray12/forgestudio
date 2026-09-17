import type { EditorElement } from "../types";

export type CommandType =
  | "ADD_ELEMENT"
  | "UPDATE_PROPS"
  | "UPDATE_STYLES"
  | "REMOVE_ELEMENT"
  | "DUPLICATE_ELEMENT"
  | "MOVE_ELEMENT";

export interface BaseCommand {
  type: CommandType;
}

export interface AddElementCommand extends BaseCommand {
  type: "ADD_ELEMENT";
  targetId: string | null;
  element: EditorElement;
  pageId?: string;
}

export interface UpdatePropsCommand extends BaseCommand {
  type: "UPDATE_PROPS";
  elementId: string;
  props: Partial<EditorElement>;
}

export interface UpdateStylesCommand extends BaseCommand {
  type: "UPDATE_STYLES";
  elementId: string;
  styles: Partial<EditorElement["styles"]>;
}

export interface RemoveElementCommand extends BaseCommand {
  type: "REMOVE_ELEMENT";
  elementId: string;
  pageId?: string;
}

export interface DuplicateElementCommand extends BaseCommand {
  type: "DUPLICATE_ELEMENT";
  elementId: string;
  pageId?: string;
}

export interface MoveElementCommand extends BaseCommand {
  type: "MOVE_ELEMENT";
  sourceId: string;
  targetId: string;
  position?: "before" | "after" | "inside";
}

export type EditorCommand =
  | AddElementCommand
  | UpdatePropsCommand
  | UpdateStylesCommand
  | RemoveElementCommand
  | DuplicateElementCommand
  | MoveElementCommand;
