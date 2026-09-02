import { pluginRegistry } from "./plugin.registry";

export const ExamplePlugin = {
    id: "fs-example-hero",
    name: "Premium Hero Blocks",
    version: "1.0.0",
    description: "A free set of premium hero block components for generic startups.",
    enabled: true,
    apiVersion: "1.0.0",
    capabilities: ["element"],
    components: {
        "hero-1": {
            name: "SaaS Hero 1",
            icon: "🌟",
            defaultConfig: {
                title: "Build faster with ForgeStudio",
                subtitle: "The ultimate builder experience."
            },
            render: (props: any) => (
                <div className="w-full relative flex flex-col items-center justify-center py-20 px-4 bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl overflow-hidden shadow-2xl my-2">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-center z-10 mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
                        {props.title || "Hero Title"}
                    </h1>
                    <p className="text-lg md:text-xl text-indigo-200 text-center max-w-2xl z-10 mb-8">
                        {props.subtitle || "Hero Subtitle"}
                    </p>
                    <div className="flex gap-4 z-10">
                        <button className="px-6 py-3 bg-white text-indigo-900 font-bold rounded-lg shadow-lg hover:bg-indigo-50 transition">Get Started Free</button>
                        <button className="px-6 py-3 bg-indigo-800 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 transition border border-indigo-600">View Documentation</button>
                    </div>
                </div>
            )
        },
        "alert-block": {
            name: "Alert Ribbon",
            icon: "🎀",
            defaultConfig: { message: "Limited time offer! 50% off." },
            render: (props: any) => (
                <div className="w-full py-3 px-4 bg-amber-500 text-amber-950 font-bold text-center text-sm shadow-md rounded-lg my-1">
                    {props.message}
                </div>
            )
        }
    }
};

export const InvalidThirdPartyPlugin = {
    id: "fs-broken-malicious",
    name: "Bad Third Party Extension",
    version: "1.0.0",
    apiVersion: "9.9.9", // Incompatible API VERSION exactly satisfying F-120 validation
    description: "I will be blocked from loading safely.",
    enabled: true,
    capabilities: ["element"]
};

// Register safe native valid
pluginRegistry.registerPlugin(ExamplePlugin);
// Fire block validation
pluginRegistry.registerPlugin(InvalidThirdPartyPlugin);
