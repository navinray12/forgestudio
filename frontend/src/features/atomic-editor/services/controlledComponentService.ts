const LOCKS_STORAGE_KEY = "forge_studio_component_locks";
const OVERRIDES_STORAGE_KEY = "forge_studio_component_overrides";

const DEFAULT_ALLOWED_KEYS: Record<string, string[]> = {
  "comp-pricing-card": ["title", "description", "price", "buttonText", "buttonLink"],
  "comp-feature-card": ["title", "description"],
};

export class ControlledComponentService {
  /**
   * Gets allowed editable keys for a component
   */
  static getComponentLockSettings(componentId: string): string[] {
    try {
      const raw = localStorage.getItem(LOCKS_STORAGE_KEY);
      if (!raw) {
        return DEFAULT_ALLOWED_KEYS[componentId] || ["title", "description", "price", "buttonText", "buttonLink"];
      }
      const parsed: Record<string, string[]> = JSON.parse(raw);
      return parsed[componentId] || DEFAULT_ALLOWED_KEYS[componentId] || ["title", "description", "price", "buttonText", "buttonLink"];
    } catch {
      return DEFAULT_ALLOWED_KEYS[componentId] || ["title", "description", "price", "buttonText", "buttonLink"];
    }
  }

  /**
   * Saves allowed editable keys for a component
   */
  static saveComponentLockSettings(componentId: string, allowedKeys: string[]): void {
    try {
      const raw = localStorage.getItem(LOCKS_STORAGE_KEY);
      const parsed: Record<string, string[]> = raw ? JSON.parse(raw) : {};
      parsed[componentId] = allowedKeys;
      localStorage.setItem(LOCKS_STORAGE_KEY, JSON.stringify(parsed));
    } catch (err) {
      console.error("Failed to save component lock settings:", err);
    }
  }

  /**
   * Gets instance property overrides
   */
  static getInstanceOverrides(instanceId: string): Record<string, string> {
    try {
      const raw = localStorage.getItem(OVERRIDES_STORAGE_KEY);
      if (!raw) return {};
      const parsed: Record<string, Record<string, string>> = JSON.parse(raw);
      return parsed[instanceId] || {};
    } catch {
      return {};
    }
  }

  /**
   * Saves instance property overrides
   */
  static saveInstanceOverride(instanceId: string, propertyKey: string, value: string): Record<string, string> {
    try {
      const raw = localStorage.getItem(OVERRIDES_STORAGE_KEY);
      const parsed: Record<string, Record<string, string>> = raw ? JSON.parse(raw) : {};
      if (!parsed[instanceId]) parsed[instanceId] = {};
      parsed[instanceId][propertyKey] = value;
      localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(parsed));
      return parsed[instanceId];
    } catch (err) {
      console.error("Failed to save instance override:", err);
      return {};
    }
  }

  /**
   * Resets a specific instance override to component default
   */
  static resetInstanceOverride(instanceId: string, propertyKey: string): Record<string, string> {
    try {
      const raw = localStorage.getItem(OVERRIDES_STORAGE_KEY);
      if (!raw) return {};
      const parsed: Record<string, Record<string, string>> = JSON.parse(raw);
      if (parsed[instanceId]) {
        delete parsed[instanceId][propertyKey];
        localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(parsed));
        return parsed[instanceId];
      }
      return {};
    } catch (err) {
      console.error("Failed to reset instance override:", err);
      return {};
    }
  }
}
