export type UsageRange = "current_cycle" | "previous_cycle" | "last_30_days" | "custom";
export interface Quota { used: number; limit: number; remaining: number; percentage: number; isLimitReached: boolean }
export interface DashboardUsage {
  generatedAt: string;
  scope: { workspaceId: string; workspaceName: string; billingScope: "account"; visibleSiteCount: number };
  period: { range: UsageRange; start: string; end: string; source: string };
  billing: { planName: string; planSlug: string; cycleStart: string; cycleEnd: string; resetAt: string | null; daysUntilReset: number | null };
  quotas: { websites: Quota; storage: Quota & { usedBytes: number; limitMb: number }; optimization: { remaining: number; operations: number };
    licenses: { active: number; production: number; development: number }; aiCredits: Quota & { remainingPercentage: number } };
  activity: { usedCredits: number; events: number; percentage: number; daily: { date: string; credits: number }[];
    breakdown: { websiteId: string | null; actorId: string | null; siteName: string; actorName: string; feature: string; credits: number; events: number }[] };
}
export const usageNumber = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
export const usageDate = (date: string | number, year = false) => new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", ...(year ? { year: "numeric" } : {}), timeZone: "UTC" });
export function usagePeriodLabel(period: { start: string; end: string }) { return `${usageDate(period.start, true)} – ${usageDate(+new Date(period.end) - 1, true)}`; }
export function chartBuckets(daily: { date: string; credits: number }[], maximum = 31) {
  const size = Math.max(1, Math.ceil(daily.length / maximum));
  const buckets: { date: string; end: string; credits: number }[] = [];
  for (let i = 0; i < daily.length; i += size) { const rows = daily.slice(i, i + size); buckets.push({ date: rows[0].date, end: rows[rows.length - 1].date, credits: rows.reduce((total, row) => total + row.credits, 0) }); }
  return buckets;
}
