-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "cvSectionOrder" TEXT[],
ADD COLUMN     "masterCvData" BYTEA,
ADD COLUMN     "masterCvName" TEXT;
