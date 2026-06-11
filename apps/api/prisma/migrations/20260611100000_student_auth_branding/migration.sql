-- CreateEnum
CREATE TYPE "Sector" AS ENUM ('SCHOOL', 'LIBRARY', 'COMPANY', 'ASSOCIATION');

-- AlterTable University (secteur + branding)
ALTER TABLE "University" ADD COLUMN "sector" "Sector" NOT NULL DEFAULT 'SCHOOL';
ALTER TABLE "University" ADD COLUMN "brandColor" TEXT NOT NULL DEFAULT '#2563eb';
ALTER TABLE "University" ADD COLUMN "logoUrl" TEXT;

-- AlterTable Student (authentification etudiant + consentement)
ALTER TABLE "Student" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "Student" ADD COLUMN "activationToken" TEXT;
ALTER TABLE "Student" ADD COLUMN "activationTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "Student" ADD COLUMN "activatedAt" TIMESTAMP(3);
ALTER TABLE "Student" ADD COLUMN "marketingConsent" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Student_activationToken_key" ON "Student"("activationToken");
