-- CreateEnum
CREATE TYPE "DailyHuntScreeningStatus" AS ENUM ('MATCHED', 'REVIEW', 'EXCLUDED');

-- AlterTable
ALTER TABLE "DailyHuntBatch"
ADD COLUMN "targetCount" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN "searchQuery" TEXT,
ADD COLUMN "searchedAt" TIMESTAMP(3),
ADD COLUMN "searchWarnings" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "DailyHuntPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mustHaveTerms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "dealBreakerTerms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "dailyTargetCount" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyHuntPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyHuntBatchItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT,
    "snippet" TEXT,
    "publishedAt" TEXT,
    "source" TEXT NOT NULL,
    "estimatedMatch" INTEGER,
    "matchedSkills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "screeningStatus" "DailyHuntScreeningStatus" NOT NULL DEFAULT 'REVIEW',
    "screeningReasons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyHuntBatchItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyHuntPreferences_userId_key" ON "DailyHuntPreferences"("userId");
CREATE UNIQUE INDEX "DailyHuntBatchItem_batchId_url_key" ON "DailyHuntBatchItem"("batchId", "url");
CREATE INDEX "DailyHuntBatchItem_batchId_screeningStatus_idx" ON "DailyHuntBatchItem"("batchId", "screeningStatus");

-- AddForeignKey
ALTER TABLE "DailyHuntPreferences" ADD CONSTRAINT "DailyHuntPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyHuntBatchItem" ADD CONSTRAINT "DailyHuntBatchItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "DailyHuntBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
