import { useEffect, useState } from 'react';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { KeyRound, LogIn, LogOut, ShieldCheck, ShieldAlert } from 'lucide-react';

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
  if (!response.ok) throw new Error(body.error ?? 'La operación no pudo completarse.');
  return body;
}

export default function HumanAuthPanel() {
  const [authenticated, setAuthenticated] = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);
  const [reauthenticatedAt, setReauthenticatedAt] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const [bootstrapSecret, setBootstrapSecret] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const refreshSession = async () => {
    const result = await jsonFetch('/api/auth/session');
    const isAuthenticated = Boolean(result.authenticated);
    setAuthenticated(isAuthenticated);
    setExpiresAt(result.expires_at ?? null);
    setReauthenticatedAt(result.reauthenticated_at ?? null);

    if (isAuthenticated) {
      const listed = await jsonFetch('/api/auth/webauthn/credentials');
      setCredentials(Array.isArray(listed.credentials) ? listed.credentials : []);
    } else {
      setCredentials([]);
    }
  };

  useEffect(() => {
    refreshSession().catch(() => {
      setAuthenticated(false);
      setCredentials([]);
    });
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
      setStatus('Sesión humana verificada. La reautenticación es válida durante diez minutos.');
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
        headers: bootstrapSecret ? { 'x-arkhe-bootstrap': bootstrapSecret } : undefined,
      });
      const response = await startRegistration({ optionsJSON: options });
      const result = await jsonFetch('/api/auth/webauthn/register-verify', {
        method: 'POST',
        headers: bootstrapSecret ? { 'x-arkhe-bootstrap': bootstrapSecret } : undefined,
        body: JSON.stringify(response),
      });
      setBootstrapSecret('');
      setStatus(result.bootstrap
        ? 'Passkey principal registrada. Autentica con ella para continuar con la credencial de recuperación.'
        : 'Passkey adicional registrada correctamente.');
      await refreshSession();
    } catch (error) {
      setStatus(error?.message ?? 'No fue posible registrar la passkey.');
    } finally {
      setBusy(false);
    }
  };

  const revokeCredential = async credential => {
    const name = credential.name || 'esta credencial';
    if (!window.confirm('¿Revocar ' + name + '? Esta operación impedirá que esa passkey vuelva a autenticar.')) return;

    setBusy(true);
    setStatus('');
    try {
      await jsonFetch('/api/auth/webauthn/credentials', {
        method: 'POST',
        body: JSON.stringify({ credential_id: credential.id }),
      });
      await refreshSession();
      setStatus('Credencial revocada. La sesión actual permanece activa.');
    } catch (error) {
      setStatus(error?.message ?? 'No fue posible revocar la credencial. Puede ser necesario reautenticarse.');
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    setBusy(true);
    setStatus('');
    try {
      await jsonFetch('/api/auth/session', { method: 'POST' });
      setAuthenticated(false);
      setExpiresAt(null);
      setReauthenticatedAt(null);
      setCredentials([]);
      setStatus('Sesión cerrada.');
    } catch (error) {
      setStatus(error?.message ?? 'No fue posible cerrar la sesión.');
    } finally {
      setBusy(false);
    }
  };

  const activeCredentialCount = credentials.filter(credential => !credential.revoked_at).length;

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
            Registrar passkey inicial
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
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              <div>Sesión válida hasta {expiresAt ? new Date(expiresAt).toLocaleString() : 'fecha no disponible'}.</div>
              <div className="mt-1">
                Última reautenticación: {reauthenticatedAt ? new Date(reauthenticatedAt).toLocaleString() : 'pendiente'}.
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={login}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 hover:border-indigo-500 disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                Reautenticar
              </button>
              <button
                type="button"
                onClick={register}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg border border-indigo-700 bg-indigo-950/50 px-3 py-2 text-xs font-medium text-indigo-200 hover:border-indigo-500 disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" />
                Registrar otra passkey
              </button>
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
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Passkeys registradas</h3>
              <span className="text-xs text-slate-500">{activeCredentialCount} activa(s)</span>
            </div>

            {credentials.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500">No hay metadatos de credenciales disponibles.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {credentials.map(credential => {
                  const revoked = Boolean(credential.revoked_at);
                  return (
                    <li key={credential.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-800 px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-200">
                          {credential.name || 'Passkey sin nombre'}
                          {revoked && <span className="ml-2 text-rose-300">Revocada</span>}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          Registrada: {credential.created_at ? new Date(credential.created_at).toLocaleString() : 'fecha desconocida'}
                        </div>
                        {credential.last_used_at && (
                          <div className="text-[11px] text-slate-500">
                            Último uso: {new Date(credential.last_used_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                      {!revoked && (activeCredentialCount > 1) && (
                        <button
                          type="button"
                          onClick={() => revokeCredential(credential)}
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-md border border-rose-900 px-2 py-1 text-xs text-rose-300 hover:border-rose-600 disabled:opacity-50"
                        >
                          <ShieldAlert className="h-3.5 w-3.5" />
                          Revocar
                        </button>
                      )}
                      {!revoked && activeCredentialCount === 1 && (
                        <span className="text-[11px] text-amber-300">Única activa; no revocable</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {status && <p role="status" className="mt-3 text-xs text-slate-400">{status}</p>}
    </section>
  );
}
