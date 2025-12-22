# Groupes

> Organiser visuellement vos nodes avec des groupes colorés.

## Vue d'Ensemble

Les groupes permettent de regrouper visuellement des nodes liés, facilitant la compréhension et la navigation dans les workflows complexes.

![Exemple de groupe](../assets/groups-example.png)

## Créer un Groupe

### Méthode 1 : Sélection Multiple

1. Sélectionnez les nodes à grouper (`Ctrl/Cmd + clic`)
2. Clic droit → **"Créer un groupe"**
3. Choisissez une couleur
4. Optionnel : nommez le groupe

### Méthode 2 : Dessiner un Groupe

1. Clic droit sur le canvas → **"Créer un groupe vide"**
2. Redimensionnez pour englober les nodes
3. Les nodes à l'intérieur sont automatiquement groupés

## Couleurs Disponibles

| Couleur | Code | Utilisation suggérée |
|---------|------|---------------------|
| 🔴 Rouge | `#EF4444` | Erreurs, alertes |
| 🟠 Orange | `#F97316` | Attention, validation |
| 🟡 Jaune | `#EAB308` | En cours, temporaire |
| 🟢 Vert | `#22C55E` | Succès, production |
| 🔵 Bleu | `#3B82F6` | Information, général |
| 🟣 Violet | `#8B5CF6` | Intégrations, API |
| ⬜ Gris | `#6B7280` | Utilitaires, secondaire |
| ⬛ Sombre | `#1F2937` | Archive, désactivé |

## Propriétés d'un Groupe

### Titre

- Double-cliquez sur le titre pour le modifier
- Le titre apparaît en haut du groupe
- Optionnel mais recommandé

### Description

Ajoutez une description via le panneau de propriétés :

1. Sélectionnez le groupe
2. Ouvrez le panneau de propriétés (clic droit → Propriétés)
3. Renseignez la description

### Taille

- Redimensionnez en glissant les bordures
- Taille minimum : 200x150px
- La taille s'adapte au contenu

## Manipulation des Groupes

### Déplacer

- Glissez le titre du groupe pour déplacer tout le groupe
- Les nodes inclus suivent le groupe

### Redimensionner

- Glissez les coins ou bordures
- Les nodes ne sont pas affectés par le redimensionnement

### Supprimer

| Action | Résultat |
|--------|----------|
| Delete sur groupe | Supprime le groupe, garde les nodes |
| Delete sur groupe + nodes | Supprime tout |

### Dissoudre

1. Clic droit sur le groupe
2. "Dissoudre le groupe"
3. Les nodes restent en place

## Nodes et Groupes

### Ajouter un Node à un Groupe

- Glissez un node à l'intérieur du groupe
- Le node devient membre du groupe

### Retirer un Node d'un Groupe

- Glissez le node hors du groupe
- Ou clic droit → "Retirer du groupe"

### Sélection

| Action | Résultat |
|--------|----------|
| Clic sur groupe (fond) | Sélectionne le groupe |
| Clic sur node | Sélectionne le node |
| Double-clic sur groupe | Sélectionne tous les nodes |

## Groupes Imbriqués

Les groupes peuvent être imbriqués (groupe dans un groupe) :

```
┌─────────────────────────────────┐
│ Groupe Parent                    │
│  ┌────────────────────────────┐ │
│  │ Groupe Enfant              │ │
│  │  ┌────────┐  ┌────────┐   │ │
│  │  │ Node A │  │ Node B │   │ │
│  │  └────────┘  └────────┘   │ │
│  └────────────────────────────┘ │
│  ┌────────┐                     │
│  │ Node C │                     │
│  └────────┘                     │
└─────────────────────────────────┘
```

### Règles d'Imbrication

- Maximum 3 niveaux recommandés
- Le groupe parent déplace tous les enfants
- La suppression du parent n'affecte pas les enfants

## Comportement lors de l'Exécution

### Indicateur de Statut

Le groupe affiche un indicateur selon l'état de ses nodes :

| Indicateur | Signification |
|------------|---------------|
| 🔵 | Nodes en attente |
| 🟡 | Exécution en cours |
| 🟢 | Tous les nodes réussis |
| 🔴 | Au moins un échec |
| ⚪ | Nodes désactivés |

### Collapse/Expand

Pour les grands workflows, vous pouvez réduire un groupe :

1. Double-cliquez sur le titre du groupe
2. Ou cliquez sur l'icône ▼/▶

Le groupe réduit affiche un résumé :
```
┌─────────────────────────┐
│ ▶ Groupe API (5 nodes) │
└─────────────────────────┘
```

## Bonnes Pratiques

### Organisation

| Suggestion | Description |
|------------|-------------|
| Par fonctionnalité | Groupez les nodes qui font la même chose |
| Par source | Groupez par API ou service |
| Par étape | Groupez par phase du workflow |

### Nommage

```
✅ Bons exemples :
- "Validation des données"
- "Appel API Stripe"
- "Transformation JSON"
- "Gestion des erreurs"

❌ Mauvais exemples :
- "Groupe 1"
- "Nodes"
- "Divers"
```

### Couleurs

| Couleur | Suggestion d'usage |
|---------|-------------------|
| Bleu | Logique principale |
| Vert | Chemins de succès |
| Orange | Validation, conditions |
| Rouge | Gestion d'erreurs |
| Violet | Intégrations externes |
| Gris | Utilitaires, logs |

## Raccourcis

| Action | Raccourci |
|--------|-----------|
| Créer groupe | `Ctrl/Cmd + G` |
| Dissoudre groupe | `Ctrl/Cmd + Shift + G` |
| Sélectionner contenu | Double-clic |
| Collapse/Expand | `Ctrl/Cmd + .` |

## Limitations

| Limite | Valeur |
|--------|--------|
| Groupes par workflow | Illimité |
| Nodes par groupe | Illimité |
| Profondeur d'imbrication | 5 niveaux max |

## Voir Aussi

- [Canvas](./canvas.md)
- [Edges](./edges.md)
- [Nodes Overview](./nodes/overview.md)
