import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, ChevronDown, CreditCard, Database, Globe, Image, Info, KeyRound, Layers, RefreshCw, Sparkle, Zap } from "lucide-react";
import { chartBuckets, usageDate, usageNumber as number, usagePeriodLabel } from "./usage-model";
import type { DashboardUsage, UsageRange } from "./usage-model";
import "./UsageView.css";
const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
function Meter({ value, label, color = "blue" }: { value: number; label: string; color?: string }) {
  return <div className={`usage-meter is-${color}`} role="progressbar" aria-label={label} aria-valuenow={Math.max(0, Math.min(100, value))} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}
function MiniBars() { return <span className="usage-mini-bars" aria-hidden="true">{[9, 17, 25, 14, 21].map((height, index) => <i key={index} style={{ height }} />)}</span>; }
function ActivityChart({ usage }: { usage: DashboardUsage }) {
  const buckets = chartBuckets(usage.activity.daily);
  const max = Math.max(1, ...buckets.map(row => row.credits));
  return <><div className="usage-chart-plot" role="img" aria-label={`${number(usage.activity.usedCredits)} AI credits used in ${usage.scope.workspaceName} during ${usagePeriodLabel(usage.period)}`}>
    <svg viewBox="0 0 1000 180" preserveAspectRatio="none">
      <line x1="16" x2="984" y1="149" y2="149" stroke="#26334b" strokeWidth="1" />
      {buckets.map((row, index) => { const width = 948 / Math.max(1, buckets.length); const height = row.credits ? Math.max(5, row.credits / max * 115) : 10;
        return <rect key={row.date} x={24 + index * width} y={145 - height} width={Math.max(3, Math.min(14, width - 7))} height={height} rx="6" fill={row.credits ? "#7665ff" : "#19243d"}><title>{usageDate(row.date)}{row.end !== row.date ? ` – ${usageDate(row.end)}` : ""}: {number(row.credits)} credits</title></rect>; })}
      {buckets.filter((_row, index) => index === 0 || index === buckets.length - 1 || index % Math.max(1, Math.floor(buckets.length / 6)) === 0).map(row => <text key={row.date} x={Math.min(968, 24 + buckets.indexOf(row) * 948 / Math.max(1, buckets.length))} y="174" textAnchor="middle" fill="#8190a8" fontSize="12">{usageDate(row.date)}</text>)}
    </svg>
  </div>{usage.activity.events === 0 && <div className="usage-chart-empty"><Sparkle size={16} />No credit activity to display</div>}</>;
}
export default function UsageView({ workspaceId, workspaceLoading, workspaceError, onRetryWorkspace }: {
  workspaceId: string; workspaceLoading: boolean; workspaceError: string; onRetryWorkspace: () => void;
}) {
  const [range, setRange] = useState<UsageRange>("current_cycle");
  const [custom, setCustom] = useState({ start: "", end: "" });
  const [draft, setDraft] = useState({ start: "", end: "" });
  const [customOpen, setCustomOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ key: string; usage: DashboardUsage | null; error: string; loading: boolean }>({ key: "", usage: null, error: "", loading: true });
  const query = new URLSearchParams({ workspaceId, range, ...(range === "custom" ? custom : {}) }).toString();
  const key = `${query}:${revision}`;
  useEffect(() => {
    if (workspaceLoading || workspaceError) return;
    const controller = new AbortController();
    setState({ key, usage: null, error: "", loading: true });
    fetch(`${apiUrl}/api/dashboard/usage?${query}`, { credentials: "include", signal: controller.signal })
      .then(async response => {
        const result = await response.json().catch(() => null);
        if (!response.ok) throw new Error(response.status === 401 ? "Your session has expired. Sign in again to view usage." : result?.error?.message || result?.message || "Unable to load usage. Please try again.");
        if (!result?.quotas || !result?.activity || !result?.period) throw new Error("Usage data was incomplete. Please try again.");
        if (!controller.signal.aborted) setState({ key, usage: result, error: "", loading: false });
      }).catch(error => { if (!controller.signal.aborted) setState({ key, usage: null, error: error instanceof Error ? error.message : "Unable to load usage.", loading: false }); });
    return () => controller.abort();
  }, [key, query, workspaceLoading, workspaceError]);
  const current = state.key === key && !workspaceLoading && !workspaceError ? state : null;
  const usage = current?.usage;
  const error = workspaceError || current?.error;
  const loading = !error && (!current || current.loading);
  function selectRange(value: string) {
    if (value === "custom") {
      setDraft(custom.start ? custom : { start: usage?.period.start.slice(0, 10) || "", end: usage ? new Date(+new Date(usage.period.end) - 1).toISOString().slice(0, 10) : "" }); setCustomOpen(true);
    } else { setRange(value as UsageRange); setCustomOpen(false); }
  }
  const rangeOptions = <><option value="current_cycle">Current billing cycle</option><option value="last_30_days">Last 30 days</option><option value="previous_cycle">Previous billing cycle</option><option value="custom">Custom date range</option></>;
  return <section className="usage-page" aria-label="Site Usage" aria-busy={loading}>
    <header className="usage-heading"><div><h1>Site Usage</h1><p>Track how your site is performing and how visitors interact with your content.</p></div>
      <div className="usage-heading-actions"><button className="usage-refresh" aria-label="Refresh usage" disabled={loading || workspaceLoading} onClick={() => workspaceError ? onRetryWorkspace() : setRevision(value => value + 1)}><RefreshCw size={14} /></button>
        <label className="usage-date-select"><CalendarDays size={15} /><span>{usage ? usagePeriodLabel(usage.period) : "Date range"}</span><select aria-label="Usage date range" value={range} onChange={event => selectRange(event.target.value)}>{rangeOptions}</select><ChevronDown size={13} /></label>
      </div>
    </header>
    {customOpen && <form className="usage-custom-range" onSubmit={event => { event.preventDefault(); setCustom(draft); setRange("custom"); setCustomOpen(false); }}><label>Start date<input aria-label="Usage start date" type="date" required value={draft.start} onChange={event => setDraft(value => ({ ...value, start: event.target.value }))} /></label><label>End date<input aria-label="Usage end date" type="date" required min={draft.start} value={draft.end} onChange={event => setDraft(value => ({ ...value, end: event.target.value }))} /></label><button type="submit">Apply dates</button><button type="button" onClick={() => setCustomOpen(false)}>Cancel</button></form>}
    {error ? <div className="usage-error" role="alert"><span>{error}</span><button onClick={() => workspaceError ? onRetryWorkspace() : setRevision(value => value + 1)}>Try again</button></div> : loading ? <div className="usage-loading" role="status" aria-label="Loading usage"><div /><div /><div /><div /><section /><section /></div> : usage && <>
      <div className="usage-stat-grid" aria-label="Account usage totals">
        <article className="usage-stat is-blue"><div className="usage-stat-heading"><span className="usage-stat-icon"><Globe size={18} /></span><h2>Website Slots</h2><span className="usage-stat-badge">{number(usage.quotas.websites.used)} / {number(usage.quotas.websites.limit)}</span></div><div className="usage-stat-value"><strong>{number(usage.quotas.websites.used)}</strong><span>of {number(usage.quotas.websites.limit)} used</span></div><Meter value={usage.quotas.websites.percentage} label="Website slots used" /><div className="usage-stat-footer"><span>{number(usage.quotas.websites.remaining)} slots available</span><span>{usage.quotas.websites.percentage}%</span></div></article>
        <article className="usage-stat is-purple"><div className="usage-stat-heading"><span className="usage-stat-icon"><Layers size={18} /></span><h2>Storage<br />Used</h2><span className="usage-stat-badge">{number(usage.quotas.storage.usedBytes / 1048576)} / {number(usage.quotas.storage.limitMb)} MB</span></div><div className="usage-stat-value"><strong>{number(usage.quotas.storage.usedBytes / 1048576)} MB</strong><span>of {number(usage.quotas.storage.limitMb)} MB</span></div><Meter value={usage.quotas.storage.percentage} label="Storage used" color="purple" /><div className="usage-stat-footer"><span>{number(usage.quotas.storage.remaining / 1048576)} MB free</span><span>{usage.quotas.storage.percentage}%</span></div></article>
        <article className="usage-stat is-green"><div className="usage-stat-heading"><span className="usage-stat-icon"><Image size={18} /></span><h2>Image Opt.<br />Credits</h2><span className="usage-stat-badge is-status">BALANCE</span></div><div className="usage-stat-value"><strong>{number(usage.quotas.optimization.remaining)}</strong></div><div className="usage-stat-description">of your optimization credits</div><div className="usage-stat-footer"><span>{number(usage.quotas.optimization.operations)} optimizations performed</span><MiniBars /></div></article>
        <article className="usage-stat is-amber"><div className="usage-stat-heading"><span className="usage-stat-icon"><KeyRound size={18} /></span><h2>Active Licenses</h2><span className="usage-stat-badge is-status">SITES</span></div><div className="usage-stat-value"><strong>{number(usage.quotas.licenses.production)}</strong><span>prod ({number(usage.quotas.licenses.development)} dev)</span></div><div className="usage-stat-footer"><span>{number(usage.quotas.licenses.active)} active license key(s)</span><MiniBars /></div></article>
      </div>
      <article className="usage-balance"><div className="usage-balance-label"><span><Database size={15} /></span>Credit balance</div><div className="usage-balance-values"><h2>{usage.quotas.aiCredits.remainingPercentage}% remaining</h2><strong>{number(usage.quotas.aiCredits.remaining)} / {number(usage.quotas.aiCredits.limit)} credits remaining</strong></div><Meter value={usage.quotas.aiCredits.remainingPercentage} label="AI credits remaining" color="gradient" /><div className="usage-balance-footer"><p><Info size={15} />{usage.billing.daysUntilReset !== null ? `Your credit period ends in ${usage.billing.daysUntilReset} days.` : usage.quotas.aiCredits.limit === 0 ? `AI credits are not included in your ${usage.billing.planName} plan.` : "No upcoming credit reset is recorded."}</p><Link to="/subscriptions" className="usage-add-credits" title="View plans with AI credits">Add credits</Link></div><p className="usage-scope-note">Plan limits and balances are account-wide. Activity below is for {usage.scope.workspaceName}.</p></article>
      <div className="usage-history-grid"><article className="usage-features"><div className="usage-features-heading"><span><Zap size={21} fill="currentColor" /></span><h2>Features Used</h2></div><strong className="usage-features-value">{number(usage.activity.usedCredits)}</strong><p title="Selected workspace and date range compared with your current plan allocation">of {number(usage.quotas.aiCredits.limit)} credits</p><div className="usage-features-meter"><Meter value={usage.activity.percentage} label="Feature credits used" color="purple" /><span>{usage.activity.percentage}%</span></div></article>
        <article className="usage-chart"><div className="usage-chart-toolbar"><label><select aria-label="Credit chart date range" value={range} onChange={event => selectRange(event.target.value)}>{rangeOptions}</select><ChevronDown size={12} /></label></div><ActivityChart usage={usage} /></article>
      </div>
      <article className="usage-breakdown"><div className="usage-breakdown-heading"><span className="usage-breakdown-icon"><CreditCard size={20} /></span><div><h2>Credit usage by site and user</h2><p>See which sites and Workspace members used AI credits during the selected date range.</p></div><button aria-expanded={detailsOpen} onClick={() => setDetailsOpen(value => !value)}>{detailsOpen ? "Hide details" : "View details"}<ArrowRight size={14} /></button></div>
        {usage.activity.breakdown.length === 0 && !detailsOpen ? <div className="usage-breakdown-empty"><Sparkle size={16} />No credit activity to display</div> : <div className="usage-table-wrap"><table><caption className="usage-visually-hidden">AI credit activity for {usage.scope.workspaceName}</caption><thead><tr><th>Site</th><th>User</th>{detailsOpen && <th>Feature</th>}<th>Credits</th>{detailsOpen && <th>Operations</th>}</tr></thead><tbody>{(detailsOpen ? usage.activity.breakdown : usage.activity.breakdown.slice(0, 3)).map((row, index) => <tr key={`${row.websiteId}-${row.actorId}-${row.feature}-${index}`}><td>{row.siteName}</td><td>{row.actorName}</td>{detailsOpen && <td>{row.feature.replace(/_/g, " ")}</td>}<td>{number(row.credits)}</td>{detailsOpen && <td>{number(row.events)}</td>}</tr>)}{usage.activity.breakdown.length === 0 && <tr><td colSpan={detailsOpen ? 5 : 3}>No credit activity in this workspace and date range.</td></tr>}</tbody></table></div>}
      </article>
    </>}
  </section>;
}
