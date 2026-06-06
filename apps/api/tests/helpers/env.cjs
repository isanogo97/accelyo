/**
 * Charge l'environnement de TEST avant tout import applicatif.
 * Declare dans jest.config.js -> setupFiles.
 *
 * Cree apps/api/.env.test depuis apps/api/.env.test.example et pointe
 * DATABASE_URL/REDIS_URL vers une base + un index Redis DEDIES aux tests
 * (les tests TRUNCATE la base et FLUSH le redis a chaque test).
 */
const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '../../.env.test'),
  override: true,
});
