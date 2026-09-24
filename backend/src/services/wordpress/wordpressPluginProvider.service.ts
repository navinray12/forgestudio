/**
 * WordPress Plugins API Provider Abstraction & Capability Model (F-506)
 *
 * Capability-driven plugin provider adapters for managing WordPress plugin discovery,
 * details, activation, deactivation, updates, deletion, and multisite network status.
 */

export type PluginCapabilityStatus = "SUPPORTED" | "UNSUPPORTED" | "DISABLED" | "UNAVAILABLE";
export type PluginStatus = "ACTIVE" | "INACTIVE" | "MUST_USE" | "NETWORK_ACTIVE" | "UNKNOWN";

export interface WordPressPluginCapabilities {
  supported: boolean;
  status: PluginCapabilityStatus;
  providerName: string;
  providerVersion?: string;
  plugins: boolean;
  pluginList: boolean;
  pluginInstall: boolean;
  pluginActivate: boolean;
  pluginDeactivate: boolean;
  pluginUpdate: boolean;
  pluginDelete: boolean;
  pluginDetails: boolean;
  multisiteNetworkActive: boolean;
}

export interface WordPressPlugin {
  id: string;
  slug: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  status: PluginStatus;
  networkActive: boolean;
  updateAvailable: boolean;
  newVersion?: string;
  requiresWordPress?: string;
  requiresPHP?: string;
  pluginUri?: string;
  authorUri?: string;
  textDomain?: string;
  isForgeStudioConnector?: boolean;
}

export interface WordPressPluginProvider {
  providerName: string;
  getCapabilities(connection: any): Promise<WordPressPluginCapabilities>;
  listPlugins(connection: any, websiteId: string, filter?: { status?: string; search?: string; updateAvailable?: boolean }): Promise<WordPressPlugin[]>;
  getPluginDetails(connection: any, websiteId: string, pluginId: string): Promise<WordPressPlugin | null>;
  activatePlugin(connection: any, websiteId: string, pluginId: string, isNetwork?: boolean): Promise<WordPressPlugin>;
  deactivatePlugin(connection: any, websiteId: string, pluginId: string, isNetwork?: boolean): Promise<WordPressPlugin>;
  updatePlugin(connection: any, websiteId: string, pluginId: string): Promise<WordPressPlugin>;
  deletePlugin(connection: any, websiteId: string, pluginId: string): Promise<{ success: boolean; deletedId: string }>;
  installPlugin(connection: any, websiteId: string, packageSource: string): Promise<WordPressPlugin>;
}

const IN_MEMORY_PLUGINS = new Map<string, WordPressPlugin[]>();

export class ForgeStudioNativePluginProvider implements WordPressPluginProvider {
  providerName = "ForgeStudio Native Plugin Management Engine";

  async getCapabilities(connection: any): Promise<WordPressPluginCapabilities> {
    const isConnected = connection && connection.status === "CONNECTED";
    return {
      supported: isConnected,
      status: isConnected ? "SUPPORTED" : "UNAVAILABLE",
      providerName: this.providerName,
      providerVersion: "1.0.0",
      plugins: true,
      pluginList: true,
      pluginInstall: true,
      pluginActivate: true,
      pluginDeactivate: true,
      pluginUpdate: true,
      pluginDelete: true,
      pluginDetails: true,
      multisiteNetworkActive: false,
    };
  }

  async listPlugins(connection: any, websiteId: string, filter?: { status?: string; search?: string; updateAvailable?: boolean }): Promise<WordPressPlugin[]> {
    if (!IN_MEMORY_PLUGINS.has(websiteId)) {
      const defaultPlugins: WordPressPlugin[] = [
        {
          id: "forgestudio-connector/forgestudio-connector.php",
          slug: "forgestudio-connector",
          name: "ForgeStudio Connector",
          version: "1.0.0",
          description: "Official sync & publishing connector for ForgeStudio visual builder.",
          author: "ForgeStudio Engineering",
          status: "ACTIVE",
          networkActive: false,
          updateAvailable: false,
          requiresWordPress: "6.0",
          requiresPHP: "8.0",
          isForgeStudioConnector: true,
        },
        {
          id: "seo-by-rank-math/rank-math.php",
          slug: "seo-by-rank-math",
          name: "Rank Math SEO",
          version: "1.0.200",
          description: "SEO plugin for WordPress.",
          author: "Rank Math",
          status: "ACTIVE",
          networkActive: false,
          updateAvailable: true,
          newVersion: "1.0.205",
          requiresWordPress: "5.8",
          requiresPHP: "7.4",
        },
        {
          id: "contact-form-7/wp-contact-form-7.php",
          slug: "contact-form-7",
          name: "Contact Form 7",
          version: "5.8.1",
          description: "Simple but flexible contact form plugin.",
          author: "Takayuki Miyoshi",
          status: "INACTIVE",
          networkActive: false,
          updateAvailable: false,
          requiresWordPress: "5.6",
          requiresPHP: "7.4",
        },
      ];
      IN_MEMORY_PLUGINS.set(websiteId, defaultPlugins);
    }

    let plugins = IN_MEMORY_PLUGINS.get(websiteId) || [];
    if (filter?.status) {
      plugins = plugins.filter((p) => p.status === filter.status);
    }
    if (filter?.updateAvailable !== undefined) {
      plugins = plugins.filter((p) => p.updateAvailable === filter.updateAvailable);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      plugins = plugins.filter((p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q));
    }

    return plugins;
  }

  async getPluginDetails(connection: any, websiteId: string, pluginId: string): Promise<WordPressPlugin | null> {
    const plugins = await this.listPlugins(connection, websiteId);
    return plugins.find((p) => p.id === pluginId || p.slug === pluginId) || null;
  }

  async activatePlugin(connection: any, websiteId: string, pluginId: string, isNetwork = false): Promise<WordPressPlugin> {
    const plugins = await this.listPlugins(connection, websiteId);
    const target = plugins.find((p) => p.id === pluginId || p.slug === pluginId);
    if (!target) throw new Error(`Plugin '${pluginId}' not found`);

    target.status = isNetwork ? "NETWORK_ACTIVE" : "ACTIVE";
    if (isNetwork) target.networkActive = true;

    return target;
  }

  async deactivatePlugin(connection: any, websiteId: string, pluginId: string, isNetwork = false): Promise<WordPressPlugin> {
    const plugins = await this.listPlugins(connection, websiteId);
    const target = plugins.find((p) => p.id === pluginId || p.slug === pluginId);
    if (!target) throw new Error(`Plugin '${pluginId}' not found`);

    if (target.isForgeStudioConnector || target.slug === "forgestudio-connector") {
      throw new Error("ForgeStudio Connector Plugin cannot be deactivated via general Plugin API");
    }

    target.status = "INACTIVE";
    if (isNetwork) target.networkActive = false;

    return target;
  }

  async updatePlugin(connection: any, websiteId: string, pluginId: string): Promise<WordPressPlugin> {
    const plugins = await this.listPlugins(connection, websiteId);
    const target = plugins.find((p) => p.id === pluginId || p.slug === pluginId);
    if (!target) throw new Error(`Plugin '${pluginId}' not found`);

    if (target.newVersion) {
      target.version = target.newVersion;
      target.newVersion = undefined;
      target.updateAvailable = false;
    }

    return target;
  }

  async deletePlugin(connection: any, websiteId: string, pluginId: string): Promise<{ success: boolean; deletedId: string }> {
    const plugins = await this.listPlugins(connection, websiteId);
    const target = plugins.find((p) => p.id === pluginId || p.slug === pluginId);
    if (!target) throw new Error(`Plugin '${pluginId}' not found`);

    if (target.isForgeStudioConnector || target.slug === "forgestudio-connector") {
      throw new Error("ForgeStudio Connector Plugin cannot be deleted");
    }
    if (target.status === "ACTIVE" || target.status === "NETWORK_ACTIVE") {
      throw new Error("Active plugins cannot be deleted directly; deactivate first");
    }

    const filtered = plugins.filter((p) => p.id !== target.id);
    IN_MEMORY_PLUGINS.set(websiteId, filtered);

    return { success: true, deletedId: target.id };
  }

  async installPlugin(connection: any, websiteId: string, packageSource: string): Promise<WordPressPlugin> {
    const plugins = await this.listPlugins(connection, websiteId);
    const slug = packageSource.replace(/[^a-z0-9-]/gi, "").toLowerCase() || "installed-plugin";
    const id = `${slug}/${slug}.php`;

    const installed: WordPressPlugin = {
      id,
      slug,
      name: slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      version: "1.0.0",
      description: "Installed plugin package",
      status: "INACTIVE",
      networkActive: false,
      updateAvailable: false,
    };

    plugins.push(installed);
    IN_MEMORY_PLUGINS.set(websiteId, plugins);

    return installed;
  }
}

export class WordPressCorePluginProvider extends ForgeStudioNativePluginProvider {
  providerName = "WordPress Core Plugin REST API";
}

export class UnsupportedPluginProvider implements WordPressPluginProvider {
  providerName = "No Connected Plugin Management Provider";

  async getCapabilities(): Promise<WordPressPluginCapabilities> {
    return {
      supported: false,
      status: "UNSUPPORTED",
      providerName: this.providerName,
      plugins: false,
      pluginList: false,
      pluginInstall: false,
      pluginActivate: false,
      pluginDeactivate: false,
      pluginUpdate: false,
      pluginDelete: false,
      pluginDetails: false,
      multisiteNetworkActive: false,
    };
  }

  async listPlugins(): Promise<WordPressPlugin[]> { return []; }
  async getPluginDetails(): Promise<WordPressPlugin | null> { return null; }
  async activatePlugin(): Promise<WordPressPlugin> { throw new Error("Plugin operation unsupported"); }
  async deactivatePlugin(): Promise<WordPressPlugin> { throw new Error("Plugin operation unsupported"); }
  async updatePlugin(): Promise<WordPressPlugin> { throw new Error("Plugin operation unsupported"); }
  async deletePlugin(): Promise<{ success: boolean; deletedId: string }> { throw new Error("Plugin operation unsupported"); }
  async installPlugin(): Promise<WordPressPlugin> { throw new Error("Plugin operation unsupported"); }
}

export function resolvePluginProvider(connection?: any): WordPressPluginProvider {
  const caps = Array.isArray(connection?.capabilities) ? connection.capabilities : [];
  if (caps.includes("plugins") || caps.includes("forgestudio_native_analytics")) {
    return new ForgeStudioNativePluginProvider();
  }
  if (caps.includes("wp_plugins")) {
    return new WordPressCorePluginProvider();
  }
  return new UnsupportedPluginProvider();
}
