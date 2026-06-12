-- Ajoute le role CONTENT_EDITOR (Editeur) a l'enum Role.
-- Ce role ne peut gerer QUE le contenu (planning, infos, bibliotheque, bons plans).
-- IF NOT EXISTS: idempotent (rejouable sans erreur).
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CONTENT_EDITOR';
