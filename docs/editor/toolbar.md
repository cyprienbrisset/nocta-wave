# Barre d'Outils

> Description complète de la toolbar de l'éditeur de workflows.

## Vue d'Ensemble

La barre d'outils est située en haut de l'éditeur et donne accès à toutes les actions principales.

![Barre d'outils annotée](../assets/toolbar-annotated.png)

## Structure de la Toolbar

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Logo] │ Nom Workflow ▼ │ [+] │ [◀][▶] │ [Debug] │ [▶ Run] │ [⚙] │ [👥] │ [💾] │
└─────────────────────────────────────────────────────────────────────────────┘
     │         │           │      │          │         │        │     │      │
     │         │           │      │          │         │        │     │      └─ Sauvegarder
     │         │           │      │          │         │        │     └─ Collaboration
     │         │           │      │          │         │        └─ Paramètres
     │         │           │      │          │         └─ Exécuter
     │         │           │      │          └─ Mode Debug
     │         │           │      └─ Historique (Undo/Redo)
     │         │           └─ Ajouter un node
     │         └─ Sélecteur de workflow
     └─ Retour au dashboard
```

## Actions Principales

### Logo / Retour

Cliquez sur le logo pour revenir au dashboard.

### Nom du Workflow

- Affiche le nom du workflow actuel
- Cliquez pour ouvrir le menu :
  - Renommer
  - Dupliquer
  - Exporter
  - Supprimer

### Ajouter un Node (+)

Ouvre la bibliothèque de nodes.

| Méthode | Action |
|---------|--------|
| Clic | Ouvre le panel de bibliothèque |
| `Tab` | Raccourci clavier |

La bibliothèque affiche :
- Catégories de nodes
- Barre de recherche
- Nodes récemment utilisés

### Historique (Undo/Redo)

| Bouton | Action | Raccourci |
|--------|--------|-----------|
| ◀ | Annuler | `Ctrl/Cmd + Z` |
| ▶ | Rétablir | `Ctrl/Cmd + Shift + Z` |

L'historique conserve :
- Ajout/suppression de nodes
- Modifications de configuration
- Changements de position
- Connexions/déconnexions

### Mode Debug

Toggle le mode debug pour :
- Afficher la console de debug
- Activer les breakpoints
- Voir le replay d'exécutions

Voir [Console de Debug](../debugging/console.md).

### Exécuter (Run)

Lance une exécution du workflow.

| État | Description |
|------|-------------|
| ▶ Play | Lancer l'exécution |
| ⏸ Pause | En pause (breakpoint atteint) |
| ⏹ Stop | Arrêter l'exécution |

**Options d'exécution :**
- Clic simple : Exécution normale
- Clic droit : Menu avec options
  - Exécuter avec données de test
  - Exécuter à partir d'un node
  - Exécuter en mode debug

### Paramètres (⚙)

Accède aux paramètres du workflow :

| Onglet | Contenu |
|--------|---------|
| Général | Nom, description, tags |
| Variables | Variables du workflow |
| Credentials | Credentials utilisés |
| Paramètres | Timeout, retry, etc. |
| Versions | Historique des versions |

### Collaboration (👥)

Ouvre le panel de collaboration :

- Liste des collaborateurs en ligne
- Chat intégré
- Liens de partage
- Historique des changements

Voir [Collaboration](../collaboration/overview.md).

### Sauvegarder (💾)

| État | Signification |
|------|---------------|
| Gris | Aucune modification |
| Bleu | Modifications non sauvegardées |
| Animation | Sauvegarde en cours |
| Vert (flash) | Sauvegarde réussie |

- **Clic** : Sauvegarde manuelle
- **Auto-save** : Activé par défaut (toutes les 30s)
- **Raccourci** : `Ctrl/Cmd + S`

## Indicateurs de Statut

### Statut du Workflow

Affiché à côté du nom :

| Indicateur | Signification |
|------------|---------------|
| 🟢 Actif | Workflow en production |
| 🔴 Inactif | Workflow désactivé |
| 📝 Brouillon | Non publié |
| ⚠️ Erreur | Problème de configuration |

### Indicateur de Connexion

En bas à droite :

| Indicateur | Signification |
|------------|---------------|
| 🟢 | Connecté au serveur |
| 🟡 | Reconnexion en cours |
| 🔴 | Déconnecté |

## Toolbar Secondaire (Debug)

Quand le mode debug est activé :

```
┌─────────────────────────────────────────────────────────┐
│ [Step Over] │ [Step Into] │ [Continue] │ [Stop] │ [Clear] │
└─────────────────────────────────────────────────────────┘
```

| Bouton | Action | Raccourci |
|--------|--------|-----------|
| Step Over | Exécuter le node suivant | `F10` |
| Step Into | Entrer dans le sous-workflow | `F11` |
| Continue | Reprendre jusqu'au prochain breakpoint | `F5` |
| Stop | Arrêter le debug | `Shift + F5` |
| Clear | Effacer la console | |

## Menu Contextuel

Clic droit sur le canvas ou les nodes :

### Canvas (fond)

```
┌─────────────────────┐
│ Ajouter un node...  │
│ Coller              │
│ Sélectionner tout   │
├─────────────────────┤
│ Créer un groupe     │
│ Organiser           │
├─────────────────────┤
│ Zoom avant          │
│ Zoom arrière        │
│ Ajuster à l'écran   │
└─────────────────────┘
```

### Node

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

## Personnalisation

### Affichage

Dans Paramètres → Éditeur :

| Option | Description |
|--------|-------------|
| Minimap | Afficher la minimap |
| Grille | Afficher la grille |
| Snap to grid | Alignement automatique |
| Animation | Animations fluides |

### Thème

| Thème | Description |
|-------|-------------|
| Dark | Thème sombre (défaut) |
| Light | Thème clair |
| System | Suit les préférences OS |

## Raccourcis de la Toolbar

| Action | Raccourci |
|--------|-----------|
| Ajouter node | `Tab` |
| Annuler | `Ctrl/Cmd + Z` |
| Rétablir | `Ctrl/Cmd + Shift + Z` |
| Sauvegarder | `Ctrl/Cmd + S` |
| Exécuter | `F5` |
| Mode Debug | `Ctrl/Cmd + D` |
| Paramètres | `Ctrl/Cmd + ,` |

## Voir Aussi

- [Canvas](./canvas.md)
- [Raccourcis Clavier](./keyboard-shortcuts.md)
- [Mode Debug](../debugging/console.md)
- [Collaboration](../collaboration/overview.md)
