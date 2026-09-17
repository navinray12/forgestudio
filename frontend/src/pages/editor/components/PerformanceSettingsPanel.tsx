

export interface PerformanceSettings {
    f351_flattenDom?: boolean;
    f352_lazyImages?: boolean;
    f353_minifyCss?: boolean;
    f354_minifyJs?: boolean;
    f355_deferScripts?: boolean;
    f356_fontDisplaySwap?: boolean;
    f357_criticalCss?: boolean;
    f358_elementCache?: boolean;
    f359_seoCompression?: boolean;
    f360_webpConversion?: boolean;
}

interface PerformanceSettingsPanelProps {
    settings: PerformanceSettings;
    onChange: (newSettings: PerformanceSettings) => void;
}

export default function PerformanceSettingsPanel({
    settings,
    onChange,
}: PerformanceSettingsPanelProps) {
    const toggle = (key: keyof PerformanceSettings) => {
        onChange({ ...settings, [key]: !settings[key] });
    };

    const OptionRow = ({
        label,
        desc,
        id,
        active,
        tag
    }: {
        label: string;
        desc: string;
        id: keyof PerformanceSettings;
        active: boolean;
        tag: string;
    }) => (
        <div
            onClick={() => toggle(id)}
            className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${active
                    ? "border-emerald-500 bg-emerald-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
        >
            <div className={`mt-0.5 shrink-0 w-8 h-5 rounded-full relative transition-colors ${active ? "bg-emerald-500" : "bg-slate-300"
                }`}>
                <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${active ? "translate-x-3" : "translate-x-0"
                    }`} />
            </div>
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold ${active ? "text-emerald-900" : "text-slate-700"}`}>
                        {label}
                    </span>
                    <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${active ? "bg-emerald-200 text-emerald-800" : "bg-slate-200 text-slate-500"
                        }`}>
                        {tag}
                    </span>
                </div>
                <p className={`text-[10px] leading-tight ${active ? "text-emerald-700" : "text-slate-500"}`}>
                    {desc}
                </p>
            </div>
        </div>
    );

    return (
        <div className="space-y-3 pt-1">
            <OptionRow
                label="Flatten Render DOM"
                desc="Removes purely decorative nesting layouts during the final static generation build."
                active={!!settings.f351_flattenDom}
                id="f351_flattenDom"
                tag="F-351"
            />
            <OptionRow
                label="Lazy Load Media"
                desc="Automatically injects loading='lazy' onto all below-the-fold canvas images and iframes."
                active={!!settings.f352_lazyImages}
                id="f352_lazyImages"
                tag="F-352"
            />
            <OptionRow
                label="Minify Page Styles"
                desc="Strips whitespace and comments out of the extracted CSS payload bounds."
                active={!!settings.f353_minifyCss}
                id="f353_minifyCss"
                tag="F-353"
            />
            <OptionRow
                label="Minify JS Outputs"
                desc="Compresses custom JS blocks using Acorn parsing routines prior to publish."
                active={!!settings.f354_minifyJs}
                id="f354_minifyJs"
                tag="F-354"
            />
            <OptionRow
                label="Defer Injected Scripts"
                desc="Forces non-blocking renders by deferring user-provided HEAD script evaluations."
                active={!!settings.f355_deferScripts}
                id="f355_deferScripts"
                tag="F-355"
            />
            <OptionRow
                label="Font Display Swap"
                desc="Prevents FOIT by rendering custom Google Fonts with display: swap architecture."
                active={!!settings.f356_fontDisplaySwap}
                id="f356_fontDisplaySwap"
                tag="F-356"
            />
            <OptionRow
                label="Auto Critical CSS"
                desc="Generates and inlines critical path styles into the page header strictly."
                active={!!settings.f357_criticalCss}
                id="f357_criticalCss"
                tag="F-357"
            />
            <OptionRow
                label="Component Memory Cache"
                desc="Dramatically speeds up Server Render speeds for repetitive component fragments."
                active={!!settings.f358_elementCache}
                id="f358_elementCache"
                tag="F-358"
            />
            <OptionRow
                label="Brotli SEO Compression"
                desc="Serves pre-compressed payloads to search engine web crawlers dynamically."
                active={!!settings.f359_seoCompression}
                id="f359_seoCompression"
                tag="F-359"
            />
            <OptionRow
                label="WebP Media Conversion"
                desc="Transforms primitive Image formats into lightweight modern formats seamlessly."
                active={!!settings.f360_webpConversion}
                id="f360_webpConversion"
                tag="F-360"
            />
        </div>
    );
}
