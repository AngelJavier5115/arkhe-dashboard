import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class AppRenderErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    // Keep diagnostics useful without logging session cookies or request payloads.
    console.error('[Arkhé UI render error]', error?.name ?? 'Error', error?.message ?? 'Unknown render failure');
  }

  render() {
    if (this.state.error) {
      const errorName = this.state.error?.name || 'Error';
      const errorMessage = this.state.error?.message || 'La interfaz encontró un error al mostrarse.';

      return (
        <main
          role="alert"
          className="min-h-screen bg-[#050a14] px-5 py-10 text-slate-100"
        >
          <section className="mx-auto max-w-xl rounded-2xl border border-amber-300/20 bg-slate-900/80 p-5 shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
              Arkhé Core · recuperación de interfaz
            </p>
            <h1 className="mt-3 text-xl font-semibold">No se pudo mostrar esta pantalla</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              La autenticación puede haberse completado aunque la interfaz falle. No repitas operaciones de Gobierno humano ni crees una ronda por este mensaje.
            </p>
            <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/70 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Diagnóstico del navegador
              </p>
              <p className="mt-2 break-words text-sm text-amber-100">{errorName}: {errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Volver a cargar la interfaz
            </button>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Si el error reaparece, conserva el mensaje de diagnóstico y compártelo para corregir la causa.
            </p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRenderErrorBoundary>
      <App />
    </AppRenderErrorBoundary>
  </React.StrictMode>,
);
