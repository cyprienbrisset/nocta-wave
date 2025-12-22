# Nodes Transform

> Manipuler et transformer les données dans vos workflows.

## Vue d'Ensemble

Les nodes Transform permettent de modifier, filtrer, et restructurer les données entre les étapes de votre workflow.

| Node | Description |
|------|-------------|
| [Map](#map) | Transformer chaque élément d'un tableau |
| [Filter](#filter) | Filtrer les éléments selon une condition |
| [Set](#set) | Définir ou modifier des valeurs |
| [Aggregate](#aggregate) | Agréger des données (sum, count, etc.) |
| [Split](#split) | Diviser les données en plusieurs branches |
| [Sort](#sort) | Trier les données |
| [Merge](#merge) | Fusionner plusieurs entrées |
| [Code](#code) | Exécuter du code JavaScript personnalisé |

---

## Map

Applique une transformation à chaque élément d'un tableau.

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Input Array | expression | Tableau source |
| Transform | expression/code | Transformation à appliquer |

### Exemple

**Input :**
```javascript
[
  { "name": "Alice", "age": 30 },
  { "name": "Bob", "age": 25 }
]
```

**Transform :**
```javascript
{
  "fullName": item.name,
  "isAdult": item.age >= 18
}
```

**Output :**
```javascript
[
  { "fullName": "Alice", "isAdult": true },
  { "fullName": "Bob", "isAdult": true }
]
```

### Variables Disponibles

| Variable | Description |
|----------|-------------|
| `item` | Élément courant |
| `index` | Index de l'élément |
| `array` | Tableau complet |

---

## Filter

Filtre les éléments d'un tableau selon une condition.

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Input Array | expression | Tableau source |
| Condition | expression | Condition de filtrage |
| Keep | select | Garder si `true` ou `false` |

### Exemple

**Input :**
```javascript
[
  { "name": "Alice", "status": "active" },
  { "name": "Bob", "status": "inactive" },
  { "name": "Charlie", "status": "active" }
]
```

**Condition :**
```javascript
item.status === "active"
```

**Output :**
```javascript
[
  { "name": "Alice", "status": "active" },
  { "name": "Charlie", "status": "active" }
]
```

### Opérateurs de Condition

| Opérateur | Description | Exemple |
|-----------|-------------|---------|
| `===` | Égal | `item.status === "active"` |
| `!==` | Différent | `item.type !== "draft"` |
| `>`, `<` | Comparaison | `item.age > 18` |
| `>=`, `<=` | Comparaison | `item.price <= 100` |
| `&&` | ET logique | `item.active && item.verified` |
| `||` | OU logique | `item.role === "admin" || item.role === "manager"` |
| `includes` | Contient | `item.tags.includes("important")` |
| `startsWith` | Commence par | `item.email.startsWith("admin")` |

---

## Set

Définit ou modifie des valeurs dans les données.

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Mode | select | Set (remplace) / Merge (fusionne) |
| Values | key-value | Valeurs à définir |

### Modes

#### Set (Remplacer)

Remplace complètement l'output par les nouvelles valeurs.

```javascript
// Input
{ "a": 1, "b": 2 }

// Configuration
{ "x": 10, "y": 20 }

// Output
{ "x": 10, "y": 20 }
```

#### Merge (Fusionner)

Ajoute ou modifie des propriétés sans supprimer les existantes.

```javascript
// Input
{ "a": 1, "b": 2 }

// Configuration
{ "b": 20, "c": 30 }

// Output
{ "a": 1, "b": 20, "c": 30 }
```

### Exemples d'Expressions

```javascript
{
  // Valeur statique
  "status": "processed",

  // Valeur du trigger
  "userId": "{{$trigger.body.userId}}",

  // Valeur calculée
  "total": "{{$input.price * $input.quantity}}",

  // Date courante
  "processedAt": "{{new Date().toISOString()}}",

  // Accès aux nodes précédents
  "apiData": "{{$nodes.HttpRequest.output.data}}"
}
```

---

## Aggregate

Agrège les données d'un tableau en une seule valeur.

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Input Array | expression | Tableau source |
| Operation | select | Type d'agrégation |
| Field | string | Champ à agréger |

### Opérations

| Opération | Description | Exemple |
|-----------|-------------|---------|
| `count` | Nombre d'éléments | 5 |
| `sum` | Somme des valeurs | 150 |
| `avg` | Moyenne | 30 |
| `min` | Valeur minimum | 10 |
| `max` | Valeur maximum | 50 |
| `first` | Premier élément | {...} |
| `last` | Dernier élément | {...} |
| `concat` | Concaténer (strings) | "a,b,c" |
| `unique` | Valeurs uniques | [1,2,3] |

### Exemple

**Input :**
```javascript
[
  { "product": "A", "amount": 100 },
  { "product": "B", "amount": 200 },
  { "product": "A", "amount": 150 }
]
```

**Configuration :**
- Operation: `sum`
- Field: `amount`

**Output :**
```javascript
{
  "result": 450
}
```

---

## Split

Divise les données en plusieurs branches parallèles.

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Input Array | expression | Tableau source |
| Batch Size | number | Éléments par branche (optionnel) |

### Modes

#### Par Élément

Chaque élément devient une exécution séparée :

```
Input: [1, 2, 3]

        ┌─▶ 1
Split ──┼─▶ 2
        └─▶ 3
```

#### Par Lot (Batch)

Groupe les éléments :

```
Input: [1, 2, 3, 4, 5, 6]
Batch Size: 2

        ┌─▶ [1, 2]
Split ──┼─▶ [3, 4]
        └─▶ [5, 6]
```

### Output

Chaque branche reçoit :

```javascript
{
  "item": /* élément ou lot */,
  "index": 0,
  "total": 3
}
```

---

## Sort

Trie les éléments d'un tableau.

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Input Array | expression | Tableau source |
| Sort By | string | Champ de tri |
| Order | select | asc (croissant) / desc (décroissant) |

### Exemple

**Input :**
```javascript
[
  { "name": "Charlie", "score": 85 },
  { "name": "Alice", "score": 92 },
  { "name": "Bob", "score": 78 }
]
```

**Configuration :**
- Sort By: `score`
- Order: `desc`

**Output :**
```javascript
[
  { "name": "Alice", "score": 92 },
  { "name": "Charlie", "score": 85 },
  { "name": "Bob", "score": 78 }
]
```

### Tri Multiple

```javascript
// Via Code node
$input.sort((a, b) => {
  if (a.category !== b.category) {
    return a.category.localeCompare(b.category);
  }
  return b.score - a.score;
});
```

---

## Merge

Fusionne les données de plusieurs branches.

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Mode | select | Type de fusion |
| Wait For | select | Tous / Premier |

### Modes de Fusion

#### Append

Concatène les résultats en un tableau :

```javascript
// Branche 1: { "a": 1 }
// Branche 2: { "b": 2 }
// Output: [{ "a": 1 }, { "b": 2 }]
```

#### Merge Objects

Fusionne les objets :

```javascript
// Branche 1: { "a": 1 }
// Branche 2: { "b": 2 }
// Output: { "a": 1, "b": 2 }
```

#### Combine by Key

Combine selon une clé commune :

```javascript
// Branche 1: [{ id: 1, name: "A" }]
// Branche 2: [{ id: 1, price: 100 }]
// Output: [{ id: 1, name: "A", price: 100 }]
```

### Wait For

| Option | Comportement |
|--------|--------------|
| Tous | Attend toutes les branches |
| Premier | Continue dès la première |

---

## Code

Exécute du code JavaScript personnalisé.

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Code | code | Code JavaScript |
| Mode | select | Sync / Async |

### Environnement

Variables disponibles :

| Variable | Description |
|----------|-------------|
| `$input` | Données d'entrée |
| `$trigger` | Données du trigger |
| `$nodes` | Outputs des nodes précédents |
| `$env` | Variables d'environnement |
| `_` | Lodash |
| `dayjs` | Manipulation de dates |

### Exemples

#### Transformation Simple

```javascript
return {
  fullName: `${$input.firstName} ${$input.lastName}`,
  email: $input.email.toLowerCase(),
  createdAt: new Date().toISOString()
};
```

#### Avec Lodash

```javascript
return {
  grouped: _.groupBy($input.items, 'category'),
  sorted: _.sortBy($input.items, ['priority', 'date']),
  unique: _.uniqBy($input.items, 'id')
};
```

#### Async (appel API)

```javascript
const response = await fetch('https://api.example.com/data');
const data = await response.json();

return {
  result: data,
  processedAt: new Date().toISOString()
};
```

#### Gestion d'Erreur

```javascript
try {
  const result = riskyOperation($input);
  return { success: true, data: result };
} catch (error) {
  return { success: false, error: error.message };
}
```

---

## Bonnes Pratiques

### Performance

1. Utilisez **Filter** avant **Map** pour réduire les données
2. Évitez les boucles imbriquées dans **Code**
3. Utilisez **Split** avec parcimonie sur de grands tableaux

### Lisibilité

1. Nommez vos nodes de manière descriptive
2. Préférez plusieurs nodes simples à un seul **Code** complexe
3. Documentez les transformations complexes

### Debug

1. Utilisez des breakpoints pour inspecter les données intermédiaires
2. Le node **Debug** affiche les données sans les modifier
3. Testez les expressions dans le preview

## Voir Aussi

- [Vue d'Ensemble des Nodes](./overview.md)
- [Expressions](../../data/expressions.md)
- [Logic Nodes](./logic.md)
