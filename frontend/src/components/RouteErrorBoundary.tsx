/**
 * @file Route Error Boundary: React UI composition and event handling for this screen or component.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { Component, type ReactNode, type ErrorInfo } from 'react';
/** Contain route/render failures without claiming that unsent browser edits were saved. */
export class RouteErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean; error: Error | null }> {
  state: { failed: boolean; error: Error | null } = { failed: false, error: null };

  /**
   * Get Derived State From Error.
   */
  static getDerivedStateFromError(error: Error) {
    return { failed: true, error };
  }

  /**
   * Component Did Catch.
   * @param error Error supplied to this operation (type: Error).
   * @param info Info supplied to this operation (type: ErrorInfo).
   */
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('The application route could not render:', error, info);
  }

  /**
   * Render.
   */
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="min-h-screen bg-slate-950 text-white p-6 sm:p-12 flex flex-col items-center justify-center font-sans" role="alert">
        <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-5">
          <div className="flex items-center gap-3 text-amber-400">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 text-xl font-bold">
              ⚠️
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">This screen could not be loaded</h1>
              <p className="text-xs text-slate-400">Route Error Recovery Handler</p>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">
            Host-saved content remains on the server. Recent unsent changes may be available under Recovery / compare after reopening the editor. A browser recovery copy is not a confirmed host save.
          </p>

          {this.state.error && (
            <div className="rounded-2xl border border-rose-900/60 bg-rose-950/40 p-4 font-mono text-xs text-rose-300 space-y-1 overflow-x-auto">
              <span className="font-bold text-rose-400 block uppercase tracking-wider text-[10px]">Captured Error Details</span>
              <p className="break-words">{this.state.error.message || String(this.state.error)}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              className="rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-bold text-white transition shadow-sm cursor-pointer"
              onClick={() => {
                this.setState({ failed: false, error: null });
              }}
            >
              Try Again
            </button>
            <button
              type="button"
              className="rounded-xl bg-slate-800 hover:bg-slate-700 px-5 py-2.5 text-xs font-bold text-slate-200 transition cursor-pointer"
              onClick={() => window.location.reload()}
            >
              Reload Application
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-700 hover:bg-slate-800 px-5 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer ml-auto"
              onClick={() => {
                this.setState({ failed: false, error: null });
                window.location.href = "/dashboard";
              }}
            >
              Return to Dashboard →
            </button>
          </div>
        </div>
      </main>
    );
  }
}

