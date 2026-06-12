-- Lier l'UID d'une carte physique existante a un etudiant (migration de parc).
-- UID = numero de serie NFC, peu sensible: stocke en clair (lisibilite admin)
-- + un hash deterministe pour la recherche/deduplication par tenant.
ALTER TABLE "Student" ADD COLUMN "physicalCardUid" TEXT;
ALTER TABLE "Student" ADD COLUMN "physicalCardUidHash" TEXT;
CREATE INDEX "Student_universityId_physicalCardUidHash_idx" ON "Student"("universityId", "physicalCardUidHash");
