/**
 * Page detail d'une universite (SUPER_ADMIN).
 * ----------------------------------------------------------------
 * Affiche:
 *   - Infos generales
 *   - Informations administratives (siteCode, SIRET, adresse...)
 *   - Personnes a contacter (CRUD contacts)
 *   - Stats (etudiants, cartes actives, validations 30j, lecteurs)
 *   - Liste des admins/staff
 *   - Bouton "Creer un compte admin"
 *
 * Flux mot de passe admin:
 *   - A la creation d'un admin, l'API envoie par e-mail le mot de passe
 *     provisoire (emailed: true). En fallback (envoi echoue), elle renvoie
 *     temporaryPassword a communiquer manuellement.
 *   - Un super-admin peut reinitialiser le mot de passe d'un admin existant
 *     (POST /admins/:userId/reset-password), meme logique e-mail/fallback.
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';

type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  createdAt: string;
};

type University = {
  id: string;
  name: string;
  domain: string;
  sector: string | null;
  siret: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  siteCode: string | null;
  isActive: boolean;
  deploymentMode: string;
  brandColor: string | null;
  logoUrl: string | null;
  _count?: { students: number; admins: number; readers: number };
  contacts?: Contact[];
};

export function UniversityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [createdAdminCreds, setCreatedAdminCreds] = useState<{
    email: string;
    emailed: boolean;
    password: string | null;
  } | null>(null);
  // Resultat de la reinitialisation de mot de passe d'un admin existant.
  const [resetResult, setResetResult] = useState<{
    email: string;
    emailed: boolean;
    password: string | null;
  } | null>(null);

  const univ = useQuery({
    queryKey: ['university', id],
    queryFn: async () => {
      const r = await api.get(`/universities/${id}`);
      return r.data.data as University;
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
        emailed: boolean;
        // Present uniquement en fallback (envoi d'e-mail echoue).
        temporaryPassword?: string;
      };
    },
    onSuccess: (data) => {
      setCreatedAdminCreds({
        email: data.user.email,
        emailed: data.emailed,
        password: data.emailed ? null : data.temporaryPassword ?? null,
      });
      setShowAdminModal(false);
      qc.invalidateQueries({ queryKey: ['university', id, 'admins'] });
    },
  });

  // Reinitialisation du mot de passe d'un admin (super-admin uniquement).
  const resetPassword = useMutation({
    mutationFn: async (input: { userId: string; email: string }) => {
      const r = await api.post(
        `/universities/${id}/admins/${input.userId}/reset-password`,
      );
      return {
        email: input.email,
        result: r.data.data as {
          emailed: boolean;
          temporaryPassword?: string;
        },
      };
    },
    onSuccess: ({ email, result }) => {
      setResetResult({
        email,
        emailed: result.emailed,
        password: result.emailed ? null : result.temporaryPassword ?? null,
      });
    },
  });

  const updateBranding = useMutation({
    mutationFn: async (input: {
      sector: string;
      brandColor: string;
      logoUrl: string | null;
    }) => {
      const r = await api.put(`/universities/${id}`, {
        sector: input.sector,
        brandColor: input.brandColor,
        // logoUrl optionnel: on n'envoie le champ que s'il est renseigne.
        ...(input.logoUrl ? { logoUrl: input.logoUrl } : {}),
      });
      return r.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university', id] });
    },
  });

  const addContact = useMutation({
    mutationFn: async (input: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      jobTitle?: string;
    }) => {
      const r = await api.post(`/universities/${id}/contacts`, input);
      return r.data.data as Contact;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university', id] });
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (contactId: string) => {
      await api.delete(`/universities/${id}/contacts/${contactId}`);
      return contactId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['university', id] });
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

      {/* Informations administratives */}
      <InfoCard univ={univ.data} />

      {/* Statistiques + placeholders Wallet / Bons plans */}
      <StatsCard
        students={stats.data?.students}
        activeCards={stats.data?.activeCards}
        validations30d={stats.data?.validations30d}
        loading={stats.isLoading}
      />

      {/* Identite visuelle / branding */}
      <BrandingCard
        sector={univ.data.sector ?? 'SCHOOL'}
        brandColor={univ.data.brandColor ?? '#2563eb'}
        logoUrl={univ.data.logoUrl ?? null}
        onSubmit={(v) => updateBranding.mutate(v)}
        submitting={updateBranding.isPending}
        saved={updateBranding.isSuccess}
        error={
          updateBranding.error
            ? (updateBranding.error as { response?: { data?: { error?: { message?: string } } } })
                .response?.data?.error?.message ?? 'Erreur'
            : null
        }
      />

      {/* Personnes a contacter */}
      <ContactsCard
        contacts={univ.data.contacts ?? []}
        onAdd={(v) => addContact.mutate(v)}
        onDelete={(cid) => deleteContact.mutate(cid)}
        adding={addContact.isPending}
        added={addContact.isSuccess}
        deletingId={deleteContact.isPending ? deleteContact.variables ?? null : null}
        addError={
          addContact.error
            ? (addContact.error as { response?: { data?: { error?: { message?: string } } } })
                .response?.data?.error?.message ?? 'Erreur'
            : null
        }
        deleteError={
          deleteContact.error
            ? (deleteContact.error as { response?: { data?: { error?: { message?: string } } } })
                .response?.data?.error?.message ?? 'Erreur'
            : null
        }
      />

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
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {admins.data?.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-slate-500">
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
                  <td className="py-2 text-right">
                    <button
                      onClick={() =>
                        resetPassword.mutate({ userId: a.id, email: a.email })
                      }
                      disabled={
                        resetPassword.isPending &&
                        resetPassword.variables?.userId === a.id
                      }
                      className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                    >
                      {resetPassword.isPending &&
                      resetPassword.variables?.userId === a.id
                        ? 'Reinitialisation...'
                        : 'Reinitialiser le mot de passe'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Erreur de reinitialisation (en dehors d'une ligne) */}
        {resetPassword.error ? (
          <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
            {(resetPassword.error as {
              response?: { data?: { error?: { message?: string } } };
            }).response?.data?.error?.message ?? 'Erreur'}
          </div>
        ) : null}
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

      {/* Resultat de la creation d'admin */}
      {createdAdminCreds ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6 space-y-3">
            <h2 className="text-lg font-semibold text-green-700">
              Admin cree
            </h2>
            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-sm font-mono space-y-1">
              <div>
                Email: <span className="font-bold">{createdAdminCreds.email}</span>
              </div>
            </div>
            {createdAdminCreds.emailed ? (
              <p className="text-sm text-slate-600">
                Un e-mail a ete envoye a l'administrateur avec son mot de passe
                provisoire.
              </p>
            ) : (
              <>
                <p className="text-sm text-slate-600">
                  Communique ce mot de passe a l'administrateur.
                  <br />
                  <strong>Ce mot de passe ne sera plus affiche.</strong>
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded p-3 text-sm font-mono">
                  <div>
                    MDP temp:{' '}
                    <span className="font-bold">
                      {createdAdminCreds.password}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-amber-600">
                  (l'envoi d'e-mail a echoue, communiquez-le manuellement)
                </p>
              </>
            )}
            <button
              onClick={() => setCreatedAdminCreds(null)}
              className="btn-primary w-full"
            >
              {createdAdminCreds.emailed ? 'Fermer' : "J'ai note - fermer"}
            </button>
          </div>
        </div>
      ) : null}

      {/* Resultat de la reinitialisation de mot de passe */}
      {resetResult ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6 space-y-3">
            <h2 className="text-lg font-semibold text-green-700">
              Mot de passe reinitialise
            </h2>
            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-sm font-mono space-y-1">
              <div>
                Email: <span className="font-bold">{resetResult.email}</span>
              </div>
            </div>
            {resetResult.emailed ? (
              <p className="text-sm text-slate-600">
                Un e-mail a ete envoye a l'administrateur avec son mot de passe
                provisoire.
              </p>
            ) : (
              <>
                <p className="text-sm text-slate-600">
                  Communique ce mot de passe a l'administrateur.
                  <br />
                  <strong>Ce mot de passe ne sera plus affiche.</strong>
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded p-3 text-sm font-mono">
                  <div>
                    MDP temp:{' '}
                    <span className="font-bold">{resetResult.password}</span>
                  </div>
                </div>
                <p className="text-xs text-amber-600">
                  (l'envoi d'e-mail a echoue, communiquez-le manuellement)
                </p>
              </>
            )}
            <button
              onClick={() => {
                setResetResult(null);
                resetPassword.reset();
              }}
              className="btn-primary w-full"
            >
              {resetResult.emailed ? 'Fermer' : "J'ai note - fermer"}
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

const DEPLOYMENT_LABELS: Record<string, string> = {
  SAAS: 'SaaS (mutualise)',
  DEDICATED: 'Dedie',
  ON_PREMISE: 'On-premise',
};

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="text-sm mt-0.5 break-words">
        {value && value.trim() ? value : <span className="text-slate-400">-</span>}
      </div>
    </div>
  );
}

function InfoCard({ univ }: { univ: University }) {
  return (
    <div className="card p-6 space-y-4">
      <h2 className="text-lg font-medium">Informations</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoRow label="Nom" value={univ.name} />
        <InfoRow label="Domaine" value={univ.domain} />
        <InfoRow label="Numero de site" value={univ.siteCode} />
        <InfoRow label="SIRET" value={univ.siret} />
        <InfoRow label="Adresse" value={univ.address} />
        <InfoRow label="Ville" value={univ.city} />
        <InfoRow label="Code postal" value={univ.postalCode} />
        <InfoRow
          label="Mode de deploiement"
          value={DEPLOYMENT_LABELS[univ.deploymentMode] ?? univ.deploymentMode}
        />
      </div>
    </div>
  );
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 inline-flex items-center gap-1 text-sm text-slate-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
        A venir
      </div>
    </div>
  );
}

function StatsCard(props: {
  students?: number;
  activeCards?: number;
  validations30d?: number;
  loading: boolean;
}) {
  const fmt = (v: number | undefined) =>
    props.loading || v == null ? '...' : v.toLocaleString('fr-FR');
  return (
    <div className="card p-6 space-y-4">
      <h2 className="text-lg font-medium">Statistiques</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Inscrits
          </div>
          <div className="text-2xl font-semibold mt-1">{fmt(props.students)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Cartes actives
          </div>
          <div className="text-2xl font-semibold mt-1">
            {fmt(props.activeCards)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Validations 30j
          </div>
          <div className="text-2xl font-semibold mt-1">
            {fmt(props.validations30d)}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ComingSoon label="Suivi Apple Wallet" />
        <ComingSoon label="Suivi Google Wallet" />
        <ComingSoon label="Bons plans" />
      </div>
    </div>
  );
}

function ContactsCard(props: {
  contacts: Contact[];
  onAdd: (v: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    jobTitle?: string;
  }) => void;
  onDelete: (contactId: string) => void;
  adding: boolean;
  added: boolean;
  deletingId: string | null;
  addError: string | null;
  deleteError: string | null;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  const canSubmit = firstName.trim() !== '' && lastName.trim() !== '';

  const submit = () => {
    if (!canSubmit) return;
    props.onAdd({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      ...(email.trim() ? { email: email.trim() } : {}),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      ...(jobTitle.trim() ? { jobTitle: jobTitle.trim() } : {}),
    });
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setJobTitle('');
  };

  return (
    <div className="card p-6 space-y-4">
      <h2 className="text-lg font-medium">Personnes a contacter</h2>

      <table className="w-full text-sm">
        <thead className="text-left text-slate-600">
          <tr>
            <th className="py-2">Nom</th>
            <th className="py-2">Fonction</th>
            <th className="py-2">E-mail</th>
            <th className="py-2">Telephone</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {props.contacts.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-6 text-slate-500">
                Aucun contact - ajoutez-en un ci-dessous.
              </td>
            </tr>
          ) : (
            props.contacts.map((c) => (
              <tr key={c.id}>
                <td className="py-2 font-medium">
                  {c.lastName} {c.firstName}
                </td>
                <td className="py-2 text-slate-600">
                  {c.jobTitle ?? <span className="text-slate-400">-</span>}
                </td>
                <td className="py-2 text-slate-600">
                  {c.email ?? <span className="text-slate-400">-</span>}
                </td>
                <td className="py-2 text-slate-600">
                  {c.phone ?? <span className="text-slate-400">-</span>}
                </td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => props.onDelete(c.id)}
                    disabled={props.deletingId === c.id}
                    className="text-sm text-red-600 hover:underline disabled:opacity-50"
                  >
                    {props.deletingId === c.id ? 'Suppression...' : 'Supprimer'}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {props.deleteError ? (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {props.deleteError}
        </div>
      ) : null}

      <div className="border-t border-slate-100 pt-4 space-y-3">
        <h3 className="text-sm font-medium text-slate-700">Ajouter un contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-600 mb-1">Prenom *</label>
            <input
              className="input"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Marie"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">Nom *</label>
            <input
              className="input"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Dupont"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">Fonction</label>
            <input
              className="input"
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Responsable scolarite"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">E-mail</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@exemple.fr"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">Telephone</label>
            <input
              className="input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01 23 45 67 89"
            />
          </div>
        </div>

        {props.addError ? (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
            {props.addError}
          </div>
        ) : null}
        {props.added && !props.addError ? (
          <div className="text-sm text-green-700">Contact ajoute.</div>
        ) : null}

        <div className="flex justify-end">
          <button
            disabled={props.adding || !canSubmit}
            onClick={submit}
            className="btn-primary"
          >
            {props.adding ? 'Ajout...' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );
}

const SECTORS: Array<{ value: string; label: string }> = [
  { value: 'SCHOOL', label: 'Etablissement scolaire' },
  { value: 'LIBRARY', label: 'Bibliotheque' },
  { value: 'COMPANY', label: 'Entreprise' },
  { value: 'ASSOCIATION', label: 'Association' },
];

function BrandingCard(props: {
  sector: string;
  brandColor: string;
  logoUrl: string | null;
  onSubmit: (v: {
    sector: string;
    brandColor: string;
    logoUrl: string | null;
  }) => void;
  submitting: boolean;
  saved: boolean;
  error: string | null;
}) {
  const [sector, setSector] = useState(props.sector);
  const [brandColor, setBrandColor] = useState(props.brandColor);
  const [logoUrl, setLogoUrl] = useState(props.logoUrl ?? '');

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Identite visuelle</h2>
        <div
          className="h-8 w-8 rounded-full border border-slate-200"
          style={{ backgroundColor: brandColor }}
          title={brandColor}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-slate-600 mb-1">Secteur</label>
          <select
            className="input"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
          >
            {SECTORS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-600 mb-1">
            Couleur de marque
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="h-9 w-12 rounded border border-slate-200 bg-white p-0.5"
              aria-label="Couleur de marque"
            />
            <input
              className="input flex-1"
              type="text"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              placeholder="#2563eb"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-600 mb-1">
            URL du logo
          </label>
          <input
            className="input"
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://exemple.fr/logo.png"
          />
        </div>
      </div>

      {logoUrl ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Apercu:</span>
          <img
            src={logoUrl}
            alt="Logo"
            className="h-8 max-w-[160px] object-contain"
          />
        </div>
      ) : null}

      {props.error ? (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {props.error}
        </div>
      ) : null}
      {props.saved && !props.error ? (
        <div className="text-sm text-green-700">Identite visuelle enregistree.</div>
      ) : null}

      <div className="flex justify-end">
        <button
          disabled={props.submitting || !/^#[0-9a-fA-F]{6}$/.test(brandColor)}
          onClick={() =>
            props.onSubmit({
              sector,
              brandColor,
              logoUrl: logoUrl.trim() ? logoUrl.trim() : null,
            })
          }
          className="btn-primary"
        >
          {props.submitting ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
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
