-- CreateEnum
CREATE TYPE "RitualStatus" AS ENUM ('PLANNED', 'COMPLETED', 'MISSED');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('pt_BR', 'en_US', 'es_ES');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "nickname" TEXT,
    "locale" "Language" NOT NULL DEFAULT 'pt_BR',
    "timezone" TEXT NOT NULL,
    "checkInHour" INTEGER NOT NULL DEFAULT 20,
    "checkInMinute" INTEGER NOT NULL DEFAULT 0,
    "soundEnabled" BOOLEAN NOT NULL DEFAULT false,
    "soundId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmbientSound" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmbientSound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RitualDay" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "localDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "status" "RitualStatus" NOT NULL DEFAULT 'PLANNED',
    "checkInAt" TIMESTAMP(3),
    "achieved" BOOLEAN,
    "aiReply" TEXT,
    "microStep" TEXT,

    CONSTRAINT "RitualDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subtask" (
    "id" TEXT NOT NULL,
    "ritualId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Subtask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AmbientSound_key_key" ON "AmbientSound"("key");

-- CreateIndex
CREATE INDEX "RitualDay_userId_localDate_idx" ON "RitualDay"("userId", "localDate");

-- CreateIndex
CREATE INDEX "RitualDay_status_idx" ON "RitualDay"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RitualDay_userId_localDate_key" ON "RitualDay"("userId", "localDate");

-- CreateIndex
CREATE INDEX "Subtask_ritualId_idx" ON "Subtask"("ritualId");

-- CreateIndex
CREATE INDEX "Subtask_done_idx" ON "Subtask"("done");

-- CreateIndex
CREATE INDEX "Note_userId_createdAt_idx" ON "Note"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_soundId_fkey" FOREIGN KEY ("soundId") REFERENCES "AmbientSound"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RitualDay" ADD CONSTRAINT "RitualDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subtask" ADD CONSTRAINT "Subtask_ritualId_fkey" FOREIGN KEY ("ritualId") REFERENCES "RitualDay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
