# Premier Workflow

> Créez votre premier workflow en 5 minutes avec WS-Flows.

## Objectif

Dans ce tutoriel, nous allons créer un workflow simple qui :
1. Se déclenche via un webhook
2. Transforme les données reçues
3. Envoie une requête HTTP

![Workflow exemple](../assets/first-workflow.png)

## Étape 1 : Créer un Nouveau Workflow

1. Connectez-vous à WS-Flows
2. Cliquez sur **"Nouveau Workflow"** dans le dashboard
3. Donnez un nom à votre workflow : `Mon Premier Workflow`
4. Cliquez sur **"Créer"**

Vous êtes maintenant dans l'éditeur de workflow.

## Étape 2 : Ajouter le Trigger Webhook

Le trigger est le point d'entrée de votre workflow.

1. **Ouvrir la bibliothèque** : Cliquez sur le bouton **+** ou appuyez sur `Tab`
2. **Chercher "Webhook"** : Tapez "webhook" dans la barre de recherche
3. **Ajouter le node** : Cliquez sur "Webhook" ou glissez-déposez sur le canvas

### Configuration du Webhook

Cliquez sur le node pour ouvrir le panneau de configuration :

| Option | Valeur |
|--------|--------|
| Path | `/test` |
| Method | `POST` |
| Response Mode | `Last Node` |

Le webhook sera accessible à : `http://localhost:3001/webhooks/{workflow-id}/test`

## Étape 3 : Ajouter une Transformation

Nous allons transformer les données reçues.

1. Cliquez sur **+** pour ajouter un nouveau node
2. Sélectionnez **"Transform > Set"**
3. Connectez le Webhook au node Set (glissez depuis le handle de sortie)

### Configuration du Set

```javascript
{
  "message": "Bonjour {{$trigger.body.name}}!",
  "timestamp": "{{new Date().toISOString()}}",
  "processed": true
}
```

## Étape 4 : Ajouter une Requête HTTP

1. Ajoutez un node **"HTTP > Request"**
2. Connectez le node Set au node HTTP Request

### Configuration HTTP

| Option | Valeur |
|--------|--------|
| URL | `https://httpbin.org/post` |
| Method | `POST` |
| Body | `{{$nodes.Set.output}}` |

## Étape 5 : Sauvegarder et Activer

1. **Sauvegarder** : Cliquez sur le bouton "Enregistrer" ou appuyez sur `Ctrl/Cmd + S`
2. **Activer** : Basculez le switch "Actif" dans la barre d'outils

Votre workflow ressemble maintenant à ceci :

```
┌──────────┐      ┌───────┐      ┌──────────────┐
│ Webhook  │ ───▶ │  Set  │ ───▶ │ HTTP Request │
└──────────┘      └───────┘      └──────────────┘
```

## Étape 6 : Tester le Workflow

### Via l'Interface

1. Cliquez sur le bouton **"Exécuter"** (icône Play)
2. Entrez les données de test :

```json
{
  "name": "Alice"
}
```

3. Cliquez sur **"Lancer"**

### Via cURL

```bash
curl -X POST http://localhost:3001/webhooks/{workflow-id}/test \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice"}'
```

## Étape 7 : Voir les Résultats

### Panel d'Exécution

Après l'exécution, le panel de droite affiche :

- **Statut** : Succès ou Erreur
- **Durée** : Temps d'exécution
- **Logs** : Détails de chaque node

### Inspecter les Données

Cliquez sur chaque node pour voir ses données :

**Webhook Output :**
```json
{
  "body": { "name": "Alice" },
  "headers": { ... },
  "method": "POST"
}
```

**Set Output :**
```json
{
  "message": "Bonjour Alice!",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "processed": true
}
```

**HTTP Request Output :**
```json
{
  "status": 200,
  "data": { ... }
}
```

## Résumé

Vous avez créé un workflow complet avec :

| Node | Rôle |
|------|------|
| Webhook | Réception des requêtes HTTP |
| Set | Transformation des données |
| HTTP Request | Appel API externe |

## Exercice : Aller Plus Loin

Essayez d'améliorer ce workflow :

1. **Ajouter une condition** : N'envoyer la requête que si `name` existe
2. **Gérer les erreurs** : Ajouter un node de logging en cas d'échec
3. **Utiliser des variables** : Stocker l'URL dans une variable de workflow

## Raccourcis Utilisés

| Action | Raccourci |
|--------|-----------|
| Ajouter un node | `Tab` ou `+` |
| Sauvegarder | `Ctrl/Cmd + S` |
| Exécuter | `F5` |
| Annuler | `Ctrl/Cmd + Z` |

## Prochaine Étape

Découvrez les [Concepts Clés](./concepts.md) pour comprendre en profondeur le fonctionnement de WS-Flows.

## Voir Aussi

- [Nodes Trigger](../editor/nodes/triggers.md)
- [Nodes Transform](../editor/nodes/transform.md)
- [Nodes HTTP](../editor/nodes/http.md)
- [Variables](../data/variables.md)
