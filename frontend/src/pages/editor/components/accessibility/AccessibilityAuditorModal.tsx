import React, { useState } from "react";
import { AccessibilityService } from "../../services/AccessibilityService";
import type { CanonicalWebsiteData, AccessibilityScanResult } from "../../types";

export const AccessibilityAuditorModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  websiteData?: CanonicalWebsiteData | null;
}> = ({ isOpen, onClose, websiteData }) => {
  const [activeTab, setActiveTab] = useState<"audit" | "rescan" | "statement">("audit");
  const [scanResult, setScanResult] = useState<AccessibilityScanResult>(() =>
    AccessibilityService.runAccessibilityScan(websiteData)
  );
  const [targetUrl, setTargetUrl] = useState("/");
  const [isScanning, setIsScanning] = useState(false);

  // F-373 Statement Generator state
  const [orgName, setOrgName] = useState("ForgeStudio Digital");
  const [contactEmail, setContactEmail] = useState("accessibility@forgestudio.com");
  const [contactPhone, setContactPhone] = useState("+1 (800) 555-0199");
  const [generatedStatement, setGeneratedStatement] = useState("");

  if (!isOpen) return null;

  const handleRunScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const res = AccessibilityService.runAccessibilityScan(websiteData, targetUrl);
      setScanResult(res);
      setIsScanning(false);
    }, 400);
  };

  const handleGenerateStatement = () => {
    const text = AccessibilityService.generateAccessibilityStatement({
      siteName: websiteData?.siteSettings?.siteName || "ForgeStudio Site",
      organizationName: orgName,
      contactEmail,
      contactPhone
    });
    setGeneratedStatement(text);
  };

  const history = AccessibilityService.getScanHistory();

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-lg shadow-sm">
              ♿
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Accessibility & Compliance Auditor</h2>
              <p className="text-xs text-slate-500 font-medium">WCAG 2.1 AA Verification Tools</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-6 text-sm font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className={`py-3.5 border-b-2 transition ${activeTab === "audit"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
          >
            Audit Scanner & Issues ({scanResult.errorCount + scanResult.warningCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rescan")}
            className={`py-3.5 border-b-2 transition ${activeTab === "rescan"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
          >
            URL Rescanning & History
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("statement")}
            className={`py-3.5 border-b-2 transition ${activeTab === "statement"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
          >
            Accessibility Statement Generator
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: AUDIT SCANNER */}
          {activeTab === "audit" && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Errors</span>
                    <h3 className="text-2xl font-black text-rose-900">{scanResult.errorCount}</h3>
                  </div>
                  <span className="text-2xl">❌</span>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Warnings</span>
                    <h3 className="text-2xl font-black text-amber-900">{scanResult.warningCount}</h3>
                  </div>
                  <span className="text-2xl">⚠️</span>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Passed Checks</span>
                    <h3 className="text-2xl font-black text-emerald-900">{scanResult.passedCount}</h3>
                  </div>
                  <span className="text-2xl">✅</span>
                </div>
              </div>

              {/* Issue List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900">Detected Accessibility Issues</h3>
                  <button
                    type="button"
                    onClick={handleRunScan}
                    disabled={isScanning}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition flex items-center gap-2 cursor-pointer"
                  >
                    <span>🔄</span>
                    <span>{isScanning ? "Scanning..." : "Re-run Audit"}</span>
                  </button>
                </div>

                {scanResult.issues.length === 0 ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center text-emerald-800 space-y-2">
                    <span className="text-4xl">🎉</span>
                    <h4 className="text-base font-black">No Accessibility Issues Detected!</h4>
                    <p className="text-xs">Your site adheres to semantic HTML5, valid heading structures, and accessible tags.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {scanResult.issues.map((issue) => (
                      <div
                        key={issue.id}
                        className={`rounded-2xl border p-4 space-y-2 transition ${issue.severity === "error"
                          ? "border-rose-200 bg-rose-50/50"
                          : "border-amber-200 bg-amber-50/50"
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base">
                              {issue.severity === "error" ? "❌" : "⚠️"}
                            </span>
                            <span className="text-xs font-black uppercase tracking-wide px-2 py-0.5 rounded bg-white border text-slate-800">
                              {issue.rule}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900">{issue.title}</h4>
                          </div>
                          {issue.elementId && (
                            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                              Element ID: {issue.elementId}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600">{issue.description}</p>
                        <div className="rounded-xl bg-white border border-slate-200 p-2.5 text-xs text-indigo-900 font-medium">
                          💡 <strong>Remediation:</strong> {issue.remediation}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: RESCANNING & HISTORY */}
          {activeTab === "rescan" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                <h3 className="text-base font-extrabold text-slate-900">Run Live URL Rescan</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="Enter target URL or path (e.g. /about)"
                    className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleRunScan}
                    disabled={isScanning}
                    className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 transition cursor-pointer"
                  >
                    {isScanning ? "Scanning..." : "Rescan Page"}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-extrabold text-slate-900">Scan History & Audit Logs</h3>
                {history.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No previous scan history recorded.</p>
                ) : (
                  <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white overflow-hidden">
                    {history.map((item, idx) => (
                      <div key={idx} className="p-4 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-900">{item.url}</span>
                          <span className="text-slate-400 ml-2">({new Date(item.timestamp).toLocaleString()})</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-rose-600 font-bold">{item.errorCount} Errors</span>
                          <span className="text-amber-600 font-bold">{item.warningCount} Warnings</span>
                          <span className="text-emerald-600 font-bold">{item.passedCount} Passed</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: STATEMENT GENERATOR */}
          {activeTab === "statement" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Organization Name</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateStatement}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 transition cursor-pointer shadow-md"
              >
                ✨ Generate Accessibility Compliance Statement
              </button>

              {generatedStatement && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900">Generated Statement Preview</h4>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(generatedStatement)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                    >
                      📋 Copy Markdown
                    </button>
                  </div>
                  <textarea
                    rows={10}
                    value={generatedStatement}
                    onChange={(e) => setGeneratedStatement(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 p-4 text-xs font-mono bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
