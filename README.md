<p align="center">
  <img src="logo-nocta-wave.png" alt="Nocta Wave Logo" width="200" />
</p>

<h1 align="center">Nocta Wave</h1>

<p align="center">
  <strong>Plateforme d'orchestration de workflows open-source et self-hostable</strong>
  <br />
  <em>Alternative moderne à n8n avec collaboration temps réel et 69+ intégrations</em>
</p>

<p align="center">
  <a href="#fonctionnalités">Fonctionnalités</a> •
  <a href="#intégrations">Intégrations</a> •
  <a href="#installation">Installation</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#contribution">Contribution</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-blue.svg" alt="Version" />
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License" />
  <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg" alt="Node" />
  <img src="https://img.shields.io/badge/integrations-69%2B-orange.svg" alt="Integrations" />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" />
  <img src="https://img.shields.io/badge/self--hosted-ready-purple.svg" alt="Self-hosted Ready" />
</p>

---

## À propos

**Nocta Wave** est une plateforme d'orchestration de workflows visuelle et self-hostable. Elle permet de créer, gérer et exécuter des workflows complexes grâce à une interface drag-and-drop moderne avec collaboration en temps réel.

### Pourquoi Nocta Wave ?

- **Self-hostable** : Gardez le contrôle total de vos données
- **Collaboration temps réel** : Éditez les workflows à plusieurs avec curseurs partagés
- **69+ intégrations** : CRM, e-commerce, IA, bases de données, et plus
- **Architecture moderne** : Séparation Control Plane / Data Plane pour la scalabilité
- **Sécurité intégrée** : Chiffrement AES-256 des credentials, audit logs complets

---

## Fonctionnalités

### Éditeur Visuel
| Fonctionnalité | Description |
|----------------|-------------|
| **Drag & Drop** | Interface intuitive basée sur React Flow |
| **Minimap** | Navigation rapide dans les workflows complexes |
| **Undo/Redo** | Historique complet des modifications |
| **Groupes de nodes** | Organisation visuelle des workflows |
| **Recherche globale** | Trouvez rapidement n'importe quel workflow |
| **Favoris** | Accédez rapidement à vos workflows importants |

### Collaboration Temps Réel
| Fonctionnalité | Description |
|----------------|-------------|
| **Curseurs partagés** | Voyez où travaillent vos collaborateurs |
| **Chat intégré** | Discussions contextuelles avec @mentions |
| **Liens de partage** | Invitez des guests (VIEW/COMMENT/EDIT) |
| **Historique des changements** | Suivi de toutes les modifications |
| **Mode Suggestion** | Proposez des changements sans modifier directement |

### Versioning Git-like
| Fonctionnalité | Description |
|----------------|-------------|
| **Branches** | Développez sans impacter la production |
| **Pull Requests** | Reviews et approbations avant merge |
| **Tags** | Marquez les versions stables |
| **Merge strategies** | Squash, rebase ou merge standard |
| **Résolution de conflits** | Interface visuelle pour les conflits |

### Exécution
| Fonctionnalité | Description |
|----------------|-------------|
| **Triggers multiples** | Manuel, Cron, Webhook, Event |
| **Mode Debug** | Breakpoints, exécution pas-à-pas |
| **Logs temps réel** | Streaming via WebSocket |
| **Retry automatique** | Circuit breaker intégré |
| **Dead Letter Queue** | Récupération des exécutions échouées |
| **Cache intelligent** | Optimisation des nodes idempotents |

### Sub-workflows
| Fonctionnalité | Description |
|----------------|-------------|
| **Réutilisables** | Encapsulez des workflows comme nodes |
| **Mapping I/O** | Interface de mapping inputs/outputs |
| **Versioning** | Utilisez des versions spécifiques |
| **Détection de cycles** | Protection contre la récursion infinie |

### Variables & Environnements
| Fonctionnalité | Description |
|----------------|-------------|
| **Multi-environnements** | Dev, staging, production |
| **Types de variables** | String, number, boolean, JSON, secret |
| **Promotion** | Passage entre environnements |
| **Secrets chiffrés** | Variables sensibles protégées |

### Sécurité & Audit
| Fonctionnalité | Description |
|----------------|-------------|
| **Credentials chiffrés** | AES-256-GCM |
| **Audit logs** | Traçabilité complète des actions |
| **RBAC** | Permissions par équipe |
| **Redaction** | Masquage automatique des secrets |
| **Isolation multi-tenant** | Séparation stricte des données |

### Performance & Scalabilité
| Fonctionnalité | Description |
|----------------|-------------|
| **Queue distribuée** | Workers horizontalement scalables |
| **Priorités** | Queues par niveau de priorité |
| **Cache distribué** | L1 (local) + L2 (Redis) |
| **Partitionnement DB** | Tables partitionnées par date |
| **Read replicas** | Optimisation des lectures |
| **Archivage auto** | Cold storage pour l'historique |

---

## Intégrations

### 69+ nodes d'intégration disponibles

<table>
<tr>
<td valign="top">

**CRM**
- Salesforce
- HubSpot
- Pipedrive
- Zoho CRM

**Project Management**
- Jira
- Linear
- Asana
- Monday.com

**Communication**
- Slack
- Discord
- Microsoft Teams
- Telegram
- Twilio

</td>
<td valign="top">

**E-commerce**
- Shopify
- WooCommerce
- BigCommerce
- Magento
- Stripe
- PayPal

**AI/ML**
- Anthropic Claude
- OpenAI GPT
- Google Gemini
- Replicate
- Hugging Face

</td>
<td valign="top">

**Databases**
- PostgreSQL
- MySQL
- MongoDB
- Redis
- Elasticsearch
- Firebase
- DynamoDB
- ClickHouse

**Cloud**
- AWS (Lambda, S3, SQS)
- Azure (Blob, Functions)
- Google Cloud

</td>
<td valign="top">

**Productivité**
- Airtable
- Notion
- Google Sheets
- GitHub
- GitLab

**Observabilité**
- Datadog
- PagerDuty

**Email**
- SendGrid
- Mailchimp

</td>
</tr>
</table>

### Nodes utilitaires (20+)
- **Transform** : Map, Filter, Sort, Merge, Aggregate
- **Encoding** : Base64, XML, YAML, CSV, JSON
- **Crypto** : Hash, Encrypt/Decrypt
- **Logic** : Condition, Loop, Switch, Wait
- **Triggers** : Webhook, Cron, Manual, Event, Database Watch

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       CONTROL PLANE                              │
│              (API REST, WebSocket, UI-facing)                    │
├─────────────────────────────────────────────────────────────────┤
│  Auth │ User │ Team │ Workflow │ Credential │ Collaboration     │
│  Template │ Search │ Favorites │ Notification │ Suggestion       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │          REDIS            │
              │  Queue / Cache / Pub-Sub  │
              └─────────────┬─────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────────┐
│                        DATA PLANE                                │
│           (Execution Engine, Background Jobs)                    │
├─────────────────────────────────────────────────────────────────┤
│  Worker Pool │ Distributed Queue │ DLQ │ Cache │ Storage        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │        PostgreSQL         │
              │   (Partitioned Tables)    │
              └───────────────────────────┘
```

---

## Technologies

| Composant | Technologies |
|-----------|--------------|
| **Backend** | NestJS, Prisma, PostgreSQL, Redis, Socket.io |
| **Frontend** | Next.js 15, React 18, React Flow, Tailwind CSS, shadcn/ui |
| **State** | Zustand, React Query |
| **Monorepo** | pnpm workspaces, Turborepo |
| **Stockage** | S3/MinIO (optionnel) |
| **Cache** | Redis (L2) + Local (L1) |

---

## Installation

### Prérequis

- **Node.js** >= 20.x
- **pnpm** >= 8.x
- **Docker** & Docker Compose

### Quick Start

```bash
# 1. Cloner le repository
git clone https://github.com/your-org/nocta-wave.git
cd nocta-wave

# 2. Installer les dépendances
pnpm install

# 3. Configurer l'environnement
cp .env.example .env

# 4. Démarrer les services (PostgreSQL + Redis)
pnpm docker:up

# 5. Setup de la base de données
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 6. Démarrer en développement
pnpm dev
```

### URLs par défaut

| Application | URL |
|-------------|-----|
| **Web App** | http://localhost:4000 |
| **API** | http://localhost:4001 |
| **API Docs** | http://localhost:4001/docs |

### Credentials par défaut

| | |
|---|---|
| **Email** | `admin@nocta.local` |
| **Password** | `admin123` |

---

## Variables d'environnement

```env
# Base de données
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/noctawave"

# Redis
REDIS_URL="redis://localhost:6380"

# Sécurité
JWT_SECRET="your-super-secret-key-min-32-chars"
ENCRYPTION_KEY="your-32-char-encryption-key-here"

# API
API_PORT=4001
CORS_ORIGIN="http://localhost:4000"

# Frontend
NEXT_PUBLIC_API_URL="http://localhost:4001/api"
NEXT_PUBLIC_WS_URL="ws://localhost:4001"

# Stockage externe (optionnel)
OBJECT_STORAGE_ENABLED=false
OBJECT_STORAGE_ENDPOINT="http://localhost:9000"
OBJECT_STORAGE_ACCESS_KEY="minioadmin"
OBJECT_STORAGE_SECRET_KEY="minioadmin"
OBJECT_STORAGE_BUCKET="nocta-logs"

# Performance (optionnel)
DB_PARTITIONING_ENABLED=false
EXECUTION_RETENTION_DAYS=90
ARCHIVE_ENABLED=false
```

---

## Commandes

```bash
# Développement
pnpm dev                    # Démarrer API + Web
pnpm dev:api                # API uniquement
pnpm dev:web                # Frontend uniquement

# Build
pnpm build                  # Build tous les packages

# Base de données
pnpm db:generate            # Générer le client Prisma
pnpm db:migrate             # Appliquer les migrations
pnpm db:studio              # Ouvrir Prisma Studio

# Tests
pnpm test                   # Tests unitaires
pnpm test:e2e:docker        # Tests E2E (avec Docker)
pnpm test:e2e:docker:down   # Cleanup containers de test

# Docker
pnpm docker:up              # Démarrer PostgreSQL + Redis
pnpm docker:down            # Arrêter les services
```

---

## Structure du Projet

```
nocta-wave/
├── apps/
│   ├── api/                    # Backend NestJS
│   │   ├── src/
│   │   │   ├── modules/        # Feature modules
│   │   │   │   ├── auth/       # Authentification
│   │   │   │   ├── workflow/   # Gestion workflows
│   │   │   │   ├── execution/  # Exécution & logs
│   │   │   │   ├── collaboration/ # Temps réel
│   │   │   │   ├── branch/     # Git-like versioning
│   │   │   │   ├── subworkflow/ # Sub-workflows
│   │   │   │   ├── environment/ # Variables & envs
│   │   │   │   ├── debug/      # Mode debug
│   │   │   │   ├── template/   # Marketplace
│   │   │   │   ├── suggestion/ # Mode suggestion
│   │   │   │   ├── queue/      # Queue distribuée
│   │   │   │   ├── cache/      # Cache intelligent
│   │   │   │   ├── database-optimization/ # DB perf
│   │   │   │   ├── audit/      # Audit logging
│   │   │   │   ├── alerting/   # Alertes
│   │   │   │   ├── monitoring/ # Métriques
│   │   │   │   ├── storage/    # S3/MinIO
│   │   │   │   └── security/   # Redaction
│   │   │   ├── worker/         # Job processor
│   │   │   └── database/       # Prisma
│   │   ├── prisma/             # Schema & migrations
│   │   └── test/               # Tests unitaires & E2E
│   │
│   └── web/                    # Frontend Next.js
│       └── src/
│           ├── app/            # App Router pages
│           ├── components/     # React components
│           ├── stores/         # Zustand stores
│           └── lib/            # Utilities
│
├── packages/
│   ├── shared/                 # Types & schemas partagés
│   └── nodes/                  # 69+ node definitions
│       └── src/
│           ├── integration/    # 58 intégrations externes
│           ├── database/       # 11 connecteurs DB
│           ├── transform/      # Nodes de transformation
│           ├── logic/          # Nodes de contrôle
│           └── trigger/        # 8 types de triggers
│
├── docker/                     # Docker configs
│   ├── docker-compose.yml      # Développement
│   ├── docker-compose.test.yml # Tests E2E
│   └── docker-compose.prod.yml # Production
│
└── docs/                       # Documentation
    ├── architecture/           # Architecture decisions
    ├── guides/                 # Guides développeur
    └── nodes/                  # Documentation des nodes
```

---

## Tests

### Stratégie de Tests

```
┌─────────────┐
│    E2E      │  Tests complets API → Queue → Worker → DB
└──────┬──────┘
┌──────┴──────┐
│ Integration │  Tests modules avec mocks
└──────┬──────┘
┌──────┴──────┐
│    Unit     │  Tests isolés (nodes, services)
└─────────────┘
```

### Lancer les tests E2E

```bash
# Démarre les containers de test, setup DB, exécute les tests
pnpm test:e2e:docker

# Nettoyage
pnpm test:e2e:docker:down
```

---

## Documentation

- [Architecture Overview](docs/architecture/overview.md)
- [Testing Guide](docs/guides/testing.md)
- [Node Development](docs/nodes/development-guide.md)
- [Getting Started](docs/guides/getting-started.md)

---

## Roadmap

Consultez [ROADMAP.md](ROADMAP.md) pour l'état d'avancement complet.

### Résumé

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Core (Sub-workflows, Debug, Versioning) | ✅ 100% |
| Phase 2 | Intégrations (69+ nodes) | ✅ 90% |
| Phase 3 | Collaboration & UX | ✅ 85% |
| Phase 4 | Performance & Scale | ✅ 100% |
| Phase 5 | Observabilité | ✅ 80% |
| Phase 6 | Enterprise (SSO, Compliance) | 🔄 60% |

---

## Contribution

Les contributions sont les bienvenues !

1. **Fork** le repository
2. Créez une **branche** (`git checkout -b feature/amazing-feature`)
3. **Commit** vos changements
4. **Push** vers la branche
5. Ouvrez une **Pull Request**

### Priorités actuelles

- Correction des vulnérabilités de sécurité (voir ROADMAP.md)
- Amélioration des health checks (liveness/readiness probes)
- Implémentation SSO (SAML 2.0, OIDC)
- Command palette et raccourcis clavier

---

## License

Ce projet est sous licence MIT. Voir [LICENSE](LICENSE).

---

<p align="center">
  Fait avec ❤️ par l'équipe Nocta Wave
</p>
