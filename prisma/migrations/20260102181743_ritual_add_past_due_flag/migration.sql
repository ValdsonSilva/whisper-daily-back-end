/*
  Warnings:

  - Added the required column `archived` to the `RitualDay` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RitualDay" ADD COLUMN     "archived" BOOLEAN NOT NULL,
ADD COLUMN     "pastDue" BOOLEAN NOT NULL DEFAULT false;
