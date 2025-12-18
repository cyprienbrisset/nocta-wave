<p align="center">
  <img src="logo-nocta-wave.png" alt="WS-Flows Logo" width="200" />
</p>

<h1 align="center">WS-Flows</h1>

<p align="center">
  <strong>Plateforme d'automatisation de workflows open-source</strong>
  <br />
  <em>Alternative moderne à n8n construite avec NestJS & Next.js</em>
</p>

<p align="center">
  <a href="#fonctionnalités">Fonctionnalités</a> •
  <a href="#technologies">Technologies</a> •
  <a href="#installation">Installation</a> •
  <a href="#utilisation">Utilisation</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#contribution">Contribution</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-blue.svg" alt="Version" />
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License" />
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg" alt="Node" />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" />
</p>

---

## À propos

**WS-Flows** est une plateforme d'automatisation de workflows visuelle et intuitive, inspirée de n8n. Elle permet de créer, gérer et exécuter des workflows complexes grâce à une interface drag-and-drop moderne.

Construite avec une architecture monorepo moderne, WS-Flows offre une solution complète pour automatiser vos processus métier, intégrer vos applications et orchestrer vos données.

## Aperçu de l'architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Next.js Web   │────▶│   NestJS API    │────▶│  Trigger.dev    │
│   (Frontend)    │     │   (Backend)     │     │   (Worker)      │
│                 │     │                 │     │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
              ┌─────▼─────┐            ┌──────▼─────┐
              │           │            │            │
              │ PostgreSQL│            │   Redis    │
              │           │            │            │
              └───────────┘            └────────────┘
```

## Fonctionnalités

### Éditeur Visuel
- **Drag & Drop** - Interface intuitive pour créer des workflows
- **40+ Nodes** - Intégrations prêtes à l'emploi (Slack, GitHub, OpenAI, etc.)
- **Minimap** - Navigation rapide dans les workflows complexes
- **Groupes de nodes** - Organisation visuelle des workflows
- **Debug Mode** - Points d'arrêt et inspection des données en temps réel
- **Undo/Redo** - Historique complet des modifications
- **Copy/Paste** - Duplication rapide de nodes

### Collaboration
- **Commentaires** - Discussions sur les workflows et nodes avec threads
- **Tags & Labels** - Organisation et catégorisation par couleur
- **Historique des versions** - Diff visuel et restauration
- **Templates** - Bibliothèque de workflows réutilisables
- **Import/Export JSON** - Partage facile des workflows

### Exécution
- **Triggers multiples** - Manuel, Cron, Webhook, Polling HTTP
- **Logs temps réel** - Suivi des exécutions via WebSocket
- **Retry automatique** - Gestion des erreurs robuste
- **Variables d'environnement** - Configuration flexible

### Sécurité
- **Multi-tenant** - Équipes et permissions RBAC
- **Credentials chiffrés** - AES-256-GCM pour les secrets
- **JWT + Refresh Tokens** - Authentification sécurisée
- **API Keys** - Accès programmatique avec scopes

## Technologies

### Backend
| Technologie | Usage |
|-------------|-------|
| **NestJS** | Framework API REST |
| **Prisma** | ORM et migrations |
| **PostgreSQL** | Base de données principale |
| **Redis** | Cache et files d'attente |
| **Socket.io** | WebSocket temps réel |
| **Trigger.dev** | Exécution des jobs |

### Frontend
| Technologie | Usage |
|-------------|-------|
| **Next.js 14** | Framework React avec App Router |
| **React Flow** | Éditeur de workflow visuel |
| **Tailwind CSS** | Styling utilitaire |
| **shadcn/ui** | Composants UI |
| **Zustand** | State management |
| **React Query** | Data fetching |

### Infra & DevOps
| Technologie | Usage |
|-------------|-------|
| **pnpm** | Package manager |
| **Turborepo** | Build system monorepo |
| **Docker** | Conteneurisation |
| **TypeScript** | Typage statique |

## Installation

### Prérequis

- **Node.js** >= 18.x
- **pnpm** >= 8.x
- **Docker** & Docker Compose
- **Git**

### Quick Start

```bash
# 1. Cloner le repository
git clone https://github.com/your-org/ws-flows.git
cd ws-flows

# 2. Installer les dépendances
pnpm install

# 3. Configurer l'environnement
cp .env.example .env

# 4. Démarrer les services (PostgreSQL + Redis)
docker compose -f docker/docker-compose.yml up -d

# 5. Générer le client Prisma et appliquer les migrations
cd apps/api
pnpm db:generate
pnpm db:migrate

# 6. Démarrer en mode développement (depuis la racine)
cd ../..
pnpm dev
```

### Variables d'environnement

Créez un fichier `.env` à la racine du projet :

```env
# Base de données
DATABASE_URL="postgresql://postgres:password@localhost:5434/wsflows"

# Redis
REDIS_URL="redis://:password@localhost:6380"

# JWT
JWT_SECRET="your-super-secret-key-min-32-chars"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_SECRET="your-refresh-secret-key"
REFRESH_TOKEN_EXPIRES_IN="7d"

# Encryption (credentials)
ENCRYPTION_KEY="your-32-char-encryption-key-here"

# API
API_PORT=4001
CORS_ORIGIN="http://localhost:4000"

# Frontend
NEXT_PUBLIC_API_URL="http://localhost:4001/api"

# Trigger.dev (optionnel)
TRIGGER_API_URL="https://api.trigger.dev"
TRIGGER_API_KEY="your-trigger-api-key"
```

## Utilisation

### Accès aux applications

| Application | URL | Description |
|-------------|-----|-------------|
| **Web App** | http://localhost:4000 | Interface utilisateur |
| **API** | http://localhost:4001 | Backend REST API |
| **API Docs** | http://localhost:4001/docs | Swagger Documentation |

### Commandes pnpm

```bash
# Développement
pnpm dev                    # Démarrer tous les services
pnpm dev --filter @ws-flows/api   # API uniquement
pnpm dev --filter @ws-flows/web   # Frontend uniquement

# Build
pnpm build                  # Build tous les packages
pnpm --filter @ws-flows/api build
pnpm --filter @ws-flows/web build

# Base de données (depuis apps/api)
pnpm db:generate           # Générer le client Prisma
pnpm db:migrate            # Appliquer les migrations
pnpm db:studio             # Ouvrir Prisma Studio
pnpm db:seed               # Seed la base de données

# Linting
pnpm lint                   # Lint tous les packages

# Tests
pnpm test                   # Exécuter tous les tests
```

## Architecture

```
ws-flows/
├── apps/
│   ├── api/                    # Backend NestJS
│   │   ├── src/
│   │   │   ├── modules/        # Feature modules
│   │   │   │   ├── auth/       # Authentification JWT
│   │   │   │   ├── user/       # Gestion utilisateurs
│   │   │   │   ├── team/       # Équipes & RBAC
│   │   │   │   ├── workflow/   # Gestion des workflows
│   │   │   │   ├── execution/  # Exécution & logs
│   │   │   │   ├── credential/ # Credentials chiffrés
│   │   │   │   ├── collaboration/ # Commentaires, tags, templates
│   │   │   │   ├── node/       # Registry des nodes
│   │   │   │   ├── webhook/    # Endpoints webhook
│   │   │   │   └── health/     # Health checks
│   │   │   ├── database/       # Prisma service
│   │   │   └── worker/         # Job execution
│   │   └── prisma/             # Schema & migrations
│   │
│   ├── web/                    # Frontend Next.js
│   │   ├── src/
│   │   │   ├── app/            # App Router pages
│   │   │   ├── components/     # React components
│   │   │   │   ├── ui/         # shadcn/ui components
│   │   │   │   └── workflow-editor/
│   │   │   ├── hooks/          # Custom hooks
│   │   │   ├── stores/         # Zustand stores
│   │   │   └── lib/            # Utilities & API client
│   │   └── public/
│   │
│   └── worker/                 # Trigger.dev worker
│
├── packages/
│   ├── shared/                 # Types & schemas partagés
│   │   └── src/
│   │       ├── types/          # TypeScript types
│   │       └── schemas/        # Zod schemas
│   │
│   └── nodes/                  # SDK de création de nodes
│       └── src/
│           ├── triggers/       # Nodes de déclenchement
│           ├── http/           # HTTP Request/Response
│           ├── transform/      # Transformation de données
│           ├── logic/          # Logique conditionnelle
│           ├── database/       # Connecteurs DB
│           ├── integrations/   # APIs tierces
│           └── utility/        # Utilitaires
│
├── docs/                       # Documentation
├── docker/                     # Configuration Docker
└── logo-nocta-wave.png         # Logo du projet
```

### Nodes disponibles (40+)

| Catégorie | Nodes |
|-----------|-------|
| **Triggers** | Manual, Cron, Webhook, HTTP Poll |
| **HTTP** | Request, Response |
| **Transform** | Set, Map, Filter, Merge, Split, Aggregate, Sort, Code |
| **Logic** | Condition, Switch, Loop, Wait, Stop |
| **Database** | PostgreSQL, MySQL, MongoDB, Redis |
| **Integrations** | Slack, Discord, GitHub, Gmail, Google Sheets, Notion, Airtable, Stripe, Twilio, SendGrid, AWS S3, OpenAI, RSS, Webflow |
| **Utility** | Delay, Crypto, DateTime, HTML Parse, Log, Debug, JSON Parse, Error |

## Création de nodes personnalisés

```typescript
import { createNode, input, output } from '@ws-flows/nodes';

export const myCustomNode = createNode(
  {
    type: 'custom.my-node',
    category: 'custom',
    name: 'My Custom Node',
    description: 'Does something amazing',
    icon: 'Sparkles',
    inputs: [
      input.string('message', 'Message to process'),
      input.number('count', 'Number of times', { default: 1 }),
    ],
    outputs: [
      output.string('result', 'Processed result'),
    ],
  },
  async (input, context) => {
    const { message, count } = input.config;
    const result = message.repeat(count).toUpperCase();

    context.logger.info('Processing complete', { result });

    return { data: { result } };
  }
);
```

Consultez [packages/nodes/README.md](packages/nodes/README.md) pour la documentation complète.

## API Reference

### Authentification

```bash
# Inscription
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}

# Connexion
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

# Refresh Token
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "..."
}
```

### Workflows

```bash
# Lister les workflows
GET /api/workflows
Authorization: Bearer <token>

# Créer un workflow
POST /api/workflows
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Mon Workflow",
  "description": "Description...",
  "graph": { "nodes": [], "edges": [], "viewport": {} }
}

# Exécuter un workflow
POST /api/executions
Authorization: Bearer <token>
Content-Type: application/json

{
  "workflowId": "uuid",
  "triggerType": "MANUAL"
}

# Exporter un workflow
GET /api/workflows/:id/export
Authorization: Bearer <token>

# Importer un workflow
POST /api/workflows/import
Authorization: Bearer <token>
Content-Type: application/json

{ ... exported JSON ... }
```

La documentation complète de l'API est disponible sur `http://localhost:4001/docs`.

## Déploiement

### Docker (Production)

```bash
docker compose -f docker/docker-compose.prod.yml up -d
```

### Déploiement manuel

1. **Build** tous les packages : `pnpm build`
2. **API** : Déployer `apps/api/dist` sur Node.js
3. **Web** : Export statique ou serveur Node.js
4. **Worker** : Trigger.dev CLI ou self-hosted

## Contribution

Les contributions sont les bienvenues !

### Développement local

1. **Fork** le repository
2. Créez une **branche** (`git checkout -b feature/amazing-feature`)
3. **Commit** vos changements (`git commit -m 'Add amazing feature'`)
4. **Push** vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrez une **Pull Request**

### Création de nodes

Pour créer un nouveau node, suivez le guide dans [docs/nodes/](docs/nodes/).

Chaque node doit inclure :
- Definition avec Zod schema
- Tests unitaires
- Documentation
- Exemple d'utilisation

## Roadmap

Consultez notre [ROADMAP.md](ROADMAP.md) pour les fonctionnalités planifiées :

- Sub-workflows réutilisables
- Variables & Environnements (dev/staging/prod)
- Testing Framework intégré
- API GraphQL
- Plus d'intégrations (Salesforce, HubSpot, Jira, Linear, etc.)
- OAuth 2.0 avec refresh automatique
- Circuit breaker et retry avancé

## Documentation

- [Architecture Overview](docs/architecture/overview.md)
- [API Reference](docs/api/overview.md)
- [Node Development Guide](docs/nodes/development-guide.md)
- [Getting Started](docs/guides/getting-started.md)

## License

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## Remerciements

- [n8n](https://n8n.io) - Inspiration pour le concept d'automatisation de workflows
- [Trigger.dev](https://trigger.dev) - Exécution des jobs en arrière-plan
- [React Flow](https://reactflow.dev) - Éditeur de workflow visuel
- [shadcn/ui](https://ui.shadcn.com) - Composants UI élégants
- [Prisma](https://prisma.io) - ORM moderne pour TypeScript

---

<p align="center">
  Fait avec ❤️ par l'équipe WS-Flows
</p>
