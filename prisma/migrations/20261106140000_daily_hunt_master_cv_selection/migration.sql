-- AlterTable
ALTER TABLE "DailyHuntBatch" ADD COLUMN "masterCvId" TEXT;

-- CreateIndex
CREATE INDEX "DailyHuntBatch_masterCvId_idx" ON "DailyHuntBatch"("masterCvId");

-- AddForeignKey
ALTER TABLE "DailyHuntBatch" ADD CONSTRAINT "DailyHuntBatch_masterCvId_fkey" FOREIGN KEY ("masterCvId") REFERENCES "MasterCv"("id") ON DELETE SET NULL ON UPDATE CASCADE;
