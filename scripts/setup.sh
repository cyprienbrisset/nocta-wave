#!/bin/bash

# WS-Flows Setup Script
# This script performs initial setup without starting the app

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                     WS-Flows Setup                        ║"
echo "║            Workflow Automation Platform                   ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

# Check requirements
echo -e "${YELLOW}[1/6] Checking requirements...${NC}"

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
echo -e "${YELLOW}[2/6] Setting up environment...${NC}"

if [ ! -f ".env" ]; then
    cp .env.example .env

    # Generate secrets
    JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
    REFRESH_TOKEN_SECRET=$(openssl rand -base64 64 | tr -d '\n')
    ENCRYPTION_KEY=$(openssl rand -hex 32)

    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/your-jwt-secret-min-32-chars/$JWT_SECRET/" .env
        sed -i '' "s/your-refresh-token-secret-min-32-chars/$REFRESH_TOKEN_SECRET/" .env
        sed -i '' "s/your-encryption-key-min-32-chars/$ENCRYPTION_KEY/" .env
    else
        sed -i "s/your-jwt-secret-min-32-chars/$JWT_SECRET/" .env
        sed -i "s/your-refresh-token-secret-min-32-chars/$REFRESH_TOKEN_SECRET/" .env
        sed -i "s/your-encryption-key-min-32-chars/$ENCRYPTION_KEY/" .env
    fi

    echo -e "${GREEN}  ✓ Created .env with secure secrets${NC}"
else
    echo -e "${GREEN}  ✓ .env already exists${NC}"
fi

# Install dependencies
echo -e "${YELLOW}[3/6] Installing dependencies...${NC}"
pnpm install
echo -e "${GREEN}  ✓ Dependencies installed${NC}"

# Start Docker
echo -e "${YELLOW}[4/6] Starting Docker services...${NC}"
docker compose -f docker/docker-compose.yml up -d

# Wait for services
echo -e "${YELLOW}[5/6] Waiting for services...${NC}"
sleep 5

echo -ne "  PostgreSQL: "
until docker exec wsflows-postgres pg_isready -U postgres > /dev/null 2>&1; do
    echo -n "."
    sleep 2
done
echo -e " ${GREEN}ready${NC}"

echo -ne "  Redis: "
until docker exec wsflows-redis redis-cli ping > /dev/null 2>&1; do
    echo -n "."
    sleep 2
done
echo -e " ${GREEN}ready${NC}"

# Setup database
echo -e "${YELLOW}[6/6] Setting up database...${NC}"
# Copy .env to apps/api for Prisma to find it
cp "$ROOT_DIR/.env" "$ROOT_DIR/apps/api/.env"
cd "$ROOT_DIR/apps/api"

echo -e "  Generating Prisma client..."
pnpm db:generate

echo -e "  Applying migrations..."
pnpm db:migrate

echo -e "  Seeding database..."
pnpm db:seed || echo -e "  ${YELLOW}Seed skipped (already applied)${NC}"

cd "$ROOT_DIR"
echo -e "${GREEN}  ✓ Database ready${NC}"

# Done
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗"
echo -e "║                    Setup Complete!                        ║"
echo -e "╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    Services URLs                          ║${NC}"
echo -e "${CYAN}╠═══════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║${NC}  ${GREEN}Web UI${NC}        →  http://localhost:4000                  ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  ${GREEN}API${NC}           →  http://localhost:4001                  ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  ${GREEN}API Docs${NC}      →  http://localhost:4001/docs             ${CYAN}║${NC}"
echo -e "${CYAN}╠═══════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║${NC}                    Default Credentials                     ${CYAN}║${NC}"
echo -e "${CYAN}╠═══════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║${NC}  ${YELLOW}Email${NC}:    admin@wsflows.local                           ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  ${YELLOW}Password${NC}: admin123                                      ${CYAN}║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "To start the application:"
echo -e "  ${BLUE}pnpm dev${NC}"
echo ""
echo -e "${YELLOW}Note:${NC} Change the admin password after first login!"
echo ""
