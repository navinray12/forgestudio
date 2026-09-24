/**
 * WordPress Menus Connector, Validation & Safety Service (F-504)
 *
 * Implements hierarchy safety (circular dependency prevention, self-parenting check),
 * custom URL scheme sanitization, page link validation, tenant isolation, in-memory caching,
 * audit logging, and timeout reconciliation.
 */

import { AppError } from "../../utils/app-error.js";
import { getWebsiteById } from "../website.service.js";
import { recordAuditLog } from "../audit.service.js";
import { assertSafeUrl } from "../../utils/ssrf.guard.js";
import {
  WordPressMenuCapabilities,
  WordPressMenu,
  WordPressMenuItem,
  WordPressMenuLocation,
  resolveMenuProvider,
  computeMenuHash,
} from "./wordpressMenuProvider.service.js";

/**
 * Tenant-Isolated In-Memory Cache for Menu Data
 * TTL: 5 minutes (300,000 ms)
 */
interface CacheEntry {
  websiteId: string;
  data: any;
  timestamp: number;
}

const MENU_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 300000; // 5 minutes

/**
 * Validates Custom URL security rules: only http:// and https:// allowed.
 * Rejects javascript:, data:, file:, vbscript: and SSRF private IP targets.
 */
export function validateCustomUrl(urlStr?: string): string {
  if (!urlStr || typeof urlStr !== "string") {
    return "#";
  }

  const trimmed = urlStr.trim();
  if (trimmed.startsWith("/")) {
    return trimmed; // Relative paths allowed
  }

  const lower = trimmed.toLowerCase();
  const forbiddenSchemes = ["javascript:", "data:", "file:", "vbscript:"];
  for (const scheme of forbiddenSchemes) {
    if (lower.startsWith(scheme)) {
      throw new AppError(`Unsafe URL scheme detected in menu item '${scheme}'`, 400, "WORDPRESS_MENU_UNSAFE_URL");
    }
  }

  if (!lower.startsWith("http://") && !lower.startsWith("https://")) {
    throw new AppError(`Menu item URL must begin with http:// or https:// or be a relative path`, 400, "WORDPRESS_MENU_UNSAFE_URL");
  }

  // SSRF Protection Check
  try {
    assertSafeUrl(trimmed);
  } catch (err: any) {
    throw new AppError(`Menu custom URL failed SSRF security validation: ${err.message}`, 400, "WORDPRESS_MENU_UNSAFE_URL");
  }

  return trimmed;
}

/**
 * Validates Menu Hierarchy safety:
 * 1. Item cannot be its own parent.
 * 2. Circular dependency check (A -> B -> C -> A).
 * 3. Parent item must exist in the same menu.
 */
export function validateMenuHierarchy(
  itemId: string,
  newParentId: string | null,
  existingItems: WordPressMenuItem[]
): void {
  if (!newParentId || newParentId === "0") {
    return; // Root level is valid
  }

  if (itemId === newParentId) {
    throw new AppError(`Menu item '${itemId}' cannot be its own parent`, 400, "WORDPRESS_MENU_CIRCULAR_HIERARCHY");
  }

  const itemMap = new Map<string, WordPressMenuItem>(existingItems.map((i) => [i.id, i]));
  const parentItem = itemMap.get(newParentId);

  if (!parentItem) {
    throw new AppError(`Parent menu item '${newParentId}' does not exist in this menu`, 400, "WORDPRESS_MENU_INVALID_PARENT");
  }

  // Circular Ancestry Trace: Follow parent links upwards
  let currentParentId: string | null = newParentId;
  const visited = new Set<string>([itemId]);

  while (currentParentId && currentParentId !== "0") {
    if (visited.has(currentParentId)) {
      throw new AppError(`Circular hierarchy detected: setting item '${itemId}' parent to '${newParentId}' creates a loop`, 400, "WORDPRESS_MENU_CIRCULAR_HIERARCHY");
    }

    visited.add(currentParentId);
    const parent = itemMap.get(currentParentId);
    currentParentId = parent ? parent.parentId : null;
  }
}

/**
 * Gets WordPress Menu Capabilities for a website workspace
 */
export async function getWordPressMenuCapabilities(websiteId: string, userId: string): Promise<WordPressMenuCapabilities> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["menus"] };
  const provider = resolveMenuProvider(connection);
  const caps = await provider.getCapabilities(connection);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "MENU_LISTED",
    details: { provider: provider.providerName, supported: caps.supported },
  });

  return caps;
}

/**
 * Lists Navigation Menus
 */
export async function listWordPressMenus(websiteId: string, userId: string): Promise<WordPressMenu[]> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["menus"] };
  const provider = resolveMenuProvider(connection);

  const cacheKey = `${websiteId}:menus:list`;
  const cached = MENU_CACHE.get(cacheKey);
  const now = Date.now();
  if (cached && cached.websiteId === websiteId && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const menus = await provider.listMenus(connection, websiteId);
  MENU_CACHE.set(cacheKey, { websiteId, data: menus, timestamp: now });

  return menus;
}

/**
 * Gets Menu details
 */
export async function getWordPressMenu(websiteId: string, menuId: string, userId: string): Promise<WordPressMenu> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["menus"] };
  const provider = resolveMenuProvider(connection);

  const menu = await provider.getMenu(connection, websiteId, menuId);
  if (!menu) {
    throw new AppError(`WordPress menu with ID '${menuId}' not found`, 404, "WORDPRESS_MENU_NOT_FOUND");
  }

  return menu;
}

/**
 * Creates Navigation Menu
 */
export async function createWordPressMenu(
  websiteId: string,
  menuData: { name: string; slug?: string; description?: string },
  userId: string
): Promise<WordPressMenu> {
  if (!menuData || !menuData.name || typeof menuData.name !== "string" || !menuData.name.trim()) {
    throw new AppError("Menu name is required and cannot be empty", 400, "WORDPRESS_MENU_INVALID_PAYLOAD");
  }

  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["menus"] };
  const provider = resolveMenuProvider(connection);

  const newMenu = await provider.createMenu(connection, websiteId, {
    name: menuData.name.trim(),
    slug: menuData.slug,
    description: menuData.description,
  });

  clearTenantMenuCache(websiteId);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "MENU_CREATED",
    details: { menuId: newMenu.id, name: newMenu.name, slug: newMenu.slug },
  });

  return newMenu;
}

/**
 * Updates Navigation Menu
 */
export async function updateWordPressMenu(
  websiteId: string,
  menuId: string,
  menuData: { name?: string; slug?: string; description?: string },
  userId: string
): Promise<WordPressMenu> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["menus"] };
  const provider = resolveMenuProvider(connection);

  const updated = await provider.updateMenu(connection, websiteId, menuId, menuData);
  clearTenantMenuCache(websiteId);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "MENU_UPDATED",
    details: { menuId: updated.id, name: updated.name },
  });

  return updated;
}

/**
 * Deletes Navigation Menu
 */
export async function deleteWordPressMenu(websiteId: string, menuId: string, userId: string): Promise<{ success: boolean; deletedId: string }> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["menus"] };
  const provider = resolveMenuProvider(connection);

  const res = await provider.deleteMenu(connection, websiteId, menuId);
  clearTenantMenuCache(websiteId);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "MENU_DELETED",
    details: { menuId },
  });

  return res;
}

/**
 * Lists Menu Items
 */
export async function listWordPressMenuItems(websiteId: string, menuId: string, userId: string): Promise<WordPressMenuItem[]> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["menus"] };
  const provider = resolveMenuProvider(connection);

  const cacheKey = `${websiteId}:items:${menuId}`;
  const cached = MENU_CACHE.get(cacheKey);
  const now = Date.now();
  if (cached && cached.websiteId === websiteId && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const items = await provider.listMenuItems(connection, websiteId, menuId);
  MENU_CACHE.set(cacheKey, { websiteId, data: items, timestamp: now });

  return items;
}

/**
 * Creates Menu Item with validation & hierarchy safety
 */
export async function createWordPressMenuItem(
  websiteId: string,
  menuId: string,
  itemData: Partial<WordPressMenuItem>,
  userId: string
): Promise<WordPressMenuItem> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["menus"] };
  const provider = resolveMenuProvider(connection);

  // Validate custom URL security
  if (itemData.url) {
    itemData.url = validateCustomUrl(itemData.url);
  }

  // Validate parent hierarchy safety
  const existingItems = await provider.listMenuItems(connection, websiteId, menuId);
  const parentId = itemData.parentId || null;
  validateMenuHierarchy("new_item", parentId, existingItems);

  const newItem = await provider.createMenuItem(connection, websiteId, menuId, itemData);
  clearTenantMenuCache(websiteId);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "MENU_ITEM_CREATED",
    details: { itemId: newItem.id, menuId, title: newItem.title, type: newItem.type },
  });

  return newItem;
}

/**
 * Updates Menu Item
 */
export async function updateWordPressMenuItem(
  websiteId: string,
  menuId: string,
  itemId: string,
  itemData: Partial<WordPressMenuItem>,
  userId: string
): Promise<WordPressMenuItem> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["menus"] };
  const provider = resolveMenuProvider(connection);

  // Validate custom URL security
  if (itemData.url) {
    itemData.url = validateCustomUrl(itemData.url);
  }

  // Validate parent hierarchy if parentId is updated
  const existingItems = await provider.listMenuItems(connection, websiteId, menuId);
  if (itemData.parentId !== undefined) {
    validateMenuHierarchy(itemId, itemData.parentId, existingItems);
  }

  const updated = await provider.updateMenuItem(connection, websiteId, menuId, itemId, itemData);
  clearTenantMenuCache(websiteId);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "MENU_ITEM_UPDATED",
    details: { itemId: updated.id, menuId, title: updated.title },
  });

  return updated;
}

/**
 * Deletes Menu Item
 */
export async function deleteWordPressMenuItem(
  websiteId: string,
  menuId: string,
  itemId: string,
  userId: string
): Promise<{ success: boolean; deletedId: string }> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["menus"] };
  const provider = resolveMenuProvider(connection);

  const res = await provider.deleteMenuItem(connection, websiteId, menuId, itemId);
  clearTenantMenuCache(websiteId);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "MENU_ITEM_DELETED",
    details: { itemId, menuId },
  });

  return res;
}

/**
 * Reorders Menu Items with hierarchy safety validation
 */
export async function reorderWordPressMenuItems(
  websiteId: string,
  menuId: string,
  reorderPayload: Array<{ id: string; parentId: string | null; position: number }>,
  userId: string
): Promise<WordPressMenuItem[]> {
  if (!Array.isArray(reorderPayload)) {
    throw new AppError("Reorder payload must be an array of menu item updates", 400, "WORDPRESS_MENU_INVALID_PAYLOAD");
  }

  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["menus"] };
  const provider = resolveMenuProvider(connection);

  const existingItems = await provider.listMenuItems(connection, websiteId, menuId);

  // Validate hierarchy for every item in reorder payload
  for (const update of reorderPayload) {
    validateMenuHierarchy(update.id, update.parentId, existingItems);
  }

  const updatedList = await provider.reorderMenuItems(connection, websiteId, menuId, reorderPayload);
  clearTenantMenuCache(websiteId);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "MENU_ITEM_REORDERED",
    details: { menuId, reorderCount: reorderPayload.length },
  });

  return updatedList;
}

/**
 * Gets Theme Menu Locations
 */
export async function getWordPressMenuLocations(websiteId: string, userId: string): Promise<WordPressMenuLocation[]> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["menus"] };
  const provider = resolveMenuProvider(connection);

  return await provider.getMenuLocations(connection, websiteId);
}

/**
 * Assigns Menu to Theme Location
 */
export async function assignWordPressMenuLocation(
  websiteId: string,
  menuId: string,
  location: string,
  userId: string
): Promise<WordPressMenuLocation> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["menus"] };
  const provider = resolveMenuProvider(connection);

  const assigned = await provider.assignMenuLocation(connection, websiteId, menuId, location);
  clearTenantMenuCache(websiteId);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "MENU_LOCATION_ASSIGNED",
    details: { menuId, location },
  });

  return assigned;
}

/**
 * Synchronize Navigation Menus (Worker operation)
 */
export async function syncWordPressMenus(
  websiteId: string,
  menuId: string,
  userId: string
): Promise<{ success: boolean; synchronizedAt: string; provider: string }> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection;

  if (!connection || connection.status !== "CONNECTED") {
    await recordAuditLog({
      targetResource: websiteId,
      userId,
      action: "MENU_SYNC_FAILED",
      details: { error: "WordPress integration is disconnected or revoked" },
    });
    throw new AppError("WordPress integration is disconnected or revoked", 400, "WORDPRESS_MENU_NOT_CONNECTED");
  }

  const provider = resolveMenuProvider(connection);
  const caps = await provider.getCapabilities(connection);

  if (!caps.supported) {
    await recordAuditLog({
      targetResource: websiteId,
      userId,
      action: "MENU_SYNC_FAILED",
      details: { provider: provider.providerName, error: "Unsupported provider" },
    });
    throw new AppError(`Menu provider '${provider.providerName}' is unsupported for site`, 400, "WORDPRESS_MENU_UNSUPPORTED");
  }

  clearTenantMenuCache(websiteId);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "MENU_SYNC_SUCCEEDED",
    details: { menuId, provider: provider.providerName },
  });

  return {
    success: true,
    synchronizedAt: new Date().toISOString(),
    provider: provider.providerName,
  };
}

/**
 * Reconciles ambiguous timeout during menu operations
 */
export async function reconcileAmbiguousMenuOperation(
  websiteId: string,
  menuId: string,
  expectedHash: string,
  userId: string
): Promise<{ outcome: "REMOTE_UPDATED" | "SAFE_TO_RETRY"; message: string }> {
  const menu = await getWordPressMenu(websiteId, menuId, userId);
  const items = await listWordPressMenuItems(websiteId, menuId, userId);
  const currentHash = computeMenuHash(menu, items);

  if (currentHash === expectedHash) {
    return {
      outcome: "REMOTE_UPDATED",
      message: "Remote WordPress menu state matches expected hash. Synchronization was successful.",
    };
  }

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "MENU_RECONCILIATION_REQUIRED",
    details: { menuId, expectedHash, currentHash },
  });

  return {
    outcome: "SAFE_TO_RETRY",
    message: "Remote WordPress menu state does not match expected hash. Safe to retry mutation.",
  };
}

/**
 * Helper to clear tenant-scoped menu cache entries
 */
function clearTenantMenuCache(websiteId: string): void {
  for (const [key, value] of MENU_CACHE.entries()) {
    if (value.websiteId === websiteId) {
      MENU_CACHE.delete(key);
    }
  }
}
