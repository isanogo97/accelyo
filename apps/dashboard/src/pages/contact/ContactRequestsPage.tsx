/**
 * Demandes de contact recues depuis le site vitrine (SUPER_ADMIN).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';

interface ContactRequest {
  id: string;
  name: string;
  email: string;
  organization: string | null;
  message: string;
  handled: boolean;
  createdAt: string;
}

export function ContactRequestsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['contact-requests'],
    queryFn: async () => {
      const r = await api.get('/contact');
      return r.data.data.items as ContactRequest[];
    },
  });

  const toggle = useMutation({
    mutationFn: async (v: { id: string; handled: boolean }) => {
      await api.patch(`/contact/${v.id}`, { handled: v.handled });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contact-requests'] }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Demandes de contact</h1>

      {isLoading ? <p className="text-slate-500">Chargement...</p> : null}

      {data && data.length === 0 ? (
        <div className="card p-6 text-slate-500">
          Aucune demande pour le moment.
        </div>
      ) : null}

      <div className="space-y-3">
        {data?.map((c) => (
          <div
            key={c.id}
            className={`card p-4 ${c.handled ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium">
                  {c.name}
                  {c.organization ? (
                    <span className="text-slate-500 font-normal">
                      {' '}
                      - {c.organization}
                    </span>
                  ) : null}
                </div>
                <a
                  href={`mailto:${c.email}`}
                  className="text-sm text-blue-600"
                >
                  {c.email}
                </a>
                <div className="text-xs text-slate-400 mt-0.5">
                  {new Date(c.createdAt).toLocaleString('fr-FR')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggle.mutate({ id: c.id, handled: !c.handled })}
                className="btn-secondary text-sm whitespace-nowrap"
              >
                {c.handled ? 'Marquer non traitee' : 'Marquer traitee'}
              </button>
            </div>
            <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">
              {c.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
