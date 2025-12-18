# ADR-001: Trigger.dev as Execution Engine

## Status

Accepted

## Context

We need a reliable execution engine for running workflows. The engine must support:

- Reliable job execution with retries
- Step-by-step execution tracking
- Observability (logs, metrics)
- Local-first development
- Scalable architecture

### Options Considered

1. **Custom execution engine** - Build from scratch using Bull/BullMQ
2. **Temporal.io** - Production-grade workflow orchestration
3. **Trigger.dev** - Modern TypeScript-first job execution
4. **Inngest** - Event-driven background jobs

## Decision

We chose **Trigger.dev** as the execution engine.

## Rationale

### Pros

| Criterion | Score | Notes |
|-----------|-------|-------|
| TypeScript Native | ⭐⭐⭐⭐⭐ | First-class TypeScript support |
| Local Development | ⭐⭐⭐⭐⭐ | Excellent local dev experience |
| Observability | ⭐⭐⭐⭐⭐ | Built-in dashboard, logs, metrics |
| Retries | ⭐⭐⭐⭐⭐ | Configurable retry strategies |
| Complexity | ⭐⭐⭐⭐ | Moderate learning curve |
| Self-hosting | ⭐⭐⭐⭐ | Docker-based deployment |
| Community | ⭐⭐⭐ | Growing, active maintainers |

### Cons

- Relatively new (less battle-tested than Temporal)
- Smaller community compared to alternatives
- Some advanced features require paid plans

### Why Not Alternatives?

**Custom Engine (Bull/BullMQ)**
- Higher development effort
- Need to build observability from scratch
- More maintenance burden

**Temporal.io**
- Java/Go centric (TypeScript SDK less mature)
- More complex infrastructure
- Overkill for our initial requirements

**Inngest**
- Less control over execution
- Primarily designed for serverless
- Limited self-hosting options

## Consequences

### Positive

- Faster time to market with built-in features
- Better developer experience
- Professional observability out of the box
- Clear upgrade path as we scale

### Negative

- Dependency on external project
- Need to adapt our workflow model to Trigger.dev concepts
- Potential migration effort if we outgrow it

### Mitigation

- Abstract execution layer behind interfaces
- Keep workflow definitions portable
- Monitor Trigger.dev project health

## Implementation Notes

- Workflows map to Trigger.dev Jobs
- Nodes map to Steps
- Executions map to Runs
- Use local mode for development

## References

- [Trigger.dev Documentation](https://trigger.dev/docs)
- [Trigger.dev GitHub](https://github.com/triggerdotdev/trigger.dev)
- [Our Trigger.dev Integration Guide](../guides/trigger-dev-integration.md)
