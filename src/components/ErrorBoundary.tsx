import { Component, Fragment, type ErrorInfo, type ReactNode } from "react";
import { Mountain, RotateCcw } from "lucide-react";

type Props = { children: ReactNode };
type State = { hasError: boolean; nonce: number };

/**
 * Top-level safety net for render errors (e.g. a failed lazy-route chunk).
 * Shows a branded fallback with recovery actions; never exposes stack traces.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, nonce: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Message + component stack only — never props, state, or user data.
    console.error("[E2 Trails] Render error:", error.message, info.componentStack);
  }

  private reset = () =>
    this.setState((s) => ({ hasError: false, nonce: s.nonce + 1 }));

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-charcoal text-charcoal-foreground grid place-items-center px-6">
          <div className="text-center max-w-md">
            <Mountain className="w-12 h-12 text-accent/70 mx-auto mb-6" strokeWidth={1.5} aria-hidden="true" />
            <p className="kicker kicker-light justify-center">Off the marked trail</p>
            <h1 className="font-display font-bold text-3xl md:text-4xl mt-3">Something went wrong</h1>
            <p className="mt-4 text-charcoal-foreground/70">
              An unexpected error interrupted this page. Try again — or head back to safety.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.reset}
                className="btn-accent inline-flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" /> Try again
              </button>
              <a
                href="/"
                className="inline-flex items-center min-h-[44px] px-6 rounded-full border border-charcoal-foreground/25 text-sm font-semibold hover:bg-charcoal-foreground/10 transition-colors"
              >
                Return to homepage
              </a>
            </div>
          </div>
        </main>
      );
    }
    // Keyed fragment: "Try again" remounts the whole route tree fresh.
    return <Fragment key={this.state.nonce}>{this.props.children}</Fragment>;
  }
}
