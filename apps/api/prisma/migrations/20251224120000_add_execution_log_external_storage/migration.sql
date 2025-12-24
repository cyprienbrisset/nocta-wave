-- Add external storage reference fields for execution logs
-- Large inputData/outputData can be stored in object storage (MinIO/S3)
-- These fields contain references to externalized data

-- Add input_data_ref column (JSON with bucket, key, size, compressed, checksum, storedAt)
ALTER TABLE "execution_logs" ADD COLUMN "input_data_ref" JSONB;

-- Add output_data_ref column (JSON with bucket, key, size, compressed, checksum, storedAt)
ALTER TABLE "execution_logs" ADD COLUMN "output_data_ref" JSONB;

-- Add comment to explain the purpose
COMMENT ON COLUMN "execution_logs"."input_data_ref" IS 'Reference to externalized input data in object storage (MinIO/S3)';
COMMENT ON COLUMN "execution_logs"."output_data_ref" IS 'Reference to externalized output data in object storage (MinIO/S3)';
