# Installation

> Guide d'installation complet de WS-Flows en environnement de développement.

## Prérequis

Avant de commencer, assurez-vous d'avoir installé :

| Outil | Version Minimum | Vérification |
|-------|-----------------|--------------|
| Node.js | 18+ | `node --version` |
| pnpm | 8+ | `pnpm --version` |
| Docker | 20+ | `docker --version` |
| Docker Compose | 2+ | `docker compose version` |
| Git | 2.30+ | `git --version` |

## Installation Étape par Étape

### 1. Cloner le Repository

```bash
git clone https://github.com/wakastart/ws-flows.git
cd ws-flows
```

### 2. Installer les Dépendances

WS-Flows utilise pnpm comme gestionnaire de paquets dans un monorepo :

```bash
pnpm install
```

Cette commande installe les dépendances pour tous les packages :
- `apps/api` - Backend NestJS
- `apps/web` - Frontend Next.js
- `apps/worker` - Worker Trigger.dev
- `packages/shared` - Types et utilitaires partagés
- `packages/nodes` - Définitions des nodes
- `packages/ui` - Composants UI partagés

### 3. Configuration des Variables d'Environnement

Copiez les fichiers d'exemple et configurez-les :

```bash
# Backend
cp apps/api/.env.example apps/api/.env

# Frontend
cp apps/web/.env.example apps/web/.env.local

# Worker
cp apps/worker/.env.example apps/worker/.env
```

#### Variables Backend (`apps/api/.env`)

```env
# Base de données
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wsflows"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="votre-secret-jwt-securise"
JWT_EXPIRES_IN="7d"

# Encryption (pour les credentials)
ENCRYPTION_KEY="32-caracteres-hexadecimaux-securises"

# Trigger.dev
TRIGGER_API_KEY="tr_dev_xxxx"
TRIGGER_API_URL="http://localhost:3030"

# Port
PORT=3001
```

#### Variables Frontend (`apps/web/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

### 4. Démarrer les Services Docker

Lancez PostgreSQL et Redis via Docker Compose :

```bash
docker compose up -d
```

Vérifiez que les services sont actifs :

```bash
docker compose ps
```

Vous devriez voir :
```
NAME                SERVICE     STATUS
ws-flows-postgres   postgres    running
ws-flows-redis      redis       running
```

### 5. Configurer la Base de Données

Générez le client Prisma et appliquez les migrations :

```bash
# Générer le client Prisma
pnpm db:generate

# Appliquer les migrations
pnpm db:migrate

# (Optionnel) Ajouter des données de test
pnpm db:seed
```

### 6. Démarrer l'Application

Lancez tous les services en mode développement :

```bash
pnpm dev
```

Ou démarrez chaque service individuellement :

```bash
# Terminal 1 - Backend
pnpm dev:api

# Terminal 2 - Frontend
pnpm dev:web

# Terminal 3 - Worker Trigger.dev
pnpm dev:worker
```

### 7. Accéder à l'Application

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **Swagger API Docs**: http://localhost:3001/api/docs
- **Prisma Studio**: `pnpm db:studio` puis http://localhost:5555

## Structure des Ports

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | Application Next.js |
| API | 3001 | Backend NestJS |
| Trigger.dev | 3030 | Moteur d'exécution |
| PostgreSQL | 5432 | Base de données |
| Redis | 6379 | Cache et sessions |

## Commandes Utiles

### Développement

```bash
pnpm dev              # Démarrer tous les services
pnpm build            # Build de production
pnpm lint             # Linter
pnpm typecheck        # Vérification TypeScript
pnpm test             # Tests unitaires
```

### Base de Données

```bash
pnpm db:generate      # Régénérer le client Prisma
pnpm db:migrate       # Appliquer les migrations
pnpm db:push          # Synchroniser le schéma (dev)
pnpm db:seed          # Peupler la base
pnpm db:studio        # Interface visuelle Prisma
```

### Docker

```bash
docker compose up -d          # Démarrer les services
docker compose down           # Arrêter les services
docker compose logs -f        # Voir les logs
docker compose ps             # État des services
```

## Dépannage

### Erreur de connexion à PostgreSQL

```bash
# Vérifier que le conteneur est actif
docker compose ps

# Recréer le conteneur
docker compose down
docker compose up -d postgres
```

### Erreur de migration Prisma

```bash
# Reset complet de la base
pnpm db:push --force-reset
pnpm db:seed
```

### Port déjà utilisé

```bash
# Trouver le processus
lsof -i :3000

# Terminer le processus
kill -9 <PID>
```

### Problème de cache pnpm

```bash
# Nettoyer le cache
pnpm store prune

# Réinstaller
rm -rf node_modules
pnpm install
```

## Prochaine Étape

Maintenant que WS-Flows est installé, passez à [Créer votre Premier Workflow](./first-workflow.md).

## Voir Aussi

- [Concepts Clés](./concepts.md)
- [Architecture](../architecture/overview.md)
- [Configuration Trigger.dev](../guides/trigger-dev-integration.md)
