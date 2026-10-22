-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('UPLOADED', 'TRANSCRIBING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "meetings" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3),
    "status" "MeetingStatus" NOT NULL DEFAULT 'UPLOADED',
    "video_key" TEXT NOT NULL,
    "video_content_type" TEXT NOT NULL,
    "video_size_bytes" BIGINT NOT NULL,
    "duration_seconds" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcripts" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "text" TEXT NOT NULL,
    "segments" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transcripts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meetings_video_key_key" ON "meetings"("video_key");

-- CreateIndex
CREATE INDEX "meetings_created_at_idx" ON "meetings"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "transcripts_meeting_id_key" ON "transcripts"("meeting_id");

-- AddForeignKey
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
