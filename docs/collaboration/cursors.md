# Curseurs Multi-utilisateurs

> Voir les mouvements des collaborateurs en temps réel sur le canvas.

## Vue d'Ensemble

Les curseurs collaboratifs permettent de voir où chaque collaborateur travaille sur le canvas, facilitant la coordination en temps réel.

![Curseurs collaboratifs](../assets/collaborative-cursors.png)

## Affichage des Curseurs

### Apparence

```
                 ┌───────────┐
                 │   Alice   │ ← Nom du collaborateur
                 └───────────┘
                      ▲
                     ╱
                    ╱   ← Pointeur avec couleur unique
                   ◢

   ┌──────────────────────────────┐
   │         Node HTTP            │
   └──────────────────────────────┘
```

### Composants

| Élément | Description |
|---------|-------------|
| Pointeur | Forme de curseur avec couleur unique |
| Label | Nom de l'utilisateur |
| Animation | Mouvement fluide avec interpolation |

## Comportement

### Mise à Jour

| Aspect | Valeur |
|--------|--------|
| Fréquence d'envoi | 50ms (throttled) |
| Interpolation | Animation fluide |
| Timeout d'inactivité | 5 secondes |

### Cycle de Vie

1. **Apparition** : Quand l'utilisateur entre sur le canvas
2. **Mouvement** : Suivi en temps réel
3. **Disparition** : Après 5s d'inactivité ou déconnexion

### Transformation des Coordonnées

Les positions sont synchronisées en coordonnées du workflow (pas en pixels écran) :

```javascript
// Position envoyée
{
  "x": 450,      // Position dans le canvas
  "y": 300,      // (coordonnées React Flow)
  "userId": "usr_123"
}
```

Cela garantit que les curseurs s'affichent correctement quel que soit le niveau de zoom.

## Couleurs

Chaque utilisateur a une couleur unique :

| Utilisateur | Couleur | Hex |
|-------------|---------|-----|
| Utilisateur 1 | 🔴 Rouge | `#EF4444` |
| Utilisateur 2 | 🟢 Vert | `#22C55E` |
| Utilisateur 3 | 🔵 Bleu | `#3B82F6` |
| Utilisateur 4 | 🟣 Violet | `#8B5CF6` |
| Utilisateur 5 | 🟠 Orange | `#F97316` |
| ... | ... | ... |

La couleur est attribuée automatiquement et reste cohérente avec l'avatar dans la barre de présence.

## Interactions

### Voir un Curseur

Les curseurs sont toujours visibles, même si l'utilisateur travaille dans une zone hors de votre viewport.

### Aller vers un Curseur

1. Cliquez sur l'avatar dans la barre de présence
2. Sélectionnez "Voir la position"
3. Le viewport se centre sur le curseur

### Suivre un Curseur

1. Cliquez sur l'avatar dans la barre de présence
2. Sélectionnez "Suivre"
3. Votre viewport suit automatiquement leurs mouvements

Voir [Mode Suivre](./follow-mode.md) pour plus de détails.

## Optimisations

### Throttling

Pour éviter de surcharger le réseau :

- Les positions sont envoyées maximum toutes les 50ms
- Les positions identiques ne sont pas renvoyées
- Les mouvements sont interpolés côté client

### Hors du Viewport

Les curseurs hors du viewport sont indiqués par un indicateur directionnel :

```
┌──────────────────────────────────────┐
│                                      │
│  ◀ Alice                             │ ← Indicateur gauche
│                                      │
│                          Bob ▶       │ ← Indicateur droit
│                                      │
│                                      │
│                              ▼       │
│                            Charlie   │ ← Indicateur bas
└──────────────────────────────────────┘
```

### Performances

| Limite | Valeur |
|--------|--------|
| Curseurs affichés max | 20 |
| Fréquence mise à jour | 50ms |
| Délai de disparition | 5s inactif |

## Configuration

### Activer/Désactiver

Dans Paramètres → Collaboration :

| Option | Description | Défaut |
|--------|-------------|--------|
| Afficher les curseurs | Voir les curseurs des autres | ✅ |
| Partager mon curseur | Envoyer ma position | ✅ |
| Afficher les noms | Label avec le nom | ✅ |

### Via les Préférences Utilisateur

```javascript
// Dans le profil utilisateur
{
  "collaboration": {
    "showCursors": true,
    "shareCursor": true,
    "showCursorNames": true
  }
}
```

## Implémentation Technique

### Envoi de Position (React Hook)

```typescript
// Hook useCursorTracking
export function useCursorTracking(
  onMove: (position: CursorPosition) => void,
  enabled: boolean = true,
  throttleMs: number = 50
) {
  // Throttle les mises à jour
  const throttledOnMove = useThrottle(onMove, throttleMs);

  useEffect(() => {
    if (!enabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Convertir en coordonnées canvas
      const canvasPosition = screenToCanvas({ x: e.clientX, y: e.clientY });
      throttledOnMove(canvasPosition);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [enabled, throttledOnMove]);
}
```

### Réception des Positions

```typescript
// Écoute des mises à jour
socket.on('cursor:update', (data: { userId: string; position: Position }) => {
  setCursors((prev) => ({
    ...prev,
    [data.userId]: {
      ...prev[data.userId],
      position: data.position,
      lastUpdate: Date.now()
    }
  }));
});
```

### Animation (Framer Motion)

```tsx
<motion.div
  initial={false}
  animate={{
    x: cursor.position.x,
    y: cursor.position.y
  }}
  transition={{
    type: "spring",
    stiffness: 300,
    damping: 25
  }}
>
  <CursorIcon color={cursor.color} />
  <span>{cursor.name}</span>
</motion.div>
```

## Dépannage

### Curseur ne s'affiche pas

1. Vérifiez que l'option est activée dans les paramètres
2. Vérifiez la connexion WebSocket (indicateur dans la toolbar)
3. Rechargez la page

### Curseur saccadé

1. Connexion réseau lente
2. Trop de collaborateurs actifs
3. Navigateur surchargé

### Curseur mal positionné

1. Bug rare lié au zoom
2. Rechargez la page
3. Signalez le bug avec les détails

## Voir Aussi

- [Vue d'Ensemble](./overview.md)
- [Indicateurs de Présence](./presence.md)
- [Mode Suivre](./follow-mode.md)
