# Historique des Changements

> Suivez les modifications en temps réel effectuées par les collaborateurs.

## Vue d'Ensemble

L'historique des changements affiche toutes les modifications apportées au workflow en temps réel, permettant de suivre qui a fait quoi et quand.

![Historique des changements](../assets/change-history.png)

## Accès à l'Historique

1. Cliquez sur l'icône 📜 dans la barre d'outils
2. Ou Menu → Afficher → Historique des changements
3. Ou raccourci `Ctrl/Cmd + Shift + H`

## Structure du Panel

```
┌─────────────────────────────────────────────────────────────────┐
│ 📜 Historique des changements                             [X]  │
├─────────────────────────────────────────────────────────────────┤
│ Aujourd'hui                                                     │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ 🟢 10:35  Alice                                            ││
│ │ Node ajouté : "HTTP Request"                               ││
│ │                                              [Voir le node] ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ 🔵 10:32  Bob                                              ││
│ │ Node déplacé : "Transform"                                 ││
│ │                                              [Voir le node] ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ 🟣 10:30  Alice                                            ││
│ │ Configuration modifiée : "Webhook"                         ││
│ │                                              [Voir le node] ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ Hier                                                            │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ 🔴 18:45  Charlie                                          ││
│ │ Node supprimé : "Debug"                                    ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Types de Changements

| Type | Couleur | Icône | Description |
|------|---------|-------|-------------|
| Node ajouté | 🟢 Vert | ➕ | Nouveau node sur le canvas |
| Node déplacé | 🔵 Bleu | ↔️ | Position modifiée |
| Node supprimé | 🔴 Rouge | 🗑️ | Node retiré |
| Config modifiée | 🟣 Violet | ⚙️ | Paramètres changés |
| Edge ajouté | 🟡 Jaune | 🔗 | Nouvelle connexion |
| Edge supprimé | 🟠 Orange | ❌ | Connexion retirée |

## Informations Affichées

Chaque entrée contient :

| Information | Description |
|-------------|-------------|
| Heure | Timestamp de la modification |
| Auteur | Nom du collaborateur |
| Type | Type de changement (avec couleur) |
| Élément | Node ou edge concerné |
| Action | Lien vers l'élément |

## Interactions

### Voir le Node

Cliquez sur "Voir le node" pour :
- Centrer le viewport sur le node
- Mettre le node en surbrillance
- Sélectionner le node

### Filtrer par Type

```
┌─────────────────────────────────────────────────────────────────┐
│ Filtres : [✓ Ajouts] [✓ Modifs] [✓ Suppression] [✓ Déplacement]│
└─────────────────────────────────────────────────────────────────┘
```

Cochez/décochez pour filtrer les types affichés.

### Filtrer par Utilisateur

```
┌─────────────────────────────────────────────────────────────────┐
│ Utilisateur : [Tous ▼]                                          │
│               ├─ Tous                                           │
│               ├─ Alice                                          │
│               ├─ Bob                                            │
│               └─ Charlie                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Rechercher

Utilisez la barre de recherche pour filtrer par nom de node :

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 [Rechercher un node...]                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Timeline Visuelle

Vue alternative sous forme de timeline :

```
10:35 ─┬─ ● Alice - Node ajouté "HTTP Request"
       │
10:32 ─┼─ ● Bob - Node déplacé "Transform"
       │
10:30 ─┼─ ● Alice - Config modifiée "Webhook"
       │
10:25 ─┼─ ● Alice - Edge créé
       │
10:20 ─┴─ ● Charlie - Node ajouté "Condition"
```

## Temps Réel

### Mise à Jour Automatique

Les nouveaux changements apparaissent instantanément :

```
┌─────────────────────────────────────────────────────────────────┐
│ ✨ Nouveau changement                                          │
│ ─────────────────────────────────────────────────────────────── │
│ 🟢 À l'instant  Bob                                            │
│ Node ajouté : "Filter"                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Notifications

Option pour recevoir des notifications sur les changements importants :

| Changement | Notification par défaut |
|------------|------------------------|
| Node ajouté | ❌ |
| Node supprimé | ✅ |
| Config modifiée | ❌ |
| Edge modifié | ❌ |

## Historique Complet

### Différence avec l'Historique Temps Réel

| Aspect | Temps Réel | Complet |
|--------|------------|---------|
| Période | Session actuelle | Toute l'histoire |
| Limite | 100 entrées | Illimité |
| Accès | Panel latéral | Page dédiée |

### Accès à l'Historique Complet

Menu → Workflow → Historique complet

Ou via l'API :

```http
GET /api/v1/workflows/{id}/history?page=1&limit=50
```

## Annuler un Changement

L'historique est en lecture seule, mais vous pouvez :

1. Utiliser Undo/Redo (`Ctrl/Cmd + Z`)
2. Restaurer une version via le versioning

Voir [Versioning](../versioning/versions.md) pour la restauration.

## Structure des Données

### Entrée d'Historique

```javascript
{
  "id": "change_123",
  "workflowId": "wf_456",
  "userId": "usr_789",
  "user": {
    "id": "usr_789",
    "name": "Alice Martin",
    "avatar": "https://..."
  },
  "changeType": "NODE_ADDED",
  "nodeId": "node_abc",
  "description": "Node ajouté : HTTP Request",
  "metadata": {
    "nodeName": "HTTP Request",
    "nodeType": "http.request",
    "position": { "x": 100, "y": 200 }
  },
  "createdAt": "2024-01-15T10:35:00Z"
}
```

### Types de Changement (Enum)

```typescript
enum ChangeType {
  NODE_ADDED = 'NODE_ADDED',
  NODE_MOVED = 'NODE_MOVED',
  NODE_DELETED = 'NODE_DELETED',
  NODE_CONFIG_CHANGED = 'NODE_CONFIG_CHANGED',
  EDGE_ADDED = 'EDGE_ADDED',
  EDGE_DELETED = 'EDGE_DELETED',
  WORKFLOW_SETTINGS_CHANGED = 'WORKFLOW_SETTINGS_CHANGED'
}
```

## Limites

| Limite | Valeur |
|--------|--------|
| Entrées temps réel | 100 dernières |
| Historique complet | Illimité |
| Rétention | 90 jours (archivées ensuite) |

## Raccourcis

| Action | Raccourci |
|--------|-----------|
| Ouvrir l'historique | `Ctrl/Cmd + Shift + H` |
| Fermer | `Escape` |

## Voir Aussi

- [Vue d'Ensemble](./overview.md)
- [Versioning](../versioning/versions.md)
- [Chat Intégré](./chat.md)
