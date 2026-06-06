/**
 * Page detail d'une universite (SUPER_ADMIN).
 * ----------------------------------------------------------------
 * Affiche:
 *   - Infos generales
 *   - Stats (etudiants, cartes actives, validations 30j, lecteurs)
 *   - Liste des admins/staff
 *   - Bouton "Creer un compte admin"
 *
 * ATTENTION: La creation d'admin renvoie un mot de passe temporaire
 * affiche UNE SEULE FOIS. En production, ce mot de passe devra etre
 * envoye par email a l'admin et ne JAMAIS s'afficher dans le dashboard.
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';

export function UniversityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [createdAdminCreds, setCreatedAdminCreds] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const univ = useQuery({
    queryKey: ['university', id],
    queryFn: async () => {
      const r = await api.get(`/universities/${id}`);
      return r.data.data;
    },
    enabled: !!id,
  });

  const stats = useQuery({
    queryKey: ['university', id, 'stats'],
    queryFn: async () => {
      const r = await api.get(`/universities/${id}/stats`);
      return r.data.data as {
        students: number;
        activeCards: number;
        validations30d: number;
        readers: number;
        adoptionRate: number;
      };
    },
    enabled: !!id,
  });

  const admins = useQuery({
    queryKey: ['university', id, 'admins'],
    queryFn: async () => {
      const r = await api.get(`/universities/${id}/admins`);
      return r.data.data as Array<{
        id: string;
        email: string;
        role: string;
        mfaEnabled: boolean;
        lastLoginAt: string | null;
        createdAt: string;
      }>;
    },
    enabled: !!id,
  });

  const createAdmin = useMutation({
    mutationFn: async (input: { email: string; role: string }) => {
      const r = await api.post(`/universities/${id}/admins`, input);
      return r.data.data as {
        user: { email: string };
        temporaryPassword: string;
      };
    },
    onSuccess: (data) => {
      setCreatedAdminCreds({
        email: data.user.email,
        password: data.temporaryPassword,
      });
      setShowAdminModal(false);
      qc.invalidateQueries({ queryKey: ['university', id, 'admins'] });
    },
  });

  if (univ.isLoading) return <div>Chargement...</div>;
  if (!univ.data) return <div>Universite introuvable</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{univ.data.name}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {univ.data.domain} - {univ.data.deploymentMode}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stat label="Etudiants" value={stats.data?.students ?? '...'} />
        <Stat label="Cartes actives" value={stats.data?.activeCards ?? '...'} />
        <Stat
          label="Validations 30j"
          value={stats.data?.validations30d ?? '...'}
        />
        <Stat label="Lecteurs" value={stats.data?.readers ?? '...'} />
      </div>

      {/* Admins */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Administrateurs</h2>
          <button
            onClick={() => setShowAdminModal(true)}
            className="btn-primary"
          >
            + Creer un admin
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-slate-600">
            <tr>
              <th className="py-2">Email</th>
              <th className="py-2">Role</th>
              <th className="py-2">MFA</th>
              <th className="py-2">Derniere connexion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {admins.data?.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-slate-500">
                  Aucun admin - creez le premier.
                </td>
              </tr>
            ) : (
              admins.data?.map((a) => (
                <tr key={a.id}>
                  <td className="py-2">{a.email}</td>
                  <td className="py-2 text-xs font-mono">{a.role}</td>
                  <td className="py-2">
                    {a.mfaEnabled ? (
                      <span className="text-green-700">Active</span>
                    ) : (
                      <span className="text-amber-600">Desactivee</span>
                    )}
                  </td>
                  <td className="py-2 text-slate-500">
                    {a.lastLoginAt
                      ? new Date(a.lastLoginAt).toLocaleString('fr-FR')
                      : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modale creation admin */}
      {showAdminModal ? (
        <CreateAdminModal
          domain={univ.data.domain}
          onClose={() => setShowAdminModal(false)}
          onSubmit={(v) => createAdmin.mutate(v)}
          submitting={createAdmin.isPending}
          error={
            createAdmin.error
              ? (createAdmin.error as { response?: { data?: { error?: { message?: string } } } })
                  .response?.data?.error?.message ?? 'Erreur'
              : null
          }
        />
      ) : null}

      {/* Affichage one-shot du mot de passe temporaire */}
      {createdAdminCreds ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6 space-y-3">
            <h2 className="text-lg font-semibold text-green-700">
              Admin cree
            </h2>
            <p className="text-sm text-slate-600">
              Communique ces identifiants a l'administrateur.
              <br />
              <strong>Ce mot de passe ne sera plus affiche.</strong>
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-sm font-mono space-y-1">
              <div>
                Email: <span className="font-bold">{createdAdminCreds.email}</span>
              </div>
              <div>
                MDP temp:{' '}
                <span className="font-bold">{createdAdminCreds.password}</span>
              </div>
            </div>
            <button
              onClick={() => setCreatedAdminCreds(null)}
              className="btn-primary w-full"
            >
              J'ai note - fermer
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function CreateAdminModal(props: {
  domain: string;
  onClose: () => void;
  onSubmit: (v: { email: string; role: string }) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('UNIVERSITY_ADMIN');

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold">Creer un compte admin</h2>
        <p className="text-xs text-slate-500">
          Recommandation: utiliser un email du domaine {props.domain}.
        </p>
        <div>
          <label className="block text-xs text-slate-600 mb-1">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={`admin@${props.domain}`}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">Role</label>
          <select
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="UNIVERSITY_ADMIN">
              UNIVERSITY_ADMIN (lecture + ecriture)
            </option>
            <option value="UNIVERSITY_STAFF">
              UNIVERSITY_STAFF (lecture seule)
            </option>
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
            disabled={props.submitting || !email}
            onClick={() => props.onSubmit({ email, role })}
            className="btn-primary"
          >
            {props.submitting ? 'Creation...' : 'Creer'}
          </button>
        </div>
      </div>
    </div>
  );
}
