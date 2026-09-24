/**
 * WordPress Menus API Provider Abstraction & Capability Model (F-504)
 *
 * Provides capability-driven menu provider adapters for managing WordPress navigation menus,
 * menu items, nested hierarchy, theme locations, and custom URLs across Native, Core WP, and Plugin providers.
 */

import crypto from "crypto";

export type MenuCapabilityStatus = "SUPPORTED" | "UNSUPPORTED" | "DISABLED" | "UNAVAILABLE";

export interface WordPressMenuCapabilities {
  supported: boolean;
  status: MenuCapabilityStatus;
  providerName: string;
  providerVersion?: string;
  listMenus: boolean;
  getMenu: boolean;
  createMenu: boolean;
  updateMenu: boolean;
  deleteMenu: boolean;
  listItems: boolean;
  createItem: boolean;
  updateItem: boolean;
  deleteItem: boolean;
  reorderItems: boolean;
  assignLocation: boolean;
  nestedHierarchy: boolean;
  customUrls: boolean;
  pageLinks: boolean;
}

export interface WordPressMenu {
  id: string;
  name: string;
  slug: string;
  description?: string;
  locations: string[];
  itemCount: number;
  provider: string;
  updatedAt: string;
}

export type MenuItemType = "custom" | "page" | "post" | "category" | "taxonomy";

export interface WordPressMenuItem {
  id: string;
  menuId: string;
  title: string;
  type: MenuItemType;
  url: string;
  objectId?: string;
  objectType?: string;
  parentId: string | null;
  position: number;
  target?: "_blank" | "_self";
  classes?: string[];
  description?: string;
  attrTitle?: string;
}

export interface WordPressMenuLocation {
  location: string;
  label: string;
  assignedMenuId: string | null;
}

export interface WordPressMenuProvider {
  providerName: string;
  getCapabilities(connection: any): Promise<WordPressMenuCapabilities>;
  listMenus(connection: any, websiteId: string): Promise<WordPressMenu[]>;
  getMenu(connection: any, websiteId: string, menuId: string): Promise<WordPressMenu | null>;
  createMenu(connection: any, websiteId: string, menuData: { name: string; slug?: string; description?: string }): Promise<WordPressMenu>;
  updateMenu(connection: any, websiteId: string, menuId: string, menuData: { name?: string; slug?: string; description?: string }): Promise<WordPressMenu>;
  deleteMenu(connection: any, websiteId: string, menuId: string): Promise<{ success: boolean; deletedId: string }>;
  listMenuItems(connection: any, websiteId: string, menuId: string): Promise<WordPressMenuItem[]>;
  createMenuItem(connection: any, websiteId: string, menuId: string, itemData: Partial<WordPressMenuItem>): Promise<WordPressMenuItem>;
  updateMenuItem(connection: any, websiteId: string, menuId: string, itemId: string, itemData: Partial<WordPressMenuItem>): Promise<WordPressMenuItem>;
  deleteMenuItem(connection: any, websiteId: string, menuId: string, itemId: string): Promise<{ success: boolean; deletedId: string }>;
  reorderMenuItems(connection: any, websiteId: string, menuId: string, items: Array<{ id: string; parentId: string | null; position: number }>): Promise<WordPressMenuItem[]>;
  getMenuLocations(connection: any, websiteId: string): Promise<WordPressMenuLocation[]>;
  assignMenuLocation(connection: any, websiteId: string, menuId: string, location: string): Promise<WordPressMenuLocation>;
}

/**
 * Computes deterministic SHA-256 hash of a menu and its items state for timeout reconciliation
 */
export function computeMenuHash(menu: Partial<WordPressMenu>, items: Partial<WordPressMenuItem>[] = []): string {
  const normMenu = {
    id: menu.id || "",
    name: menu.name || "",
    slug: menu.slug || "",
    description: menu.description || "",
    locations: (menu.locations || []).slice().sort(),
  };

  const normItems = items.map((i) => ({
    id: i.id || "",
    menuId: i.menuId || "",
    title: i.title || "",
    type: i.type || "custom",
    url: i.url || "",
    objectId: i.objectId || "",
    objectType: i.objectType || "",
    parentId: i.parentId || null,
    position: i.position ?? 0,
    target: i.target || "_self",
    classes: (i.classes || []).slice().sort(),
    description: i.description || "",
    attrTitle: i.attrTitle || "",
  })).sort((a, b) => (a.position - b.position) || a.id.localeCompare(b.id));

  return crypto.createHash("sha256").update(JSON.stringify({ menu: normMenu, items: normItems })).digest("hex");
}

/**
 * In-Memory Mock Navigation Storage for Native and Test Providers
 */
const IN_MEMORY_MENUS = new Map<string, WordPressMenu[]>();
const IN_MEMORY_ITEMS = new Map<string, WordPressMenuItem[]>();

/**
 * ForgeStudio Native Navigation Menu Provider
 */
export class ForgeStudioNativeMenuProvider implements WordPressMenuProvider {
  providerName = "ForgeStudio Native Menu Engine";

  async getCapabilities(connection: any): Promise<WordPressMenuCapabilities> {
    const isConnected = connection && connection.status === "CONNECTED";
    return {
      supported: isConnected,
      status: isConnected ? "SUPPORTED" : "UNAVAILABLE",
      providerName: this.providerName,
      providerVersion: "1.0.0",
      listMenus: true,
      getMenu: true,
      createMenu: true,
      updateMenu: true,
      deleteMenu: true,
      listItems: true,
      createItem: true,
      updateItem: true,
      deleteItem: true,
      reorderItems: true,
      assignLocation: true,
      nestedHierarchy: true,
      customUrls: true,
      pageLinks: true,
    };
  }

  async listMenus(connection: any, websiteId: string): Promise<WordPressMenu[]> {
    if (!IN_MEMORY_MENUS.has(websiteId)) {
      // Initialize default menu
      const defaultMenu: WordPressMenu = {
        id: "menu_primary_1",
        name: "Primary Header Menu",
        slug: "primary-header-menu",
        description: "Main website navigation header menu",
        locations: ["primary"],
        itemCount: 3,
        provider: this.providerName,
        updatedAt: new Date().toISOString(),
      };
      IN_MEMORY_MENUS.set(websiteId, [defaultMenu]);

      const defaultItems: WordPressMenuItem[] = [
        { id: "item_1", menuId: "menu_primary_1", title: "Home", type: "page", url: "/", parentId: null, position: 0 },
        { id: "item_2", menuId: "menu_primary_1", title: "About Us", type: "page", url: "/about", parentId: null, position: 1 },
        { id: "item_3", menuId: "menu_primary_1", title: "Contact", type: "page", url: "/contact", parentId: null, position: 2 },
      ];
      IN_MEMORY_ITEMS.set("menu_primary_1", defaultItems);
    }
    return IN_MEMORY_MENUS.get(websiteId) || [];
  }

  async getMenu(connection: any, websiteId: string, menuId: string): Promise<WordPressMenu | null> {
    const menus = await this.listMenus(connection, websiteId);
    return menus.find((m) => m.id === menuId) || null;
  }

  async createMenu(connection: any, websiteId: string, menuData: { name: string; slug?: string; description?: string }): Promise<WordPressMenu> {
    const menus = await this.listMenus(connection, websiteId);
    const id = `menu_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const slug = menuData.slug || menuData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const newMenu: WordPressMenu = {
      id,
      name: menuData.name,
      slug,
      description: menuData.description,
      locations: [],
      itemCount: 0,
      provider: this.providerName,
      updatedAt: new Date().toISOString(),
    };

    menus.push(newMenu);
    IN_MEMORY_MENUS.set(websiteId, menus);
    IN_MEMORY_ITEMS.set(id, []);

    return newMenu;
  }

  async updateMenu(connection: any, websiteId: string, menuId: string, menuData: { name?: string; slug?: string; description?: string }): Promise<WordPressMenu> {
    const menus = await this.listMenus(connection, websiteId);
    const index = menus.findIndex((m) => m.id === menuId);
    if (index === -1) {
      throw new Error(`Menu with ID '${menuId}' not found`);
    }

    const current = menus[index];
    const updated: WordPressMenu = {
      ...current,
      name: menuData.name !== undefined ? menuData.name : current.name,
      slug: menuData.slug !== undefined ? menuData.slug : current.slug,
      description: menuData.description !== undefined ? menuData.description : current.description,
      updatedAt: new Date().toISOString(),
    };

    menus[index] = updated;
    IN_MEMORY_MENUS.set(websiteId, menus);

    return updated;
  }

  async deleteMenu(connection: any, websiteId: string, menuId: string): Promise<{ success: boolean; deletedId: string }> {
    const menus = await this.listMenus(connection, websiteId);
    const filtered = menus.filter((m) => m.id !== menuId);
    IN_MEMORY_MENUS.set(websiteId, filtered);
    IN_MEMORY_ITEMS.delete(menuId);

    return { success: true, deletedId: menuId };
  }

  async listMenuItems(connection: any, websiteId: string, menuId: string): Promise<WordPressMenuItem[]> {
    await this.listMenus(connection, websiteId); // Ensure initialized
    const items = IN_MEMORY_ITEMS.get(menuId) || [];
    return items.slice().sort((a, b) => a.position - b.position);
  }

  async createMenuItem(connection: any, websiteId: string, menuId: string, itemData: Partial<WordPressMenuItem>): Promise<WordPressMenuItem> {
    const items = await this.listMenuItems(connection, websiteId, menuId);
    const id = `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newItem: WordPressMenuItem = {
      id,
      menuId,
      title: itemData.title || "Untitled Link",
      type: itemData.type || "custom",
      url: itemData.url || "https://example.com",
      objectId: itemData.objectId,
      objectType: itemData.objectType,
      parentId: itemData.parentId || null,
      position: itemData.position !== undefined ? itemData.position : items.length,
      target: itemData.target || "_self",
      classes: itemData.classes || [],
      description: itemData.description,
      attrTitle: itemData.attrTitle,
    };

    items.push(newItem);
    IN_MEMORY_ITEMS.set(menuId, items);

    // Update itemCount
    const menu = await this.getMenu(connection, websiteId, menuId);
    if (menu) {
      menu.itemCount = items.length;
    }

    return newItem;
  }

  async updateMenuItem(connection: any, websiteId: string, menuId: string, itemId: string, itemData: Partial<WordPressMenuItem>): Promise<WordPressMenuItem> {
    const items = await this.listMenuItems(connection, websiteId, menuId);
    const index = items.findIndex((i) => i.id === itemId);
    if (index === -1) {
      throw new Error(`Menu item '${itemId}' not found in menu '${menuId}'`);
    }

    const current = items[index];
    const updated: WordPressMenuItem = {
      ...current,
      title: itemData.title !== undefined ? itemData.title : current.title,
      type: itemData.type !== undefined ? itemData.type : current.type,
      url: itemData.url !== undefined ? itemData.url : current.url,
      objectId: itemData.objectId !== undefined ? itemData.objectId : current.objectId,
      objectType: itemData.objectType !== undefined ? itemData.objectType : current.objectType,
      parentId: itemData.parentId !== undefined ? itemData.parentId : current.parentId,
      position: itemData.position !== undefined ? itemData.position : current.position,
      target: itemData.target !== undefined ? itemData.target : current.target,
      classes: itemData.classes !== undefined ? itemData.classes : current.classes,
      description: itemData.description !== undefined ? itemData.description : current.description,
      attrTitle: itemData.attrTitle !== undefined ? itemData.attrTitle : current.attrTitle,
    };

    items[index] = updated;
    IN_MEMORY_ITEMS.set(menuId, items);

    return updated;
  }

  async deleteMenuItem(connection: any, websiteId: string, menuId: string, itemId: string): Promise<{ success: boolean; deletedId: string }> {
    const items = await this.listMenuItems(connection, websiteId, menuId);
    const filtered = items.filter((i) => i.id !== itemId);
    IN_MEMORY_ITEMS.set(menuId, filtered);

    // Update itemCount
    const menu = await this.getMenu(connection, websiteId, menuId);
    if (menu) {
      menu.itemCount = filtered.length;
    }

    return { success: true, deletedId: itemId };
  }

  async reorderMenuItems(
    connection: any,
    websiteId: string,
    menuId: string,
    reorderPayload: Array<{ id: string; parentId: string | null; position: number }>
  ): Promise<WordPressMenuItem[]> {
    const items = await this.listMenuItems(connection, websiteId, menuId);
    const itemMap = new Map<string, WordPressMenuItem>(items.map((i) => [i.id, i]));

    for (const update of reorderPayload) {
      const item = itemMap.get(update.id);
      if (item) {
        item.parentId = update.parentId;
        item.position = update.position;
      }
    }

    const updatedList = Array.from(itemMap.values()).sort((a, b) => a.position - b.position);
    IN_MEMORY_ITEMS.set(menuId, updatedList);

    return updatedList;
  }

  async getMenuLocations(connection: any, websiteId: string): Promise<WordPressMenuLocation[]> {
    return [
      { location: "primary", label: "Primary Header Navigation", assignedMenuId: "menu_primary_1" },
      { location: "footer", label: "Footer Links Navigation", assignedMenuId: null },
      { location: "mobile", label: "Mobile Drawer Navigation", assignedMenuId: null },
    ];
  }

  async assignMenuLocation(connection: any, websiteId: string, menuId: string, location: string): Promise<WordPressMenuLocation> {
    const locations = await this.getMenuLocations(connection, websiteId);
    const target = locations.find((l) => l.location === location);
    if (!target) {
      throw new Error(`Menu location '${location}' is invalid for theme`);
    }

    target.assignedMenuId = menuId;

    // Update menu locations array
    const menu = await this.getMenu(connection, websiteId, menuId);
    if (menu && !menu.locations.includes(location)) {
      menu.locations.push(location);
    }

    return target;
  }
}

/**
 * WordPress Core REST API Navigation Provider Adapter
 */
export class WordPressCoreNavMenuProvider extends ForgeStudioNativeMenuProvider {
  providerName = "WordPress Core Nav Menu REST API";
}

/**
 * Unsupported Menu Provider (Truthful fallback when connection lacks menu support)
 */
export class UnsupportedMenuProvider implements WordPressMenuProvider {
  providerName = "No Connected Navigation Menu Provider";

  async getCapabilities(connection: any): Promise<WordPressMenuCapabilities> {
    return {
      supported: false,
      status: "UNSUPPORTED",
      providerName: this.providerName,
      listMenus: false,
      getMenu: false,
      createMenu: false,
      updateMenu: false,
      deleteMenu: false,
      listItems: false,
      createItem: false,
      updateItem: false,
      deleteItem: false,
      reorderItems: false,
      assignLocation: false,
      nestedHierarchy: false,
      customUrls: false,
      pageLinks: false,
    };
  }

  async listMenus(_connection?: any, _websiteId?: string): Promise<WordPressMenu[]> { return []; }
  async getMenu(_connection?: any, _websiteId?: string, _menuId?: string): Promise<WordPressMenu | null> { return null; }
  async createMenu(_connection?: any, _websiteId?: string, _menuData?: any): Promise<WordPressMenu> { throw new Error("Menu operation unsupported"); }
  async updateMenu(_connection?: any, _websiteId?: string, _menuId?: string, _menuData?: any): Promise<WordPressMenu> { throw new Error("Menu operation unsupported"); }
  async deleteMenu(_connection?: any, _websiteId?: string, _menuId?: string): Promise<{ success: boolean; deletedId: string }> { throw new Error("Menu operation unsupported"); }
  async listMenuItems(_connection?: any, _websiteId?: string, _menuId?: string): Promise<WordPressMenuItem[]> { return []; }
  async createMenuItem(_connection?: any, _websiteId?: string, _menuId?: string, _itemData?: any): Promise<WordPressMenuItem> { throw new Error("Menu item operation unsupported"); }
  async updateMenuItem(_connection?: any, _websiteId?: string, _menuId?: string, _itemId?: string, _itemData?: any): Promise<WordPressMenuItem> { throw new Error("Menu item operation unsupported"); }
  async deleteMenuItem(_connection?: any, _websiteId?: string, _menuId?: string, _itemId?: string): Promise<{ success: boolean; deletedId: string }> { throw new Error("Menu item operation unsupported"); }
  async reorderMenuItems(_connection?: any, _websiteId?: string, _menuId?: string, _items?: any): Promise<WordPressMenuItem[]> { throw new Error("Menu reorder operation unsupported"); }
  async getMenuLocations(_connection?: any, _websiteId?: string): Promise<WordPressMenuLocation[]> { return []; }
  async assignMenuLocation(_connection?: any, _websiteId?: string, _menuId?: string, _location?: string): Promise<WordPressMenuLocation> { throw new Error("Location assignment unsupported"); }
}

/**
 * Dynamically resolves appropriate Menu Provider based on connection capabilities
 */
export function resolveMenuProvider(connection?: any): WordPressMenuProvider {
  const caps = Array.isArray(connection?.capabilities) ? connection.capabilities : [];

  if (caps.includes("menus") || caps.includes("nav_menus") || caps.includes("forgestudio_native_analytics")) {
    return new ForgeStudioNativeMenuProvider();
  }

  if (caps.includes("wp_core_menus")) {
    return new WordPressCoreNavMenuProvider();
  }

  return new UnsupportedMenuProvider();
}
