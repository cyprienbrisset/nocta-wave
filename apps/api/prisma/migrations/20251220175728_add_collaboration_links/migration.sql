-- CreateEnum
CREATE TYPE "CollaborationPermission" AS ENUM ('VIEW', 'COMMENT', 'EDIT');

-- CreateTable
CREATE TABLE "collaboration_links" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "name" TEXT,
    "permission" "CollaborationPermission" NOT NULL DEFAULT 'VIEW',
    "max_uses" INTEGER,
    "use_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collaboration_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_sessions" (
    "id" TEXT NOT NULL,
    "link_id" TEXT NOT NULL,
    "guest_name" TEXT NOT NULL,
    "guest_color" TEXT NOT NULL,
    "socket_id" TEXT,
    "cursor_x" DOUBLE PRECISION,
    "cursor_y" DOUBLE PRECISION,
    "viewport_x" DOUBLE PRECISION,
    "viewport_y" DOUBLE PRECISION,
    "viewport_zoom" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_heartbeat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnected_at" TIMESTAMP(3),

    CONSTRAINT "guest_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "collaboration_links_token_key" ON "collaboration_links"("token");

-- CreateIndex
CREATE INDEX "collaboration_links_workflow_id_idx" ON "collaboration_links"("workflow_id");

-- CreateIndex
CREATE INDEX "collaboration_links_token_idx" ON "collaboration_links"("token");

-- CreateIndex
CREATE INDEX "collaboration_links_created_by_id_idx" ON "collaboration_links"("created_by_id");

-- CreateIndex
CREATE INDEX "guest_sessions_link_id_is_active_idx" ON "guest_sessions"("link_id", "is_active");

-- CreateIndex
CREATE INDEX "guest_sessions_socket_id_idx" ON "guest_sessions"("socket_id");

-- AddForeignKey
ALTER TABLE "collaboration_links" ADD CONSTRAINT "collaboration_links_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaboration_links" ADD CONSTRAINT "collaboration_links_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_sessions" ADD CONSTRAINT "guest_sessions_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "collaboration_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
