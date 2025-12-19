'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GitBranch,
  GitPullRequest,
  GitMerge,
  Plus,
  ChevronDown,
  ChevronRight,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  MessageSquare,
  AlertTriangle,
  MoreVertical,
  Trash2,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
  branchesApi,
  type WorkflowBranch,
  type WorkflowPullRequest,
  type MergeStrategy,
  type ReviewStatus,
} from '@/lib/api/branches';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BranchPanelProps {
  workflowId: string;
  currentBranchId?: string;
  onBranchChange: (branch: WorkflowBranch) => void;
  onGraphUpdate?: (graph: Record<string, unknown>) => void;
}

const statusColors = {
  ACTIVE: 'bg-green-500',
  MERGED: 'bg-purple-500',
  CLOSED: 'bg-gray-500',
  DELETED: 'bg-red-500',
};

const prStatusColors = {
  OPEN: 'bg-green-500/20 text-green-400 border-green-500/30',
  MERGED: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  CLOSED: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export function BranchPanel({
  workflowId,
  currentBranchId,
  onBranchChange,
}: BranchPanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'branches' | 'prs'>('branches');
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());
  const [createBranchOpen, setCreateBranchOpen] = useState(false);
  const [createPROpen, setCreatePROpen] = useState(false);
  const [selectedPR, setSelectedPR] = useState<WorkflowPullRequest | null>(null);

  // Form states
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchDescription, setNewBranchDescription] = useState('');
  const [baseBranchId, setBaseBranchId] = useState('');
  const [prTitle, setPrTitle] = useState('');
  const [prDescription, setPrDescription] = useState('');
  const [sourceBranchId, setSourceBranchId] = useState('');
  const [targetBranchId, setTargetBranchId] = useState('');

  // Fetch branches
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ['branches', workflowId],
    queryFn: () => branchesApi.getBranches(workflowId),
  });

  // Fetch PRs
  const { data: pullRequests = [], isLoading: prsLoading } = useQuery({
    queryKey: ['pull-requests', workflowId],
    queryFn: () => branchesApi.getPullRequests(workflowId),
  });

  // Mutations
  const createBranchMutation = useMutation({
    mutationFn: branchesApi.createBranch,
    onSuccess: (branch) => {
      toast({ title: 'Branche créée' });
      queryClient.invalidateQueries({ queryKey: ['branches', workflowId] });
      setCreateBranchOpen(false);
      resetBranchForm();
      onBranchChange(branch);
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const deleteBranchMutation = useMutation({
    mutationFn: branchesApi.deleteBranch,
    onSuccess: () => {
      toast({ title: 'Branche supprimée' });
      queryClient.invalidateQueries({ queryKey: ['branches', workflowId] });
    },
  });

  const createPRMutation = useMutation({
    mutationFn: branchesApi.createPullRequest,
    onSuccess: () => {
      toast({ title: 'Pull request créée' });
      queryClient.invalidateQueries({ queryKey: ['pull-requests', workflowId] });
      setCreatePROpen(false);
      resetPRForm();
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const mergePRMutation = useMutation({
    mutationFn: ({ prId, strategy }: { prId: string; strategy?: MergeStrategy }) =>
      branchesApi.mergePullRequest(prId, strategy),
    onSuccess: () => {
      toast({ title: 'Pull request fusionnée' });
      queryClient.invalidateQueries({ queryKey: ['branches', workflowId] });
      queryClient.invalidateQueries({ queryKey: ['pull-requests', workflowId] });
      setSelectedPR(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const addReviewMutation = useMutation({
    mutationFn: ({ prId, status, body }: { prId: string; status: ReviewStatus; body?: string }) =>
      branchesApi.addReview(prId, status, body),
    onSuccess: () => {
      toast({ title: 'Review ajoutée' });
      queryClient.invalidateQueries({ queryKey: ['pull-requests', workflowId] });
    },
  });

  const resetBranchForm = () => {
    setNewBranchName('');
    setNewBranchDescription('');
    setBaseBranchId('');
  };

  const resetPRForm = () => {
    setPrTitle('');
    setPrDescription('');
    setSourceBranchId('');
    setTargetBranchId('');
  };

  const handleCreateBranch = () => {
    createBranchMutation.mutate({
      workflowId,
      name: newBranchName,
      description: newBranchDescription || undefined,
      baseBranchId: baseBranchId || undefined,
    });
  };

  const handleCreatePR = () => {
    createPRMutation.mutate({
      workflowId,
      title: prTitle,
      description: prDescription || undefined,
      sourceBranchId,
      targetBranchId,
    });
  };

  const toggleBranch = (branchId: string) => {
    const newExpanded = new Set(expandedBranches);
    if (newExpanded.has(branchId)) {
      newExpanded.delete(branchId);
    } else {
      newExpanded.add(branchId);
    }
    setExpandedBranches(newExpanded);
  };

  const mainBranch = branches.find((b) => b.name === 'main');
  const otherBranches = branches.filter((b) => b.name !== 'main');

  return (
    <div className="flex h-full flex-col bg-card border-l">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Branches</h3>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => setCreateBranchOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="w-full rounded-none border-b">
          <TabsTrigger value="branches" className="flex-1">
            <GitBranch className="h-3 w-3 mr-1" />
            Branches
            <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
              {branches.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="prs" className="flex-1">
            <GitPullRequest className="h-3 w-3 mr-1" />
            PRs
            <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
              {pullRequests.filter((pr) => pr.status === 'OPEN').length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Branches List */}
        <TabsContent value="branches" className="m-0">
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {branchesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Main branch */}
                  {mainBranch && (
                    <BranchItem
                      branch={mainBranch}
                      isMain
                      isActive={currentBranchId === mainBranch.id}
                      onClick={() => onBranchChange(mainBranch)}
                    />
                  )}

                  {/* Other branches */}
                  {otherBranches.map((branch) => (
                    <BranchItem
                      key={branch.id}
                      branch={branch}
                      isActive={currentBranchId === branch.id}
                      onClick={() => onBranchChange(branch)}
                      onDelete={() => deleteBranchMutation.mutate(branch.id)}
                      onCreatePR={() => {
                        setSourceBranchId(branch.id);
                        setTargetBranchId(mainBranch?.id || '');
                        setPrTitle(`Merge ${branch.name} into main`);
                        setCreatePROpen(true);
                      }}
                    />
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Pull Requests List */}
        <TabsContent value="prs" className="m-0">
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {prsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : pullRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <GitPullRequest className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucune pull request</p>
                </div>
              ) : (
                pullRequests.map((pr) => (
                  <PRItem
                    key={pr.id}
                    pr={pr}
                    onClick={() => setSelectedPR(pr)}
                  />
                ))
              )}
            </div>
          </ScrollArea>

          {/* Create PR button */}
          <div className="border-t p-2">
            <Button
              className="w-full"
              size="sm"
              onClick={() => setCreatePROpen(true)}
              disabled={branches.filter((b) => b.name !== 'main').length === 0}
            >
              <Plus className="h-4 w-4 mr-1" />
              Nouvelle Pull Request
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Branch Dialog */}
      <Dialog open={createBranchOpen} onOpenChange={setCreateBranchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer une branche</DialogTitle>
            <DialogDescription>
              Créez une nouvelle branche pour travailler sur des modifications
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nom de la branche</label>
              <Input
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value.replace(/\s/g, '-'))}
                placeholder="feature/ma-fonctionnalite"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Branche de base</label>
              <Select value={baseBranchId} onValueChange={setBaseBranchId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="main (défaut)" />
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

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={newBranchDescription}
                onChange={(e) => setNewBranchDescription(e.target.value)}
                placeholder="Description optionnelle..."
                className="mt-1"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateBranchOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreateBranch}
              disabled={!newBranchName || createBranchMutation.isPending}
            >
              Créer la branche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create PR Dialog */}
      <Dialog open={createPROpen} onOpenChange={setCreatePROpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer une Pull Request</DialogTitle>
            <DialogDescription>
              Proposez de fusionner vos modifications
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Titre</label>
              <Input
                value={prTitle}
                onChange={(e) => setPrTitle(e.target.value)}
                placeholder="Titre de la PR"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">De</label>
                <Select value={sourceBranchId} onValueChange={setSourceBranchId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Branche source" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches
                      .filter((b) => b.id !== targetBranchId)
                      .map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Vers</label>
                <Select value={targetBranchId} onValueChange={setTargetBranchId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Branche cible" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches
                      .filter((b) => b.id !== sourceBranchId)
                      .map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={prDescription}
                onChange={(e) => setPrDescription(e.target.value)}
                placeholder="Décrivez vos modifications..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatePROpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreatePR}
              disabled={!prTitle || !sourceBranchId || !targetBranchId || createPRMutation.isPending}
            >
              Créer la PR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PR Detail Dialog */}
      <Dialog open={!!selectedPR} onOpenChange={() => setSelectedPR(null)}>
        <DialogContent className="max-w-2xl">
          {selectedPR && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={prStatusColors[selectedPR.status]}>
                    {selectedPR.status}
                  </Badge>
                  <DialogTitle>{selectedPR.title}</DialogTitle>
                </div>
                <DialogDescription>
                  {selectedPR.sourceBranch?.name} → {selectedPR.targetBranch?.name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {selectedPR.description && (
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-sm">{selectedPR.description}</p>
                  </div>
                )}

                {selectedPR.conflictData ? (
                  <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3">
                    <div className="flex items-center gap-2 text-yellow-500">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Conflits détectés</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Des modifications conflictuelles ont été détectées. Résolvez-les avant de fusionner.
                    </p>
                  </div>
                ) : null}

                {/* Reviews */}
                <div>
                  <h4 className="font-medium mb-2">Reviews</h4>
                  {selectedPR.reviews?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune review</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedPR.reviews?.map((review) => (
                        <div
                          key={review.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-muted"
                        >
                          <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">
                            {review.reviewer?.name?.[0] || '?'}
                          </div>
                          <span className="text-sm">{review.reviewer?.name}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              review.status === 'APPROVED' && 'bg-green-500/20 text-green-400',
                              review.status === 'CHANGES_REQUESTED' && 'bg-red-500/20 text-red-400'
                            )}
                          >
                            {review.status === 'APPROVED' ? (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            ) : review.status === 'CHANGES_REQUESTED' ? (
                              <XCircle className="h-3 w-3 mr-1" />
                            ) : null}
                            {review.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {selectedPR.status === 'OPEN' && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() =>
                        addReviewMutation.mutate({
                          prId: selectedPR.id,
                          status: 'APPROVED',
                        })
                      }
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Approuver
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        addReviewMutation.mutate({
                          prId: selectedPR.id,
                          status: 'CHANGES_REQUESTED',
                        })
                      }
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Demander des changements
                    </Button>
                    <Button
                      className="ml-auto"
                      onClick={() => mergePRMutation.mutate({ prId: selectedPR.id })}
                      disabled={mergePRMutation.isPending}
                    >
                      <GitMerge className="h-4 w-4 mr-1" />
                      Fusionner
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface BranchItemProps {
  branch: WorkflowBranch;
  isMain?: boolean;
  isActive?: boolean;
  onClick: () => void;
  onDelete?: () => void;
  onCreatePR?: () => void;
}

function BranchItem({ branch, isMain, isActive, onClick, onDelete, onCreatePR }: BranchItemProps) {
  return (
    <div
      className={cn(
        'group flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer transition-colors',
        isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
      )}
      onClick={onClick}
    >
      <div className={cn('h-2 w-2 rounded-full', statusColors[branch.status])} />
      <GitBranch className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 truncate text-sm">{branch.name}</span>
      {isMain && (
        <Badge variant="secondary" className="text-[10px] h-4 px-1">
          main
        </Badge>
      )}
      {branch._count && (
        <span className="text-xs text-muted-foreground">
          {branch._count.commits}
        </span>
      )}
      {!isMain && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onCreatePR && (
              <DropdownMenuItem onClick={onCreatePR}>
                <GitPullRequest className="h-4 w-4 mr-2" />
                Créer une PR
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem onClick={onDelete} className="text-red-500">
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

interface PRItemProps {
  pr: WorkflowPullRequest;
  onClick: () => void;
}

function PRItem({ pr, onClick }: PRItemProps) {
  return (
    <div
      className="rounded-lg border bg-card p-3 cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <GitPullRequest className={cn(
          'h-4 w-4 mt-0.5',
          pr.status === 'OPEN' ? 'text-green-500' :
          pr.status === 'MERGED' ? 'text-purple-500' : 'text-gray-500'
        )} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{pr.title}</span>
            <Badge variant="outline" className={cn('text-[10px]', prStatusColors[pr.status])}>
              {pr.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>{pr.sourceBranch?.name}</span>
            <ChevronRight className="h-3 w-3" />
            <span>{pr.targetBranch?.name}</span>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(pr.createdAt), { addSuffix: true, locale: fr })}
            </span>
            {pr._count && (
              <>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {pr._count.comments}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {pr._count.reviews}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
