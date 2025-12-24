# ADR-004: Monorepo Structure with pnpm and Turborepo

## Status

Accepted

## Context

We need to organize multiple applications and shared packages:

- API backend
- Web frontend
- Shared types and utilities
- Node definitions
- UI components

### Options Considered

1. **Monorepo with pnpm + Turborepo**
2. **Monorepo with Nx**
3. **Monorepo with Lerna + Yarn**
4. **Polyrepo** - Separate repositories

## Decision

We chose **pnpm workspaces with Turborepo**.

## Rationale

### Pros

| Criterion | Score | Notes |
|-----------|-------|-------|
| Disk Efficiency | ⭐⭐⭐⭐⭐ | pnpm's content-addressable storage |
| Build Speed | ⭐⭐⭐⭐⭐ | Turborepo's caching |
| Simplicity | ⭐⭐⭐⭐ | Minimal configuration |
| Flexibility | ⭐⭐⭐⭐⭐ | Works with any framework |
| Community | ⭐⭐⭐⭐ | Growing adoption |

### Cons

- Turborepo less mature than Nx
- Requires pnpm (not npm/yarn)
- Remote caching requires Vercel or self-hosting

### Why Not Alternatives?

**Nx**
- More complex setup
- Heavier tooling
- Overkill for our scale

**Lerna + Yarn**
- Lerna is in maintenance mode
- Less efficient than pnpm
- Slower builds

**Polyrepo**
- Harder to share code
- Version synchronization issues
- More complex CI/CD

## Consequences

### Positive

- Single source of truth for all code
- Efficient dependency management
- Fast incremental builds
- Easy code sharing between apps

### Negative

- All code in one repository (larger repo)
- Team needs to learn pnpm
- CI requires special caching setup

### Mitigation

- Set up proper CODEOWNERS
- Configure Turborepo caching
- Use `.npmrc` for pnpm settings

## Implementation Notes

### Workspace Structure

```
ws-flows/
├── apps/
│   ├── api/
│   └── web/
├── packages/
│   ├── shared/
│   ├── nodes/
│   └── ui/
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### turbo.json

```json
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
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

### Package Referencing

```json
// apps/api/package.json
{
  "dependencies": {
    "@ws-flows/shared": "workspace:*",
    "@ws-flows/nodes": "workspace:*"
  }
}
```

### Commands

```bash
# Install all dependencies
pnpm install

# Run all apps in dev mode
pnpm dev

# Build all packages
pnpm build

# Run specific app
pnpm --filter api dev
pnpm --filter web dev

# Add dependency to specific package
pnpm --filter api add express
```

## References

- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Turborepo with pnpm](https://turbo.build/repo/docs/getting-started/create-new#with-pnpm)
