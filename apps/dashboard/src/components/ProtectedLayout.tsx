/**
 * Layout des pages authentifiees.
 * ----------------------------------------------------------------
 * Comportement:
 *   - Redirige /login si pas d'access token ni refresh token.
 *   - Affiche la nav laterale adaptee au role.
 *   - Affiche un BANNER en haut indiquant le contexte tenant courant.
 *
 * NE PAS RETIRER le banner - il evite les erreurs operationnelles type
 * "je pense gerer la Sorbonne mais je suis dans Sciences Po".
 */
import { Outlet, NavLink, Navigate, useNavigate } from 'react-router-dom';
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

export function ProtectedLayout() {
  const { accessToken, refreshToken, logout } = useAuthStore();
  const navigate = useNavigate();
  const { data: me } = useMe();

  if (!accessToken && !refreshToken) {
    return <Navigate to="/login" replace />;
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
      {/* Banner contexte tenant - ne PAS retirer (cf comments). */}
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
