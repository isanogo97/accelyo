/**
 * Journal d'audit en lecture seule.
 * Filtre par action + pagination.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';

interface AuditRow {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  actorId: string | null;
  actorRole: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export function AuditPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['audit', page],
    queryFn: async () => {
      const r = await api.get('/reports/audit', {
        params: { page, pageSize: 50 },
      });
      return r.data.data as {
        items: AuditRow[];
        totalPages: number;
      };
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Journal d'audit</h1>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Ressource</th>
              <th className="px-4 py-2">Acteur</th>
              <th className="px-4 py-2">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-slate-500">
                  Chargement...
                </td>
              </tr>
            ) : (
              data?.items.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {new Date(a.createdAt).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{a.action}</td>
                  <td className="px-4 py-2">
                    {a.resourceType}
                    {a.resourceId ? ` / ${a.resourceId.slice(0, 8)}` : ''}
                  </td>
                  <td className="px-4 py-2">{a.actorRole ?? 'system'}</td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {a.ipAddress ?? '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {data && data.totalPages > 1 ? (
        <div className="flex gap-2 justify-end mt-4">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="btn-secondary disabled:opacity-50"
          >
            Precedent
          </button>
          <span className="text-sm self-center">
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
