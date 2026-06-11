/**
 * Page Universites / Etablissements clients - SUPER_ADMIN UNIQUEMENT (Accelyo).
 * ----------------------------------------------------------------
 * Vue cross-tenant: liste tous les etablissements clients + stats par tenant.
 * Permet:
 *   - Creer un nouvel etablissement
 *   - Voir le numero de site, le secteur, le nombre d'inscrits
 *   - Drill-down sur un etablissement (page detail)
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

type Sector = 'SCHOOL' | 'LIBRARY' | 'COMPANY' | 'ASSOCIATION';

interface UniversityRow {
  id: string;
  name: string;
  domain: string;
  sector: Sector | null;
  siret: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  siteCode: string | null;
  deploymentMode: 'CLOUD' | 'ON_PREMISE';
  brandColor: string | null;
  logoUrl: string | null;
  isActive: boolean;
  _count: { students: number; admins: number; readers: number };
}

const SECTOR_LABELS: Record<Sector, string> = {
  SCHOOL: 'École',
  LIBRARY: 'Bibliothèque',
  COMPANY: 'Entreprise',
  ASSOCIATION: 'Association',
};

const SECTOR_OPTIONS: Array<{ value: Sector; label: string }> = [
  { value: 'SCHOOL', label: 'École' },
  { value: 'LIBRARY', label: 'Bibliothèque' },
  { value: 'COMPANY', label: 'Entreprise' },
  { value: 'ASSOCIATION', label: 'Association' },
];

interface CreateInput {
  name: string;
  domain: string;
  deploymentMode: 'CLOUD' | 'ON_PREMISE';
  sector?: Sector;
  siret?: string;
  address?: string;
  city?: string;
  postalCode?: string;
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
    mutationFn: async (input: CreateInput) => {
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
          <h1 className="text-2xl font-semibold">Établissements clients</h1>
          <p className="text-sm text-slate-500 mt-1">
            Vue cross-tenant - chaque établissement est isolé en BDD.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + Créer un établissement
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2">Nom</th>
              <th className="px-4 py-2">N° de site</th>
              <th className="px-4 py-2">Secteur</th>
              <th className="px-4 py-2">Domaine</th>
              <th className="px-4 py-2 text-right">Inscrits</th>
              <th className="px-4 py-2">État</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-slate-500">
                  Chargement...
                </td>
              </tr>
            ) : data?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-slate-500">
                  Aucun établissement - cliquez "+ Créer un établissement".
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
                  <td className="px-4 py-2 font-mono text-xs">
                    {u.siteCode ?? '-'}
                  </td>
                  <td className="px-4 py-2">
                    {u.sector ? (
                      <span className="px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-700">
                        {SECTOR_LABELS[u.sector]}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{u.domain}</td>
                  <td className="px-4 py-2 text-right">{u._count.students}</td>
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
  onSubmit: (v: CreateInput) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [sector, setSector] = useState<Sector>('SCHOOL');
  const [siret, setSiret] = useState('');
  const [mode, setMode] = useState<'CLOUD' | 'ON_PREMISE'>('CLOUD');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const submit = () => {
    props.onSubmit({
      name: name.trim(),
      domain: domain.trim(),
      deploymentMode: mode,
      sector,
      siret: siret.trim() ? siret.trim() : undefined,
      address: address.trim() ? address.trim() : undefined,
      city: city.trim() ? city.trim() : undefined,
      postalCode: postalCode.trim() ? postalCode.trim() : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold">Créer un établissement</h2>
        <p className="text-xs text-slate-500">
          Le numéro de site est généré automatiquement à partir du code postal.
        </p>

        <div>
          <label className="block text-xs text-slate-600 mb-1">Nom</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Université Paris 1 Panthéon-Sorbonne"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <label className="block text-xs text-slate-600 mb-1">Secteur</label>
            <select
              className="input"
              value={sector}
              onChange={(e) => setSector(e.target.value as Sector)}
            >
              {SECTOR_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              Mode de déploiement
            </label>
            <select
              className="input"
              value={mode}
              onChange={(e) => setMode(e.target.value as 'CLOUD' | 'ON_PREMISE')}
            >
              <option value="CLOUD">Cloud (Accelyo souverain)</option>
              <option value="ON_PREMISE">On-Premise (serveur client)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-600 mb-1">
            Adresse (optionnel)
          </label>
          <input
            className="input"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="12 place du Panthéon"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-600 mb-1">
              Ville (optionnel)
            </label>
            <input
              className="input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Paris"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">
              Code postal (optionnel)
            </label>
            <input
              className="input"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="75005"
              maxLength={5}
            />
          </div>
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
            disabled={props.submitting || !name.trim() || !domain.trim()}
            onClick={submit}
            className="btn-primary"
          >
            {props.submitting ? 'Création...' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}
