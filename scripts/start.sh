#!/bin/bash

# WS-Flows Start Script
# This script sets up and starts the entire application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════╗"
echo "║           WS-Flows Starter                ║"
echo "║     Workflow Automation Platform          ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${NC}"

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

# Check for required tools
check_requirements() {
    echo -e "${YELLOW}Checking requirements...${NC}"

    if ! command -v node &> /dev/null; then
        echo -e "${RED}Error: Node.js is not installed${NC}"
        exit 1
    fi

    if ! command -v pnpm &> /dev/null; then
        echo -e "${RED}Error: pnpm is not installed${NC}"
        echo "Install with: npm install -g pnpm"
        exit 1
    fi

    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Error: Docker is not installed${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ All requirements met${NC}"
}

# Setup environment file
setup_env() {
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}Creating .env file...${NC}"
        cp .env.example .env

        # Generate random secrets
        JWT_SECRET=$(openssl rand -hex 32)
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

        echo -e "${GREEN}✓ Environment file created with secure secrets${NC}"
    else
        echo -e "${GREEN}✓ Environment file exists${NC}"
    fi
}

# Install dependencies
install_deps() {
    echo -e "${YELLOW}Installing dependencies...${NC}"
    pnpm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
}

# Start Docker services
start_docker() {
    echo -e "${YELLOW}Starting Docker services (PostgreSQL + Redis + Trigger.dev)...${NC}"

    # Copy .env to docker folder so docker-compose can use it
    cp "$ROOT_DIR/.env" "$ROOT_DIR/docker/.env"

    docker compose -f docker/docker-compose.yml --env-file "$ROOT_DIR/.env" up -d

    # Wait for services to be ready
    echo -e "${YELLOW}Waiting for services to be ready...${NC}"
    sleep 5

    # Check PostgreSQL
    until docker exec wsflows-postgres pg_isready -U postgres > /dev/null 2>&1; do
        echo "Waiting for PostgreSQL..."
        sleep 2
    done
    echo -e "${GREEN}  ✓ PostgreSQL ready${NC}"

    # Check Redis
    until docker exec wsflows-redis redis-cli ping > /dev/null 2>&1; do
        echo "Waiting for Redis..."
        sleep 2
    done
    echo -e "${GREEN}  ✓ Redis ready${NC}"

    # Check Trigger.dev PostgreSQL
    until docker exec wsflows-trigger-postgres pg_isready -U trigger > /dev/null 2>&1; do
        echo "Waiting for Trigger.dev PostgreSQL..."
        sleep 2
    done
    echo -e "${GREEN}  ✓ Trigger.dev PostgreSQL ready${NC}"

    # Check Trigger.dev webapp
    echo "Waiting for Trigger.dev webapp..."
    sleep 10
    echo -e "${GREEN}  ✓ Trigger.dev starting${NC}"

    echo -e "${GREEN}✓ Docker services running${NC}"
}

# Setup database
setup_database() {
    echo -e "${YELLOW}Setting up database...${NC}"

    # Copy .env to apps/api for Prisma to find it
    cp "$ROOT_DIR/.env" "$ROOT_DIR/apps/api/.env"

    cd "$ROOT_DIR/apps/api"

    # Generate Prisma client
    pnpm db:generate

    # Run migrations
    pnpm db:migrate

    cd "$ROOT_DIR"
    echo -e "${GREEN}✓ Database ready${NC}"
}

# Start all services
start_services() {
    echo -e "${YELLOW}Starting all services...${NC}"
    echo ""
    echo -e "${BLUE}Services will start:${NC}"
    echo "  • Web UI:      http://localhost:3000"
    echo "  • API:         http://localhost:3001"
    echo "  • API Docs:    http://localhost:3001/docs"
    echo "  • Trigger.dev: http://localhost:3040"
    echo ""
    echo -e "${YELLOW}Note: First time, create a Trigger.dev account at http://localhost:3040${NC}"
    echo -e "${YELLOW}      Check Docker logs for the magic link: docker logs wsflows-trigger${NC}"
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
    echo -e "${YELLOW}Shutting down...${NC}"
    cd "$ROOT_DIR"
    docker compose -f docker/docker-compose.yml down
    echo -e "${GREEN}✓ Cleanup complete${NC}"
}

trap cleanup EXIT

main
