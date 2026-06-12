/**
 * Hooks react-query pour la gestion d'equipe (editeurs + staff).
 * ----------------------------------------------------------------
 * Base API: /team. Acces UNIVERSITY_ADMIN / SUPER_ADMIN.
 * SUPER_ADMIN cible un etablissement via universityId (query GET / body POST).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export type TeamRole =
  | 'CONTENT_EDITOR'
  | 'UNIVERSITY_STAFF'
  | 'UNIVERSITY_ADMIN'
  | 'SUPER_ADMIN';

export interface TeamMember {
  id: string;
  email: string;
  role: TeamRole;
  isActive: boolean;
  lastLoginAt: string | null;
  mustChangePassword: boolean;
}

const ROLE_LABELS: Record<TeamRole, string> = {
  CONTENT_EDITOR: 'Editeur',
  UNIVERSITY_STAFF: 'Staff',
  UNIVERSITY_ADMIN: 'Administrateur',
  SUPER_ADMIN: 'Super-admin',
};

export function roleLabel(role: TeamRole): string {
  return ROLE_LABELS[role] ?? role;
}

export function useTeam(universityId?: string) {
  return useQuery({
    queryKey: ['team', universityId ?? null],
    queryFn: async () => {
      const r = await api.get<{ data: { users: TeamMember[] } }>('/team', {
        params: universityId ? { universityId } : undefined,
      });
      return r.data.data.users;
    },
  });
}

export function useTeamMutations(universityId?: string) {
  const qc = useQueryClient();
  const key = ['team', universityId ?? null];
  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const invite = useMutation({
    mutationFn: async (input: {
      email: string;
      role: 'CONTENT_EDITOR' | 'UNIVERSITY_STAFF';
    }) => {
      const body: Record<string, unknown> = { ...input };
      if (universityId) body.universityId = universityId;
      const r = await api.post<{ data: { emailed: boolean } }>('/team', body);
      return r.data.data;
    },
    onSuccess: invalidate,
  });

  const block = useMutation({
    mutationFn: async (userId: string) => {
      await api.post(`/team/${userId}/block`);
    },
    onSuccess: invalidate,
  });

  const unblock = useMutation({
    mutationFn: async (userId: string) => {
      await api.post(`/team/${userId}/unblock`);
    },
    onSuccess: invalidate,
  });

  const resetPassword = useMutation({
    mutationFn: async (userId: string) => {
      const r = await api.post<{ data: { emailed: boolean } }>(
        `/team/${userId}/reset-password`,
      );
      return r.data.data;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/team/${userId}`);
    },
    onSuccess: invalidate,
  });

  return { invite, block, unblock, resetPassword, remove };
}
