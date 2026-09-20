import { Component, ErrorInfo, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class RuntimeErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('MornAI runtime render error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
          <div className="w-full max-w-lg rounded-3xl border border-rose-100 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,.12)]">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600 text-sm font-extrabold">!</div>
            <h1 className="mt-4 text-center text-xl font-extrabold text-slate-950">MornAI hit a render error</h1>
            <p className="mt-2 text-center text-sm leading-6 text-slate-500">
              The app caught the crash instead of leaving a blank white screen.
            </p>
            <pre className="mt-5 max-h-40 overflow-auto rounded-2xl bg-slate-950 p-4 text-left text-[11px] leading-5 text-rose-100">
              {this.state.error.message}
            </pre>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-5 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-violet-700"
            >
              Reload MornAI
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RuntimeErrorBoundary>
      <App />
    </RuntimeErrorBoundary>
  </StrictMode>,
);
