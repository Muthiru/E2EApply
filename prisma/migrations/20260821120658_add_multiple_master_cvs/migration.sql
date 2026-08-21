/*
  Warnings:

  - You are about to drop the column `cvSectionOrder` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `masterCvData` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `masterCvName` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `masterCvText` on the `Profile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "masterCvId" TEXT;

-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "cvSectionOrder",
DROP COLUMN "masterCvData",
DROP COLUMN "masterCvName",
DROP COLUMN "masterCvText";

-- CreateTable
CREATE TABLE "MasterCv" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileData" BYTEA NOT NULL,
    "textContent" TEXT NOT NULL,
    "cvSectionOrder" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterCv_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MasterCv" ADD CONSTRAINT "MasterCv_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_masterCvId_fkey" FOREIGN KEY ("masterCvId") REFERENCES "MasterCv"("id") ON DELETE SET NULL ON UPDATE CASCADE;
