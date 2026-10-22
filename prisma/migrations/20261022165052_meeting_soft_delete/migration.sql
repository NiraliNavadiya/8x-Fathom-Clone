-- AlterTable
ALTER TABLE "meetings" ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "meetings_is_deleted_idx" ON "meetings"("is_deleted");
