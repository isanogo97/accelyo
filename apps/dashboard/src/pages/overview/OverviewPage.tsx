/**
 * Tableau de bord principal.
 * ----------------------------------------------------------------
 * Adapte au role:
 *   - SUPER_ADMIN: stats GLOBALES + nombre d'universites + drill-down.
 *   - UNIVERSITY_ADMIN/STAFF: stats du tenant uniquement.
 *
 * Les chiffres viennent de /reports/usage qui filtre cote serveur
 * en fonction du role (SUPER_ADMIN = tout, sinon = sa propre univ).
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useMe } from '../../api/me';

interface Usage {
  totalStudents: number;
  activeCards: number;
  validations30d: number;
  adoptionRate: number;
}

export function OverviewPage() {
  const { data: me } = useMe();
  const isSuperAdmin = me?.role === 'SUPER_ADMIN';

  const usage = useQuery({
    queryKey: ['reports', 'usage'],
    queryFn: async () => {
      const r = await api.get<{ data: Usage }>('/reports/usage');
      return r.data.data;
    },
  });

  const universities = useQuery({
    queryKey: ['universities'],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const r = await api.get('/universities');
      return r.data.data as Array<{
        id: string;
        name: string;
        _count: { students: number; readers: number };
      }>;
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">
        {isSuperAdmin
          ? 'Vue globale Accelyo'
          : `Tableau de bord - ${me?.university?.name ?? ''}`}
      </h1>
      <p className="text-sm text-slate-500 mb-6">
        {isSuperAdmin
          ? 'Statistiques agregees sur l\'ensemble des tenants.'
          : 'Statistiques de votre etablissement.'}
      </p>

      {usage.isLoading || !usage.data ? (
        <div className="text-slate-500">Chargement...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat
            label={isSuperAdmin ? 'Etudiants (tous tenants)' : 'Etudiants'}
            value={usage.data.totalStudents}
          />
          <Stat label="Cartes actives" value={usage.data.activeCards} />
          <Stat label="Validations 30j" value={usage.data.validations30d} />
          <Stat
            label="Taux d'adoption"
            value={`${(usage.data.adoptionRate * 100).toFixed(1)}%`}
          />
        </div>
      )}

      {/* Vue par tenant - SUPER_ADMIN uniquement */}
      {isSuperAdmin ? (
        <div className="card mt-8">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-medium">Universites</h2>
            <Link
              to="/universities"
              className="text-sm text-brand-accent underline"
            >
              Tout voir
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-6 py-2">Nom</th>
                <th className="px-6 py-2 text-right">Etudiants</th>
                <th className="px-6 py-2 text-right">Lecteurs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {universities.isLoading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-slate-500">
                    ...
                  </td>
                </tr>
              ) : universities.data?.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-slate-500">
                    Aucune universite enregistree.
                  </td>
                </tr>
              ) : (
                universities.data?.slice(0, 5).map((u) => (
                  <tr key={u.id}>
                    <td className="px-6 py-2">
                      <Link
                        to={`/universities/${u.id}`}
                        className="text-brand-accent underline"
                      >
                        {u.name}
                      </Link>
                    </td>
                    <td className="px-6 py-2 text-right">
                      {u._count.students}
                    </td>
                    <td className="px-6 py-2 text-right">
                      {u._count.readers}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="text-3xl font-semibold mt-2 text-slate-900">{value}</div>
    </div>
  );
}
