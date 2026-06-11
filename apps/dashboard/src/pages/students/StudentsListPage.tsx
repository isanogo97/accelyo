/**
 * Liste des etudiants - creation, import CSV, recherche, pagination.
 * Recherche exacte (numero ou email entier) car les champs sont chiffres.
 * Super-admin: voit tous les etablissements (colonne + filtre).
 */
import { useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useMe } from '../../api/me';

interface StudentRow {
  id: string;
  firstName: string;
  lastName: string;
  studentNumber: string;
  email: string;
  enrollmentYear: number;
  program: string | null;
  universityId: string;
}

interface UniversityOption {
  id: string;
  name: string;
  siteCode: string | null;
}

function apiError(e: unknown): string {
  const err = e as { response?: { data?: { error?: { message?: string } } } };
  return err.response?.data?.error?.message ?? 'Une erreur est survenue.';
}

export function StudentsListPage() {
  const { data: me } = useMe();
  const isSuperAdmin = me?.role === 'SUPER_ADMIN';
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: universities } = useQuery({
    queryKey: ['universities', 'options'],
    enabled: isSuperAdmin,
    staleTime: 60_000,
    queryFn: async () => {
      const r = await api.get<{ data: UniversityOption[] }>('/universities');
      return r.data.data;
    },
  });

  const universityMap = useMemo(() => {
    const m = new Map<string, UniversityOption>();
    for (const u of universities ?? []) m.set(u.id, u);
    return m;
  }, [universities]);

  const { data, isLoading } = useQuery({
    queryKey: ['students', page, search, isSuperAdmin ? universityId : ''],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, pageSize: 25 };
      if (search.includes('@')) params.email = search;
      else if (search.length > 0) params.studentNumber = search;
      if (isSuperAdmin && universityId) params.universityId = universityId;
      const r = await api.get('/students', { params });
      return r.data.data as {
        items: StudentRow[];
        total: number;
        totalPages: number;
      };
    },
  });

  // Etablissement cible pour creation/import: l'admin a le sien, le
  // super-admin doit en choisir un (via le filtre ou le formulaire).
  const refresh = () => qc.invalidateQueries({ queryKey: ['students'] });

  // ----- Import CSV -----
  const onPickFile = () => {
    setImportMsg(null);
    if (isSuperAdmin && !universityId) {
      setImportMsg(
        'Choisis d\'abord un etablissement (filtre en haut) avant d\'importer.',
      );
      return;
    }
    fileRef.current?.click();
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportMsg('Import en cours...');
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (isSuperAdmin && universityId) fd.append('universityId', universityId);
      const r = await api.post('/students/import', fd);
      const res = r.data.data as { created?: number; errors?: unknown[] };
      const created = res.created ?? 0;
      const errs = res.errors?.length ?? 0;
      setImportMsg(
        `Import termine : ${created} etudiant(s) cree(s)` +
          (errs ? `, ${errs} ligne(s) en erreur.` : '.'),
      );
      refresh();
    } catch (err) {
      setImportMsg('Echec de l\'import : ' + apiError(err));
    }
  };

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={onFileSelected}
      />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Etudiants</h1>
        <div className="flex gap-2 items-center">
          {isSuperAdmin ? (
            <select
              className="input w-56"
              value={universityId}
              onChange={(e) => {
                setUniversityId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tous les etablissements</option>
              {universities?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.siteCode ? `${u.name} (${u.siteCode})` : u.name}
                </option>
              ))}
            </select>
          ) : null}
          <input
            className="input w-56"
            placeholder="Numero ou email exact"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <button className="btn-secondary" onClick={onPickFile}>
            Importer CSV
          </button>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            Creer un etudiant
          </button>
        </div>
      </div>

      {importMsg ? (
        <div className="mb-4 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded px-3 py-2">
          {importMsg}
        </div>
      ) : null}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-2">Nom</th>
              <th className="px-4 py-2">Numero</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Promo</th>
              <th className="px-4 py-2">Programme</th>
              {isSuperAdmin ? <th className="px-4 py-2">Etablissement</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={isSuperAdmin ? 6 : 5} className="px-4 py-6 text-slate-500">
                  Chargement...
                </td>
              </tr>
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={isSuperAdmin ? 6 : 5} className="px-4 py-6 text-slate-500">
                  Aucun etudiant. Cree-en un ou importe un fichier CSV.
                </td>
              </tr>
            ) : (
              data?.items.map((s) => {
                const uni = universityMap.get(s.universityId);
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <Link to={`/students/${s.id}`} className="text-brand-accent underline">
                        {s.firstName} {s.lastName}
                      </Link>
                    </td>
                    <td className="px-4 py-2 font-mono">{s.studentNumber}</td>
                    <td className="px-4 py-2">{s.email}</td>
                    <td className="px-4 py-2">{s.enrollmentYear}</td>
                    <td className="px-4 py-2">{s.program ?? '-'}</td>
                    {isSuperAdmin ? (
                      <td className="px-4 py-2">
                        {uni ? (
                          <span>
                            {uni.name}
                            {uni.siteCode ? (
                              <span className="text-slate-400 ml-1 font-mono">{uni.siteCode}</span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">{s.universityId}</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 ? (
        <div className="flex items-center gap-2 mt-4 justify-end">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary disabled:opacity-50">
            Precedent
          </button>
          <span className="text-sm text-slate-600">Page {page} / {data.totalPages}</span>
          <button disabled={page === data.totalPages} onClick={() => setPage((p) => p + 1)} className="btn-secondary disabled:opacity-50">
            Suivant
          </button>
        </div>
      ) : null}

      {showCreate ? (
        <CreateStudentModal
          isSuperAdmin={!!isSuperAdmin}
          ownUniversityId={me?.universityId ?? null}
          universities={universities ?? []}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function CreateStudentModal(props: {
  isSuperAdmin: boolean;
  ownUniversityId: string | null;
  universities: UniversityOption[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [email, setEmail] = useState('');
  const [enrollmentYear, setEnrollmentYear] = useState(
    new Date().getFullYear(),
  );
  const [program, setProgram] = useState('');
  const [uniId, setUniId] = useState(props.ownUniversityId ?? '');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      const universityId = props.isSuperAdmin ? uniId : props.ownUniversityId;
      if (!universityId) throw new Error('Etablissement requis');
      await api.post('/students', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        studentNumber: studentNumber.trim().toUpperCase(),
        email: email.trim(),
        universityId,
        enrollmentYear: Number(enrollmentYear),
        program: program.trim() || undefined,
      });
    },
    onSuccess: () => props.onCreated(),
    onError: (e) => setError(apiError(e)),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-3">
        <h2 className="text-lg font-medium">Creer un etudiant</h2>
        {props.isSuperAdmin ? (
          <select className="input w-full" value={uniId} onChange={(e) => setUniId(e.target.value)}>
            <option value="">Choisir un etablissement</option>
            {props.universities.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        ) : null}
        <div className="flex gap-2">
          <input className="input w-full" placeholder="Prenom" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <input className="input w-full" placeholder="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <input className="input w-full" placeholder="Numero etudiant (6-20 maj/chiffres)" value={studentNumber} onChange={(e) => setStudentNumber(e.target.value)} />
        <input className="input w-full" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div className="flex gap-2">
          <input className="input w-full" type="number" placeholder="Annee" value={enrollmentYear} onChange={(e) => setEnrollmentYear(Number(e.target.value))} />
          <input className="input w-full" placeholder="Programme (optionnel)" value={program} onChange={(e) => setProgram(e.target.value)} />
        </div>
        {error ? <div className="text-red-600 text-sm">{error}</div> : null}
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-secondary" onClick={props.onClose}>Annuler</button>
          <button
            className="btn-primary disabled:opacity-50"
            disabled={create.isPending || !firstName || !lastName || !studentNumber || !email}
            onClick={() => {
              setError(null);
              create.mutate();
            }}
          >
            {create.isPending ? 'Creation...' : 'Creer'}
          </button>
        </div>
      </div>
    </div>
  );
}
