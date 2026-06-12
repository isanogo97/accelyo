/**
 * Selecteur d'etablissement reserve au SUPER_ADMIN.
 * Reutilise GET /universities pour cibler universityId dans les modules
 * Contenu / Equipe. Pour les autres roles, ce composant n'est pas affiche.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

interface UniversityOption {
  id: string;
  name: string;
}

export function UniversitySelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['universities', 'options'],
    queryFn: async () => {
      const r = await api.get<{ data: UniversityOption[] }>('/universities');
      return r.data.data;
    },
  });

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-slate-600">Etablissement :</label>
      <select
        className="input max-w-xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">
          {isLoading ? 'Chargement...' : '-- Choisir --'}
        </option>
        {data?.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
    </div>
  );
}
