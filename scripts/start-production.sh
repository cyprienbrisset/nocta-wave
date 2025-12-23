#!/bin/bash

# WS-Flows Production Start Script
# This script builds and starts the application in production mode

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
echo "║                 WS-Flows Production Mode                  ║"
echo "║            Workflow Automation Platform                   ║"
echo "║                                                           ║"
echo "║         Services: API • Web • PostgreSQL • Redis          ║"
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
        echo -e "${RED}Error: .env file not found. Run start.sh first to create it.${NC}"
        exit 1
    fi

    # Set NODE_ENV to production
    export NODE_ENV=production

    echo -e "  ${GREEN}✓${NC} Environment file exists"
    echo -e "  ${GREEN}✓${NC} NODE_ENV=production"
    echo -e "${GREEN}✓ Environment ready${NC}"
    echo ""
}

# Install dependencies
install_deps() {
    echo -e "${YELLOW}[3/6] Installing dependencies...${NC}"
    pnpm install --frozen-lockfile 2>/dev/null || pnpm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
    echo ""
}

# Start Docker services
start_docker() {
    echo -e "${YELLOW}[4/6] Starting Docker services...${NC}"

    echo -e "  Starting PostgreSQL and Redis..."
    docker compose -f docker/docker-compose.yml up -d postgres redis

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
    pnpm db:seed 2>/dev/null || echo -e "  ${YELLOW}Seed skipped (already applied)${NC}"

    cd "$ROOT_DIR"
    echo -e "${GREEN}✓ Database ready${NC}"
    echo ""
}

# Build for production
build_production() {
    echo -e "${YELLOW}[6/6] Building for production...${NC}"

    echo -e "  Building shared packages..."
    pnpm --filter @ws-flows/shared build 2>/dev/null || true
    pnpm --filter @ws-flows/nodes build 2>/dev/null || true

    echo -e "  Building API..."
    pnpm --filter @ws-flows/api build

    echo -e "  Building Web (this may take a moment)..."
    pnpm --filter @ws-flows/web build

    echo -e "${GREEN}✓ Production build complete${NC}"
    echo ""
}

# Start all services in production mode
start_services() {
    # Get local IP address for network access
    if [[ "$OSTYPE" == "darwin"* ]]; then
        LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")
    else
        LOCAL_IP=$(hostname -I | awk '{print $1}' || echo "localhost")
    fi

    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                    Services URLs                          ║${NC}"
    echo -e "${CYAN}╠═══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║${NC}  ${GREEN}Web UI${NC}        →  http://localhost:4000                    ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  ${GREEN}API${NC}           →  http://localhost:4001                    ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  ${GREEN}API Docs${NC}      →  http://localhost:4001/docs               ${CYAN}║${NC}"
    echo -e "${CYAN}╠═══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║${NC}                    ${YELLOW}Network Access${NC}                          ${CYAN}║${NC}"
    echo -e "${CYAN}╠═══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║${NC}  ${GREEN}Web UI${NC}        →  http://${LOCAL_IP}:4000                ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  ${GREEN}API${NC}           →  http://${LOCAL_IP}:4001                ${CYAN}║${NC}"
    echo -e "${CYAN}╠═══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║${NC}                    Default Credentials                     ${CYAN}║${NC}"
    echo -e "${CYAN}╠═══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║${NC}  ${YELLOW}Email${NC}:    admin@wsflows.local                           ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  ${YELLOW}Password${NC}: admin123                                      ${CYAN}║${NC}"
    echo -e "${CYAN}╠═══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║${NC}                       ${GREEN}PRODUCTION MODE${NC}                       ${CYAN}║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Note:${NC} Change the admin password after first login!"
    echo ""
    echo -e "${GREEN}Starting production servers (API + Web)...${NC}"
    echo ""

    # Start API in background
    cd "$ROOT_DIR/apps/api"
    NODE_ENV=production node dist/main.js &
    API_PID=$!
    echo -e "  ${GREEN}✓${NC} API started (PID: $API_PID)"

    # Start Web in production mode
    cd "$ROOT_DIR/apps/web"
    NODE_ENV=production pnpm start -p 4000 -H 0.0.0.0 &
    WEB_PID=$!
    echo -e "  ${GREEN}✓${NC} Web started (PID: $WEB_PID)"

    cd "$ROOT_DIR"

    echo ""
    echo -e "${GREEN}All services are running in production mode.${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop all services.${NC}"
    echo ""

    # Wait for processes
    wait
}

# Main execution
main() {
    check_requirements
    setup_env
    install_deps
    start_docker
    setup_database
    build_production
    start_services
}

# Handle cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down services...${NC}"

    # Kill background processes
    jobs -p | xargs -r kill 2>/dev/null || true

    cd "$ROOT_DIR"
    docker compose -f docker/docker-compose.yml stop postgres redis
    echo -e "${GREEN}✓ Cleanup complete${NC}"
}

trap cleanup EXIT INT TERM

main
