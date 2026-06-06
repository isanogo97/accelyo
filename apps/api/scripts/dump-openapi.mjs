/**
 * Exporte la spec OpenAPI (source de verite: src/docs/openapi.ts) vers
 * docs/api/openapi.json, pour l'outillage externe (Postman, codegen, CI).
 * Lancer: npm run docs:openapi
 */
import { writeFileSync } from 'fs';
import { openapiSpec } from '../src/docs/openapi.ts';

const out = new URL('../../../docs/api/openapi.json', import.meta.url);
writeFileSync(out, JSON.stringify(openapiSpec, null, 2) + '\n');
console.log('[docs] docs/api/openapi.json regenere (' + Object.keys(openapiSpec.paths).length + ' routes).');
