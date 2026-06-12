/**
 * Module Contenu - CRUD Planning / Infos / Bibliotheque / Bons plans.
 * ----------------------------------------------------------------
 * Acces: UNIVERSITY_ADMIN / CONTENT_EDITOR / SUPER_ADMIN.
 * Pour le SUPER_ADMIN un selecteur d'etablissement cible universityId ;
 * pour admin/editeur, l'API force l'etablissement (pas de selecteur).
 */
import { useState } from 'react';
import { useMe } from '../../api/me';
import { UniversitySelector } from '../../components/UniversitySelector';
import {
  useAnnouncements,
  useSchedule,
  useLoans,
  useDeals,
  useContentMutations,
  errMessage,
  isoToLocalInput,
  localInputToIso,
  type Announcement,
  type ScheduleEntry,
  type Deal,
} from '../../api/content';

type Tab = 'schedule' | 'announcements' | 'loans' | 'deals';

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'schedule', label: 'Planning' },
  { key: 'announcements', label: 'Infos' },
  { key: 'loans', label: 'Bibliotheque' },
  { key: 'deals', label: 'Bons plans' },
];

export function ContentPage() {
  const { data: me } = useMe();
  const [tab, setTab] = useState<Tab>('schedule');
  const [universityId, setUniversityId] = useState('');

  const isSuper = me?.role === 'SUPER_ADMIN';
  // Pour le super-admin, on attend qu'un etablissement soit choisi.
  const univ = isSuper ? universityId : undefined;
  const blocked = isSuper && !universityId;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Contenu</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerez le planning, les infos, la bibliotheque et les bons plans
            diffuses aux etudiants.
          </p>
        </div>
        {isSuper ? (
          <UniversitySelector value={universityId} onChange={setUniversityId} />
        ) : null}
      </div>

      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-brand-accent text-brand-accent'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {blocked ? (
        <div className="card p-6 text-slate-500">
          Selectionnez un etablissement pour gerer son contenu.
        </div>
      ) : (
        <>
          {tab === 'schedule' ? <ScheduleSection universityId={univ} /> : null}
          {tab === 'announcements' ? (
            <AnnouncementsSection universityId={univ} />
          ) : null}
          {tab === 'loans' ? <LoansSection universityId={univ} /> : null}
          {tab === 'deals' ? <DealsSection universityId={univ} /> : null}
        </>
      )}
    </div>
  );
}

// ============ Petits composants UI partages ============
function SectionHeader({
  title,
  onAdd,
}: {
  title: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <button className="btn-primary" onClick={onAdd}>
        + Ajouter
      </button>
    </div>
  );
}

function Modal({
  title,
  onClose,
  onSubmit,
  submitting,
  error,
  canSubmit,
  children,
  submitLabel,
}: {
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
  canSubmit: boolean;
  children: React.ReactNode;
  submitLabel: string;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold">{title}</h2>
        {children}
        {error ? (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
            {error}
          </div>
        ) : null}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary">
            Annuler
          </button>
          <button
            disabled={submitting || !canSubmit}
            onClick={onSubmit}
            className="btn-primary"
          >
            {submitting ? 'Enregistrement...' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return '-';
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

// ============ PLANNING ============
function ScheduleSection({ universityId }: { universityId?: string }) {
  const key = ['content', 'schedule', universityId ?? null];
  const { data, isLoading, error } = useSchedule(universityId);
  const { create, update, remove } = useContentMutations(
    'schedule',
    key,
    universityId,
  );
  const [editing, setEditing] = useState<ScheduleEntry | null>(null);
  const [showForm, setShowForm] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setShowForm(true);
  };

  return (
    <div>
      <SectionHeader title="Planning" onAdd={openCreate} />
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2">Cours</th>
              <th className="px-4 py-2">Debut</th>
              <th className="px-4 py-2">Fin</th>
              <th className="px-4 py-2">Lieu</th>
              <th className="px-4 py-2">Enseignant</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-slate-500">
                  Chargement...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-red-600">
                  {errMessage(error)}
                </td>
              </tr>
            ) : data && data.length > 0 ? (
              data.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">{e.title}</td>
                  <td className="px-4 py-2">{fmtDate(e.startsAt)}</td>
                  <td className="px-4 py-2">{fmtDate(e.endsAt)}</td>
                  <td className="px-4 py-2">{e.location ?? '-'}</td>
                  <td className="px-4 py-2">{e.teacher ?? '-'}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <RowActions
                      onEdit={() => {
                        setEditing(e);
                        setShowForm(true);
                      }}
                      onDelete={() => remove.mutate(e.id)}
                      deleting={remove.isPending}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-slate-500">
                  Aucun cours - cliquez "+ Ajouter".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm ? (
        <ScheduleForm
          entry={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => setShowForm(false)}
          create={create}
          update={update}
        />
      ) : null}
    </div>
  );
}

function ScheduleForm({
  entry,
  onClose,
  onSaved,
  create,
  update,
}: {
  entry: ScheduleEntry | null;
  onClose: () => void;
  onSaved: () => void;
  create: ReturnType<typeof useContentMutations>['create'];
  update: ReturnType<typeof useContentMutations>['update'];
}) {
  const [title, setTitle] = useState(entry?.title ?? '');
  const [location, setLocation] = useState(entry?.location ?? '');
  const [teacher, setTeacher] = useState(entry?.teacher ?? '');
  const [program, setProgram] = useState(entry?.program ?? '');
  const [studentId, setStudentId] = useState(entry?.studentId ?? '');
  const [startsAt, setStartsAt] = useState(isoToLocalInput(entry?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(isoToLocalInput(entry?.endsAt ?? null));

  const mut = entry ? update : create;
  const submit = () => {
    const body: Record<string, unknown> = {
      title: title.trim(),
      location: location.trim() || undefined,
      teacher: teacher.trim() || undefined,
      program: program.trim() || undefined,
      studentId: studentId.trim() || undefined,
      startsAt: localInputToIso(startsAt),
      endsAt: localInputToIso(endsAt),
    };
    if (entry) {
      update.mutate({ id: entry.id, body }, { onSuccess: onSaved });
    } else {
      create.mutate(body, { onSuccess: onSaved });
    }
  };

  return (
    <Modal
      title={entry ? 'Modifier le cours' : 'Ajouter un cours'}
      onClose={onClose}
      onSubmit={submit}
      submitting={mut.isPending}
      error={errMessage(mut.error)}
      canSubmit={!!title.trim() && !!startsAt && !!endsAt}
      submitLabel={entry ? 'Enregistrer' : 'Ajouter'}
    >
      <Field label="Intitule">
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Debut">
          <input
            type="datetime-local"
            className="input"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </Field>
        <Field label="Fin">
          <input
            type="datetime-local"
            className="input"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Lieu (optionnel)">
          <input
            className="input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </Field>
        <Field label="Enseignant (optionnel)">
          <input
            className="input"
            value={teacher}
            onChange={(e) => setTeacher(e.target.value)}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Programme (optionnel)">
          <input
            className="input"
            value={program}
            onChange={(e) => setProgram(e.target.value)}
          />
        </Field>
        <Field label="Etudiant cible (UUID, optionnel)">
          <input
            className="input"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="laisser vide = tous"
          />
        </Field>
      </div>
    </Modal>
  );
}

// ============ INFOS (Announcements) ============
function AnnouncementsSection({ universityId }: { universityId?: string }) {
  const key = ['content', 'announcements', universityId ?? null];
  const { data, isLoading, error } = useAnnouncements(universityId);
  const { create, update, remove } = useContentMutations(
    'announcements',
    key,
    universityId,
  );
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <SectionHeader
        title="Infos"
        onAdd={() => {
          setEditing(null);
          setShowForm(true);
        }}
      />
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2">Titre</th>
              <th className="px-4 py-2">Categorie</th>
              <th className="px-4 py-2">Epinglee</th>
              <th className="px-4 py-2">Publiee</th>
              <th className="px-4 py-2">Expire</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-slate-500">
                  Chargement...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-red-600">
                  {errMessage(error)}
                </td>
              </tr>
            ) : data && data.length > 0 ? (
              data.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">{a.title}</td>
                  <td className="px-4 py-2">{a.category ?? '-'}</td>
                  <td className="px-4 py-2">{a.isPinned ? 'Oui' : 'Non'}</td>
                  <td className="px-4 py-2">{fmtDate(a.publishedAt)}</td>
                  <td className="px-4 py-2">{fmtDate(a.expiresAt)}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <RowActions
                      onEdit={() => {
                        setEditing(a);
                        setShowForm(true);
                      }}
                      onDelete={() => remove.mutate(a.id)}
                      deleting={remove.isPending}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-slate-500">
                  Aucune info - cliquez "+ Ajouter".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm ? (
        <AnnouncementForm
          item={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => setShowForm(false)}
          create={create}
          update={update}
        />
      ) : null}
    </div>
  );
}

function AnnouncementForm({
  item,
  onClose,
  onSaved,
  create,
  update,
}: {
  item: Announcement | null;
  onClose: () => void;
  onSaved: () => void;
  create: ReturnType<typeof useContentMutations>['create'];
  update: ReturnType<typeof useContentMutations>['update'];
}) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [body, setBody] = useState(item?.body ?? '');
  const [category, setCategory] = useState(item?.category ?? '');
  const [isPinned, setIsPinned] = useState(item?.isPinned ?? false);
  const [publishedAt, setPublishedAt] = useState(
    isoToLocalInput(item?.publishedAt ?? null),
  );
  const [expiresAt, setExpiresAt] = useState(
    isoToLocalInput(item?.expiresAt ?? null),
  );

  const mut = item ? update : create;
  const submit = () => {
    const data: Record<string, unknown> = {
      title: title.trim(),
      body: body.trim(),
      category: category.trim() || undefined,
      isPinned,
      publishedAt: localInputToIso(publishedAt),
      expiresAt: localInputToIso(expiresAt),
    };
    if (item) update.mutate({ id: item.id, body: data }, { onSuccess: onSaved });
    else create.mutate(data, { onSuccess: onSaved });
  };

  return (
    <Modal
      title={item ? "Modifier l'info" : 'Ajouter une info'}
      onClose={onClose}
      onSubmit={submit}
      submitting={mut.isPending}
      error={errMessage(mut.error)}
      canSubmit={!!title.trim() && !!body.trim()}
      submitLabel={item ? 'Enregistrer' : 'Ajouter'}
    >
      <Field label="Titre">
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>
      <Field label="Contenu">
        <textarea
          className="input min-h-[120px]"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </Field>
      <Field label="Categorie (optionnel)">
        <input
          className="input"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Publiee le (optionnel)">
          <input
            type="datetime-local"
            className="input"
            value={publishedAt}
            onChange={(e) => setPublishedAt(e.target.value)}
          />
        </Field>
        <Field label="Expire le (optionnel)">
          <input
            type="datetime-local"
            className="input"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isPinned}
          onChange={(e) => setIsPinned(e.target.checked)}
        />
        Epingler en haut
      </label>
    </Modal>
  );
}

// ============ BIBLIOTHEQUE (Loans) ============
function LoansSection({ universityId }: { universityId?: string }) {
  const key = ['content', 'loans', universityId ?? null];
  const { data, isLoading, error } = useLoans(universityId);
  const { create, update, remove } = useContentMutations(
    'loans',
    key,
    universityId,
  );
  const [showForm, setShowForm] = useState(false);

  const markReturned = (id: string) =>
    update.mutate({ id, body: { returnedAt: new Date().toISOString() } });

  return (
    <div>
      <SectionHeader title="Bibliotheque" onAdd={() => setShowForm(true)} />
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2">Ouvrage</th>
              <th className="px-4 py-2">Etudiant</th>
              <th className="px-4 py-2">Emprunte</th>
              <th className="px-4 py-2">A rendre</th>
              <th className="px-4 py-2">Statut</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-slate-500">
                  Chargement...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-red-600">
                  {errMessage(error)}
                </td>
              </tr>
            ) : data && data.length > 0 ? (
              data.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    {l.bookTitle}
                    {l.bookAuthor ? (
                      <span className="text-slate-400"> - {l.bookAuthor}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{l.studentId}</td>
                  <td className="px-4 py-2">{fmtDate(l.borrowedAt)}</td>
                  <td className="px-4 py-2">{fmtDate(l.dueAt)}</td>
                  <td className="px-4 py-2">
                    {l.returnedAt ? (
                      <span className="text-green-700">Rendu</span>
                    ) : (
                      <span className="text-amber-600">En cours</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    {!l.returnedAt ? (
                      <button
                        className="text-brand-accent underline mr-3"
                        disabled={update.isPending}
                        onClick={() => markReturned(l.id)}
                      >
                        Marquer rendu
                      </button>
                    ) : null}
                    <button
                      className="text-red-600 underline"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(l.id)}
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-slate-500">
                  Aucun emprunt - cliquez "+ Ajouter".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm ? (
        <LoanForm
          onClose={() => setShowForm(false)}
          onSaved={() => setShowForm(false)}
          create={create}
        />
      ) : null}
    </div>
  );
}

function LoanForm({
  onClose,
  onSaved,
  create,
}: {
  onClose: () => void;
  onSaved: () => void;
  create: ReturnType<typeof useContentMutations>['create'];
}) {
  const [studentId, setStudentId] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [maxRenewals, setMaxRenewals] = useState('2');

  const submit = () => {
    const body: Record<string, unknown> = {
      studentId: studentId.trim(),
      bookTitle: bookTitle.trim(),
      bookAuthor: bookAuthor.trim() || undefined,
      isbn: isbn.trim() || undefined,
      dueAt: localInputToIso(dueAt),
      maxRenewals: maxRenewals ? Number(maxRenewals) : undefined,
    };
    create.mutate(body, { onSuccess: onSaved });
  };

  return (
    <Modal
      title="Ajouter un emprunt"
      onClose={onClose}
      onSubmit={submit}
      submitting={create.isPending}
      error={errMessage(create.error)}
      canSubmit={!!studentId.trim() && !!bookTitle.trim() && !!dueAt}
      submitLabel="Ajouter"
    >
      <Field label="Etudiant (UUID)">
        <input
          className="input"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        />
      </Field>
      <Field label="Titre de l'ouvrage">
        <input
          className="input"
          value={bookTitle}
          onChange={(e) => setBookTitle(e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Auteur (optionnel)">
          <input
            className="input"
            value={bookAuthor}
            onChange={(e) => setBookAuthor(e.target.value)}
          />
        </Field>
        <Field label="ISBN (optionnel)">
          <input
            className="input"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="A rendre le">
          <input
            type="datetime-local"
            className="input"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
        </Field>
        <Field label="Renouvellements max">
          <input
            type="number"
            className="input"
            value={maxRenewals}
            onChange={(e) => setMaxRenewals(e.target.value)}
            min={0}
          />
        </Field>
      </div>
    </Modal>
  );
}

// ============ BONS PLANS (Deals) ============
function DealsSection({ universityId }: { universityId?: string }) {
  const key = ['content', 'deals', universityId ?? null];
  const { data, isLoading, error } = useDeals(universityId);
  const { create, update, remove } = useContentMutations(
    'deals',
    key,
    universityId,
  );
  const [editing, setEditing] = useState<Deal | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <SectionHeader
        title="Bons plans"
        onAdd={() => {
          setEditing(null);
          setShowForm(true);
        }}
      />
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2">Titre</th>
              <th className="px-4 py-2">Partenaire</th>
              <th className="px-4 py-2">Categorie</th>
              <th className="px-4 py-2">Actif</th>
              <th className="px-4 py-2">Expire</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-slate-500">
                  Chargement...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-red-600">
                  {errMessage(error)}
                </td>
              </tr>
            ) : data && data.length > 0 ? (
              data.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">{d.title}</td>
                  <td className="px-4 py-2">{d.partner ?? '-'}</td>
                  <td className="px-4 py-2">{d.category ?? '-'}</td>
                  <td className="px-4 py-2">
                    {d.isActive ? (
                      <span className="text-green-700">Oui</span>
                    ) : (
                      <span className="text-slate-400">Non</span>
                    )}
                  </td>
                  <td className="px-4 py-2">{fmtDate(d.expiresAt)}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <RowActions
                      onEdit={() => {
                        setEditing(d);
                        setShowForm(true);
                      }}
                      onDelete={() => remove.mutate(d.id)}
                      deleting={remove.isPending}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-slate-500">
                  Aucun bon plan - cliquez "+ Ajouter".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm ? (
        <DealForm
          item={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => setShowForm(false)}
          create={create}
          update={update}
        />
      ) : null}
    </div>
  );
}

function DealForm({
  item,
  onClose,
  onSaved,
  create,
  update,
}: {
  item: Deal | null;
  onClose: () => void;
  onSaved: () => void;
  create: ReturnType<typeof useContentMutations>['create'];
  update: ReturnType<typeof useContentMutations>['update'];
}) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [partner, setPartner] = useState(item?.partner ?? '');
  const [category, setCategory] = useState(item?.category ?? '');
  const [url, setUrl] = useState(item?.url ?? '');
  const [code, setCode] = useState(item?.code ?? '');
  const [isActive, setIsActive] = useState(item?.isActive ?? true);
  const [startsAt, setStartsAt] = useState(
    isoToLocalInput(item?.startsAt ?? null),
  );
  const [expiresAt, setExpiresAt] = useState(
    isoToLocalInput(item?.expiresAt ?? null),
  );

  const mut = item ? update : create;
  const submit = () => {
    const body: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim() || undefined,
      partner: partner.trim() || undefined,
      category: category.trim() || undefined,
      url: url.trim() || undefined,
      code: code.trim() || undefined,
      isActive,
      startsAt: localInputToIso(startsAt),
      expiresAt: localInputToIso(expiresAt),
    };
    if (item) update.mutate({ id: item.id, body }, { onSuccess: onSaved });
    else create.mutate(body, { onSuccess: onSaved });
  };

  return (
    <Modal
      title={item ? 'Modifier le bon plan' : 'Ajouter un bon plan'}
      onClose={onClose}
      onSubmit={submit}
      submitting={mut.isPending}
      error={errMessage(mut.error)}
      canSubmit={!!title.trim()}
      submitLabel={item ? 'Enregistrer' : 'Ajouter'}
    >
      <Field label="Titre">
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>
      <Field label="Description (optionnel)">
        <textarea
          className="input min-h-[100px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Partenaire (optionnel)">
          <input
            className="input"
            value={partner}
            onChange={(e) => setPartner(e.target.value)}
          />
        </Field>
        <Field label="Categorie (optionnel)">
          <input
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Lien (optionnel)">
          <input
            className="input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </Field>
        <Field label="Code promo (optionnel)">
          <input
            className="input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Debut (optionnel)">
          <input
            type="datetime-local"
            className="input"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </Field>
        <Field label="Expire le (optionnel)">
          <input
            type="datetime-local"
            className="input"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        Actif (visible par les etudiants)
      </label>
    </Modal>
  );
}

// ============ Actions de ligne partagees ============
function RowActions({
  onEdit,
  onDelete,
  deleting,
}: {
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <>
      <button className="text-brand-accent underline mr-3" onClick={onEdit}>
        Editer
      </button>
      <button
        className="text-red-600 underline"
        disabled={deleting}
        onClick={() => {
          if (window.confirm('Confirmer la suppression ?')) onDelete();
        }}
      >
        Supprimer
      </button>
    </>
  );
}
