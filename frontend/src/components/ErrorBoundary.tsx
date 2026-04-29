import { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Optional fallback renderer; default fallback is used if omitted. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  eventId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, eventId: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, eventId: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Always log so devs see it in the console
    console.error('[ErrorBoundary]', error, errorInfo);

    // Forward to Sentry in production so we actually notice
    try {
      const eventId = Sentry.captureException(error, {
        contexts: { react: { componentStack: errorInfo.componentStack } },
      });
      this.setState({ eventId: eventId ?? null });
    } catch {
      /* swallow - Sentry must never break the fallback */
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null, eventId: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      const isDev = import.meta.env.DEV;

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="w-full max-w-lg space-y-6 rounded-2xl border border-border bg-card p-8 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Något gick fel</h1>
                <p className="text-sm text-muted-foreground">
                  Vi har loggat felet och tittar på det.
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              {this.state.error.message ||
                'Ett oväntat fel uppstod. Prova att ladda om sidan eller gå tillbaka till startsidan.'}
            </p>

            {this.state.eventId && (
              <p className="text-xs text-muted-foreground font-mono">
                Referens: {this.state.eventId.slice(0, 8)}
              </p>
            )}

            {isDev && this.state.error.stack && (
              <details className="rounded-md border border-border bg-muted/40 p-3 text-xs">
                <summary className="cursor-pointer font-semibold text-foreground">
                  Stack trace (endast i dev)
                </summary>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" asChild>
                <a href="/">
                  <Home className="mr-1.5 h-4 w-4" />
                  Till startsidan
                </a>
              </Button>
              <Button variant="outline" onClick={this.reset}>
                Försök igen
              </Button>
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Ladda om sidan
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
