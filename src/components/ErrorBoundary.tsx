import { Component, type ReactNode } from "react";

interface Props { children: ReactNode }
interface State { hasError: boolean; message?: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);
  }

  reset = () => this.setState({ hasError: false, message: undefined });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-background">
        <div className="text-center max-w-sm space-y-4">
          <p className="text-5xl">😬</p>
          <h1 className="text-xl font-extrabold">Algo salió mal</h1>
          <p className="text-sm text-muted-foreground">
            Tuvimos un problema mostrando esta pantalla. Intenta de nuevo o regresa al inicio.
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={this.reset}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
            >
              Reintentar
            </button>
            <a href="/" className="rounded-xl bg-muted px-4 py-2 text-sm font-bold">
              Ir al inicio
            </a>
          </div>
        </div>
      </div>
    );
  }
}
