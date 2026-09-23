import { BackendPluginManager } from "./PluginManager.js";

// Example Plugin ensuring the architecture works natively!
BackendPluginManager.registerPlugin({
    id: "fs-core-backend-seo",
    name: "Advanced SEO Tools (Backend)",
    version: "1.0.0"
}, (context) => {

    // Example Hook Registration explicitly sandboxed!
    context.hooks.addAction("server.started", () => {
        context.logger.info("Backend SEO Extension securely initialized.");
    });

    // You could theoretically add a filter here to mutate how data is normalized
    // context.hooks.addFilter("api.response.website", (websiteData) => { ... return websiteData })

});
