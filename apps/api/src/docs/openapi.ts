/**
 * Specification OpenAPI 3.0 de l'API Accelyo.
 * ----------------------------------------------------------------
 * SOURCE DE VERITE de la doc API. Servie a chaud via swagger-ui-express
 * sur GET /docs (UI) et GET /docs.json (spec brute).
 *
 * Pourquoi la spec est-elle en TS (et pas le YAML de docs/) ?
 *   - Elle est inlinee dans le bundle de production : aucune lecture de
 *     fichier au runtime, aucune dependance a un parseur YAML.
 *   - Le typage `as const` garantit qu'on ne casse pas la structure.
 *
 * Quand vous ajoutez/modifiez une route, mettez a jour ce fichier.
 */

const bearer = [{ bearerAuth: [] as string[] }];

const errorResponse = {
  description: 'Erreur',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
    },
  },
};

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Accelyo API',
    description:
      'Plateforme de carte etudiante dematerialisee. Toutes les routes ' +
      '(hors /auth/login, /auth/refresh et /nfc/validate) exigent un Bearer JWT.',
    version: '1.0.0',
    contact: { name: 'Accelyo', email: 'support@accelyo.fr' },
  },
  servers: [
    { url: 'https://api.accelyo.fr/api/v1', description: 'Production' },
    { url: 'http://localhost:3001/api/v1', description: 'Developpement local' },
  ],
  tags: [
    { name: 'Auth', description: 'Authentification, MFA, refresh' },
    { name: 'Universities', description: 'Gestion des universites (SUPER_ADMIN)' },
    { name: 'Students', description: 'Gestion des etudiants' },
    { name: 'Cards', description: 'Emission et cycle de vie des cartes' },
    { name: 'NFC', description: 'Validation par les lecteurs Elatec' },
    { name: 'Mobile', description: 'Endpoints application etudiant' },
    { name: 'Reports', description: 'Statistiques et exports' },
    { name: 'System', description: 'Sante et meta' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      readerApiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Reader-Api-Key',
        description: 'Cle API d un lecteur Elatec (route /nfc/validate).',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string' },
              fields: { type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } } },
            },
          },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          pageSize: { type: 'integer', example: 25 },
          total: { type: 'integer', example: 1280 },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' },
        },
      },
      Card: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          cardUid: { type: 'string' },
          status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED'] },
          issuedAt: { type: 'string', format: 'date-time' },
          expiresAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  security: bearer,
  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Connexion (email + mot de passe)',
        description: 'Retourne une paire de tokens, ou un challenge MFA si la MFA est active.',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          '200': { description: 'Login OK (tokens) ou MFA requise (challengeToken)' },
          '400': errorResponse,
          '401': errorResponse,
          '429': errorResponse,
        },
      },
    },
    '/auth/mfa/verify': {
      post: {
        tags: ['Auth'],
        summary: 'Verification du code TOTP',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['challengeToken', 'code'],
                properties: {
                  challengeToken: { type: 'string' },
                  code: { type: 'string', example: '123456' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Tokens emis' }, '401': errorResponse },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotation du refresh token',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: { refreshToken: { type: 'string' } },
              },
            },
          },
        },
        responses: { '200': { description: 'Nouvelle paire de tokens' }, '401': errorResponse },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Revocation du refresh token courant',
        responses: { '204': { description: 'Deconnecte' } },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Demande de reinitialisation du mot de passe',
        security: [],
        responses: { '202': { description: 'Email envoye si le compte existe' } },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reinitialisation via token email',
        security: [],
        responses: { '200': { description: 'Mot de passe mis a jour' }, '400': errorResponse },
      },
    },
    '/me': {
      get: {
        tags: ['Auth'],
        summary: 'Profil de l utilisateur authentifie',
        responses: { '200': { description: 'Profil courant' }, '401': errorResponse },
      },
    },
    '/universities': {
      get: {
        tags: ['Universities'],
        summary: 'Liste des universites (SUPER_ADMIN)',
        responses: { '200': { description: 'Liste' }, '403': errorResponse },
      },
      post: {
        tags: ['Universities'],
        summary: 'Creer une universite (SUPER_ADMIN)',
        responses: { '201': { description: 'Creee' }, '400': errorResponse, '403': errorResponse },
      },
    },
    '/universities/{id}': {
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
      get: { tags: ['Universities'], summary: 'Detail universite', responses: { '200': { description: 'OK' }, '404': errorResponse } },
      put: { tags: ['Universities'], summary: 'Modifier universite', responses: { '200': { description: 'OK' }, '400': errorResponse } },
      delete: { tags: ['Universities'], summary: 'Desactiver universite (SUPER_ADMIN)', responses: { '204': { description: 'Desactivee' } } },
    },
    '/students': {
      get: {
        tags: ['Students'],
        summary: 'Liste des etudiants (paginee)',
        parameters: [
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
          { in: 'query', name: 'pageSize', schema: { type: 'integer', default: 25 } },
          { in: 'query', name: 'search', schema: { type: 'string' }, description: 'Nom ou numero etudiant' },
        ],
        responses: { '200': { description: 'Page d etudiants' }, '401': errorResponse },
      },
      post: { tags: ['Students'], summary: 'Creer un etudiant', responses: { '201': { description: 'Cree' }, '400': errorResponse } },
    },
    '/students/import': {
      post: {
        tags: ['Students'],
        summary: 'Import CSV/Excel (multipart)',
        requestBody: {
          required: true,
          content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } } },
        },
        responses: { '200': { description: 'Rapport d import (crees, ignores, erreurs)' }, '400': errorResponse },
      },
    },
    '/students/{id}': {
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
      get: { tags: ['Students'], summary: 'Detail etudiant', responses: { '200': { description: 'OK' }, '404': errorResponse } },
      put: { tags: ['Students'], summary: 'Modifier etudiant', responses: { '200': { description: 'OK' }, '400': errorResponse } },
    },
    '/students/{id}/gdpr-delete': {
      delete: {
        tags: ['Students'],
        summary: 'Suppression RGPD complete (cascade carte/tokens/logs)',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '202': { description: 'Suppression planifiee (<=72h)' }, '404': errorResponse },
      },
    },
    '/cards/issue/{studentId}': {
      post: {
        tags: ['Cards'],
        summary: 'Emettre une carte pour un etudiant',
        parameters: [{ in: 'path', name: 'studentId', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '201': { description: 'Carte emise', content: { 'application/json': { schema: { $ref: '#/components/schemas/Card' } } } },
          '409': errorResponse,
        },
      },
    },
    '/cards/{studentId}': {
      get: {
        tags: ['Cards'],
        summary: 'Detail de la carte d un etudiant',
        parameters: [{ in: 'path', name: 'studentId', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Card' } } } }, '404': errorResponse },
      },
    },
    '/cards/{id}/revoke': {
      post: {
        tags: ['Cards'],
        summary: 'Revoquer une carte (motif obligatoire)',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['reason'], properties: { reason: { type: 'string' } } } } },
        },
        responses: { '200': { description: 'Revoquee' }, '400': errorResponse },
      },
    },
    '/cards/{id}/suspend': {
      post: { tags: ['Cards'], summary: 'Suspendre temporairement une carte', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Suspendue' } } },
    },
    '/cards/{id}/reactivate': {
      post: { tags: ['Cards'], summary: 'Reactiver une carte suspendue', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Reactivee' } } },
    },
    '/cards/{id}/history': {
      get: { tags: ['Cards'], summary: 'Historique des validations d une carte', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Liste des validations' } } },
    },
    '/nfc/validate': {
      post: {
        tags: ['NFC'],
        summary: 'Validation d un badge par un lecteur Elatec',
        description: 'Route consommee par les lecteurs Elatec (authentifiee par cle API lecteur). Anti-replay par nonce.',
        security: [{ readerApiKey: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['reader_id', 'reader_location', 'card_uid', 'timestamp', 'nonce', 'signature'],
                properties: {
                  reader_id: { type: 'string' },
                  reader_location: { type: 'string' },
                  card_uid: { type: 'string' },
                  timestamp: { type: 'integer' },
                  nonce: { type: 'string' },
                  signature: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Decision GRANTED/DENIED',
            content: { 'application/json': { schema: { type: 'object', properties: { granted: { type: 'boolean' }, reason: { type: 'string' } } } } },
          },
          '401': errorResponse,
        },
      },
    },
    '/nfc/readers': {
      get: { tags: ['NFC'], summary: 'Liste des lecteurs configures', responses: { '200': { description: 'Liste' } } },
      post: { tags: ['NFC'], summary: 'Enregistrer un lecteur', responses: { '201': { description: 'Enregistre' }, '400': errorResponse } },
    },
    '/mobile/card': {
      get: { tags: ['Mobile'], summary: 'Recuperer sa carte (etudiant)', responses: { '200': { description: 'Carte signee + payload' }, '401': errorResponse } },
    },
    '/mobile/device/register': {
      post: { tags: ['Mobile'], summary: 'Enregistrer un appareil (binding, max 2)', responses: { '201': { description: 'Appareil enregistre' }, '409': errorResponse } },
    },
    '/mobile/device/{id}': {
      delete: { tags: ['Mobile'], summary: 'Desinscrire un appareil', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '204': { description: 'Desinscrit' } } },
    },
    '/mobile/izly/redirect': {
      get: { tags: ['Mobile'], summary: 'Redirection/Deep link Izly', responses: { '200': { description: 'URL de redirection ou solde' } } },
    },
    '/reports/usage': {
      get: { tags: ['Reports'], summary: 'Statistiques d utilisation', responses: { '200': { description: 'Metriques d adoption et validations' } } },
    },
    '/reports/students': {
      get: { tags: ['Reports'], summary: 'Export de la liste des etudiants', responses: { '200': { description: 'Fichier export' } } },
    },
    '/reports/audit': {
      get: { tags: ['Reports'], summary: 'Journal d audit (immuable)', responses: { '200': { description: 'Entrees d audit' } } },
    },
  },
} as const;

export type OpenApiSpec = typeof openapiSpec;
