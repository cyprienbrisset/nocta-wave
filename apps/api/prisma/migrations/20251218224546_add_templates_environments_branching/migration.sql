-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREDENTIAL_CREATE', 'CREDENTIAL_READ', 'CREDENTIAL_UPDATE', 'CREDENTIAL_DELETE', 'CREDENTIAL_USE', 'WORKFLOW_CREATE', 'WORKFLOW_UPDATE', 'WORKFLOW_DELETE', 'WORKFLOW_ACTIVATE', 'WORKFLOW_DEACTIVATE', 'WORKFLOW_EXECUTE', 'TEAM_CREATE', 'TEAM_UPDATE', 'TEAM_DELETE', 'TEAM_MEMBER_ADD', 'TEAM_MEMBER_REMOVE', 'TEAM_MEMBER_ROLE_CHANGE', 'USER_LOGIN', 'USER_LOGOUT', 'USER_PASSWORD_CHANGE', 'API_KEY_CREATE', 'API_KEY_DELETE');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('CREDENTIAL', 'WORKFLOW', 'EXECUTION', 'TEAM', 'USER', 'API_KEY', 'WEBHOOK', 'SCHEDULE');

-- CreateEnum
CREATE TYPE "DLQStatus" AS ENUM ('PENDING', 'RETRYING', 'RESOLVED', 'DISCARDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AlertCondition" AS ENUM ('EXECUTION_FAILED', 'EXECUTION_TIMEOUT', 'CONSECUTIVE_FAILURES', 'ERROR_RATE_THRESHOLD', 'QUEUE_DEPTH', 'CIRCUIT_BREAKER_OPEN');

-- CreateEnum
CREATE TYPE "AlertChannelType" AS ENUM ('EMAIL', 'SLACK', 'WEBHOOK', 'DISCORD', 'TEAMS');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TemplateDifficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "VariableType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON', 'SECRET');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BranchStatus" AS ENUM ('ACTIVE', 'MERGED', 'DELETED', 'STALE');

-- CreateEnum
CREATE TYPE "PRStatus" AS ENUM ('OPEN', 'MERGED', 'CLOSED', 'DRAFT');

-- CreateEnum
CREATE TYPE "MergeStrategy" AS ENUM ('MERGE', 'SQUASH', 'REBASE');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'CHANGES_REQUESTED', 'COMMENTED');

-- AlterTable
ALTER TABLE "executions" ADD COLUMN     "parent_execution_id" TEXT;

-- AlterTable
ALTER TABLE "workflow_templates" ADD COLUMN     "avg_rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "category_id" TEXT,
ADD COLUMN     "difficulty" "TemplateDifficulty" NOT NULL DEFAULT 'BEGINNER',
ADD COLUMN     "estimated_time" INTEGER,
ADD COLUMN     "is_community" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "long_description" TEXT,
ADD COLUMN     "published_at" TIMESTAMP(3),
ADD COLUMN     "rating_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "thumbnail" TEXT;

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" "AuditAction" NOT NULL,
    "resource_type" "ResourceType" NOT NULL,
    "resource_id" TEXT NOT NULL,
    "resource_name" TEXT,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dead_letter_queue" (
    "id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "node_id" TEXT,
    "node_name" TEXT,
    "error_message" TEXT NOT NULL,
    "error_stack" TEXT,
    "input_data" JSONB,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "status" "DLQStatus" NOT NULL DEFAULT 'PENDING',
    "last_retry_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dead_letter_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_rules" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "condition" "AlertCondition" NOT NULL,
    "threshold" INTEGER,
    "workflow_id" TEXT,
    "cooldown_ms" INTEGER NOT NULL DEFAULT 300000,
    "last_fired_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_channels" (
    "id" TEXT NOT NULL,
    "alert_rule_id" TEXT NOT NULL,
    "type" "AlertChannelType" NOT NULL,
    "config" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_history" (
    "id" TEXT NOT NULL,
    "alert_rule_id" TEXT NOT NULL,
    "execution_id" TEXT,
    "workflow_id" TEXT,
    "message" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "sentTo" JSONB NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledged_by" TEXT,
    "acknowledged_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "node_result_cache" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "node_type" TEXT NOT NULL,
    "input_hash" TEXT NOT NULL,
    "output_data" JSONB NOT NULL,
    "ttl_seconds" INTEGER NOT NULL DEFAULT 3600,
    "hit_count" INTEGER NOT NULL DEFAULT 0,
    "last_hit_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "node_result_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_workflows" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'custom',
    "icon" TEXT,
    "input_schema" JSONB NOT NULL,
    "output_schema" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_latest" BOOLEAN NOT NULL DEFAULT true,
    "previous_version" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "is_shared" BOOLEAN NOT NULL DEFAULT false,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "sub_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_workflow_usages" (
    "id" TEXT NOT NULL,
    "sub_workflow_id" TEXT NOT NULL,
    "parent_workflow_id" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "version_pinned" BOOLEAN NOT NULL DEFAULT false,
    "pinned_version" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sub_workflow_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_parameters" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "default_value" TEXT,
    "options" JSONB,
    "validation" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "template_parameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_ratings" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "review" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "environments" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_production" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "environments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variables" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "type" "VariableType" NOT NULL DEFAULT 'STRING',
    "is_secret" BOOLEAN NOT NULL DEFAULT false,
    "is_global" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "variables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "environment_variables" (
    "id" TEXT NOT NULL,
    "variable_id" TEXT NOT NULL,
    "environment_id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "encrypted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "environment_variables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "environment_promotions" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "source_env_id" TEXT NOT NULL,
    "target_env_id" TEXT NOT NULL,
    "promoted_by" TEXT NOT NULL,
    "status" "PromotionStatus" NOT NULL DEFAULT 'PENDING',
    "variables" JSONB NOT NULL,
    "changelog" TEXT,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "environment_promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_branches" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "base_branch_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "status" "BranchStatus" NOT NULL DEFAULT 'ACTIVE',
    "graph" JSONB NOT NULL,
    "settings" JSONB,
    "last_commit_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "merged_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "workflow_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_commits" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "graph" JSONB NOT NULL,
    "settings" JSONB,
    "author_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branch_commits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_pull_requests" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "source_branch_id" TEXT NOT NULL,
    "target_branch_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "status" "PRStatus" NOT NULL DEFAULT 'OPEN',
    "merge_strategy" "MergeStrategy" NOT NULL DEFAULT 'MERGE',
    "conflict_data" JSONB,
    "review_required" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "merged_at" TIMESTAMP(3),
    "merged_by_id" TEXT,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "workflow_pull_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pr_reviews" (
    "id" TEXT NOT NULL,
    "pr_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL,
    "body" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pr_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pr_comments" (
    "id" TEXT NOT NULL,
    "pr_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "node_id" TEXT,
    "body" TEXT NOT NULL,
    "parent_id" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pr_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_team_id_idx" ON "audit_logs"("team_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_resource_type_resource_id_idx" ON "audit_logs"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "dead_letter_queue_team_id_idx" ON "dead_letter_queue"("team_id");

-- CreateIndex
CREATE INDEX "dead_letter_queue_workflow_id_idx" ON "dead_letter_queue"("workflow_id");

-- CreateIndex
CREATE INDEX "dead_letter_queue_status_idx" ON "dead_letter_queue"("status");

-- CreateIndex
CREATE INDEX "dead_letter_queue_created_at_idx" ON "dead_letter_queue"("created_at");

-- CreateIndex
CREATE INDEX "alert_rules_team_id_idx" ON "alert_rules"("team_id");

-- CreateIndex
CREATE INDEX "alert_rules_workflow_id_idx" ON "alert_rules"("workflow_id");

-- CreateIndex
CREATE INDEX "alert_rules_is_active_idx" ON "alert_rules"("is_active");

-- CreateIndex
CREATE INDEX "alert_channels_alert_rule_id_idx" ON "alert_channels"("alert_rule_id");

-- CreateIndex
CREATE INDEX "alert_history_alert_rule_id_idx" ON "alert_history"("alert_rule_id");

-- CreateIndex
CREATE INDEX "alert_history_execution_id_idx" ON "alert_history"("execution_id");

-- CreateIndex
CREATE INDEX "alert_history_created_at_idx" ON "alert_history"("created_at");

-- CreateIndex
CREATE INDEX "alert_history_acknowledged_idx" ON "alert_history"("acknowledged");

-- CreateIndex
CREATE INDEX "node_result_cache_workflow_id_node_id_idx" ON "node_result_cache"("workflow_id", "node_id");

-- CreateIndex
CREATE INDEX "node_result_cache_expires_at_idx" ON "node_result_cache"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "node_result_cache_workflow_id_node_id_input_hash_key" ON "node_result_cache"("workflow_id", "node_id", "input_hash");

-- CreateIndex
CREATE UNIQUE INDEX "sub_workflows_workflow_id_key" ON "sub_workflows"("workflow_id");

-- CreateIndex
CREATE INDEX "sub_workflows_category_idx" ON "sub_workflows"("category");

-- CreateIndex
CREATE INDEX "sub_workflows_is_public_idx" ON "sub_workflows"("is_public");

-- CreateIndex
CREATE INDEX "sub_workflows_is_shared_idx" ON "sub_workflows"("is_shared");

-- CreateIndex
CREATE INDEX "sub_workflows_version_idx" ON "sub_workflows"("version");

-- CreateIndex
CREATE INDEX "sub_workflow_usages_sub_workflow_id_idx" ON "sub_workflow_usages"("sub_workflow_id");

-- CreateIndex
CREATE INDEX "sub_workflow_usages_parent_workflow_id_idx" ON "sub_workflow_usages"("parent_workflow_id");

-- CreateIndex
CREATE UNIQUE INDEX "sub_workflow_usages_parent_workflow_id_node_id_key" ON "sub_workflow_usages"("parent_workflow_id", "node_id");

-- CreateIndex
CREATE UNIQUE INDEX "template_categories_name_key" ON "template_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "template_categories_slug_key" ON "template_categories"("slug");

-- CreateIndex
CREATE INDEX "template_parameters_template_id_idx" ON "template_parameters"("template_id");

-- CreateIndex
CREATE INDEX "template_ratings_template_id_idx" ON "template_ratings"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "template_ratings_template_id_user_id_key" ON "template_ratings"("template_id", "user_id");

-- CreateIndex
CREATE INDEX "environments_team_id_idx" ON "environments"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "environments_team_id_slug_key" ON "environments"("team_id", "slug");

-- CreateIndex
CREATE INDEX "variables_team_id_idx" ON "variables"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "variables_team_id_key_key" ON "variables"("team_id", "key");

-- CreateIndex
CREATE INDEX "environment_variables_environment_id_idx" ON "environment_variables"("environment_id");

-- CreateIndex
CREATE UNIQUE INDEX "environment_variables_variable_id_environment_id_key" ON "environment_variables"("variable_id", "environment_id");

-- CreateIndex
CREATE INDEX "environment_promotions_team_id_idx" ON "environment_promotions"("team_id");

-- CreateIndex
CREATE INDEX "environment_promotions_source_env_id_idx" ON "environment_promotions"("source_env_id");

-- CreateIndex
CREATE INDEX "environment_promotions_target_env_id_idx" ON "environment_promotions"("target_env_id");

-- CreateIndex
CREATE INDEX "workflow_branches_workflow_id_idx" ON "workflow_branches"("workflow_id");

-- CreateIndex
CREATE INDEX "workflow_branches_base_branch_id_idx" ON "workflow_branches"("base_branch_id");

-- CreateIndex
CREATE INDEX "workflow_branches_status_idx" ON "workflow_branches"("status");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_branches_workflow_id_name_key" ON "workflow_branches"("workflow_id", "name");

-- CreateIndex
CREATE INDEX "branch_commits_branch_id_idx" ON "branch_commits"("branch_id");

-- CreateIndex
CREATE INDEX "branch_commits_parent_id_idx" ON "branch_commits"("parent_id");

-- CreateIndex
CREATE INDEX "workflow_pull_requests_workflow_id_idx" ON "workflow_pull_requests"("workflow_id");

-- CreateIndex
CREATE INDEX "workflow_pull_requests_source_branch_id_idx" ON "workflow_pull_requests"("source_branch_id");

-- CreateIndex
CREATE INDEX "workflow_pull_requests_target_branch_id_idx" ON "workflow_pull_requests"("target_branch_id");

-- CreateIndex
CREATE INDEX "workflow_pull_requests_status_idx" ON "workflow_pull_requests"("status");

-- CreateIndex
CREATE INDEX "pr_reviews_pr_id_idx" ON "pr_reviews"("pr_id");

-- CreateIndex
CREATE INDEX "pr_reviews_reviewer_id_idx" ON "pr_reviews"("reviewer_id");

-- CreateIndex
CREATE INDEX "pr_comments_pr_id_idx" ON "pr_comments"("pr_id");

-- CreateIndex
CREATE INDEX "pr_comments_node_id_idx" ON "pr_comments"("node_id");

-- CreateIndex
CREATE INDEX "executions_parent_execution_id_idx" ON "executions"("parent_execution_id");

-- CreateIndex
CREATE INDEX "workflow_templates_category_id_idx" ON "workflow_templates"("category_id");

-- CreateIndex
CREATE INDEX "workflow_templates_is_featured_idx" ON "workflow_templates"("is_featured");

-- CreateIndex
CREATE INDEX "workflow_templates_is_community_idx" ON "workflow_templates"("is_community");

-- AddForeignKey
ALTER TABLE "executions" ADD CONSTRAINT "executions_parent_execution_id_fkey" FOREIGN KEY ("parent_execution_id") REFERENCES "executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dead_letter_queue" ADD CONSTRAINT "dead_letter_queue_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dead_letter_queue" ADD CONSTRAINT "dead_letter_queue_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_channels" ADD CONSTRAINT "alert_channels_alert_rule_id_fkey" FOREIGN KEY ("alert_rule_id") REFERENCES "alert_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_templates" ADD CONSTRAINT "workflow_templates_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "template_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_workflows" ADD CONSTRAINT "sub_workflows_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_workflow_usages" ADD CONSTRAINT "sub_workflow_usages_sub_workflow_id_fkey" FOREIGN KEY ("sub_workflow_id") REFERENCES "sub_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_workflow_usages" ADD CONSTRAINT "sub_workflow_usages_parent_workflow_id_fkey" FOREIGN KEY ("parent_workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_parameters" ADD CONSTRAINT "template_parameters_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "workflow_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_ratings" ADD CONSTRAINT "template_ratings_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "workflow_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environments" ADD CONSTRAINT "environments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variables" ADD CONSTRAINT "variables_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environment_variables" ADD CONSTRAINT "environment_variables_variable_id_fkey" FOREIGN KEY ("variable_id") REFERENCES "variables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environment_variables" ADD CONSTRAINT "environment_variables_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environment_promotions" ADD CONSTRAINT "environment_promotions_source_env_id_fkey" FOREIGN KEY ("source_env_id") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environment_promotions" ADD CONSTRAINT "environment_promotions_target_env_id_fkey" FOREIGN KEY ("target_env_id") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_branches" ADD CONSTRAINT "workflow_branches_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_branches" ADD CONSTRAINT "workflow_branches_base_branch_id_fkey" FOREIGN KEY ("base_branch_id") REFERENCES "workflow_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_branches" ADD CONSTRAINT "workflow_branches_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_commits" ADD CONSTRAINT "branch_commits_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "workflow_branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_commits" ADD CONSTRAINT "branch_commits_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "branch_commits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_pull_requests" ADD CONSTRAINT "workflow_pull_requests_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_pull_requests" ADD CONSTRAINT "workflow_pull_requests_source_branch_id_fkey" FOREIGN KEY ("source_branch_id") REFERENCES "workflow_branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_pull_requests" ADD CONSTRAINT "workflow_pull_requests_target_branch_id_fkey" FOREIGN KEY ("target_branch_id") REFERENCES "workflow_branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pr_reviews" ADD CONSTRAINT "pr_reviews_pr_id_fkey" FOREIGN KEY ("pr_id") REFERENCES "workflow_pull_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pr_comments" ADD CONSTRAINT "pr_comments_pr_id_fkey" FOREIGN KEY ("pr_id") REFERENCES "workflow_pull_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pr_comments" ADD CONSTRAINT "pr_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "pr_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
