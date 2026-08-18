-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "alignmentDetails" JSONB,
ADD COLUMN     "alignmentScore" INTEGER;
