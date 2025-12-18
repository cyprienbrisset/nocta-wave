'use client';

import { useState, useEffect } from 'react';
import { workflowsApi, WorkflowNode, WorkflowEdge } from '@/lib/api/workflows';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  History,
  RotateCcw,
  GitCompare,
  ChevronRight,
  Plus,
  Minus,
  Edit3,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface VersionHistoryPanelProps {
  workflowId: string;
  currentVersion: number;
  className?: string;
  onRestore?: () => void;
}

interface Version {
  id: string;
  version: number;
  changelog: string | null;
  createdAt: string;
}

interface VersionDiff {
  version: number;
  currentVersion: number;
  changelog: string | null;
  createdAt: string;
  changes: {
    nodes: {
      added: WorkflowNode[];
      removed: WorkflowNode[];
      modified: Array<{ current: WorkflowNode; previous: WorkflowNode }>;
    };
    edges: {
      added: WorkflowEdge[];
      removed: WorkflowEdge[];
    };
  };
}

export function VersionHistoryPanel({
  workflowId,
  currentVersion,
  className,
  onRestore,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [diff, setDiff] = useState<VersionDiff | null>(null);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadVersions();
  }, [workflowId]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const data = await workflowsApi.getVersions(workflowId);
      setVersions(data);
    } catch (error) {
      console.error('Failed to load versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDiff = async (version: Version) => {
    try {
      setLoadingDiff(true);
      const data = await workflowsApi.getVersionDiff(workflowId, version.id);
      setDiff(data);
      setSelectedVersion(version);
    } catch (error) {
      console.error('Failed to load diff:', error);
    } finally {
      setLoadingDiff(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedVersion) return;

    try {
      setRestoring(true);
      await workflowsApi.restoreVersion(workflowId, selectedVersion.id);
      setRestoreDialogOpen(false);
      setSelectedVersion(null);
      setDiff(null);
      onRestore?.();
      loadVersions();
    } catch (error) {
      console.error('Failed to restore version:', error);
    } finally {
      setRestoring(false);
    }
  };

  const getTotalChanges = (diff: VersionDiff) => {
    return (
      diff.changes.nodes.added.length +
      diff.changes.nodes.removed.length +
      diff.changes.nodes.modified.length +
      diff.changes.edges.added.length +
      diff.changes.edges.removed.length
    );
  };

  if (selectedVersion && diff) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-700">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => {
              setSelectedVersion(null);
              setDiff(null);
            }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h3 className="font-medium">Version {diff.version}</h3>
            <p className="text-xs text-gray-500">
              vs Version actuelle ({diff.currentVersion})
            </p>
          </div>
        </div>

        {/* Diff content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-green-900/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-400">
                {diff.changes.nodes.added.length + diff.changes.edges.added.length}
              </div>
              <div className="text-xs text-green-400/70">Ajoutés</div>
            </div>
            <div className="bg-red-900/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-400">
                {diff.changes.nodes.removed.length + diff.changes.edges.removed.length}
              </div>
              <div className="text-xs text-red-400/70">Supprimés</div>
            </div>
            <div className="bg-yellow-900/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {diff.changes.nodes.modified.length}
              </div>
              <div className="text-xs text-yellow-400/70">Modifiés</div>
            </div>
          </div>

          {/* Changelog */}
          {diff.changelog && (
            <div className="bg-gray-800/50 rounded-lg p-3">
              <h4 className="text-sm font-medium mb-1">Changelog</h4>
              <p className="text-sm text-gray-400">{diff.changelog}</p>
            </div>
          )}

          {/* Node changes */}
          {diff.changes.nodes.added.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Plus className="h-4 w-4 text-green-400" />
                Nodes ajoutés
              </h4>
              {diff.changes.nodes.added.map((node) => (
                <div
                  key={node.id}
                  className="bg-green-900/20 border border-green-800 rounded-lg p-2 text-sm"
                >
                  <span className="font-medium">{node.data.label}</span>
                  <span className="text-gray-500 ml-2">({node.type})</span>
                </div>
              ))}
            </div>
          )}

          {diff.changes.nodes.removed.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Minus className="h-4 w-4 text-red-400" />
                Nodes supprimés
              </h4>
              {diff.changes.nodes.removed.map((node) => (
                <div
                  key={node.id}
                  className="bg-red-900/20 border border-red-800 rounded-lg p-2 text-sm"
                >
                  <span className="font-medium">{node.data.label}</span>
                  <span className="text-gray-500 ml-2">({node.type})</span>
                </div>
              ))}
            </div>
          )}

          {diff.changes.nodes.modified.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-yellow-400" />
                Nodes modifiés
              </h4>
              {diff.changes.nodes.modified.map(({ current, previous }) => (
                <div
                  key={current.id}
                  className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-2 text-sm"
                >
                  <div className="font-medium">{current.data.label}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Position: ({Math.round(previous.position.x)}, {Math.round(previous.position.y)}) →
                    ({Math.round(current.position.x)}, {Math.round(current.position.y)})
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Edge changes */}
          {(diff.changes.edges.added.length > 0 || diff.changes.edges.removed.length > 0) && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Connexions</h4>
              {diff.changes.edges.added.map((edge) => (
                <div
                  key={edge.id}
                  className="flex items-center gap-2 text-sm text-green-400"
                >
                  <Plus className="h-3 w-3" />
                  {edge.source} → {edge.target}
                </div>
              ))}
              {diff.changes.edges.removed.map((edge) => (
                <div
                  key={edge.id}
                  className="flex items-center gap-2 text-sm text-red-400"
                >
                  <Minus className="h-3 w-3" />
                  {edge.source} → {edge.target}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <Button
            className="w-full"
            onClick={() => setRestoreDialogOpen(true)}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurer cette version
          </Button>
        </div>

        {/* Restore dialog */}
        <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
          <DialogContent className="bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle>Restaurer la version {selectedVersion.version} ?</DialogTitle>
              <DialogDescription>
                La version actuelle sera sauvegardée automatiquement avant la restauration.
                Vous pourrez toujours y revenir si nécessaire.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setRestoreDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button onClick={handleRestore} disabled={restoring}>
                {restoring ? 'Restauration...' : 'Restaurer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-gray-700">
        <History className="h-5 w-5 text-indigo-400" />
        <h3 className="font-medium">Historique des versions</h3>
        <Badge variant="secondary" className="ml-auto">
          v{currentVersion}
        </Badge>
      </div>

      {/* Versions list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            Chargement...
          </div>
        ) : versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500 p-4">
            <History className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm text-center">
              Aucune version précédente.
              <br />
              Les versions sont créées à chaque sauvegarde.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {versions.map((version) => (
              <button
                key={version.id}
                className="w-full p-4 text-left hover:bg-gray-800/50 transition-colors group"
                onClick={() => loadDiff(version)}
                disabled={loadingDiff}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">v{version.version}</Badge>
                    <span className="text-sm text-gray-400">
                      {formatDistanceToNow(new Date(version.createdAt), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                </div>
                {version.changelog && (
                  <p className="mt-1 text-sm text-gray-500 truncate">
                    {version.changelog}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-600">
                  {format(new Date(version.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
