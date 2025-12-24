# Nocta Wave - Roadmap & Analyse

Ce document contient l'analyse complète du projet, les corrections à apporter, et les fonctionnalités planifiées.

---

## Corrections Critiques (Priorité Immédiate)

### 1. Vulnérabilité RCE - Évaluation d'Expressions

**Fichier** : `apps/api/src/worker/workflow-worker.service.ts` (Lignes 1321, 1330)

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
- `apps/api/src/main.ts` (Ligne 12)
- `apps/api/src/modules/execution/execution.gateway.ts` (Lignes 15-16)
- `apps/api/src/modules/collaboration/realtime/realtime.gateway.ts` (Lignes 42-43)
- `apps/api/src/modules/monitoring/monitoring.gateway.ts` (Ligne 17)

**Problème** : `origin: '*'` combiné avec `credentials: true` viole la sécurité CORS.

**Solution** :
- [ ] Configurer une liste d'origines autorisées via variable d'environnement
- [ ] Supprimer `credentials: true` si wildcard nécessaire
- [ ] Ajouter validation côté serveur des origines

---

### 3. Vérification de Signature Webhook Optionnelle

**Fichier** : `apps/api/src/modules/webhook/webhook.service.ts` (Lignes 188-198)

**Problème** : La vérification de signature est ignorée si le header `x-webhook-signature` est absent.

**Solution** :
- [ ] Rendre la vérification obligatoire quand un secret existe
- [ ] Retourner 401 si le header est manquant
- [ ] Ajouter rate limiting sur les endpoints webhook

---

## Corrections Haute Priorité

### 4. Typage TypeScript Faible

**Problème** : 50+ utilisations de `as any` à travers le codebase.

**Fichiers principaux** :
- `apps/api/src/modules/workflow/workflow.service.ts`
- `apps/api/src/worker/workflow-worker.service.ts`
- `apps/api/src/modules/monitoring/monitoring.service.ts`
- `apps/api/src/modules/subworkflow/subworkflow.service.ts`

**Solution** :
- [ ] Créer des interfaces TypeScript pour `WorkflowGraph`, `WorkflowSettings`
- [ ] Remplacer tous les `as any` par des types appropriés
- [ ] Activer `strict: true` dans tsconfig.json

---

### 5. Validation des Entrées Manquante

**Fichier** : `apps/api/src/modules/execution/execution.service.ts` (Lignes 27-68)

**Problème** : La méthode `trigger()` ne valide pas `inputData` avant mise en queue.

**Solution** :
- [ ] Ajouter validation Zod pour les données d'entrée
- [ ] Limiter la taille maximale des payloads
- [ ] Valider la structure du graphe avant exécution

---

### 6. Gestion d'Erreur Silencieuse

**Fichier** : `apps/api/src/modules/workflow/workflow.service.ts` (Lignes 49-59)

**Problème** : L'échec de création de branche est loggé mais ignoré.

```typescript
try {
  await this.branchService.createMainBranch(...);
} catch (error) {
  console.error('Failed to create main branch:', error); // Échec silencieux!
}
```

**Solution** :
- [ ] Faire échouer la création de workflow si la branche échoue
- [ ] Ou implémenter un mécanisme de retry

---

## Corrections Priorité Moyenne

### 7. Logging Console en Production

**Problème** : Utilisation de `console.log/error` au lieu du Logger NestJS.

**Fichiers** :
- `apps/api/src/main.ts`
- `apps/api/src/database/redis.service.ts`
- `apps/api/src/modules/execution/execution.gateway.ts`
- `apps/api/src/modules/workflow/workflow.service.ts`

**Solution** :
- [ ] Remplacer tous les `console.*` par `this.logger.*`
- [ ] Configurer des niveaux de log par environnement

---

### 8. Problème de Performance N+1

**Fichier** : `apps/api/src/modules/collaboration/realtime/realtime.service.ts` (Lignes 391-403)

**Problème** : `getWorkflowCursors()` fait une requête par collaborateur.

**Solution** :
- [ ] Utiliser `mget()` pour récupérer tous les curseurs en une seule opération
- [ ] Implémenter un cache local pour les données fréquemment accédées

---

### 9. Commande Redis KEYS en Production

**Fichier** : `apps/api/src/modules/collaboration/realtime/realtime.service.ts` (Ligne 301)

**Problème** : `keys()` bloque Redis pour les grands ensembles de clés.

**Solution** :
- [ ] Remplacer par `SCAN` avec curseur
- [ ] Ou maintenir un index des clés actives

---

### 10. Validation de Clé de Chiffrement

**Fichier** : `apps/api/src/modules/credential/encryption.service.ts` (Lignes 14-18)

**Problème** : Pas de validation de la longueur/format de la clé.

**Solution** :
- [ ] Valider que la clé fait exactement 32 bytes (256-bit)
- [ ] Vérifier le format hexadécimal

---

### 11. Audit Logging Manquant

**Problème** : Pas de logs d'audit pour les opérations sensibles.

**Opérations à tracer** :
- [ ] Création/suppression de credentials
- [ ] Changements de rôles dans les équipes
- [ ] Activation/désactivation de workflows
- [ ] Création/régénération de secrets webhook

---

## Améliorations de Sécurité

### 12. Rate Limiting

**Problème** : Pas de limitation de débit sur les endpoints critiques.

**Solution** :
- [ ] Implémenter `@nestjs/throttler` sur :
  - Endpoints d'authentification
  - Triggers webhook
  - API d'exécution
  - Messages WebSocket

---

### 13. Protection CSRF

**Problème** : Pas de tokens CSRF sur les opérations modifiantes.

**Solution** :
- [ ] Ajouter protection CSRF avec `csurf` ou similaire
- [ ] Configurer les headers Content Security Policy

---

### 14. Validation de Mot de Passe Faible

**Fichier** : `apps/api/src/modules/auth/dto/auth.dto.ts` (Ligne 20)

**Problème** : Le pattern regex permet des mots de passe faibles.

**Solution** :
- [ ] Utiliser une bibliothèque d'évaluation de force (`zxcvbn`)
- [ ] Exiger une entropie minimale

---

## Améliorations de Performance

### 15. Pagination Cursor-Based

**Fichiers** :
- `apps/api/src/modules/workflow/workflow.service.ts`
- `apps/api/src/modules/execution/execution.service.ts`

**Problème** : `skip` + `take` avec `count()` = 2 scans de table complets.

**Solution** :
- [ ] Implémenter une pagination basée sur curseur
- [ ] Utiliser `id` comme curseur pour les listes

---

### 16. Index Base de Données Manquants

**Indexes à ajouter** :
- [ ] `execution(workflowId, status)` - composite
- [ ] `execution(createdAt)` - pour les requêtes temporelles
- [ ] `workflow(teamId, isActive)` - composite
- [ ] `structuredLog(timestamp)` - pour les requêtes de monitoring

---

### 17. Circuit Breaker pour Services Externes

**Problème** : Pas de protection contre les cascades d'échecs.

**Solution** :
- [ ] Implémenter circuit breaker pour tous les appels API externes
- [ ] Étendre le circuit breaker existant dans WorkflowWorkerService

---

## Nouvelles Fonctionnalités

### Phase 1 : Fonctionnalités Core

#### 1.1 Sub-workflows Réutilisables
- [ ] Node `subworkflow.call` pour encapsuler des workflows
- [ ] Interface de mapping inputs/outputs
- [ ] Gestion de la récursion (limite de profondeur)
- [ ] Visualisation des sub-workflows imbriqués
- [ ] Versioning des sub-workflows

#### 1.2 Variables et Environnements
- [ ] Modèle `EnvironmentVariable` avec valeurs par environnement
- [ ] Interface de promotion entre environnements
- [ ] Secrets par environnement
- [ ] Indicateur visuel de l'environnement actif
- [ ] Logs séparés par environnement

#### 1.3 Mode Debug Avancé
- [ ] Points d'arrêt (breakpoints) sur les nodes
- [ ] Exécution pas-à-pas
- [ ] Inspection des données à chaque étape
- [ ] Modification des données en cours d'exécution
- [ ] Replay d'une exécution avec données modifiées

#### 1.4 Versioning Git-like
- [ ] Branches de développement pour les workflows
- [ ] Diff visuel entre versions
- [ ] Merge de branches avec résolution de conflits
- [ ] Tags pour marquer les versions stables
- [ ] Rollback en un clic

---

### Phase 2 : Intégrations

#### 2.1 Nouveaux Nodes
**CRM** :
- [ ] Salesforce
- [ ] HubSpot
- [ ] Pipedrive

**Project Management** :
- [ ] Jira
- [ ] Linear
- [ ] Asana

**Communication** :
- [ ] Microsoft Teams
- [ ] Telegram

**E-commerce** :
- [ ] Shopify
- [ ] WooCommerce

**AI/ML** :
- [ ] Anthropic Claude
- [ ] Gemini
- [ ] Replicate

#### 2.2 OAuth 2.0 Avancé
- [ ] Refresh automatique des tokens expirés
- [ ] Support PKCE
- [ ] Gestion multi-compte par intégration
- [ ] Logs d'audit des accès OAuth

#### 2.3 Webhooks Avancés
- [ ] Validation de signature (HMAC, JWT)
- [ ] Retry avec backoff exponentiel
- [ ] Queue de webhooks entrants
- [ ] Transformation des payloads à la réception

---

### Phase 3 : Collaboration et UX

#### 3.1 Templates Marketplace
- [ ] Galerie de templates par catégorie
- [ ] Import en un clic avec personnalisation
- [ ] Partage de templates entre équipes
- [ ] Rating et commentaires

#### 3.2 Collaboration Avancée
- [ ] Mentions @utilisateur dans les commentaires
- [ ] Notifications en temps réel (in-app + email)
- [ ] Historique d'activité par workflow
- [ ] Mode "Suggestion" (proposer sans modifier)
- [ ] Approbations de modifications

#### 3.3 UX de l'Éditeur
- [ ] Raccourcis clavier personnalisables
- [ ] Commande palette (Ctrl+K)
- [ ] Recherche globale dans les workflows
- [ ] Favoris et workflows récents
- [ ] Mode sombre/clair avec thèmes
- [ ] Groupes de nodes pliables

---

### Phase 4 : Performance et Scale

#### 4.1 Exécution Distribuée
- [ ] Workers horizontalement scalables
- [ ] Partitionnement des queues par priorité
- [ ] Affinité de workflow
- [ ] Warm start des workers

#### 4.2 Optimisations Base de Données
- [ ] Partitionnement des tables par date
- [ ] Archivage automatique vers stockage froid
- [ ] Read replicas pour les dashboards
- [ ] Connection pooling avec PgBouncer

#### 4.3 Caching Intelligent
- [ ] Cache de résultats de nodes idempotents
- [ ] Invalidation intelligente
- [ ] Cache distribué multi-instance

---

### Phase 5 : Observabilité

#### 5.1 Monitoring et Métriques
- [ ] Export Prometheus des métriques
- [ ] Dashboards Grafana préconfigurés
- [ ] Métriques business et infrastructure
- [ ] Alerting configurable (Slack, email, webhook)

#### 5.2 Tracing Distribué
- [ ] OpenTelemetry integration
- [ ] Trace ID propagé dans tout le système
- [ ] Visualisation des traces

#### 5.3 Health Checks Avancés
- [ ] `/health/live` - Liveness probe
- [ ] `/health/ready` - Readiness probe
- [ ] `/health/startup` - Startup probe
- [ ] Vérification des dépendances
- [ ] Graceful shutdown

---

### Phase 6 : Enterprise

#### 6.1 Single Sign-On (SSO)
- [ ] SAML 2.0 support
- [ ] OIDC/OAuth enterprise providers
- [ ] SCIM provisioning automatique
- [ ] Directory sync (Azure AD, Okta)
- [ ] MFA enforcement

#### 6.2 Audit et Compliance
- [ ] Audit logs complets et immuables
- [ ] Export des logs pour SIEM
- [ ] Rapports de conformité automatisés
- [ ] Data retention policies
- [ ] GDPR : export et suppression des données

#### 6.3 Multi-région
- [ ] Données localisées par région
- [ ] Exécution dans la région du workflow
- [ ] Failover automatique

---

## Résumé des Priorités

| Priorité | Nombre | Description |
|----------|--------|-------------|
| **CRITIQUE** | 3 | RCE, CORS, Webhook auth |
| **HAUTE** | 3 | Typage, Validation, Gestion d'erreur |
| **MOYENNE** | 8 | Logging, Performance, Sécurité |
| **BASSE** | 10+ | Fonctionnalités manquantes |

---

## Actions Immédiates Recommandées

1. **Corriger la vulnérabilité RCE** - Remplacer `Function()` par un évaluateur sécurisé
2. **Corriger la configuration CORS** - Supprimer `credentials: true` avec `origin: '*'`
3. **Ajouter rate limiting** - Protéger les endpoints critiques
4. **Remplacer `as any`** - Améliorer la sécurité de type
5. **Ajouter des tests** - Augmenter la couverture des chemins critiques
6. **Implémenter l'audit logging** - Tracer les opérations sensibles

---

## Changelog des Décisions

| Date | Décision | Raison |
|------|----------|--------|
| 2024-12 | Suppression Trigger.dev | Simplification self-hosted |
| 2024-12 | Ajout stockage S3/MinIO | Scalabilité logs |
| 2024-12 | Redis pour données éphémères | Performance temps réel |
| 2024-12 | Architecture Control/Data Plane | Scalabilité |
| 2024-12 | Tests E2E avec Docker | Qualité du code |
