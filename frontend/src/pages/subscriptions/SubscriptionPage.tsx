/**
 * @file Subscription Page: React UI composition and event handling for this screen or component.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  billingInterval: string;
  websiteLimit: number;
  storageLimitMb: number;
  aiCreditLimit: number;
  features: string[];
}

interface UserSubscription {
  id: string;
  status: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  plan: SubscriptionPlan;
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

const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    slug: "free",
    price: 0,
    currency: "INR",
    billingInterval: "monthly",
    websiteLimit: 1,
    storageLimitMb: 100,
    aiCreditLimit: 0,
    features: [
      "1 Website",
      "Basic widgets",
      "Basic templates",
      "Basic responsive editing",
      "Basic styling",
      "Basic project saving",
      "Preview",
      "Basic HTML/CSS export",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    slug: "starter",
    price: 499,
    currency: "INR",
    billingInterval: "monthly",
    websiteLimit: 3,
    storageLimitMb: 1000,
    aiCreditLimit: 100,
    features: [
      "3 Websites",
      "More templates",
      "More widgets",
      "Advanced styling",
      "Custom CSS",
      "More storage (1 GB)",
      "Basic SEO",
      "Code export",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    slug: "professional",
    price: 999,
    currency: "INR",
    billingInterval: "monthly",
    websiteLimit: 10,
    storageLimitMb: 10000,
    aiCreditLimit: 1000,
    features: [
      "10 Websites",
      "All standard widgets",
      "Advanced widgets",
      "Advanced responsive controls",
      "Global styles",
      "Custom fonts",
      "Advanced CSS",
      "Advanced SEO",
      "AI features / credits",
      "ZIP export",
      "Priority support",
    ],
  },
  {
    id: "agency",
    name: "Agency",
    slug: "agency",
    price: 2499,
    currency: "INR",
    billingInterval: "monthly",
    websiteLimit: 50,
    storageLimitMb: 50000,
    aiCreditLimit: 5000,
    features: [
      "50 Websites",
      "Client website management capability",
      "Team / client workspace capability",
      "White-label capability",
      "Higher AI limits",
      "Higher storage (50 GB)",
      "Advanced export",
      "Premium support",
    ],
  },
];

/**
 * Render the subscription page interface and connect its event handlers.
 */
function SubscriptionPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_PLANS);
  const [currentSub, setCurrentSub] = useState<UserSubscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgradingSlug, setUpgradingSlug] = useState<string | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  /**
   * Fetch Subscription Data.
   */
  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      setError("");

      // 1. Fetch all plans
      const plansRes = await fetch(`${apiUrl}/api/v1/subscriptions/plans`, {
        credentials: "include",
      });
      const plansData = await plansRes.json();

      if (plansData?.data?.plans && Array.isArray(plansData.data.plans) && plansData.data.plans.length > 0) {
        setPlans(plansData.data.plans);
      } else {
        setPlans(DEFAULT_PLANS);
      }

      // 2. Fetch user's current subscription
      const currentRes = await fetch(`${apiUrl}/api/v1/subscriptions/current`, {
        credentials: "include",
      });
      const currentData = await currentRes.json();

      if (currentData?.data?.subscription) {
        setCurrentSub(currentData.data.subscription);
      }

      // 3. Fetch past invoices (F-444, F-445, F-449)
      try {
        const invRes = await fetch(`${apiUrl}/api/v1/subscriptions/invoices`, {
          credentials: "include",
        });
        const invData = await invRes.json();
        if (invData?.data?.invoices && Array.isArray(invData.data.invoices)) {
          setInvoices(invData.data.invoices);
        }
      } catch {
        /* silent fallback */
      }
    } catch (err) {
      console.error("Failed to load subscriptions from backend:", err);
      setPlans(DEFAULT_PLANS);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setCanceling(true);
      setError("");
      setSuccessMessage("");

      const res = await fetch(`${apiUrl}/api/v1/subscriptions/cancel`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to cancel subscription.");
      }

      setSuccessMessage(data.message || "Subscription cancelled successfully.");
      setCancelModalOpen(false);
      fetchSubscriptionData();
    } catch (err: any) {
      setError(err.message || "Error cancelling subscription.");
    } finally {
      setCanceling(false);
    }
  };

  /**
   * Handle Select Plan.
   * @param planSlug Plan Slug supplied to this operation (type: string).
   */
  const handleSelectPlan = async (planSlug: string) => {
    try {
      setUpgradingSlug(planSlug);
      setError("");
      setSuccessMessage("");

      const response = await fetch(`${apiUrl}/api/v1/subscriptions/select`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ planSlug }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to update subscription plan.");
      }

      setSuccessMessage(`Successfully updated your plan to ${data?.data?.subscription?.plan?.name}!`);
      setCurrentSub(data.data.subscription);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setUpgradingSlug(null);
    }
  };

  /**
   * Format Price.
   * @param price Price supplied to this operation (type: number).
   * @param currency Currency supplied to this operation (type: string).
   */
  const formatPrice = (price: number, currency: string) => {
    if (price === 0) return "₹0";
    return `${currency === "INR" ? "₹" : "$"}${price.toLocaleString("en-IN")}`;
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      {/* Header / Navbar */}
      <header className="border-b border-slate-800 bg-[#1e293b]/50 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 font-bold text-white shadow-lg shadow-blue-500/20">
              F
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              ForgeStudio
            </span>
          </Link>

          <Link
            to="/dashboard"
            className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-700 hover:text-white"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="text-center">
          <span className="inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-400">
            Subscription & Pricing
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Choose the Perfect Plan for Your Websites
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-400">
            Flexible pricing tailored to your scale — from single projects to full agency management.
          </p>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mx-auto mt-6 max-w-xl rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm font-medium text-red-400">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mx-auto mt-6 max-w-xl rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm font-medium text-emerald-400">
            {successMessage}
          </div>
        )}

        {/* Current Active Plan Overview Banner */}
        {currentSub && (
          <div className="mx-auto mt-8 max-w-4xl rounded-2xl border border-slate-800 bg-slate-800/60 p-6 backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Your Active Subscription
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                      currentSub.status === "CANCELED"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    {currentSub.status}
                  </span>
                </div>
                <div className="text-2xl font-black text-white">
                  {currentSub.plan?.name || "Free"} Plan
                </div>
                <div className="text-xs text-slate-400">
                  {currentSub.currentPeriodEnd ? (
                    <>
                      {currentSub.status === "CANCELED"
                        ? "Access remaining active until "
                        : "Next automatic renewal on "}
                      <strong className="text-slate-200">
                        {new Date(currentSub.currentPeriodEnd).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </strong>
                    </>
                  ) : (
                    "Active Lifetime Plan"
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {currentSub.status !== "CANCELED" && currentSub.plan?.slug !== "free" && (
                  <button
                    onClick={() => setCancelModalOpen(true)}
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition"
                  >
                    Cancel Subscription
                  </button>
                )}
                <Link
                  to="/dashboard?tab=licensing"
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
                >
                  View Licenses 🔐
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="mt-16 flex justify-center">
            <p className="text-sm text-slate-400">Loading subscription plans...</p>
          </div>
        ) : (
          /* Pricing Grid (4 Plans) */
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => {
              const isCurrent = currentSub?.plan?.slug === plan.slug;
              const isPopular = plan.slug === "professional";
              const isUpgrading = upgradingSlug === plan.slug;

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col justify-between rounded-3xl p-7 transition duration-300 ${
                    isPopular
                      ? "border-2 border-blue-500 bg-slate-800/90 shadow-2xl shadow-blue-500/20 ring-1 ring-blue-500/50"
                      : "border border-slate-800 bg-slate-900/80 hover:border-slate-700"
                  }`}
                >
                  {/* Highlight Badge */}
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-950 shadow-md">
                      Professional — Most Popular
                    </div>
                  )}

                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                      {isCurrent && (
                        <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                          Current Plan
                        </span>
                      )}
                    </div>

                    {/* Price */}
                    <div className="mt-6 flex items-baseline">
                      <span className="text-4xl font-extrabold tracking-tight text-white">
                        {formatPrice(plan.price, plan.currency)}
                      </span>
                      <span className="ml-1 text-sm font-medium text-slate-400">
                        /month
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Billed {plan.billingInterval}
                    </p>

                    {/* Website Limit Badge */}
                    <div className="mt-5 inline-flex items-center rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-400 border border-blue-500/20">
                      ⚡ {plan.websiteLimit} {plan.websiteLimit === 1 ? "Website" : "Websites"} Allowed
                    </div>

                    {/* Divider */}
                    <div className="my-6 border-t border-slate-800" />

                    {/* Feature List */}
                    <ul className="space-y-3 text-xs text-slate-300">
                      {plan.features?.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <svg
                            className="h-4 w-4 shrink-0 text-cyan-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2.5"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4.5 12.75l6 6 9-13.5"
                            />
                          </svg>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Button */}
                  <div className="mt-8">
                    {isCurrent ? (
                      <button
                        disabled
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 text-xs font-bold text-slate-400 cursor-default"
                      >
                        Current Plan
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSelectPlan(plan.slug)}
                        disabled={isUpgrading}
                        className={`w-full rounded-xl py-3 text-xs font-bold transition duration-200 ${
                          isPopular
                            ? "bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-500/25 hover:opacity-95"
                            : "bg-slate-800 text-white hover:bg-slate-700 border border-slate-700"
                        } disabled:opacity-50`}
                      >
                        {isUpgrading
                          ? "Updating Plan..."
                          : plan.price === 0
                          ? "Downgrade to Free"
                          : `Upgrade to ${plan.name}`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Past Invoices & Transaction History (F-444, F-445, F-449) */}
        <div className="mt-16 rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">
                Billing Invoices & Renewal History
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Official invoices and records for your ForgeStudio subscriptions and upgrades.
              </p>
            </div>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300 border border-slate-700">
              {invoices.length} Total Invoices
            </span>
          </div>

          {invoices.length === 0 ? (
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 py-10 text-center text-sm text-slate-400">
              No previous invoices recorded. Invoices are generated automatically on plan purchase or renewal.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="px-5 py-3.5">Invoice #</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Billing Period</th>
                    <th className="px-5 py-3.5">Amount</th>
                    <th className="px-5 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/40 font-medium">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3.5 font-mono text-xs font-bold text-cyan-400">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400">
                        {new Date(inv.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400">
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
                      <td className="px-5 py-3.5 font-bold text-white">
                        {inv.currency === "INR" ? "₹" : "$"}{inv.amount.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            inv.status === "PAID"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
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

        {/* Cancel Subscription Modal (F-449) */}
        {cancelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">
                  Cancel Subscription?
                </h3>
                <button
                  onClick={() => setCancelModalOpen(false)}
                  className="text-slate-400 hover:text-white font-bold"
                >
                  ✕
                </button>
              </div>

              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Your subscription will be cancelled, but you will retain uninterrupted access to your current plan features and site licenses until the end of your billing period on{" "}
                <strong className="text-white">
                  {currentSub?.currentPeriodEnd
                    ? new Date(currentSub.currentPeriodEnd).toLocaleDateString("en-US", {
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
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
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
      </main>
    </div>
  );
}

export default SubscriptionPage;
