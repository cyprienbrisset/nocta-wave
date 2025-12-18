# ADR-002: NestJS as Backend Framework

## Status

Accepted

## Context

We need a backend framework for the API server that handles:

- RESTful API endpoints
- WebSocket connections for real-time updates
- Database operations
- Authentication/Authorization
- Modular architecture for maintainability

### Options Considered

1. **Express.js** - Minimal, flexible
2. **Fastify** - Fast, low overhead
3. **NestJS** - Full-featured, structured
4. **Hono** - Modern, edge-ready

## Decision

We chose **NestJS** as the backend framework.

## Rationale

### Pros

| Criterion | Score | Notes |
|-----------|-------|-------|
| TypeScript Support | ⭐⭐⭐⭐⭐ | Built for TypeScript |
| Structure | ⭐⭐⭐⭐⭐ | Opinionated, consistent |
| Dependency Injection | ⭐⭐⭐⭐⭐ | Built-in DI container |
| Ecosystem | ⭐⭐⭐⭐⭐ | Rich module ecosystem |
| Documentation | ⭐⭐⭐⭐⭐ | Excellent docs |
| Testing | ⭐⭐⭐⭐⭐ | Built-in testing utilities |
| WebSocket | ⭐⭐⭐⭐ | Native support |
| Performance | ⭐⭐⭐ | Moderate (can use Fastify adapter) |

### Cons

- Higher initial complexity
- More boilerplate than minimal frameworks
- Steeper learning curve for new developers

### Why Not Alternatives?

**Express.js**
- No built-in structure (leads to inconsistency)
- Manual TypeScript setup
- No dependency injection

**Fastify**
- Less structured
- Smaller ecosystem
- Manual DI setup needed

**Hono**
- Newer, less mature
- Primarily for edge/serverless
- Less enterprise features

## Consequences

### Positive

- Consistent codebase structure
- Easy to onboard new developers familiar with Angular-like patterns
- Built-in support for most features we need
- Strong typing throughout

### Negative

- Slightly more verbose code
- Performance overhead (mitigated by Fastify adapter if needed)
- Framework lock-in

### Mitigation

- Use Fastify adapter for better performance
- Keep business logic in services, not controllers
- Use standard patterns that are framework-agnostic

## Implementation Notes

### Module Structure

```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── strategies/
│   ├── workflow/
│   ├── execution/
│   ├── credential/
│   └── node/
├── common/
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   └── interceptors/
└── main.ts
```

### Key Patterns

- **Modules**: Feature-based organization
- **Controllers**: Handle HTTP requests
- **Services**: Business logic
- **Guards**: Authentication/Authorization
- **Interceptors**: Request/Response transformation
- **Pipes**: Validation and transformation

## References

- [NestJS Documentation](https://docs.nestjs.com/)
- [NestJS with Prisma](https://docs.nestjs.com/recipes/prisma)
- [NestJS WebSockets](https://docs.nestjs.com/websockets/gateways)
