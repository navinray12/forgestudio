import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

type FeatureDef = {
    id: string; name: string; description: string;
    location: "editor" | "dashboard"; tab?: string;
    icon: string; status: "live" | "configured";
};

const FEATURES: FeatureDef[] = [
    { id: "F-102", name: "Element Custom CSS", description: "CSS scoped to an individual element.", location: "editor", icon: "{ }", status: "live" },
    { id: "F-103", name: "Page Custom CSS", description: "CSS scoped to the current page.", location: "editor", icon: "📄", status: "live" },
    { id: "F-104", name: "Global Custom CSS", description: "Site-wide custom stylesheet.", location: "editor", icon: "🌍", status: "live" },
    { id: "F-105", name: "CSS ID", description: "Assign custom element IDs for targeting.", location: "editor", icon: "#", status: "live" },
    { id: "F-106", name: "CSS Classes", description: "Assign reusable CSS classes to elements.", location: "editor", icon: ".", status: "live" },
    { id: "F-107", name: "CSS Selectors", description: "Target elements with advanced CSS selectors.", location: "editor", icon: "*", status: "live" },
    { id: "F-108", name: "Custom Attributes", description: "Add custom data-* HTML attributes to elements.", location: "editor", icon: "=", status: "live" },
    { id: "F-109", name: "Custom Link Attributes", description: "Add rel, target, and other attributes to links.", location: "editor", icon: "🔗", status: "live" },
    { id: "F-110", name: "HTML Widget", description: "Insert and edit raw custom HTML blocks.", location: "editor", icon: "</>", status: "live" },
    { id: "F-111", name: "Shortcode Widget", description: "Render WordPress/plugin shortcodes.", location: "editor", icon: "[ ]", status: "live" },
    { id: "F-112", name: "Custom Code Inject", description: "Inject scripts and styles into page sections.", location: "dashboard", tab: "custom-code", icon: "⚡", status: "live" },
    { id: "F-113", name: "Code Conditions", description: "Conditionally load code based on rules.", location: "dashboard", tab: "custom-code", icon: "🔀", status: "live" },
    { id: "F-114", name: "Custom Code Draft", description: "Save snippets as drafts before publishing.", location: "dashboard", tab: "custom-code", icon: "📝", status: "live" },
    { id: "F-115", name: "Scheduled Publishing", description: "Schedule code snippets to go live at a set time.", location: "dashboard", tab: "custom-code", icon: "⏰", status: "live" },
    { id: "F-116", name: "Code Priority", description: "Control execution order of injected code.", location: "dashboard", tab: "custom-code", icon: "📊", status: "live" },
    { id: "F-117", name: "Code Linter", description: "Detect common JavaScript/HTML errors.", location: "dashboard", tab: "custom-code", icon: "🔍", status: "live" },
    { id: "F-118", name: "Developer API", description: "Manage API keys and extend the platform via APIs.", location: "dashboard", tab: "developer-api", icon: "🔑", status: "live" },
    { id: "F-119", name: "Plugin Compatibility", description: "Verify and enable WP plugin integrations.", location: "dashboard", tab: "plugin-hub", icon: "🔌", status: "live" },
    { id: "F-120", name: "Third-Party Plugins", description: "Broad third-party plugin compatibility management.", location: "dashboard", tab: "plugin-hub", icon: "🧩", status: "live" },
    { id: "F-121", name: "Custom Post Types", description: "Enable the builder for selected custom content types.", location: "dashboard", tab: "cpts", icon: "📦", status: "live" },
    { id: "F-122", name: "Composer Installation", description: "Manage PHP packages via Composer.", location: "dashboard", tab: "composer-installation", icon: "📦", status: "live" },
];

const ICON_COLORS: Record<string, string> = {
    editor: "bg-indigo-50 text-indigo-600 border-indigo-100",
    dashboard: "bg-emerald-50 text-emerald-600 border-emerald-100",
};

export default function DeveloperFeaturesOverview() {
    const navigate = useNavigate();
    const [websites, setWebsites] = useState<any[]>([]);

    // Fetch websites so we can smart-route to the editor
    useEffect(() => {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
        fetch(`${apiUrl}/api/websites`, { credentials: "include" })
            .then(r => r.json())
            .then(d => {
                if (d.websites) setWebsites(d.websites);
            })
            .catch(() => { });
    }, []);

    const handleFeatureClick = (f: FeatureDef) => {
        if (f.location === "dashboard" && f.tab) {
            navigate(`/dashboard?tab=${f.tab}`);
        } else if (f.location === "editor") {
            // Smart routing: if they only have 1 website, just launch them straight into the editor!
            if (websites.length === 1) {
                navigate(`/editor/${websites[0].id}`);
            } else if (websites.length > 1) {
                alert("Please select a website from the 'My Websites' tab to access this feature in its editor.");
                navigate("/dashboard?tab=websites");
            } else {
                alert("Create a website first to access this feature.");
                navigate("/dashboard?tab=websites");
            }
        }
    };

    const editorFeatures = FEATURES.filter(f => f.location === "editor");
    const dashboardFeatures = FEATURES.filter(f => f.location === "dashboard");

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-bold text-slate-900">Developer Features Hub</h2>
                <p className="text-sm text-slate-500 mt-1">All F-102 through F-122 CSS & developer controls — click any feature to open it.</p>
                <div className="flex gap-3 mt-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
                        ✓ {FEATURES.length} Features Active
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-700">
                        🖊 {editorFeatures.length} Editor Controls
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600">
                        ⚙ {dashboardFeatures.length} Dashboard Panels
                    </div>
                </div>
            </div>

            {/* Editor-side features */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-2">Editor Controls (access inside the page builder)</span>
                    <div className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {editorFeatures.map(f => (
                        <div
                            key={f.id}
                            onClick={() => handleFeatureClick(f)}
                            className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all"
                        >
                            <div className="flex items-start gap-3">
                                <div className={`shrink-0 h-9 w-9 rounded-xl border flex items-center justify-center text-sm font-black ${ICON_COLORS.editor}`}>
                                    {f.icon}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-extrabold text-slate-400">{f.id}</span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Live" />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-700 transition-colors">{f.name}</h3>
                                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{f.description}</p>
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Open in Editor →</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Dashboard-side features */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-2">Dashboard Panels (manage below)</span>
                    <div className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {dashboardFeatures.map(f => (
                        <div
                            key={f.id}
                            onClick={() => handleFeatureClick(f)}
                            className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all"
                        >
                            <div className="flex items-start gap-3">
                                <div className={`shrink-0 h-9 w-9 rounded-xl border flex items-center justify-center text-sm font-black ${ICON_COLORS.dashboard}`}>
                                    {f.icon}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-extrabold text-slate-400">{f.id}</span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Live" />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">{f.name}</h3>
                                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{f.description}</p>
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-100">
                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Open Panel →</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
