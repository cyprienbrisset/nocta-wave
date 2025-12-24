# Installation

> Guide d'installation complet de WS-Flows en environnement de développement.

## Prérequis

Avant de commencer, assurez-vous d'avoir installé :

| Outil | Version Minimum | Vérification |
|-------|-----------------|--------------|
| Node.js | 20+ | `node --version` |
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
```

#### Variables Backend (`apps/api/.env`)

```env
# Base de données
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/wsflows"

# Redis
REDIS_URL="redis://:password@localhost:6380"

# JWT
JWT_SECRET="votre-secret-jwt-securise"
JWT_EXPIRES_IN="7d"

# Encryption (pour les credentials)
ENCRYPTION_KEY="32-caracteres-hexadecimaux-securises"

# Port
PORT=4001
```

#### Variables Frontend (`apps/web/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:4001/api
NEXT_PUBLIC_WS_URL=ws://localhost:4001
```

### 4. Démarrer les Services Docker

Lancez PostgreSQL et Redis via Docker Compose :

```bash
docker compose -f docker/docker-compose.yml up -d
```

Vérifiez que les services sont actifs :

```bash
docker compose -f docker/docker-compose.yml ps
```

Vous devriez voir :
```
NAME                SERVICE     STATUS
wsflows-postgres    postgres    running
wsflows-redis       redis       running
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
```

### 7. Accéder à l'Application

- **Frontend**: http://localhost:4000
- **API**: http://localhost:4001
- **Swagger API Docs**: http://localhost:4001/docs
- **Prisma Studio**: `pnpm db:studio` puis http://localhost:5555

## Structure des Ports

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 4000 | Application Next.js |
| API | 4001 | Backend NestJS |
| PostgreSQL | 5434 | Base de données |
| Redis | 6380 | Cache et sessions |

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
docker compose -f docker/docker-compose.yml up -d    # Démarrer les services
docker compose -f docker/docker-compose.yml down     # Arrêter les services
docker compose -f docker/docker-compose.yml logs -f  # Voir les logs
docker compose -f docker/docker-compose.yml ps       # État des services
```

## Dépannage

### Erreur de connexion à PostgreSQL

```bash
# Vérifier que le conteneur est actif
docker compose -f docker/docker-compose.yml ps

# Recréer le conteneur
docker compose -f docker/docker-compose.yml down
docker compose -f docker/docker-compose.yml up -d postgres
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
lsof -i :4001

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
