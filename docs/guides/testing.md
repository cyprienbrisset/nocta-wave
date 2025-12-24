# Testing Guide

This guide covers the testing strategy and practices for WS-Flows.

## Testing Pyramid

```
                    ┌─────────────┐
                    │    E2E      │  ← Full system tests
                    │   Tests     │    (slow, high confidence)
                    └──────┬──────┘
                    ┌──────┴──────┐
                    │ Integration │  ← Module interactions
                    │   Tests     │    (medium speed/confidence)
                    └──────┬──────┘
              ┌────────────┴────────────┐
              │       Unit Tests        │  ← Isolated logic
              │  (fast, focused)        │    (fast, high coverage)
              └─────────────────────────┘
```

## Test Types

### Unit Tests

Test individual functions, classes, and modules in isolation.

**Location:** `apps/api/test/unit/`, `packages/nodes/tests/unit/`

**Run:**
```bash
pnpm test:unit               # API unit tests
pnpm --filter @ws-flows/nodes test  # Nodes unit tests
```

**Best Practices:**
- Mock all external dependencies (database, Redis, HTTP)
- Test edge cases and error handling
- Keep tests fast (<100ms each)
- One assertion per test when possible

### Integration Tests

Test interactions between modules with mocked external services.

**Location:** `apps/api/test/integration/`

**Run:**
```bash
pnpm --filter @ws-flows/api test:integration
```

**Best Practices:**
- Use NestJS testing module
- Mock database with `jest-mock-extended`
- Test controller -> service -> repository flow
- Validate request/response shapes

### E2E Tests

Test the complete system with real infrastructure.

**Location:** `apps/api/test/e2e/`

**Run:**
```bash
# Start test containers and run E2E tests
pnpm test:e2e:docker

# Stop test containers
pnpm test:e2e:docker:down
```

## E2E Testing Infrastructure

### Prerequisites

- Docker and Docker Compose installed
- Node.js 20+
- pnpm 8+

### Test Environment

E2E tests use isolated containers:

| Service    | Port | Database |
|------------|------|----------|
| PostgreSQL | 5435 | wsflows_test |
| Redis      | 6381 | db 1 |
| MinIO      | 9002 | (optional) |

### Running E2E Tests

#### Quick Start

```bash
# Start containers, setup database, run tests
pnpm test:e2e:docker

# Cleanup
pnpm test:e2e:docker:down
```

#### Step by Step

```bash
# 1. Start test containers
docker compose -f docker/docker-compose.test.yml up -d

# 2. Setup test database (migrations)
pnpm --filter @ws-flows/api test:e2e:setup

# 3. Run E2E tests
pnpm --filter @ws-flows/api test:e2e

# 4. Cleanup when done
docker compose -f docker/docker-compose.test.yml down -v
```

### E2E Test Structure

```
apps/api/test/e2e/
├── setup-e2e.ts           # Test environment setup/teardown
├── fixtures/
│   └── e2e.fixtures.ts    # Factory functions for test data
├── scripts/
│   └── setup-test-db.ts   # Database initialization script
├── workflow-execution.e2e-spec.ts  # Execution pipeline tests
└── auth-workflow-crud.e2e-spec.ts  # Auth & CRUD tests
```

### Writing E2E Tests

```typescript
import {
  initializeE2ETestEnvironment,
  teardownE2ETestEnvironment,
  cleanAll,
  createRequest,
  waitForExecutionComplete,
  getPrisma,
} from './setup-e2e';
import { createTestUserWithTeam, createSimpleWorkflow } from './fixtures/e2e.fixtures';

describe('My E2E Test', () => {
  beforeAll(async () => {
    await initializeE2ETestEnvironment();
  }, 60000);

  afterAll(async () => {
    await teardownE2ETestEnvironment();
  });

  beforeEach(async () => {
    await cleanAll(); // Clean database and Redis between tests
  });

  it('should do something', async () => {
    const prisma = getPrisma();

    // Create test data
    const { user, team } = await createTestUserWithTeam(prisma);
    const workflow = await createSimpleWorkflow(prisma, team.id, user.id);

    // Make API request
    const response = await createRequest()
      .post('/api/v1/executions/trigger')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ workflowId: workflow.id });

    expect(response.status).toBe(201);

    // Wait for async processing
    await waitForExecutionComplete(response.body.id);

    // Verify results
    const execution = await prisma.execution.findUnique({
      where: { id: response.body.id },
    });
    expect(execution!.status).toBe('SUCCESS');
  });
});
```

### Available Test Utilities

#### setup-e2e.ts

| Function | Description |
|----------|-------------|
| `initializeE2ETestEnvironment()` | Start NestJS app, connect to test DB |
| `teardownE2ETestEnvironment()` | Close connections and cleanup |
| `cleanAll()` | Truncate all tables and flush Redis |
| `cleanDatabase()` | Truncate all database tables |
| `cleanRedis()` | Flush Redis test database |
| `createRequest()` | Create supertest agent |
| `getPrisma()` | Get Prisma client for test DB |
| `getRedis()` | Get Redis client for test DB |
| `waitFor(condition, options)` | Poll until condition is true |
| `waitForExecutionComplete(id)` | Wait for workflow execution to finish |

#### e2e.fixtures.ts

| Function | Description |
|----------|-------------|
| `createTestUser(prisma, overrides)` | Create user with hashed password |
| `createTestTeam(prisma, ownerId, overrides)` | Create team with owner |
| `createTestUserWithTeam(prisma, overrides)` | Create user and team together |
| `createSimpleWorkflow(prisma, teamId, userId)` | Create basic trigger + action workflow |
| `createConditionalWorkflow(...)` | Create workflow with branching logic |
| `createDelayWorkflow(...)` | Create workflow with delay node |
| `createTestCredential(...)` | Create encrypted credential |
| `seedCompleteTestScenario(prisma)` | Create full test scenario |

## Test Coverage

### Coverage Thresholds

| Package | Statements | Branches | Functions | Lines |
|---------|------------|----------|-----------|-------|
| API     | 60%        | 50%      | 60%       | 60%   |
| Nodes   | 70%        | 60%      | 70%       | 70%   |

### Generate Coverage Report

```bash
pnpm test:coverage
```

Coverage reports are generated in `coverage/` directories.

## CI/CD Integration

### GitHub Actions (Recommended)

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm build
      - run: pnpm test

  e2e-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: wsflows_test
        ports:
          - 5435:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6381:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm build
      - run: pnpm --filter @ws-flows/api test:e2e:setup
        env:
          TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5435/wsflows_test
          TEST_REDIS_URL: redis://localhost:6381/1
      - run: pnpm --filter @ws-flows/api test:e2e
        env:
          TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5435/wsflows_test
          TEST_REDIS_URL: redis://localhost:6381/1
```

## Troubleshooting

### Tests Timeout

- Increase timeout in `jest.config.js` or specific test
- Check if Docker containers are running
- Verify database migrations completed

### Database Connection Errors

```bash
# Check if containers are running
docker ps

# View container logs
docker logs wsflows-postgres-test

# Restart containers
pnpm test:e2e:docker:down
pnpm test:e2e:docker
```

### Redis Connection Errors

```bash
# Test Redis connection
docker exec wsflows-redis-test redis-cli ping
```

### Flaky Tests

- Use `waitFor()` utilities instead of fixed timeouts
- Ensure proper cleanup between tests with `cleanAll()`
- Check for race conditions in async operations

## Best Practices

1. **Test Isolation**: Each test should be independent. Use `cleanAll()` in `beforeEach`.

2. **Realistic Data**: Use fixtures that mirror production data structures.

3. **Async Handling**: Always await async operations and use `waitFor()` utilities.

4. **Meaningful Assertions**: Test behavior, not implementation details.

5. **Fast Feedback**: Keep unit tests fast (<100ms). Run E2E tests in CI.

6. **Coverage Goals**: Aim for 80%+ coverage on critical paths.

7. **Error Scenarios**: Test error handling and edge cases.

8. **Documentation**: Document complex test setups and fixtures.
