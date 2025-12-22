# Canvas

> Interface de l'éditeur visuel de workflows basé sur React Flow.

## Vue d'Ensemble

Le canvas est l'espace de travail principal où vous construisez vos workflows. Il offre une interface drag-and-drop intuitive pour créer et connecter des nodes.

![Canvas avec workflow](../assets/canvas-with-workflow.png)

## Navigation

### Zoom

| Action | Méthode |
|--------|---------|
| Zoom avant | `Ctrl/Cmd + +` ou molette vers le haut |
| Zoom arrière | `Ctrl/Cmd + -` ou molette vers le bas |
| Réinitialiser zoom | `Ctrl/Cmd + 0` |
| Ajuster à l'écran | `F` |

Le niveau de zoom est affiché en bas à droite (ex: 100%).

### Pan (Déplacement)

- **Clic + glisser** sur le fond du canvas
- **Molette** pour scroll vertical
- **Shift + molette** pour scroll horizontal
- **Clic molette + glisser** pour pan libre

### Ajuster la Vue

| Raccourci | Action |
|-----------|--------|
| `F` | Ajuster tous les nodes à l'écran |
| `Shift + F` | Centrer sur la sélection |
| `1` | Zoom à 100% |

## Sélection

### Sélection Simple

Cliquez sur un node ou un edge pour le sélectionner.

### Sélection Multiple

| Méthode | Description |
|---------|-------------|
| `Ctrl/Cmd + clic` | Ajouter/retirer de la sélection |
| `Shift + clic` | Sélectionner une plage |
| Rectangle de sélection | Glisser sur le canvas |
| `Ctrl/Cmd + A` | Tout sélectionner |

### Désélectionner

- `Escape` pour tout désélectionner
- Cliquer sur le fond du canvas

## Ajouter des Nodes

### Via la Bibliothèque

1. Cliquez sur le bouton **+** dans la toolbar
2. Ou appuyez sur `Tab`
3. Parcourez les catégories ou cherchez
4. Cliquez ou glissez-déposez

### Via le Menu Contextuel

1. Clic droit sur le canvas
2. Sélectionnez "Ajouter un node"
3. Choisissez le type

### Via Glisser-Déposer

Glissez depuis la bibliothèque de nodes vers le canvas.

## Connecter des Nodes

### Créer une Connexion

1. Survolez un node pour voir ses handles (points de connexion)
2. Cliquez sur un handle de sortie (à droite)
3. Glissez vers un handle d'entrée d'un autre node
4. Relâchez pour créer la connexion

```
┌──────────┐          ┌──────────┐
│  Node A  │ ●──────▶ ○ Node B  │
└──────────┘          └──────────┘
     output handle    input handle
```

### Supprimer une Connexion

- Cliquez sur l'edge puis `Delete`
- Ou clic droit sur l'edge → "Supprimer"

### Réorganiser les Connexions

Glissez un handle pour reconnecter à un autre node.

## Manipuler les Nodes

### Déplacer

- Glissez un node pour le déplacer
- Sélectionnez plusieurs nodes pour les déplacer ensemble

### Copier / Coller

| Action | Raccourci |
|--------|-----------|
| Copier | `Ctrl/Cmd + C` |
| Couper | `Ctrl/Cmd + X` |
| Coller | `Ctrl/Cmd + V` |
| Dupliquer | `Ctrl/Cmd + D` |

Les nodes collés sont placés légèrement décalés.

### Supprimer

- Sélectionnez puis `Delete` ou `Backspace`
- Clic droit → "Supprimer"

### Renommer

Double-cliquez sur le titre du node pour le renommer.

## Minimap

La minimap affiche une vue réduite de l'ensemble du workflow.

### Activer/Désactiver

- Cliquez sur l'icône minimap dans la toolbar
- Ou raccourci `M`

### Utilisation

- Cliquez sur la minimap pour naviguer rapidement
- Glissez le rectangle de vue pour déplacer la vue principale
- Les nodes colorés reflètent leur catégorie

## Grille et Alignement

### Grille

- **Afficher/Masquer** : Toggle dans les paramètres
- Les nodes s'alignent automatiquement sur la grille

### Guides d'Alignement

Des lignes de guidage apparaissent lors du déplacement pour aligner les nodes :

```
    ┌─────────┐
    │  Node   │
    └─────────┘
         │ guide d'alignement
    ┌────┴────┐
    │  Node   │
    └─────────┘
```

### Alignement Automatique

Sélectionnez plusieurs nodes, puis :

| Raccourci | Action |
|-----------|--------|
| `Ctrl/Cmd + Shift + H` | Aligner horizontalement |
| `Ctrl/Cmd + Shift + V` | Aligner verticalement |
| `Ctrl/Cmd + Shift + D` | Distribuer uniformément |

## Groupes

Regroupez des nodes visuellement :

1. Sélectionnez les nodes à grouper
2. Clic droit → "Créer un groupe"
3. Choisissez une couleur

Voir [Groupes](./groups.md) pour plus de détails.

## États Visuels

### Node Normal

```
┌─────────────────────┐
│ ● HTTP Request      │  ← Icône + Titre
├─────────────────────┤
│ GET                 │  ← Configuration résumée
│ api.example.com     │
└─────────────────────┘
```

### Node Sélectionné

Bordure bleue avec handles visibles.

### Node en Exécution

```
┌─────────────────────┐
│ ◐ HTTP Request      │  ← Indicateur de progression
│     Running...      │
└─────────────────────┘
```

### Node avec Erreur

```
┌─────────────────────┐
│ ⚠ HTTP Request      │  ← Icône d'erreur
│   │ Timeout error   │  ← Message d'erreur
└───┴─────────────────┘
     bordure rouge
```

### Node avec Breakpoint

```
┌─────────────────────┐
│ ● HTTP Request    ◉ │  ← Point rouge (breakpoint)
└─────────────────────┘
```

## Performance

### Grands Workflows

Pour les workflows avec de nombreux nodes :

- La minimap aide à la navigation
- Les nodes hors écran sont optimisés (virtualisation)
- Utilisez des groupes pour organiser

### Optimisations

| Conseil | Impact |
|---------|--------|
| Limiter le zoom arrière extrême | Meilleures performances |
| Grouper les nodes liés | Meilleure lisibilité |
| Utiliser des sous-workflows | Modularité |

## Raccourcis Canvas

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Ajouter node | `Tab` | `Tab` |
| Zoom + | `Ctrl + +` | `Cmd + +` |
| Zoom - | `Ctrl + -` | `Cmd + -` |
| Ajuster vue | `F` | `F` |
| Tout sélectionner | `Ctrl + A` | `Cmd + A` |
| Désélectionner | `Escape` | `Escape` |
| Supprimer | `Delete` | `Delete` |
| Annuler | `Ctrl + Z` | `Cmd + Z` |
| Rétablir | `Ctrl + Shift + Z` | `Cmd + Shift + Z` |
| Minimap | `M` | `M` |

## Voir Aussi

- [Barre d'Outils](./toolbar.md)
- [Raccourcis Clavier](./keyboard-shortcuts.md)
- [Edges](./edges.md)
- [Groupes](./groups.md)
