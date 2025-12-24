# Getting Started

## Prerequisites

- Node.js 20+
- pnpm 8+
- Docker & Docker Compose
- Git

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/your-org/ws-flows.git
cd ws-flows
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Start infrastructure

```bash
docker compose -f docker/docker-compose.yml up -d
```

### 4. Set up environment

```bash
# Copy environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# Generate encryption key
openssl rand -hex 32
# Add to apps/api/.env as ENCRYPTION_KEY
```

### 5. Initialize database

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### 6. Start development servers

```bash
# Start all services
pnpm dev

# Or start individually
pnpm dev:api     # http://localhost:4001
pnpm dev:web     # http://localhost:4000
```

### 7. Access the application

- **Frontend**: http://localhost:4000
- **API**: http://localhost:4001
- **API Docs**: http://localhost:4001/docs

### Default credentials

```
Email: admin@example.com
Password: admin123
```

---

## Project Setup from Scratch

### Initialize monorepo

```bash
mkdir ws-flows && cd ws-flows

# Initialize pnpm workspace
pnpm init

# Create workspace config
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
EOF

# Create turbo config
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {}
  }
}
EOF

# Install turbo
pnpm add -D turbo -w
```

### Create apps structure

```bash
mkdir -p apps/{api,web}
mkdir -p packages/{shared,nodes,ui}
```

### Set up API (NestJS)

```bash
cd apps/api

# Initialize NestJS project
pnpm add @nestjs/core @nestjs/common @nestjs/platform-express
pnpm add @nestjs/config @nestjs/jwt @nestjs/passport
pnpm add @prisma/client bcrypt class-validator class-transformer
pnpm add -D @nestjs/cli prisma typescript @types/node

# Initialize Prisma
npx prisma init
```

### Set up Web (Next.js)

```bash
cd apps/web

# Create Next.js app
pnpm create next-app . --typescript --tailwind --eslint --app --src-dir

# Add dependencies
pnpm add @tanstack/react-query zustand @xyflow/react
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu
```

### Set up shared packages

```bash
cd packages/shared

pnpm init
pnpm add -D typescript zod

# Create tsconfig
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
EOF
```

---

## Environment Configuration

### API (.env)

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/wsflows?schema=public"

# Redis
REDIS_URL="redis://:password@localhost:6380"

# Auth
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Encryption (for credentials)
ENCRYPTION_KEY="generate-with-openssl-rand-hex-32"

# Server
PORT=4001
NODE_ENV=development
CORS_ORIGIN=http://localhost:4000
```

### Web (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:4001/api
NEXT_PUBLIC_WS_URL=ws://localhost:4001
```

---

## Docker Setup

### docker-compose.yml

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: wsflows
    ports:
      - "5434:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    command: redis-server --appendonly yes

volumes:
  postgres_data:
  redis_data:
```

---

## Development Workflow

### Branch naming

```
feature/xxx - New features
fix/xxx     - Bug fixes
refactor/xxx - Code refactoring
docs/xxx    - Documentation
```

### Commit messages

Follow conventional commits:

```
feat: add webhook trigger node
fix: resolve execution timeout issue
docs: update API documentation
refactor: simplify node registry
test: add integration tests for workflows
```

### Running tests

```bash
# All tests
pnpm test

# With coverage
pnpm test:coverage

# Watch mode
pnpm test:watch

# E2E tests
pnpm test:e2e
```

### Linting and formatting

```bash
# Lint
pnpm lint

# Fix lint issues
pnpm lint:fix

# Format
pnpm format

# Type check
pnpm typecheck
```

---

## Common Issues

### Database connection failed

```bash
# Check if PostgreSQL is running
docker compose -f docker/docker-compose.yml ps

# Check logs
docker compose -f docker/docker-compose.yml logs postgres

# Reset database
docker compose -f docker/docker-compose.yml down -v
docker compose -f docker/docker-compose.yml up -d postgres
pnpm db:migrate
```

### Prisma client out of sync

```bash
pnpm db:generate
```

### Port already in use

```bash
# Find process using port
lsof -i :4001

# Kill process
kill -9 <PID>
```

---

## Next Steps

1. Read [Architecture Overview](../architecture/overview.md)
2. Explore [API Documentation](../api/overview.md)
3. Learn [Node Development](../nodes/development-guide.md)
4. Check [ADRs](../adr/) for design decisions
