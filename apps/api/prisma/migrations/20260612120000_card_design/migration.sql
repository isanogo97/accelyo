-- AlterTable University : design carte (visuel de fond + couleur du texte)
ALTER TABLE "University" ADD COLUMN "cardBackgroundUrl" TEXT;
ALTER TABLE "University" ADD COLUMN "cardTextColor" TEXT NOT NULL DEFAULT '#ffffff';
