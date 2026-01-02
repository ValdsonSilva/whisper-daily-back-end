-- AlterTable
ALTER TABLE "RitualDay" ALTER COLUMN "archived" DROP NOT NULL,
ALTER COLUMN "archived" SET DEFAULT false;
