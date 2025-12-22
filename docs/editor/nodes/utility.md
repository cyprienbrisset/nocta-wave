# Nodes Utility

> Outils divers pour le développement et le debugging.

## Vue d'Ensemble

Les nodes Utility fournissent des fonctionnalités de support comme le logging, le parsing, et diverses transformations utilitaires.

| Node | Description |
|------|-------------|
| [Debug](#debug) | Afficher des données dans la console |
| [Log](#log) | Enregistrer des logs |
| [JSON Parse](#json-parse) | Parser du JSON |
| [HTML Parse](#html-parse) | Extraire des données d'HTML |
| [DateTime](#datetime) | Manipuler les dates et heures |
| [Crypto](#crypto) | Hashing et encryption |
| [Delay](#delay) | Ajouter un délai |

---

## Debug

Affiche des données dans la console de debug sans modifier le flux.

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Label | string | Étiquette du log |
| Data | expression | Données à afficher |
| Level | select | info, warn, error, debug |

### Utilisation

Le node Debug est un "pass-through" : il transmet les données telles quelles tout en les affichant dans la console.

```
Input ──▶ [Debug] ──▶ Output (identique à Input)
            │
            └──▶ Console: affiche les données
```

### Exemple

**Configuration :**
```javascript
{
  "label": "Données utilisateur",
  "data": "{{$input}}",
  "level": "info"
}
```

**Console Output :**
```
[INFO] Données utilisateur
{
  "userId": "usr_123",
  "name": "Alice",
  "email": "alice@example.com"
}
```

### Bonnes Pratiques

1. Ajoutez des labels descriptifs
2. Utilisez `debug` pour le développement, `error` pour les problèmes
3. Supprimez ou désactivez les nodes Debug en production

---

## Log

Enregistre des logs persistants dans le système.

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Message | string | Message à logger |
| Level | select | info, warn, error |
| Context | json | Données de contexte |
| Store | boolean | Stocker en base |

### Niveaux de Log

| Level | Usage |
|-------|-------|
| `info` | Informations générales |
| `warn` | Avertissements |
| `error` | Erreurs |

### Exemple

```javascript
{
  "message": "Commande traitée avec succès",
  "level": "info",
  "context": {
    "orderId": "{{$input.orderId}}",
    "amount": "{{$input.amount}}",
    "processingTime": "{{Date.now() - $execution.startedAt}}"
  }
}
```

### Accès aux Logs

Les logs sont accessibles via :
- Console de debug de l'éditeur
- Panel de logs d'exécution
- API REST `/api/v1/executions/{id}/logs`

---

## JSON Parse

Parse une chaîne JSON en objet.

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Input | expression | Chaîne JSON à parser |
| Strict Mode | boolean | Échouer sur JSON invalide |
| Default | json | Valeur par défaut si parsing échoue |

### Exemple

**Input :**
```javascript
{
  "rawData": "{\"name\":\"Alice\",\"age\":30}"
}
```

**Configuration :**
```javascript
{
  "input": "{{$input.rawData}}"
}
```

**Output :**
```javascript
{
  "name": "Alice",
  "age": 30
}
```

### Gestion des Erreurs

| Strict Mode | JSON Invalide | Résultat |
|-------------|---------------|----------|
| `true` | Échec | Node en erreur |
| `false` | Échec | Retourne `default` |

---

## HTML Parse

Extrait des données d'un document HTML en utilisant des sélecteurs CSS.

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| HTML | expression | Contenu HTML |
| Selectors | array | Sélecteurs CSS |
| Mode | select | single / multiple |

### Sélecteurs CSS

| Sélecteur | Description |
|-----------|-------------|
| `h1` | Éléments `<h1>` |
| `.class` | Éléments avec classe |
| `#id` | Élément par ID |
| `a[href]` | Liens avec attribut href |
| `div > p` | `<p>` enfants directs de `<div>` |
| `li:first-child` | Premier élément de liste |

### Exemple

**Input HTML :**
```html
<html>
  <body>
    <h1>Titre</h1>
    <div class="content">
      <p>Paragraphe 1</p>
      <p>Paragraphe 2</p>
    </div>
    <a href="https://example.com">Lien</a>
  </body>
</html>
```

**Configuration :**
```javascript
{
  "selectors": [
    { "name": "title", "selector": "h1", "attribute": "text" },
    { "name": "paragraphs", "selector": ".content p", "attribute": "text", "multiple": true },
    { "name": "link", "selector": "a", "attribute": "href" }
  ]
}
```

**Output :**
```javascript
{
  "title": "Titre",
  "paragraphs": ["Paragraphe 1", "Paragraphe 2"],
  "link": "https://example.com"
}
```

### Attributs

| Attribut | Description |
|----------|-------------|
| `text` | Contenu textuel |
| `html` | HTML interne |
| `href`, `src`, etc. | Attribut spécifique |

---

## DateTime

Manipulation et formatage des dates et heures.

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Operation | select | Type d'opération |
| Input | expression | Date d'entrée |
| Format | string | Format de sortie |
| Timezone | select | Fuseau horaire |

### Operations

| Opération | Description |
|-----------|-------------|
| `format` | Formater une date |
| `parse` | Parser une chaîne en date |
| `add` | Ajouter une durée |
| `subtract` | Soustraire une durée |
| `diff` | Différence entre deux dates |
| `now` | Date/heure actuelle |
| `startOf` | Début de période |
| `endOf` | Fin de période |

### Format (dayjs)

| Token | Description | Exemple |
|-------|-------------|---------|
| `YYYY` | Année 4 chiffres | 2024 |
| `MM` | Mois | 01-12 |
| `DD` | Jour | 01-31 |
| `HH` | Heure 24h | 00-23 |
| `mm` | Minutes | 00-59 |
| `ss` | Secondes | 00-59 |
| `ddd` | Jour abrégé | Mon, Tue |

### Exemples

#### Formater une Date

```javascript
{
  "operation": "format",
  "input": "{{$input.createdAt}}",
  "format": "DD/MM/YYYY HH:mm"
}
// Output: "15/01/2024 14:30"
```

#### Ajouter une Durée

```javascript
{
  "operation": "add",
  "input": "{{new Date()}}",
  "amount": 7,
  "unit": "days"
}
// Output: date dans 7 jours
```

#### Différence entre Dates

```javascript
{
  "operation": "diff",
  "input": "{{$input.endDate}}",
  "compareTo": "{{$input.startDate}}",
  "unit": "hours"
}
// Output: { "diff": 48 }
```

#### Début de Semaine

```javascript
{
  "operation": "startOf",
  "input": "{{new Date()}}",
  "unit": "week"
}
// Output: lundi à 00:00
```

---

## Crypto

Fonctions de hashing et d'encryption.

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Operation | select | Type d'opération |
| Input | expression | Données d'entrée |
| Algorithm | select | Algorithme |

### Operations

#### Hash

| Algorithme | Output | Sécurité |
|------------|--------|----------|
| `md5` | 32 chars | ⚠️ Faible |
| `sha1` | 40 chars | ⚠️ Faible |
| `sha256` | 64 chars | ✅ Forte |
| `sha512` | 128 chars | ✅ Forte |

```javascript
{
  "operation": "hash",
  "algorithm": "sha256",
  "input": "{{$input.password}}"
}
// Output: "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3"
```

#### HMAC

```javascript
{
  "operation": "hmac",
  "algorithm": "sha256",
  "input": "{{$input.data}}",
  "key": "{{credentials.hmacSecret}}"
}
```

#### Base64

```javascript
// Encoder
{
  "operation": "base64Encode",
  "input": "{{$input.data}}"
}

// Décoder
{
  "operation": "base64Decode",
  "input": "{{$input.encoded}}"
}
```

#### UUID

```javascript
{
  "operation": "uuid"
}
// Output: { "uuid": "550e8400-e29b-41d4-a716-446655440000" }
```

#### Random

```javascript
{
  "operation": "random",
  "length": 32,
  "charset": "alphanumeric" // alphanumeric, numeric, alphabetic, hex
}
```

---

## Delay

Ajoute un délai avant de continuer l'exécution.

### Configuration

| Paramètre | Type | Default | Description |
|-----------|------|---------|-------------|
| Duration | number | 1000 | Durée |
| Unit | select | ms | ms, seconds, minutes, hours |

### Exemples d'Usage

#### Respecter un Rate Limit

```
┌───────────┐     ┌───────┐     ┌───────────┐
│ API Call  │────▶│ Delay │────▶│ API Call  │
└───────────┘     │ 1 sec │     └───────────┘
                  └───────┘
```

#### Attendre un Traitement Externe

```
┌─────────────┐     ┌───────┐     ┌──────────────┐
│ Start Job   │────▶│ Delay │────▶│ Check Status │
└─────────────┘     │ 30 sec│     └──────────────┘
                    └───────┘
```

### Delay Dynamique

```javascript
{
  "duration": "{{$input.waitTime || 5000}}",
  "unit": "ms"
}
```

### Limites

| Limite | Valeur |
|--------|--------|
| Durée max | 24 heures |
| Précision | ~100ms |

---

## Patterns Courants

### Logging Structuré

```
┌─────────┐     ┌─────────┐     ┌──────────┐     ┌─────────┐
│ Trigger │────▶│ Log     │────▶│ Process  │────▶│ Log     │
└─────────┘     │ "Start" │     └──────────┘     │ "End"   │
                └─────────┘                       └─────────┘
```

### Web Scraping

```
┌─────────────┐     ┌─────────────┐     ┌───────────┐
│ HTTP Request│────▶│ HTML Parse  │────▶│ Transform │
│ (get page)  │     │ (extract)   │     │ (clean)   │
└─────────────┘     └─────────────┘     └───────────┘
```

### Rate Limiting

```
┌──────┐     ┌───────────┐     ┌───────┐
│ Loop │────▶│ API Call  │────▶│ Delay │──┐
└──────┘     └───────────┘     │ 100ms │  │
   ▲                           └───────┘  │
   └──────────────────────────────────────┘
```

---

## Bonnes Pratiques

### Debug

1. Utilisez des labels clairs et descriptifs
2. Loggez les points critiques du workflow
3. Désactivez les nodes Debug en production

### Performance

1. Évitez les Delay trop courts en boucle
2. Utilisez HTML Parse plutôt que regex pour l'extraction

### Sécurité

1. Utilisez SHA-256+ pour le hashing
2. Ne loggez jamais de données sensibles
3. Utilisez HMAC pour la vérification d'intégrité

## Voir Aussi

- [Vue d'Ensemble des Nodes](./overview.md)
- [Console de Debug](../../debugging/console.md)
- [Transform](./transform.md)
