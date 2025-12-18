#!/bin/sh

echo "=========================================="
echo "WS-Flows API Starting..."
echo "=========================================="
echo "DATABASE_URL: ${DATABASE_URL:-not set}"
echo "NODE_ENV: ${NODE_ENV:-not set}"
echo "PORT: ${PORT:-3001}"
echo ""

# Debug: try to resolve postgres hostname
echo "Checking network connectivity..."
echo "Resolving 'postgres' hostname:"
getent hosts postgres 2>&1 || echo "Warning: Could not resolve 'postgres' hostname"
echo ""

# Wait for database using prisma migrate with timeout
echo "Waiting for database to be ready..."
max_attempts=30
attempt=1
db_ready=0

while [ $attempt -le $max_attempts ]; do
  echo ""
  echo "=== Attempt $attempt/$max_attempts ==="

  # Try to run prisma migrate deploy - it will fail if DB is not ready
  if npx prisma migrate deploy 2>&1; then
    db_ready=1
    echo "Database is ready and migrations applied!"
    break
  fi

  echo "Database not ready yet, waiting 3 seconds..."
  sleep 3
  attempt=$((attempt + 1))
done

if [ $db_ready -eq 0 ]; then
  echo ""
  echo "ERROR: Could not connect to database after $max_attempts attempts"
  echo "Please check:"
  echo "  1. PostgreSQL container is running"
  echo "  2. DATABASE_URL is correct"
  echo "  3. Network connectivity between containers"
  exit 1
fi

echo ""

# Run seed using compiled JS (skip if fails - likely already seeded)
echo "Running database seed..."
if [ -f "prisma/dist/seed.js" ]; then
  node prisma/dist/seed.js && echo "Seed completed!" || echo "Seed skipped (already applied or error)"
else
  echo "Seed script not found at prisma/dist/seed.js, skipping..."
fi

echo ""
echo "=========================================="
echo "Starting API server on port ${PORT:-3001}..."
echo "=========================================="

# Start the application (this replaces the shell process)
exec node dist/main.js
