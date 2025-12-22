# Nodes Logic

> Contrôler le flux d'exécution de vos workflows.

## Vue d'Ensemble

Les nodes Logic permettent de créer des branches conditionnelles, des boucles et de contrôler le flux d'exécution.

| Node | Description |
|------|-------------|
| [Condition (IF)](#condition-if) | Branchement conditionnel |
| [Switch](#switch) | Branchement multiple |
| [Loop](#loop) | Itération sur des données |
| [Wait](#wait) | Délai d'attente |
| [Stop](#stop) | Arrêter l'exécution |

---

## Condition (IF)

Crée deux branches selon une condition booléenne.

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Condition | expression | Expression booléenne |
| Compare Mode | select | Expression / Simple |

### Mode Simple

Pour des comparaisons basiques :

| Champ | Valeur |
|-------|--------|
| Value 1 | `{{$input.status}}` |
| Operator | `equals` |
| Value 2 | `active` |

### Mode Expression

Pour des conditions complexes :

```javascript
$input.age >= 18 && $input.country === "FR"
```

### Opérateurs de Comparaison

| Opérateur | Description |
|-----------|-------------|
| `equals` | Égalité stricte |
| `not equals` | Différent |
| `greater than` | Supérieur |
| `less than` | Inférieur |
| `contains` | Contient (string/array) |
| `starts with` | Commence par |
| `ends with` | Termine par |
| `is empty` | Vide ou null |
| `is not empty` | Non vide |
| `regex match` | Correspond à une regex |

### Sorties

```
                ● true ──▶ [Branche succès]
┌───────────┐  /
│ Condition │──
└───────────┘  \
                ● false ──▶ [Branche échec]
```

### Exemples

#### Vérifier un statut

```javascript
$input.status === "approved"
```

#### Vérifier une liste

```javascript
$input.items.length > 0
```

#### Condition combinée

```javascript
$input.user.role === "admin" ||
($input.user.role === "manager" && $input.user.department === "sales")
```

#### Existence d'une propriété

```javascript
$input.email !== undefined && $input.email !== null
```

---

## Switch

Crée plusieurs branches selon la valeur d'une expression.

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Switch On | expression | Valeur à tester |
| Cases | array | Liste des cas |
| Default | boolean | Inclure une sortie par défaut |

### Définition des Cas

| Case | Value | Description |
|------|-------|-------------|
| Case 1 | `pending` | En attente |
| Case 2 | `approved` | Approuvé |
| Case 3 | `rejected` | Rejeté |
| Default | - | Autre valeur |

### Sorties

```
              ● pending ──▶ ...
             /
            / ● approved ──▶ ...
┌────────┐ /
│ Switch │───● rejected ──▶ ...
└────────┘ \
            \
             ● default ──▶ ...
```

### Exemple : Routage par Type

**Switch On :** `{{$input.eventType}}`

| Case | Destination |
|------|-------------|
| `user.created` | Node création utilisateur |
| `user.updated` | Node mise à jour |
| `user.deleted` | Node suppression |
| default | Node log inconnu |

### Exemple : Plage de Valeurs

Pour des plages, utilisez un Code node avant :

```javascript
const score = $input.score;
if (score >= 90) return { grade: "A" };
if (score >= 80) return { grade: "B" };
if (score >= 70) return { grade: "C" };
return { grade: "F" };
```

Puis Switch sur `grade`.

---

## Loop

Itère sur un tableau ou exécute N fois.

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Mode | select | Array / Count |
| Input Array | expression | Tableau à parcourir (mode Array) |
| Count | number | Nombre d'itérations (mode Count) |
| Batch Size | number | Éléments par itération |
| Parallel | boolean | Exécution parallèle |

### Mode Array

Exécute la branche pour chaque élément :

```
Input: [A, B, C]

Loop ──▶ Process ──▶ [Output A]
    │              └──▶ [Output B]
    │              └──▶ [Output C]
    └─▶ After Loop ──▶ [Combined Output]
```

### Mode Count

Exécute N fois :

```
Count: 3

Loop ──▶ Process ──▶ Iteration 1
    │              └──▶ Iteration 2
    │              └──▶ Iteration 3
    └─▶ After Loop
```

### Variables dans la Boucle

| Variable | Description |
|----------|-------------|
| `$item` | Élément courant |
| `$index` | Index (0-based) |
| `$total` | Nombre total d'éléments |
| `$isFirst` | Premier élément |
| `$isLast` | Dernier élément |

### Sorties

| Sortie | Description |
|--------|-------------|
| Loop | Exécutée pour chaque itération |
| After Loop | Exécutée après toutes les itérations |

### Exemple : Traitement de Commandes

```javascript
// Input
{
  "orders": [
    { "id": 1, "amount": 100 },
    { "id": 2, "amount": 200 },
    { "id": 3, "amount": 150 }
  ]
}

// Loop sur: $input.orders
// Dans chaque itération: $item = { id: 1, amount: 100 }
```

### Parallélisation

| Parallel | Comportement |
|----------|--------------|
| `false` | Séquentiel (un à la fois) |
| `true` | Parallèle (tous en même temps) |

⚠️ Attention : En mode parallèle, les API rate limits peuvent être atteints.

---

## Wait

Ajoute un délai avant de continuer.

### Configuration

| Paramètre | Type | Default | Description |
|-----------|------|---------|-------------|
| Duration | number | 1000 | Durée en millisecondes |
| Unit | select | ms | ms, seconds, minutes, hours |

### Exemples d'Usage

#### Respecter un Rate Limit

```
┌───────────┐     ┌──────┐     ┌───────────┐
│ API Call  │────▶│ Wait │────▶│ API Call  │
└───────────┘     │ 1s   │     └───────────┘
                  └──────┘
```

#### Attendre un Traitement Externe

```
┌─────────────┐     ┌──────┐     ┌─────────────┐
│ Start Job   │────▶│ Wait │────▶│ Check Status│
└─────────────┘     │ 30s  │     └─────────────┘
```

### Wait Dynamique

```javascript
// Durée basée sur les données
{{$input.retryDelay || 5000}}
```

### Limites

| Limite | Valeur |
|--------|--------|
| Durée max | 24 heures |
| Précision | ~100ms |

---

## Stop

Arrête l'exécution du workflow.

### Configuration

| Paramètre | Type | Description |
|-----------|------|-------------|
| Status | select | Success / Error |
| Message | string | Message de fin (optionnel) |
| Output | json | Données de sortie finales |

### Statuts

| Status | Effet |
|--------|-------|
| `success` | L'exécution est marquée comme réussie |
| `error` | L'exécution est marquée comme échouée |

### Exemple : Validation Précoce

```
                          ┌───────┐
┌──────────┐     ● true──▶│ Suite │
│ Validate │────/         └───────┘
└──────────┘ \
              ● false──▶┌──────┐
                        │ Stop │
                        │Error │
                        └──────┘
```

### Exemple : Arrêt avec Données

```javascript
// Configuration du Stop node
{
  "status": "error",
  "message": "Validation failed",
  "output": {
    "errors": ["Invalid email", "Missing name"],
    "code": "VALIDATION_ERROR"
  }
}
```

---

## Patterns Courants

### Guard Clause (Validation Précoce)

```
┌─────────┐     ┌────────────┐
│ Trigger │────▶│ Validate   │
└─────────┘     └────────────┘
                      │
              true    │    false
            ┌─────────┴─────────┐
            ▼                   ▼
    ┌─────────────┐      ┌──────────┐
    │ Continue... │      │  Stop    │
    └─────────────┘      │ (Error)  │
                         └──────────┘
```

### Retry Pattern

```
┌───────┐     ┌─────────┐     ┌───────────┐
│ Start │────▶│  Loop   │────▶│ API Call  │
└───────┘     │ Count:3 │     └───────────┘
              └─────────┘           │
                   ▲                │
                   │   failed       │ success
                   │◀──────────────┬┴──────▶ Continue
                   │               │
               ┌───────┐           │
               │ Wait  │◀──────────┘
               │ 5s    │
               └───────┘
```

### Fan-out / Fan-in

```
              ┌──▶ API 1 ──┐
              │            │
┌───────┐     │            │     ┌───────┐
│ Split │────▶├──▶ API 2 ──┼────▶│ Merge │
└───────┘     │            │     └───────┘
              │            │
              └──▶ API 3 ──┘
```

---

## Bonnes Pratiques

### Conditions

1. Gardez les conditions simples et lisibles
2. Utilisez des noms descriptifs pour les branches
3. Gérez toujours le cas "else"

### Boucles

1. Limitez le nombre d'itérations
2. Ajoutez des timeouts
3. Utilisez le mode parallèle avec précaution

### Performance

1. Évitez les boucles imbriquées profondes
2. Utilisez Filter avant Loop pour réduire les données
3. Mettez des Wait entre les appels API

## Voir Aussi

- [Vue d'Ensemble des Nodes](./overview.md)
- [Transform Nodes](./transform.md)
- [Expressions](../../data/expressions.md)
