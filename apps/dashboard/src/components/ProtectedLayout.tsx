/**
 * Layout des pages authentifiees.
 * - Redirige /login si pas de token.
 * - Si mustChangePassword: ecran bloquant de changement de mot de passe.
 * - Sinon: nav laterale + banner contexte tenant.
 */
import { useState } from 'react';
import { Outlet, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { useMe } from '../api/me';
import { api } from '../api/client';

const NAV_BASE = [
  { to: '/overview', label: 'Tableau de bord', roles: 'ALL' as const },
  { to: '/students', label: 'Etudiants', roles: 'ALL' as const },
  { to: '/cards', label: 'Cartes', roles: 'ALL' as const },
  { to: '/readers', label: 'Lecteurs NFC', roles: 'ALL' as const },
  { to: '/audit', label: "Journal d'audit", roles: 'ALL' as const },
  { to: '/universities', label: 'Universites', roles: 'SUPER_ADMIN' as const },
  {
    to: '/contact-requests',
    label: 'Demandes de contact',
    roles: 'SUPER_ADMIN' as const,
  },
  { to: '/settings', label: 'Parametres', roles: 'ALL' as const },
];

function ForcedPasswordChange({ email }: { email: string }) {
  const qc = useQueryClient();
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError('Les deux nouveaux mots de passe ne correspondent pas.');
      return;
    }
    if (next.length < 12) {
      setError('Le nouveau mot de passe doit faire au moins 12 caracteres.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/password', {
        currentPassword: current,
        newPassword: next,
      });
      await qc.invalidateQueries({ queryKey: ['me'] });
    } catch (err: unknown) {
      const e2 = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      setError(e2.response?.data?.error?.message ?? 'Echec du changement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <form onSubmit={submit} className="card p-7 w-full max-w-md space-y-3">
        <h1 className="text-xl font-semibold">Definissez votre mot de passe</h1>
        <p className="text-sm text-slate-600">
          Bienvenue {email}. Pour votre securite, choisissez un nouveau mot de
          passe avant d'acceder a votre espace (min 12 caracteres).
        </p>
        <input
          className="input w-full"
          type="password"
          autoComplete="current-password"
          placeholder="Mot de passe provisoire (recu par e-mail)"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <input
          className="input w-full"
          type="password"
          autoComplete="new-password"
          placeholder="Nouveau mot de passe"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        <input
          className="input w-full"
          type="password"
          autoComplete="new-password"
          placeholder="Confirmer le nouveau mot de passe"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error ? <div className="text-red-600 text-sm">{error}</div> : null}
        <button
          type="submit"
          disabled={loading || !current || !next || !confirm}
          className="btn-primary w-full disabled:opacity-50"
        >
          {loading ? 'Enregistrement...' : 'Definir et continuer'}
        </button>
        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="text-slate-500 text-sm underline w-full"
        >
          Se deconnecter
        </button>
      </form>
    </div>
  );
}

export function ProtectedLayout() {
  const { accessToken, refreshToken, logout } = useAuthStore();
  const navigate = useNavigate();
  const { data: me } = useMe();

  if (!accessToken && !refreshToken) {
    return <Navigate to="/login" replace />;
  }

  if (me?.mustChangePassword) {
    return <ForcedPasswordChange email={me.email} />;
  }

  const onLogout = async () => {
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken });
      } catch {
        // ignore
      }
    }
    logout();
    navigate('/login');
  };

  const nav = NAV_BASE.filter(
    (n) => n.roles === 'ALL' || n.roles === me?.role,
  );

  const isSuperAdmin = me?.role === 'SUPER_ADMIN';

  return (
    <div className="min-h-screen flex flex-col">
      {me ? (
        <div
          className={`px-6 py-2 text-xs font-medium flex items-center justify-between ${
            isSuperAdmin ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="font-semibold uppercase tracking-wider">
              {isSuperAdmin ? 'Accelyo' : me.university?.name ?? 'Universite'}
            </span>
            <span className="opacity-80">
              {isSuperAdmin
                ? 'Acces global - vous voyez tous les tenants'
                : `Tenant isole - ${me.university?.domain ?? ''}`}
            </span>
          </div>
          <div className="opacity-80">{me.email}</div>
        </div>
      ) : null}

      <div className="flex flex-1">
        <aside className="w-60 bg-brand text-white flex flex-col">
          <div className="px-6 py-5 text-xl font-semibold tracking-wide">
            Accelyo
          </div>
          <nav className="flex-1 flex flex-col gap-1 px-3">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `px-3 py-2 rounded text-sm transition-colors ${
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-slate-300 hover:bg-white/5'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="px-4 py-4 text-xs text-slate-400 border-t border-white/10">
            <div className="truncate">{me?.email ?? '...'}</div>
            <div className="text-[10px] uppercase tracking-wider mt-0.5">
              {me?.role.replace('_', ' ').toLowerCase()}
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="mt-2 text-slate-200 underline"
            >
              Deconnexion
            </button>
          </div>
        </aside>
        <main className="flex-1 p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
