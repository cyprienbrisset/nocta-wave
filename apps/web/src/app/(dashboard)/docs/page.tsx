'use client';

import { useState } from 'react';
import {
  BookOpen,
  Workflow,
  Play,
  Settings2,
  Zap,
  Globe,
  Code,
  GitBranch,
  Database,
  MessageSquare,
  Wrench,
  Key,
  MousePointer,
  Layers,
  Save,
  Terminal,
  Eye,
  PanelRight,
  ChevronRight,
  Search,
  ExternalLink,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface DocSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

const docSections: DocSection[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    icon: <BookOpen className="h-4 w-4" />,
    content: (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white">Bienvenue sur WS-Flows</h2>
        <p className="text-gray-300 leading-relaxed">
          WS-Flows est une plateforme d'automatisation de workflows qui vous permet de créer, gérer et exécuter des processus automatisés visuellement. Inspirée de n8n, elle offre une interface intuitive de type &quot;drag and drop&quot; pour connecter différents services et automatiser vos tâches.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Workflow className="h-5 w-5" />
              <span className="font-semibold">Workflows Visuels</span>
            </div>
            <p className="text-sm text-gray-400">Créez des automatisations complexes sans coder grâce à l'éditeur visuel.</p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 text-green-500 mb-2">
              <Zap className="h-5 w-5" />
              <span className="font-semibold">40+ Nodes</span>
            </div>
            <p className="text-sm text-gray-400">Une bibliothèque complète de nodes pour toutes vos intégrations.</p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 text-blue-500 mb-2">
              <Play className="h-5 w-5" />
              <span className="font-semibold">Exécution en Temps Réel</span>
            </div>
            <p className="text-sm text-gray-400">Testez et surveillez vos workflows instantanément.</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'getting-started',
    title: 'Premiers Pas',
    icon: <Play className="h-4 w-4" />,
    content: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Premiers Pas</h2>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-sm">1</span>
            Créer un nouveau workflow
          </h3>
          <p className="text-gray-300 ml-8">
            Depuis le tableau de bord ou la page Workflows, cliquez sur <strong>&quot;Nouveau workflow&quot;</strong>. Donnez-lui un nom et une description, puis accédez à l'éditeur visuel.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-sm">2</span>
            Ajouter des nodes
          </h3>
          <p className="text-gray-300 ml-8">
            Ouvrez la bibliothèque de nodes (panneau &quot;Nodes&quot;) et parcourez les catégories. Cliquez sur un node ou glissez-déposez-le sur le canvas. Commencez toujours par un <strong>Trigger</strong> (déclencheur).
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-sm">3</span>
            Connecter les nodes
          </h3>
          <p className="text-gray-300 ml-8">
            Cliquez sur la poignée de sortie d'un node et tirez vers l'entrée d'un autre pour créer une connexion. Les données circulent de gauche à droite.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-sm">4</span>
            Configurer et tester
          </h3>
          <p className="text-gray-300 ml-8">
            Cliquez sur un node pour ouvrir ses paramètres. Configurez les options requises, puis utilisez le bouton <strong>&quot;Tester&quot;</strong> pour exécuter votre workflow.
          </p>
        </div>

        <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-4 mt-6">
          <p className="text-blue-300 text-sm">
            💡 <strong>Astuce :</strong> Utilisez la touche <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">Ctrl+S</kbd> pour sauvegarder rapidement votre workflow.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'editor-interface',
    title: "Interface de l'Éditeur",
    icon: <Layers className="h-4 w-4" />,
    content: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Interface de l'Éditeur</h2>
        <p className="text-gray-300">
          L'éditeur de workflow est composé de plusieurs zones redimensionnables que vous pouvez personnaliser selon vos besoins.
        </p>

        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 text-white shrink-0">
              <MousePointer className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Canvas Central</h3>
              <p className="text-gray-400 text-sm mt-1">
                Zone principale où vous construisez votre workflow. Utilisez la souris pour vous déplacer (clic gauche + glisser) et la molette pour zoomer.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 text-white shrink-0">
              <PanelRight className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Panneau Nodes</h3>
              <p className="text-gray-400 text-sm mt-1">
                Bibliothèque de tous les nodes disponibles, organisés par catégorie. Recherchez ou parcourez pour trouver le node dont vous avez besoin.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 text-white shrink-0">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Panneau Paramètres</h3>
              <p className="text-gray-400 text-sm mt-1">
                Configure le node sélectionné. Apparaît automatiquement quand vous cliquez sur un node. Modifiez les propriétés, mappez les données et configurez les credentials.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 text-white shrink-0">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Console</h3>
              <p className="text-gray-400 text-sm mt-1">
                Affiche les logs d'exécution en temps réel. Utile pour débugger et comprendre le flux de données entre les nodes.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 text-white shrink-0">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Inspecteur de Données</h3>
              <p className="text-gray-400 text-sm mt-1">
                Visualisez les données qui passent par chaque node après une exécution. Sélectionnez un node pour voir ses entrées/sorties.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mt-6">
          <h4 className="font-semibold text-white mb-2">Raccourcis Clavier</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between text-gray-300">
              <span>Sauvegarder</span>
              <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">Ctrl+S</kbd>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Supprimer node</span>
              <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">Delete</kbd>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Zoomer</span>
              <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">Molette</kbd>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Déplacer vue</span>
              <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">Clic + Glisser</kbd>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'nodes-categories',
    title: 'Catégories de Nodes',
    icon: <Zap className="h-4 w-4" />,
    content: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Catégories de Nodes</h2>
        <p className="text-gray-300">
          WS-Flows propose une large gamme de nodes organisés en catégories pour faciliter la création de vos workflows.
        </p>

        <div className="space-y-4">
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-900/50 text-green-500">
                <Zap className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-semibold text-white">Déclencheurs (Triggers)</h3>
            </div>
            <p className="text-gray-400 text-sm mb-3">
              Point d'entrée de vos workflows. Définissent quand et comment un workflow démarre.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">Manual</span>
              <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">Cron</span>
              <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">Webhook</span>
              <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">HTTP Poll</span>
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-900/50 text-blue-500">
                <Globe className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-semibold text-white">HTTP</h3>
            </div>
            <p className="text-gray-400 text-sm mb-3">
              Effectuez des requêtes HTTP/API vers n'importe quel service web.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">HTTP Request</span>
              <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">HTTP Response</span>
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-900/50 text-purple-500">
                <Code className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-semibold text-white">Transformation</h3>
            </div>
            <p className="text-gray-400 text-sm mb-3">
              Transformez, filtrez et manipulez les données dans votre workflow.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">Set</span>
              <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">Map</span>
              <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">Filter</span>
              <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">Merge</span>
              <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">Split</span>
              <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">Code</span>
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-900/50 text-orange-500">
                <GitBranch className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-semibold text-white">Logique</h3>
            </div>
            <p className="text-gray-400 text-sm mb-3">
              Contrôlez le flux d'exécution avec des conditions et des boucles.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">Condition</span>
              <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">Switch</span>
              <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">Loop</span>
              <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">Wait</span>
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-900/50 text-cyan-500">
                <Database className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-semibold text-white">Base de données</h3>
            </div>
            <p className="text-gray-400 text-sm mb-3">
              Interagissez avec vos bases de données directement depuis vos workflows.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">PostgreSQL</span>
              <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">MySQL</span>
              <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">MongoDB</span>
              <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">Redis</span>
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-900/50 text-pink-500">
                <MessageSquare className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-semibold text-white">Intégrations</h3>
            </div>
            <p className="text-gray-400 text-sm mb-3">
              Connectez-vous à des services tiers populaires.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">Slack</span>
              <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">Discord</span>
              <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">GitHub</span>
              <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">Gmail</span>
              <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">OpenAI</span>
              <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">Stripe</span>
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-700 text-gray-400">
                <Wrench className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-semibold text-white">Utilitaires</h3>
            </div>
            <p className="text-gray-400 text-sm mb-3">
              Outils pratiques pour manipuler les données et contrôler le temps.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">Delay</span>
              <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">Crypto</span>
              <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">DateTime</span>
              <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">HTML Parse</span>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'credentials',
    title: 'Gestion des Identifiants',
    icon: <Key className="h-4 w-4" />,
    content: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Gestion des Identifiants</h2>
        <p className="text-gray-300">
          Les identifiants (credentials) permettent de stocker de manière sécurisée les clés API, tokens et mots de passe nécessaires à vos intégrations.
        </p>

        <div className="bg-green-900/20 border border-green-800 rounded-xl p-4">
          <p className="text-green-300 text-sm">
            🔐 <strong>Sécurité :</strong> Tous les identifiants sont chiffrés avec AES-256 avant d'être stockés en base de données.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Créer un identifiant</h3>
          <ol className="space-y-2 text-gray-300 list-decimal list-inside">
            <li>Accédez à la page <strong>Identifiants</strong> depuis le menu latéral</li>
            <li>Cliquez sur <strong>&quot;Nouvel identifiant&quot;</strong></li>
            <li>Sélectionnez le type d'identifiant (API Key, OAuth2, Basic Auth, etc.)</li>
            <li>Remplissez les informations requises</li>
            <li>Donnez un nom descriptif pour retrouver facilement l'identifiant</li>
          </ol>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Types d'identifiants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <h4 className="font-medium text-white">API Key</h4>
              <p className="text-xs text-gray-400 mt-1">Simple clé d'API pour les services qui en utilisent (OpenAI, Stripe, etc.)</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <h4 className="font-medium text-white">OAuth2</h4>
              <p className="text-xs text-gray-400 mt-1">Authentification OAuth2 pour Google, GitHub, Slack, etc.</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <h4 className="font-medium text-white">Basic Auth</h4>
              <p className="text-xs text-gray-400 mt-1">Nom d'utilisateur et mot de passe pour l'authentification basique</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <h4 className="font-medium text-white">Database</h4>
              <p className="text-xs text-gray-400 mt-1">Chaîne de connexion pour PostgreSQL, MySQL, MongoDB, etc.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Utiliser dans un workflow</h3>
          <p className="text-gray-300">
            Dans la configuration d'un node, sélectionnez l'identifiant approprié depuis le menu déroulant. Les identifiants sont automatiquement déchiffrés lors de l'exécution.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'executions',
    title: 'Exécutions & Monitoring',
    icon: <Play className="h-4 w-4" />,
    content: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Exécutions & Monitoring</h2>
        <p className="text-gray-300">
          Surveillez l'exécution de vos workflows en temps réel et analysez les résultats pour débugger et optimiser.
        </p>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">États d'exécution</h3>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-900/30 text-yellow-500 text-sm">
              <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
              Running
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-900/30 text-green-500 text-sm">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Success
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-900/30 text-red-500 text-sm">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Failed
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-700 text-gray-400 text-sm">
              <span className="h-2 w-2 rounded-full bg-gray-500" />
              Pending
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Modes d'exécution</h3>
          <div className="space-y-3">
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <h4 className="font-medium text-white flex items-center gap-2">
                <Play className="h-4 w-4 text-green-500" />
                Test manuel
              </h4>
              <p className="text-sm text-gray-400 mt-1">
                Cliquez sur &quot;Tester&quot; dans l'éditeur pour exécuter immédiatement. Idéal pour le développement et le débogage.
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <h4 className="font-medium text-white flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Trigger automatique
              </h4>
              <p className="text-sm text-gray-400 mt-1">
                Activez le workflow pour qu'il s'exécute automatiquement selon son trigger (Cron, Webhook, etc.).
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Analyser une exécution</h3>
          <ol className="space-y-2 text-gray-300 list-decimal list-inside">
            <li>Accédez à la page <strong>Exécutions</strong> ou cliquez sur une exécution dans l'éditeur</li>
            <li>Visualisez le parcours des données à travers les nodes</li>
            <li>Cliquez sur un node pour voir ses entrées/sorties</li>
            <li>Consultez les logs dans la console pour les détails</li>
          </ol>
        </div>

        <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-4">
          <p className="text-blue-300 text-sm">
            💡 <strong>Astuce :</strong> En cas d'erreur, le node problématique est mis en surbrillance rouge. Cliquez dessus pour voir le message d'erreur détaillé.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'expressions',
    title: 'Expressions & Données',
    icon: <Code className="h-4 w-4" />,
    content: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Expressions & Données</h2>
        <p className="text-gray-300">
          Les expressions vous permettent de référencer dynamiquement les données des nodes précédents et d'effectuer des transformations.
        </p>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Syntaxe de base</h3>
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
            <p className="text-gray-300">
              <span className="text-purple-400">{'{{ '}</span>
              <span className="text-blue-400">$node</span>
              <span className="text-gray-500">.</span>
              <span className="text-green-400">nomDuNode</span>
              <span className="text-gray-500">.</span>
              <span className="text-yellow-400">data</span>
              <span className="text-gray-500">.</span>
              <span className="text-orange-400">propriété</span>
              <span className="text-purple-400">{' }}'}</span>
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Variables disponibles</h3>
          <div className="space-y-2">
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <code className="text-primary">$input</code>
              <span className="text-gray-400 text-sm ml-2">- Données du node précédent</span>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <code className="text-primary">$node.nomDuNode</code>
              <span className="text-gray-400 text-sm ml-2">- Données d'un node spécifique</span>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <code className="text-primary">$env.VARIABLE</code>
              <span className="text-gray-400 text-sm ml-2">- Variables d'environnement</span>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <code className="text-primary">$now</code>
              <span className="text-gray-400 text-sm ml-2">- Date/heure actuelle</span>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <code className="text-primary">$execution.id</code>
              <span className="text-gray-400 text-sm ml-2">- ID de l'exécution courante</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Exemples</h3>
          <div className="space-y-3">
            <div className="bg-gray-900 rounded-lg p-3 font-mono text-sm">
              <p className="text-gray-500 mb-1">// Accéder à une propriété</p>
              <p className="text-gray-300">{'{{ $input.user.email }}'}</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-3 font-mono text-sm">
              <p className="text-gray-500 mb-1">// Concaténer des chaînes</p>
              <p className="text-gray-300">{'{{ "Bonjour " + $input.name }}'}</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-3 font-mono text-sm">
              <p className="text-gray-500 mb-1">// Condition ternaire</p>
              <p className="text-gray-300">{'{{ $input.age >= 18 ? "Majeur" : "Mineur" }}'}</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-3 font-mono text-sm">
              <p className="text-gray-500 mb-1">// Accéder à un tableau</p>
              <p className="text-gray-300">{'{{ $input.items[0].name }}'}</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'best-practices',
    title: 'Bonnes Pratiques',
    icon: <Save className="h-4 w-4" />,
    content: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Bonnes Pratiques</h2>

        <div className="space-y-4">
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-2">📝 Nommez vos workflows clairement</h3>
            <p className="text-gray-400 text-sm">
              Utilisez des noms descriptifs qui indiquent ce que fait le workflow. Ex: &quot;Sync Utilisateurs Stripe → Database&quot; plutôt que &quot;Workflow 1&quot;.
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-2">🔄 Testez régulièrement</h3>
            <p className="text-gray-400 text-sm">
              Exécutez des tests après chaque modification majeure. Vérifiez les données à chaque étape avant de passer à la suivante.
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-2">⚡ Gérez les erreurs</h3>
            <p className="text-gray-400 text-sm">
              Utilisez des nodes de condition pour gérer les cas d'erreur. Pensez aux scénarios où les API externes peuvent échouer.
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-2">🔐 Sécurisez vos credentials</h3>
            <p className="text-gray-400 text-sm">
              Ne mettez jamais de clés API en dur dans les expressions. Utilisez toujours le système de credentials intégré.
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-2">📊 Surveillez vos exécutions</h3>
            <p className="text-gray-400 text-sm">
              Consultez régulièrement l'historique des exécutions pour détecter les problèmes avant qu'ils ne deviennent critiques.
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-2">🎯 Gardez vos workflows simples</h3>
            <p className="text-gray-400 text-sm">
              Divisez les workflows complexes en plusieurs petits workflows. Utilisez des webhooks pour les faire communiquer si nécessaire.
            </p>
          </div>
        </div>
      </div>
    ),
  },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('introduction');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSections = searchQuery
    ? docSections.filter(
        (section) =>
          section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          section.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : docSections;

  const currentSection = docSections.find((s) => s.id === activeSection);

  return (
    <div className="flex h-[calc(100vh-64px)] bg-[#0f0f1a]">
      {/* Sidebar */}
      <aside className="w-72 border-r border-gray-800 bg-[#1a1a2e] flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2 text-white mb-4">
            <BookOpen className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">Documentation</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              className="h-9 pl-8 text-sm bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <nav className="p-3 space-y-1">
            {filteredSections.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  setActiveSection(section.id);
                  setSearchQuery('');
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all',
                  activeSection === section.id
                    ? 'bg-primary text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                )}
              >
                <span className={cn(
                  activeSection === section.id ? 'text-white' : 'text-gray-500'
                )}>
                  {section.icon}
                </span>
                <span className="flex-1">{section.title}</span>
                <ChevronRight className={cn(
                  'h-4 w-4 transition-transform',
                  activeSection === section.id ? 'rotate-90' : ''
                )} />
              </button>
            ))}
          </nav>
        </ScrollArea>

        <div className="p-4 border-t border-gray-800">
          <a
            href="https://github.com/wakastart/ws-flows"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Voir sur GitHub
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-8">
          {currentSection?.content}
        </div>
      </main>
    </div>
  );
}
