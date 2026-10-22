/*
  Warnings:

  - You are about to drop the column `duration_seconds` on the `meetings` table. All the data in the column will be lost.
  - You are about to drop the column `segments` on the `transcripts` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SummaryTemplate" AS ENUM ('AI_NOTES', 'MEETING_MINUTES', 'SUMMARY', 'CUSTOMER_FEEDBACK', 'PROJECT_MEETING');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "AnnotationType" AS ENUM ('HIGHLIGHT', 'NOTE', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "AskRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "ShareScope" AS ENUM ('SUMMARY', 'MEETING');

-- CreateEnum
CREATE TYPE "ShareAccess" AS ENUM ('PUBLIC', 'RESTRICTED');

-- AlterTable
ALTER TABLE "meetings" DROP COLUMN "duration_seconds",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "duration_ms" INTEGER,
ADD COLUMN     "folder_id" UUID,
ADD COLUMN     "owner_id" UUID;

-- AlterTable
ALTER TABLE "transcripts" DROP COLUMN "segments";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "onboarding_completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folders" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "owner_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "owner_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_tags" (
    "meeting_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "meeting_tags_pkey" PRIMARY KEY ("meeting_id","tag_id")
);

-- CreateTable
CREATE TABLE "meeting_speakers" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,

    CONSTRAINT "meeting_speakers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcript_segments" (
    "id" UUID NOT NULL,
    "transcript_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "speaker_id" UUID,
    "start_ms" INTEGER NOT NULL,
    "end_ms" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "transcript_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "summaries" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "template" "SummaryTemplate" NOT NULL,
    "status" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "content" JSONB,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "model" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "annotations" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "type" "AnnotationType" NOT NULL,
    "author_id" UUID,
    "start_ms" INTEGER NOT NULL,
    "end_ms" INTEGER NOT NULL,
    "start_segment_id" UUID,
    "start_offset" INTEGER,
    "end_segment_id" UUID,
    "end_offset" INTEGER,
    "quote" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "annotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_sections" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "start_ms" INTEGER NOT NULL,
    "end_ms" INTEGER NOT NULL,

    CONSTRAINT "timeline_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_items" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "assignee_id" UUID,
    "timestamp_ms" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "action_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ask_threads" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ask_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ask_messages" (
    "id" UUID NOT NULL,
    "thread_id" UUID NOT NULL,
    "role" "AskRole" NOT NULL,
    "content" TEXT NOT NULL,
    "citations" JSONB NOT NULL DEFAULT '[]',
    "status" "GenerationStatus" NOT NULL DEFAULT 'READY',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ask_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shares" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "scope" "ShareScope" NOT NULL,
    "access" "ShareAccess" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "created_by_id" UUID,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_recipients" (
    "id" UUID NOT NULL,
    "share_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "share_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "folders_owner_id_name_key" ON "folders"("owner_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_owner_id_name_key" ON "tags"("owner_id", "name");

-- CreateIndex
CREATE INDEX "meeting_tags_tag_id_idx" ON "meeting_tags"("tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_speakers_meeting_id_name_key" ON "meeting_speakers"("meeting_id", "name");

-- CreateIndex
CREATE INDEX "transcript_segments_transcript_id_start_ms_idx" ON "transcript_segments"("transcript_id", "start_ms");

-- CreateIndex
CREATE UNIQUE INDEX "transcript_segments_transcript_id_position_key" ON "transcript_segments"("transcript_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "summaries_meeting_id_template_key" ON "summaries"("meeting_id", "template");

-- CreateIndex
CREATE INDEX "annotations_meeting_id_start_ms_idx" ON "annotations"("meeting_id", "start_ms");

-- CreateIndex
CREATE INDEX "annotations_meeting_id_type_idx" ON "annotations"("meeting_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "timeline_sections_meeting_id_position_key" ON "timeline_sections"("meeting_id", "position");

-- CreateIndex
CREATE INDEX "action_items_meeting_id_assignee_id_idx" ON "action_items"("meeting_id", "assignee_id");

-- CreateIndex
CREATE INDEX "ask_threads_meeting_id_idx" ON "ask_threads"("meeting_id");

-- CreateIndex
CREATE INDEX "ask_messages_thread_id_created_at_idx" ON "ask_messages"("thread_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "shares_token_hash_key" ON "shares"("token_hash");

-- CreateIndex
CREATE INDEX "shares_meeting_id_idx" ON "shares"("meeting_id");

-- CreateIndex
CREATE UNIQUE INDEX "share_recipients_share_id_email_key" ON "share_recipients"("share_id", "email");

-- CreateIndex
CREATE INDEX "meetings_folder_id_idx" ON "meetings"("folder_id");

-- CreateIndex
CREATE INDEX "meetings_owner_id_idx" ON "meetings"("owner_id");

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_tags" ADD CONSTRAINT "meeting_tags_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_tags" ADD CONSTRAINT "meeting_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_speakers" ADD CONSTRAINT "meeting_speakers_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript_segments" ADD CONSTRAINT "transcript_segments_transcript_id_fkey" FOREIGN KEY ("transcript_id") REFERENCES "transcripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript_segments" ADD CONSTRAINT "transcript_segments_speaker_id_fkey" FOREIGN KEY ("speaker_id") REFERENCES "meeting_speakers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "summaries" ADD CONSTRAINT "summaries_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_sections" ADD CONSTRAINT "timeline_sections_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "meeting_speakers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ask_threads" ADD CONSTRAINT "ask_threads_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ask_threads" ADD CONSTRAINT "ask_threads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ask_messages" ADD CONSTRAINT "ask_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "ask_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shares" ADD CONSTRAINT "shares_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shares" ADD CONSTRAINT "shares_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_recipients" ADD CONSTRAINT "share_recipients_share_id_fkey" FOREIGN KEY ("share_id") REFERENCES "shares"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Checks Prisma's schema language cannot express.
-- At most 4 timeline sections per meeting (positions 0-3, unique per meeting).
ALTER TABLE "timeline_sections" ADD CONSTRAINT "timeline_sections_position_check" CHECK ("position" BETWEEN 0 AND 3);

-- Time ranges must be non-negative and in order.
ALTER TABLE "timeline_sections" ADD CONSTRAINT "timeline_sections_range_check" CHECK ("start_ms" >= 0 AND "end_ms" >= "start_ms");
ALTER TABLE "transcript_segments" ADD CONSTRAINT "transcript_segments_range_check" CHECK ("start_ms" >= 0 AND "end_ms" >= "start_ms");
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_range_check" CHECK ("start_ms" >= 0 AND "end_ms" >= "start_ms");
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_timestamp_check" CHECK ("timestamp_ms" IS NULL OR "timestamp_ms" >= 0);
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_duration_check" CHECK ("duration_ms" IS NULL OR "duration_ms" >= 0);
