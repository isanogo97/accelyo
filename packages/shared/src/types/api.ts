/**
 * Types generiques pour les reponses API.
 * Tous les endpoints renvoient soit ApiSuccess<T>, soit ApiError.
 */

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    /** Champs specifiques a l'erreur (ex: erreurs Zod par champ). */
    fields?: Record<string, string[]>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/** Pagination cote serveur - format unique pour toutes les listes. */
export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
