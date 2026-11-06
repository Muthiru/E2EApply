-- CreateEnum
CREATE TYPE "DailyHuntBatchStatus" AS ENUM ('DRAFT', 'REVIEWING', 'COMPLETE');

-- CreateTable
CREATE TABLE "DailyHuntBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "DailyHuntBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyHuntBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyHuntBatch_userId_createdAt_idx" ON "DailyHuntBatch"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "DailyHuntBatch" ADD CONSTRAINT "DailyHuntBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
