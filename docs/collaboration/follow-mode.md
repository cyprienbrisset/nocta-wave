# Mode Suivre

> Suivez le viewport d'un collaborateur pour voir exactement ce qu'il voit.

## Vue d'Ensemble

Le mode Suivre (Follow Mode) synchronise automatiquement votre viewport avec celui d'un autre collaborateur, vous permettant de suivre son travail en temps réel.

![Mode suivre actif](../assets/follow-mode.png)

## Activer le Mode Suivre

### Méthode 1 : Via l'Avatar

1. Cliquez sur l'avatar du collaborateur dans la barre de présence
2. Sélectionnez "Suivre" dans le menu

### Méthode 2 : Double-clic

Double-cliquez directement sur l'avatar pour activer le mode suivre.

### Méthode 3 : Menu Contextuel

Clic droit sur le canvas → "Suivre..." → Sélectionnez un collaborateur

## Indicateur Visuel

Quand le mode suivre est actif :

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 👁️ Vous suivez Alice                      [Arrêter]    │   │ ← Bannière
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                        Canvas                                   │
│                                                                 │
│              ┌──────────────────┐                              │
│              │                  │ ← Bordure colorée            │
│              │   (Alice's view) │   (couleur de l'utilisateur) │
│              │                  │                              │
│              └──────────────────┘                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Éléments Affichés

| Élément | Description |
|---------|-------------|
| Bannière | Affiche qui vous suivez |
| Bordure | Contour de la couleur du collaborateur |
| Bouton Arrêter | Désactive le mode suivre |

## Comportement

### Synchronisation du Viewport

| Aspect | Synchronisé |
|--------|-------------|
| Position (pan) | ✅ |
| Niveau de zoom | ✅ |
| Sélection | ❌ (indépendante) |

### Mise à Jour en Temps Réel

- Le viewport suit immédiatement les mouvements
- Interpolation fluide pour éviter les saccades
- Latence typique : < 100ms

### Actions Automatiques

Quand vous suivez quelqu'un, votre viewport :
- Se centre automatiquement sur leur position
- Adopte leur niveau de zoom
- Suit leurs déplacements

## Désactiver le Mode Suivre

### Méthode 1 : Bouton Arrêter

Cliquez sur "Arrêter" dans la bannière.

### Méthode 2 : Interaction Manuelle

Toute interaction avec le canvas désactive automatiquement le mode :
- Pan (déplacer le canvas)
- Zoom
- Clic sur un node

### Méthode 3 : Touche Échap

Appuyez sur `Escape` pour arrêter de suivre.

### Méthode 4 : Clic sur Avatar

Cliquez à nouveau sur l'avatar → "Arrêter de suivre"

## Cas d'Usage

### Onboarding

Un nouveau membre de l'équipe peut suivre un collègue expérimenté pour apprendre.

```
Senior ──── (fait une démo) ────▶ Canvas
              ▲
              │ suit
              │
Junior ────────────────────────▶ Voit la même chose
```

### Présentation

Montrez un workflow à un groupe en faisant suivre le présentateur.

### Débogage Collaboratif

Reproduisez un problème ensemble en synchronisant les vues.

### Code Review

Passez en revue un workflow ensemble avec le propriétaire qui guide.

## Qui Peut Suivre Qui

| Suiveur | Peut suivre |
|---------|-------------|
| Membre équipe | Tous les membres |
| Invité VIEW | Tous les utilisateurs visibles |
| Invité EDIT | Tous les utilisateurs visibles |

## Limites

| Limite | Valeur |
|--------|--------|
| Suiveurs simultanés | Illimité |
| Personnes suivies | 1 à la fois |
| Latence max | ~100ms |

## Indicateurs pour la Personne Suivie

Quand quelqu'un vous suit, vous voyez :

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 👥 Bob et 2 autres vous suivent                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Détail des Suiveurs

Cliquez sur l'indicateur pour voir la liste :

```
┌─────────────────────┐
│ Vous suivent :      │
│ • Bob               │
│ • Charlie           │
│ • David             │
└─────────────────────┘
```

## Combinaison avec le Chat

Le mode suivre se combine bien avec le chat :

1. Activez le mode suivre
2. Ouvrez le chat
3. Discutez pendant que vous regardez le même workflow

```
┌────────────────────────────────────────────────────────────────┐
│ 👁️ Vous suivez Alice                                          │
├────────────────────────────────────────────────────────────────┤
│                                                    ┌─────────┐ │
│                                                    │  Chat   │ │
│         Canvas (synchro avec Alice)                │─────────│ │
│                                                    │ ...     │ │
│                                                    │ ...     │ │
│                                                    └─────────┘ │
└────────────────────────────────────────────────────────────────┘
```

## API

### Événements WebSocket

```javascript
// Demander à suivre
socket.emit('follow:start', { targetUserId: 'usr_123' });

// Arrêter de suivre
socket.emit('follow:stop');

// Recevoir les mises à jour de viewport
socket.on('viewport:update', ({ userId, viewport }) => {
  if (followingUserId === userId) {
    setViewport(viewport);
  }
});

// Notification de suiveur
socket.on('follow:follower', ({ userId, isFollowing }) => {
  // Quelqu'un vous suit ou a arrêté
});
```

### Structure du Viewport

```javascript
{
  "x": 100,      // Pan X
  "y": 200,      // Pan Y
  "zoom": 1.5    // Niveau de zoom
}
```

## Raccourcis

| Action | Raccourci |
|--------|-----------|
| Arrêter de suivre | `Escape` |
| Suivre (sur avatar) | Double-clic |

## Voir Aussi

- [Vue d'Ensemble](./overview.md)
- [Curseurs Multi-utilisateurs](./cursors.md)
- [Indicateurs de Présence](./presence.md)
