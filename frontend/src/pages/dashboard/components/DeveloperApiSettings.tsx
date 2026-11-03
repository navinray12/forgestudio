import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CodeXml,
  Cloud,
  FileCode,
  Globe,
  Home,
  KeyRound,
  Link as LinkIcon,
  Lock,
  Plus,
  Puzzle,
  ShieldCheck,
  Sparkles,
  BookOpen,
  Activity,
  Download,
  RotateCw,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { HeaderUserDropdown } from '../../../components/HeaderUserDropdown';
import NotificationBell from '../../../features/notifications/NotificationBell';
import { NotificationProvider } from '../../../features/notifications/NotificationContext';
import './DeveloperApiSettings.css';

const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const scopes = [
  { id: 'websites:read', label: 'Websites: Read', text: 'Read website configurations, pages, and metadata.', Icon: Globe },
  { id: 'websites:write', label: 'Websites: Write', text: 'Create and update websites, page trees, and contents.', Icon: FileCode },
  { id: 'publish:write', label: 'Publish: Write', text: 'Trigger production deployments and non-destructive rollbacks.', Icon: Sparkles },
];

type ApiKey = {
  id: string;
  name: string;
  maskedKey?: string;
  scopes: string[];
  createdAt: string;
  expiresAt?: string | null;
  lastUsedAt: string | null;
  isRevoked: boolean;
};

async function request(path: string, options: RequestInit = {}) {
  const r = await fetch(`${base}/api/v1/${path}`, { ...options, credentials: 'include' });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error?.message || d.message || 'API request failed. Please try again.');
  return d;
}

export default function DeveloperApiSettings() {
  return (
    <NotificationProvider>
      <DeveloperApiContent />
    </NotificationProvider>
  );
}

function DeveloperApiContent() {
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [rotating, setRotating] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState(scopes.map((s) => s.id));
  const [expiresInDays, setExpiresInDays] = useState<number | ''>('');
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState('curl');
  const [dialog, setDialog] = useState<'docs' | 'sdk' | 'repository' | 'status' | null>(null);
  const [status, setStatus] = useState('');

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const d = await request('apikeys');
      setKeys(d.keys || []);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDialog(null);
      if (e.key === 'Tab') {
        const nodes = Array.from(document.querySelectorAll<HTMLElement>('.dev-api-modal button:not(:disabled),.dev-api-modal a[href]'));
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('keydown', close);
      previous?.focus();
    };
  }, [dialog]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const payload: any = { name: name.trim(), scopes: selected };
      if (expiresInDays !== '') {
        payload.expiresInDays = Number(expiresInDays);
      }
      const d = await request('apikeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setSecret(d.rawSecret);
      setName('');
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function revoke(k: ApiKey) {
    if (!window.confirm(`Revoke "${k.name}"? Integrations using this key will stop working immediately.`)) return;
    setRevoking(k.id);
    setError('');
    try {
      await request(`apikeys/${encodeURIComponent(k.id)}/revoke`, { method: 'POST' });
      setSecret(null);
      setNotice('API key revoked. Your websites are unchanged.');
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRevoking(null);
    }
  }

  async function rotate(k: ApiKey) {
    if (!window.confirm(`Rotate key "${k.name}"? The current key will be revoked immediately and a new secret key will be generated.`)) return;
    setRotating(k.id);
    setError('');
    try {
      const d = await request(`apikeys/${encodeURIComponent(k.id)}/rotate`, { method: 'POST' });
      setSecret(d.rawSecret);
      setNotice('API key rotated. A new secret key has been generated; please copy it now.');
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRotating(null);
    }
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice('Copied to clipboard.');
    } catch {
      setError('Clipboard is unavailable. Select and copy the text manually.');
    }
  }

  const token = secret || 'fsk_your_api_key_secret';
  const snippet =
    tab === 'curl'
      ? `curl -X GET "${base}/api/v1/websites" \\\n  -H "Authorization: Bearer ${token}" \\\n  -H "Content-Type: application/json"`
      : tab === 'sdk'
      ? `// Download client.ts below, then import locally.\nimport { ForgeStudioClient } from "./client";\nconst client = new ForgeStudioClient({\n  baseUrl: "${base}/api/v1",\n  apiKey: "${token}"\n});\nconst result = await client.listWebsites({page:1, limit:10});`
      : `const response = await fetch("${base}/api/v1/websites", {\n  headers: { Authorization: "Bearer ${token}" }\n});\nif (!response.ok) throw new Error("Request failed");\nconst result = await response.json();`;

  const openStatus = async () => {
    setDialog('status');
    setStatus('Checking API...');
    try {
      const d = await request('health');
      setStatus(d.success ? 'API is responding normally.' : 'API health check reported issues.');
    } catch {
      setStatus('API is temporarily unreachable or responding normally.');
    }
  };

  return (
    <div className="dev-api-page">
      <header className="dev-api-header">
        <div className="dev-api-header-left">
          <button className="dev-api-back" onClick={() => navigate('/dashboard')} title="Back to Dashboard">
            <ArrowLeft size={18} />
          </button>
          <div className="dev-api-breadcrumb">
            <Link to="/dashboard">Dashboard</Link>
            <span>/</span>
            <span>Developer Tools</span>
          </div>
        </div>
        <div className="dev-api-header-right">
          <NotificationBell compact onSettings={() => navigate('/dashboard?section=notifications')} />
          <HeaderUserDropdown onSettings={(p) => navigate(`/dashboard?section=${p === 'help-support' ? 'help' : p}`)} />
        </div>
      </header>

      <div className="dev-api-layout">
        <main className="dev-api-main">
          <div className="dev-api-banner">
            <h1>Developer API Keys</h1>
            <p>Generate, manage, and inspect API credentials for external integrations, SDK automation, and CI/CD pipelines.</p>
          </div>

          {notice && (
            <div className="dev-api-notice" role="status">
              <span>{notice}</span>
              <button onClick={() => setNotice('')}>Dismiss</button>
            </div>
          )}

          {error && (
            <div className="dev-api-error" role="alert">
              <span>{error}</span>
              <button onClick={() => setError('')}>Dismiss</button>
            </div>
          )}

          {secret && (
            <div className="dev-api-secret" role="region" aria-label="Generated API key token">
              <div className="dev-api-secret-content">
                <span className="dev-api-secret-label">Save this key now — it will not be shown again:</span>
                <code className="dev-api-secret-value">{secret}</code>
              </div>
              <div className="dev-api-secret-actions">
                <button onClick={() => void copy(secret)}>Copy token</button>
                <button onClick={() => setSecret(null)}>Dismiss secret</button>
              </div>
            </div>
          )}

          <div className="dev-api-grid">
            <section className="dev-api-panel dev-api-create">
              <div className="dev-api-section-title">
                <span className="dev-api-key-icon"><KeyRound size={20} /></span>
                <div>
                  <h2>Create API Key</h2>
                  <p>Issue a new authenticated token with customized permission scopes.</p>
                </div>
              </div>

              <form onSubmit={(e) => void create(e)}>
                <div className="dev-api-form-group">
                  <label htmlFor="key-name">Key Label</label>
                  <input
                    ref={input}
                    id="key-name"
                    aria-label="Key label"
                    type="text"
                    required
                    placeholder="e.g. GitHub Actions Deployer"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="dev-api-form-group">
                  <label htmlFor="key-expiration">Expiration</label>
                  <select
                    id="key-expiration"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value === '' ? '' : Number(e.target.value))}
                    className="dev-api-select"
                  >
                    <option value="">No expiration (Never)</option>
                    <option value="30">30 days</option>
                    <option value="60">60 days</option>
                    <option value="90">90 days</option>
                    <option value="365">1 year (365 days)</option>
                  </select>
                </div>

                <div className="dev-api-form-group">
                  <span className="dev-api-field-label">Permission Scopes</span>
                  <div className="dev-api-scopes">
                    {scopes.map((s) => {
                      const Icon = s.Icon;
                      const checked = selected.includes(s.id);
                      return (
                        <label key={s.id} className={`dev-api-scope-card ${checked ? 'selected' : ''}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) setSelected([...selected, s.id]);
                              else setSelected(selected.filter((id) => id !== s.id));
                            }}
                          />
                          <Icon size={18} />
                          <div>
                            <strong>{s.label}</strong>
                            <p>{s.text}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy || !name.trim() || selected.length === 0}
                  className="dev-api-submit"
                >
                  {busy ? 'Generating...' : 'Generate API Key'}
                </button>
              </form>
            </section>

            <section className="dev-api-panel dev-api-keys">
              <div className="dev-api-section-title">
                <span className="dev-api-key-icon"><KeyRound size={20} /></span>
                <div>
                  <h2>Your API Keys</h2>
                  <p>Manage and view your existing API keys.</p>
                </div>
                <button
                  onClick={() => {
                    input.current?.focus();
                    input.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
                  }}
                >
                  <Plus size={16} />New Key
                </button>
              </div>

              <div className="dev-api-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Label</th>
                      <th>Scopes</th>
                      <th>Created</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={5}>Loading API keys...</td></tr>
                    ) : loadError ? (
                      <tr><td colSpan={5} role="alert">{loadError} <button onClick={() => void load()}>Retry</button></td></tr>
                    ) : !keys.length ? (
                      <tr><td colSpan={5}>No API keys yet. Generate a token above to get started.</td></tr>
                    ) : (
                      keys.map((k) => (
                        <tr key={k.id}>
                          <td>
                            <div>
                              <strong>{k.name}</strong>
                              {k.maskedKey && <div className="text-xs text-slate-400 font-mono">{k.maskedKey}</div>}
                            </div>
                          </td>
                          <td>
                            <div className="dev-api-scope-tags">
                              {k.scopes.map((s) => (
                                <code key={s} className={s.split(':')[0]}>
                                  {s === 'publish:write' ? 'publish' : s.split(':')[1]}
                                </code>
                              ))}
                            </div>
                          </td>
                          <td>{new Date(k.createdAt).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })}</td>
                          <td>
                            <span className={k.isRevoked ? 'dev-api-inactive' : 'dev-api-active'}>
                              {k.isRevoked ? 'Inactive' : 'Active'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                disabled={k.isRevoked || rotating !== null || revoking !== null}
                                onClick={() => void rotate(k)}
                                aria-label={`Rotate ${k.name}`}
                                title="Rotate API Key"
                              >
                                {rotating === k.id ? 'Rotating...' : 'Rotate'}
                              </button>
                              <button
                                disabled={k.isRevoked || revoking !== null || rotating !== null}
                                onClick={() => void revoke(k)}
                                aria-label={`Revoke ${k.name}`}
                              >
                                {revoking === k.id ? 'Revoking...' : 'Revoke'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <button className="dev-api-refresh" disabled={loading} onClick={() => void load()}>
                Refresh keys
              </button>
            </section>

            <section className="dev-api-panel dev-api-help">
              <CodeXml size={23} />
              <div>
                <h3>Need More Help?</h3>
                <p>Explore our comprehensive documentation or reach out to our support team.</p>
              </div>
              <button onClick={() => setDialog('docs')}>
                View Documentation <ArrowRight size={15} />
              </button>
              <Link className="dev-api-primary" to="/dashboard?section=help">
                Contact Support <ArrowRight size={15} />
              </Link>
            </section>
          </div>

          <aside className="dev-api-panel dev-api-quickstart">
            <div className="dev-api-section-title">
              <CodeXml size={26} />
              <div>
                <h2>SDK & URL Quickstart</h2>
                <p>Test your authenticated endpoints in terminal or TypeScript application.</p>
              </div>
            </div>

            <div className="dev-api-tabs" role="tablist" aria-label="Quickstart examples">
              {[
                ['curl', 'URL'],
                ['sdk', 'TypeScript SDK'],
                ['fetch', 'Fetch API'],
              ].map(([id, label]) => (
                <button
                  role="tab"
                  aria-selected={id === tab}
                  className={id === tab ? 'active' : ''}
                  key={id}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="dev-api-code">
              <button onClick={() => void copy(snippet)}>Copy</button>
              <pre>{snippet}</pre>
            </div>

            <h3 className="dev-api-links-heading">
              <LinkIcon size={15} />Quick Links
            </h3>
            <div className="dev-api-links">
              <button onClick={() => setDialog('docs')}>
                <FileCode size={17} />API Documentation <ArrowRight size={14} />
              </button>
              <button onClick={() => setDialog('sdk')}>
                <CodeXml size={17} />TypeScript SDK <ArrowRight size={14} />
              </button>
              <button onClick={() => setDialog('repository')}>
                <BookOpen size={17} />GitHub Repository <ArrowRight size={14} />
              </button>
              <button onClick={() => void openStatus()}>
                <Activity size={17} />Status Page <ArrowRight size={14} />
              </button>
            </div>
          </aside>
        </main>
      </div>

      {dialog && (
        <div className="dev-api-modal-backdrop" onClick={() => setDialog(null)}>
          <section
            className="dev-api-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Developer resources"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="dev-api-modal-close" autoFocus onClick={() => setDialog(null)} aria-label="Close developer resources">
              Close
            </button>
            {dialog === 'status' ? (
              <>
                <h2>API Status</h2>
                <p role="status">{status}</p>
                <button onClick={() => void openStatus()}>Check again</button>
              </>
            ) : dialog === 'repository' ? (
              <>
                <h2>GitHub Repository</h2>
                <p>A public repository has not been configured for this installation. Download the bundled TypeScript client below.</p>
                <a href={`${base}/api/v1/apikeys/sdk`} download>Download TypeScript SDK</a>
              </>
            ) : dialog === 'sdk' ? (
              <>
                <h2>TypeScript SDK</h2>
                <p>Download the actual bundled client as client.ts and import it locally. Supply a token from a server environment variable; keep secrets outside frontend bundles.</p>
                <a href={`${base}/api/v1/apikeys/sdk`} download>
                  <Download size={16} />Download client.ts
                </a>
              </>
            ) : (
              <>
                <h2>API Documentation</h2>
                <p>Base URL: <code>{base}/api/v1</code></p>
                <p>Authenticate using Authorization: Bearer YOUR_TOKEN. Only selected scopes are granted; all website requests enforce account access.</p>
                <ul>
                  <li>GET /websites - websites:read</li>
                  <li>POST /websites - websites:write</li>
                  <li>GET /websites/:id and /websites/:id/pages - websites:read</li>
                  <li>PUT /websites/:id and /websites/:id/pages - websites:write</li>
                  <li>POST /websites/:id/publish - publish:write</li>
                  <li>GET /websites/:id/deployments - websites:read</li>
                  <li>POST /websites/:id/deployments/:deploymentId/rollback - publish:write</li>
                </ul>
                <p>401: invalid/revoked token. 403: missing scope or permission. Revoking a token does not remove websites or deployments.</p>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
