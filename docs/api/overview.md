# API Documentation

## Base URL

```
Development: http://localhost:3001/api/v1
Production: https://api.your-domain.com/api/v1
```

## Authentication

All API endpoints (except auth endpoints) require a valid JWT token.

### Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Token Lifecycle

| Token Type | Expiration | Usage |
|------------|------------|-------|
| Access Token | 15 minutes | API requests |
| Refresh Token | 7 days | Get new access token |

---

## Endpoints Overview

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create new account |
| POST | `/auth/login` | Login and get tokens |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Invalidate refresh token |

### Workflows

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/workflows` | List all workflows |
| POST | `/workflows` | Create new workflow |
| GET | `/workflows/:id` | Get workflow by ID |
| PUT | `/workflows/:id` | Update workflow |
| DELETE | `/workflows/:id` | Delete workflow (soft) |
| POST | `/workflows/:id/duplicate` | Duplicate workflow |
| POST | `/workflows/:id/activate` | Activate workflow |
| POST | `/workflows/:id/deactivate` | Deactivate workflow |

### Executions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/executions` | List executions |
| GET | `/executions/:id` | Get execution details |
| POST | `/executions/:id/cancel` | Cancel running execution |
| POST | `/workflows/:id/execute` | Trigger workflow manually |

### Credentials

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/credentials` | List credentials (metadata only) |
| POST | `/credentials` | Create credential |
| GET | `/credentials/:id` | Get credential metadata |
| PUT | `/credentials/:id` | Update credential |
| DELETE | `/credentials/:id` | Delete credential |

### Nodes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/nodes` | List available node types |
| GET | `/nodes/:type` | Get node definition |

---

## Detailed Endpoints

### Authentication

#### POST /auth/register

Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "teamName": "My Team"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "OWNER"
  },
  "team": {
    "id": "uuid",
    "name": "My Team",
    "slug": "my-team"
  },
  "accessToken": "jwt...",
  "refreshToken": "jwt..."
}
```

#### POST /auth/login

Authenticate user and get tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "MEMBER"
  },
  "accessToken": "jwt...",
  "refreshToken": "jwt..."
}
```

---

### Workflows

#### GET /workflows

List all workflows for the current team.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |
| `search` | string | Search by name |
| `isActive` | boolean | Filter by active status |
| `sort` | string | Sort field (name, createdAt, updatedAt) |
| `order` | string | Sort order (asc, desc) |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "My Workflow",
      "description": "Description here",
      "version": 3,
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "lastExecutionAt": "2024-01-15T10:30:00Z",
      "executionCount": 42
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

#### POST /workflows

Create a new workflow.

**Request:**
```json
{
  "name": "New Workflow",
  "description": "Optional description",
  "graph": {
    "nodes": [
      {
        "id": "node-1",
        "type": "trigger.manual",
        "position": { "x": 100, "y": 100 },
        "data": {
          "label": "Manual Trigger",
          "config": {}
        }
      },
      {
        "id": "node-2",
        "type": "http.request",
        "position": { "x": 100, "y": 250 },
        "data": {
          "label": "HTTP Request",
          "config": {
            "url": "https://api.example.com/data",
            "method": "GET"
          }
        }
      }
    ],
    "edges": [
      {
        "id": "edge-1",
        "source": "node-1",
        "target": "node-2"
      }
    ]
  }
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "New Workflow",
  "description": "Optional description",
  "version": 1,
  "isActive": false,
  "graph": { ... },
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

#### PUT /workflows/:id

Update an existing workflow.

**Request:**
```json
{
  "name": "Updated Workflow",
  "description": "New description",
  "graph": { ... }
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Updated Workflow",
  "version": 2,
  ...
}
```

#### POST /workflows/:id/execute

Manually trigger a workflow execution.

**Request:**
```json
{
  "input": {
    "key": "value"
  }
}
```

**Response (202):**
```json
{
  "executionId": "uuid",
  "status": "PENDING",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### Executions

#### GET /executions

List executions with filtering.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `workflowId` | string | Filter by workflow |
| `status` | string | Filter by status |
| `from` | string | Start date (ISO 8601) |
| `to` | string | End date (ISO 8601) |
| `page` | number | Page number |
| `limit` | number | Items per page |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "workflowId": "uuid",
      "workflowName": "My Workflow",
      "workflowVersion": 2,
      "status": "SUCCESS",
      "triggerType": "manual",
      "startedAt": "2024-01-15T10:30:00Z",
      "endedAt": "2024-01-15T10:30:05Z",
      "duration": 5000
    }
  ],
  "meta": { ... }
}
```

#### GET /executions/:id

Get detailed execution information including logs.

**Response (200):**
```json
{
  "id": "uuid",
  "workflowId": "uuid",
  "workflowVersion": 2,
  "status": "SUCCESS",
  "triggerType": "manual",
  "input": { ... },
  "output": { ... },
  "startedAt": "2024-01-15T10:30:00Z",
  "endedAt": "2024-01-15T10:30:05Z",
  "logs": [
    {
      "id": "uuid",
      "nodeId": "node-1",
      "level": "INFO",
      "message": "Node started",
      "timestamp": "2024-01-15T10:30:00Z"
    },
    {
      "id": "uuid",
      "nodeId": "node-1",
      "level": "INFO",
      "message": "Node completed",
      "data": { "result": "..." },
      "timestamp": "2024-01-15T10:30:02Z"
    }
  ],
  "steps": [
    {
      "nodeId": "node-1",
      "nodeName": "HTTP Request",
      "status": "success",
      "output": { ... },
      "duration": 2000,
      "startedAt": "2024-01-15T10:30:00Z",
      "endedAt": "2024-01-15T10:30:02Z"
    }
  ]
}
```

---

### Credentials

#### GET /credentials

List credentials (sensitive data not included).

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "GitHub API Key",
      "type": "api_key",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### POST /credentials

Create a new credential.

**Request:**
```json
{
  "name": "GitHub API Key",
  "type": "api_key",
  "data": {
    "apiKey": "ghp_xxxxxxxxxxxx",
    "headerName": "Authorization",
    "prefix": "token"
  }
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "GitHub API Key",
  "type": "api_key",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### Nodes

#### GET /nodes

List all available node types.

**Response (200):**
```json
{
  "data": [
    {
      "type": "trigger.manual",
      "category": "trigger",
      "name": "Manual Trigger",
      "description": "Manually trigger the workflow",
      "icon": "play"
    },
    {
      "type": "http.request",
      "category": "http",
      "name": "HTTP Request",
      "description": "Make an HTTP request",
      "icon": "globe"
    }
  ]
}
```

#### GET /nodes/:type

Get full node definition including schema.

**Response (200):**
```json
{
  "type": "http.request",
  "category": "http",
  "name": "HTTP Request",
  "description": "Make an HTTP request to any URL",
  "icon": "globe",
  "inputs": [
    {
      "name": "url",
      "type": "string",
      "required": true,
      "description": "The URL to request"
    },
    {
      "name": "method",
      "type": "select",
      "required": true,
      "options": ["GET", "POST", "PUT", "DELETE", "PATCH"],
      "default": "GET"
    },
    {
      "name": "headers",
      "type": "keyValue",
      "required": false
    },
    {
      "name": "body",
      "type": "json",
      "required": false
    }
  ],
  "outputs": [
    {
      "name": "response",
      "type": "object"
    }
  ],
  "credentials": ["api_key", "oauth2", "basic_auth"]
}
```

---

## Error Responses

All errors follow a consistent format:

```json
{
  "error": "Human readable message",
  "code": "ERROR_CODE",
  "details": { }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `CONFLICT` | 409 | Resource already exists |
| `INTERNAL_ERROR` | 500 | Server error |

### Validation Error Example

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "fields": [
      {
        "field": "email",
        "message": "Invalid email format"
      },
      {
        "field": "password",
        "message": "Must be at least 8 characters"
      }
    ]
  }
}
```

---

## WebSocket Events

### Connection

```javascript
const socket = io('ws://localhost:3001', {
  auth: { token: 'jwt...' }
});
```

### Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `execution:start` | Server → Client | Execution started |
| `execution:log` | Server → Client | New log entry |
| `execution:step` | Server → Client | Step completed |
| `execution:complete` | Server → Client | Execution finished |

### Event Payloads

```typescript
// execution:start
{
  executionId: string;
  workflowId: string;
  status: 'RUNNING';
  startedAt: string;
}

// execution:log
{
  executionId: string;
  log: {
    nodeId: string;
    level: string;
    message: string;
    data?: object;
    timestamp: string;
  }
}

// execution:step
{
  executionId: string;
  step: {
    nodeId: string;
    status: 'success' | 'failed' | 'skipped';
    output?: object;
    error?: string;
    duration: number;
  }
}

// execution:complete
{
  executionId: string;
  status: 'SUCCESS' | 'FAILED' | 'CANCELLED';
  output?: object;
  error?: string;
  endedAt: string;
}
```

---

## Rate Limiting

| Endpoint Category | Rate Limit |
|-------------------|------------|
| Auth endpoints | 10 req/min |
| Read operations | 100 req/min |
| Write operations | 30 req/min |
| Execution triggers | 60 req/min |

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248600
```
