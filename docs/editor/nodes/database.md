# Nodes Database

> Interagir avec différentes bases de données.

## Vue d'Ensemble

Les nodes Database permettent de lire, écrire et manipuler des données dans diverses bases de données.

## Bases de Données Supportées

| Base de Données | Type | Opérations |
|-----------------|------|------------|
| [PostgreSQL](#postgresql) | SQL | Query, Insert, Update, Delete |
| [MySQL](#mysql) | SQL | Query, Insert, Update, Delete |
| [MongoDB](#mongodb) | NoSQL | Find, Insert, Update, Delete |
| [Redis](#redis) | Key-Value | Get, Set, Delete, Pub/Sub |
| [SQLite](#sqlite) | SQL | Query, Insert, Update, Delete |
| [Supabase](#supabase) | PostgreSQL | Query, Realtime |
| [Firebase](#firebase) | NoSQL | Firestore, Realtime DB |
| [DynamoDB](#dynamodb) | NoSQL | Query, Scan, Put, Delete |
| [Elasticsearch](#elasticsearch) | Search | Search, Index, Delete |
| [ClickHouse](#clickhouse) | Analytics | Query |
| [Prisma](#prisma) | ORM | Via models |

---

## PostgreSQL

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Credential | select | Connexion PostgreSQL |
| Operation | select | Query, Insert, Update, Delete |
| Table | string | Nom de la table |

### Operations

#### Query (SELECT)

```sql
SELECT * FROM users WHERE status = $1 LIMIT $2
```

**Parameters :** `["active", 10]`

#### Insert

| Field | Value |
|-------|-------|
| name | `{{$input.name}}` |
| email | `{{$input.email}}` |
| created_at | `{{new Date().toISOString()}}` |

#### Update

```sql
UPDATE users SET name = $1 WHERE id = $2
```

#### Delete

```sql
DELETE FROM users WHERE id = $1
```

### Output

```javascript
{
  "rows": [
    { "id": 1, "name": "Alice", "email": "alice@example.com" }
  ],
  "rowCount": 1,
  "duration": 25
}
```

### Transactions

```javascript
// Début de transaction
await client.query('BEGIN');

try {
  await client.query('INSERT INTO orders...');
  await client.query('UPDATE inventory...');
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
}
```

---

## MySQL

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Credential | select | Connexion MySQL |
| Operation | select | Query, Insert, Update, Delete |

### Exemple Query

```sql
SELECT * FROM products WHERE category = ? AND price < ?
```

**Parameters :** `["electronics", 1000]`

### Différences avec PostgreSQL

| Aspect | PostgreSQL | MySQL |
|--------|------------|-------|
| Placeholders | `$1, $2` | `?, ?` |
| JSON | `jsonb` | `JSON` |
| Arrays | Natif | Via JSON |

---

## MongoDB

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Credential | select | Connexion MongoDB |
| Operation | select | Find, Insert, Update, Delete, Aggregate |
| Collection | string | Nom de la collection |

### Operations

#### Find

```javascript
// Filter
{ "status": "active", "age": { "$gte": 18 } }

// Projection
{ "name": 1, "email": 1, "_id": 0 }

// Options
{ "limit": 10, "sort": { "createdAt": -1 } }
```

#### Insert One

```javascript
{
  "name": "{{$input.name}}",
  "email": "{{$input.email}}",
  "createdAt": { "$date": "{{new Date().toISOString()}}" }
}
```

#### Insert Many

```javascript
[
  { "name": "Alice" },
  { "name": "Bob" }
]
```

#### Update

```javascript
// Filter
{ "_id": { "$oid": "{{$input.userId}}" } }

// Update
{ "$set": { "status": "active" }, "$inc": { "loginCount": 1 } }
```

#### Delete

```javascript
{ "_id": { "$oid": "{{$input.userId}}" } }
```

#### Aggregate

```javascript
[
  { "$match": { "status": "active" } },
  { "$group": { "_id": "$category", "total": { "$sum": "$amount" } } },
  { "$sort": { "total": -1 } }
]
```

### Output

```javascript
{
  "documents": [...],
  "count": 10,
  "duration": 45
}
```

---

## Redis

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Credential | select | Connexion Redis |
| Operation | select | Get, Set, Delete, Publish, Subscribe |

### Operations

#### Get

| Paramètre | Valeur |
|-----------|--------|
| Key | `user:{{$input.userId}}` |

#### Set

| Paramètre | Valeur |
|-----------|--------|
| Key | `session:{{$input.sessionId}}` |
| Value | `{{JSON.stringify($input.data)}}` |
| TTL | `3600` (secondes) |

#### Delete

| Paramètre | Valeur |
|-----------|--------|
| Key | `cache:{{$input.cacheKey}}` |

#### Hash Operations

```javascript
// HSET
{ "operation": "HSET", "key": "user:1", "field": "name", "value": "Alice" }

// HGET
{ "operation": "HGET", "key": "user:1", "field": "name" }

// HGETALL
{ "operation": "HGETALL", "key": "user:1" }
```

#### List Operations

```javascript
// LPUSH
{ "operation": "LPUSH", "key": "queue", "value": "task1" }

// RPOP
{ "operation": "RPOP", "key": "queue" }

// LRANGE
{ "operation": "LRANGE", "key": "queue", "start": 0, "stop": -1 }
```

#### Pub/Sub

```javascript
// Publish
{ "operation": "PUBLISH", "channel": "notifications", "message": "Hello!" }
```

---

## SQLite

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Database Path | string | Chemin du fichier .db |
| Operation | select | Query, Execute |

### Exemple

```sql
SELECT * FROM logs WHERE timestamp > datetime('now', '-1 day')
```

### Cas d'Usage

- Bases de données embarquées
- Tests
- Cache local

---

## Supabase

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Credential | select | Clés Supabase |
| Operation | select | Query, Insert, Update, Delete, RPC |
| Table | string | Nom de la table |

### Query avec Filtres

```javascript
{
  "select": "id, name, email",
  "filter": {
    "status": "eq.active",
    "age": "gte.18"
  },
  "order": "created_at.desc",
  "limit": 10
}
```

### RPC (Stored Procedures)

```javascript
{
  "function": "calculate_stats",
  "params": { "user_id": "{{$input.userId}}" }
}
```

### Realtime

Supabase offre des webhooks pour les changements en temps réel. Utilisez le trigger Database ou Webhook.

---

## Firebase

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Credential | select | Service Account |
| Service | select | Firestore / Realtime DB |

### Firestore

#### Get Document

```javascript
{
  "collection": "users",
  "documentId": "{{$input.userId}}"
}
```

#### Query Collection

```javascript
{
  "collection": "orders",
  "where": [
    ["status", "==", "pending"],
    ["amount", ">", 100]
  ],
  "orderBy": ["createdAt", "desc"],
  "limit": 10
}
```

#### Add Document

```javascript
{
  "collection": "events",
  "data": {
    "type": "{{$input.type}}",
    "timestamp": { "_serverTimestamp": true }
  }
}
```

### Realtime Database

```javascript
{
  "path": "/users/{{$input.userId}}",
  "operation": "get" // get, set, update, push, remove
}
```

---

## DynamoDB

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Credential | select | AWS Credentials |
| Operation | select | GetItem, Query, Scan, PutItem, DeleteItem |
| Table | string | Nom de la table |

### GetItem

```javascript
{
  "Key": {
    "userId": { "S": "{{$input.userId}}" }
  }
}
```

### Query

```javascript
{
  "KeyConditionExpression": "userId = :uid",
  "ExpressionAttributeValues": {
    ":uid": { "S": "{{$input.userId}}" }
  }
}
```

### PutItem

```javascript
{
  "Item": {
    "userId": { "S": "{{$input.userId}}" },
    "data": { "S": "{{JSON.stringify($input.data)}}" },
    "ttl": { "N": "{{Math.floor(Date.now()/1000) + 3600}}" }
  }
}
```

---

## Elasticsearch

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Credential | select | Connexion ES |
| Operation | select | Search, Index, Delete |
| Index | string | Nom de l'index |

### Search

```javascript
{
  "query": {
    "bool": {
      "must": [
        { "match": { "title": "{{$input.searchTerm}}" } }
      ],
      "filter": [
        { "term": { "status": "published" } }
      ]
    }
  },
  "from": 0,
  "size": 10,
  "sort": [{ "date": "desc" }]
}
```

### Index Document

```javascript
{
  "id": "{{$input.id}}",
  "document": {
    "title": "{{$input.title}}",
    "content": "{{$input.content}}",
    "indexedAt": "{{new Date().toISOString()}}"
  }
}
```

---

## ClickHouse

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Credential | select | Connexion ClickHouse |
| Query | sql | Requête SQL |

### Exemple Analytics

```sql
SELECT
  toDate(timestamp) as date,
  count() as events,
  uniq(user_id) as unique_users
FROM events
WHERE timestamp >= now() - INTERVAL 7 DAY
GROUP BY date
ORDER BY date DESC
```

---

## Prisma

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Model | select | Modèle Prisma |
| Operation | select | findMany, create, update, delete |

### Exemple

```javascript
// findMany
{
  "where": { "status": "active" },
  "include": { "posts": true },
  "take": 10
}

// create
{
  "data": {
    "name": "{{$input.name}}",
    "email": "{{$input.email}}"
  }
}
```

---

## Bonnes Pratiques

### Sécurité

1. **Utilisez des credentials** - Jamais de secrets en dur
2. **Préparez les requêtes** - Évitez l'injection SQL
3. **Principe du moindre privilège** - Permissions minimales

### Performance

1. **Indexez** vos tables sur les colonnes fréquemment requêtées
2. **Limitez** les résultats avec LIMIT/take
3. **Utilisez** des connexions poolées

### Fiabilité

1. **Gérez les erreurs** - Retry et fallback
2. **Timeouts** - Configurez des timeouts raisonnables
3. **Transactions** - Pour les opérations multiples

## Voir Aussi

- [Vue d'Ensemble des Nodes](./overview.md)
- [Credentials](../../credentials/overview.md)
- [Transform](./transform.md)
