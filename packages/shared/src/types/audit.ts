/**
 * Types pour le journal d'audit (immuable).
 * Ne JAMAIS supprimer une entree - obligation legale 1 an minimum.
 */

import type { AuditAction } from '../enums';

export interface AuditLog {
  id: string;
  universityId: string | null;
  actorId: string | null;
  actorRole: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

/** Filtres de recherche pour le dashboard d'audit. */
export interface AuditQuery {
  universityId?: string;
  actorId?: string;
  action?: AuditAction;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}
