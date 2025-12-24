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
│                    │   Execution Engine      │                  │
│                    │   (BullMQ + Redis)      │                  │
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
| Execution | Trigger workflows, execute nodes, monitor runs, retrieve logs |
| Credential | Encrypted storage, runtime injection |
| Node | Node registry, metadata, validation schemas |
| Collaboration | Real-time collaboration, guest sessions, WebSocket |

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
4. Queue execution job (BullMQ/Redis)
         │
         ▼
5. Worker processes job
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
7. Return saved workflow
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
3. Decryption only happens in execution at runtime
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
```

### Scaling Considerations

| Component | Scaling Strategy |
|-----------|------------------|
| API | Stateless, horizontal via load balancer |
| PostgreSQL | Read replicas, connection pooling |
| Redis | Cluster mode for high availability |
| Frontend | CDN, static deployment |

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Execution Engine | BullMQ + Redis | Simple, self-hostable, TypeScript native |
| Backend Framework | NestJS | Modular, TypeScript, excellent DI |
| ORM | Prisma | Type-safe, migrations, excellent DX |
| Frontend | Next.js | SSR, App Router, React ecosystem |
| Workflow UI | React Flow | Mature, customizable, performant |
| State Management | Zustand | Simple, minimal boilerplate |
| Database | PostgreSQL | Reliable, JSON support, extensible |
| Cache/Queue | Redis | Fast, versatile, well-supported |

## Control Plane vs Data Plane Architecture

WS-Flows follows a logical separation between **Control Plane** (user-facing operations) and **Data Plane** (execution operations). This separation ensures that heavy execution workloads don't impact UI responsiveness.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CONTROL PLANE                                  │
│   (User Management, Configuration, Workflow CRUD, UI-facing APIs)       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │    Auth     │ │    User     │ │    Team     │ │  Workflow   │       │
│  │   Module    │ │   Module    │ │   Module    │ │   Module    │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ Credential  │ │  Template   │ │   Branch    │ │ Environment │       │
│  │   Module    │ │   Module    │ │   Module    │ │   Module    │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                        │
│  │SubWorkflow  │ │    Node     │ │   Health    │                        │
│  │   Module    │ │   Module    │ │   Module    │                        │
│  └─────────────┘ └─────────────┘ └─────────────┘                        │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │                    COLLABORATION MODULES                        │     │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────────┐ │     │
│  │  │  Chat    │ │ Comment  │ │   Tag    │ │CollaborationLink   │ │     │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────────────────┘ │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                          │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │         REDIS               │
                    │   (Message Broker/Queue)    │
                    └──────────────┬──────────────┘
                                   │
┌──────────────────────────────────┴──────────────────────────────────────┐
│                            DATA PLANE                                    │
│   (Execution Processing, Webhook Ingestion, Real-time Updates)          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      EXECUTION ENGINE                            │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │    │
│  │  │   Worker    │ │  Execution  │ │  Streaming  │               │    │
│  │  │   Module    │ │   Module    │ │   Module    │               │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘               │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     INGESTION LAYER                              │    │
│  │  ┌─────────────┐ ┌─────────────┐                                │    │
│  │  │   Webhook   │ │  Realtime   │                                │    │
│  │  │   Module    │ │   Gateway   │                                │    │
│  │  │ (Ingestion) │ │ (WebSocket) │                                │    │
│  │  └─────────────┘ └─────────────┘                                │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     STORAGE LAYER                                │    │
│  │  ┌─────────────┐ ┌─────────────┐                                │    │
│  │  │   Storage   │ │    Cache    │                                │    │
│  │  │   Module    │ │   Module    │                                │    │
│  │  │(S3/MinIO)   │ │  (Redis)    │                                │    │
│  │  └─────────────┘ └─────────────┘                                │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
┌──────────────────────────────────┴──────────────────────────────────────┐
│                       OBSERVABILITY PLANE                                │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ Monitoring  │ │   Audit     │ │  Alerting   │ │     DLQ     │       │
│  │   Module    │ │   Module    │ │   Module    │ │   Module    │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                                          │
│  ┌─────────────┐                                                        │
│  │  Security   │                                                        │
│  │   Module    │                                                        │
│  └─────────────┘                                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### Module Classification

#### Control Plane Modules

These modules handle user-facing operations and are typically low-latency, low-throughput:

| Module | Purpose | Entry Points |
|--------|---------|--------------|
| **Auth** | User authentication, JWT tokens, sessions | `/api/v1/auth/*` |
| **User** | User profile management | `/api/v1/users/*` |
| **Team** | Team/workspace management | `/api/v1/teams/*` |
| **Workflow** | Workflow CRUD, versioning, export/import | `/api/v1/workflows/*` |
| **Credential** | API credentials, encrypted storage | `/api/v1/credentials/*` |
| **Template** | Workflow templates gallery | `/api/v1/templates/*` |
| **SubWorkflow** | Reusable sub-workflow definitions | `/api/v1/subworkflows/*` |
| **Environment** | Environment variables, promotions | `/api/v1/environments/*` |
| **Branch** | Git-like branching for workflows | `/api/v1/branches/*` |
| **Node** | Available nodes registry (read-only) | `/api/v1/nodes/*` |
| **Health** | Service health checks | `/health` |
| **Collaboration** | Chat, comments, tags, share links | `/api/v1/collaboration/*` |

#### Data Plane Modules

These modules handle high-throughput execution operations:

| Module | Purpose | Entry Points |
|--------|---------|--------------|
| **Execution** | Execution lifecycle, triggering | `/api/v1/executions/*` |
| **Worker** | Background job processor | Redis queue consumer |
| **Webhook** | Webhook ingestion (public) | `/api/v1/webhook/hook/*` |
| **Streaming** | SSE for real-time progress | `/api/v1/stream/*` |
| **Storage** | Execution log persistence (S3/MinIO) | Internal |
| **Cache** | Node execution caching (Redis) | Internal |
| **Realtime Gateway** | WebSocket for collaboration sync | `/collaboration` namespace |

#### Observability Modules

Cross-cutting concerns for monitoring and operations:

| Module | Purpose |
|--------|---------|
| **Monitoring** | Metrics, logs, traces |
| **Audit** | Activity logs, compliance tracking |
| **Alerting** | Alert rules & notifications |
| **DLQ** | Dead letter queue for failed jobs |
| **Security** | Data redaction, secret masking |

### Key Design Principles

1. **Controllers are thin**: All business logic resides in Services. Controllers only handle HTTP request/response transformation.

2. **Team-scoped access**: All user-facing endpoints validate team membership. Critical operations (DLQ retry, alert management) include team access checks.

3. **Asynchronous execution**: Workflow execution is decoupled via Redis queues. The Control Plane triggers executions, the Data Plane processes them.

4. **Graceful degradation**: If the Data Plane is overloaded, the Control Plane (UI operations) remains responsive.

5. **Ephemeral data in Redis**: Cursor positions, viewport states, and typing indicators are stored only in Redis with TTL, not in PostgreSQL.

6. **Large data externalization**: Execution logs >10KB are stored in object storage (S3/MinIO), not in PostgreSQL.

### Scaling Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTROL PLANE INSTANCES                       │
│                    (Stateless, behind LB)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │  API 1   │  │  API 2   │  │  API N   │                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │  Redis Cluster  │
              │  (Queue/Cache)  │
              └─────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA PLANE INSTANCES                          │
│                 (Can scale independently)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Worker 1 │  │ Worker 2 │  │ Worker N │  │ Worker M │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

- **Control Plane**: Scale horizontally behind a load balancer
- **Data Plane (Workers)**: Scale independently based on queue depth
- **Webhook Ingestion**: Can be separated into dedicated instances for high-throughput scenarios
