# WS-Flows Roadmap

## Vue d'ensemble

Ce document présente les nodes à ajouter, les améliorations planifiées et les nouvelles fonctionnalités pour WS-Flows.

---

## État actuel

### Nodes existants (40 nodes)

| Catégorie | Nodes | Count |
|-----------|-------|-------|
| **Triggers** | Manual, Cron, Webhook, HTTP Poll | 4 |
| **HTTP** | Request, Response | 2 |
| **Transform** | Set, Map, Filter, Merge, Split, Aggregate, Sort, Code | 8 |
| **Logic** | Condition, Switch, Loop, Wait, Stop | 5 |
| **Database** | PostgreSQL, MySQL, MongoDB, Redis | 4 |
| **Integrations** | Slack, Discord, GitHub, Gmail, Google Sheets, Notion, Airtable, Stripe, Twilio, SendGrid, AWS S3, OpenAI, RSS, Webflow | 14 |
| **Utility** | Delay, Crypto, DateTime, HTML Parse, Log, Debug, JSON Parse, Error | 8 |


## Améliorations du système existant

### Infrastructure des Nodes

#### 1. Système de credentials amélioré
- [ ] Support OAuth 2.0 avec refresh automatique
- [ ] Vault integration (HashiCorp Vault, AWS Secrets Manager)
- [ ] Rotation automatique des credentials
- [ ] Audit log des accès aux credentials

#### 2. Gestion des erreurs avancée
- [ ] Circuit breaker pattern
- [ ] Retry automatique configurable par node
- [ ] Dead letter queue pour les exécutions échouées
- [ ] Alerting sur échecs (email, Slack, webhook)

#### 3. Performance
- [ ] Caching des résultats de nodes
- [ ] Parallel execution de branches indépendantes
- [ ] Streaming pour les gros volumes de données
- [ ] Connection pooling pour les bases de données

### UI/UX Workflow Editor

### API & Backend

#### 1. Exécution
- [ ] Webhooks de callback sur fin d'exécution
- [ ] Priority queues pour les workflows
- [ ] Scheduled executions avec calendrier
- [ ] Bulk execution avec rate limiting

#### 2. Monitoring
- [ ] Dashboard de métriques temps réel
- [ ] Alertes sur seuils (durée, erreurs, volume)
- [ ] Logs structurés avec recherche
- [ ] Tracing distribué (OpenTelemetry)

#### 3. Sécurité
- [ ] RBAC (Role-Based Access Control)
- [ ] API keys avec scopes
- [ ] IP whitelisting
- [ ] Audit trail complet
- [ ] Chiffrement at-rest des données sensibles

---

## Nouvelles fonctionnalités

### 1. Sub-workflows
- Workflows réutilisables comme nodes
- Paramètres d'entrée/sortie définis
- Versioning des sub-workflows
- Bibliothèque partagée

### 2. Workflow Templates
- Galerie de templates par use case
- One-click deployment
- Personnalisation guidée
- Templates communautaires

### 3. Variables & Environnements
- Variables globales
- Variables par environnement (dev/staging/prod)
- Secrets management intégré
- Environment promotion

### 4. Branching & Merge
- Branches de workflows (comme Git)
- Merge avec résolution de conflits
- Pull requests pour workflows
- Review process

### 5. Testing Framework
- Tests unitaires pour nodes
- Tests d'intégration pour workflows
- Mock de services externes
- Coverage reports

### 6. API First
- GraphQL API en plus de REST
- Real-time subscriptions (WebSocket)
- SDK client (JS/TS, Python)
- CLI pour automation

---

## Timeline suggérée

### Phase 1 - Fondations (Q1)
- Triggers additionnels (Event, Queue)
- Messaging nodes (RabbitMQ, SQS)
- AI nodes (Anthropic, Google AI)
- Amélioration gestion des erreurs

### Phase 2 - Intégrations (Q2)
- CRM nodes (Salesforce, HubSpot)
- Project management (Jira, Linear)
- Communication (Teams, Telegram)
- E-commerce (Shopify)

### Phase 3 - Enterprise (Q3)
- Sub-workflows
- RBAC & Audit
- Environments & Variables
- Templates gallery

### Phase 4 - Scale (Q4)
- Performance optimizations
- Monitoring avancé
- Testing framework
- API GraphQL

---

## Contribution

Pour contribuer à l'ajout de nouveaux nodes, voir [docs/nodes/](docs/nodes/) pour le guide de développement.

Chaque node doit inclure :
1. Definition avec Zod schema
2. Tests unitaires
3. Documentation
4. Exemple d'utilisation
