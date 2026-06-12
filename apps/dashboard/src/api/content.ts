/**
 * Hooks react-query pour le module Contenu.
 * ----------------------------------------------------------------
 * Base API: /content (reponses enveloppees { success, data }).
 * Le SUPER_ADMIN cible un etablissement via universityId (query/body) ;
 * pour admin/editeur l'API force l'etablissement -> ne PAS envoyer universityId.
 */
import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { api } from './client';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: string | null;
  isPinned: boolean;
  publishedAt: string | null;
  expiresAt: string | null;
}

export interface ScheduleEntry {
  id: string;
  title: string;
  location: string | null;
  teacher: string | null;
  startsAt: string;
  endsAt: string;
  program: string | null;
  studentId: string | null;
}

export interface Loan {
  id: string;
  studentId: string;
  bookTitle: string;
  bookAuthor: string | null;
  isbn: string | null;
  borrowedAt: string;
  dueAt: string;
  returnedAt: string | null;
  renewedCount: number;
  maxRenewals: number;
}

export interface Deal {
  id: string;
  title: string;
  description: string | null;
  partner: string | null;
  category: string | null;
  url: string | null;
  code: string | null;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
}

/** Param universityId injecte uniquement quand fourni (SUPER_ADMIN). */
function withUniv(
  universityId: string | undefined,
  extra?: Record<string, string>,
): Record<string, string> | undefined {
  const params: Record<string, string> = { ...(extra ?? {}) };
  if (universityId) params.universityId = universityId;
  return Object.keys(params).length ? params : undefined;
}

/** Ajoute universityId dans le body pour les POST du SUPER_ADMIN. */
function withUnivBody<T extends Record<string, unknown>>(
  body: T,
  universityId?: string,
): T & { universityId?: string } {
  return universityId ? { ...body, universityId } : body;
}

// ---------------- Announcements (Infos) ----------------
export function useAnnouncements(universityId?: string) {
  return useQuery({
    queryKey: ['content', 'announcements', universityId ?? null],
    queryFn: async () => {
      const r = await api.get<{ data: { items: Announcement[] } }>(
        '/content/announcements',
        { params: withUniv(universityId) },
      );
      return r.data.data.items;
    },
  });
}

// ---------------- Schedule (Planning) ----------------
export function useSchedule(universityId?: string) {
  return useQuery({
    queryKey: ['content', 'schedule', universityId ?? null],
    queryFn: async () => {
      const r = await api.get<{ data: { entries: ScheduleEntry[] } }>(
        '/content/schedule',
        { params: withUniv(universityId) },
      );
      return r.data.data.entries;
    },
  });
}

// ---------------- Loans (Bibliotheque) ----------------
export function useLoans(universityId?: string) {
  return useQuery({
    queryKey: ['content', 'loans', universityId ?? null],
    queryFn: async () => {
      const r = await api.get<{ data: { loans: Loan[] } }>('/content/loans', {
        params: withUniv(universityId),
      });
      return r.data.data.loans;
    },
  });
}

// ---------------- Deals (Bons plans) ----------------
export function useDeals(universityId?: string) {
  return useQuery({
    queryKey: ['content', 'deals', universityId ?? null],
    queryFn: async () => {
      const r = await api.get<{ data: { deals: Deal[] } }>('/content/deals', {
        params: withUniv(universityId),
      });
      return r.data.data.deals;
    },
  });
}

/**
 * Fabrique de mutations CRUD generique pour une ressource /content/<path>.
 * Invalide la query liste apres chaque mutation.
 */
export function useContentMutations(
  path: string,
  listKey: QueryKey,
  universityId?: string,
) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: listKey });

  const create = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const r = await api.post(
        `/content/${path}`,
        withUnivBody(body, universityId),
      );
      return r.data.data;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async (vars: {
      id: string;
      body: Record<string, unknown>;
    }) => {
      const r = await api.patch(`/content/${path}/${vars.id}`, vars.body);
      return r.data.data;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/content/${path}/${id}`);
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

/** Extrait un message d'erreur lisible d'une erreur axios. */
export function errMessage(e: unknown): string | null {
  if (!e) return null;
  const ax = e as { response?: { data?: { error?: { message?: string } } } };
  return ax.response?.data?.error?.message ?? 'Une erreur est survenue.';
}

/** ISO <-> datetime-local helpers. */
export function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function localInputToIso(v: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}
