/**
 * Hook + API pour le contexte utilisateur courant.
 * Appele apres login pour savoir QUI on est et QUELLE universite on gere.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from './client';

export interface Me {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'UNIVERSITY_ADMIN' | 'UNIVERSITY_STAFF' | 'STUDENT';
  universityId: string | null;
  mfaEnabled: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  isActive: boolean;
  university: {
    id: string;
    name: string;
    domain: string;
    isActive: boolean;
  } | null;
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const r = await api.get<{ data: Me }>('/me');
      return r.data.data;
    },
    staleTime: 60_000,
  });
}
