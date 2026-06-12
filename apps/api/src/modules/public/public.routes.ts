/**
 * Routes /api/v1/public/*  -  DIFFUSION PUBLIQUE (SANS AUTH).
 * ================================================================
 * PUBLIC PAR CONCEPTION. Ces endpoints servent UNIQUEMENT les images
 * de BRANDING etablissement (logo, fond de carte), qui ne sont PAS des
 * donnees sensibles.
 *
 * Pourquoi public et same-origin ?
 *   - Les serveurs Google Wallet / Apple Wallet doivent telecharger ces
 *     images pour habiller le passe. Une URL presignee MinIO expirerait;
 *     on streame donc depuis notre propre serveur via une URL stable.
 *   - On ne JAMAIS expose MinIO directement (ni d'URL presignee ici).
 *
 * INTERDIT ICI: la photo de l'etudiant (donnee perso). Elle n'est servie
 * QUE via une URL presignee courte dans /student-auth/me (authentifie).
 *
 * Cle MinIO branding: `branding/<universityId>/logo`  et
 *                     `branding/<universityId>/card-bg`.
 */
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { getObject } from '../../services/storageService';
import { NotFoundError } from '../../utils/errors';

const router = Router();

/**
 * Streame un objet branding MinIO vers le client avec cache court.
 * 404 si l'objet est absent (erreur MinIO NotFound/NoSuchKey).
 */
async function streamBranding(
  objectKey: string,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { stream, contentType, size } = await getObject(objectKey);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(size));
    // Branding non sensible -> cache court partage (CDN/proxy/wallet OK).
    res.setHeader('Cache-Control', 'public, max-age=300');

    stream.on('error', () => {
      // Erreur en cours de lecture du flux: on coupe proprement.
      if (!res.headersSent) {
        next(new NotFoundError('Image de branding introuvable'));
      } else {
        res.end();
      }
    });
    stream.pipe(res);
  } catch {
    // statObject/getObject a echoue (objet absent) -> 404.
    next(new NotFoundError('Image de branding introuvable'));
  }
}

/** Logo de l'etablissement (image raster uploadee par l'admin). */
router.get(
  '/establishments/:id/logo',
  (req: Request, res: Response, next: NextFunction) => {
    const id = String(req.params.id);
    void streamBranding(`branding/${id}/logo`, res, next);
  },
);

/** Visuel de fond de carte de l'etablissement. */
router.get(
  '/establishments/:id/card-bg',
  (req: Request, res: Response, next: NextFunction) => {
    const id = String(req.params.id);
    void streamBranding(`branding/${id}/card-bg`, res, next);
  },
);

export default router;
