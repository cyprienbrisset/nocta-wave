# Data Model

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│      User       │       │      Team       │
├─────────────────┤       ├─────────────────┤
│ id              │───┐   │ id              │
│ email           │   │   │ name            │
│ name            │   │   │ slug            │
│ passwordHash    │   │   │ createdAt       │
│ role            │   │   │ updatedAt       │
│ teamId (FK)     │───┼──▶│                 │
│ createdAt       │   │   └────────┬────────┘
│ updatedAt       │   │            │
└─────────────────┘   │            │
                      │            │
┌─────────────────┐   │            │
│    Workflow     │◀──┼────────────┘
├─────────────────┤   │
│ id              │   │
│ name            │   │
│ description     │   │
│ version         │   │
│ isActive        │   │
│ graph (JSON)    │   │
│ teamId (FK)     │───┘
│ createdById(FK) │───────▶ User
│ createdAt       │
│ updatedAt       │
│ deletedAt       │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐       ┌─────────────────┐
│   Execution     │       │   Credential    │
├─────────────────┤       ├─────────────────┤
│ id              │       │ id              │
│ workflowId (FK) │       │ name            │
│ workflowVersion │       │ type            │
│ status          │       │ encryptedData   │
│ triggerType     │       │ teamId (FK)     │
│ input (JSON)    │       │ createdById(FK) │
│ output (JSON)   │       │ createdAt       │
│ error           │       │ updatedAt       │
│ startedAt       │       └─────────────────┘
│ endedAt         │
│ createdAt       │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐
│  ExecutionLog   │
├─────────────────┤
│ id              │
│ executionId(FK) │
│ nodeId          │
│ level           │
│ message         │
│ data (JSON)     │
│ timestamp       │
└─────────────────┘
```

## Schema Definitions

### User

```prisma
model User {
  id           String    @id @default(uuid())
  email        String    @unique
  name         String
  passwordHash String
  role         UserRole  @default(MEMBER)
  teamId       String
  team         Team      @relation(fields: [teamId], references: [id])

  workflows    Workflow[] @relation("CreatedBy")
  credentials  Credential[] @relation("CreatedBy")

  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@index([teamId])
  @@index([email])
}

enum UserRole {
  OWNER
  ADMIN
  MEMBER
  VIEWER
}
```

### Team

```prisma
model Team {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique

  users       User[]
  workflows   Workflow[]
  credentials Credential[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([slug])
}
```

### Workflow

```prisma
model Workflow {
  id          String    @id @default(uuid())
  name        String
  description String?
  version     Int       @default(1)
  isActive    Boolean   @default(false)
  graph       Json      // WorkflowGraph

  teamId      String
  team        Team      @relation(fields: [teamId], references: [id])

  createdById String
  createdBy   User      @relation("CreatedBy", fields: [createdById], references: [id])

  executions  Execution[]

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  @@index([teamId])
  @@index([isActive])
  @@index([createdById])
}
```

### Execution

```prisma
model Execution {
  id              String          @id @default(uuid())
  workflowId      String
  workflow        Workflow        @relation(fields: [workflowId], references: [id])
  workflowVersion Int

  status          ExecutionStatus @default(PENDING)
  triggerType     String          // manual, cron, webhook, http
  input           Json?
  output          Json?
  error           String?

  startedAt       DateTime?
  endedAt         DateTime?

  logs            ExecutionLog[]

  createdAt       DateTime        @default(now())

  @@index([workflowId])
  @@index([status])
  @@index([createdAt])
}

enum ExecutionStatus {
  PENDING
  RUNNING
  SUCCESS
  FAILED
  CANCELLED
}
```

### ExecutionLog

```prisma
model ExecutionLog {
  id          String    @id @default(uuid())
  executionId String
  execution   Execution @relation(fields: [executionId], references: [id], onDelete: Cascade)

  nodeId      String
  level       LogLevel
  message     String
  data        Json?

  timestamp   DateTime  @default(now())

  @@index([executionId])
  @@index([nodeId])
  @@index([timestamp])
}

enum LogLevel {
  DEBUG
  INFO
  WARN
  ERROR
}
```

### Credential

```prisma
model Credential {
  id            String   @id @default(uuid())
  name          String
  type          String   // oauth2, api_key, basic_auth, custom
  encryptedData String   // AES-256-GCM encrypted JSON

  teamId        String
  team          Team     @relation(fields: [teamId], references: [id])

  createdById   String
  createdBy     User     @relation("CreatedBy", fields: [createdById], references: [id])

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([teamId, name])
  @@index([teamId])
  @@index([type])
}
```

## JSON Schema Types

### WorkflowGraph

```typescript
interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  settings?: WorkflowSettings;
}

interface WorkflowNode {
  id: string;
  type: string;               // e.g., "http.request"
  position: {
    x: number;
    y: number;
  };
  data: {
    label: string;
    config: Record<string, unknown>;
  };
}

interface WorkflowEdge {
  id: string;
  source: string;             // Source node ID
  sourceHandle?: string;      // Output handle ID
  target: string;             // Target node ID
  targetHandle?: string;      // Input handle ID
  label?: string;
  type?: 'default' | 'conditional';
  condition?: string;         // For conditional edges
}

interface WorkflowSettings {
  timezone?: string;
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;       // ms
    backoffMultiplier: number;
  };
  timeout?: number;           // ms
  errorHandling?: 'stop' | 'continue';
}
```

### Execution Input/Output

```typescript
interface ExecutionInput {
  trigger: {
    type: string;
    payload: Record<string, unknown>;
  };
  context?: {
    userId?: string;
    variables?: Record<string, unknown>;
  };
}

interface ExecutionOutput {
  result: Record<string, unknown>;
  steps: StepResult[];
}

interface StepResult {
  nodeId: string;
  status: 'success' | 'failed' | 'skipped';
  output?: unknown;
  error?: string;
  duration: number;           // ms
  startedAt: string;
  endedAt: string;
}
```

### Credential Data (Decrypted)

```typescript
interface CredentialData {
  type: string;
  data: ApiKeyCredential | OAuth2Credential | BasicAuthCredential | CustomCredential;
}

interface ApiKeyCredential {
  apiKey: string;
  headerName?: string;        // Default: Authorization
  prefix?: string;            // Default: Bearer
}

interface OAuth2Credential {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  tokenUrl: string;
  scope?: string;
  expiresAt?: string;
}

interface BasicAuthCredential {
  username: string;
  password: string;
}

interface CustomCredential {
  [key: string]: string;
}
```

## Database Indexes

### Performance Indexes

```prisma
// Already defined inline above, but here's a summary:

// User
@@index([teamId])
@@index([email])

// Team
@@index([slug])

// Workflow
@@index([teamId])
@@index([isActive])
@@index([createdById])

// Execution
@@index([workflowId])
@@index([status])
@@index([createdAt])

// ExecutionLog
@@index([executionId])
@@index([nodeId])
@@index([timestamp])

// Credential
@@index([teamId])
@@index([type])
```

### Composite Indexes (Add as needed)

```prisma
// For listing active workflows by team
@@index([teamId, isActive])

// For execution history queries
@@index([workflowId, createdAt])

// For filtering executions by status and date
@@index([status, createdAt])
```

## Data Retention

| Entity | Retention Policy |
|--------|------------------|
| Workflow | Soft delete, keep indefinitely |
| Execution | 30 days default, configurable |
| ExecutionLog | 30 days default, configurable |
| Credential | Keep until explicitly deleted |
| User | Soft delete, 90 days then hard delete |

## Migration Strategy

1. Use Prisma Migrate for schema changes
2. Always create reversible migrations
3. Test migrations on staging before production
4. Use `prisma migrate dev` for development
5. Use `prisma migrate deploy` for production
