/**
 * Liste des lecteurs Elatec enregistres.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';

interface Reader {
  id: string;
  readerId: string;
  label: string;
  location: string;
  isActive: boolean;
  lastSeenAt: string | null;
}

export function ReadersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['readers'],
    queryFn: async () => {
      const r = await api.get<{ data: Reader[] }>('/nfc/readers');
      return r.data.data;
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Lecteurs NFC</h1>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2">Identifiant</th>
              <th className="px-4 py-2">Libelle</th>
              <th className="px-4 py-2">Localisation</th>
              <th className="px-4 py-2">Etat</th>
              <th className="px-4 py-2">Derniere activite</th>
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
              data?.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 font-mono">{r.readerId}</td>
                  <td className="px-4 py-2">{r.label}</td>
                  <td className="px-4 py-2">{r.location}</td>
                  <td className="px-4 py-2">
                    {r.isActive ? 'Actif' : 'Inactif'}
                  </td>
                  <td className="px-4 py-2">
                    {r.lastSeenAt
                      ? new Date(r.lastSeenAt).toLocaleString('fr-FR')
                      : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
