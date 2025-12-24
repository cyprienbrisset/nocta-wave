# WS-Flows - Claude AI Guidelines

## Project Overview

WS-Flows is an open-source, self-hostable workflow orchestration platform inspired by n8n. It provides a visual workflow editor with real-time collaboration features.

## Tech Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Backend**: NestJS, Prisma, PostgreSQL, Redis
- **Frontend**: Next.js 14 (App Router), React Flow, Tailwind, shadcn/ui
- **Language**: TypeScript (strict mode)

## Project Structure

```
ws-flows/
├── apps/
│   ├── api/                 # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/     # Feature modules
│   │   │   ├── common/      # Shared utilities
│   │   │   └── main.ts
│   │   └── prisma/
│   │       └── schema.prisma
│   └── web/                 # Next.js frontend
│       ├── app/            # App Router pages
│       ├── components/     # React components
│       └── lib/            # Utilities
├── packages/
│   ├── shared/             # Shared types & utils
│   │   ├── src/
│   │   │   ├── types/      # TypeScript interfaces
│   │   │   └── utils/      # Common utilities
│   │   └── package.json
│   ├── nodes/              # Node definitions
│   │   ├── src/
│   │   │   ├── http/
│   │   │   ├── cron/
│   │   │   ├── transform/
│   │   │   └── index.ts
│   │   └── package.json
│   └── ui/                 # Shared UI components
│       ├── src/
│       └── package.json
├── docker/
│   ├── docker-compose.yml
│   └── Dockerfile.*
├── docs/                   # Documentation
├── claude.md              # This file
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Key Conventions

### Naming Conventions

- **Files**: kebab-case (`workflow-service.ts`)
- **Classes**: PascalCase (`WorkflowService`)
- **Functions**: camelCase (`executeWorkflow`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Interfaces**: PascalCase with `I` prefix for DTOs (`IWorkflowDto`)
- **Types**: PascalCase (`WorkflowStatus`)

### Code Style

- Use TypeScript strict mode
- Prefer functional components in React
- Use async/await over Promises
- Always handle errors explicitly
- Use Zod for runtime validation

### Database

- Prisma as ORM
- Migrations in `apps/api/prisma/migrations/`
- Use UUID for primary keys
- Soft delete with `deletedAt` column
- Timestamps: `createdAt`, `updatedAt`

### API Design

- RESTful endpoints
- Prefix: `/api/v1/`
- Use DTOs for request/response
- Swagger documentation
- Error format: `{ error: string, code: string, details?: object }`

## Core Entities

### Workflow
```typescript
interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: number;
  isActive: boolean;
  graph: WorkflowGraph;
  createdAt: Date;
  updatedAt: Date;
}
```

### WorkflowGraph
```typescript
interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}
```

### WorkflowNode
```typescript
interface WorkflowNode {
  id: string;
  type: string;           // e.g., "http.request", "transform.map"
  position: { x: number; y: number };
  config: Record<string, unknown>;
  inputs: NodeInput[];
  outputs: NodeOutput[];
}
```

### Execution
```typescript
interface Execution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  triggerType: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startedAt?: Date;
  endedAt?: Date;
  logs: ExecutionLog[];
}
```

### Credential
```typescript
interface Credential {
  id: string;
  name: string;
  type: string;           // e.g., "oauth2", "api_key"
  encryptedData: string;  // AES-256 encrypted
  createdAt: Date;
  updatedAt: Date;
}
```

## Node System

### Node Definition Structure
```typescript
interface NodeDefinition {
  type: string;                    // Unique identifier
  category: string;                // For UI grouping
  name: string;                    // Display name
  description: string;
  icon: string;
  inputs: InputDefinition[];
  outputs: OutputDefinition[];
  credentials?: string[];          // Required credential types
  runner: (input: any, context: NodeContext) => Promise<any>;
}
```

### Creating a New Node

1. Create folder in `packages/nodes/src/<category>/<node-name>/`
2. Add `definition.ts` with node metadata
3. Add `runner.ts` with execution logic
4. Add `ui.json` for frontend configuration
5. Export in `packages/nodes/src/index.ts`

## Commands

### Development
```bash
pnpm install          # Install dependencies
pnpm dev              # Start all apps in dev mode
pnpm dev:api          # Start API only
pnpm dev:web          # Start frontend only
```

### Database
```bash
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed database
pnpm db:studio        # Open Prisma Studio
```

### Testing
```bash
pnpm test             # Run all tests
pnpm test:unit        # Unit tests only
pnpm test:e2e         # E2E tests
pnpm test:coverage    # With coverage
```

### Build
```bash
pnpm build            # Build all packages
pnpm lint             # Lint all packages
pnpm typecheck        # TypeScript check
```

## Environment Variables

### API (.env)
```
DATABASE_URL=postgresql://user:pass@localhost:5434/wsflows
REDIS_URL=redis://:password@localhost:6380
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=32-byte-hex-key
PORT=4001
CORS_ORIGIN=http://localhost:4000
```

### Web (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:4001/api
NEXT_PUBLIC_WS_URL=ws://localhost:4001
```

## Important Guidelines for Claude

1. **Always check existing code** before suggesting changes
2. **Follow the established patterns** in the codebase
3. **Use the shared packages** for types and utilities
4. **Write tests** for new features
5. **Update documentation** when adding features
6. **Use conventional commits** for git messages
7. **Never expose secrets** in code or logs
8. **Handle errors** with proper error types
9. **Use Zod schemas** for validation
10. **Keep nodes isolated** - no cross-node dependencies

## References

- [docs/architecture/](docs/architecture/) - Architecture decisions
- [docs/api/](docs/api/) - API documentation
- [docs/nodes/](docs/nodes/) - Node development guide
- [docs/guides/](docs/guides/) - Development guides
