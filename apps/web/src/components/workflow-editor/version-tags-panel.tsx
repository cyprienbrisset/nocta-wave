'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Tag,
  Plus,
  Trash2,
  RotateCcw,
  Package,
  Clock,
  User,
  GitCommit,
  X,
  Search,
  Filter,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface VersionTag {
  id: string;
  name: string;
  description: string | null;
  isRelease: boolean;
  createdAt: string;
  commit: {
    id: string;
    message: string;
    createdAt: string;
  };
  branch: {
    id: string;
    name: string;
  } | null;
  createdBy: {
    id: string;
    name: string | null;
    avatar: string | null;
  };
}

interface Commit {
  id: string;
  message: string;
  createdAt: string;
}

interface Branch {
  id: string;
  name: string;
}

interface VersionTagsPanelProps {
  workflowId: string;
  branches: Branch[];
  onRollbackToTag?: (tagId: string, createBackupTag: boolean) => Promise<void>;
  className?: string;
}

export function VersionTagsPanel({
  workflowId,
  branches,
  onRollbackToTag,
  className,
}: VersionTagsPanelProps) {
  const [tags, setTags] = useState<VersionTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<VersionTag | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterReleaseOnly, setFilterReleaseOnly] = useState(false);

  // Create form state
  const [newTagName, setNewTagName] = useState('');
  const [newTagDescription, setNewTagDescription] = useState('');
  const [newTagIsRelease, setNewTagIsRelease] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedCommitId, setSelectedCommitId] = useState('');
  const [branchCommits, setBranchCommits] = useState<Commit[]>([]);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [createBackupTag, setCreateBackupTag] = useState(true);

  useEffect(() => {
    loadTags();
  }, [workflowId]);

  useEffect(() => {
    if (selectedBranchId) {
      loadBranchCommits(selectedBranchId);
    }
  }, [selectedBranchId]);

  const loadTags = async () => {
    try {
      setLoading(true);
      const endpoint = filterReleaseOnly
        ? `/api/branches/workflow/${workflowId}/releases`
        : `/api/branches/workflow/${workflowId}/tags`;
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to load tags');
      const data = await response.json();
      setTags(data);
    } catch (error) {
      console.error('Failed to load tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBranchCommits = async (branchId: string) => {
    try {
      setLoadingCommits(true);
      const response = await fetch(`/api/branches/${branchId}/commits?limit=20`);
      if (!response.ok) throw new Error('Failed to load commits');
      const data = await response.json();
      setBranchCommits(data);
    } catch (error) {
      console.error('Failed to load commits:', error);
    } finally {
      setLoadingCommits(false);
    }
  };

  const handleCreate = async () => {
    if (!newTagName || !selectedCommitId) return;

    try {
      setCreating(true);
      const response = await fetch('/api/branches/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId,
          commitId: selectedCommitId,
          name: newTagName,
          description: newTagDescription || undefined,
          isRelease: newTagIsRelease,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create tag');
      }

      setCreateDialogOpen(false);
      resetCreateForm();
      loadTags();
    } catch (error) {
      console.error('Failed to create tag:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTag) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/branches/tags/${selectedTag.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete tag');

      setDeleteDialogOpen(false);
      setSelectedTag(null);
      loadTags();
    } catch (error) {
      console.error('Failed to delete tag:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleRollback = async () => {
    if (!selectedTag || !onRollbackToTag) return;

    try {
      setRollingBack(true);
      await onRollbackToTag(selectedTag.id, createBackupTag);
      setRollbackDialogOpen(false);
      setSelectedTag(null);
    } catch (error) {
      console.error('Failed to rollback:', error);
    } finally {
      setRollingBack(false);
    }
  };

  const resetCreateForm = () => {
    setNewTagName('');
    setNewTagDescription('');
    setNewTagIsRelease(false);
    setSelectedBranchId('');
    setSelectedCommitId('');
    setBranchCommits([]);
  };

  const filteredTags = tags.filter((tag) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        tag.name.toLowerCase().includes(query) ||
        tag.description?.toLowerCase().includes(query) ||
        tag.commit.message.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const suggestTagName = () => {
    // Find the highest version number
    const versionPattern = /^v?(\d+)\.(\d+)\.(\d+)$/;
    let maxVersion = { major: 0, minor: 0, patch: 0 };

    tags.forEach((tag) => {
      const match = tag.name.match(versionPattern);
      if (match && match[1] && match[2] && match[3]) {
        const major = Number(match[1]);
        const minor = Number(match[2]);
        const patch = Number(match[3]);
        if (
          major > maxVersion.major ||
          (major === maxVersion.major && minor > maxVersion.minor) ||
          (major === maxVersion.major && minor === maxVersion.minor && patch > maxVersion.patch)
        ) {
          maxVersion = { major, minor, patch };
        }
      }
    });

    // Suggest next patch version
    if (maxVersion.major > 0 || maxVersion.minor > 0 || maxVersion.patch > 0) {
      return `v${maxVersion.major}.${maxVersion.minor}.${maxVersion.patch + 1}`;
    }
    return 'v1.0.0';
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-indigo-400" />
          <h3 className="font-medium">Tags de version</h3>
          <Badge variant="secondary">{tags.length}</Badge>
        </div>
        <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nouveau tag
        </Button>
      </div>

      {/* Filters */}
      <div className="p-4 border-b space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Releases uniquement</span>
          </div>
          <Switch
            checked={filterReleaseOnly}
            onCheckedChange={(checked) => {
              setFilterReleaseOnly(checked);
              loadTags();
            }}
          />
        </div>
      </div>

      {/* Tags list */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            Chargement...
          </div>
        ) : filteredTags.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground p-4">
            <Tag className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm text-center">
              {searchQuery ? 'Aucun tag trouvé' : 'Aucun tag de version'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredTags.map((tag) => (
              <div
                key={tag.id}
                className="p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{tag.name}</span>
                      {tag.isRelease && (
                        <Badge variant="default" className="bg-green-600">
                          <Package className="h-3 w-3 mr-1" />
                          Release
                        </Badge>
                      )}
                      {tag.branch && (
                        <Badge variant="outline" className="text-xs">
                          {tag.branch.name}
                        </Badge>
                      )}
                    </div>
                    {tag.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {tag.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex items-center gap-1">
                            <GitCommit className="h-3 w-3" />
                            <span className="truncate max-w-[150px]">
                              {tag.commit.message}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{tag.commit.message}</p>
                            <p className="text-xs opacity-70">
                              {format(new Date(tag.commit.createdAt), 'PPp', { locale: fr })}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(tag.createdAt), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </span>
                      {tag.createdBy.name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {tag.createdBy.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <span className="sr-only">Actions</span>
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 5v.01M12 12v.01M12 19v.01"
                          />
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onRollbackToTag && (
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedTag(tag);
                            setRollbackDialogOpen(true);
                          }}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Restaurer
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setSelectedTag(tag);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Create dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un tag de version</DialogTitle>
            <DialogDescription>
              Les tags permettent de marquer des versions spécifiques de votre workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nom du tag</label>
              <div className="flex gap-2">
                <Input
                  placeholder="v1.0.0"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewTagName(suggestTagName())}
                >
                  Suggérer
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optionnel)</label>
              <Textarea
                placeholder="Notes de version..."
                value={newTagDescription}
                onChange={(e) => setNewTagDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Branche</label>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une branche" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedBranchId && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Commit</label>
                <Select
                  value={selectedCommitId}
                  onValueChange={setSelectedCommitId}
                  disabled={loadingCommits}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={loadingCommits ? 'Chargement...' : 'Sélectionner un commit'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {branchCommits.map((commit) => (
                      <SelectItem key={commit.id} value={commit.id}>
                        <div className="flex flex-col">
                          <span className="truncate">{commit.message}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(commit.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Marquer comme release</label>
                <p className="text-xs text-muted-foreground">
                  Les releases sont des versions stables prêtes pour la production
                </p>
              </div>
              <Switch checked={newTagIsRelease} onCheckedChange={setNewTagIsRelease} />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setCreateDialogOpen(false);
                resetCreateForm();
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !newTagName || !selectedCommitId}
            >
              {creating ? 'Création...' : 'Créer le tag'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le tag ?</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Le tag &quot;{selectedTag?.name}&quot; sera
              définitivement supprimé.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rollback dialog */}
      <Dialog open={rollbackDialogOpen} onOpenChange={setRollbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurer depuis le tag ?</DialogTitle>
            <DialogDescription>
              Le workflow sera restauré à l'état du tag &quot;{selectedTag?.name}&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 py-4">
            <input
              type="checkbox"
              id="createBackupTagRollback"
              checked={createBackupTag}
              onChange={(e) => setCreateBackupTag(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="createBackupTagRollback" className="text-sm">
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

export default VersionTagsPanel;
