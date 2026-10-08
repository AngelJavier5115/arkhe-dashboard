import { useEffect, useState } from 'react';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { KeyRound, LogIn, LogOut, ShieldCheck } from 'lucide-react';

async function jsonFetch(path, init = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error ?? 'La operación no pudo completarse.');
  }
  return body;
}

export default function HumanAuthPanel() {
  const [authenticated, setAuthenticated] = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);
  const [bootstrapSecret, setBootstrapSecret] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const refreshSession = async () => {
    const result = await jsonFetch('/api/auth/session');
    setAuthenticated(Boolean(result.authenticated));
    setExpiresAt(result.expires_at ?? null);
  };

  useEffect(() => {
    refreshSession().catch(() => setAuthenticated(false));
  }, []);

  const login = async () => {
    setBusy(true);
    setStatus('');
    try {
      const options = await jsonFetch('/api/auth/webauthn/options', { method: 'POST' });
      const response = await startAuthentication({ optionsJSON: options });
      await jsonFetch('/api/auth/webauthn/verify', {
        method: 'POST',
        body: JSON.stringify(response),
      });
      await refreshSession();
      setStatus('Sesión humana verificada.');
    } catch (error) {
      setStatus(error?.message ?? 'No fue posible autenticar la sesión.');
    } finally {
      setBusy(false);
    }
  };

  const register = async () => {
    setBusy(true);
    setStatus('');
    try {
      const options = await jsonFetch('/api/auth/webauthn/register-options', {
        method: 'POST',
        headers: bootstrapSecret
          ? { 'x-arkhe-bootstrap': bootstrapSecret }
          : undefined,
      });
      const response = await startRegistration({ optionsJSON: options });
      await jsonFetch('/api/auth/webauthn/register-verify', {
        method: 'POST',
        headers: bootstrapSecret
          ? { 'x-arkhe-bootstrap': bootstrapSecret }
          : undefined,
        body: JSON.stringify(response),
      });
      setBootstrapSecret('');
      setStatus('Passkey registrada. Ahora autentica la sesión.');
      await refreshSession();
    } catch (error) {
      setStatus(error?.message ?? 'No fue posible registrar la passkey.');
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    setBusy(true);
    try {
      await jsonFetch('/api/auth/session', { method: 'POST' });
      setAuthenticated(false);
      setExpiresAt(null);
      setStatus('Sesión cerrada.');
    } catch (error) {
      setStatus(error?.message ?? 'No fue posible cerrar la sesión.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
              Gobierno humano
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Identidad de Ángel derivada de una sesión WebAuthn verificada.
          </p>
        </div>

        <span className="text-xs px-3 py-1.5 rounded-full border border-slate-800 bg-slate-950 text-slate-300">
          {authenticated ? 'Sesión autenticada' : 'Sin sesión'}
        </span>
      </div>

      {!authenticated && (
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            type="password"
            value={bootstrapSecret}
            onChange={event => setBootstrapSecret(event.target.value)}
            placeholder="Bootstrap inicial (solo durante el alta)"
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={register}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 hover:border-indigo-500 disabled:opacity-50"
          >
            <KeyRound className="w-4 h-4" />
            Registrar passkey
          </button>
          <button
            type="button"
            onClick={login}
            disabled={busy}
            className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            Autenticar con passkey
          </button>
        </div>
      )}

      {authenticated && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-400">
            Sesión válida hasta {expiresAt ? new Date(expiresAt).toLocaleString() : 'fecha no disponible'}.
          </span>
          <button
            type="button"
            onClick={logout}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 hover:border-rose-500 disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      )}

      {status && (
        <p className="mt-3 text-xs text-slate-400">
          {status}
        </p>
      )}
    </section>
  );
}
