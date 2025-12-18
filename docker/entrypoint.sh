#!/bin/sh
set -e

echo "=========================================="
echo "WS-Flows API Starting..."
echo "=========================================="

# Wait for database to be ready using pg_isready-like approach
echo "Waiting for database..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
  if node -e "
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    prisma.\$connect()
      .then(() => { prisma.\$disconnect(); process.exit(0); })
      .catch(() => process.exit(1));
  " 2>/dev/null; then
    echo "Database is ready!"
    break
  fi
  echo "Database not ready, waiting... (attempt $attempt/$max_attempts)"
  sleep 2
  attempt=$((attempt + 1))
done

if [ $attempt -gt $max_attempts ]; then
  echo "ERROR: Database connection timeout after $max_attempts attempts"
  exit 1
fi

# Run migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Run seed using compiled JS (skip if fails - likely already seeded)
echo "Running database seed..."
if [ -f "prisma/dist/seed.js" ]; then
  node prisma/dist/seed.js || echo "Seed skipped (already applied or error)"
else
  echo "Seed script not found, skipping..."
fi

echo "=========================================="
echo "Starting API server..."
echo "=========================================="

# Start the application
exec node dist/main.js
