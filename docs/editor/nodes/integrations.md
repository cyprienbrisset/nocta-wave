# Nodes Integrations

> Connectez-vous à plus de 60 services tiers.

## Vue d'Ensemble

Les nodes d'intégration permettent d'interagir avec des services externes populaires sans avoir à gérer manuellement les APIs.

## Catégories d'Intégrations

| Catégorie | Services | Description |
|-----------|----------|-------------|
| [Communication](#communication) | 8 | Email, chat, SMS |
| [CRM](#crm) | 5 | Gestion clients |
| [Taskboard](#taskboard) | 6 | Gestion de projets |
| [E-commerce](#e-commerce) | 4 | Boutiques en ligne |
| [Cloud](#cloud) | 6 | Services cloud |
| [Data](#data) | 5 | Stockage et données |
| [AI](#ai) | 4 | Intelligence artificielle |
| [Messaging](#messaging) | 4 | Files de messages |
| [Payments](#payments) | 3 | Paiements |
| [Dev Tools](#dev-tools) | 5 | Outils développeur |
| [Social](#social) | 5 | Réseaux sociaux |
| [Analytics](#analytics) | 4 | Suivi et analytics |

---

## Communication

### Slack

| Opération | Description |
|-----------|-------------|
| Send Message | Envoyer un message à un channel |
| Send DM | Envoyer un message direct |
| Create Channel | Créer un channel |
| Upload File | Téléverser un fichier |
| Get User | Récupérer les infos d'un utilisateur |

**Exemple - Envoyer un message :**

```javascript
{
  "channel": "#notifications",
  "text": "Nouvelle commande de {{$trigger.body.customerName}}",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Commande #{{$trigger.body.orderId}}*\nMontant: {{$trigger.body.amount}}€"
      }
    }
  ]
}
```

### Discord

| Opération | Description |
|-----------|-------------|
| Send Message | Message dans un channel |
| Send Webhook | Via webhook Discord |
| Create Thread | Créer un fil |

### Microsoft Teams

| Opération | Description |
|-----------|-------------|
| Send Message | Message dans un channel |
| Create Meeting | Créer une réunion |
| Get Channels | Lister les channels |

### Telegram

| Opération | Description |
|-----------|-------------|
| Send Message | Message texte |
| Send Photo | Envoyer une image |
| Send Document | Envoyer un fichier |

### WhatsApp (Business API)

| Opération | Description |
|-----------|-------------|
| Send Message | Message texte |
| Send Template | Message template |
| Send Media | Envoyer un média |

### Gmail

| Opération | Description |
|-----------|-------------|
| Send Email | Envoyer un email |
| Get Emails | Lister les emails |
| Create Draft | Créer un brouillon |
| Add Label | Ajouter un label |

**Exemple - Envoyer un email :**

```javascript
{
  "to": "{{$input.email}}",
  "subject": "Confirmation de votre commande #{{$input.orderId}}",
  "html": "<h1>Merci pour votre commande!</h1><p>Détails: ...</p>"
}
```

### SendGrid

| Opération | Description |
|-----------|-------------|
| Send Email | Email transactionnel |
| Send Template | Email avec template |

### Twilio

| Opération | Description |
|-----------|-------------|
| Send SMS | Envoyer un SMS |
| Make Call | Initier un appel |
| Send WhatsApp | Message WhatsApp |

---

## CRM

### Salesforce

| Opération | Description |
|-----------|-------------|
| Create Record | Créer un enregistrement |
| Update Record | Modifier un enregistrement |
| Get Record | Récupérer un enregistrement |
| Query | Requête SOQL |
| Delete Record | Supprimer |

### HubSpot

| Opération | Description |
|-----------|-------------|
| Create Contact | Créer un contact |
| Update Contact | Modifier un contact |
| Create Deal | Créer une affaire |
| Get Company | Récupérer une entreprise |
| Add Note | Ajouter une note |

### Pipedrive

| Opération | Description |
|-----------|-------------|
| Create Deal | Créer une affaire |
| Create Person | Créer un contact |
| Create Activity | Créer une activité |

### Zoho CRM

| Opération | Description |
|-----------|-------------|
| Create Record | Créer un enregistrement |
| Update Record | Modifier |
| Search Records | Rechercher |

### Freshsales

| Opération | Description |
|-----------|-------------|
| Create Lead | Créer un lead |
| Update Contact | Modifier un contact |

---

## Taskboard

### Asana

| Opération | Description |
|-----------|-------------|
| Create Task | Créer une tâche |
| Update Task | Modifier une tâche |
| Create Project | Créer un projet |
| Add Comment | Ajouter un commentaire |

### Jira

| Opération | Description |
|-----------|-------------|
| Create Issue | Créer un ticket |
| Update Issue | Modifier un ticket |
| Add Comment | Ajouter un commentaire |
| Transition | Changer le statut |
| Search | Requête JQL |

**Exemple - Créer un ticket :**

```javascript
{
  "project": "PROJ",
  "issueType": "Bug",
  "summary": "{{$input.title}}",
  "description": "{{$input.description}}",
  "priority": "High",
  "labels": ["automated", "from-workflow"]
}
```

### Trello

| Opération | Description |
|-----------|-------------|
| Create Card | Créer une carte |
| Move Card | Déplacer une carte |
| Add Comment | Ajouter un commentaire |
| Add Attachment | Joindre un fichier |

### Monday.com

| Opération | Description |
|-----------|-------------|
| Create Item | Créer un élément |
| Update Item | Modifier un élément |
| Create Update | Ajouter un commentaire |

### ClickUp

| Opération | Description |
|-----------|-------------|
| Create Task | Créer une tâche |
| Update Task | Modifier |
| Create Comment | Commenter |

### Linear

| Opération | Description |
|-----------|-------------|
| Create Issue | Créer un ticket |
| Update Issue | Modifier |
| Create Comment | Commenter |

---

## E-commerce

### Shopify

| Opération | Description |
|-----------|-------------|
| Get Order | Récupérer une commande |
| Create Product | Créer un produit |
| Update Inventory | Mettre à jour le stock |
| Create Customer | Créer un client |

### WooCommerce

| Opération | Description |
|-----------|-------------|
| Get Order | Récupérer une commande |
| Create Product | Créer un produit |
| Update Order Status | Modifier le statut |

### Stripe

| Opération | Description |
|-----------|-------------|
| Create Payment Intent | Créer un paiement |
| Create Customer | Créer un client |
| Create Invoice | Créer une facture |
| Get Balance | Récupérer le solde |

### Magento

| Opération | Description |
|-----------|-------------|
| Get Products | Lister les produits |
| Create Order | Créer une commande |

---

## Cloud

### AWS S3

| Opération | Description |
|-----------|-------------|
| Upload | Téléverser un fichier |
| Download | Télécharger |
| List | Lister les objets |
| Delete | Supprimer |
| Generate Presigned URL | URL signée |

### AWS SQS

| Opération | Description |
|-----------|-------------|
| Send Message | Envoyer un message |
| Receive Messages | Recevoir des messages |
| Delete Message | Supprimer |

### AWS Lambda

| Opération | Description |
|-----------|-------------|
| Invoke | Invoquer une fonction |

### Google Cloud Storage

| Opération | Description |
|-----------|-------------|
| Upload | Téléverser |
| Download | Télécharger |
| List | Lister |

### Azure Blob Storage

| Opération | Description |
|-----------|-------------|
| Upload | Téléverser |
| Download | Télécharger |
| List | Lister |

### Cloudflare

| Opération | Description |
|-----------|-------------|
| Purge Cache | Vider le cache |
| Create DNS Record | Créer un enregistrement |

---

## Data

### Google Sheets

| Opération | Description |
|-----------|-------------|
| Read Rows | Lire des lignes |
| Append Row | Ajouter une ligne |
| Update Row | Modifier une ligne |
| Create Spreadsheet | Créer un tableur |

**Exemple - Ajouter une ligne :**

```javascript
{
  "spreadsheetId": "1abc...",
  "range": "Sheet1!A:D",
  "values": [
    "{{$input.name}}",
    "{{$input.email}}",
    "{{$input.phone}}",
    "{{new Date().toISOString()}}"
  ]
}
```

### Airtable

| Opération | Description |
|-----------|-------------|
| List Records | Lister les enregistrements |
| Create Record | Créer |
| Update Record | Modifier |
| Delete Record | Supprimer |

### Notion

| Opération | Description |
|-----------|-------------|
| Create Page | Créer une page |
| Update Page | Modifier |
| Query Database | Requêter une base |
| Append Block | Ajouter du contenu |

### Coda

| Opération | Description |
|-----------|-------------|
| List Rows | Lister les lignes |
| Create Row | Créer une ligne |

### Baserow

| Opération | Description |
|-----------|-------------|
| List Rows | Lister |
| Create Row | Créer |

---

## AI

### OpenAI

| Opération | Description |
|-----------|-------------|
| Chat Completion | Conversation GPT |
| Create Embedding | Générer des embeddings |
| Generate Image | Générer une image (DALL-E) |
| Transcribe Audio | Transcrire (Whisper) |

**Exemple - Chat GPT :**

```javascript
{
  "model": "gpt-4",
  "messages": [
    { "role": "system", "content": "Tu es un assistant utile." },
    { "role": "user", "content": "{{$input.question}}" }
  ],
  "temperature": 0.7
}
```

### Anthropic (Claude)

| Opération | Description |
|-----------|-------------|
| Chat | Conversation avec Claude |

### HuggingFace

| Opération | Description |
|-----------|-------------|
| Inference | Inférence sur un modèle |

### Replicate

| Opération | Description |
|-----------|-------------|
| Run Model | Exécuter un modèle |

---

## Messaging

### RabbitMQ

| Opération | Description |
|-----------|-------------|
| Publish | Publier un message |
| Consume | Consommer (via trigger) |

### Apache Kafka

| Opération | Description |
|-----------|-------------|
| Produce | Produire un message |
| Consume | Consommer (via trigger) |

### Google Pub/Sub

| Opération | Description |
|-----------|-------------|
| Publish | Publier |
| Pull | Récupérer des messages |

### Amazon SNS

| Opération | Description |
|-----------|-------------|
| Publish | Publier |
| Create Topic | Créer un topic |

---

## Dev Tools

### GitHub

| Opération | Description |
|-----------|-------------|
| Create Issue | Créer une issue |
| Create PR | Créer une pull request |
| Get Repository | Infos du repo |
| Create Comment | Commenter |
| Trigger Workflow | Déclencher une action |

### GitLab

| Opération | Description |
|-----------|-------------|
| Create Issue | Créer une issue |
| Create MR | Créer une merge request |

### Bitbucket

| Opération | Description |
|-----------|-------------|
| Create Issue | Créer une issue |
| Create PR | Créer une pull request |

### Sentry

| Opération | Description |
|-----------|-------------|
| Create Issue | Créer une issue |
| Get Events | Récupérer les événements |

### PagerDuty

| Opération | Description |
|-----------|-------------|
| Create Incident | Créer un incident |
| Resolve Incident | Résoudre |

---

## Configuration Générale

### Authentication

Chaque intégration supporte différentes méthodes :

| Type | Intégrations |
|------|--------------|
| API Key | Slack, Airtable, SendGrid |
| OAuth2 | Google, GitHub, Salesforce |
| Basic Auth | Jira, certaines APIs |
| Token | HubSpot, OpenAI |

### Rate Limits

La plupart des services ont des limites. WS-Flows gère automatiquement :
- Retry avec backoff exponentiel
- Mise en file d'attente
- Alertes de dépassement

### Webhooks

De nombreuses intégrations supportent les webhooks entrants :
1. Configurez le webhook dans le service
2. Utilisez l'URL du trigger Webhook WS-Flows
3. Les événements déclenchent automatiquement le workflow

## Voir Aussi

- [Vue d'Ensemble des Nodes](./overview.md)
- [HTTP Request](./http.md)
- [Credentials](../../credentials/overview.md)
