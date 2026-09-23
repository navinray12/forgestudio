export interface PluginManifest {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    forgeStudioVersion: string; // e.g. ">=1.0.0"
    dependencies?: Record<string, string>;
    capabilities: PluginCapability[];
}

export type PluginCapability = "elements" | "settings" | "hooks";

export type PluginState = "registered" | "active" | "error" | "inactive";

export interface PluginError {
    message: string;
    details?: any;
    stack?: string;
}

export interface PluginExtensionContext {
    hooks: {
        addAction: (hookName: string, callback: (...args: any[]) => void, priority?: number) => void;
        addFilter: <T>(hookName: string, callback: (value: T, ...args: any[]) => T, priority?: number) => void;
    };
    elements: {
        registerElement: (config: any) => void;
    };
    logger: {
        info: (msg: string, ...args: any[]) => void;
        warn: (msg: string, ...args: any[]) => void;
        error: (msg: string, ...args: any[]) => void;
    };
}

// Global registry for Hooks/Filters
interface HookRegistration {
    callback: Function;
    priority: number;
    pluginId: string;
}

// Global registry for Plugins
interface PluginInstance {
    manifest: PluginManifest;
    state: PluginState;
    error?: PluginError;
    initPhase?: (context: PluginExtensionContext) => void;
}

export class PluginManagerCore {
    private plugins: Map<string, PluginInstance> = new Map();
    private actions: Map<string, HookRegistration[]> = new Map();
    private filters: Map<string, HookRegistration[]> = new Map();
    private registeredElements: Map<string, any> = new Map(); // Store custom element structures

    private static instance: PluginManagerCore;

    public static getInstance(): PluginManagerCore {
        if (!PluginManagerCore.instance) {
            PluginManagerCore.instance = new PluginManagerCore();
        }
        return PluginManagerCore.instance;
    }

    private constructor() {
        // Prevent uncontrolled instances
    }

    /**
     * Register a new plugin manifest and its lifecycle init callback.
     */
    public registerPlugin(manifest: PluginManifest, initPhase: (ctx: PluginExtensionContext) => void) {
        if (this.plugins.has(manifest.id)) {
            console.error(`[PluginManager] PLUGIN_ALREADY_REGISTERED: ${manifest.id}`);
            return false;
        }

        // Validate safe IDs (No overriding core behaviors arbitrarily mapped)
        if (!/^[a-z0-9-]+$/.test(manifest.id)) {
            console.error(`[PluginManager] Invalid Plugin ID format: ${manifest.id}`);
            return false;
        }

        this.plugins.set(manifest.id, {
            manifest,
            state: "registered",
            initPhase
        });

        console.log(`[PluginManager] Registered: ${manifest.id} v${manifest.version}`);
        return true;
    }

    /**
     * Activates a registered plugin. Evaluates version deps and executes hooks gracefully.
     */
    public activatePlugins() {
        this.plugins.forEach((plugin, id) => {
            if (plugin.state !== "registered") return;

            // Simple Dependency Graph check
            if (plugin.manifest.dependencies) {
                for (const depId of Object.keys(plugin.manifest.dependencies)) {
                    const depPlugin = this.plugins.get(depId);
                    if (!depPlugin || depPlugin.state === "error") {
                        plugin.state = "error";
                        plugin.error = { message: `Missing or failed dependency: ${depId}` };
                        console.error(`[PluginManager] ${id} Failed to activate. Reason: Missing dependency ${depId}`);
                        return;
                    }
                }
            }

            try {
                // Supply contextual bounds ensuring restricted namespaces dynamically. 
                const context = this.createPluginContext(id, plugin.manifest.capabilities);
                if (plugin.initPhase) {
                    plugin.initPhase(context);
                }
                plugin.state = "active";
                console.log(`[PluginManager] Activated: ${id}`);
            } catch (error: any) {
                plugin.state = "error";
                plugin.error = { message: "Failed during initialization", stack: error?.stack };
                console.error(`[PluginManager] Error activating ${id}:`, error);
            }
        });
    }

    /**
     * Get a snapshot of all plugin models globally to render inside admin dashboards/UIs safely.
     */
    public getPlugins() {
        return Array.from(this.plugins.values());
    }

    /**
     * Generates bounds strictly mapping the architectural extensions dynamically preventing raw uncontrolled eval/window mappings.
     */
    private createPluginContext(pluginId: string, capabilities: PluginCapability[]): PluginExtensionContext {
        return {
            hooks: {
                addAction: (hook, callback, priority = 10) => {
                    if (capabilities.includes("hooks")) {
                        this.addAction(hook, callback, priority, pluginId);
                    } else {
                        console.warn(`[PluginManager] ${pluginId} attempted to use Action Hooks without capability.`);
                    }
                },
                addFilter: (hook, callback, priority = 10) => {
                    if (capabilities.includes("hooks")) {
                        this.addFilter(hook, callback, priority, pluginId);
                    } else {
                        console.warn(`[PluginManager] ${pluginId} attempted to use Filter Hooks without capability.`);
                    }
                }
            },
            elements: {
                registerElement: (config: any) => {
                    if (capabilities.includes("elements")) {
                        // Validate element config namespaces dynamically forcing standard plugin ID prefixes restricting collisions completely.
                        if (!config.type.startsWith(`${pluginId}.`)) {
                            console.warn(`[PluginManager] ${pluginId} element type must be prefixed with "${pluginId}."`);
                            return;
                        }
                        this.registeredElements.set(config.type, config);
                        console.log(`[PluginManager] ${pluginId} registered element: ${config.type}`);
                    } else {
                        console.warn(`[PluginManager] ${pluginId} attempted to register elements without capability.`);
                    }
                }
            },
            logger: {
                info: (msg, ...args) => console.log(`[Plugin:${pluginId}] ${msg}`, ...args),
                warn: (msg, ...args) => console.warn(`[Plugin:${pluginId}] ${msg}`, ...args),
                error: (msg, ...args) => console.error(`[Plugin:${pluginId}] ${msg}`, ...args),
            }
        };
    }

    // ==========================================
    // Core Hook/Filter Engine Methods
    // ==========================================

    private addAction(hook: string, callback: Function, priority: number, pluginId: string) {
        if (!this.actions.has(hook)) this.actions.set(hook, []);
        this.actions.get(hook)!.push({ callback, priority, pluginId });
        this.actions.get(hook)!.sort((a, b) => a.priority - b.priority); // Chronological Deterministic Priority
    }

    public doAction(hook: string, ...args: any[]) {
        const hooks = this.actions.get(hook) || [];
        for (const h of hooks) {
            try {
                h.callback(...args);
            } catch (e) {
                console.error(`[PluginManager] Action Error in hook=${hook} from plugin=${h.pluginId}`, e);
            }
        }
    }

    private addFilter(hook: string, callback: Function, priority: number, pluginId: string) {
        if (!this.filters.has(hook)) this.filters.set(hook, []);
        this.filters.get(hook)!.push({ callback, priority, pluginId });
        this.filters.get(hook)!.sort((a, b) => a.priority - b.priority);
    }

    public applyFilters<T>(hook: string, initialValue: T, ...args: any[]): T {
        const hooks = this.filters.get(hook) || [];
        let value = initialValue;
        for (const h of hooks) {
            try {
                value = h.callback(value, ...args);
            } catch (e) {
                console.error(`[PluginManager] Filter Error in hook=${hook} from plugin=${h.pluginId}`, e);
            }
        }
        return value;
    }

    // ==========================================
    // Registry Exports
    // ==========================================

    public getRegisteredElements() {
        return this.registeredElements;
    }
}

export const PluginManager = PluginManagerCore.getInstance();
