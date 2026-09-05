import { getUserWebsites, getWebsiteById, updateWebsiteEditorData } from "../services/website.service.js";

export interface BackendPluginManifest {
    id: string;
    version: string;
    name: string;
}

export interface BackendPluginContext {
    services: {
        websites: {
            getUserWebsites: typeof getUserWebsites;
            getWebsiteById: typeof getWebsiteById;
            updateWebsiteEditorData: typeof updateWebsiteEditorData;
        }
    };
    logger: {
        info: (msg: string) => void;
        error: (msg: string, err?: any) => void;
    };
    hooks: {
        addAction: (hookName: string, cb: Function) => void;
        addFilter: (hookName: string, cb: Function) => void;
    };
}

export class BackendPluginManagerCore {
    private plugins = new Map<string, BackendPluginManifest>();
    private actions = new Map<string, Function[]>();
    private filters = new Map<string, Function[]>();
    private static instance: BackendPluginManagerCore;

    public static getInstance() {
        if (!BackendPluginManagerCore.instance) {
            BackendPluginManagerCore.instance = new BackendPluginManagerCore();
        }
        return BackendPluginManagerCore.instance;
    }

    public registerPlugin(manifest: BackendPluginManifest, initPhase: (ctx: BackendPluginContext) => void) {
        if (this.plugins.has(manifest.id)) {
            console.error(`[PluginManager] PLUGIN_ALREADY_REGISTERED: ${manifest.id}`);
            return false;
        }

        const context: BackendPluginContext = {
            services: {
                websites: {
                    getUserWebsites,
                    getWebsiteById,
                    updateWebsiteEditorData
                }
            },
            logger: {
                info: (msg) => console.log(`[Plugin:${manifest.id}] ${msg}`),
                error: (msg, err) => console.error(`[Plugin:${manifest.id}] ${msg}`, err)
            },
            hooks: {
                addAction: (name, cb) => {
                    if (!this.actions.has(name)) this.actions.set(name, []);
                    this.actions.get(name)!.push(cb);
                },
                addFilter: (name, cb) => {
                    if (!this.filters.has(name)) this.filters.set(name, []);
                    this.filters.get(name)!.push(cb);
                }
            }
        };

        try {
            initPhase(context);
            this.plugins.set(manifest.id, manifest);
            console.log(`[PluginManager] Backend Registered: ${manifest.id}`);
            return true;
        } catch (e) {
            console.error(`[PluginManager] Failed to init backend plugin ${manifest.id}:`, e);
            return false;
        }
    }

    public doAction(hook: string, ...args: any[]) {
        const hooks = this.actions.get(hook) || [];
        for (const h of hooks) {
            try { h(...args); } catch (e) { console.error(`[PluginManager] Action Error in ${hook}:`, e); }
        }
    }

    public applyFilters(hook: string, initialValue: any, ...args: any[]) {
        const hooks = this.filters.get(hook) || [];
        let val = initialValue;
        for (const h of hooks) {
            try { val = h(val, ...args); } catch (e) { console.error(`[PluginManager] Filter Error in ${hook}:`, e); }
        }
        return val;
    }
}

export const BackendPluginManager = BackendPluginManagerCore.getInstance();
