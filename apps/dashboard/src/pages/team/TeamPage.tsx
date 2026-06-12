/**
 * Page Equipe - designer / bloquer / restreindre des Editeurs (et du staff).
 * ----------------------------------------------------------------
 * Acces UNIVERSITY_ADMIN / SUPER_ADMIN. Le SUPER_ADMIN cible un etablissement.
 */
import { useState } from 'react';
import { useMe } from '../../api/me';
import { UniversitySelector } from '../../components/UniversitySelector';
import {
  useTeam,
  useTeamMutations,
  roleLabel,
  type TeamMember,
} from '../../api/team';
import { errMessage } from '../../api/content';

function fmtDate(iso: string | null): string {
  if (!iso) return 'Jamais';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TeamPage() {
  const { data: me } = useMe();
  const isSuper = me?.role === 'SUPER_ADMIN';
  const [universityId, setUniversityId] = useState('');
  const univ = isSuper ? universityId : undefined;
  const blocked = isSuper && !universityId;

  const { data, isLoading, error } = useTeam(univ);
  const mutations = useTeamMutations(univ);
  const [showInvite, setShowInvite] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const resetPwd = (m: TeamMember) => {
    setNotice(null);
    mutations.resetPassword.mutate(m.id, {
      onSuccess: () =>
        setNotice(`Un e-mail de reinitialisation a ete envoye a ${m.email}.`),
    });
  };

  const del = (m: TeamMember) => {
    if (window.confirm(`Supprimer ${m.email} ? Cette action est definitive.`)) {
      mutations.remove.mutate(m.id);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Equipe</h1>
          <p className="text-sm text-slate-500 mt-1">
            Designez des Editeurs et du staff, bloquez ou restreignez les acces.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isSuper ? (
            <UniversitySelector
              value={universityId}
              onChange={setUniversityId}
            />
          ) : null}
          {!blocked ? (
            <button className="btn-primary" onClick={() => setShowInvite(true)}>
              + Ajouter un membre
            </button>
          ) : null}
        </div>
      </div>

      {notice ? (
        <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">
          {notice}
        </div>
      ) : null}

      {blocked ? (
        <div className="card p-6 text-slate-500">
          Selectionnez un etablissement pour gerer son equipe.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-2">E-mail</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2">Derniere connexion</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-slate-500">
                    Chargement...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-red-600">
                    {errMessage(error)}
                  </td>
                </tr>
              ) : data && data.length > 0 ? (
                data.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2">{m.email}</td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-700">
                        {roleLabel(m.role)}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {m.isActive ? (
                        <span className="text-green-700">Actif</span>
                      ) : (
                        <span className="text-red-600">Bloque</span>
                      )}
                    </td>
                    <td className="px-4 py-2">{fmtDate(m.lastLoginAt)}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      {m.isActive ? (
                        <button
                          className="text-amber-600 underline mr-3"
                          disabled={mutations.block.isPending}
                          onClick={() => mutations.block.mutate(m.id)}
                        >
                          Bloquer
                        </button>
                      ) : (
                        <button
                          className="text-green-700 underline mr-3"
                          disabled={mutations.unblock.isPending}
                          onClick={() => mutations.unblock.mutate(m.id)}
                        >
                          Debloquer
                        </button>
                      )}
                      <button
                        className="text-brand-accent underline mr-3"
                        disabled={mutations.resetPassword.isPending}
                        onClick={() => resetPwd(m)}
                      >
                        Reinitialiser le mot de passe
                      </button>
                      <button
                        className="text-red-600 underline"
                        disabled={mutations.remove.isPending}
                        onClick={() => del(m)}
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-slate-500">
                    Aucun membre - cliquez "+ Ajouter un membre".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showInvite ? (
        <InviteModal
          onClose={() => setShowInvite(false)}
          invite={mutations.invite}
          onInvited={(email) => {
            setShowInvite(false);
            setNotice(`Invitation envoyee - un e-mail a ete envoye a ${email}.`);
          }}
        />
      ) : null}
    </div>
  );
}

function InviteModal({
  onClose,
  invite,
  onInvited,
}: {
  onClose: () => void;
  invite: ReturnType<typeof useTeamMutations>['invite'];
  onInvited: (email: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'CONTENT_EDITOR' | 'UNIVERSITY_STAFF'>(
    'CONTENT_EDITOR',
  );

  const submit = () => {
    const value = email.trim();
    invite.mutate(
      { email: value, role },
      { onSuccess: () => onInvited(value) },
    );
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold">Ajouter un membre</h2>
        <p className="text-xs text-slate-500">
          Un mot de passe provisoire sera envoye par e-mail au nouveau membre.
        </p>
        <div>
          <label className="block text-xs text-slate-600 mb-1">E-mail</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="prenom.nom@etablissement.fr"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">Role</label>
          <select
            className="input"
            value={role}
            onChange={(e) =>
              setRole(e.target.value as 'CONTENT_EDITOR' | 'UNIVERSITY_STAFF')
            }
          >
            <option value="CONTENT_EDITOR">Editeur</option>
            <option value="UNIVERSITY_STAFF">Staff</option>
          </select>
        </div>
        {invite.error ? (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
            {errMessage(invite.error)}
          </div>
        ) : null}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary">
            Annuler
          </button>
          <button
            className="btn-primary"
            disabled={invite.isPending || !email.trim()}
            onClick={submit}
          >
            {invite.isPending ? 'Envoi...' : 'Inviter'}
          </button>
        </div>
      </div>
    </div>
  );
}
