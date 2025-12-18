# ADR-003: React Flow for Workflow Editor

## Status

Accepted

## Context

We need a library to build the visual workflow editor. Requirements:

- Node-based visual editor
- Drag-and-drop functionality
- Customizable nodes and edges
- Zoom/pan capabilities
- Good performance with many nodes
- React-based

### Options Considered

1. **React Flow** - Popular React library for node-based editors
2. **Xyflow (Pro)** - Commercial version of React Flow
3. **JointJS** - General-purpose diagramming library
4. **GoJS** - Commercial diagramming library
5. **Custom with Canvas/SVG** - Build from scratch

## Decision

We chose **React Flow** (open-source version).

## Rationale

### Pros

| Criterion | Score | Notes |
|-----------|-------|-------|
| React Integration | ⭐⭐⭐⭐⭐ | Native React |
| Customization | ⭐⭐⭐⭐⭐ | Fully customizable nodes/edges |
| Performance | ⭐⭐⭐⭐ | Good with virtualization |
| Documentation | ⭐⭐⭐⭐⭐ | Excellent examples |
| Community | ⭐⭐⭐⭐⭐ | Large, active |
| License | ⭐⭐⭐⭐⭐ | MIT (open source) |
| Learning Curve | ⭐⭐⭐⭐ | Moderate |

### Cons

- Some advanced features require Pro version
- Limited to React ecosystem
- Need to handle complex layouts manually

### Why Not Alternatives?

**Xyflow (Pro)**
- Paid license required
- Not necessary for MVP

**JointJS**
- jQuery dependency
- Less React-friendly
- Paid for commercial use

**GoJS**
- Expensive licensing
- Steeper learning curve
- Different paradigm than React

**Custom**
- Significant development effort
- Reinventing well-solved problems
- Ongoing maintenance burden

## Consequences

### Positive

- Rapid development of workflow editor
- Professional look and feel out of the box
- Large community for support
- Easy to customize for our needs

### Negative

- Dependency on external library
- May need Pro version for advanced features later
- Some performance tuning needed for complex workflows

### Mitigation

- Budget for Pro upgrade if needed
- Virtualize nodes for large workflows
- Abstract node components for flexibility

## Implementation Notes

### Node Types

```tsx
const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  loop: LoopNode,
};
```

### Edge Types

```tsx
const edgeTypes = {
  default: DefaultEdge,
  conditional: ConditionalEdge,
};
```

### State Management

- Use React Flow's built-in state hooks
- Sync with Zustand for global state
- Debounce updates for performance

### Performance Optimizations

1. Memoize node components
2. Use `nodeExtent` for boundary limits
3. Enable `fitView` for auto-zoom
4. Implement virtualization for 100+ nodes

## References

- [React Flow Documentation](https://reactflow.dev/)
- [React Flow Examples](https://reactflow.dev/examples)
- [Our Workflow Editor Guide](../guides/workflow-editor.md)
