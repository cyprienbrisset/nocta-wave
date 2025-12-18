#!/bin/sh
set -e

echo "=========================================="
echo "WS-Flows API Starting..."
echo "=========================================="

# Wait for database to be ready
echo "Waiting for database..."
until npx prisma db execute --stdin <<< "SELECT 1" 2>/dev/null; do
  echo "Database not ready, waiting..."
  sleep 2
done
echo "Database is ready!"

# Run migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Run seed (will skip if already seeded)
echo "Running database seed..."
npx prisma db seed || echo "Seed skipped or already applied"

echo "=========================================="
echo "Starting API server..."
echo "=========================================="

# Start the application
exec node dist/main.js
