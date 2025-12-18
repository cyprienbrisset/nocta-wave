#!/bin/bash

# WS-Flows Setup Script
# This script performs initial setup without starting the app

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════╗"
echo "║           WS-Flows Setup                  ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

# Check requirements
echo -e "${YELLOW}1. Checking requirements...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "  Install from: https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}  ✓ Node.js $(node -v)${NC}"

if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}  Installing pnpm...${NC}"
    npm install -g pnpm
fi
echo -e "${GREEN}  ✓ pnpm $(pnpm -v)${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker is not installed${NC}"
    echo "  Install from: https://docker.com/"
    exit 1
fi
echo -e "${GREEN}  ✓ Docker $(docker -v | cut -d' ' -f3 | tr -d ',')${NC}"

# Create .env file
echo -e "${YELLOW}2. Setting up environment...${NC}"

if [ ! -f ".env" ]; then
    cp .env.example .env

    # Generate secrets
    JWT_SECRET=$(openssl rand -hex 32)
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    POSTGRES_PASSWORD=$(openssl rand -hex 16)
    REDIS_PASSWORD=$(openssl rand -hex 16)
    TRIGGER_MAGIC_LINK=$(openssl rand -hex 32)
    TRIGGER_SESSION=$(openssl rand -hex 32)
    TRIGGER_ENCRYPTION=$(openssl rand -hex 32)
    TRIGGER_WORKER=$(openssl rand -hex 32)

    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/your-jwt-secret-min-32-chars/$JWT_SECRET/" .env
        sed -i '' "s/your-encryption-key-min-32-chars/$ENCRYPTION_KEY/" .env
        sed -i '' "s/POSTGRES_PASSWORD=password/POSTGRES_PASSWORD=$POSTGRES_PASSWORD/" .env
        sed -i '' "s/REDIS_PASSWORD=password/REDIS_PASSWORD=$REDIS_PASSWORD/" .env
        # Update DATABASE_URL with new password
        sed -i '' "s|postgresql://postgres:password@|postgresql://postgres:$POSTGRES_PASSWORD@|" .env
        # Update REDIS_URL with new password
        sed -i '' "s|redis://:password@|redis://:$REDIS_PASSWORD@|" .env
        # Update Trigger.dev secrets
        sed -i '' "s/change-me-trigger-magic-link-secret-32-chars/$TRIGGER_MAGIC_LINK/" .env
        sed -i '' "s/change-me-trigger-session-secret-32-chars/$TRIGGER_SESSION/" .env
        sed -i '' "s/change-me-trigger-encryption-key-32-chars/$TRIGGER_ENCRYPTION/" .env
        sed -i '' "s/change-me-worker-secret/$TRIGGER_WORKER/" .env
    else
        sed -i "s/your-jwt-secret-min-32-chars/$JWT_SECRET/" .env
        sed -i "s/your-encryption-key-min-32-chars/$ENCRYPTION_KEY/" .env
        sed -i "s/POSTGRES_PASSWORD=password/POSTGRES_PASSWORD=$POSTGRES_PASSWORD/" .env
        sed -i "s/REDIS_PASSWORD=password/REDIS_PASSWORD=$REDIS_PASSWORD/" .env
        # Update DATABASE_URL with new password
        sed -i "s|postgresql://postgres:password@|postgresql://postgres:$POSTGRES_PASSWORD@|" .env
        # Update REDIS_URL with new password
        sed -i "s|redis://:password@|redis://:$REDIS_PASSWORD@|" .env
        # Update Trigger.dev secrets
        sed -i "s/change-me-trigger-magic-link-secret-32-chars/$TRIGGER_MAGIC_LINK/" .env
        sed -i "s/change-me-trigger-session-secret-32-chars/$TRIGGER_SESSION/" .env
        sed -i "s/change-me-trigger-encryption-key-32-chars/$TRIGGER_ENCRYPTION/" .env
        sed -i "s/change-me-worker-secret/$TRIGGER_WORKER/" .env
    fi

    echo -e "${GREEN}  ✓ Created .env with secure secrets${NC}"
else
    echo -e "${GREEN}  ✓ .env already exists${NC}"
fi

# Install dependencies
echo -e "${YELLOW}3. Installing dependencies...${NC}"
pnpm install
echo -e "${GREEN}  ✓ Dependencies installed${NC}"

# Start Docker
echo -e "${YELLOW}4. Starting Docker services...${NC}"
# Copy .env to docker folder so docker-compose can use it
cp "$ROOT_DIR/.env" "$ROOT_DIR/docker/.env"
docker compose -f docker/docker-compose.yml --env-file "$ROOT_DIR/.env" up -d

# Wait for services
echo -e "${YELLOW}5. Waiting for services...${NC}"
sleep 5

until docker exec wsflows-postgres pg_isready -U postgres > /dev/null 2>&1; do
    sleep 2
done
echo -e "${GREEN}  ✓ PostgreSQL ready${NC}"

until docker exec wsflows-redis redis-cli ping > /dev/null 2>&1; do
    sleep 2
done
echo -e "${GREEN}  ✓ Redis ready${NC}"

# Setup database
echo -e "${YELLOW}6. Setting up database...${NC}"
# Copy .env to apps/api for Prisma to find it
cp "$ROOT_DIR/.env" "$ROOT_DIR/apps/api/.env"
cd "$ROOT_DIR/apps/api"
pnpm db:generate
pnpm db:migrate
cd "$ROOT_DIR"
echo -e "${GREEN}  ✓ Database migrated${NC}"

# Done
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════╗"
echo -e "║           Setup Complete!                 ║"
echo -e "╚═══════════════════════════════════════════╝${NC}"
echo ""
echo "To start the application:"
echo -e "  ${BLUE}pnpm dev${NC}"
echo ""
echo "Services:"
echo "  • Web UI:    http://localhost:3000"
echo "  • API:       http://localhost:3001"
echo "  • API Docs:  http://localhost:3001/docs"
echo ""
