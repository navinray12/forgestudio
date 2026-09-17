import type {
  EditorElement,
  ElementType,
  ElementStyles,
  ContainerLayout
} from "../../../pages/editor/types";

export type {
  EditorElement,
  ElementType,
  ElementStyles,
  ContainerLayout
};

export interface ElementNodeRef {
  element: EditorElement;
  parent: EditorElement | null;
  path: number[];
}
