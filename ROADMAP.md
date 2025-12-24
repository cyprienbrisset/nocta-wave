# WS-Flows Roadmap

Ce document décrit les améliorations prioritaires à apporter au projet pour garantir sa stabilité, sa scalabilité et sa sécurité en production.

---

## 1. Performance et Scalabilité de la Base de Données (Priorité Haute)

Le modèle de données actuel risque de saturer PostgreSQL très rapidement en production.

### 1.1 Externaliser les logs d'exécution

**Problème actuel :** La table `ExecutionLog` stocke les entrées/sorties (`inputData`, `outputData`) en format JSON directement dans la base relationnelle.

**Recommandation :**
- [ ] Déplacer les données volumineuses vers un stockage objet (S3, MinIO) ou une base dédiée aux logs (ClickHouse, ElasticSearch)
- [ ] PostgreSQL ne doit garder que les métadonnées légères (status, timestamps, références aux fichiers)
- [ ] Implémenter un système de rétention avec archivage automatique des vieux logs

### 1.2 Migrer le cache vers Redis

**Problème actuel :** La table `NodeResultCache` stocke les résultats de nœuds pour éviter de les recalculer.

**Recommandation :**
- [ ] Migrer ce cache vers Redis (déjà présent dans l'infrastructure)
- [ ] Utiliser les fonctionnalités TTL natives de Redis pour la gestion automatique de l'expiration
- [ ] Réduire ainsi la charge I/O sur la base principale

### 1.3 Optimiser la gestion du temps réel

**Problème actuel :** Les tables `WorkflowSession`, `GuestSession` et les coordonnées des curseurs (`cursorX`, `cursorY`) sont définies dans PostgreSQL.

**Recommandation :**
- [ ] Gérer l'état "éphémère" (mouvements de souris, présence) uniquement en mémoire via Redis et WebSockets
- [ ] Ne persister en base que les données durables (commentaires, sessions terminées pour audit)
- [ ] Supprimer les colonnes `cursorX`, `cursorY` du schéma PostgreSQL

---

## 2. Simplification de l'Infrastructure et Dépendances

L'architecture actuelle est très lourde pour un déploiement "self-hosted" ou local.

### 2.1 Réduire la dépendance forte à Trigger.dev

**Problème actuel :** Le choix de Trigger.dev v3 oblige à déployer une stack complexe (Postgres dédié, ElectricSQL, Coordinator, etc.) juste pour faire tourner le worker.

**Recommandation :**
- [ ] Créer une interface d'abstraction `WorkflowExecutor` pour l'exécution des workflows
- [ ] Implémenter un moteur d'exécution "Lite" basé sur BullMQ/Redis pour :
  - Le développement local
  - Les petites instances self-hosted
- [ ] Garder Trigger.dev comme option pour le mode Enterprise/Scale
- [ ] Documenter les deux modes d'exécution

### 2.2 Stabiliser les versions de dépendances

**Problème actuel :** Le frontend utilise des versions potentiellement instables de Next.js et React.

**Recommandation :**
- [ ] Auditer toutes les dépendances du projet
- [ ] Repasser sur des versions LTS stables (Next.js 14/15, React 18)
- [ ] Documenter les versions minimales requises
- [ ] Mettre en place Dependabot ou Renovate pour les mises à jour de sécurité

---

## 3. Sécurité et Confidentialité des Données

### 3.1 Masquage des secrets (Redaction)

**Problème actuel :** Les workflows manipulent souvent des clés API ou des mots de passe. Avec le stockage actuel des `inputData` en JSON brut, ces secrets sont lisibles en clair.

**Recommandation :**
- [ ] Implémenter un middleware de redaction qui détecte les valeurs sensibles
- [ ] Patterns à détecter : `password`, `secret`, `api_key`, `token`, `authorization`, etc.
- [ ] Remplacer automatiquement par `******` avant l'écriture en base
- [ ] Permettre la configuration de patterns personnalisés

### 3.2 Sécurisation des liens de collaboration

**Problème actuel :** Le système permet des accès "Guest" via `CollaborationLink`.

**Recommandation :**
- [ ] Vérifier côté Backend (NestJS) que les WebSockets contrôlent strictement les permissions (VIEW, EDIT) à chaque message reçu
- [ ] Un invité en lecture seule ne doit pas pouvoir envoyer d'événements de modification (`NODE_MOVED`, `NODE_DELETED`, etc.)
- [ ] Implémenter un rate limiting sur les endpoints publics
- [ ] Ajouter des logs d'audit pour les accès guests

---

## 4. Architecture Backend (NestJS)

### 4.1 Segmentation des services

**Problème actuel :** La structure actuelle suggère une monolithisation logique.

**Recommandation :**
- [ ] S'assurer que la logique métier (Business Logic) est dans les Services, pas dans les Controllers
- [ ] Séparer clairement le "Control Plane" du "Data Plane" :
  - **Control Plane** : Gestion des utilisateurs, CRUD workflows, configuration
  - **Data Plane** : Exécution, Ingestion de Webhooks, temps réel
- [ ] Éviter qu'une surcharge d'exécution ne ralentisse l'interface utilisateur
- [ ] Envisager des queues séparées pour les opérations critiques

### 4.2 Gestion des erreurs et observabilité

**Recommandation :**
- [ ] Implémenter un système centralisé de gestion des erreurs
- [ ] Ajouter des métriques Prometheus/OpenTelemetry
- [ ] Configurer des health checks détaillés (`/health/ready`, `/health/live`)
- [ ] Mettre en place un système de tracing distribué

---

## 5. Qualité du Code et Tests

### 5.1 Stratégie de tests E2E

**Problème actuel :** Avec une architecture distribuée (API + Worker + Trigger.dev + Redis + Postgres), les tests unitaires ne suffisent pas.

**Recommandation :**
- [ ] Renforcer les tests d'intégration qui lancent un workflow complet de bout en bout
- [ ] Valider la chaîne complète : API -> Queue -> Worker -> DB
- [ ] Automatiser ces tests dans la CI/CD
- [ ] Tester spécifiquement les scénarios de collaboration temps réel

### 5.2 Tests de charge

**Recommandation :**
- [ ] Mettre en place des tests de charge avec k6 ou Artillery
- [ ] Définir des seuils de performance acceptables
- [ ] Tester les limites du système de collaboration (nombre de curseurs simultanés, etc.)

### 5.3 Documentation du code

**Recommandation :**
- [ ] Documenter les interfaces publiques des services
- [ ] Générer une documentation API automatique (Swagger est déjà en place)
- [ ] Ajouter des exemples d'utilisation pour les développeurs contribuant au projet

---

## Priorités de développement

| Phase | Items | Criticité |
|-------|-------|-----------|
| **Phase 1** | 1.3 (Temps réel), 3.2 (Sécurité WebSocket) | 🔴 Critique |
| **Phase 2** | 1.1 (Logs), 3.1 (Redaction secrets) | 🟠 Haute |
| **Phase 3** | 1.2 (Cache Redis), 2.2 (Dépendances) | 🟡 Moyenne |
| **Phase 4** | 2.1 (Abstraction Worker), 4.1 (Segmentation) | 🟢 Planifiée |
| **Phase 5** | 5.x (Tests), 4.2 (Observabilité) | 🔵 Continue |

---

## Contribuer

Si vous souhaitez contribuer à l'une de ces améliorations, veuillez :
1. Ouvrir une issue pour discuter de l'approche
2. Créer une branche depuis `main`
3. Soumettre une PR avec les tests appropriés

Consultez [CLAUDE.md](./CLAUDE.md) pour les conventions de développement.
