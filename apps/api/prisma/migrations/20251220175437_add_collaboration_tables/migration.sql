-- CreateEnum
CREATE TYPE "ChangeType" AS ENUM ('NODE_ADDED', 'NODE_UPDATED', 'NODE_DELETED', 'NODE_MOVED', 'EDGE_ADDED', 'EDGE_DELETED', 'CONFIG_CHANGED', 'SETTINGS_CHANGED');

-- CreateTable
CREATE TABLE "workflow_sessions" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "socket_id" TEXT NOT NULL,
    "cursor_x" DOUBLE PRECISION,
    "cursor_y" DOUBLE PRECISION,
    "viewport_x" DOUBLE PRECISION,
    "viewport_y" DOUBLE PRECISION,
    "viewport_zoom" DOUBLE PRECISION,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_heartbeat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnected_at" TIMESTAMP(3),

    CONSTRAINT "workflow_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parent_id" TEXT,
    "node_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "edited_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_mentions" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_mentions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_changes" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "change_type" "ChangeType" NOT NULL,
    "node_id" TEXT,
    "edge_id" TEXT,
    "previous_data" JSONB,
    "new_data" JSONB,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workflow_sessions_workflow_id_is_active_idx" ON "workflow_sessions"("workflow_id", "is_active");

-- CreateIndex
CREATE INDEX "workflow_sessions_user_id_idx" ON "workflow_sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_sessions_workflow_id_socket_id_key" ON "workflow_sessions"("workflow_id", "socket_id");

-- CreateIndex
CREATE INDEX "chat_messages_workflow_id_created_at_idx" ON "chat_messages"("workflow_id", "created_at");

-- CreateIndex
CREATE INDEX "chat_messages_author_id_idx" ON "chat_messages"("author_id");

-- CreateIndex
CREATE INDEX "chat_messages_parent_id_idx" ON "chat_messages"("parent_id");

-- CreateIndex
CREATE INDEX "chat_mentions_user_id_read_idx" ON "chat_mentions"("user_id", "read");

-- CreateIndex
CREATE UNIQUE INDEX "chat_mentions_message_id_user_id_key" ON "chat_mentions"("message_id", "user_id");

-- CreateIndex
CREATE INDEX "workflow_changes_workflow_id_created_at_idx" ON "workflow_changes"("workflow_id", "created_at");

-- CreateIndex
CREATE INDEX "workflow_changes_user_id_idx" ON "workflow_changes"("user_id");

-- CreateIndex
CREATE INDEX "workflow_changes_node_id_idx" ON "workflow_changes"("node_id");

-- AddForeignKey
ALTER TABLE "workflow_sessions" ADD CONSTRAINT "workflow_sessions_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_sessions" ADD CONSTRAINT "workflow_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_mentions" ADD CONSTRAINT "chat_mentions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_mentions" ADD CONSTRAINT "chat_mentions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_changes" ADD CONSTRAINT "workflow_changes_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_changes" ADD CONSTRAINT "workflow_changes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
