/**
 * Helpers pour produire des reponses API uniformes.
 * Toutes les reponses suivent le format ApiResponse<T>
 * defini dans @accelyo/shared/types/api.
 */

import type { Response } from 'express';
import type { ApiSuccess } from '@accelyo/shared';

export function respondOk<T>(res: Response, data: T, status = 200) {
  const body: ApiSuccess<T> = { success: true, data };
  res.status(status).json(body);
}

export function respondCreated<T>(res: Response, data: T) {
  respondOk(res, data, 201);
}

export function respondNoContent(res: Response) {
  res.status(204).send();
}
