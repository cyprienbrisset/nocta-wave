<p align="center">
  <img src="logo-nocta-wave.png" alt="Nocta Wave Logo" width="200" />
</p>

<h1 align="center">Nocta Wave</h1>

<p align="center">
  <strong>Plateforme d'orchestration de workflows open-source et self-hostable</strong>
  <br />
  <em>Alternative moderne à n8n avec collaboration temps réel</em>
</p>

<p align="center">
  <a href="#fonctionnalités">Fonctionnalités</a> •
  <a href="#technologies">Technologies</a> •
  <a href="#installation">Installation</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#contribution">Contribution</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-blue.svg" alt="Version" />
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License" />
  <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg" alt="Node" />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" />
  <img src="https://img.shields.io/badge/self--hosted-ready-purple.svg" alt="Self-hosted Ready" />
</p>

---

## À propos

**Nocta Wave** est une plateforme d'orchestration de workflows visuelle et self-hostable. Elle permet de créer, gérer et exécuter des workflows complexes grâce à une interface drag-and-drop moderne avec collaboration en temps réel.

### Pourquoi Nocta Wave ?

- **Self-hostable** : Gardez le contrôle total de vos données
- **Collaboration temps réel** : Éditez les workflows à plusieurs avec curseurs partagés
- **Architecture moderne** : Séparation Control Plane / Data Plane pour la scalabilité
- **Sécurité intégrée** : Chiffrement des credentials, masquage automatique des secrets dans les logs

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       CONTROL PLANE                              │
│              (API REST, WebSocket, UI-facing)                    │
├─────────────────────────────────────────────────────────────────┤
│  Auth │ User │ Team │ Workflow │ Credential │ Collaboration     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │          REDIS            │
              │    (Queue / Cache)        │
              └─────────────┬─────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────────┐
│                        DATA PLANE                                │
│           (Execution Engine, Background Jobs)                    │
├─────────────────────────────────────────────────────────────────┤
│  Worker │ Execution │ Webhook Ingestion │ Storage (S3/MinIO)    │
└─────────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │        PostgreSQL         │
              │      (Persistent Data)    │
              └───────────────────────────┘
```

## Fonctionnalités

### Éditeur Visuel
- **Drag & Drop** : Interface intuitive basée sur React Flow
- **Minimap** : Navigation rapide dans les workflows complexes
- **Undo/Redo** : Historique complet des modifications
- **Copy/Paste** : Duplication rapide de nodes

### Collaboration Temps Réel
- **Curseurs partagés** : Voyez où travaillent vos collaborateurs
- **Chat intégré** : Discussions contextuelles sur les workflows
- **Liens de partage** : Invitez des guests avec permissions VIEW/COMMENT/EDIT
- **Historique des changements** : Suivi de toutes les modifications

### Exécution
- **Triggers multiples** : Manuel, Cron, Webhook
- **Logs temps réel** : Suivi via WebSocket/SSE
- **Retry automatique** : Gestion des erreurs avec circuit breaker
- **Dead Letter Queue** : Récupération des exécutions échouées
- **Cache intelligent** : Optimisation des nodes répétitifs

### Sécurité
- **Multi-tenant** : Équipes et permissions RBAC
- **Credentials chiffrés** : AES-256-GCM
- **Masquage des secrets** : Redaction automatique dans les logs
- **Permissions WebSocket** : Contrôle strict VIEW/COMMENT/EDIT

### Performance & Scalabilité
- **Stockage externe** : Logs volumineux sur S3/MinIO
- **Cache Redis** : Données éphémères hors PostgreSQL
- **Workers scalables** : Data Plane indépendant du Control Plane

## Technologies

| Composant | Technologies |
|-----------|--------------|
| **Backend** | NestJS, Prisma, PostgreSQL, Redis, Socket.io |
| **Frontend** | Next.js 15, React 18, React Flow, Tailwind CSS, shadcn/ui |
| **State** | Zustand, React Query |
| **Monorepo** | pnpm workspaces, Turborepo |
| **Stockage** | S3/MinIO (optionnel) |

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

# Stockage externe (optionnel)
OBJECT_STORAGE_ENABLED=false
OBJECT_STORAGE_ENDPOINT="http://localhost:9000"
OBJECT_STORAGE_ACCESS_KEY="minioadmin"
OBJECT_STORAGE_SECRET_KEY="minioadmin"
OBJECT_STORAGE_BUCKET="nocta-logs"
```

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
│   └── nodes/                  # Node definitions & runners
│
├── docker/                     # Docker configs
│   ├── docker-compose.yml      # Développement
│   ├── docker-compose.test.yml # Tests E2E
│   └── docker-compose.prod.yml # Production
│
└── docs/                       # Documentation
    ├── architecture/           # Architecture decisions
    └── guides/                 # Guides développeur
```

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

## Documentation

- [Architecture Overview](docs/architecture/overview.md)
- [Testing Guide](docs/guides/testing.md)
- [Node Development](docs/nodes/development-guide.md)
- [Getting Started](docs/guides/getting-started.md)

## Contribution

Les contributions sont les bienvenues !

1. **Fork** le repository
2. Créez une **branche** (`git checkout -b feature/amazing-feature`)
3. **Commit** vos changements
4. **Push** vers la branche
5. Ouvrez une **Pull Request**

## Roadmap

Consultez [ROADMAP.md](ROADMAP.md) pour les fonctionnalités planifiées.

## License

Ce projet est sous licence MIT. Voir [LICENSE](LICENSE).

---

<p align="center">
  Fait avec ❤️ par l'équipe Nocta Wave
</p>
