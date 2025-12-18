# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │   Workflow UI    │  │   Dashboard      │  │   Settings    │ │
│  │  (React Flow)    │  │   (Analytics)    │  │   (Config)    │ │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬───────┘ │
│           │                     │                     │         │
│           └─────────────────────┼─────────────────────┘         │
│                                 │                               │
│                    ┌────────────▼────────────┐                  │
│                    │    Next.js Frontend     │                  │
│                    │    (apps/web)           │                  │
│                    └────────────┬────────────┘                  │
└─────────────────────────────────┼───────────────────────────────┘
                                  │ REST API / WebSocket
┌─────────────────────────────────┼───────────────────────────────┐
│                         API LAYER                               │
├─────────────────────────────────┼───────────────────────────────┤
│                    ┌────────────▼────────────┐                  │
│                    │    NestJS API Server    │                  │
│                    │    (apps/api)           │                  │
│                    └────────────┬────────────┘                  │
│                                 │                               │
│  ┌──────────────┬───────────────┼───────────────┬────────────┐ │
│  │              │               │               │            │ │
│  ▼              ▼               ▼               ▼            ▼ │
│ ┌────┐      ┌────────┐    ┌──────────┐   ┌──────────┐  ┌────┐ │
│ │Auth│      │Workflow│    │Execution │   │Credential│  │Node│ │
│ │Mod │      │Module  │    │Module    │   │Module    │  │Mod │ │
│ └────┘      └────────┘    └──────────┘   └──────────┘  └────┘ │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
┌─────────────────────────────────┼───────────────────────────────┐
│                      EXECUTION LAYER                            │
├─────────────────────────────────┼───────────────────────────────┤
│                    ┌────────────▼────────────┐                  │
│                    │    Trigger.dev Engine   │                  │
│                    │    (apps/worker)        │                  │
│                    └────────────┬────────────┘                  │
│                                 │                               │
│  ┌──────────────────────────────┼──────────────────────────┐   │
│  │              ┌───────────────┼───────────────┐          │   │
│  │              │               │               │          │   │
│  ▼              ▼               ▼               ▼          │   │
│ ┌────────┐  ┌────────┐    ┌────────┐     ┌────────┐       │   │
│ │HTTP    │  │Cron    │    │Queue   │     │Webhook │       │   │
│ │Trigger │  │Trigger │    │Trigger │     │Trigger │       │   │
│ └────────┘  └────────┘    └────────┘     └────────┘       │   │
│                                                            │   │
│  ┌─────────────────────────────────────────────────────┐  │   │
│  │                    NODE RUNNERS                      │  │   │
│  │  ┌─────┐ ┌─────────┐ ┌──────────┐ ┌──────────────┐  │  │   │
│  │  │HTTP │ │Transform│ │Condition │ │Database      │  │  │   │
│  │  │Node │ │Node     │ │Node      │ │Node          │  │  │   │
│  │  └─────┘ └─────────┘ └──────────┘ └──────────────┘  │  │   │
│  └─────────────────────────────────────────────────────┘  │   │
└───────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────┼───────────────────────────────┐
│                       DATA LAYER                                │
├─────────────────────────────────┼───────────────────────────────┤
│  ┌──────────────┐    ┌──────────▼───┐    ┌──────────────┐      │
│  │  PostgreSQL  │◄───│    Prisma    │    │    Redis     │      │
│  │  (Primary)   │    │    ORM       │    │  (Cache/Q)   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### Frontend (apps/web)

| Component | Responsibility |
|-----------|----------------|
| Workflow Editor | Visual drag-and-drop workflow builder using React Flow |
| Dashboard | Execution monitoring, analytics, system health |
| Settings | User preferences, credentials management, team settings |
| Node Panel | Node library, search, drag source |
| Execution Viewer | Real-time execution logs, step details |

### API Server (apps/api)

| Module | Responsibility |
|--------|----------------|
| Auth | JWT authentication, session management, RBAC |
| Workflow | CRUD operations, versioning, validation |
| Execution | Trigger workflows, monitor runs, retrieve logs |
| Credential | Encrypted storage, runtime injection |
| Node | Node registry, metadata, validation schemas |

### Worker (apps/worker)

| Component | Responsibility |
|-----------|----------------|
| Job Manager | Convert workflows to Trigger.dev jobs |
| Node Runners | Execute individual node logic |
| Step Orchestrator | Manage step sequence, data flow |
| Error Handler | Retries, dead letter queue, failure reporting |

## Data Flow

### Workflow Execution Flow

```
1. Trigger Event (HTTP/Cron/Webhook/Manual)
         │
         ▼
2. API receives trigger
         │
         ▼
3. Create Execution record (status: pending)
         │
         ▼
4. Dispatch to Trigger.dev
         │
         ▼
5. Worker picks up job
         │
         ▼
6. For each node in topological order:
   ├── Fetch credentials (decrypt)
   ├── Execute node runner
   ├── Store step result
   └── Update execution logs
         │
         ▼
7. Update Execution (status: success/failed)
         │
         ▼
8. Notify via WebSocket
```

### Workflow Save Flow

```
1. User edits workflow in UI
         │
         ▼
2. Frontend validates graph
         │
         ▼
3. POST /api/v1/workflows
         │
         ▼
4. API validates workflow schema
         │
         ▼
5. Increment version if changed
         │
         ▼
6. Store in PostgreSQL
         │
         ▼
7. Regenerate Trigger.dev job definition
         │
         ▼
8. Return saved workflow
```

## Security Architecture

### Authentication Flow

```
┌──────────┐     ┌─────────┐     ┌──────────┐
│  Client  │────▶│   API   │────▶│ Database │
└──────────┘     └─────────┘     └──────────┘
     │               │
     │  1. Login     │
     │──────────────▶│
     │               │ 2. Validate
     │               │ 3. Generate JWT
     │  4. Token     │
     │◀──────────────│
     │               │
     │  5. Request + │
     │     Bearer    │
     │──────────────▶│
     │               │ 6. Verify JWT
     │               │ 7. Process
     │  8. Response  │
     │◀──────────────│
```

### Credential Security

1. Credentials encrypted with AES-256-GCM
2. Encryption key stored in environment
3. Decryption only happens in worker at runtime
4. Credentials never logged or returned in responses
5. Audit log for credential access

## Scalability

### Horizontal Scaling

```
                    ┌─────────────┐
                    │ Load Balancer│
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  API 1   │    │  API 2   │    │  API N   │
    └──────────┘    └──────────┘    └──────────┘
           │               │               │
           └───────────────┼───────────────┘
                           ▼
                    ┌─────────────┐
                    │  PostgreSQL │ (Primary + Replicas)
                    └─────────────┘
                           │
    ┌──────────────────────┼──────────────────────┐
    ▼                      ▼                      ▼
┌─────────┐          ┌─────────┐           ┌─────────┐
│Worker 1 │          │Worker 2 │           │Worker N │
└─────────┘          └─────────┘           └─────────┘
```

### Scaling Considerations

| Component | Scaling Strategy |
|-----------|------------------|
| API | Stateless, horizontal via load balancer |
| Workers | Horizontal, auto-scale based on queue depth |
| PostgreSQL | Read replicas, connection pooling |
| Redis | Cluster mode for high availability |
| Frontend | CDN, static deployment |

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Execution Engine | Trigger.dev | Built-in retries, observability, TypeScript native |
| Backend Framework | NestJS | Modular, TypeScript, excellent DI |
| ORM | Prisma | Type-safe, migrations, excellent DX |
| Frontend | Next.js | SSR, App Router, React ecosystem |
| Workflow UI | React Flow | Mature, customizable, performant |
| State Management | Zustand | Simple, minimal boilerplate |
| Database | PostgreSQL | Reliable, JSON support, extensible |
| Cache/Queue | Redis | Fast, versatile, well-supported |
