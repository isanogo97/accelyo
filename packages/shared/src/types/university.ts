/**
 * Types pour les universites (tenants).
 */

import type { DeploymentMode } from '../enums';

/**
 * Configuration des lecteurs Elatec rattaches a une universite.
 * Cette config est stockee en JSONB cote BDD.
 * ATTENTION: les cles d'API des lecteurs sont chiffrees (AES-256-GCM)
 * AVANT d'etre persistees - voir cryptoService.encryptJSON().
 */
export interface NfcConfig {
  readers: Array<{
    id: string;
    label: string;
    location: string;
    /** Endpoint TCP du lecteur si mode reseau. */
    endpoint?: string;
    /** Cle d'API chiffree - inutilisable directement. */
    apiKeyEnc: string;
  }>;
}

/**
 * Configuration de l'integration Izly (CROUS).
 * Soit deeplink simple (toujours dispo), soit API partenaire si negociee.
 */
export interface IzlyConfig {
  mode: 'deeplink' | 'api_partner';
  /** Cle API chiffree si mode api_partner. */
  apiKeyEnc?: string;
}

export interface University {
  id: string;
  name: string;
  /** Domaine email de l'universite, ex: univ-paris1.fr */
  domain: string;
  siret: string | null;
  deploymentMode: DeploymentMode;
  nfcConfig: NfcConfig | null;
  izlyConfig: IzlyConfig | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUniversityInput {
  name: string;
  domain: string;
  siret?: string;
  deploymentMode: DeploymentMode;
}
