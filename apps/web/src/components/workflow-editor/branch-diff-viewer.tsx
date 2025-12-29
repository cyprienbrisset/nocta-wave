'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GitCompare,
  Plus,
  Minus,
  Edit3,
  ArrowRight,
  ArrowLeft,
  Eye,
  Code,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Tag,
  GitBranch,
  X,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface NodeChange {
  id: string;
  type: string;
  changes?: {
    position?: { from: { x: number; y: number }; to: { x: number; y: number } };
    data?: { from: unknown; to: unknown };
    type?: { from: string; to: string };
  };
  data?: {
    label?: string;
    [key: string]: unknown;
  };
  position?: { x: number; y: number };
}

interface EdgeChange {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface DiffResult {
  source: {
    commitId?: string;
    branchId?: string;
    branchName?: string;
    message?: string;
    createdAt?: string;
  };
  target: {
    commitId?: string;
    branchId?: string;
    branchName?: string;
    message?: string;
    createdAt?: string;
  };
  diff: {
    nodes: {
      added: NodeChange[];
      removed: NodeChange[];
      modified: NodeChange[];
    };
    edges: {
      added: EdgeChange[];
      removed: EdgeChange[];
      modified?: Array<{
        id: string;
        from: EdgeChange;
        to: EdgeChange;
      }>;
    };
    viewport?: {
      from?: { x: number; y: number; zoom: number };
      to?: { x: number; y: number; zoom: number };
    } | null;
  };
  stats: {
    nodesAdded: number;
    nodesRemoved: number;
    nodesModified: number;
    edgesAdded: number;
    edgesRemoved: number;
  };
}

interface Branch {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  _count?: { commits: number };
}

interface Commit {
  id: string;
  message: string;
  createdAt: string;
  authorId: string;
}

interface BranchDiffViewerProps {
  workflowId: string;
  branches: Branch[];
  onClose?: () => void;
  onRollback?: (commitId: string, createBackupTag: boolean) => Promise<void>;
  className?: string;
}

export function BranchDiffViewer({
  workflowId,
  branches,
  onClose,
  onRollback,
  className,
}: BranchDiffViewerProps) {
  const [sourceBranchId, setSourceBranchId] = useState<string>('');
  const [targetBranchId, setTargetBranchId] = useState<string>('');
  const [sourceCommitId, setSourceCommitId] = useState<string>('');
  const [targetCommitId, setTargetCommitId] = useState<string>('');
  const [diffMode, setDiffMode] = useState<'branches' | 'commits'>('branches');
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [sourceCommits, setSourceCommits] = useState<Commit[]>([]);
  const [targetCommits, setTargetCommits] = useState<Commit[]>([]);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [rollbackCommitId, setRollbackCommitId] = useState<string>('');
  const [createBackupTag, setCreateBackupTag] = useState(true);
  const [rollingBack, setRollingBack] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'summary' | 'detailed' | 'json'>('summary');

  // Load commits when branch is selected
  useEffect(() => {
    if (sourceBranchId && diffMode === 'commits') {
      loadBranchCommits(sourceBranchId, 'source');
    }
  }, [sourceBranchId, diffMode]);

  useEffect(() => {
    if (targetBranchId && diffMode === 'commits') {
      loadBranchCommits(targetBranchId, 'target');
    }
  }, [targetBranchId, diffMode]);

  const loadBranchCommits = async (branchId: string, side: 'source' | 'target') => {
    try {
      setLoadingCommits(true);
      const response = await fetch(`/api/branches/${branchId}/commits?limit=20`);
      if (!response.ok) throw new Error('Failed to load commits');
      const commits = await response.json();
      if (side === 'source') {
        setSourceCommits(commits);
      } else {
        setTargetCommits(commits);
      }
    } catch (error) {
      console.error('Failed to load commits:', error);
    } finally {
      setLoadingCommits(false);
    }
  };

  const loadDiff = async () => {
    if (diffMode === 'branches') {
      if (!sourceBranchId || !targetBranchId) return;
      try {
        setLoading(true);
        const response = await fetch(
          `/api/branches/diff?source=${sourceBranchId}&target=${targetBranchId}`
        );
        if (!response.ok) throw new Error('Failed to load diff');
        const data = await response.json();
        setDiff({
          source: { branchId: sourceBranchId, branchName: branches.find(b => b.id === sourceBranchId)?.name },
          target: { branchId: targetBranchId, branchName: branches.find(b => b.id === targetBranchId)?.name },
          diff: {
            nodes: {
              added: data.added || [],
              removed: data.removed || [],
              modified: data.modified || [],
            },
            edges: {
              added: data.edgesChanged?.added || [],
              removed: data.edgesChanged?.removed || [],
            },
          },
          stats: {
            nodesAdded: (data.added || []).length,
            nodesRemoved: (data.removed || []).length,
            nodesModified: (data.modified || []).length,
            edgesAdded: (data.edgesChanged?.added || []).length,
            edgesRemoved: (data.edgesChanged?.removed || []).length,
          },
        });
      } catch (error) {
        console.error('Failed to load diff:', error);
      } finally {
        setLoading(false);
      }
    } else {
      if (!sourceCommitId || !targetCommitId) return;
      try {
        setLoading(true);
        const response = await fetch(
          `/api/branches/commits/diff?source=${sourceCommitId}&target=${targetCommitId}`
        );
        if (!response.ok) throw new Error('Failed to load diff');
        const data = await response.json();
        setDiff(data);
      } catch (error) {
        console.error('Failed to load diff:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRollback = async () => {
    if (!rollbackCommitId || !onRollback) return;
    try {
      setRollingBack(true);
      await onRollback(rollbackCommitId, createBackupTag);
      setRollbackDialogOpen(false);
    } catch (error) {
      console.error('Failed to rollback:', error);
    } finally {
      setRollingBack(false);
    }
  };

  const toggleNodeExpanded = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const renderNodeLabel = (node: NodeChange) => {
    return node.data?.label || node.type || node.id.substring(0, 8);
  };

  const renderJsonDiff = (from: unknown, to: unknown) => {
    const fromStr = JSON.stringify(from, null, 2);
    const toStr = JSON.stringify(to, null, 2);

    return (
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-red-900/20 rounded p-2 overflow-x-auto">
          <pre className="text-xs text-red-300 whitespace-pre-wrap">{fromStr}</pre>
        </div>
        <div className="bg-green-900/20 rounded p-2 overflow-x-auto">
          <pre className="text-xs text-green-300 whitespace-pre-wrap">{toStr}</pre>
        </div>
      </div>
    );
  };

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-indigo-400" />
          <h3 className="font-medium">Comparaison des versions</h3>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Mode selector */}
      <div className="p-4 border-b">
        <Tabs value={diffMode} onValueChange={(v) => setDiffMode(v as 'branches' | 'commits')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="branches" className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Branches
            </TabsTrigger>
            <TabsTrigger value="commits" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Commits
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Selectors */}
      <div className="p-4 border-b space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Source */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Source</label>
            <Select value={sourceBranchId} onValueChange={setSourceBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une branche" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    <span className="flex items-center gap-2">
                      <GitBranch className="h-3 w-3" />
                      {branch.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {diffMode === 'commits' && sourceBranchId && (
              <Select value={sourceCommitId} onValueChange={setSourceCommitId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un commit" />
                </SelectTrigger>
                <SelectContent>
                  {sourceCommits.map((commit) => (
                    <SelectItem key={commit.id} value={commit.id}>
                      <span className="truncate">{commit.message}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Target */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Cible</label>
            <Select value={targetBranchId} onValueChange={setTargetBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une branche" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    <span className="flex items-center gap-2">
                      <GitBranch className="h-3 w-3" />
                      {branch.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {diffMode === 'commits' && targetBranchId && (
              <Select value={targetCommitId} onValueChange={setTargetCommitId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un commit" />
                </SelectTrigger>
                <SelectContent>
                  {targetCommits.map((commit) => (
                    <SelectItem key={commit.id} value={commit.id}>
                      <span className="truncate">{commit.message}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <Button
          onClick={loadDiff}
          disabled={
            loading ||
            (diffMode === 'branches' && (!sourceBranchId || !targetBranchId)) ||
            (diffMode === 'commits' && (!sourceCommitId || !targetCommitId))
          }
          className="w-full"
        >
          {loading ? 'Chargement...' : 'Comparer'}
        </Button>
      </div>

      {/* Diff content */}
      {diff && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Stats bar */}
          <div className="p-4 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Plus className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-500">
                    {diff.stats.nodesAdded + diff.stats.edgesAdded}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Minus className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-500">
                    {diff.stats.nodesRemoved + diff.stats.edgesRemoved}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Edit3 className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium text-yellow-500">
                    {diff.stats.nodesModified}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                  <TabsList className="h-8">
                    <TabsTrigger value="summary" className="text-xs px-2 h-6">
                      <Eye className="h-3 w-3 mr-1" />
                      Résumé
                    </TabsTrigger>
                    <TabsTrigger value="detailed" className="text-xs px-2 h-6">
                      <Code className="h-3 w-3 mr-1" />
                      Détaillé
                    </TabsTrigger>
                    <TabsTrigger value="json" className="text-xs px-2 h-6">
                      JSON
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </div>

          {/* Changes list */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Added nodes */}
              {diff.diff.nodes.added.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2 text-green-500">
                    <Plus className="h-4 w-4" />
                    Nodes ajoutés ({diff.diff.nodes.added.length})
                  </h4>
                  {diff.diff.nodes.added.map((node) => (
                    <div
                      key={node.id}
                      className="bg-green-900/20 border border-green-800/50 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-green-300">
                          {renderNodeLabel(node)}
                        </span>
                        <Badge variant="outline" className="text-green-400 border-green-700">
                          {node.type}
                        </Badge>
                      </div>
                      {viewMode === 'detailed' && node.position && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Position: ({Math.round(node.position.x)}, {Math.round(node.position.y)})
                        </div>
                      )}
                      {viewMode === 'json' && (
                        <div className="mt-2">
                          <pre className="text-xs bg-green-900/30 p-2 rounded overflow-x-auto">
                            {JSON.stringify(node, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Removed nodes */}
              {diff.diff.nodes.removed.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2 text-red-500">
                    <Minus className="h-4 w-4" />
                    Nodes supprimés ({diff.diff.nodes.removed.length})
                  </h4>
                  {diff.diff.nodes.removed.map((node) => (
                    <div
                      key={node.id}
                      className="bg-red-900/20 border border-red-800/50 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-red-300 line-through">
                          {renderNodeLabel(node)}
                        </span>
                        <Badge variant="outline" className="text-red-400 border-red-700">
                          {node.type}
                        </Badge>
                      </div>
                      {viewMode === 'json' && (
                        <div className="mt-2">
                          <pre className="text-xs bg-red-900/30 p-2 rounded overflow-x-auto">
                            {JSON.stringify(node, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Modified nodes */}
              {diff.diff.nodes.modified.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2 text-yellow-500">
                    <Edit3 className="h-4 w-4" />
                    Nodes modifiés ({diff.diff.nodes.modified.length})
                  </h4>
                  {diff.diff.nodes.modified.map((node) => (
                    <Collapsible
                      key={node.id}
                      open={expandedNodes.has(node.id)}
                      onOpenChange={() => toggleNodeExpanded(node.id)}
                    >
                      <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-lg">
                        <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover:bg-yellow-900/30 rounded-t-lg">
                          <div className="flex items-center gap-2">
                            {expandedNodes.has(node.id) ? (
                              <ChevronDown className="h-4 w-4 text-yellow-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-yellow-500" />
                            )}
                            <span className="font-medium text-yellow-300">
                              {renderNodeLabel(node)}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-yellow-400 border-yellow-700">
                            {node.type}
                          </Badge>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="p-3 pt-0 space-y-2">
                          {node.changes?.position && (
                            <div className="text-xs">
                              <span className="text-muted-foreground">Position:</span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-red-400">
                                  ({Math.round(node.changes.position.from.x)},{' '}
                                  {Math.round(node.changes.position.from.y)})
                                </span>
                                <ArrowRight className="h-3 w-3" />
                                <span className="text-green-400">
                                  ({Math.round(node.changes.position.to.x)},{' '}
                                  {Math.round(node.changes.position.to.y)})
                                </span>
                              </div>
                            </div>
                          )}
                          {node.changes?.type && (
                            <div className="text-xs">
                              <span className="text-muted-foreground">Type:</span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-red-400">{node.changes.type.from}</span>
                                <ArrowRight className="h-3 w-3" />
                                <span className="text-green-400">{node.changes.type.to}</span>
                              </div>
                            </div>
                          )}
                          {node.changes?.data && viewMode !== 'summary' && (
                            <div className="text-xs">
                              <span className="text-muted-foreground">Configuration:</span>
                              <div className="mt-1">
                                {renderJsonDiff(node.changes.data.from, node.changes.data.to)}
                              </div>
                            </div>
                          )}
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </div>
              )}

              {/* Edge changes */}
              {(diff.diff.edges.added.length > 0 || diff.diff.edges.removed.length > 0) && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Connexions</h4>
                  {diff.diff.edges.added.map((edge) => (
                    <div
                      key={edge.id}
                      className="flex items-center gap-2 text-sm text-green-400 bg-green-900/20 rounded p-2"
                    >
                      <Plus className="h-3 w-3" />
                      <span>{edge.source}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span>{edge.target}</span>
                    </div>
                  ))}
                  {diff.diff.edges.removed.map((edge) => (
                    <div
                      key={edge.id}
                      className="flex items-center gap-2 text-sm text-red-400 bg-red-900/20 rounded p-2"
                    >
                      <Minus className="h-3 w-3" />
                      <span className="line-through">{edge.source}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="line-through">{edge.target}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* No changes */}
              {diff.stats.nodesAdded === 0 &&
                diff.stats.nodesRemoved === 0 &&
                diff.stats.nodesModified === 0 &&
                diff.stats.edgesAdded === 0 &&
                diff.stats.edgesRemoved === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <GitCompare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Aucune différence détectée</p>
                  </div>
                )}
            </div>
          </ScrollArea>

          {/* Actions */}
          {onRollback && diff.source.commitId && (
            <div className="p-4 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setRollbackCommitId(diff.source.commitId!);
                  setRollbackDialogOpen(true);
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurer la version source
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Rollback dialog */}
      <Dialog open={rollbackDialogOpen} onOpenChange={setRollbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurer cette version ?</DialogTitle>
            <DialogDescription>
              Cette action va restaurer le workflow à l'état du commit sélectionné.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 py-4">
            <input
              type="checkbox"
              id="createBackupTag"
              checked={createBackupTag}
              onChange={(e) => setCreateBackupTag(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="createBackupTag" className="text-sm">
              Créer un tag de sauvegarde avant la restauration
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRollbackDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleRollback} disabled={rollingBack}>
              {rollingBack ? 'Restauration...' : 'Restaurer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BranchDiffViewer;
