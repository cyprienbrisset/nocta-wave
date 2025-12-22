# Nodes Trigger

> Les triggers sont les points d'entrée qui déclenchent l'exécution d'un workflow.

## Vue d'Ensemble

Chaque workflow doit avoir au moins un trigger. C'est le node qui initie l'exécution et fournit les données initiales.

## Types de Triggers

| Trigger | Description | Cas d'usage |
|---------|-------------|-------------|
| [Manual](#manual) | Exécution manuelle | Tests, tâches ponctuelles |
| [Webhook](#webhook) | Requête HTTP entrante | Intégrations, webhooks tiers |
| [Cron](#cron) | Planification temporelle | Tâches récurrentes |
| [HTTP Poll](#http-poll) | Polling périodique | APIs sans webhook |
| [Event](#event) | Événements système | Réaction aux changements |
| [File Watch](#file-watch) | Surveillance fichiers | Processing de fichiers |
| [Database](#database-trigger) | Changements en BDD | Sync de données |
| [Queue](#queue) | Messages de file | Event-driven architecture |
| [Index](#index) | Registre de triggers | Organisation |

---

## Manual

Déclenche le workflow manuellement via l'interface ou l'API.

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Input Schema | JSON | Schéma des données attendues |
| Default Values | JSON | Valeurs par défaut |

### Exemple d'Utilisation

1. Cliquez sur "Exécuter" dans l'éditeur
2. Saisissez les données d'entrée
3. Le workflow s'exécute

### Output

```javascript
{
  "body": { /* données saisies */ },
  "triggeredAt": "2024-01-15T10:30:00Z",
  "triggeredBy": "user@example.com"
}
```

---

## Webhook

Reçoit des requêtes HTTP entrantes.

### Configuration

| Paramètre | Type | Default | Description |
|-----------|------|---------|-------------|
| Path | string | `/webhook` | Chemin de l'endpoint |
| Method | select | `POST` | GET, POST, PUT, DELETE, PATCH |
| Authentication | select | None | None, Basic, API Key, JWT |
| Response Mode | select | Last Node | Immediately, Last Node, Custom |

### URL du Webhook

```
https://your-domain.com/webhooks/{workflow-id}{path}
```

Exemple : `https://api.ws-flows.com/webhooks/wf_abc123/webhook`

### Authentication

#### Aucune
Webhook public, accessible sans authentification.

#### Basic Auth
```
Authorization: Basic base64(username:password)
```

#### API Key
```
X-API-Key: your-api-key
# ou
?api_key=your-api-key
```

#### JWT
```
Authorization: Bearer your-jwt-token
```

### Output

```javascript
{
  "body": { /* corps de la requête */ },
  "headers": {
    "content-type": "application/json",
    "user-agent": "..."
  },
  "query": { /* paramètres URL */ },
  "method": "POST",
  "path": "/webhook",
  "ip": "192.168.1.1"
}
```

### Response Mode

| Mode | Description |
|------|-------------|
| Immediately | Répond 200 OK immédiatement |
| Last Node | Répond avec l'output du dernier node |
| Custom | Utilisez le node HTTP Response |

---

## Cron

Exécute le workflow selon une planification.

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Expression | cron | Expression cron (5 ou 6 champs) |
| Timezone | select | Fuseau horaire |
| Enabled | boolean | Activer/désactiver |

### Syntaxe Cron

```
┌───────────── minute (0 - 59)
│ ┌───────────── heure (0 - 23)
│ │ ┌───────────── jour du mois (1 - 31)
│ │ │ ┌───────────── mois (1 - 12)
│ │ │ │ ┌───────────── jour de la semaine (0 - 6, Dimanche = 0)
│ │ │ │ │
* * * * *
```

### Exemples

| Expression | Description |
|------------|-------------|
| `0 9 * * *` | Tous les jours à 9h |
| `*/15 * * * *` | Toutes les 15 minutes |
| `0 0 * * 0` | Chaque dimanche à minuit |
| `0 8-18 * * 1-5` | Chaque heure de 8h à 18h, lun-ven |
| `0 0 1 * *` | Le 1er de chaque mois à minuit |

### Output

```javascript
{
  "scheduledTime": "2024-01-15T09:00:00Z",
  "lastRun": "2024-01-14T09:00:00Z",
  "executionCount": 42,
  "timezone": "Europe/Paris"
}
```

---

## HTTP Poll

Vérifie périodiquement une URL et déclenche sur changement.

### Configuration

| Paramètre | Type | Default | Description |
|-----------|------|---------|-------------|
| URL | string | - | URL à interroger |
| Method | select | GET | Méthode HTTP |
| Interval | number | 60 | Intervalle en secondes |
| Headers | key-value | - | En-têtes HTTP |
| Deduplication | select | hash | hash, id_field, none |

### Déduplication

| Mode | Description |
|------|-------------|
| hash | Compare le hash MD5 de la réponse |
| id_field | Compare un champ spécifique (ex: `data.id`) |
| none | Déclenche à chaque poll |

### Output

```javascript
{
  "data": { /* réponse de l'API */ },
  "status": 200,
  "headers": { ... },
  "polledAt": "2024-01-15T10:30:00Z",
  "isNew": true
}
```

---

## Event

Réagit aux événements système de WS-Flows.

### Événements Disponibles

| Événement | Description |
|-----------|-------------|
| `workflow.created` | Nouveau workflow créé |
| `workflow.updated` | Workflow modifié |
| `workflow.deleted` | Workflow supprimé |
| `execution.started` | Exécution démarrée |
| `execution.completed` | Exécution terminée |
| `execution.failed` | Exécution échouée |
| `user.created` | Utilisateur créé |
| `team.member.added` | Membre ajouté à l'équipe |

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Event Type | select | Type d'événement |
| Filter | expression | Condition optionnelle |

### Output

```javascript
{
  "eventType": "workflow.updated",
  "timestamp": "2024-01-15T10:30:00Z",
  "payload": {
    "workflowId": "wf_abc123",
    "userId": "usr_xyz789",
    "changes": { ... }
  }
}
```

---

## File Watch

Surveille un répertoire pour les nouveaux fichiers.

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Path | string | Chemin du répertoire |
| Pattern | string | Glob pattern (ex: `*.csv`) |
| Events | multi-select | create, modify, delete |
| Recursive | boolean | Inclure sous-dossiers |

### Output

```javascript
{
  "event": "create",
  "path": "/uploads/data.csv",
  "filename": "data.csv",
  "size": 1024,
  "mimeType": "text/csv",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

## Database Trigger

Réagit aux changements dans une base de données.

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Connection | credential | Connexion BDD |
| Table | string | Table à surveiller |
| Events | multi-select | INSERT, UPDATE, DELETE |
| Columns | string[] | Colonnes à surveiller (optionnel) |

### Output

```javascript
{
  "event": "INSERT",
  "table": "users",
  "data": {
    "id": 123,
    "email": "user@example.com",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "oldData": null // Présent pour UPDATE et DELETE
}
```

---

## Queue

Consomme des messages d'une file d'attente.

### Providers Supportés

- RabbitMQ
- Amazon SQS
- Redis Queue
- Apache Kafka

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Provider | select | Type de queue |
| Connection | credential | Connexion |
| Queue Name | string | Nom de la queue |
| Batch Size | number | Nombre de messages |
| Visibility Timeout | number | Timeout en secondes |

### Output

```javascript
{
  "messageId": "msg_123",
  "body": { /* contenu du message */ },
  "attributes": { ... },
  "receivedAt": "2024-01-15T10:30:00Z"
}
```

---

## Index

Node registre pour organiser plusieurs triggers.

### Usage

Utilisé pour créer un hub de triggers dans un workflow complexe :

```
┌─────────┐     ┌───────────┐
│ Webhook │────▶│           │
├─────────┤     │   Index   │────▶ Suite du workflow
│  Cron   │────▶│           │
└─────────┘     └───────────┘
```

### Output

Transmet l'output du trigger qui s'est déclenché.

---

## Bonnes Pratiques

### Choix du Trigger

| Besoin | Trigger Recommandé |
|--------|-------------------|
| Intégration avec service externe | Webhook |
| Tâche planifiée | Cron |
| API sans webhook | HTTP Poll |
| Traitement de fichiers | File Watch |
| Event-driven | Queue |
| Tests et debug | Manual |

### Sécurité

1. **Webhook** : Toujours activer l'authentification en production
2. **Secrets** : Utilisez les credentials, pas de secrets en dur
3. **Rate limiting** : Configurez des limites pour éviter les abus

### Performance

1. **Cron** : Évitez les intervalles trop courts (< 1 min)
2. **HTTP Poll** : Utilisez la déduplication
3. **Queue** : Configurez un batch size approprié

## Voir Aussi

- [Vue d'Ensemble des Nodes](./overview.md)
- [HTTP](./http.md)
- [Variables](../../data/variables.md)
- [Credentials](../../credentials/overview.md)
