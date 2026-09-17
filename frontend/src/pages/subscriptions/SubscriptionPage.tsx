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
  plan: SubscriptionPlan;
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

function SubscriptionPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_PLANS);
  const [currentSub, setCurrentSub] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradingSlug, setUpgradingSlug] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch all plans
      const plansRes = await fetch(`${apiUrl}/api/v1/subscriptions/plans`, {
        credentials: "include",
      });
      const plansData = await plansRes.json();

      if (plansData?.data?.plans && Array.isArray(plansData.data.plans) && plansData.data.plans.length > 0) {
        setPlans(plansData.data.plans);
      } else {
        setPlans(DEFAULT_PLANS);
      }

      // Fetch user's current subscription
      const currentRes = await fetch(`${apiUrl}/api/v1/subscriptions/current`, {
        credentials: "include",
      });
      const currentData = await currentRes.json();

      if (currentData?.data?.subscription) {
        setCurrentSub(currentData.data.subscription);
      }
    } catch (err) {
      console.error("Failed to load subscriptions from backend:", err);
      // Keep default plans so UI is never empty!
      setPlans(DEFAULT_PLANS);
    } finally {
      setLoading(false);
    }
  };

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
      </main>
    </div>
  );
}

export default SubscriptionPage;
