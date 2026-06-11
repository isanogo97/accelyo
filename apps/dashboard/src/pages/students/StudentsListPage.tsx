/**
 * Liste des etudiants - pagination + recherche.
 * La recherche est exacte (numero etudiant ou email entier) car les
 * champs sont chiffres en base. Pas de "LIKE %x%".
 *
 * Pour le super-admin, cette page liste les etudiants de TOUS les
 * etablissements (l'API ne filtre pas par tenant pour lui). On lui
 * ajoute donc une colonne "Etablissement" et un filtre par etablissement.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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

export function StudentsListPage() {
  const { data: me } = useMe();
  const isSuperAdmin = me?.role === 'SUPER_ADMIN';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [universityId, setUniversityId] = useState('');

  // Liste des etablissements (super-admin uniquement) : sert au filtre et
  // a resoudre universityId -> nom/siteCode dans le tableau.
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

  const colSpan = isSuperAdmin ? 6 : 5;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Etudiants</h1>
        <div className="flex gap-2">
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
            className="input w-64"
            placeholder="Numero ou email exact"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <button className="btn-primary">Importer CSV</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-2">Nom</th>
              <th className="px-4 py-2">Numero</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Promo</th>
              <th className="px-4 py-2">Programme</th>
              {isSuperAdmin ? (
                <th className="px-4 py-2">Etablissement</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-6 text-slate-500">
                  Chargement...
                </td>
              </tr>
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-6 text-slate-500">
                  Aucun etudiant
                </td>
              </tr>
            ) : (
              data?.items.map((s) => {
                const uni = universityMap.get(s.universityId);
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <Link
                        to={`/students/${s.id}`}
                        className="text-brand-accent underline"
                      >
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
                              <span className="text-slate-400 ml-1 font-mono">
                                {uni.siteCode}
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">
                            {s.universityId}
                          </span>
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
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="btn-secondary disabled:opacity-50"
          >
            Precedent
          </button>
          <span className="text-sm text-slate-600">
            Page {page} / {data.totalPages}
          </span>
          <button
            disabled={page === data.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="btn-secondary disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      ) : null}
    </div>
  );
}
