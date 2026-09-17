import { PluginManager } from "./PluginManager";

// Example Plugin ensuring the architecture works natively!
// F-119 Strictly expects a foundational boundary (Not a remote package installer)
PluginManager.registerPlugin({
    id: "fs-core-seo-extension",
    name: "Advanced SEO Tools",
    version: "1.0.0",
    author: "ForgeStudio",
    description: "Built-in extensions for SEO metadata integrations demonstrating Plugin Compatibility.",
    forgeStudioVersion: ">=1.0.0",
    capabilities: ["elements", "hooks", "settings"]
}, (context) => {

    // Example Hook Registration explicitly sandboxed!
    context.hooks.addAction("editor.initialized", () => {
        context.logger.info("Initializing Editor SEO Extension securely.");
    });

    // Example Settings UI mapping demonstration
    context.elements.registerElement({
        type: "fs-core-seo-extension.meta-tags",
        title: "SEO Meta Block (Plugin)",
        category: "layout",
        icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
        allowedChildren: false,
        defaultStyles: {
            display: "none"
        },
        controls: [
            { id: "title", type: "text", label: "Page Title", defaultValue: "My Page" },
            { id: "description", type: "text", label: "Meta Description", defaultValue: "" }
        ]
    });

});

// Activate the environment strictly
PluginManager.activatePlugins();
