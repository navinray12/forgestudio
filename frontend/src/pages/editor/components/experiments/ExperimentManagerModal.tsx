import React, { useState, useEffect } from "react";
import {
  X,
  Split,
  Plus,
  Play,
  Pause,
  Trophy,
  Trash2,
  TrendingUp,
  Target,
  RefreshCw,
  Sparkles,
  BarChart3,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import type {
  Experiment,
  ExperimentTargetType,
  ExperimentGoalAction,
} from "../../../../types/experiment.types.js";

interface ExperimentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  websiteId: string;
}

export const ExperimentManagerModal: React.FC<ExperimentManagerModalProps> = ({
  isOpen,
  onClose,
  websiteId,
}) => {
  const [experiments, setExperiments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // New Experiment Form State
  const [newTitle, setNewTitle] = useState("");
  const [newTargetType, setNewTargetType] = useState<ExperimentTargetType>("POPUP");
  const [newGoalAction, setNewGoalAction] = useState<ExperimentGoalAction>("FORM_SUBMIT");
  const [variantAName, setVariantAName] = useState("Original (Control)");
  const [variantBName, setVariantBName] = useState("Variant B (Challenger)");
  const [splitRatio, setSplitRatio] = useState(50); // Variant A percentage

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const fetchExperiments = async () => {
    if (!websiteId) return;
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiUrl}/api/websites/${websiteId}/experiments`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setExperiments(data.data || []);
      }
    } catch (err) {
      console.warn("Failed to fetch experiments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchExperiments();
    }
  }, [isOpen, websiteId]);

  if (!isOpen) return null;

  const handleCreateExperiment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setActionLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiUrl}/api/websites/${websiteId}/experiments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          title: newTitle.trim(),
          targetType: newTargetType,
          goalAction: newGoalAction,
          status: "RUNNING",
          variants: [
            {
              id: "control",
              name: variantAName,
              trafficAllocation: splitRatio,
              targetEntityId: "entity_control",
              impressions: 0,
              conversions: 0,
            },
            {
              id: "variant_b",
              name: variantBName,
              trafficAllocation: 100 - splitRatio,
              targetEntityId: "entity_variant_b",
              impressions: 0,
              conversions: 0,
            },
          ],
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: "success", message: `A/B Experiment "${newTitle}" created and running!` });
        setShowCreateForm(false);
        setNewTitle("");
        fetchExperiments();
      } else {
        setFeedback({ type: "error", message: data.message || "Failed to create experiment." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Error creating experiment." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (exp: any) => {
    const nextStatus = exp.status === "RUNNING" ? "PAUSED" : "RUNNING";
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiUrl}/api/websites/${websiteId}/experiments/${exp.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        fetchExperiments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConcludeWinner = async (exp: any, winningVariantId: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiUrl}/api/websites/${websiteId}/experiments/${exp.id}/conclude`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ winningVariantId }),
      });
      if (res.ok) {
        setFeedback({ type: "success", message: "Variant declared winner! Experiment concluded." });
        fetchExperiments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (expId: string) => {
    if (!confirm("Are you sure you want to delete this experiment?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiUrl}/api/websites/${websiteId}/experiments/${expId}`, {
        method: "DELETE",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: "include",
      });
      if (res.ok) {
        fetchExperiments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Split className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                A/B Split Testing & Conversion Experiments
              </h2>
              <p className="text-xs text-slate-400">
                Test variants of hero sections and popups to maximize visitor conversion rates.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showCreateForm ? "Cancel" : "New Experiment"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 rounded-xl mb-4 text-xs font-medium flex items-center justify-between ${
              feedback.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border border-red-500/20 text-red-400"
            }`}
          >
            <span>{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white ml-2">
              ×
            </button>
          </div>
        )}

        {/* Modal Body / Scroll Area */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* Create Experiment Drawer */}
          {showCreateForm && (
            <form
              onSubmit={handleCreateExperiment}
              className="rounded-2xl border border-purple-500/30 bg-purple-950/10 p-5 space-y-4"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Configure New Split Test
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-300 block mb-1">Experiment Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hero Headline Test - Urgency vs Value"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Target Element</label>
                  <select
                    value={newTargetType}
                    onChange={(e) => setNewTargetType(e.target.value as ExperimentTargetType)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-purple-500"
                  >
                    <option value="POPUP">Popup Modal</option>
                    <option value="SECTION">Page Section / Hero</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Variant A (Control)</label>
                  <input
                    type="text"
                    value={variantAName}
                    onChange={(e) => setVariantAName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Variant B (Challenger)</label>
                  <input
                    type="text"
                    value={variantBName}
                    onChange={(e) => setVariantBName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Conversion Goal</label>
                  <select
                    value={newGoalAction}
                    onChange={(e) => setNewGoalAction(e.target.value as ExperimentGoalAction)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-purple-500"
                  >
                    <option value="FORM_SUBMIT">Form Submission</option>
                    <option value="CLICK">CTA Button Click</option>
                    <option value="LINK_REDIRECT">Link Redirect</option>
                  </select>
                </div>
              </div>

              {/* Traffic Split Slider */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-purple-300">Variant A Traffic: {splitRatio}%</span>
                  <span className="text-emerald-300">Variant B Traffic: {100 - splitRatio}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={90}
                  step={5}
                  value={splitRatio}
                  onChange={(e) => setSplitRatio(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20 transition"
                >
                  {actionLoading ? "Launching..." : "Launch Experiment"}
                </button>
              </div>
            </form>
          )}

          {/* Experiments List */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
              <span className="text-xs">Loading experiments...</span>
            </div>
          ) : experiments.length === 0 ? (
            <div className="py-12 text-center rounded-2xl border border-slate-800/80 bg-slate-900/30 p-8 space-y-3">
              <BarChart3 className="w-8 h-8 text-slate-600 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-300">No active experiments found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Create an A/B split test to compare variant designs and measure which produces more form leads or clicks.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {experiments.map((exp) => (
                <div
                  key={exp.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 transition hover:border-slate-700"
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          exp.status === "RUNNING"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : exp.status === "PAUSED"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : exp.status === "CONCLUDED"
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        {exp.status}
                      </span>
                      <h4 className="text-sm font-bold text-white">{exp.title}</h4>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Target: {exp.targetType} • Goal: {exp.goalAction}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {exp.status !== "CONCLUDED" && (
                        <button
                          onClick={() => handleToggleStatus(exp)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                          title={exp.status === "RUNNING" ? "Pause test" : "Resume test"}
                        >
                          {exp.status === "RUNNING" ? (
                            <>
                              <Pause className="w-3.5 h-3.5 text-amber-400" />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Start</span>
                            </>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                        title="Delete test"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Variants Performance Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {exp.variants.map((v: any) => {
                      const isWinner = exp.winningVariantId === v.id;
                      return (
                        <div
                          key={v.id}
                          className={`rounded-xl p-4 border transition ${
                            isWinner
                              ? "bg-purple-950/20 border-purple-500/40 ring-1 ring-purple-500/40"
                              : "bg-slate-800/40 border-slate-800"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              {v.name}
                              {isWinner && (
                                <span className="flex items-center gap-1 text-[10px] bg-purple-500 text-white font-bold px-1.5 py-0.5 rounded-full">
                                  <Trophy className="w-3 h-3" /> Winner
                                </span>
                              )}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              {v.trafficAllocation}% traffic
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between mt-3">
                            <div>
                              <div className="text-2xl font-extrabold text-white">
                                {v.conversionRate}%
                              </div>
                              <span className="text-[10px] text-slate-400">Conversion Rate</span>
                            </div>
                            <div className="text-right text-xs text-slate-400 space-y-0.5 font-mono">
                              <div>{v.conversions || 0} conversions</div>
                              <div>{v.impressions || 0} impressions</div>
                            </div>
                          </div>

                          {exp.status === "RUNNING" && !exp.winningVariantId && (
                            <button
                              onClick={() => handleConcludeWinner(exp, v.id)}
                              className="w-full mt-3 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-800 hover:bg-purple-600/30 hover:border-purple-500/40 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition"
                            >
                              <Trophy className="w-3.5 h-3.5 text-amber-400" />
                              <span>Declare as Winner</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
