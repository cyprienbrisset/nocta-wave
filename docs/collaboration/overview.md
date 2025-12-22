# Collaboration - Vue d'Ensemble

> Travaillez en temps réel avec votre équipe sur les mêmes workflows.

## Fonctionnalités

WS-Flows offre des fonctionnalités de collaboration en temps réel permettant à plusieurs utilisateurs de travailler simultanément sur un workflow.

![Collaboration active](../assets/collaboration-overview.png)

## Fonctionnalités Disponibles

| Fonctionnalité | Description |
|----------------|-------------|
| [Présence](./presence.md) | Voir qui est connecté |
| [Curseurs](./cursors.md) | Voir les curseurs des collaborateurs |
| [Chat](./chat.md) | Communiquer en temps réel |
| [Mode Suivre](./follow-mode.md) | Suivre le viewport d'un collaborateur |
| [Liens de Partage](./sharing.md) | Inviter des personnes externes |
| [Historique](./change-history.md) | Voir les modifications en temps réel |

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        Navigateur A                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Éditeur de Workflow                    │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────────────────────┐   │  │
│  │  │ Présence│  │ Curseurs│  │     Canvas              │   │  │
│  │  └─────────┘  └─────────┘  └─────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │ WebSocket                        │
└──────────────────────────────┼──────────────────────────────────┘
                               ▼
                    ┌──────────────────────┐
                    │    Serveur Backend   │
                    │  ┌────────────────┐  │
                    │  │ Collaboration  │  │
                    │  │   Gateway      │  │
                    │  └────────────────┘  │
                    │          │           │
                    │     ┌────┴────┐      │
                    │     │  Redis  │      │
                    │     └─────────┘      │
                    └──────────────────────┘
                               ▲
                               │ WebSocket
┌──────────────────────────────┼──────────────────────────────────┐
│                        Navigateur B                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Éditeur de Workflow                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Activation

La collaboration est automatiquement activée pour tous les workflows. Dès qu'un utilisateur ouvre un workflow, il rejoint la session collaborative.

### Prérequis

- Compte utilisateur actif
- Membre de l'équipe propriétaire du workflow
- OU accès via lien de partage

## Indicateurs Visuels

### Barre de Présence

En haut à droite de l'éditeur :

```
┌─────────────────────────────────────────────────────────┐
│ [Logo] Workflow Name  │ [...] │ 👤 👤 👤 +2 │ [💾] [▶] │
└─────────────────────────────────────────────────────────┘
                                    ↑
                            Avatars des collaborateurs
```

### Curseurs sur le Canvas

Les curseurs des autres utilisateurs sont visibles avec leur nom :

```
                    Alice ◀──── Curseur avec label
                    ↓
   ┌──────────┐    ▲
   │  Node A  │
   └──────────┘

       ▼
     Bob ◀──────────────────── Autre curseur
```

### Chat Intégré

Panneau de chat accessible via l'icône 💬 :

```
┌─────────────────────────────────────┐
│ Chat                           [X]  │
├─────────────────────────────────────┤
│                                     │
│ Alice: Le webhook est prêt         │
│ Bob: Je teste maintenant           │
│                                     │
├─────────────────────────────────────┤
│ [Message...]              [Envoyer] │
└─────────────────────────────────────┘
```

## Événements Temps Réel

### Événements Synchronisés

| Événement | Description | Synchronisation |
|-----------|-------------|-----------------|
| Node ajouté | Nouveau node sur le canvas | Immédiate |
| Node déplacé | Changement de position | Temps réel (throttled) |
| Node modifié | Configuration changée | Immédiate |
| Node supprimé | Retrait du canvas | Immédiate |
| Edge créé | Nouvelle connexion | Immédiate |
| Edge supprimé | Connexion retirée | Immédiate |

### Résolution des Conflits

En cas de modification simultanée du même élément :

1. **Last-write-wins** : La dernière modification prévaut
2. **Notification** : Les utilisateurs sont informés
3. **Historique** : Les versions précédentes sont conservées

## Permissions

### Niveaux d'Accès

| Niveau | Description | Actions |
|--------|-------------|---------|
| **VIEW** | Lecture seule | Voir le workflow, curseurs, chat |
| **COMMENT** | Commentaire | + Ajouter des commentaires |
| **EDIT** | Édition | + Modifier le workflow |

### Attribution des Permissions

| Source | Permission par défaut |
|--------|----------------------|
| Propriétaire du workflow | EDIT |
| Membre de l'équipe | EDIT |
| Lien de partage VIEW | VIEW |
| Lien de partage EDIT | EDIT |
| Invité | Selon le lien |

## Limitations

| Limite | Valeur | Notes |
|--------|--------|-------|
| Collaborateurs simultanés | 20 | Par workflow |
| Fréquence curseur | 50ms | Throttling |
| Messages chat | 1000 | Par session |
| Historique temps réel | 100 | Derniers changements |

## Bonnes Pratiques

### Communication

1. Utilisez le chat pour coordonner les modifications
2. Mentionnez avec `@username` pour notifier
3. Prévenez avant de modifier une zone travaillée par un autre

### Organisation

1. Utilisez des groupes pour délimiter les zones de travail
2. Nommez clairement les nodes
3. Travaillez sur des branches différentes pour les gros changements

### Performance

1. Évitez trop de modifications simultanées sur le même node
2. Limitez le nombre de collaborateurs en édition active
3. Utilisez le mode VIEW pour les observateurs

## Voir Aussi

- [Indicateurs de Présence](./presence.md)
- [Curseurs Multi-utilisateurs](./cursors.md)
- [Chat Intégré](./chat.md)
- [Mode Suivre](./follow-mode.md)
- [Liens de Partage](./sharing.md)
- [Historique des Changements](./change-history.md)
