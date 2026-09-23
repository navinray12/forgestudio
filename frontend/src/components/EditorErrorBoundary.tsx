import React, { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class EditorErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Editor ErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl m-2 text-center shadow-xs select-none">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 mb-3 text-xl">
            ⚠️
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
            {this.props.fallbackTitle || "Something went wrong in this section"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4 font-mono break-all">
            {this.state.error?.message || "An unexpected rendering error occurred."}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-xs cursor-pointer"
          >
            Reload Component
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default EditorErrorBoundary;
