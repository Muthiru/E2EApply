-- AlterTable
ALTER TABLE "DailyHuntBatchItem" ADD COLUMN "applicationId" TEXT;

-- CreateIndex
CREATE INDEX "DailyHuntBatchItem_applicationId_idx" ON "DailyHuntBatchItem"("applicationId");

-- AddForeignKey
ALTER TABLE "DailyHuntBatchItem" ADD CONSTRAINT "DailyHuntBatchItem_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
