-- =================================================================
-- App etudiante : planning, infos, bibliotheque, bons plans
-- Toutes les donnees restent en base (aucun flux externe).
-- =================================================================

-- CreateTable Announcement (Infos / actualites de l'etablissement)
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Announcement_universityId_publishedAt_idx" ON "Announcement"("universityId", "publishedAt");
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable ScheduleEntry (Planning / emploi du temps)
CREATE TABLE "ScheduleEntry" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "studentId" TEXT,
    "program" TEXT,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "teacher" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ScheduleEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ScheduleEntry_universityId_startsAt_idx" ON "ScheduleEntry"("universityId", "startsAt");
CREATE INDEX "ScheduleEntry_studentId_startsAt_idx" ON "ScheduleEntry"("studentId", "startsAt");
ALTER TABLE "ScheduleEntry" ADD CONSTRAINT "ScheduleEntry_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduleEntry" ADD CONSTRAINT "ScheduleEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable LibraryLoan (Bibliotheque : prets de livres)
CREATE TABLE "LibraryLoan" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "bookTitle" TEXT NOT NULL,
    "bookAuthor" TEXT,
    "isbn" TEXT,
    "borrowedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "returnedAt" TIMESTAMP(3),
    "renewedCount" INTEGER NOT NULL DEFAULT 0,
    "maxRenewals" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LibraryLoan_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LibraryLoan_studentId_dueAt_idx" ON "LibraryLoan"("studentId", "dueAt");
ALTER TABLE "LibraryLoan" ADD CONSTRAINT "LibraryLoan_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibraryLoan" ADD CONSTRAINT "LibraryLoan_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable Deal (Bons plans / activites)
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "universityId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "partner" TEXT,
    "category" TEXT,
    "url" TEXT,
    "code" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Deal_universityId_isActive_idx" ON "Deal"("universityId", "isActive");
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;
