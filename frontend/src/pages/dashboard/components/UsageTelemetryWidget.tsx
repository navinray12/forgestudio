import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

interface UsageData {
  subscription: {
    status: string;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    plan: {
      id: string;
      name: string;
      slug: string;
      price: number;
      currency: string;
      billingInterval: string;
    };
  };
  quotas: {
    websites: {
      used: number;
      limit: number;
      remaining: number;
      percentage: number;
      isLimitReached: boolean;
    };
    storage: {
      usedBytes: number;
      usedMb: number;
      limitMb: number;
      remainingMb: number;
      percentage: number;
      isLimitReached: boolean;
    };
    aiCredits: {
      used: number;
      limit: number;
      remaining: number;
      percentage: number;
    };
    optimizationCredits: {
      remaining: number;
      ledgerTransactions: number;
    };
    licensing: {
      totalLicenses: number;
      activeLicenses: number;
      totalProductionSitesActivated: number;
      totalLocalhostSitesActivated: number;
    };
  };
}

interface Props {
  compact?: boolean;
}

export default function UsageTelemetryWidget({ compact = false }: Props) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/api/v1/users/me/usage`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data?.quotas) {
        setUsage(data);
      }
    } catch (err) {
      console.warn("[UsageTelemetryWidget] Error loading usage:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse">
        <div className="h-4 w-40 bg-slate-100 rounded mb-4" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="h-20 bg-slate-100 rounded-xl" />
          <div className="h-20 bg-slate-100 rounded-xl" />
          <div className="h-20 bg-slate-100 rounded-xl" />
          <div className="h-20 bg-slate-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!usage) return null;

  const { quotas, subscription } = usage;
  const isWebsitesWarning = quotas.websites.percentage >= 80;
  const isStorageWarning = quotas.storage.percentage >= 80;
  const isAnyApproaching = isWebsitesWarning || isStorageWarning;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <h3 className="text-base font-bold text-slate-900">
              Resource Usage & Quotas
            </h3>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
              {subscription.plan.name} Plan
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time telemetry across website slots, assets storage, and image optimization credits.
          </p>
        </div>

        {isAnyApproaching ? (
          <Link
            to="/subscriptions"
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-1.5 text-xs font-semibold shadow-sm transition"
          >
            <span>⚡ Approaching Limit • Upgrade Plan</span>
          </Link>
        ) : (
          <Link
            to="/subscriptions"
            className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3.5 py-1.5 text-xs font-semibold transition"
          >
            Manage Plan
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Website Quota Meter */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600">🌐 Website Slots</span>
            <span className="font-bold text-slate-900">
              {quotas.websites.used} / {quotas.websites.limit}
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                quotas.websites.percentage >= 90
                  ? "bg-red-500"
                  : quotas.websites.percentage >= 70
                  ? "bg-amber-500"
                  : "bg-blue-600"
              }`}
              style={{ width: `${Math.min(100, quotas.websites.percentage)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>{quotas.websites.remaining} slots available</span>
            <span>{quotas.websites.percentage}%</span>
          </div>
        </div>

        {/* 2. Storage Quota Meter */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600">💾 Storage Used</span>
            <span className="font-bold text-slate-900">
              {quotas.storage.usedMb} / {quotas.storage.limitMb} MB
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                quotas.storage.percentage >= 90
                  ? "bg-red-500"
                  : quotas.storage.percentage >= 70
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, quotas.storage.percentage)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>{quotas.storage.remainingMb} MB free</span>
            <span>{quotas.storage.percentage}%</span>
          </div>
        </div>

        {/* 3. Image Optimization Credits (F-433, F-434) */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600">🖼️ Image Opt. Credits</span>
            <span className="text-[10px] uppercase font-bold text-slate-400">Balance</span>
          </div>
          <div className="text-xl font-black text-slate-900">
            {quotas.optimizationCredits.remaining}
          </div>
          <div className="text-[11px] text-slate-500">
            {quotas.optimizationCredits.ledgerTransactions} optimizations performed
          </div>
        </div>

        {/* 4. Software Licenses & Client Activations (F-441, F-443) */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600">🔐 Active Licenses</span>
            <span className="text-[10px] uppercase font-bold text-slate-400">Sites</span>
          </div>
          <div className="text-xl font-black text-slate-900">
            {quotas.licensing.totalProductionSitesActivated}{" "}
            <span className="text-xs font-normal text-slate-500">
              prod ({quotas.licensing.totalLocalhostSitesActivated} dev)
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            {quotas.licensing.activeLicenses} active license key(s)
          </div>
        </div>
      </div>
    </div>
  );
}
