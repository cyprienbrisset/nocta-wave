# Chat Intégré

> Communiquez en temps réel avec votre équipe.

## Vue d'Ensemble

Le chat intégré permet aux collaborateurs de communiquer directement dans l'éditeur de workflow, sans quitter le contexte de travail.

![Panel de chat](../assets/workflow-chat.png)

## Accès au Chat

### Ouvrir le Panel

- Cliquez sur l'icône 💬 dans la barre d'outils
- Ou utilisez le raccourci `Ctrl/Cmd + Shift + C`

### Structure du Panel

```
┌─────────────────────────────────────┐
│ 💬 Chat                        [X] │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Alice                     10:30 │ │
│ │ Le webhook est configuré       │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Bob                       10:32 │ │
│ │ @Alice super, je teste         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Alice                     10:33 │ │
│ │ 👍                             │ │
│ └─────────────────────────────────┘ │
│                                     │
├─────────────────────────────────────┤
│ Alice tape...                       │
├─────────────────────────────────────┤
│ [Message...               ] [Envoyer]│
└─────────────────────────────────────┘
```

## Fonctionnalités

### Envoyer un Message

1. Tapez votre message dans le champ de saisie
2. Appuyez sur `Entrée` ou cliquez sur "Envoyer"

### Mentions (@)

Mentionnez un collaborateur pour le notifier :

```
@Alice peux-tu vérifier le node HTTP ?
```

- Tapez `@` pour voir la liste des collaborateurs
- Sélectionnez avec les flèches et `Entrée`
- L'utilisateur mentionné reçoit une notification

### Réponses (Threading)

Répondez à un message spécifique :

1. Survolez un message
2. Cliquez sur l'icône de réponse ↩️
3. Votre message sera lié au message original

```
┌─────────────────────────────────────┐
│ Alice                         10:30 │
│ Que pensez-vous du design ?        │
│                                     │
│   ┌─────────────────────────────┐  │
│   │ ↳ Bob              10:32    │  │
│   │ J'aime bien !               │  │
│   └─────────────────────────────┘  │
│                                     │
│   ┌─────────────────────────────┐  │
│   │ ↳ Charlie          10:33    │  │
│   │ +1                          │  │
│   └─────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Emojis

- Cliquez sur 😀 pour ouvrir le picker d'emojis
- Ou utilisez les raccourcis : `:thumbsup:` → 👍

### Édition de Message

1. Survolez votre message
2. Cliquez sur l'icône ✏️
3. Modifiez et confirmez

Le message affichera "(modifié)" après édition.

### Suppression de Message

1. Survolez votre message
2. Cliquez sur l'icône 🗑️
3. Confirmez la suppression

## Indicateur "Quelqu'un Tape"

Quand un collaborateur est en train d'écrire :

```
┌─────────────────────────────────────┐
│ Alice tape...                       │ ← Indicateur
│ ou                                  │
│ Alice et Bob tapent...              │
└─────────────────────────────────────┘
```

L'indicateur disparaît après 3 secondes d'inactivité.

## Notifications

### Types de Notifications

| Type | Condition | Action |
|------|-----------|--------|
| Mention | `@votreNom` | Notification + son (optionnel) |
| Réponse | Réponse à votre message | Notification |
| Nouveau message | Panel fermé | Badge sur l'icône |

### Badge de Notification

```
┌────┐
│ 💬 │ 3  ← Nombre de messages non lus
└────┘
```

### Configuration

Dans Paramètres → Notifications :

| Option | Description | Défaut |
|--------|-------------|--------|
| Notifications de mention | Notifier quand mentionné | ✅ |
| Notifications de réponse | Notifier des réponses | ✅ |
| Son | Jouer un son | ❌ |
| Notifications navigateur | Notifications système | ❌ |

## Formatage

### Markdown Basique

| Syntaxe | Rendu |
|---------|-------|
| `**gras**` | **gras** |
| `*italique*` | *italique* |
| `` `code` `` | `code` |
| `[lien](url)` | lien cliquable |

### Blocs de Code

````
```javascript
const result = await api.call();
```
````

### Liens vers Nodes

Référencez un node :

```
Regarde le node #HTTP_Request_1
```

Cliquer sur le lien centre le viewport sur le node.

## Historique

### Persistance

- Les messages sont stockés pendant la session
- L'historique est chargé à l'ouverture du workflow
- Maximum 1000 messages conservés

### Recherche

1. Cliquez sur l'icône 🔍 dans le header du chat
2. Saisissez votre recherche
3. Les résultats sont filtrés en temps réel

## Permissions

| Permission | Actions Chat |
|------------|--------------|
| VIEW | Lire les messages |
| COMMENT | Lire + Écrire |
| EDIT | Lire + Écrire |

Les invités avec permission VIEW peuvent voir le chat mais pas écrire.

## Raccourcis

| Action | Raccourci |
|--------|-----------|
| Ouvrir/Fermer le chat | `Ctrl/Cmd + Shift + C` |
| Envoyer le message | `Entrée` |
| Nouvelle ligne | `Shift + Entrée` |
| Mentionner | `@` puis sélection |
| Emoji picker | `:` puis recherche |

## API

### Structure d'un Message

```javascript
{
  "id": "msg_123",
  "content": "Hello @Alice!",
  "authorId": "usr_456",
  "author": {
    "id": "usr_456",
    "name": "Bob",
    "avatar": "https://..."
  },
  "mentions": ["usr_789"],
  "parentId": null,  // ou ID du message parent
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": null  // ou date de modification
}
```

### Événements WebSocket

```javascript
// Nouveau message
socket.on('chat:message', (message) => {
  // Ajouter à la liste
});

// Message modifié
socket.on('chat:updated', (message) => {
  // Mettre à jour
});

// Message supprimé
socket.on('chat:deleted', (messageId) => {
  // Retirer de la liste
});

// Indicateur de frappe
socket.on('chat:typing', ({ userId, isTyping }) => {
  // Afficher/masquer l'indicateur
});
```

## Voir Aussi

- [Vue d'Ensemble](./overview.md)
- [Indicateurs de Présence](./presence.md)
- [Historique des Changements](./change-history.md)
