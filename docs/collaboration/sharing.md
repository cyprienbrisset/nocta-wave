# Liens de Partage

> Invitez des personnes externes à collaborer via des liens sécurisés.

## Vue d'Ensemble

Les liens de partage permettent d'inviter des personnes qui ne font pas partie de votre équipe à voir ou éditer un workflow, sans avoir besoin de créer un compte.

![Panel de partage](../assets/sharing-panel.png)

## Accès au Panel de Partage

1. Ouvrez le workflow à partager
2. Cliquez sur l'icône de partage 🔗 dans la barre d'outils
3. Ou allez dans Menu → Partager

## Créer un Lien de Partage

### Étapes

1. Cliquez sur "Créer un lien"
2. Configurez les options
3. Cliquez sur "Générer"
4. Copiez et partagez le lien

### Options de Configuration

| Option | Description | Valeurs |
|--------|-------------|---------|
| **Permission** | Niveau d'accès | VIEW, COMMENT, EDIT |
| **Expiration** | Durée de validité | 1h, 24h, 7j, 30j, Jamais |
| **Limite d'utilisations** | Nombre max d'accès | 1, 5, 10, 25, Illimité |
| **Mot de passe** | Protection optionnelle | Texte libre |
| **Nom du lien** | Label descriptif | Texte libre |

## Niveaux de Permission

### VIEW (Lecture seule)

| Action | Autorisée |
|--------|-----------|
| Voir le workflow | ✅ |
| Voir l'exécution | ✅ |
| Voir les curseurs | ✅ |
| Lire le chat | ✅ |
| Écrire dans le chat | ❌ |
| Modifier le workflow | ❌ |
| Exécuter | ❌ |

### COMMENT (Commentaire)

| Action | Autorisée |
|--------|-----------|
| Toutes les actions VIEW | ✅ |
| Écrire dans le chat | ✅ |
| Ajouter des commentaires | ✅ |

### EDIT (Édition)

| Action | Autorisée |
|--------|-----------|
| Toutes les actions COMMENT | ✅ |
| Modifier le workflow | ✅ |
| Exécuter | ✅ |
| Gérer les variables | ✅ |
| Supprimer des nodes | ✅ |

## Structure du Lien

```
https://app.ws-flows.com/collaborate/{token}
```

Le token est un identifiant unique cryptographiquement sécurisé.

## Accès via Lien

### Pour l'Invité

1. Cliquez sur le lien reçu
2. Si protégé par mot de passe, saisissez-le
3. Entrez votre nom (affiché aux autres collaborateurs)
4. Accédez au workflow

### Page d'Accueil Invité

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│               🔗 Lien de Partage                    │
│                                                      │
│   Workflow: "Mon Workflow"                          │
│   Partagé par: Alice Martin                         │
│   Permission: Édition                               │
│                                                      │
│   ┌──────────────────────────────────────────────┐  │
│   │ Votre nom                                    │  │
│   │ [Jean Dupont                          ]      │  │
│   └──────────────────────────────────────────────┘  │
│                                                      │
│                              [Accéder au Workflow]   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

## Gestion des Liens

### Panel de Gestion

```
┌─────────────────────────────────────────────────────────────────┐
│ Liens de Partage                                          [+]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ 📎 Pour le client                                          ││
│ │ VIEW • Expire dans 6 jours • 3/10 utilisations             ││
│ │ [Copier] [Modifier] [Révoquer]                             ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ 📎 Équipe externe                                          ││
│ │ EDIT • Jamais • 5/∞ utilisations                           ││
│ │ [Copier] [Modifier] [Révoquer]                             ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Actions sur un Lien

| Action | Description |
|--------|-------------|
| **Copier** | Copie le lien dans le presse-papier |
| **Modifier** | Change les options du lien |
| **Révoquer** | Désactive immédiatement le lien |

### Modifier un Lien

Vous pouvez modifier :
- Le nom du lien
- La date d'expiration
- La limite d'utilisations
- Le mot de passe

⚠️ **Note** : La permission ne peut pas être changée. Créez un nouveau lien si nécessaire.

### Révoquer un Lien

1. Cliquez sur "Révoquer"
2. Confirmez l'action
3. Le lien devient immédiatement invalide
4. Les utilisateurs connectés sont déconnectés

## Utilisateurs Actuellement Connectés

Voyez qui utilise chaque lien :

```
┌─────────────────────────────────────────────────────────────────┐
│ 📎 Pour le client                                              │
│ VIEW • 3/10 utilisations                                       │
├─────────────────────────────────────────────────────────────────┤
│ Utilisateurs actuels :                                          │
│ • Jean (Invité) - en ligne                                     │
│ • Marie (Invité) - inactive depuis 5 min                       │
│ • Pierre (Invité) - hors ligne                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Sécurité

### Bonnes Pratiques

| Pratique | Recommandation |
|----------|----------------|
| Expiration | Définissez toujours une expiration |
| Limite d'usage | Limitez aux utilisateurs attendus |
| Mot de passe | Pour les contenus sensibles |
| Révocation | Révoquez après utilisation |

### Protections

| Protection | Description |
|------------|-------------|
| Token crypté | 256 bits aléatoires |
| HTTPS | Connexion chiffrée |
| Rate limiting | Protection brute force |
| Audit | Tous les accès sont loggés |

### Audit des Accès

Consultez l'historique des accès :

```
┌─────────────────────────────────────────────────────────────────┐
│ Historique des accès                                           │
├─────────────────────────────────────────────────────────────────┤
│ 15 Jan 10:30 • Jean (Invité) • Accès initial                  │
│ 15 Jan 10:35 • Jean (Invité) • Modification Node HTTP         │
│ 15 Jan 11:00 • Marie (Invité) • Accès initial                 │
│ 15 Jan 11:05 • Jean (Invité) • Déconnexion                    │
└─────────────────────────────────────────────────────────────────┘
```

## Limites

| Limite | Valeur |
|--------|--------|
| Liens par workflow | 20 |
| Utilisateurs par lien | Selon configuration |
| Durée max d'expiration | 90 jours |

## API

### Créer un Lien

```http
POST /api/v1/workflows/{id}/share-links
Content-Type: application/json

{
  "permission": "VIEW",
  "expiresIn": "7d",
  "maxUses": 10,
  "password": "optional-password",
  "name": "Pour le client"
}
```

### Réponse

```json
{
  "id": "link_123",
  "token": "abc123xyz...",
  "url": "https://app.ws-flows.com/collaborate/abc123xyz...",
  "permission": "VIEW",
  "expiresAt": "2024-01-22T10:30:00Z",
  "maxUses": 10,
  "usedCount": 0,
  "name": "Pour le client",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Lister les Liens

```http
GET /api/v1/workflows/{id}/share-links
```

### Révoquer un Lien

```http
DELETE /api/v1/workflows/{id}/share-links/{linkId}
```

## Voir Aussi

- [Vue d'Ensemble](./overview.md)
- [Indicateurs de Présence](./presence.md)
- [Historique des Changements](./change-history.md)
