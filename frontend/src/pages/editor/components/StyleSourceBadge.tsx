import React from "react";
import { Sparkles, Layers, Box, Compass } from "lucide-react";

export type StyleSource = "local" | "class" | "token" | "default";

interface StyleSourceBadgeProps {
    source: StyleSource;
    detail?: string;
    className?: string;
}

export const StyleSourceBadge: React.FC<StyleSourceBadgeProps> = ({ source, detail, className = "" }) => {
    switch (source) {
        case "local":
            return (
                <span
                    className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 ${className}`}
                    title={detail ? `Local element override: ${detail}` : "Directly overridden on this element"}
                >
                    <Box className="w-2.5 h-2.5" />
                    Local
                </span>
            );
        case "class":
            return (
                <span
                    className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${className}`}
                    title={detail ? `Inherited from class: ${detail}` : "Applied via Global Class"}
                >
                    <Layers className="w-2.5 h-2.5" />
                    {detail ? `.${detail}` : "Class"}
                </span>
            );
        case "token":
            return (
                <span
                    className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 ${className}`}
                    title={detail ? `Design token: ${detail}` : "Bound to Design Token"}
                >
                    <Sparkles className="w-2.5 h-2.5" />
                    Token
                </span>
            );
        case "default":
        default:
            return (
                <span
                    className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20 ${className}`}
                    title="Inherited from theme defaults"
                >
                    <Compass className="w-2.5 h-2.5" />
                    Default
                </span>
            );
    }
};

export default StyleSourceBadge;
