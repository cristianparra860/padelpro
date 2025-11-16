-- AlterTable
ALTER TABLE "User" ADD COLUMN "prefInstructorIds" TEXT;
ALTER TABLE "User" ADD COLUMN "prefPlayerCounts" TEXT DEFAULT '1,2,3,4';
ALTER TABLE "User" ADD COLUMN "prefTimeSlot" TEXT DEFAULT 'all';
ALTER TABLE "User" ADD COLUMN "prefViewType" TEXT DEFAULT 'all';
