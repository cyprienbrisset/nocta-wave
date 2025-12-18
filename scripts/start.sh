#!/bin/bash

# WS-Flows Start Script
# This script sets up and starts the entire application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                     WS-Flows Starter                      ║"
echo "║            Workflow Automation Platform                   ║"
echo "║                                                           ║"
echo "║  Services: API • Web • PostgreSQL • Redis • Trigger.dev   ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

# Check for required tools
check_requirements() {
    echo -e "${YELLOW}[1/6] Checking requirements...${NC}"

    if ! command -v node &> /dev/null; then
        echo -e "${RED}Error: Node.js is not installed${NC}"
        exit 1
    fi
    NODE_VERSION=$(node -v)
    echo -e "  ${GREEN}✓${NC} Node.js ${NODE_VERSION}"

    if ! command -v pnpm &> /dev/null; then
        echo -e "${RED}Error: pnpm is not installed${NC}"
        echo "Install with: npm install -g pnpm"
        exit 1
    fi
    PNPM_VERSION=$(pnpm -v)
    echo -e "  ${GREEN}✓${NC} pnpm ${PNPM_VERSION}"

    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Error: Docker is not installed${NC}"
        exit 1
    fi
    DOCKER_VERSION=$(docker -v | cut -d ' ' -f3 | tr -d ',')
    echo -e "  ${GREEN}✓${NC} Docker ${DOCKER_VERSION}"

    echo -e "${GREEN}✓ All requirements met${NC}"
    echo ""
}

# Setup environment file
setup_env() {
    echo -e "${YELLOW}[2/6] Setting up environment...${NC}"

    if [ ! -f ".env" ]; then
        echo -e "  Creating .env file with secure secrets..."
        cp .env.example .env

        # Generate random secrets
        JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
        REFRESH_TOKEN_SECRET=$(openssl rand -base64 64 | tr -d '\n')
        ENCRYPTION_KEY=$(openssl rand -hex 32)
        POSTGRES_PASSWORD=$(openssl rand -hex 16)
        REDIS_PASSWORD=$(openssl rand -hex 16)
        TRIGGER_MAGIC_LINK=$(openssl rand -hex 32)
        TRIGGER_SESSION=$(openssl rand -hex 32)
        TRIGGER_ENCRYPTION=$(openssl rand -hex 32)
        TRIGGER_WORKER=$(openssl rand -hex 32)

        # Update .env with generated secrets
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/your-jwt-secret-min-32-chars/$JWT_SECRET/" .env
            sed -i '' "s/your-refresh-token-secret-min-32-chars/$REFRESH_TOKEN_SECRET/" .env
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
            # Linux
            sed -i "s/your-jwt-secret-min-32-chars/$JWT_SECRET/" .env
            sed -i "s/your-refresh-token-secret-min-32-chars/$REFRESH_TOKEN_SECRET/" .env
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

        echo -e "  ${GREEN}✓${NC} Environment file created with secure secrets"
    else
        echo -e "  ${GREEN}✓${NC} Environment file already exists"
    fi
    echo -e "${GREEN}✓ Environment ready${NC}"
    echo ""
}

# Install dependencies
install_deps() {
    echo -e "${YELLOW}[3/6] Installing dependencies...${NC}"
    pnpm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
    echo ""
}

# Start Docker services
start_docker() {
    echo -e "${YELLOW}[4/6] Starting Docker services...${NC}"

    # Copy .env to docker folder so docker-compose can use it
    cp "$ROOT_DIR/.env" "$ROOT_DIR/docker/.env"

    echo -e "  Starting PostgreSQL, Redis, and Trigger.dev..."
    docker compose -f docker/docker-compose.yml --env-file "$ROOT_DIR/.env" up -d

    # Wait for services to be ready
    echo -e "  Waiting for services to be ready..."

    # Check PostgreSQL
    echo -ne "  PostgreSQL: "
    until docker exec wsflows-postgres pg_isready -U postgres > /dev/null 2>&1; do
        echo -n "."
        sleep 2
    done
    echo -e " ${GREEN}ready${NC}"

    # Check Redis
    echo -ne "  Redis: "
    until docker exec wsflows-redis redis-cli ping > /dev/null 2>&1; do
        echo -n "."
        sleep 2
    done
    echo -e " ${GREEN}ready${NC}"

    # Check Trigger.dev PostgreSQL
    echo -ne "  Trigger.dev DB: "
    until docker exec wsflows-trigger-postgres pg_isready -U trigger > /dev/null 2>&1; do
        echo -n "."
        sleep 2
    done
    echo -e " ${GREEN}ready${NC}"

    # Check Trigger.dev webapp
    echo -ne "  Trigger.dev: "
    sleep 10
    echo -e " ${GREEN}starting${NC}"

    echo -e "${GREEN}✓ Docker services running${NC}"
    echo ""
}

# Setup database
setup_database() {
    echo -e "${YELLOW}[5/6] Setting up database...${NC}"

    # Copy .env to apps/api for Prisma to find it
    cp "$ROOT_DIR/.env" "$ROOT_DIR/apps/api/.env"

    cd "$ROOT_DIR/apps/api"

    # Generate Prisma client
    echo -e "  Generating Prisma client..."
    pnpm db:generate

    # Run migrations
    echo -e "  Applying migrations..."
    pnpm db:migrate

    # Seed database
    echo -e "  Seeding database (admin user, tags, templates)..."
    pnpm db:seed || echo -e "  ${YELLOW}Seed skipped (already applied)${NC}"

    cd "$ROOT_DIR"
    echo -e "${GREEN}✓ Database ready${NC}"
    echo ""
}

# Start all services
start_services() {
    echo -e "${YELLOW}[6/6] Starting application services...${NC}"
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                    Services URLs                          ║${NC}"
    echo -e "${CYAN}╠═══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║${NC}  ${GREEN}Web UI${NC}        →  http://localhost:4000                  ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  ${GREEN}API${NC}           →  http://localhost:4001                  ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  ${GREEN}API Docs${NC}      →  http://localhost:4001/docs             ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  ${GREEN}Trigger.dev${NC}   →  http://localhost:4002                  ${CYAN}║${NC}"
    echo -e "${CYAN}╠═══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║${NC}                    Default Credentials                     ${CYAN}║${NC}"
    echo -e "${CYAN}╠═══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║${NC}  ${YELLOW}Email${NC}:    admin@wsflows.local                           ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  ${YELLOW}Password${NC}: admin123                                      ${CYAN}║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Note:${NC} First time with Trigger.dev? Create an account at http://localhost:4002"
    echo -e "${YELLOW}      Check Docker logs for the magic link:${NC} docker logs wsflows-trigger"
    echo ""
    echo -e "${GREEN}Starting development servers...${NC}"
    echo ""

    # Start in development mode (excluding worker since Trigger.dev handles execution)
    pnpm dev --filter='!@ws-flows/worker'
}

# Main execution
main() {
    check_requirements
    setup_env
    install_deps
    start_docker
    setup_database
    start_services
}

# Handle cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down services...${NC}"
    cd "$ROOT_DIR"
    docker compose -f docker/docker-compose.yml down
    echo -e "${GREEN}✓ Cleanup complete${NC}"
}

trap cleanup EXIT

main
