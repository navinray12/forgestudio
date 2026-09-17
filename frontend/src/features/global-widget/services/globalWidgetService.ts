import type { GlobalWidget, CreateGlobalWidgetPayload, UpdateGlobalWidgetPayload } from "../types/globalWidget.types";

const LOCAL_STORAGE_KEY = "forgestudio_global_widgets";

function getLocalGlobalWidgets(): GlobalWidget[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalGlobalWidgets(widgets: GlobalWidget[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(widgets));
  } catch (e) {
    // Ignore quota errors
  }
}

/**
 * Creates a new Global Widget
 */
export async function saveGlobalWidget(
  apiUrl: string,
  payload: CreateGlobalWidgetPayload
): Promise<GlobalWidget> {
  const trimmedName = payload.name?.trim();
  if (!trimmedName) {
    throw new Error("Global Widget name is required.");
  }

  const clonedElements = JSON.parse(JSON.stringify(payload.elements || []));
  const newWidget: GlobalWidget = {
    id: `gw-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    userId: "user-current",
    name: trimmedName,
    description: payload.description?.trim() || "",
    category: payload.category || "Global Widget",
    elements: clonedElements,
    isGlobalWidget: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    // Try backend persistence if API route exists
    const res = await fetch(`${apiUrl}/api/templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: trimmedName,
        description: payload.description || "",
        type: "GLOBAL_WIDGET",
        category: "Global Widget",
        templateData: { elements: clonedElements, pageSettings: {} },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.template) {
        newWidget.id = data.template.id;
      }
    }
  } catch (e) {
    // Fallback to local storage
  }

  const local = getLocalGlobalWidgets();
  saveLocalGlobalWidgets([newWidget, ...local.filter((w) => w.id !== newWidget.id)]);

  return newWidget;
}

/**
 * Retrieves all user Global Widgets
 */
export async function getGlobalWidgets(apiUrl: string): Promise<GlobalWidget[]> {
  let remoteWidgets: GlobalWidget[] = [];

  try {
    const res = await fetch(`${apiUrl}/api/templates`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (res.ok) {
      const data = await res.json();
      const rawTemplates = data.templates || data || [];
      remoteWidgets = rawTemplates
        .filter((t: any) => t.type === "GLOBAL_WIDGET" || t.category === "Global Widget")
        .map((t: any) => ({
          id: t.id,
          userId: t.userId || "user-current",
          name: t.name,
          description: t.description || "",
          category: t.category || "Global Widget",
          elements: t.templateData?.elements || [],
          isGlobalWidget: true,
          createdAt: t.createdAt || new Date().toISOString(),
          updatedAt: t.updatedAt || new Date().toISOString(),
        }));
    }
  } catch (e) {
    // Fallback to local
  }

  const localWidgets = getLocalGlobalWidgets();
  const mergedMap = new Map<string, GlobalWidget>();

  localWidgets.forEach((w) => mergedMap.set(w.id, w));
  remoteWidgets.forEach((w) => mergedMap.set(w.id, w));

  return Array.from(mergedMap.values());
}

/**
 * Updates an existing Global Widget
 */
export async function updateGlobalWidgetService(
  apiUrl: string,
  id: string,
  payload: UpdateGlobalWidgetPayload
): Promise<GlobalWidget> {
  const localWidgets = getLocalGlobalWidgets();
  const target = localWidgets.find((w) => w.id === id);

  const updated: GlobalWidget = {
    id,
    userId: target?.userId || "user-current",
    name: payload.name?.trim() || target?.name || "Global Widget",
    description: payload.description !== undefined ? payload.description : target?.description || "",
    category: target?.category || "Global Widget",
    elements: payload.elements ? JSON.parse(JSON.stringify(payload.elements)) : target?.elements || [],
    isGlobalWidget: true,
    createdAt: target?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await fetch(`${apiUrl}/api/templates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: updated.name,
        description: updated.description,
        type: "GLOBAL_WIDGET",
        category: "Global Widget",
        templateData: { elements: updated.elements, pageSettings: {} },
      }),
    });
  } catch (e) {
    // Local fallback
  }

  saveLocalGlobalWidgets(localWidgets.map((w) => (w.id === id ? updated : w)));
  return updated;
}

/**
 * Deletes a Global Widget
 */
export async function deleteGlobalWidgetService(apiUrl: string, id: string): Promise<void> {
  try {
    await fetch(`${apiUrl}/api/templates/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
  } catch (e) {
    // Local fallback
  }

  const local = getLocalGlobalWidgets();
  saveLocalGlobalWidgets(local.filter((w) => w.id !== id));
}
