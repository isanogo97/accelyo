/**
 * Page Universites - SUPER_ADMIN UNIQUEMENT (Accelyo).
 * ----------------------------------------------------------------
 * Vue cross-tenant: liste toutes les universites + stats par tenant.
 * Permet:
 *   - Creer une nouvelle universite
 *   - Voir les KPIs (etudiants, admins, lecteurs)
 *   - Drill-down sur une universite (page detail)
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

interface UniversityRow {
  id: string;
  name: string;
  domain: string;
  siret: string | null;
  deploymentMode: 'CLOUD' | 'ON_PREMISE';
  isActive: boolean;
  createdAt: string;
  _count: { students: number; admins: number; readers: number };
}

export function UniversitiesListPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['universities'],
    queryFn: async () => {
      const r = await api.get<{ data: UniversityRow[] }>('/universities');
      return r.data.data;
    },
  });

  const createMut = useMutation({
    mutationFn: async (input: {
      name: string;
      domain: string;
      deploymentMode: 'CLOUD' | 'ON_PREMISE';
      siret?: string;
    }) => {
      const r = await api.post('/universities', input);
      return r.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['universities'] });
      setShowCreate(false);
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Universites</h1>
          <p className="text-sm text-slate-500 mt-1">
            Vue cross-tenant - chaque universite est isolee en BDD.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + Nouvelle universite
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2">Nom</th>
              <th className="px-4 py-2">Domaine</th>
              <th className="px-4 py-2">Mode</th>
              <th className="px-4 py-2 text-right">Etudiants</th>
              <th className="px-4 py-2 text-right">Admins</th>
              <th className="px-4 py-2 text-right">Lecteurs</th>
              <th className="px-4 py-2">Etat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-slate-500">
                  Chargement...
                </td>
              </tr>
            ) : data?.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-slate-500">
                  Aucune universite - cliquez "+ Nouvelle universite".
                </td>
              </tr>
            ) : (
              data?.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link
                      to={`/universities/${u.id}`}
                      className="text-brand-accent underline"
                    >
                      {u.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{u.domain}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${
                        u.deploymentMode === 'CLOUD'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {u.deploymentMode === 'CLOUD' ? 'Cloud' : 'On-Premise'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">{u._count.students}</td>
                  <td className="px-4 py-2 text-right">{u._count.admins}</td>
                  <td className="px-4 py-2 text-right">{u._count.readers}</td>
                  <td className="px-4 py-2">
                    {u.isActive ? (
                      <span className="text-green-700">Actif</span>
                    ) : (
                      <span className="text-slate-400">Inactif</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreate ? (
        <CreateUniversityModal
          onClose={() => setShowCreate(false)}
          onSubmit={(v) => createMut.mutate(v)}
          submitting={createMut.isPending}
          error={
            createMut.error
              ? (createMut.error as { response?: { data?: { error?: { message?: string } } } })
                  .response?.data?.error?.message ?? 'Erreur'
              : null
          }
        />
      ) : null}
    </div>
  );
}

function CreateUniversityModal(props: {
  onClose: () => void;
  onSubmit: (v: {
    name: string;
    domain: string;
    deploymentMode: 'CLOUD' | 'ON_PREMISE';
    siret?: string;
  }) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [siret, setSiret] = useState('');
  const [mode, setMode] = useState<'CLOUD' | 'ON_PREMISE'>('CLOUD');

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold">Creer une universite</h2>
        <div>
          <label className="block text-xs text-slate-600 mb-1">Nom</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Universite Paris 1 Pantheon-Sorbonne"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">
            Domaine email
          </label>
          <input
            className="input"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="univ-paris1.fr"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">
            SIRET (optionnel)
          </label>
          <input
            className="input"
            value={siret}
            onChange={(e) => setSiret(e.target.value)}
            placeholder="14 chiffres"
            maxLength={14}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">
            Mode de deploiement
          </label>
          <select
            className="input"
            value={mode}
            onChange={(e) => setMode(e.target.value as 'CLOUD' | 'ON_PREMISE')}
          >
            <option value="CLOUD">Cloud (Accelyo souverain)</option>
            <option value="ON_PREMISE">On-Premise (serveur universite)</option>
          </select>
        </div>
        {props.error ? (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
            {props.error}
          </div>
        ) : null}
        <div className="flex gap-2 justify-end">
          <button onClick={props.onClose} className="btn-secondary">
            Annuler
          </button>
          <button
            disabled={props.submitting || !name || !domain}
            onClick={() =>
              props.onSubmit({
                name,
                domain,
                deploymentMode: mode,
                siret: siret || undefined,
              })
            }
            className="btn-primary"
          >
            {props.submitting ? 'Creation...' : 'Creer'}
          </button>
        </div>
      </div>
    </div>
  );
}
