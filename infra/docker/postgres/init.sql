-- =================================================================
-- Initialisation PostgreSQL au premier demarrage du conteneur.
-- Active les extensions necessaires.
-- =================================================================

-- pgcrypto: utile pour gen_random_uuid() et fonctions de hash optionnelles
-- (le chiffrement des donnees etudiantes se fait au niveau applicatif).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- citext: pour les recherches insensibles a la casse sur certains champs
-- (par ex. domain d'universite). Optionnel - non utilise par defaut.
CREATE EXTENSION IF NOT EXISTS citext;
