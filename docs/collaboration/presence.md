# Indicateurs de Présence

> Voir qui travaille sur le workflow en temps réel.

## Vue d'Ensemble

Les indicateurs de présence montrent les collaborateurs actuellement connectés au workflow.

![Barre de présence](../assets/presence-avatars.png)

## Barre de Présence

### Emplacement

La barre de présence se trouve en haut à droite de l'éditeur :

```
┌─────────────────────────────────────────────────────────────────┐
│ [Logo] Mon Workflow  │ [Actions] │ [👤][👤][👤] +2 │ [💾] [▶] │
└─────────────────────────────────────────────────────────────────┘
                                         ↑
                                   Barre de présence
```

### Composants

| Élément | Description |
|---------|-------------|
| Avatar | Image de profil ou initiales |
| Bordure colorée | Couleur unique par utilisateur |
| Indicateur en ligne | Point vert si actif |
| Compteur overflow | "+N" si plus de 4 collaborateurs |

## Avatars

### Affichage

```
┌────────────────────────────────────┐
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐          │
│  │ A │ │ B │ │ C │ │+2 │          │
│  └───┘ └───┘ └───┘ └───┘          │
│   ●     ●     ○                    │
│   ↑     ↑     ↑                    │
│   En    En   Inactif               │
│  ligne ligne                       │
└────────────────────────────────────┘
```

### Priorité d'affichage

1. Vous-même (toujours visible)
2. Collaborateurs actifs (dernier mouvement < 5 min)
3. Collaborateurs inactifs
4. Ordre alphabétique en cas d'égalité

### Limite d'affichage

- **Maximum visible** : 4 avatars
- **Overflow** : "+N" indique les collaborateurs supplémentaires
- **Clic sur overflow** : Liste déroulante avec tous les collaborateurs

## États de Présence

| État | Indicateur | Description |
|------|------------|-------------|
| En ligne | 🟢 | Actif dans les 30 dernières secondes |
| Inactif | 🟡 | Pas de mouvement depuis 30s-5min |
| Absent | ⚪ | Pas de mouvement depuis > 5min |
| Hors ligne | ❌ | Déconnecté |

## Informations Utilisateur

### Au Survol

En survolant un avatar :

```
┌─────────────────────┐
│ Alice Martin        │
│ alice@example.com   │
│ ────────────────── │
│ 🟢 En ligne        │
│ Dernière action:    │
│ Modification Node A │
└─────────────────────┘
```

### Actions

- **Clic** : Options d'interaction
- **Double-clic** : Suivre l'utilisateur (mode follow)

## Menu Utilisateur

En cliquant sur un avatar :

```
┌─────────────────────────┐
│ 👁️ Suivre              │
│ 💬 Envoyer un message  │
│ 📍 Voir la position    │
└─────────────────────────┘
```

| Action | Description |
|--------|-------------|
| Suivre | Active le mode follow |
| Envoyer un message | Ouvre le chat avec @mention |
| Voir la position | Centre le viewport sur leur curseur |

## Couleurs Attribuées

Chaque utilisateur reçoit une couleur unique :

| Couleur | Code |
|---------|------|
| Rouge | `#EF4444` |
| Orange | `#F97316` |
| Jaune | `#EAB308` |
| Vert | `#22C55E` |
| Bleu | `#3B82F6` |
| Indigo | `#6366F1` |
| Violet | `#8B5CF6` |
| Rose | `#EC4899` |

Cette couleur est utilisée pour :
- La bordure de l'avatar
- Le curseur sur le canvas
- Les surbrillances de sélection

## Notifications

### Arrivée

Quand un collaborateur rejoint :

```
┌─────────────────────────────────┐
│ 👤 Alice a rejoint le workflow │
└─────────────────────────────────┘
```

### Départ

Quand un collaborateur part :

```
┌───────────────────────────────────┐
│ 👤 Alice a quitté le workflow    │
└───────────────────────────────────┘
```

### Configuration des Notifications

Dans Paramètres → Collaboration :

| Option | Description | Défaut |
|--------|-------------|--------|
| Notifications d'arrivée | Afficher quand quelqu'un rejoint | ✅ |
| Notifications de départ | Afficher quand quelqu'un part | ✅ |
| Son | Jouer un son | ❌ |

## Invités

Les utilisateurs accédant via un lien de partage apparaissent comme invités :

```
┌───┐
│ ? │  ← Avatar générique
└───┘
  Guest
```

Informations affichées :
- Nom saisi lors de la connexion
- Badge "Invité"
- Niveau de permission (VIEW/EDIT)

## API

### Événements WebSocket

```javascript
// Connexion d'un utilisateur
socket.on('user:joined', (user) => {
  console.log(`${user.name} a rejoint`);
});

// Déconnexion d'un utilisateur
socket.on('user:left', (userId) => {
  console.log(`Utilisateur ${userId} a quitté`);
});

// Mise à jour de présence
socket.on('presence:update', (users) => {
  // Liste mise à jour des collaborateurs
});
```

### Données de Présence

```javascript
{
  "userId": "usr_123",
  "name": "Alice Martin",
  "email": "alice@example.com",
  "avatar": "https://...",
  "color": "#3B82F6",
  "isOnline": true,
  "lastActivity": "2024-01-15T10:30:00Z",
  "permission": "edit"
}
```

## Raccourcis

| Action | Raccourci |
|--------|-----------|
| Toggle panel présence | `Ctrl/Cmd + Shift + P` |
| Suivre utilisateur | Clic sur avatar |
| Arrêter de suivre | `Escape` |

## Voir Aussi

- [Vue d'Ensemble](./overview.md)
- [Curseurs Multi-utilisateurs](./cursors.md)
- [Mode Suivre](./follow-mode.md)
