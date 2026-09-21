import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

interface SubscriptionInfo {
  id: string;
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
    websiteLimit: number;
    storageLimitMb: number;
    aiCreditLimit: number;
  };
}

interface Invoice {
  id: string;
  planId: string;
  amount: number;
  currency: string;
  status: string;
  invoiceNumber: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  createdAt: string;
}

export default function SubscriptionBillingPanel() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      setError("");

      // 1. Fetch current subscription
      const subRes = await fetch(`${apiUrl}/api/v1/subscriptions/current`, {
        credentials: "include",
      });
      const subData = await subRes.json();
      if (subData?.data?.subscription) {
        setSubscription(subData.data.subscription);
      }

      // 2. Fetch invoices
      const invRes = await fetch(`${apiUrl}/api/v1/subscriptions/invoices`, {
        credentials: "include",
      });
      const invData = await invRes.json();
      if (invData?.data?.invoices && Array.isArray(invData.data.invoices)) {
        setInvoices(invData.data.invoices);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load billing details.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setCanceling(true);
      setError("");
      setSuccess("");

      const res = await fetch(`${apiUrl}/api/v1/subscriptions/cancel`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to cancel subscription.");
      }

      setSuccess(data.message || "Subscription cancelled. You retain access until the end of your billing cycle.");
      setCancelModalOpen(false);
      fetchBillingData();
    } catch (err: any) {
      setError(err.message || "Error cancelling subscription.");
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-44 w-full rounded-2xl bg-slate-100 border border-slate-200" />
        <div className="h-64 w-full rounded-2xl bg-slate-100 border border-slate-200" />
      </div>
    );
  }

  const isCanceled = subscription?.status === "CANCELED";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">💳</span>
              <h2 className="text-xl font-bold text-slate-900">
                Subscription Management & Billing Invoices
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Manage your active subscription plan, renewal dates, payment cycles, and past billing invoices.
            </p>
          </div>

          <Link
            to="/subscriptions"
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
          >
            ⭐ Change / Upgrade Plan
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-700 font-bold ml-4">✕</button>
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700 flex items-center justify-between">
          <span>✔ {success}</span>
          <button onClick={() => setSuccess("")} className="text-emerald-500 hover:text-emerald-700 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Current Plan Card */}
      {subscription && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Current Plan
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                    isCanceled
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {subscription.status}
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-900">
                {subscription.plan?.name || "Free"} Tier
              </h3>
              <p className="text-xs text-slate-500">
                Price:{" "}
                <strong className="text-slate-800">
                  {subscription.plan?.price === 0
                    ? "Free"
                    : `₹${subscription.plan?.price} / ${subscription.plan?.billingInterval || "month"}`}
                </strong>
              </p>
            </div>

            {/* Renewal & Actions */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-right">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {isCanceled ? "Access Expires On" : "Next Renewal Date"}
                </div>
                <div className="text-sm font-bold text-slate-800">
                  {subscription.currentPeriodEnd
                    ? new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Lifetime / No Expiry"}
                </div>
              </div>

              {!isCanceled && subscription.plan?.slug !== "free" && (
                <button
                  onClick={() => setCancelModalOpen(true)}
                  className="rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 px-3.5 py-2 text-xs font-semibold transition"
                >
                  Cancel Subscription
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invoices Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-bold text-slate-900">
            Billing & Invoices History ({invoices.length})
          </h4>
          <button
            onClick={fetchBillingData}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
          >
            Refresh
          </button>
        </div>

        {invoices.length === 0 ? (
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 py-10 text-center text-sm text-slate-500">
            No past invoices on record yet. When you upgrade or renew your plan, invoices will be automatically cataloged here.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Invoice Number</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Billing Period</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-800 text-xs">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(inv.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(inv.billingPeriodStart).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      -{" "}
                      {new Date(inv.billingPeriodEnd).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {inv.currency === "INR" ? "₹" : "$"}{inv.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          inv.status === "PAID"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                Cancel Subscription?
              </h3>
              <button
                onClick={() => setCancelModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              Are you sure you want to cancel your subscription? You will continue to enjoy your full plan features, site quotas, and licenses until your current billing period ends on{" "}
              <strong>
                {subscription?.currentPeriodEnd
                  ? new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "period end"}
              </strong>.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Keep Subscription
              </button>
              <button
                type="button"
                onClick={handleCancelSubscription}
                disabled={canceling}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 shadow-sm disabled:opacity-50"
              >
                {canceling ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
