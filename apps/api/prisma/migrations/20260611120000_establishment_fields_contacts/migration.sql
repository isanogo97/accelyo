-- AlterTable University : adresse, ville, code postal, numero de site
ALTER TABLE "University" ADD COLUMN "address" TEXT;
ALTER TABLE "University" ADD COLUMN "city" TEXT;
ALTER TABLE "University" ADD COLUMN "postalCode" TEXT;
ALTER TABLE "University" ADD COLUMN "siteCode" TEXT;
CREATE UNIQUE INDEX "University_siteCode_key" ON "University"("siteCode");

-- CreateTable EstablishmentContact (personnes a contacter)
CREATE TABLE "EstablishmentContact" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "jobTitle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EstablishmentContact_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EstablishmentContact_universityId_idx" ON "EstablishmentContact"("universityId");
ALTER TABLE "EstablishmentContact" ADD CONSTRAINT "EstablishmentContact_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;
