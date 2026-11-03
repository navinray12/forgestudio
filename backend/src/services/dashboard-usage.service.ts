import { AppError } from "../utils/app-error.js";
import { randomUUID } from "node:crypto";
import type { createDashboardServices } from "./dashboard.service.js";
export type UsageRange = "current_cycle" | "previous_cycle" | "last_30_days" | "custom";
export type UsageInput = { workspaceId: string; range: UsageRange; start?: string; end?: string };
const dayMs = 86_400_000;
const freePlan = { name: "Free", slug: "free", websiteLimit: 1, storageLimitMb: 100, aiCreditLimit: 0 };
const amount = (value: unknown) => { const n = Number(value ?? 0); if (!Number.isSafeInteger(n) || n < 0) throw new AppError("Usage data needs review", 503, "USAGE_DATA_INVALID"); return n; };
export function usageQuota(used: number, limit: number) {
  return { used, limit, remaining: Math.max(0, limit - used), percentage: limit > 0 ? Math.min(100, Math.round(used / limit * 100)) : used > 0 ? 100 : 0, isLimitReached: used >= limit };
}
export function resolveUsagePeriod(input: { range: UsageRange; start?: string; end?: string }, subscription: any, now: Date) {
  let start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  let end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  let source = "calendar";
  const subStart = subscription?.currentPeriodStart && new Date(subscription.currentPeriodStart);
  const subEnd = subscription?.currentPeriodEnd && new Date(subscription.currentPeriodEnd);
  if (subStart && subEnd && Number.isFinite(+subStart) && Number.isFinite(+subEnd) && subStart < subEnd && +subEnd - +subStart <= 366 * dayMs) { start = subStart; end = subEnd; source = "subscription"; }
  const cycleStart = start, cycleEnd = end;
  if (input.range === "last_30_days") { end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)); start = new Date(+end - 30 * dayMs); }
  if (input.range === "previous_cycle") {
    end = new Date(start);
    if (source === "calendar") start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 1, 1));
    else {
      const interval = String(subscription?.plan?.billingInterval || "monthly").toLowerCase();
      const months = ["yearly", "annual", "annually"].includes(interval) ? 12 : 1;
      const target = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - months, 1, end.getUTCHours(), end.getUTCMinutes(), end.getUTCSeconds(), end.getUTCMilliseconds()));
      const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
      target.setUTCDate(Math.min(end.getUTCDate(), lastDay)); start = target;
    }
  }
  if (input.range === "custom") {
    start = new Date(`${input.start}T00:00:00.000Z`); end = new Date(+new Date(`${input.end}T00:00:00.000Z`) + dayMs);
    if (!Number.isFinite(+start) || !Number.isFinite(+end) || start >= end || +end - +start > 366 * dayMs) throw new AppError("Choose a valid date range of at most 366 days", 400, "INVALID_DATE_RANGE");
  }
  return { start, end, source, cycleStart, cycleEnd };
}
function storageError(error: any): never {
  if (["42P01", "P2021"].includes(error?.code) || error?.meta?.code === "42P01") throw new AppError("Usage activity storage is not ready. Apply the dashboard usage migration and retry.", 503, "USAGE_STORAGE_NOT_READY");
  throw error;
}
// Read-only dashboard reporting; does not seed subscriptions, reset credits or initialize tables on GET.
export function createDashboardUsageService(db: any, dashboard: Pick<ReturnType<typeof createDashboardServices>, "listDashboardSites" | "listDashboardWorkspaces">, clock = () => new Date()) {
  async function read(userId: string, input: UsageInput) {
    const now = clock();
    // Apply the existing membership, personal-alias and website-access rules before reading activity.
    const sites = await dashboard.listDashboardSites(userId, input.workspaceId, true);
    const [user, subscription, fallbackPlan, accountSiteCount, media, optimized, optimizationCount, licenses, workspaceList] = await Promise.all([
      db.user.findUnique({ where: { id: userId }, select: { status: true, optimizationCredits: true } }),
      db.userSubscription.findUnique({ where: { userId }, select: { status: true, currentPeriodStart: true, currentPeriodEnd: true, plan: { select: { name: true, slug: true, websiteLimit: true, storageLimitMb: true, aiCreditLimit: true, billingInterval: true } } } }),
      db.subscriptionPlan.findUnique({ where: { slug: "free" }, select: { name: true, slug: true, websiteLimit: true, storageLimitMb: true, aiCreditLimit: true, billingInterval: true } }),
      db.website.count({ where: { userId } }),
      db.mediaAsset.aggregate({ where: { userId }, _sum: { sizeBytes: true } }),
      db.mediaOptimizationAsset.aggregate({ where: { website: { userId } }, _sum: { optimizedBytes: true } }),
      db.optimizationCreditLedger.count({ where: { userId } }),
      db.license.findMany({ where: { userId }, select: { status: true, expiresAt: true, activations: { select: { isLocalhost: true } } } }),
      dashboard.listDashboardWorkspaces(userId),
    ]);
    if (!user || user.status !== "ACTIVE") throw new AppError("Account is not active", 403, "ACCOUNT_INACTIVE");
    const plan = subscription?.plan || fallbackPlan || freePlan;
    const period = resolveUsagePeriod(input, subscription, now);
    const workspace = workspaceList.workspaces.find(item => item.id === input.workspaceId || item.aliases.includes(input.workspaceId));
    const aliases = workspace?.aliases || [];
    const ids = sites.map((site: any) => site.id);
    let cycleRows: any[], activityRows: any[];
    try {
      [cycleRows, activityRows] = await Promise.all([
        db.$queryRaw`SELECT COALESCE(SUM(credits), 0)::bigint AS used FROM dashboard_ai_credit_usage WHERE "accountId"=${userId}::uuid AND "createdAt">=${period.cycleStart} AND "createdAt"<${period.cycleEnd}`,
        db.$queryRaw`SELECT u."websiteId", u."actorId", u.feature, (u."createdAt" AT TIME ZONE 'UTC')::date::text AS date,
          COALESCE(w.name, 'Account activity') AS "siteName", COALESCE(a."fullName", 'Former member') AS "actorName", SUM(u.credits)::bigint AS credits, COUNT(*)::int AS events
          FROM dashboard_ai_credit_usage u LEFT JOIN websites w ON w.id=u."websiteId" LEFT JOIN users a ON a.id=u."actorId"
          WHERE u."accountId"=${userId}::uuid AND u."createdAt">=${period.start} AND u."createdAt"<${period.end}
          AND ((u."websiteId"=ANY(${ids}::uuid[]) AND (u."workspaceId"=ANY(${aliases}::uuid[]) OR (${input.workspaceId === "personal"} AND u."workspaceId" IS NULL)))
            OR (u."websiteId" IS NULL AND u."actorId"=${userId}::uuid AND ${input.workspaceId === "personal"} AND u."workspaceId" IS NULL))
          GROUP BY u."websiteId", u."actorId", u.feature, date, w.name, a."fullName" ORDER BY date, "siteName", "actorName", u.feature`,
      ]);
    } catch (error) { storageError(error); }
    const daily = new Map<string, number>();
    for (let date = new Date(Date.UTC(period.start.getUTCFullYear(), period.start.getUTCMonth(), period.start.getUTCDate())); date < period.end; date = new Date(+date + dayMs)) daily.set(date.toISOString().slice(0, 10), 0);
    const grouped = new Map<string, any>(); let usedCredits = 0, events = 0;
    for (const row of activityRows!) {
      const credits = amount(row.credits); usedCredits += credits; events += amount(row.events);
      daily.set(row.date, (daily.get(row.date) || 0) + credits);
      const key = JSON.stringify([row.websiteId, row.actorId, row.feature]);
      const item = grouped.get(key) || { websiteId: row.websiteId, actorId: row.actorId, siteName: row.siteName, actorName: row.actorName, feature: row.feature, credits: 0, events: 0 };
      item.credits += credits; item.events += amount(row.events); grouped.set(key, item);
    }
    const activeLicenses = licenses.filter((license: any) => license.status === "ACTIVE" && (!license.expiresAt || new Date(license.expiresAt) > now));
    const activations = activeLicenses.flatMap((license: any) => license.activations);
    const storageBytes = amount(media._sum.sizeBytes) + amount(optimized._sum.optimizedBytes);
    const creditQuota = usageQuota(amount(cycleRows![0]?.used), amount(plan.aiCreditLimit));
    const resetAt = subscription?.status === "ACTIVE" && period.source === "subscription" && period.cycleEnd > now ? period.cycleEnd.toISOString() : null;
    return {
      success: true, generatedAt: now.toISOString(),
      scope: { workspaceId: input.workspaceId, workspaceName: workspace?.name || "Personal sites", billingScope: "account", visibleSiteCount: sites.length },
      period: { range: input.range, start: period.start.toISOString(), end: period.end.toISOString(), source: period.source },
      billing: { planName: plan.name, planSlug: plan.slug, cycleStart: period.cycleStart.toISOString(), cycleEnd: period.cycleEnd.toISOString(), resetAt,
        daysUntilReset: resetAt ? Math.max(0, Math.ceil((+period.cycleEnd - +now) / dayMs)) : null },
      quotas: {
        websites: usageQuota(amount(accountSiteCount), amount(plan.websiteLimit)),
        storage: { ...usageQuota(storageBytes, amount(plan.storageLimitMb) * 1024 * 1024), usedBytes: storageBytes, limitMb: amount(plan.storageLimitMb) },
        optimization: { remaining: amount(user.optimizationCredits), operations: amount(optimizationCount) },
        licenses: { active: activeLicenses.length, production: activations.filter((activation: any) => !activation.isLocalhost).length, development: activations.filter((activation: any) => activation.isLocalhost).length },
        aiCredits: { ...creditQuota, remainingPercentage: creditQuota.limit > 0 ? Math.max(0, 100 - creditQuota.percentage) : 0 },
      },
      activity: { usedCredits, events, percentage: usageQuota(usedCredits, amount(plan.aiCreditLimit)).percentage,
        daily: [...daily].map(([date, credits]) => ({ date, credits })), breakdown: [...grouped.values()].sort((a, b) => b.credits - a.credits) },
    };
  }
  return { read };
}

// Trusted server integration only: call after a real, successful AI operation with its actual credit cost.
// No public write endpoint, invented historical activity, or automatic new charges are introduced.
export function createAiCreditUsageRecorder(db: any) {
  return async (input: { accountId: string; actorId: string; websiteId: string; credits: number; feature: string; requestKey: string }) => {
    if (!Number.isSafeInteger(input.credits) || input.credits <= 0 || input.credits > 2_147_483_647 || !input.feature.trim() || input.feature.length > 100 || !input.requestKey || input.requestKey.length > 128)
      throw new AppError("Invalid credit activity", 400, "INVALID_CREDIT_ACTIVITY");
    return db.$transaction(async (tx: any) => {
      const site = await tx.website.findFirst({ where: { id: input.websiteId, userId: input.accountId, OR: [{ userId: input.actorId }, { collaborators: { some: { userId: input.actorId } } }] }, select: { workspaceId: true } });
      if (!site) throw new AppError("Site not found or access denied", 404, "NOT_FOUND");
      const rows = await tx.$queryRaw`INSERT INTO dashboard_ai_credit_usage (id,"accountId","actorId","websiteId","workspaceId",credits,feature,"requestKey")
        VALUES (${randomUUID()}::uuid,${input.accountId}::uuid,${input.actorId}::uuid,${input.websiteId}::uuid,${site.workspaceId}::uuid,${input.credits},${input.feature.trim()},${input.requestKey})
        ON CONFLICT ("accountId","requestKey") DO NOTHING RETURNING id`;
      if (rows.length) return { id: rows[0].id, created: true };
      const existing = await tx.$queryRaw`SELECT id,"actorId","websiteId",credits,feature FROM dashboard_ai_credit_usage WHERE "accountId"=${input.accountId}::uuid AND "requestKey"=${input.requestKey}`;
      if (!existing[0] || existing[0].actorId !== input.actorId || existing[0].websiteId !== input.websiteId || existing[0].credits !== input.credits || existing[0].feature !== input.feature.trim()) throw new AppError("Credit activity request key was already used", 409, "IDEMPOTENCY_CONFLICT");
      return { id: existing[0].id, created: false };
    });
  };
}
