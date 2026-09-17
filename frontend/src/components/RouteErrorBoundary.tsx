/**
 * @file Route Error Boundary: React UI composition and event handling for this screen or component.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { Component, type ReactNode, type ErrorInfo } from 'react';
/** Contain route/render failures without claiming that unsent browser edits were saved. */
export class RouteErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  /**
   * Get Derived State From Error.
   */
  static getDerivedStateFromError() { return { failed: true }; }
  /**
   * Component Did Catch.
   * @param _error Error supplied to this operation (type: Error).
   * @param _info Info supplied to this operation (type: ErrorInfo).
   */
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    console.error('The application route could not render.');
  }
  /**
   * Render.
   */
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="min-h-screen bg-slate-950 text-white p-8" role="alert">
      <h1 className="text-xl font-semibold">This screen could not be loaded</h1>
      <p className="my-4 max-w-2xl">Host-saved content remains on the server. Recent unsent changes may be available under Recovery / compare after reopening the editor. A browser recovery copy is not a confirmed host save.</p>
      <button type="button" className="rounded bg-blue-600 px-4 py-2" onClick={() => window.location.reload()}>Reload application</button>
    </main>;
  }
}
