import React, { Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./style.css";
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main className="recovery panel">
        <h1>A small snag.</h1>
        <p>
          Your saved progress is still on this device. Reload to return to the
          puzzle.
        </p>
        <button onClick={() => location.reload()}>Reload Loophole</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
