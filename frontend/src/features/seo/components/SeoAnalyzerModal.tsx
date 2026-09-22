import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  Sparkles,
  Search,
  Share2,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  Smartphone,
  Monitor,
  Copy,
  Check,
  Code2,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import {
  analyzePageSeoClient,
  auditPageImagesClient,
  auditPageA11yClient,
  generateStructuredDataClient,
  type SeoAuditResult,
  type ImageAuditResult,
  type A11yAuditResult,
} from "../services/seoAuditService";

interface SeoAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  websiteId: string;
  activePage: any;
  allPages: any[];
  websiteData: any;
  onSelectElement?: (elementId: string) => void;
  onUpdateElementProp?: (elementId: string, propKey: string, propValue: any) => void;
  onUpdatePageSettings?: (updater: (prev: any) => any) => void;
}

type TabType = "overview" | "serp" | "social" | "images" | "a11y" | "schema";

export const SeoAnalyzerModal: React.FC<SeoAnalyzerModalProps> = ({
  isOpen,
  onClose,
  activePage,
  allPages: _allPages,
  websiteData,
  onSelectElement,
  onUpdateElementProp,
  onUpdatePageSettings,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [issueFilter, setIssueFilter] = useState<"all" | "critical" | "warning" | "passed">("all");
  const [serpDevice, setSerpDevice] = useState<"desktop" | "mobile">("desktop");
  const [socialPlatform, setSocialPlatform] = useState<"facebook" | "twitter">("twitter");
  const [schemaType, setSchemaType] = useState<string>("WebPage");
  const [schemaCopied, setSchemaCopied] = useState<boolean>(false);
  const [inPlaceAltTexts, setInPlaceAltTexts] = useState<Record<string, string>>({});
  const [savedAltSuccess, setSavedAltSuccess] = useState<Record<string, boolean>>({});

  // Real-time audits
  const seoResult: SeoAuditResult = useMemo(() => {
    if (!activePage) {
      return {
        score: 0,
        grade: "F",
        critical: [],
        warnings: [],
        passed: [],
        stats: { headingCount: 0, wordCount: 0, imageCount: 0, linkCount: 0, h1Count: 0 },
      };
    }
    return analyzePageSeoClient(activePage, websiteData);
  }, [activePage, websiteData]);

  const imageResult: ImageAuditResult = useMemo(() => {
    if (!activePage) return { total: 0, valid: 0, missing: 0, empty: 0, generic: 0, items: [] };
    return auditPageImagesClient(activePage.elements || [], activePage.id);
  }, [activePage]);

  const a11yResult: A11yAuditResult = useMemo(() => {
    if (!activePage) return { complianceScore: 100, violations: [], passedChecks: [] };
    return auditPageA11yClient(activePage, websiteData);
  }, [activePage, websiteData]);

  // Sync initial alt texts
  useEffect(() => {
    if (imageResult.items.length > 0) {
      const initial: Record<string, string> = {};
      imageResult.items.forEach((item) => {
        initial[item.elementId] = item.alt || "";
      });
      setInPlaceAltTexts(initial);
    }
  }, [imageResult]);

  if (!isOpen) return null;

  const pSettings = activePage?.pageSettings || {};
  const siteSettings = websiteData?.siteSettings || {};
  const pageTitle = pSettings.title || activePage?.title || activePage?.name || "Untitled Page";
  const siteName = siteSettings.siteName || websiteData?.name || "ForgeStudio";
  const metaDesc = pSettings.description || pageTitle;
  const canonicalUrl = pSettings.canonicalUrl || `https://example.com/${activePage?.slug || ""}`;
  const ogImg = pSettings.ogImage || siteSettings.ogImage || "";

  const handleAltChange = (elementId: string, val: string) => {
    setInPlaceAltTexts((prev) => ({ ...prev, [elementId]: val }));
  };

  const handleSaveAlt = (elementId: string) => {
    const text = inPlaceAltTexts[elementId] ?? "";
    if (onUpdateElementProp) {
      onUpdateElementProp(elementId, "alt", text);
    }
    setSavedAltSuccess((prev) => ({ ...prev, [elementId]: true }));
    setTimeout(() => {
      setSavedAltSuccess((prev) => ({ ...prev, [elementId]: false }));
    }, 2000);
  };

  const handleToggleDecorative = (elementId: string, currentVal: boolean) => {
    if (onUpdateElementProp) {
      onUpdateElementProp(elementId, "ariaHidden", !currentVal);
    }
  };

  // Structured data generation
  const generatedSchema = generateStructuredDataClient(schemaType, activePage, websiteData);
  const schemaJsonStr = JSON.stringify(generatedSchema, null, 2);

  const handleCopySchema = () => {
    navigator.clipboard.writeText(schemaJsonStr);
    setSchemaCopied(true);
    setTimeout(() => setSchemaCopied(false), 2000);
  };

  const handleApplySchemaToSettings = () => {
    if (onUpdatePageSettings) {
      onUpdatePageSettings((prev: any) => ({
        ...prev,
        schemaType,
        structuredData: generatedSchema,
      }));
    }
  };

  // Score color helper
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-500 stroke-emerald-500 bg-emerald-500/10 border-emerald-500/30";
    if (score >= 80) return "text-blue-500 stroke-blue-500 bg-blue-500/10 border-blue-500/30";
    if (score >= 70) return "text-amber-500 stroke-amber-500 bg-amber-500/10 border-amber-500/30";
    return "text-rose-500 stroke-rose-500 bg-rose-500/10 border-rose-500/30";
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="seo-audit-title"
    >
      <div className="relative w-full max-w-5xl h-[88vh] flex flex-col bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="seo-audit-title" className="text-base font-bold text-white tracking-tight">
                  SEO & Quality Audit
                </h2>
                <span className="text-[10px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">
                  Real-Time
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Evaluating <span className="text-slate-200 font-medium">{activePage?.name || "Active Page"}</span> across SEO, Accessibility & Structured Data
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Audit Modal"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-2 px-6 border-b border-slate-800 bg-slate-900/50 text-xs font-semibold overflow-x-auto shrink-0 py-2">
          {[
            { id: "overview", label: "Overview & Score", icon: Sparkles, count: seoResult.critical.length },
            { id: "serp", label: "Google SERP Preview", icon: Search },
            { id: "social", label: "Social Card Previews", icon: Share2 },
            { id: "images", label: "Alt Text Audit", icon: ImageIcon, count: imageResult.missing + imageResult.empty },
            { id: "a11y", label: "Accessibility (WCAG)", icon: ShieldCheck, count: a11yResult.violations.length },
            { id: "schema", label: "Structured Data (Schema)", icon: Code2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      isActive ? "bg-white/20 text-white" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/50 space-y-6">
          {/* TAB 1: OVERVIEW & SCORE */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Score Hero Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="col-span-1 p-6 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col items-center justify-center text-center relative overflow-hidden">
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        className="stroke-slate-800"
                        strokeWidth="10"
                        fill="transparent"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        className={`${getScoreColor(seoResult.score).split(" ")[1]} transition-all duration-1000 ease-out`}
                        strokeWidth="10"
                        strokeDasharray={314}
                        strokeDashoffset={314 - (314 * seoResult.score) / 100}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-4xl font-extrabold text-white tracking-tight">{seoResult.score}</span>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Score</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${getScoreColor(
                        seoResult.score
                      )}`}
                    >
                      Grade {seoResult.grade} — {seoResult.score >= 80 ? "Well Optimized" : "Optimization Required"}
                    </span>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 flex flex-col justify-between">
                    <span className="text-xs text-slate-400 font-medium">H1 Headings</span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-bold text-white">{seoResult.stats.h1Count}</span>
                      <span className={`text-[10px] font-semibold ${seoResult.stats.h1Count === 1 ? "text-emerald-400" : "text-rose-400"}`}>
                        {seoResult.stats.h1Count === 1 ? "Optimal" : "Requires 1"}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 flex flex-col justify-between">
                    <span className="text-xs text-slate-400 font-medium">Word Count</span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-bold text-white">{seoResult.stats.wordCount}</span>
                      <span className="text-[10px] font-semibold text-slate-400">words</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 flex flex-col justify-between">
                    <span className="text-xs text-slate-400 font-medium">Images Scanned</span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-bold text-white">{imageResult.total}</span>
                      <span className={`text-[10px] font-semibold ${imageResult.missing === 0 ? "text-emerald-400" : "text-amber-400"}`}>
                        {imageResult.missing} missing alt
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 flex flex-col justify-between">
                    <span className="text-xs text-slate-400 font-medium">WCAG Compliance</span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-bold text-white">{a11yResult.complianceScore}%</span>
                      <span className={`text-[10px] font-semibold ${a11yResult.complianceScore >= 90 ? "text-emerald-400" : "text-rose-400"}`}>
                        {a11yResult.violations.length} issues
                      </span>
                    </div>
                  </div>

                  {/* Summary Bar */}
                  <div className="col-span-2 sm:col-span-4 p-4 rounded-xl border border-slate-800 bg-slate-900/30 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                        <span className="text-slate-400">Critical:</span>
                        <span className="font-bold text-white">{seoResult.critical.length}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                        <span className="text-slate-400">Warnings:</span>
                        <span className="font-bold text-white">{seoResult.warnings.length}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        <span className="text-slate-400">Passed:</span>
                        <span className="font-bold text-white">{seoResult.passed.length}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {(["all", "critical", "warning", "passed"] as const).map((filter) => (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setIssueFilter(filter)}
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition capitalize cursor-pointer ${
                            issueFilter === filter
                              ? "bg-slate-700 text-white"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actionable Findings List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Detailed Findings & Recommendations
                </h3>

                {/* Critical Errors */}
                {(issueFilter === "all" || issueFilter === "critical") &&
                  seoResult.critical.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 flex items-start justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-rose-300">{item.title}</span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300">
                              Critical -{item.penalty} pts
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1">{item.description}</p>
                          <p className="text-xs text-rose-300/90 mt-1 font-medium">
                            💡 Recommendation: {item.recommendation}
                          </p>
                        </div>
                      </div>

                      {item.elementId && onSelectElement && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectElement(item.elementId!);
                            onClose();
                          }}
                          className="shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Jump to Element</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}

                {/* Warnings */}
                {(issueFilter === "all" || issueFilter === "warning") &&
                  seoResult.warnings.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-start justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-amber-300">{item.title}</span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                              Warning -{item.penalty} pts
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1">{item.description}</p>
                          <p className="text-xs text-amber-300/90 mt-1 font-medium">
                            💡 Recommendation: {item.recommendation}
                          </p>
                        </div>
                      </div>

                      {item.elementId && onSelectElement && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectElement(item.elementId!);
                            onClose();
                          }}
                          className="shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Jump to Element</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}

                {/* Passed Checks */}
                {(issueFilter === "all" || issueFilter === "passed") &&
                  seoResult.passed.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-start gap-3"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-bold text-emerald-300">{item.title}</span>
                        <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 2: SERP PREVIEW */}
          {activeTab === "serp" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Google SERP Snippet Preview</h3>
                  <p className="text-xs text-slate-400">
                    Real-time desktop and mobile simulation of search result appearance.
                  </p>
                </div>
                <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setSerpDevice("desktop")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                      serpDevice === "desktop" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Desktop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSerpDevice("mobile")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                      serpDevice === "mobile" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Mobile</span>
                  </button>
                </div>
              </div>

              {/* SERP Card Box */}
              <div className="p-6 rounded-2xl border border-slate-800 bg-white text-slate-900 shadow-xl max-w-2xl mx-auto">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-[12px] text-slate-600">
                    <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-blue-600 border border-slate-200">
                      FS
                    </span>
                    <span className="font-medium text-slate-800">{siteName}</span>
                    <span className="text-slate-400">›</span>
                    <span className="truncate max-w-[280px] font-mono text-[11px] text-slate-500">
                      {canonicalUrl}
                    </span>
                  </div>

                  <h4 className="text-lg font-medium text-[#1a0dab] hover:underline cursor-pointer leading-snug line-clamp-1">
                    {pageTitle} | {siteName}
                  </h4>

                  <p className="text-xs text-[#4d5156] leading-relaxed line-clamp-2">
                    {metaDesc || "No meta description provided. Google will display arbitrary text from your page."}
                  </p>
                </div>
              </div>

              {/* Character Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-300">Title Length</span>
                    <span className={`font-mono font-bold ${pageTitle.length >= 30 && pageTitle.length <= 65 ? "text-emerald-400" : "text-amber-400"}`}>
                      {pageTitle.length} / 65 characters
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        pageTitle.length >= 30 && pageTitle.length <= 65 ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${Math.min(100, (pageTitle.length / 65) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-300">Meta Description Length</span>
                    <span className={`font-mono font-bold ${metaDesc.length >= 50 && metaDesc.length <= 165 ? "text-emerald-400" : "text-amber-400"}`}>
                      {metaDesc.length} / 165 characters
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        metaDesc.length >= 50 && metaDesc.length <= 165 ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${Math.min(100, (metaDesc.length / 165) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SOCIAL CARD PREVIEWS */}
          {activeTab === "social" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Social Graph Card Previews</h3>
                  <p className="text-xs text-slate-400">
                    Preview how your link will render when shared on Twitter/X, Facebook, and LinkedIn.
                  </p>
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setSocialPlatform("twitter")}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                      socialPlatform === "twitter" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Twitter / X Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setSocialPlatform("facebook")}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                      socialPlatform === "facebook" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    OpenGraph (Facebook & LinkedIn)
                  </button>
                </div>
              </div>

              {/* Social Card */}
              <div className="max-w-xl mx-auto rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-2xl">
                {ogImg ? (
                  <div className="w-full aspect-[1.91/1] bg-slate-800 overflow-hidden relative">
                    <img src={ogImg} alt="Social Share Preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-full aspect-[1.91/1] bg-slate-800 flex flex-col items-center justify-center text-slate-500 p-6 text-center border-b border-slate-800">
                    <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                    <span className="text-xs font-medium">No Social Share Image (og:image) Configured</span>
                    <span className="text-[10px] text-slate-600 mt-1">Recommended size: 1200 × 630 px</span>
                  </div>
                )}

                <div className="p-4 space-y-1 bg-slate-900 border-t border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {new URL(canonicalUrl || "https://forgestudio.io").hostname}
                  </span>
                  <h4 className="text-sm font-bold text-white line-clamp-1">{pSettings.ogTitle || pageTitle}</h4>
                  <p className="text-xs text-slate-400 line-clamp-2">{pSettings.ogDescription || metaDesc}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: IMAGE ALT TEXT AUDIT */}
          {activeTab === "images" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Image Alternative Text Audit</h3>
                  <p className="text-xs text-slate-400">
                    Scan all images across the page. Edit missing or generic descriptions in-place without leaving the audit.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-400">
                    Total: <strong className="text-white">{imageResult.total}</strong>
                  </span>
                  <span className="text-xs font-semibold text-emerald-400">
                    Valid: <strong>{imageResult.valid}</strong>
                  </span>
                  <span className="text-xs font-semibold text-rose-400">
                    Issues: <strong>{imageResult.missing + imageResult.empty + imageResult.generic}</strong>
                  </span>
                </div>
              </div>

              {imageResult.items.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-slate-800 bg-slate-900/30 text-slate-400 text-xs">
                  No image elements detected on this page.
                </div>
              ) : (
                <div className="space-y-3">
                  {imageResult.items.map((img) => {
                    const currentAlt = inPlaceAltTexts[img.elementId] ?? img.alt;
                    const isSaved = savedAltSuccess[img.elementId];

                    return (
                      <div
                        key={img.elementId}
                        className={`p-4 rounded-xl border transition-all ${
                          img.issueType === "valid"
                            ? "border-slate-800 bg-slate-900/30"
                            : "border-amber-500/30 bg-amber-500/5"
                        } flex flex-col md:flex-row md:items-center gap-4`}
                      >
                        {/* Thumbnail */}
                        <div className="w-16 h-16 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                          {img.src ? (
                            <img src={img.src} alt="Thumbnail" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-slate-600" />
                          )}
                        </div>

                        {/* Details and Inputs */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{img.elementName}</span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                  img.issueType === "valid"
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : img.issueType === "generic"
                                    ? "bg-amber-500/20 text-amber-300"
                                    : "bg-rose-500/20 text-rose-300"
                                }`}
                              >
                                {img.issueType === "valid" ? "Passed" : `Issue: ${img.issueType}`}
                              </span>
                            </div>

                            {onSelectElement && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectElement(img.elementId);
                                  onClose();
                                }}
                                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold cursor-pointer"
                              >
                                <span>Inspect on Canvas</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={currentAlt}
                              onChange={(e) => handleAltChange(img.elementId, e.target.value)}
                              placeholder="Describe this image for screen readers and SEO..."
                              className="flex-1 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-blue-500 font-medium"
                            />

                            <button
                              type="button"
                              onClick={() => handleSaveAlt(img.elementId)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                                isSaved
                                  ? "bg-emerald-600 text-white"
                                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
                              }`}
                            >
                              {isSaved ? <Check className="w-3.5 h-3.5" /> : null}
                              <span>{isSaved ? "Saved" : "Save"}</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-400">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={img.isDecorative}
                                onChange={() => handleToggleDecorative(img.elementId, img.isDecorative)}
                                className="h-3.5 w-3.5 rounded border-slate-700 text-blue-600"
                              />
                              <span>Mark as Decorative (aria-hidden)</span>
                            </label>
                            <span>•</span>
                            <span className="truncate">{img.recommendation}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ACCESSIBILITY (WCAG) */}
          {activeTab === "a11y" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">WCAG 2.1 Accessibility Audit</h3>
                  <p className="text-xs text-slate-400">
                    Programmatic compliance verification across Level A and Level AA criteria.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">Compliance Score:</span>
                  <span
                    className={`text-sm font-extrabold px-2.5 py-1 rounded-lg border ${
                      a11yResult.complianceScore >= 90
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                    }`}
                  >
                    {a11yResult.complianceScore} / 100
                  </span>
                </div>
              </div>

              {/* Violations List */}
              <div className="space-y-3">
                {a11yResult.violations.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-sm font-bold text-emerald-300">
                        Zero Programmatic Accessibility Violations
                      </span>
                      <p className="text-xs text-slate-400 mt-0.5">
                        All scanned buttons, inputs, links, headings, and images satisfy programmatic WCAG 2.1 Level A/AA rules.
                      </p>
                    </div>
                  </div>
                ) : (
                  a11yResult.violations.map((violation) => (
                    <div
                      key={violation.id}
                      className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 flex items-start justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-rose-300">{violation.rule}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 uppercase">
                              Level {violation.level}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1">{violation.message}</p>
                          <p className="text-xs text-rose-300/90 mt-1 font-medium">
                            💡 Fix: {violation.recommendation}
                          </p>
                        </div>
                      </div>

                      {violation.elementId && onSelectElement && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectElement(violation.elementId!);
                            onClose();
                          }}
                          className="shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Jump to Element</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}

                {/* Passed A11y Checks */}
                {a11yResult.passedChecks.length > 0 && (
                  <div className="pt-3 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Passed Verification Criteria
                    </span>
                    {a11yResult.passedChecks.map((passedMsg, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-slate-800 bg-slate-900/30 flex items-center gap-2.5 text-xs text-slate-300"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{passedMsg}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: STRUCTURED DATA (SCHEMA.ORG) */}
          {activeTab === "schema" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Schema.org JSON-LD Structured Data</h3>
                  <p className="text-xs text-slate-400">
                    Rich snippets markup automatically injected into static bundle & published runtime &lt;head&gt;.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={schemaType}
                    onChange={(e) => setSchemaType(e.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="WebPage">WebPage (General)</option>
                    <option value="WebSite">WebSite (Search Action)</option>
                    <option value="Organization">Organization (Brand / Company)</option>
                    <option value="Article">Article (Blog / News)</option>
                    <option value="LocalBusiness">LocalBusiness (Physical Store / Service)</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleApplySchemaToSettings}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition shadow-sm cursor-pointer"
                  >
                    Save to Page Settings
                  </button>
                </div>
              </div>

              {/* JSON-LD Code Box */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-900/80">
                  <span className="text-xs font-mono font-semibold text-slate-400">
                    &lt;script type="application/ld+json"&gt;
                  </span>

                  <button
                    type="button"
                    onClick={handleCopySchema}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {schemaCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{schemaCopied ? "Copied!" : "Copy JSON-LD"}</span>
                  </button>
                </div>

                <pre className="p-4 text-xs font-mono text-blue-300 overflow-x-auto max-h-96 leading-relaxed">
                  {schemaJsonStr}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <footer className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-900 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
            <span>Auditing live canvas in real-time</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            Done
          </button>
        </footer>
      </div>
    </div>
  );
};
