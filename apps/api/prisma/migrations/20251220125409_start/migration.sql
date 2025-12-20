-- CreateEnum
CREATE TYPE "MetricPeriod" AS ENUM ('MINUTE', 'HOUR', 'DAY');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL');

-- CreateEnum
CREATE TYPE "SpanStatus" AS ENUM ('UNSET', 'OK', 'ERROR');

-- CreateTable
CREATE TABLE "metric_snapshots" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period" "MetricPeriod" NOT NULL DEFAULT 'MINUTE',
    "total_executions" INTEGER NOT NULL DEFAULT 0,
    "successful_executions" INTEGER NOT NULL DEFAULT 0,
    "failed_executions" INTEGER NOT NULL DEFAULT 0,
    "cancelled_executions" INTEGER NOT NULL DEFAULT 0,
    "timed_out_executions" INTEGER NOT NULL DEFAULT 0,
    "avg_duration" INTEGER,
    "min_duration" INTEGER,
    "max_duration" INTEGER,
    "p50_duration" INTEGER,
    "p95_duration" INTEGER,
    "p99_duration" INTEGER,
    "executions_per_minute" DOUBLE PRECISION,
    "nodes_executed" INTEGER NOT NULL DEFAULT 0,
    "error_types" JSONB,
    "top_errors" JSONB,
    "queue_depth" INTEGER NOT NULL DEFAULT 0,
    "queue_latency" INTEGER,
    "memory_usage_mb" DOUBLE PRECISION,
    "cpu_usage_percent" DOUBLE PRECISION,

    CONSTRAINT "metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "structured_logs" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "workflow_id" TEXT,
    "execution_id" TEXT,
    "node_id" TEXT,
    "level" "LogLevel" NOT NULL,
    "message" TEXT NOT NULL,
    "context" JSONB,
    "trace_id" TEXT,
    "span_id" TEXT,
    "parent_span_id" TEXT,
    "source" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "structured_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trace_spans" (
    "id" TEXT NOT NULL,
    "trace_id" TEXT NOT NULL,
    "span_id" TEXT NOT NULL,
    "parent_span_id" TEXT,
    "team_id" TEXT NOT NULL,
    "execution_id" TEXT,
    "node_id" TEXT,
    "operation_name" TEXT NOT NULL,
    "service_name" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "duration" INTEGER,
    "status" "SpanStatus" NOT NULL DEFAULT 'UNSET',
    "status_message" TEXT,
    "attributes" JSONB,
    "events" JSONB,
    "links" JSONB,

    CONSTRAINT "trace_spans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "metric_snapshots_team_id_timestamp_idx" ON "metric_snapshots"("team_id", "timestamp");

-- CreateIndex
CREATE INDEX "metric_snapshots_team_id_period_idx" ON "metric_snapshots"("team_id", "period");

-- CreateIndex
CREATE INDEX "structured_logs_team_id_timestamp_idx" ON "structured_logs"("team_id", "timestamp");

-- CreateIndex
CREATE INDEX "structured_logs_workflow_id_timestamp_idx" ON "structured_logs"("workflow_id", "timestamp");

-- CreateIndex
CREATE INDEX "structured_logs_execution_id_idx" ON "structured_logs"("execution_id");

-- CreateIndex
CREATE INDEX "structured_logs_level_timestamp_idx" ON "structured_logs"("level", "timestamp");

-- CreateIndex
CREATE INDEX "structured_logs_trace_id_idx" ON "structured_logs"("trace_id");

-- CreateIndex
CREATE INDEX "trace_spans_trace_id_idx" ON "trace_spans"("trace_id");

-- CreateIndex
CREATE INDEX "trace_spans_team_id_start_time_idx" ON "trace_spans"("team_id", "start_time");

-- CreateIndex
CREATE INDEX "trace_spans_execution_id_idx" ON "trace_spans"("execution_id");

-- CreateIndex
CREATE INDEX "trace_spans_span_id_idx" ON "trace_spans"("span_id");

-- AddForeignKey
ALTER TABLE "alert_history" ADD CONSTRAINT "alert_history_alert_rule_id_fkey" FOREIGN KEY ("alert_rule_id") REFERENCES "alert_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
