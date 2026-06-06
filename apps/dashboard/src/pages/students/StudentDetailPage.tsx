/**
 * Detail d'un etudiant: infos + actions sur sa carte.
 */
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['students', id],
    queryFn: async () => {
      const r = await api.get(`/students/${id}`);
      return r.data.data;
    },
    enabled: !!id,
  });

  if (isLoading || !data) return <div>Chargement...</div>;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">
        {data.firstName} {data.lastName}
      </h1>
      <div className="card p-6 space-y-2 text-sm">
        <div>
          <strong>Numero etudiant:</strong> <span className="font-mono">{data.studentNumber}</span>
        </div>
        <div>
          <strong>Email:</strong> {data.email}
        </div>
        <div>
          <strong>Promotion:</strong> {data.enrollmentYear}
        </div>
        <div>
          <strong>Programme:</strong> {data.program ?? '-'}
        </div>
      </div>
    </div>
  );
}
