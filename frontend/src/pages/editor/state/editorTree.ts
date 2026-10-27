import type { EditorElement } from "../types";

export function getAllElementIds(tree: EditorElement[]): string[] {
  const ids: string[] = [];
  for (const element of tree) {
    ids.push(element.id);
    if (element.children?.length) ids.push(...getAllElementIds(element.children));
  }
  return ids;
}
