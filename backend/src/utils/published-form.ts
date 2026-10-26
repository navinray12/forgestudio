export function findPublishedFormNode(value: unknown, formId: string): Record<string, any> | null {
  if (!value || typeof value !== "object") return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const match = findPublishedFormNode(item, formId);
      if (match) return match;
    }
    return null;
  }

  const node = value as Record<string, unknown>;
  if (node.id === formId && (node.type === "form" || node.type === "atomic-form")) {
    return node as Record<string, any>;
  }

  for (const child of Object.values(node)) {
    const match = findPublishedFormNode(child, formId);
    if (match) return match;
  }
  return null;
}
