# Vue d'Ensemble des Nodes

> Les nodes sont les briques de base pour construire vos workflows.

## Qu'est-ce qu'un Node ?

Un **node** est une unité d'action dans un workflow. Chaque node effectue une tâche spécifique : recevoir des données, les transformer, appeler une API, etc.

![Bibliothèque de nodes](../../assets/node-library.png)

## Structure d'un Node

```
┌──────────────────────────────────────┐
│  ○ input          [Icon] Node Name   │  ← En-tête
├──────────────────────────────────────┤
│                                      │
│  Configuration résumée               │  ← Corps
│  (URL, méthode, etc.)                │
│                                      │
├──────────────────────────────────────┤
│                           output ●   │  ← Sortie
└──────────────────────────────────────┘
```

### Composants

| Élément | Description |
|---------|-------------|
| **Handle d'entrée** (○) | Reçoit les données du node précédent |
| **Icône** | Identifie visuellement le type de node |
| **Nom** | Titre personnalisable |
| **Configuration** | Aperçu des paramètres principaux |
| **Handle de sortie** (●) | Envoie les données au node suivant |

## Catégories de Nodes

WS-Flows organise les nodes en 7 catégories :

| Catégorie | Couleur | Description | Nodes |
|-----------|---------|-------------|-------|
| [Triggers](./triggers.md) | 🟣 Violet | Points d'entrée du workflow | 9 |
| [HTTP](./http.md) | 🔵 Bleu | Requêtes et réponses HTTP | 2 |
| [Transform](./transform.md) | 🟢 Vert | Manipulation de données | 8 |
| [Logic](./logic.md) | 🟠 Orange | Contrôle du flux | 5 |
| [Database](./database.md) | 🔵 Cyan | Opérations base de données | 11 |
| [Integrations](./integrations.md) | 🟣 Indigo | Services tiers | 60+ |
| [Utility](./utility.md) | ⚪ Gris | Outils divers | 7 |

## Ajouter un Node

### Via la Bibliothèque

1. Cliquez sur **+** dans la toolbar ou appuyez sur `Tab`
2. Parcourez les catégories ou utilisez la recherche
3. Cliquez sur un node pour l'ajouter au centre du canvas
4. Ou glissez-déposez pour le placer précisément

### Via le Menu Contextuel

1. Clic droit sur le canvas
2. "Ajouter un node"
3. Sélectionnez le type

### Via Connexion

1. Glissez depuis un handle de sortie
2. Relâchez sur le canvas (pas sur un node)
3. Le sélecteur de nodes s'ouvre automatiquement

## Configurer un Node

### Ouvrir le Panneau de Configuration

- Double-cliquez sur le node
- Ou clic droit → "Éditer"
- Ou sélectionnez et appuyez sur `Enter`

### Structure du Panneau

```
┌─────────────────────────────────────────┐
│ [Icon] Nom du Node              [X]    │
├─────────────────────────────────────────┤
│ ┌─────┐ ┌─────────┐ ┌──────────┐       │
│ │Params│ │ Options │ │Credentials│       │
│ └─────┘ └─────────┘ └──────────┘       │
├─────────────────────────────────────────┤
│                                         │
│  Paramètres de configuration            │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │ URL: https://api.example.com    │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │ Method: GET ▼                    │  │
│  └──────────────────────────────────┘  │
│                                         │
├─────────────────────────────────────────┤
│                           [Enregistrer] │
└─────────────────────────────────────────┘
```

### Types de Champs

| Type | Description |
|------|-------------|
| Texte | Saisie libre |
| Nombre | Valeur numérique |
| Sélection | Menu déroulant |
| Booléen | Switch on/off |
| JSON | Éditeur JSON |
| Code | Éditeur de code |
| Expression | Champ avec autocomplétion |
| Credential | Sélecteur de credentials |

## Expressions dans les Champs

Utilisez des expressions pour des valeurs dynamiques :

```javascript
// Interpolation simple
"Hello {{$trigger.body.name}}"

// Expression JavaScript
"{{$trigger.body.items.length}}"

// Accès aux données d'un node précédent
"{{$nodes.HttpRequest.output.data}}"
```

Voir [Expressions](../../data/expressions.md) pour plus de détails.

## États des Nodes

### En Édition

| État | Apparence |
|------|-----------|
| Normal | Bordure grise |
| Sélectionné | Bordure bleue |
| Erreur de config | Icône ⚠️ + bordure orange |
| Désactivé | Opacité réduite |

### En Exécution

| État | Indicateur | Description |
|------|------------|-------------|
| Pending | ⏳ | En attente d'exécution |
| Running | 🔄 | En cours |
| Completed | ✅ | Succès |
| Failed | ❌ | Échec |
| Skipped | ⏭️ | Ignoré (condition non remplie) |

## Actions sur un Node

### Menu Contextuel (Clic Droit)

```
┌─────────────────────┐
│ Éditer              │
│ Exécuter depuis ici │
│ Désactiver          │
├─────────────────────┤
│ Copier              │
│ Couper              │
│ Dupliquer           │
│ Supprimer           │
├─────────────────────┤
│ Ajouter breakpoint  │
│ Voir les logs       │
├─────────────────────┤
│ Documentation       │
└─────────────────────┘
```

### Raccourcis

| Action | Raccourci |
|--------|-----------|
| Éditer | `Enter` |
| Supprimer | `Delete` |
| Dupliquer | `Ctrl/Cmd + D` |
| Copier | `Ctrl/Cmd + C` |
| Couper | `Ctrl/Cmd + X` |
| Désactiver | `Ctrl/Cmd + Shift + D` |

## Désactiver un Node

Un node désactivé :
- Ne s'exécute pas
- Passe les données telles quelles
- Apparaît en semi-transparence

```
┌──────────────────────────┐
│ ○    🚫 HTTP Request    ●│  ← node désactivé
│      (disabled)          │
└──────────────────────────┘
```

## Handles Multiples

Certains nodes ont plusieurs sorties :

### Condition (IF)

```
                    ● true ──▶ ...
┌───────────────┐  /
│   Condition   │──
└───────────────┘  \
                    ● false ──▶ ...
```

### Switch

```
                    ● case1 ──▶ ...
                   /
┌───────────────┐ ─● case2 ──▶ ...
│    Switch     │  \
└───────────────┘   ● default ──▶ ...
```

### Split

```
                    ● ──▶ item 1
                   /
┌───────────────┐ ─● ──▶ item 2
│    Split      │  \
└───────────────┘   ● ──▶ item 3
```

## Input et Output

### Accéder aux Données d'Entrée

```javascript
// Dans un node Transform
$input         // Données reçues du node précédent
$input.data    // Accès à une propriété
```

### Structure de l'Output

Chaque node produit un output structuré :

```javascript
{
  // Données principales
  data: { ... },

  // Métadonnées (optionnel)
  meta: {
    duration: 150,
    timestamp: "2024-01-15T10:30:00Z"
  }
}
```

## Bonnes Pratiques

### Nommage

```
✅ Bons exemples :
- "Récupérer utilisateur"
- "Valider email"
- "Envoyer notification Slack"

❌ Mauvais exemples :
- "HTTP Request 1"
- "Node"
- "test"
```

### Organisation

1. Alignez les nodes pour un flux lisible
2. Groupez les nodes liés
3. Utilisez des labels sur les edges conditionnels
4. Ajoutez des commentaires via les groupes

## Limites

| Limite | Valeur |
|--------|--------|
| Nodes par workflow | ~200 (recommandé) |
| Connections par node | Illimité |
| Profondeur d'imbrication | 10 niveaux |

## Voir Aussi

- [Triggers](./triggers.md)
- [HTTP](./http.md)
- [Transform](./transform.md)
- [Logic](./logic.md)
- [Database](./database.md)
- [Integrations](./integrations.md)
- [Utility](./utility.md)
