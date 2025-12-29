/*
  Warnings:

  - You are about to drop the column `cursor_x` on the `guest_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `cursor_y` on the `guest_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `viewport_x` on the `guest_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `viewport_y` on the `guest_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `viewport_zoom` on the `guest_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `cursor_x` on the `workflow_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `cursor_y` on the `workflow_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `viewport_x` on the `workflow_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `viewport_y` on the `workflow_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `viewport_zoom` on the `workflow_sessions` table. All the data in the column will be lost.
  - You are about to drop the `node_result_cache` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updated_at` to the `template_ratings` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RatingStatus" AS ENUM ('PENDING', 'PUBLISHED', 'HIDDEN', 'REMOVED');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'INAPPROPRIATE', 'MISLEADING', 'OFF_TOPIC', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "SharePermission" AS ENUM ('USE', 'COPY', 'EDIT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MENTION', 'COMMENT_REPLY', 'SUGGESTION_RECEIVED', 'SUGGESTION_APPROVED', 'SUGGESTION_REJECTED', 'SUGGESTION_MERGED', 'WORKFLOW_SHARED', 'TEMPLATE_SHARED', 'TEMPLATE_RATED', 'PR_REVIEW_REQUESTED', 'PR_APPROVED', 'PR_CHANGES_REQUESTED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'MERGED', 'CLOSED');

-- AlterTable
ALTER TABLE "guest_sessions" DROP COLUMN "cursor_x",
DROP COLUMN "cursor_y",
DROP COLUMN "viewport_x",
DROP COLUMN "viewport_y",
DROP COLUMN "viewport_zoom";

-- AlterTable
ALTER TABLE "template_ratings" ADD COLUMN     "author_reply" TEXT,
ADD COLUMN     "author_reply_at" TIMESTAMP(3),
ADD COLUMN     "helpful_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "report_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "RatingStatus" NOT NULL DEFAULT 'PUBLISHED',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "workflow_sessions" DROP COLUMN "cursor_x",
DROP COLUMN "cursor_y",
DROP COLUMN "viewport_x",
DROP COLUMN "viewport_y",
DROP COLUMN "viewport_zoom";

-- DropTable
DROP TABLE "node_result_cache";

-- CreateTable
CREATE TABLE "rating_reports" (
    "id" TEXT NOT NULL,
    "rating_id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_id" TEXT,

    CONSTRAINT "rating_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rating_helpfuls" (
    "id" TEXT NOT NULL,
    "rating_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rating_helpfuls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_shares" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "shared_with_team_id" TEXT NOT NULL,
    "shared_by_user_id" TEXT NOT NULL,
    "permission" "SharePermission" NOT NULL DEFAULT 'USE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "version_tags" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "commit_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_by_id" TEXT NOT NULL,
    "is_release" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "version_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suggestions" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "author_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "graph_changes" JSONB NOT NULL,
    "required_approvals" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "merged_at" TIMESTAMP(3),
    "merged_by_id" TEXT,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suggestion_reviews" (
    "id" TEXT NOT NULL,
    "suggestion_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suggestion_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suggestion_comments" (
    "id" TEXT NOT NULL,
    "suggestion_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suggestion_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "keyboard_shortcuts" JSONB,
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "editor_settings" JSONB,
    "notification_settings" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_favorites" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_accesses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "accessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_accesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_mentions" (
    "id" TEXT NOT NULL,
    "comment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_mentions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rating_reports_rating_id_idx" ON "rating_reports"("rating_id");

-- CreateIndex
CREATE INDEX "rating_reports_status_idx" ON "rating_reports"("status");

-- CreateIndex
CREATE UNIQUE INDEX "rating_reports_rating_id_reporter_id_key" ON "rating_reports"("rating_id", "reporter_id");

-- CreateIndex
CREATE INDEX "rating_helpfuls_rating_id_idx" ON "rating_helpfuls"("rating_id");

-- CreateIndex
CREATE UNIQUE INDEX "rating_helpfuls_rating_id_user_id_key" ON "rating_helpfuls"("rating_id", "user_id");

-- CreateIndex
CREATE INDEX "template_shares_template_id_idx" ON "template_shares"("template_id");

-- CreateIndex
CREATE INDEX "template_shares_shared_with_team_id_idx" ON "template_shares"("shared_with_team_id");

-- CreateIndex
CREATE UNIQUE INDEX "template_shares_template_id_shared_with_team_id_key" ON "template_shares"("template_id", "shared_with_team_id");

-- CreateIndex
CREATE INDEX "version_tags_workflow_id_idx" ON "version_tags"("workflow_id");

-- CreateIndex
CREATE INDEX "version_tags_branch_id_idx" ON "version_tags"("branch_id");

-- CreateIndex
CREATE INDEX "version_tags_commit_id_idx" ON "version_tags"("commit_id");

-- CreateIndex
CREATE UNIQUE INDEX "version_tags_workflow_id_name_key" ON "version_tags"("workflow_id", "name");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_idx" ON "notifications"("user_id", "read");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "suggestions_workflow_id_idx" ON "suggestions"("workflow_id");

-- CreateIndex
CREATE INDEX "suggestions_author_id_idx" ON "suggestions"("author_id");

-- CreateIndex
CREATE INDEX "suggestions_status_idx" ON "suggestions"("status");

-- CreateIndex
CREATE INDEX "suggestion_reviews_suggestion_id_idx" ON "suggestion_reviews"("suggestion_id");

-- CreateIndex
CREATE INDEX "suggestion_reviews_reviewer_id_idx" ON "suggestion_reviews"("reviewer_id");

-- CreateIndex
CREATE UNIQUE INDEX "suggestion_reviews_suggestion_id_reviewer_id_key" ON "suggestion_reviews"("suggestion_id", "reviewer_id");

-- CreateIndex
CREATE INDEX "suggestion_comments_suggestion_id_idx" ON "suggestion_comments"("suggestion_id");

-- CreateIndex
CREATE INDEX "suggestion_comments_author_id_idx" ON "suggestion_comments"("author_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- CreateIndex
CREATE INDEX "workflow_favorites_user_id_idx" ON "workflow_favorites"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_favorites_user_id_workflow_id_key" ON "workflow_favorites"("user_id", "workflow_id");

-- CreateIndex
CREATE INDEX "workflow_accesses_user_id_accessed_at_idx" ON "workflow_accesses"("user_id", "accessed_at");

-- CreateIndex
CREATE INDEX "workflow_accesses_workflow_id_idx" ON "workflow_accesses"("workflow_id");

-- CreateIndex
CREATE INDEX "comment_mentions_user_id_read_idx" ON "comment_mentions"("user_id", "read");

-- CreateIndex
CREATE UNIQUE INDEX "comment_mentions_comment_id_user_id_key" ON "comment_mentions"("comment_id", "user_id");

-- CreateIndex
CREATE INDEX "template_ratings_status_idx" ON "template_ratings"("status");

-- AddForeignKey
ALTER TABLE "template_ratings" ADD CONSTRAINT "template_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rating_reports" ADD CONSTRAINT "rating_reports_rating_id_fkey" FOREIGN KEY ("rating_id") REFERENCES "template_ratings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rating_helpfuls" ADD CONSTRAINT "rating_helpfuls_rating_id_fkey" FOREIGN KEY ("rating_id") REFERENCES "template_ratings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_shares" ADD CONSTRAINT "template_shares_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "workflow_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_shares" ADD CONSTRAINT "template_shares_shared_with_team_id_fkey" FOREIGN KEY ("shared_with_team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "version_tags" ADD CONSTRAINT "version_tags_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "version_tags" ADD CONSTRAINT "version_tags_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "workflow_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "version_tags" ADD CONSTRAINT "version_tags_commit_id_fkey" FOREIGN KEY ("commit_id") REFERENCES "branch_commits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "version_tags" ADD CONSTRAINT "version_tags_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestion_reviews" ADD CONSTRAINT "suggestion_reviews_suggestion_id_fkey" FOREIGN KEY ("suggestion_id") REFERENCES "suggestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestion_reviews" ADD CONSTRAINT "suggestion_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestion_comments" ADD CONSTRAINT "suggestion_comments_suggestion_id_fkey" FOREIGN KEY ("suggestion_id") REFERENCES "suggestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestion_comments" ADD CONSTRAINT "suggestion_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestion_comments" ADD CONSTRAINT "suggestion_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "suggestion_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_favorites" ADD CONSTRAINT "workflow_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_favorites" ADD CONSTRAINT "workflow_favorites_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_accesses" ADD CONSTRAINT "workflow_accesses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_accesses" ADD CONSTRAINT "workflow_accesses_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_mentions" ADD CONSTRAINT "comment_mentions_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_mentions" ADD CONSTRAINT "comment_mentions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
