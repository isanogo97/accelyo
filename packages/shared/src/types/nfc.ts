/**
 * Types echanges entre l'API et les lecteurs Elatec (TWN4/TWN5).
 *
 * Protocole HTTP POST entre lecteur et API:
 *   - Le lecteur signe sa requete avec sa cle d'API.
 *   - L'API verifie la signature, le nonce (anti-replay) et l'horodatage.
 *   - Reponse en moins de 500ms (sinon l'utilisateur sent une latence).
 *
 * ATTENTION: Si vous changez la structure, mettez a jour la config
 * embarquee dans les lecteurs deployes (operation manuelle in-situ).
 */

export interface ElatecValidationRequest {
  reader_id: string;
  reader_location: string;
  card_uid: string;
  /** Timestamp UNIX millisecondes - fenetre de tolerance +/- 30s. */
  timestamp: number;
  /** Nonce unique - anti-replay obligatoire. */
  nonce: string;
  /** HMAC-SHA-256 de la requete avec la cle du lecteur. */
  signature: string;
}

export interface ElatecValidationResponse {
  granted: boolean;
  /** Renseigne uniquement si granted = false. */
  reason?: string;
  /** Optionnel - affichage sur l'ecran du lecteur. */
  student_name?: string;
  /** Optionnel - timestamp UNIX en secondes. */
  expires_at?: number;
}

/** Configuration emise par l'API a l'enregistrement d'un lecteur. */
export interface ReaderConfig {
  reader_id: string;
  api_endpoint: string;
  api_key: string;
  protocols: Array<'ISO14443A' | 'ISO14443B'>;
  timeout_ms: number;
  retry_count: number;
}
