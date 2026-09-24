import type { BlockNode, BlockPattern } from "../types/block.types";

const API_BASE = "/api/v1/blocks";

export async function fetchBlockPatterns(filter: {
  workspaceId?: string;
  category?: string;
  isSynced?: boolean;
  search?: string;
} = {}): Promise<BlockPattern[]> {
  const params = new URLSearchParams();
  if (filter.workspaceId) params.append("workspaceId", filter.workspaceId);
  if (filter.category) params.append("category", filter.category);
  if (filter.isSynced !== undefined) params.append("isSynced", String(filter.isSynced));
  if (filter.search) params.append("search", filter.search);

  const res = await fetch(`${API_BASE}/patterns?${params.toString()}`);
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || "Failed to fetch block patterns");
  }
  return json.data;
}

export async function createBlockPattern(patternData: Partial<BlockPattern>): Promise<BlockPattern> {
  const res = await fetch(`${API_BASE}/patterns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patternData),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || "Failed to create pattern");
  }
  return json.data;
}

export async function updateBlockPattern(id: string, updates: Partial<BlockPattern>): Promise<BlockPattern> {
  const res = await fetch(`${API_BASE}/patterns/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || "Failed to update pattern");
  }
  return json.data;
}

export async function deleteBlockPattern(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/patterns/${id}`, {
    method: "DELETE",
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || "Failed to delete pattern");
  }
  return true;
}

export async function detachSyncedPattern(id: string): Promise<BlockNode[]> {
  const res = await fetch(`${API_BASE}/patterns/${id}/detach`, {
    method: "POST",
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || "Failed to detach synced pattern");
  }
  return json.data;
}
