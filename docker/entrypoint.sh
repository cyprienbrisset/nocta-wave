#!/bin/sh

echo "=========================================="
echo "WS-Flows API Starting..."
echo "=========================================="
echo "DATABASE_URL: ${DATABASE_URL:-not set}"
echo "NODE_ENV: ${NODE_ENV:-not set}"
echo "PORT: ${PORT:-3001}"
echo "Working directory: $(pwd)"
echo "Node version: $(node --version)"
echo ""

# Debug: check files
echo "Checking required files..."
ls -la dist/main.js 2>/dev/null && echo "OK: dist/main.js exists" || echo "ERROR: dist/main.js not found!"
ls -la prisma/schema.prisma 2>/dev/null && echo "OK: prisma/schema.prisma exists" || echo "ERROR: prisma/schema.prisma not found!"
ls -la node_modules/.prisma/client 2>/dev/null && echo "OK: Prisma client exists" || echo "WARNING: Prisma client may need regeneration"
echo ""

# Regenerate Prisma client for this platform (fixes openssl issues)
echo "Regenerating Prisma client for current platform..."
npx prisma generate 2>&1 || echo "Warning: Prisma generate had issues"
echo ""

# Debug: try to resolve postgres hostname
echo "Checking network connectivity..."
echo "Resolving 'postgres' hostname:"
getent hosts postgres 2>&1 || echo "Warning: Could not resolve 'postgres' hostname (may be normal during startup)"
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
  output=$(npx prisma migrate deploy 2>&1)
  exit_code=$?

  echo "$output"

  if [ $exit_code -eq 0 ]; then
    db_ready=1
    echo "Database is ready and migrations applied!"
    break
  fi

  echo "Database not ready yet (exit code: $exit_code), waiting 3 seconds..."
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
