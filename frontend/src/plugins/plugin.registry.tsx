import React from 'react';

export interface PluginDefinition {
    id: string;
    name: string;
    version: string;
    description?: string;
    enabled: boolean;
    capabilities: string[];
    components?: {
        [key: string]: {
            name: string;
            icon: string;
            render: (props: any) => React.ReactNode;
            defaultConfig?: any;
        }
    }
}

export const BUILDER_API_VERSION = "1.0.0";

export interface ThirdPartyPluginManifest extends PluginDefinition {
    apiVersion?: string;
    dependencies?: string[];
}

export type CompatibilityResult = "Compatible" | "Incompatible API version" | "Missing dependency" | "Invalid manifest";

class PluginRegistry {
    private plugins = new Map<string, PluginDefinition>();

    checkPluginCompatibility(manifest: ThirdPartyPluginManifest): CompatibilityResult {
        if (!manifest.id || !manifest.name || !manifest.version) return "Invalid manifest";
        if (manifest.apiVersion && manifest.apiVersion !== BUILDER_API_VERSION) return "Incompatible API version";

        if (manifest.dependencies) {
            for (const dep of manifest.dependencies) {
                if (!this.plugins.has(dep)) return "Missing dependency";
            }
        }

        return "Compatible";
    }

    registerPlugin(plugin: ThirdPartyPluginManifest) {
        if (!plugin.id || !plugin.version) throw new Error("Invalid Plugin Definition");

        // F-120 Third-Party Compatibility
        const compatibility = this.checkPluginCompatibility(plugin);
        if (compatibility !== "Compatible") {
            console.error(`[F-120] Third-Party Plugin ${plugin.name} rejected: ${compatibility}`);
            return;
        }

        if (this.plugins.has(plugin.id)) {
            console.warn(`Plugin ${plugin.id} is already registered.`);
            return;
        }
        this.plugins.set(plugin.id, plugin);
    }

    getPlugin(id: string) {
        return this.plugins.get(id);
    }

    getRegisteredPlugins() {
        return Array.from(this.plugins.values());
    }

    getAvailableComponents() {
        return this.getRegisteredPlugins()
            .filter((p) => p.capabilities.includes('element') && p.components)
            .flatMap((p) => Object.entries(p.components || {}).map(([key, comp]) => ({
                pluginId: p.id,
                componentKey: key,
                ...comp
            })));
    }

    renderPluginComponent(pluginId: string, componentKey: string, isPluginEnabled: boolean, props: any) {
        const plugin = this.plugins.get(pluginId);

        // F-119: Safely fallback on missing or uninstalled plugins ensuring recovering structure
        if (!plugin) {
            return (
                <div className="p-4 border-2 border-dashed border-rose-300 bg-rose-50 text-rose-700 text-xs rounded opacity-75">
                    Plugin element unavailable. Missing Extension ID: <strong>{pluginId}</strong>.
                    <br />
                    <span className="text-[10px] text-rose-500">The element's properties and structure remain safe. Re-install the plugin to restore rendering.</span>
                </div>
            );
        }

        if (!isPluginEnabled) {
            return (
                <div className="p-4 border-2 border-dashed border-amber-300 bg-amber-50 text-amber-700 text-xs rounded opacity-75">
                    Plugin element unavailable. <strong>{plugin.name}</strong> is currently disabled.
                </div>
            );
        }

        const comp = plugin.components?.[componentKey];
        if (!comp) {
            return (
                <div className="p-4 border-2 border-dashed border-rose-300 bg-rose-50 text-rose-700 text-xs rounded opacity-75">
                    Component <strong>{componentKey}</strong> was not found in <strong>{plugin.name}</strong>.
                </div>
            );
        }

        try {
            // F-119: Execute rendering inside error boundary logic structurally
            return comp.render(props);
        } catch (err: any) {
            return (
                <div className="p-4 border-2 border-dashed border-rose-300 bg-rose-300 text-rose-900 text-[10px] rounded shadow-inner">
                    <strong>Plugin Render Error Context ({plugin.name}):</strong><br />
                    <code className="text-rose-900 font-mono mt-1">{err.message}</code>
                </div>
            );
        }
    }
}

export const pluginRegistry = new PluginRegistry();
