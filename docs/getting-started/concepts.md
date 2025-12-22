# Concepts Clés

> Comprendre les fondamentaux de WS-Flows.

## Vue d'Ensemble

WS-Flows est construit autour de concepts simples mais puissants qui permettent de créer des automatisations complexes.

```
┌─────────────────────────────────────────────────────────────┐
│                        Workflow                              │
│                                                              │
│  ┌─────────┐     ┌──────┐     ┌──────┐     ┌──────┐        │
│  │ Trigger │ ──▶ │ Node │ ──▶ │ Node │ ──▶ │ Node │        │
│  └─────────┘     └──────┘     └──────┘     └──────┘        │
│                       │            │                         │
│                       └────────────┴────▶ Edges             │
│                                                              │
│  Variables  │  Credentials  │  Contexte d'exécution         │
└─────────────────────────────────────────────────────────────┘
```

## Workflow

Un **workflow** est une séquence automatisée d'actions. Il définit :

- **Quand** l'automatisation se déclenche (Trigger)
- **Quoi** faire (Nodes)
- **Comment** les données circulent (Edges)

### États d'un Workflow

| État | Description |
|------|-------------|
| Brouillon | Non exécutable, en cours d'édition |
| Actif | Prêt à recevoir des triggers |
| Inactif | Désactivé temporairement |
| Archivé | Conservé mais non utilisable |

## Nodes

Les **nodes** sont les unités de base d'un workflow. Chaque node effectue une action spécifique.

### Structure d'un Node

```
┌─────────────────────────────────────┐
│           Node Name                  │
├─────────────────────────────────────┤
│  ○ Input 1                          │
│  ○ Input 2                          │
├─────────────────────────────────────┤
│                                     │
│         Configuration               │
│                                     │
├─────────────────────────────────────┤
│                          Output ○   │
└─────────────────────────────────────┘
```

### Catégories de Nodes

| Catégorie | Description | Couleur |
|-----------|-------------|---------|
| **Triggers** | Points d'entrée du workflow | Violet |
| **HTTP** | Requêtes et réponses HTTP | Bleu |
| **Transform** | Manipulation de données | Vert |
| **Logic** | Contrôle du flux | Orange |
| **Database** | Opérations base de données | Cyan |
| **Integrations** | Services tiers | Indigo |
| **Utility** | Outils divers | Gris |

### Inputs et Outputs

- **Input** : Données reçues du node précédent
- **Output** : Données envoyées au node suivant

Chaque node peut avoir plusieurs inputs et outputs pour créer des flux complexes.

## Edges (Connexions)

Les **edges** connectent les nodes entre eux et définissent le flux de données.

### Types de Connexions

```
Standard:     A ───────▶ B     (exécution séquentielle)

Conditionnel: A ─┬─ true ─▶ B  (branching)
                └─ false ─▶ C

Parallèle:    A ─┬─────────▶ B  (exécution parallèle)
                └─────────▶ C
```

### Propriétés d'un Edge

- **Source** : Node de départ
- **Target** : Node d'arrivée
- **Handle** : Point de connexion spécifique
- **Label** : Étiquette optionnelle (pour les conditions)

## Triggers

Les **triggers** sont des nodes spéciaux qui déclenchent l'exécution du workflow.

### Types de Triggers

| Type | Description | Exemple |
|------|-------------|---------|
| **Manual** | Déclenché manuellement | Bouton "Exécuter" |
| **Webhook** | Requête HTTP entrante | `POST /webhooks/...` |
| **Cron** | Planification temporelle | `0 9 * * *` (9h quotidien) |
| **Event** | Événement système | Création d'utilisateur |
| **Queue** | Message de file d'attente | RabbitMQ, SQS |

### Données du Trigger

Le trigger fournit les données initiales accessibles via `$trigger` :

```javascript
// Webhook
$trigger.body      // Corps de la requête
$trigger.headers   // En-têtes HTTP
$trigger.query     // Paramètres URL

// Cron
$trigger.scheduledTime  // Heure planifiée
$trigger.lastRun        // Dernière exécution

// Event
$trigger.eventType     // Type d'événement
$trigger.payload       // Données de l'événement
```

## Exécution

Une **exécution** est une instance de workflow en cours ou terminée.

### Cycle de Vie d'une Exécution

```
┌─────────┐    ┌─────────┐    ┌───────────┐
│ Pending │ ─▶ │ Running │ ─▶ │ Completed │
└─────────┘    └─────────┘    └───────────┘
                    │                │
                    ▼                ▼
               ┌─────────┐    ┌────────┐
               │  Failed │    │Cancelled│
               └─────────┘    └────────┘
```

### États des Nodes

| État | Description |
|------|-------------|
| `pending` | En attente d'exécution |
| `running` | En cours d'exécution |
| `completed` | Exécution réussie |
| `failed` | Exécution échouée |
| `skipped` | Ignoré (condition non remplie) |

### Logs d'Exécution

Chaque exécution génère des logs :

```javascript
{
  "executionId": "exec_123",
  "nodeId": "node_abc",
  "status": "completed",
  "input": { ... },
  "output": { ... },
  "duration": 150,  // ms
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Contexte d'Exécution

Le **contexte** contient toutes les données accessibles pendant l'exécution.

### Variables Système

| Variable | Description |
|----------|-------------|
| `$trigger` | Données du trigger |
| `$nodes` | Outputs des nodes précédents |
| `$env` | Variables d'environnement |
| `$execution` | Métadonnées de l'exécution |
| `$workflow` | Informations du workflow |

### Accès aux Données des Nodes

```javascript
// Output du node "Transform1"
$nodes.Transform1.output

// Accès imbriqué
$nodes.HttpRequest.output.data.users[0].name

// Output du node précédent (raccourci)
$prev.output
```

## Variables de Workflow

Les **variables** permettent de stocker des valeurs réutilisables.

### Types de Variables

| Type | Exemple | Description |
|------|---------|-------------|
| `string` | `"Hello"` | Texte |
| `number` | `42` | Nombre |
| `boolean` | `true` | Vrai/Faux |
| `json` | `{"key": "value"}` | Objet JSON |

### Syntaxe d'Interpolation

```javascript
// Dans la configuration d'un node
"URL": "{{variables.apiUrl}}/users"
"Token": "Bearer {{variables.apiToken}}"

// Expression JavaScript
"Total": "{{variables.price * variables.quantity}}"
```

## Credentials

Les **credentials** stockent les informations d'authentification de manière sécurisée.

### Types Supportés

| Type | Utilisation |
|------|-------------|
| **API Key** | Services REST |
| **OAuth2** | Google, GitHub, etc. |
| **Basic Auth** | Authentification simple |
| **Database** | Connexions BDD |
| **AWS** | Services Amazon |

### Sécurité

- Chiffrement AES-256
- Jamais exposés dans les logs
- Accès contrôlé par équipe

## Expressions

Les **expressions** permettent d'insérer de la logique dynamique.

### Syntaxe

```javascript
// Interpolation simple
"Hello {{$trigger.body.name}}"

// Expression JavaScript
"{{$trigger.body.items.length > 0 ? 'Has items' : 'Empty'}}"

// Fonctions utilitaires
"{{$formatDate($trigger.body.date, 'YYYY-MM-DD')}}"
```

### Fonctions Disponibles

| Fonction | Description |
|----------|-------------|
| `$formatDate(date, format)` | Formatage de date |
| `$uuid()` | Génère un UUID |
| `$now()` | Timestamp actuel |
| `$hash(value, algo)` | Hash cryptographique |
| `$base64Encode/Decode` | Encodage Base64 |

## Résumé

| Concept | Description |
|---------|-------------|
| **Workflow** | Séquence automatisée d'actions |
| **Node** | Unité d'action |
| **Edge** | Connexion entre nodes |
| **Trigger** | Point d'entrée |
| **Exécution** | Instance de workflow |
| **Variable** | Valeur réutilisable |
| **Credential** | Authentification sécurisée |
| **Expression** | Logique dynamique |

## Voir Aussi

- [Canvas de l'Éditeur](../editor/canvas.md)
- [Tous les Nodes](../editor/nodes/overview.md)
- [Variables](../data/variables.md)
- [Expressions](../data/expressions.md)
- [Credentials](../credentials/overview.md)
