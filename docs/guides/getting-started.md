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
docker-compose up -d postgres redis
```

### 4. Set up environment

```bash
# Copy environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/worker/.env.example apps/worker/.env

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
pnpm dev:api     # http://localhost:3001
pnpm dev:web     # http://localhost:3000
pnpm dev:worker  # Trigger.dev worker
```

### 7. Access the application

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api/docs

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
mkdir -p apps/{api,web,worker}
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
pnpm add @tanstack/react-query zustand reactflow
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu
```

### Set up Worker (Trigger.dev)

```bash
cd apps/worker

# Initialize Trigger.dev
npx trigger.dev@latest init

# Configure local mode
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
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wsflows?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# Auth
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Encryption (for credentials)
ENCRYPTION_KEY="generate-with-openssl-rand-hex-32"

# Trigger.dev
TRIGGER_API_KEY="your-trigger-api-key"
TRIGGER_API_URL="http://localhost:3030"

# Server
PORT=3001
NODE_ENV=development
```

### Web (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

### Worker (.env)

```env
TRIGGER_API_KEY="your-trigger-api-key"
TRIGGER_API_URL="http://localhost:3030"
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wsflows"
ENCRYPTION_KEY="same-key-as-api"
```

---

## Docker Setup

### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: wsflows
    ports:
      - "5432:5432"
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
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  trigger:
    image: triggerdev/trigger:latest
    ports:
      - "3030:3030"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/trigger
      REDIS_URL: redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  api:
    build:
      context: .
      dockerfile: docker/Dockerfile.api
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/wsflows
      REDIS_URL: redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  web:
    build:
      context: .
      dockerfile: docker/Dockerfile.web
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://api:3001
    depends_on:
      - api

  worker:
    build:
      context: .
      dockerfile: docker/Dockerfile.worker
    environment:
      TRIGGER_API_URL: http://trigger:3030
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/wsflows
    depends_on:
      - trigger
      - postgres

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
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up -d postgres
pnpm db:migrate
```

### Prisma client out of sync

```bash
pnpm db:generate
```

### Port already in use

```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>
```

### Trigger.dev worker not connecting

```bash
# Check Trigger.dev is running
curl http://localhost:3030/health

# Restart worker
pnpm dev:worker
```

---

## Next Steps

1. Read [Architecture Overview](../architecture/overview.md)
2. Explore [API Documentation](../api/overview.md)
3. Learn [Node Development](../nodes/development-guide.md)
4. Check [ADRs](../adr/) for design decisions
