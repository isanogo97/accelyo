/**
 * Liste des etudiants - pagination + recherche.
 * La recherche est exacte (numero etudiant ou email entier) car les
 * champs sont chiffres en base. Pas de "LIKE %x%".
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

interface StudentRow {
  id: string;
  firstName: string;
  lastName: string;
  studentNumber: string;
  email: string;
  enrollmentYear: number;
  program: string | null;
}

export function StudentsListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['students', page, search],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, pageSize: 25 };
      if (search.includes('@')) params.email = search;
      else if (search.length > 0) params.studentNumber = search;
      const r = await api.get('/students', { params });
      return r.data.data as {
        items: StudentRow[];
        total: number;
        totalPages: number;
      };
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Etudiants</h1>
        <div className="flex gap-2">
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
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-slate-500">
                  Chargement...
                </td>
              </tr>
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-slate-500">
                  Aucun etudiant
                </td>
              </tr>
            ) : (
              data?.items.map((s) => (
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
                </tr>
              ))
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
