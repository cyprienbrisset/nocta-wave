# Nocta Wave - Roadmap

Ce document décrit les améliorations et fonctionnalités planifiées pour Nocta Wave.

---

## Statut des Améliorations Techniques

### Complété

| Item | Description | Status |
|------|-------------|--------|
| **Stockage externe logs** | Logs volumineux externalisés vers S3/MinIO | ✅ Fait |
| **Cache Redis** | NodeResultCache migré vers Redis | ✅ Fait |
| **Données éphémères Redis** | Curseurs, viewports stockés uniquement en Redis | ✅ Fait |
| **Masquage des secrets** | RedactionService pour masquer les données sensibles | ✅ Fait |
| **Permissions WebSocket** | Vérification stricte VIEW/COMMENT/EDIT | ✅ Fait |
| **Segmentation Control/Data Plane** | Documentation et séparation logique | ✅ Fait |
| **Dépendances stables** | Next.js 15, React 18 LTS | ✅ Fait |
| **Tests E2E** | Infrastructure complète avec Docker | ✅ Fait |
| **Sécurité DLQ** | Vérification d'accès team sur toutes les opérations | ✅ Fait |

---

## Phase 1 : Fonctionnalités Core (Court terme)

### 1.1 Sub-workflows Réutilisables

**Objectif :** Permettre d'encapsuler des workflows comme des "fonctions" réutilisables.

- [ ] Créer un type de node `subworkflow.call`
- [ ] Interface pour mapper les inputs/outputs du sub-workflow
- [ ] Gestion de la récursion (limite de profondeur)
- [ ] Visualisation des sub-workflows imbriqués
- [ ] Versioning des sub-workflows (quelle version utiliser)

### 1.2 Variables et Environnements

**Objectif :** Supporter plusieurs environnements (dev, staging, prod) avec des variables différentes.

- [ ] Modèle `EnvironmentVariable` avec valeurs par environnement
- [ ] Interface de promotion entre environnements
- [ ] Secrets par environnement (credentials différents)
- [ ] Indicateur visuel de l'environnement actif dans l'éditeur
- [ ] Logs séparés par environnement

### 1.3 Mode Debug Avancé

**Objectif :** Améliorer le debugging des workflows.

- [ ] Points d'arrêt (breakpoints) sur les nodes
- [ ] Exécution pas-à-pas
- [ ] Inspection des données à chaque étape
- [ ] Modification des données en cours d'exécution (hot reload)
- [ ] Replay d'une exécution avec données modifiées

### 1.4 Versioning Git-like des Workflows

**Objectif :** Historique complet avec branches et merges.

- [ ] Branches de développement pour les workflows
- [ ] Diff visuel entre versions
- [ ] Merge de branches avec résolution de conflits
- [ ] Tags pour marquer les versions stables
- [ ] Rollback en un clic

---

## Phase 2 : Intégrations et Connecteurs (Moyen terme)

### 2.1 Nouveaux Nodes d'Intégration

**APIs populaires à intégrer :**

- [ ] **CRM** : Salesforce, HubSpot, Pipedrive
- [ ] **Project Management** : Jira, Linear, Asana, Monday
- [ ] **Communication** : Microsoft Teams, Telegram
- [ ] **E-commerce** : Shopify, WooCommerce, Magento
- [ ] **Marketing** : Mailchimp, ActiveCampaign, Brevo
- [ ] **Analytics** : Google Analytics, Mixpanel, Amplitude
- [ ] **AI/ML** : Anthropic Claude, Gemini, Replicate, Hugging Face
- [ ] **Storage** : Google Drive, Dropbox, OneDrive
- [ ] **Databases** : Supabase, Firebase, DynamoDB

### 2.2 OAuth 2.0 Avancé

**Objectif :** Gestion robuste des tokens OAuth.

- [ ] Refresh automatique des tokens expirés
- [ ] Support PKCE pour les flows publics
- [ ] Gestion multi-compte par intégration
- [ ] Interface de reconnexion en cas d'expiration
- [ ] Logs d'audit des accès OAuth

### 2.3 Webhooks Avancés

**Objectif :** Améliorer la robustesse des webhooks entrants.

- [ ] Validation de signature (HMAC, JWT)
- [ ] Retry avec backoff exponentiel pour webhooks sortants
- [ ] Queue de webhooks entrants pour absorber les pics
- [ ] Transformation des payloads à la réception
- [ ] Webhooks conditionnels (filtrage avant exécution)

---

## Phase 3 : Collaboration et UX (Moyen terme)

### 3.1 Templates Marketplace

**Objectif :** Bibliothèque de workflows prêts à l'emploi.

- [ ] Galerie de templates par catégorie
- [ ] Import en un clic avec personnalisation
- [ ] Partage de templates entre équipes
- [ ] Rating et commentaires sur les templates
- [ ] Templates officiels et communautaires

### 3.2 Collaboration Avancée

**Objectif :** Améliorer le travail en équipe.

- [ ] Mentions @utilisateur dans les commentaires
- [ ] Notifications en temps réel (in-app + email)
- [ ] Historique d'activité par workflow
- [ ] Mode "Suggestion" (proposer des changements sans modifier)
- [ ] Approbations de modifications (workflow review)

### 3.3 UX de l'Éditeur

**Objectif :** Rendre l'éditeur plus productif.

- [ ] Raccourcis clavier personnalisables
- [ ] Commande palette (Ctrl+K) pour actions rapides
- [ ] Recherche globale dans les workflows
- [ ] Favoris et workflows récents
- [ ] Mode sombre/clair avec thèmes personnalisés
- [ ] Zoom automatique sur le node sélectionné
- [ ] Snap-to-grid amélioré
- [ ] Groupes de nodes pliables

### 3.4 Mobile-friendly

**Objectif :** Permettre la consultation sur mobile.

- [ ] Vue read-only optimisée mobile
- [ ] Monitoring des exécutions sur mobile
- [ ] Notifications push
- [ ] Actions rapides (pause/resume workflow)

---

## Phase 4 : Performance et Scale (Long terme)

### 4.1 Exécution Distribuée

**Objectif :** Supporter des volumes importants.

- [ ] Workers horizontalement scalables
- [ ] Partitionnement des queues par priorité/type
- [ ] Affinité de workflow (même worker pour un workflow)
- [ ] Execution pooling pour les workflows fréquents
- [ ] Warm start des workers

### 4.2 Optimisations Base de Données

**Objectif :** Maintenir les performances à grande échelle.

- [ ] Partitionnement des tables `Execution` et `ExecutionLog` par date
- [ ] Archivage automatique vers stockage froid
- [ ] Index optimisés pour les requêtes courantes
- [ ] Read replicas pour les dashboards
- [ ] Connection pooling avec PgBouncer

### 4.3 Caching Intelligent

**Objectif :** Réduire les calculs redondants.

- [ ] Cache de résultats de nodes idempotents
- [ ] Invalidation intelligente du cache
- [ ] Cache distribué multi-instance
- [ ] Préchargement des workflows fréquents

### 4.4 Rate Limiting et Quotas

**Objectif :** Protéger le système et permettre la multi-tenancy.

- [ ] Quotas par équipe (exécutions/jour, nodes/workflow)
- [ ] Rate limiting par endpoint API
- [ ] Throttling des webhooks entrants
- [ ] Alertes de dépassement de quotas
- [ ] Dashboard d'utilisation

---

## Phase 5 : Observabilité et DevOps (Continue)

### 5.1 Monitoring et Métriques

**Objectif :** Visibilité complète sur le système.

- [ ] Export Prometheus des métriques
- [ ] Dashboards Grafana préconfigurés
- [ ] Métriques business (exécutions, durées, erreurs)
- [ ] Métriques infrastructure (CPU, mémoire, queues)
- [ ] Alerting configurable (Slack, email, webhook)

### 5.2 Tracing Distribué

**Objectif :** Comprendre les problèmes de performance.

- [ ] OpenTelemetry integration
- [ ] Trace ID propagé dans tout le système
- [ ] Visualisation des traces dans Jaeger/Zipkin
- [ ] Corrélation logs/traces/métriques

### 5.3 Logging Structuré

**Objectif :** Logs exploitables en production.

- [ ] Format JSON structuré
- [ ] Niveaux de log configurables par module
- [ ] Export vers ElasticSearch/Loki
- [ ] Recherche et filtrage avancé
- [ ] Rétention configurable

### 5.4 Health Checks Avancés

**Objectif :** Déploiements fiables.

- [ ] `/health/live` - Liveness probe
- [ ] `/health/ready` - Readiness probe
- [ ] `/health/startup` - Startup probe
- [ ] Vérification des dépendances (DB, Redis, S3)
- [ ] Graceful shutdown

---

## Phase 6 : Enterprise Features (Long terme)

### 6.1 Single Sign-On (SSO)

**Objectif :** Intégration avec les systèmes d'identité entreprise.

- [ ] SAML 2.0 support
- [ ] OIDC/OAuth enterprise providers
- [ ] SCIM provisioning automatique
- [ ] Directory sync (Azure AD, Okta, Google Workspace)
- [ ] MFA enforcement

### 6.2 Audit et Compliance

**Objectif :** Répondre aux exigences de conformité.

- [ ] Audit logs complets et immuables
- [ ] Export des logs pour SIEM
- [ ] Rapports de conformité automatisés
- [ ] Data retention policies
- [ ] GDPR : export et suppression des données utilisateur

### 6.3 Multi-région

**Objectif :** Déploiement géographiquement distribué.

- [ ] Données localisées par région
- [ ] Exécution dans la région du workflow
- [ ] Failover automatique entre régions
- [ ] Latence optimisée

### 6.4 API GraphQL

**Objectif :** Alternative moderne à REST.

- [ ] Schema GraphQL complet
- [ ] Subscriptions pour le temps réel
- [ ] Playground intégré
- [ ] Documentation auto-générée

---

## Phase 7 : Écosystème et Extensions (Vision)

### 7.1 Plugin System

**Objectif :** Permettre l'extension par des tiers.

- [ ] SDK pour créer des nodes custom
- [ ] Marketplace de plugins
- [ ] Sandboxing sécurisé des plugins
- [ ] Versioning des plugins
- [ ] Auto-update des plugins

### 7.2 API Publique

**Objectif :** Permettre l'intégration programmatique.

- [ ] API REST documentée et versionnée
- [ ] SDK clients (TypeScript, Python, Go)
- [ ] Webhooks sortants configurables
- [ ] Rate limiting et quotas API
- [ ] API keys avec scopes

### 7.3 CLI Tool

**Objectif :** Gestion en ligne de commande.

- [ ] `nocta-wave deploy` - Déployer un workflow
- [ ] `nocta-wave run` - Exécuter manuellement
- [ ] `nocta-wave logs` - Voir les logs en temps réel
- [ ] `nocta-wave export/import` - Backup/restore
- [ ] Intégration CI/CD

### 7.4 Testing Framework

**Objectif :** Tests automatisés des workflows.

- [ ] Mode test avec mocks
- [ ] Assertions sur les outputs
- [ ] Tests de régression automatiques
- [ ] Coverage des branches conditionnelles
- [ ] Intégration avec CI/CD

---

## Idées Futures (Backlog)

### Intelligence Artificielle
- [ ] Génération de workflows par description en langage naturel
- [ ] Suggestions de nodes basées sur le contexte
- [ ] Détection d'anomalies dans les exécutions
- [ ] Auto-correction des erreurs courantes
- [ ] Chatbot assistant intégré

### Low-Code/No-Code Avancé
- [ ] Formulaires dynamiques pour les inputs
- [ ] Dashboards personnalisables
- [ ] Rapports automatisés
- [ ] Intégration avec des apps no-code (Retool, Appsmith)

### Scheduling Avancé
- [ ] Calendrier visuel des exécutions planifiées
- [ ] Dépendances entre workflows
- [ ] Fenêtres de maintenance
- [ ] Timezone-aware scheduling

### Sécurité Avancée
- [ ] Secrets manager intégré (Vault-like)
- [ ] Rotation automatique des credentials
- [ ] IP whitelisting par workflow
- [ ] Encryption at rest configurable

### Performance
- [ ] Compilation JIT des workflows fréquents
- [ ] Edge execution (workers proches des sources)
- [ ] Streaming de données volumineuses
- [ ] Compression des payloads

---

## Priorités de Développement

| Phase | Focus | Horizon |
|-------|-------|---------|
| **Phase 1** | Sub-workflows, Environnements, Debug | Q1 2025 |
| **Phase 2** | Intégrations, OAuth, Webhooks | Q2 2025 |
| **Phase 3** | Templates, Collaboration, UX | Q2-Q3 2025 |
| **Phase 4** | Scale, Performance | Q3 2025 |
| **Phase 5** | Observabilité | Continue |
| **Phase 6** | Enterprise | Q4 2025+ |
| **Phase 7** | Écosystème | 2026+ |

---

## Contribuer

Vous souhaitez contribuer à l'une de ces fonctionnalités ?

1. **Discuter** : Ouvrez une issue pour discuter de l'approche
2. **Proposer** : Créez une RFC (Request For Comments) pour les changements majeurs
3. **Développer** : Créez une branche depuis `main`
4. **Tester** : Incluez des tests E2E pour les nouvelles fonctionnalités
5. **Documenter** : Mettez à jour la documentation

Consultez [CLAUDE.md](./CLAUDE.md) pour les conventions de développement.

---

## Changelog des Décisions

| Date | Décision | Raison |
|------|----------|--------|
| 2024-12 | Suppression Trigger.dev | Simplification self-hosted |
| 2024-12 | Ajout stockage S3/MinIO | Scalabilité logs |
| 2024-12 | Redis pour données éphémères | Performance temps réel |
| 2024-12 | Architecture Control/Data Plane | Scalabilité |
| 2024-12 | Tests E2E avec Docker | Qualité du code |
