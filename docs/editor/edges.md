# Edges (Connexions)

> Les edges connectent les nodes et définissent le flux de données.

## Vue d'Ensemble

Les edges (ou connexions) sont les liens entre les nodes qui déterminent :
- L'ordre d'exécution
- Le flux de données
- Les conditions de branchement

## Créer une Connexion

### Méthode Standard

1. Survolez un node pour révéler ses handles
2. Cliquez sur le handle de sortie (●)
3. Glissez vers le handle d'entrée d'un autre node (○)
4. Relâchez pour créer la connexion

```
┌──────────┐          ┌──────────┐
│  Node A  │ ●──────▶ ○ Node B  │
└──────────┘          └──────────┘
   output              input
```

### Connexion Rapide

1. Sélectionnez un node
2. Appuyez sur `Tab` pour ajouter un node
3. Le nouveau node est automatiquement connecté

### Connexion Multiple

Un node peut avoir plusieurs connexions sortantes :

```
                    ┌──────────┐
             ┌────▶ │  Node B  │
┌──────────┐ │      └──────────┘
│  Node A  │─┤
└──────────┘ │      ┌──────────┐
             └────▶ │  Node C  │
                    └──────────┘
```

## Types de Handles

### Handle d'Entrée (Input)

- Position : gauche du node
- Symbole : ○ (cercle vide)
- Reçoit les données du node précédent

### Handle de Sortie (Output)

- Position : droite du node
- Symbole : ● (cercle plein)
- Envoie les données au node suivant

### Handles Multiples

Certains nodes ont plusieurs handles pour des sorties conditionnelles :

```
┌─────────────────────┐
│                     │ ● true
│     Condition       │
│                     │ ● false
└─────────────────────┘
```

## Types de Connexions

### Standard

Exécution séquentielle simple.

```
A ───▶ B ───▶ C
```

### Conditionnelle

Branchement selon une condition.

```
       true
A ───┬───────▶ B
     │
     │ false
     └───────▶ C
```

### Parallèle

Exécution simultanée de plusieurs branches.

```
     ┌───▶ B ───┐
A ───┤          ├───▶ D
     └───▶ C ───┘
```

### Merge

Fusion de plusieurs branches.

```
A ───┐
     ├───▶ C
B ───┘
```

## Manipuler les Connexions

### Sélectionner

- Cliquez sur l'edge pour le sélectionner
- L'edge sélectionné devient plus visible

### Supprimer

| Méthode | Action |
|---------|--------|
| Sélection + Delete | Supprimer la connexion sélectionnée |
| Clic droit → Supprimer | Menu contextuel |
| Reconnecter | Glisser vers un autre node |

### Réorganiser

Glissez le point d'ancrage d'un edge vers un autre handle pour reconnecter.

## Apparence

### Couleurs par Type de Données

| Couleur | Type de données |
|---------|-----------------|
| Gris | Standard / Inconnu |
| Bleu | Object / JSON |
| Vert | String |
| Orange | Number |
| Violet | Array |
| Rouge | Erreur |

### États Visuels

| État | Apparence |
|------|-----------|
| Normal | Ligne courbe grise |
| Survolé | Ligne plus épaisse, couleur accentuée |
| Sélectionné | Bordure bleue |
| Données en transit | Animation pulsante |
| Erreur | Ligne rouge |

### Animation

Pendant l'exécution, les edges montrent le flux de données :

```
A ●═══════════════▶ ○ B
     ↑ animation de flux
```

## Configuration Avancée

### Labels

Ajoutez des labels aux edges pour les identifier :

1. Clic droit sur l'edge
2. "Ajouter un label"
3. Saisissez le texte

```
A ●───[ label ]───▶ ○ B
```

### Edge Conditionnel

Pour les nodes logiques, l'edge porte la condition :

```
          ● true ──▶ B
Condition │
          ● false ─▶ C
```

## Règles de Connexion

### Autorisées

- ✅ Output vers Input
- ✅ Un output vers plusieurs inputs
- ✅ Plusieurs outputs vers un input (merge)
- ✅ Connexions entre nodes de différentes catégories

### Interdites

- ❌ Input vers Input
- ❌ Output vers Output
- ❌ Connexion créant un cycle (boucle infinie)
- ❌ Connexion vers soi-même

### Cycles

WS-Flows détecte et empêche les cycles :

```
     ┌────────┐
     ↓        │
A ───▶ B ───▶ C
     ↑        │
     └────────┘  ← INTERDIT
```

Pour les itérations, utilisez le node **Loop**.

## Validation

### Indicateurs Visuels

| Indicateur | Signification |
|------------|---------------|
| ⚠️ Jaune | Configuration manquante |
| ❌ Rouge | Connexion invalide |
| ✓ Vert | Connexion valide |

### Erreurs Courantes

| Erreur | Solution |
|--------|----------|
| "Type incompatible" | Vérifier les types de données |
| "Connexion cyclique" | Supprimer la boucle |
| "Handle manquant" | Le node cible a été supprimé |

## Performance

### Optimisation

- Les edges sont rendus en SVG pour de bonnes performances
- Virtualisation pour les grands workflows
- Mise en cache des chemins calculés

### Limites

| Limite | Valeur |
|--------|--------|
| Edges par workflow | ~500 (recommandé) |
| Edges par node | Illimité |

## Raccourcis

| Action | Raccourci |
|--------|-----------|
| Supprimer edge sélectionné | `Delete` |
| Annuler dernière connexion | `Ctrl/Cmd + Z` |
| Sélectionner tous les edges | `Ctrl/Cmd + A` puis filtrer |

## Voir Aussi

- [Canvas](./canvas.md)
- [Nodes Overview](./nodes/overview.md)
- [Groupes](./groups.md)
- [Logic Nodes](./nodes/logic.md)
