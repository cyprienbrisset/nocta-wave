# Nodes HTTP

> Effectuer des requêtes HTTP et gérer les réponses.

## Vue d'Ensemble

Les nodes HTTP permettent d'interagir avec des APIs externes et de gérer les réponses HTTP.

| Node | Description |
|------|-------------|
| [HTTP Request](#http-request) | Effectue une requête HTTP |
| [HTTP Response](#http-response) | Envoie une réponse HTTP (avec Webhook) |

---

## HTTP Request

Effectue une requête HTTP vers une URL externe.

### Configuration

#### Paramètres Principaux

| Paramètre | Type | Default | Description |
|-----------|------|---------|-------------|
| URL | string | - | URL de destination |
| Method | select | GET | GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS |
| Headers | key-value | - | En-têtes HTTP |
| Query Params | key-value | - | Paramètres URL |
| Body | json/text | - | Corps de la requête |

#### Options Avancées

| Paramètre | Type | Default | Description |
|-----------|------|---------|-------------|
| Timeout | number | 30000 | Timeout en ms |
| Follow Redirects | boolean | true | Suivre les redirections |
| Max Redirects | number | 5 | Nombre max de redirections |
| Response Type | select | auto | auto, json, text, binary |
| Retry | object | - | Configuration de retry |
| Proxy | string | - | URL du proxy |
| SSL Verify | boolean | true | Vérifier les certificats |

### Méthodes HTTP

| Méthode | Usage |
|---------|-------|
| `GET` | Récupérer des données |
| `POST` | Créer une ressource |
| `PUT` | Remplacer une ressource |
| `PATCH` | Modifier partiellement |
| `DELETE` | Supprimer une ressource |
| `HEAD` | Récupérer les en-têtes uniquement |
| `OPTIONS` | Vérifier les options CORS |

### Corps de la Requête (Body)

#### JSON

```json
{
  "name": "{{$trigger.body.name}}",
  "email": "{{$trigger.body.email}}"
}
```

#### Form Data

```
Content-Type: application/x-www-form-urlencoded

field1=value1&field2=value2
```

#### Multipart Form

```
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="file"; filename="data.csv"
...
```

#### Raw Text

```
Content-Type: text/plain

Plain text content
```

### Authentication

#### Aucune

Pas d'authentification.

#### API Key

```
# Dans Header
X-API-Key: {{credentials.apiKey}}

# Dans Query
?api_key={{credentials.apiKey}}
```

#### Bearer Token

```
Authorization: Bearer {{credentials.token}}
```

#### Basic Auth

```
Authorization: Basic {{$base64(credentials.username + ':' + credentials.password)}}
```

#### OAuth2

Utilisez un credential OAuth2 configuré. Le token est automatiquement rafraîchi.

### Retry Configuration

```json
{
  "enabled": true,
  "maxRetries": 3,
  "retryOn": [500, 502, 503, 504],
  "delay": 1000,
  "backoff": "exponential"
}
```

| Paramètre | Description |
|-----------|-------------|
| maxRetries | Nombre de tentatives |
| retryOn | Codes HTTP déclenchant un retry |
| delay | Délai initial (ms) |
| backoff | `fixed` ou `exponential` |

### Output

```javascript
{
  "status": 200,
  "statusText": "OK",
  "headers": {
    "content-type": "application/json",
    "x-request-id": "abc123"
  },
  "data": {
    // Corps de la réponse (parsé si JSON)
  },
  "duration": 150 // ms
}
```

### Gestion des Erreurs

| Code | Comportement |
|------|--------------|
| 2xx | Succès, continue le workflow |
| 3xx | Suit la redirection (si activé) |
| 4xx | Erreur, node en échec |
| 5xx | Erreur serveur, retry possible |

Pour gérer les erreurs sans arrêter le workflow :

```javascript
// Dans les options
"continueOnError": true

// Ensuite, vérifiez dans le node suivant
$nodes.HttpRequest.output.status >= 400
```

### Exemples

#### GET Simple

```
URL: https://api.example.com/users
Method: GET
```

#### POST avec JSON

```
URL: https://api.example.com/users
Method: POST
Headers:
  Content-Type: application/json
Body:
  {
    "name": "John Doe",
    "email": "john@example.com"
  }
```

#### PUT avec Bearer Token

```
URL: https://api.example.com/users/{{$trigger.body.userId}}
Method: PUT
Headers:
  Authorization: Bearer {{credentials.apiToken}}
  Content-Type: application/json
Body:
  {
    "name": "{{$trigger.body.name}}"
  }
```

#### DELETE

```
URL: https://api.example.com/users/{{$trigger.body.userId}}
Method: DELETE
Headers:
  Authorization: Bearer {{credentials.apiToken}}
```

---

## HTTP Response

Envoie une réponse HTTP personnalisée (utilisé avec le trigger Webhook).

### Configuration

| Paramètre | Type | Default | Description |
|-----------|------|---------|-------------|
| Status Code | number | 200 | Code de statut HTTP |
| Headers | key-value | - | En-têtes de réponse |
| Body | json/text | - | Corps de la réponse |
| Content-Type | select | application/json | Type MIME |

### Codes de Statut Courants

| Code | Signification | Usage |
|------|---------------|-------|
| 200 | OK | Succès général |
| 201 | Created | Ressource créée |
| 204 | No Content | Succès sans contenu |
| 400 | Bad Request | Erreur client |
| 401 | Unauthorized | Non authentifié |
| 403 | Forbidden | Non autorisé |
| 404 | Not Found | Ressource introuvable |
| 500 | Server Error | Erreur serveur |

### Exemples

#### Réponse JSON

```
Status: 200
Headers:
  X-Request-Id: {{$execution.id}}
Body:
  {
    "success": true,
    "data": {{$nodes.Transform.output}}
  }
```

#### Réponse d'Erreur

```
Status: 400
Body:
  {
    "error": "Invalid input",
    "details": "Email is required"
  }
```

#### Redirection

```
Status: 302
Headers:
  Location: https://example.com/success
Body: (vide)
```

### Utilisation avec Webhook

```
┌──────────┐     ┌───────────┐     ┌──────────────┐
│ Webhook  │────▶│ Transform │────▶│ HTTP Response │
└──────────┘     └───────────┘     └──────────────┘
```

Le webhook attend la réponse du node HTTP Response.

---

## Bonnes Pratiques

### Performance

1. **Timeout approprié** : Ajustez selon l'API cible
2. **Retry intelligent** : Activez uniquement pour les erreurs temporaires
3. **Parallélisation** : Utilisez Split pour les requêtes multiples

### Sécurité

1. **Credentials** : Ne mettez jamais de secrets en dur
2. **HTTPS** : Utilisez toujours HTTPS en production
3. **Validation** : Validez les réponses avant utilisation

### Debug

1. Activez les logs pour voir les requêtes/réponses
2. Utilisez les breakpoints pour inspecter les données
3. Testez avec des services comme httpbin.org

## Voir Aussi

- [Vue d'Ensemble des Nodes](./overview.md)
- [Triggers - Webhook](./triggers.md#webhook)
- [Credentials](../../credentials/overview.md)
- [Expressions](../../data/expressions.md)
