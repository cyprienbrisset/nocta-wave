# Nocta Wave - Roadmap & Analyse

Ce document contient l'analyse complète du projet, les corrections à apporter, et les fonctionnalités planifiées.

---

## État d'Avancement Global

| Phase | Description | Progression |
|-------|-------------|-------------|
| **Phase 1** | Fonctionnalités Core | ✅ 100% |
| **Phase 2** | Intégrations | ✅ 90% |
| **Phase 3** | Collaboration et UX | ✅ 95% |
| **Phase 4** | Performance et Scale | ✅ 100% |
| **Phase 5** | Observabilité | ✅ 95% |
| **Phase 6** | Enterprise | 🔄 60% |

---

## Corrections Critiques (Priorité Immédiate)

### 1. Vulnérabilité RCE - Évaluation d'Expressions

**Fichier** : `apps/api/src/worker/workflow-worker.service.ts`

**Problème** : Utilisation de `new Function()` pour évaluer des expressions utilisateur, permettant l'injection de code arbitraire.

```typescript
// DANGEREUX - permet l'exécution de code arbitraire
const fn = new Function(...Object.keys(context), `return ${expr}`);
```

**Solution** :
- [ ] Remplacer par une bibliothèque sécurisée (`expr-eval`, `jexl`, ou VM sandboxée)
- [ ] Ajouter une validation des expressions avant exécution
- [ ] Limiter les fonctions/objets accessibles dans le contexte

---

### 2. Misconfiguration CORS avec Credentials

**Fichiers** :
- `apps/api/src/main.ts`
- `apps/api/src/modules/execution/execution.gateway.ts`
- `apps/api/src/modules/collaboration/realtime/realtime.gateway.ts`
- `apps/api/src/modules/monitoring/monitoring.gateway.ts`

**Problème** : `origin: '*'` combiné avec `credentials: true` viole la sécurité CORS.

**Solution** :
- [ ] Configurer une liste d'origines autorisées via variable d'environnement
- [ ] Supprimer `credentials: true` si wildcard nécessaire
- [ ] Ajouter validation côté serveur des origines

---

### 3. Vérification de Signature Webhook Optionnelle

**Fichier** : `apps/api/src/modules/webhook/webhook.service.ts`

**Problème** : La vérification de signature est ignorée si le header `x-webhook-signature` est absent.

**Solution** :
- [ ] Rendre la vérification obligatoire quand un secret existe
- [ ] Retourner 401 si le header est manquant
- [ ] Ajouter rate limiting sur les endpoints webhook

---

## Corrections Haute Priorité

### 4. Typage TypeScript Faible

**Problème** : 50+ utilisations de `as any` à travers le codebase.

**Solution** :
- [ ] Créer des interfaces TypeScript pour `WorkflowGraph`, `WorkflowSettings`
- [ ] Remplacer tous les `as any` par des types appropriés
- [ ] Activer `strict: true` dans tsconfig.json

---

### 5. Validation des Entrées Manquante

**Fichier** : `apps/api/src/modules/execution/execution.service.ts`

**Problème** : La méthode `trigger()` ne valide pas `inputData` avant mise en queue.

**Solution** :
- [ ] Ajouter validation Zod pour les données d'entrée
- [ ] Limiter la taille maximale des payloads
- [ ] Valider la structure du graphe avant exécution

---

### 6. Gestion d'Erreur Silencieuse

**Fichier** : `apps/api/src/modules/workflow/workflow.service.ts`

**Problème** : L'échec de création de branche est loggé mais ignoré.

**Solution** :
- [ ] Faire échouer la création de workflow si la branche échoue
- [ ] Ou implémenter un mécanisme de retry

---

## Corrections Priorité Moyenne

### 7. Logging Console en Production

**Problème** : Utilisation de `console.log/error` au lieu du Logger NestJS.

**Solution** :
- [ ] Remplacer tous les `console.*` par `this.logger.*`
- [ ] Configurer des niveaux de log par environnement

---

### 8. Problème de Performance N+1

**Fichier** : `apps/api/src/modules/collaboration/realtime/realtime.service.ts`

**Problème** : `getWorkflowCursors()` fait une requête par collaborateur.

**Solution** :
- [ ] Utiliser `mget()` pour récupérer tous les curseurs en une seule opération
- [ ] Implémenter un cache local pour les données fréquemment accédées

---

### 9. Commande Redis KEYS en Production

**Fichier** : `apps/api/src/modules/collaboration/realtime/realtime.service.ts`

**Problème** : `keys()` bloque Redis pour les grands ensembles de clés.

**Solution** :
- [ ] Remplacer par `SCAN` avec curseur
- [ ] Ou maintenir un index des clés actives

---

### 10. Validation de Clé de Chiffrement

**Fichier** : `apps/api/src/modules/credential/encryption.service.ts`

**Problème** : Pas de validation de la longueur/format de la clé.

**Solution** :
- [ ] Valider que la clé fait exactement 32 bytes (256-bit)
- [ ] Vérifier le format hexadécimal

---

## Améliorations de Sécurité

### 11. Rate Limiting

**Problème** : Pas de limitation de débit sur les endpoints critiques.

**Solution** :
- [ ] Implémenter `@nestjs/throttler` sur :
  - Endpoints d'authentification
  - Triggers webhook
  - API d'exécution
  - Messages WebSocket

---

### 12. Protection CSRF

**Problème** : Pas de tokens CSRF sur les opérations modifiantes.

**Solution** :
- [ ] Ajouter protection CSRF avec `csurf` ou similaire
- [ ] Configurer les headers Content Security Policy

---

### 13. Validation de Mot de Passe Faible

**Fichier** : `apps/api/src/modules/auth/dto/auth.dto.ts`

**Problème** : Le pattern regex permet des mots de passe faibles.

**Solution** :
- [ ] Utiliser une bibliothèque d'évaluation de force (`zxcvbn`)
- [ ] Exiger une entropie minimale

---

## Nouvelles Fonctionnalités

### Phase 1 : Fonctionnalités Core ✅ COMPLÉTÉE

#### 1.1 Sub-workflows Réutilisables ✅
- [x] Node `subworkflow.call` pour encapsuler des workflows
- [x] Interface de mapping inputs/outputs
- [x] Gestion de la récursion (limite de profondeur : 10)
- [x] Détection de cycles via call stack
- [x] Versioning des sub-workflows

#### 1.2 Variables et Environnements ✅
- [x] Modèle `EnvironmentVariable` avec valeurs par environnement
- [x] Interface de promotion entre environnements (dev/staging/prod)
- [x] Secrets par environnement avec chiffrement
- [x] Variables globales vs spécifiques
- [x] Types de variables (string, number, boolean, json, secret)

#### 1.3 Mode Debug Avancé ✅
- [x] Points d'arrêt (breakpoints) sur les nodes
- [x] Exécution pas-à-pas (step-over, step-into, step-out)
- [x] Inspection des données à chaque étape
- [x] Breakpoints conditionnels avec expressions
- [x] WebSocket gateway pour contrôle temps réel

#### 1.4 Versioning Git-like ✅
- [x] Branches de développement pour les workflows
- [x] Commits avec snapshots du graphe
- [x] Pull Requests avec reviews
- [x] Merge strategies (squash, rebase, merge)
- [x] Tags pour marquer les versions stables
- [x] Résolution de conflits

---

### Phase 2 : Intégrations ✅ 90% COMPLÉTÉE

#### 2.1 Nouveaux Nodes ✅ (69+ types implémentés)

**CRM** :
- [x] Salesforce
- [x] HubSpot
- [x] Pipedrive
- [x] Zoho CRM

**Project Management** :
- [x] Jira
- [x] Linear
- [x] Asana
- [x] Monday.com

**Communication** :
- [x] Slack
- [x] Discord
- [x] Microsoft Teams
- [x] Telegram
- [x] Twilio (SMS)

**E-commerce** :
- [x] Shopify
- [x] WooCommerce
- [x] BigCommerce
- [x] Magento

**AI/ML** :
- [x] Anthropic Claude
- [x] OpenAI (GPT)
- [x] Google AI (Gemini)
- [x] Replicate
- [x] Hugging Face

**Bases de données** :
- [x] PostgreSQL, MySQL, SQLite
- [x] MongoDB, Firebase, DynamoDB
- [x] Elasticsearch, Redis, ClickHouse

**Cloud** :
- [x] AWS (Lambda, S3, SQS)
- [x] Azure (Blob, Functions)
- [x] Google Cloud (Functions, Pub/Sub, Sheets)

**Autres** :
- [x] GitHub, GitLab
- [x] Stripe, PayPal
- [x] Airtable, Notion
- [x] Datadog, PagerDuty
- [x] SendGrid, Mailchimp

#### 2.2 OAuth 2.0 Avancé 🔄 60%
- [x] Gestion des credentials chiffrés (AES-256)
- [x] Support multi-types de credentials
- [x] Test de credentials
- [ ] Refresh automatique des tokens expirés
- [ ] Support PKCE
- [ ] Gestion multi-compte par intégration
- [ ] Logs d'audit des accès OAuth

#### 2.3 Webhooks ✅
- [x] Validation de signature (HMAC-SHA256)
- [x] Génération et rotation de secrets
- [x] Restrictions de méthodes HTTP
- [x] Activation/désactivation
- [ ] Retry avec backoff exponentiel (implémenté côté worker)

---

### Phase 3 : Collaboration et UX ✅ 85% COMPLÉTÉE

#### 3.1 Templates Marketplace ✅
- [x] Galerie de templates par catégorie
- [x] Import avec paramètres personnalisables
- [x] Partage de templates entre équipes
- [x] Système de rating (1-5 étoiles)
- [x] Rapports utile/inutile

#### 3.2 Collaboration Avancée ✅
- [x] Curseurs partagés temps réel (Redis)
- [x] Chat intégré avec @mentions
- [x] Commentaires sur workflows avec @mentions
- [x] Liens de partage (VIEW/COMMENT/EDIT)
- [x] Historique des changements par workflow
- [x] Mode "Suggestion" (proposer sans modifier)
- [x] Reviews et approbations de suggestions
- [x] Système de notifications (in-app)

#### 3.3 UX de l'Éditeur ✅ 95%
- [x] Recherche globale dans les workflows
- [x] Favoris et workflows récents
- [x] Préférences utilisateur (thème, notifications)
- [x] Groupes de nodes (pliables, colorisables)
- [x] Raccourcis clavier personnalisables (29 raccourcis, UI de configuration)
- [x] Command palette (Ctrl+K)
- [x] Mode sombre/clair avec sélecteur de thème

---

### Phase 4 : Performance et Scale ✅ COMPLÉTÉE

#### 4.1 Exécution Distribuée ✅
- [x] Workers horizontalement scalables (WorkerPoolService)
- [x] Partitionnement des queues par priorité (DistributedQueueService)
- [x] Affinité de workflow
- [x] Warm start des workers
- [x] Dead Letter Queue (DLQ)

#### 4.2 Optimisations Base de Données ✅
- [x] Partitionnement des tables par date (PartitionService)
- [x] Archivage automatique vers stockage froid (ArchiveService)
- [x] Read replicas pour les dashboards (ReadReplicaService)
- [x] Connection pooling avec PgBouncer (ConnectionPoolService)

#### 4.3 Caching Intelligent ✅
- [x] Cache de résultats de nodes idempotents (IntelligentCacheService)
- [x] Invalidation intelligente par type de changement
- [x] Cache distribué multi-instance (DistributedCacheService)
- [x] Cache L1 (local) + L2 (Redis)
- [x] Synchronisation via Redis pub/sub

---

### Phase 5 : Observabilité ✅ 95% COMPLÉTÉE

#### 5.1 Monitoring et Métriques ✅
- [x] Métriques temps réel (exécutions, latence, succès)
- [x] Logs structurés avec niveaux multiples
- [x] Trace spans pour tracing distribué
- [x] Dashboard de métriques agrégées
- [x] WebSocket pour métriques temps réel (monitoring-socket.ts)
- [x] Logs en temps réel via WebSocket
- [x] Alertes en temps réel via WebSocket
- [ ] Export Prometheus des métriques
- [ ] Dashboards Grafana préconfigurés

#### 5.2 Alerting ✅
- [x] Règles d'alerte configurables
- [x] Canaux d'alerte (Slack, email, webhook)
- [x] Historique des alertes
- [x] Niveaux de sévérité
- [x] Seuils configurables

#### 5.3 Health Checks 🔄 30%
- [x] Endpoint `/health` basique
- [ ] `/health/live` - Liveness probe
- [ ] `/health/ready` - Readiness probe
- [ ] `/health/startup` - Startup probe
- [ ] Vérification des dépendances (DB, Redis, etc.)
- [ ] Graceful shutdown

---

### Phase 6 : Enterprise 🔄 60% COMPLÉTÉE

#### 6.1 Single Sign-On (SSO) ❌
- [ ] SAML 2.0 support
- [ ] OIDC/OAuth enterprise providers
- [ ] SCIM provisioning automatique
- [ ] Directory sync (Azure AD, Okta)
- [ ] MFA enforcement

#### 6.2 Audit et Compliance ✅
- [x] Audit logs complets et immuables
- [x] Actions tracées (CREDENTIAL_*, WORKFLOW_*)
- [x] Filtrage par ressource, action, utilisateur
- [x] Politique de rétention (90 jours par défaut)
- [x] Isolation par équipe
- [ ] Export des logs pour SIEM
- [ ] Rapports de conformité automatisés
- [ ] GDPR : export et suppression des données

#### 6.3 Sécurité Avancée 🔄
- [x] Redaction des données sensibles dans les logs
- [x] Chiffrement AES-256 des credentials
- [x] Isolation RBAC par équipe/projet
- [ ] Multi-région avec données localisées
- [ ] Failover automatique

---

## Résumé des Priorités

| Priorité | Nombre | Description |
|----------|--------|-------------|
| **CRITIQUE** | 3 | RCE, CORS, Webhook auth |
| **HAUTE** | 3 | Typage, Validation, Gestion d'erreur |
| **MOYENNE** | 6 | Logging, Performance, Sécurité |
| **BASSE** | ~15 | Fonctionnalités manquantes (SSO, health checks avancés) |

---

## Actions Immédiates Recommandées

1. **Corriger la vulnérabilité RCE** - Remplacer `Function()` par un évaluateur sécurisé
2. **Corriger la configuration CORS** - Supprimer `credentials: true` avec `origin: '*'`
3. **Ajouter rate limiting** - Protéger les endpoints critiques
4. **Remplacer `as any`** - Améliorer la sécurité de type
5. **Implémenter health checks avancés** - Liveness/Readiness probes
6. **Ajouter OAuth refresh automatique** - Gestion des tokens expirés

---

## Changelog des Décisions

| Date | Décision | Raison |
|------|----------|--------|
| 2024-12 | Suppression Trigger.dev | Simplification self-hosted |
| 2024-12 | Ajout stockage S3/MinIO | Scalabilité logs |
| 2024-12 | Redis pour données éphémères | Performance temps réel |
| 2024-12 | Architecture Control/Data Plane | Scalabilité |
| 2024-12 | Tests E2E avec Docker | Qualité du code |
| 2024-12 | Phase 4 complétée | Queue distribuée, cache intelligent, DB optimization |
| 2024-12 | 69+ nodes d'intégration | Couverture étendue des services |
| 2024-12 | Monitoring temps réel | WebSocket pour métriques, logs et alertes live |
| 2024-12 | UX Éditeur finalisée | Command palette, raccourcis personnalisables, thèmes |
