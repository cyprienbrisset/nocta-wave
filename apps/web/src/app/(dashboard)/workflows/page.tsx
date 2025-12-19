'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Play,
  Trash,
  Copy,
  Workflow,
  Search,
  Clock,
  Zap,
  LayoutGrid,
  List,
  Filter,
  ChevronDown,
  MoreHorizontal,
  ArrowUpRight,
  CheckCircle,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { workflowsApi } from '@/lib/api/workflows';
import { executionsApi } from '@/lib/api/executions';
import { cn, formatDate } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

const statusLabels: Record<string, string> = {
  active: 'Actif',
  inactive: 'Inactif',
  draft: 'Brouillon',
  ACTIVE: 'Actif',
  INACTIVE: 'Inactif',
  DRAFT: 'Brouillon',
};

const defaultStatusConfig = {
  color: 'text-muted-foreground',
  bg: 'bg-muted border-border',
  icon: <Clock className="h-3.5 w-3.5" />,
};

const statusConfig: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  ACTIVE: {
    color: 'text-green-500',
    bg: 'bg-green-500/10 border-green-500/20',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  active: {
    color: 'text-green-500',
    bg: 'bg-green-500/10 border-green-500/20',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  INACTIVE: {
    color: 'text-amber-500',
    bg: 'bg-amber-500/10 border-amber-500/20',
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  inactive: {
    color: 'text-amber-500',
    bg: 'bg-amber-500/10 border-amber-500/20',
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  DRAFT: {
    color: 'text-muted-foreground',
    bg: 'bg-muted border-border',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  draft: {
    color: 'text-muted-foreground',
    bg: 'bg-muted border-border',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
};

type ViewMode = 'grid' | 'list';
type FilterStatus = 'all' | 'ACTIVE' | 'INACTIVE' | 'DRAFT';

export default function WorkflowsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workflows', search],
    queryFn: () => workflowsApi.list({ search }),
  });

  const deleteMutation = useMutation({
    mutationFn: workflowsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast({ title: 'Workflow supprimé' });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: workflowsApi.duplicate,
    onSuccess: (workflow) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast({ title: 'Workflow dupliqué' });
      router.push(`/workflows/${workflow.id}`);
    },
  });

  const triggerMutation = useMutation({
    mutationFn: (workflowId: string) => executionsApi.trigger(workflowId),
    onSuccess: (execution) => {
      toast({ title: 'Workflow lancé' });
      router.push(`/executions/${execution.id}`);
    },
  });

  const createWorkflow = async () => {
    const workflow = await workflowsApi.create({
      name: 'Nouveau Workflow',
      description: '',
    });
    router.push(`/workflows/${workflow.id}`);
  };

  // Filter workflows
  const filteredWorkflows = workflows?.data?.filter((workflow) => {
    if (filterStatus === 'all') return true;
    return (workflow.status as string).toUpperCase() === filterStatus;
  });

  // Stats
  const totalWorkflows = workflows?.data?.length || 0;
  const activeCount = workflows?.data?.filter(
    (w) => (w.status as string).toUpperCase() === 'ACTIVE'
  ).length || 0;
  const draftCount = workflows?.data?.filter(
    (w) => (w.status as string).toUpperCase() === 'DRAFT'
  ).length || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
            Workflows
          </h1>
          <p className="text-muted-foreground text-lg">
            Créez et gérez vos automatisations
          </p>
        </div>
        <Button onClick={createWorkflow} className="btn-primary">
          <Plus className="h-4 w-4" />
          Nouveau workflow
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-card border border-border/50">
          <div className="flex items-center gap-2 text-sm">
            <Workflow className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Total:</span>
            <span className="font-semibold text-foreground">{totalWorkflows}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-card border border-border/50">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">Actifs:</span>
            <span className="font-semibold text-green-500">{activeCount}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-card border border-border/50">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Brouillons:</span>
            <span className="font-semibold text-foreground">{draftCount}</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un workflow..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-11 rounded-xl bg-card border-border text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Status filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="btn-secondary h-11 gap-2">
                <Filter className="h-4 w-4" />
                {filterStatus === 'all' ? 'Tous' : statusLabels[filterStatus]}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => setFilterStatus('all')}>
                Tous
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterStatus('ACTIVE')}>
                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                Actifs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('INACTIVE')}>
                <XCircle className="h-4 w-4 mr-2 text-amber-500" />
                Inactifs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('DRAFT')}>
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                Brouillons
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View mode toggle */}
          <div className="flex items-center rounded-xl bg-muted p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                viewMode === 'grid'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                viewMode === 'list'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center animate-pulse">
                <Workflow className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Chargement des workflows...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredWorkflows?.length === 0 && (
        <div className="empty-state py-20">
          <div className="empty-state-icon">
            <Workflow className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {search || filterStatus !== 'all' ? 'Aucun résultat' : 'Aucun workflow'}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            {search || filterStatus !== 'all'
              ? 'Essayez de modifier vos filtres ou votre recherche'
              : 'Créez votre premier workflow pour automatiser vos tâches'}
          </p>
          {!search && filterStatus === 'all' && (
            <Button onClick={createWorkflow} className="btn-primary">
              <Plus className="h-4 w-4" />
              Créer un workflow
            </Button>
          )}
        </div>
      )}

      {/* Grid View */}
      {!isLoading && filteredWorkflows && filteredWorkflows.length > 0 && viewMode === 'grid' && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredWorkflows.map((workflow, index) => {
            const status = statusConfig[(workflow.status as string)] ?? defaultStatusConfig;
            return (
              <div
                key={workflow.id}
                className="workflow-card group animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <Link href={`/workflows/${workflow.id}`} className="block group/link">
                      <h3 className="font-semibold text-foreground truncate group-hover/link:text-primary transition-colors">
                        {workflow.name}
                      </h3>
                    </Link>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {workflow.description || 'Pas de description'}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/workflows/${workflow.id}`}>
                          <ArrowUpRight className="h-4 w-4 mr-2" />
                          Ouvrir
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicateMutation.mutate(workflow.id)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Dupliquer
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          if (window.confirm('Supprimer ce workflow ?')) {
                            deleteMutation.mutate(workflow.id);
                          }
                        }}
                        className="text-red-500 focus:text-red-500"
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Meta info */}
                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>v{workflow.version}</span>
                  </div>
                  <span className="text-muted-foreground/30">•</span>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatDate(workflow.updatedAt)}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border',
                      status.bg,
                      status.color
                    )}
                  >
                    {status.icon}
                    {statusLabels[workflow.status] || workflow.status}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => triggerMutation.mutate(workflow.id)}
                    disabled={triggerMutation.isPending}
                    className="h-8 px-3 rounded-lg bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Play className="h-3.5 w-3.5 mr-1.5" />
                    Exécuter
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {!isLoading && filteredWorkflows && filteredWorkflows.length > 0 && viewMode === 'list' && (
        <div className="space-y-2">
          {filteredWorkflows.map((workflow, index) => {
            const status = statusConfig[(workflow.status as string)] ?? defaultStatusConfig;
            return (
              <div
                key={workflow.id}
                className="group flex items-center justify-between rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:bg-muted/30 animate-fade-in-up"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 ring-1 ring-primary/10 shrink-0">
                    <Workflow className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/workflows/${workflow.id}`} className="block group/link">
                      <h3 className="font-medium text-foreground truncate group-hover/link:text-primary transition-colors">
                        {workflow.name}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">v{workflow.version}</span>
                      <span className="text-muted-foreground/30">•</span>
                      <span className="text-xs text-muted-foreground">{formatDate(workflow.updatedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span
                    className={cn(
                      'hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border',
                      status.bg,
                      status.color
                    )}
                  >
                    {status.icon}
                    {statusLabels[workflow.status] || workflow.status}
                  </span>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      onClick={() => triggerMutation.mutate(workflow.id)}
                      disabled={triggerMutation.isPending}
                      className="h-8 px-3 rounded-lg bg-green-500 hover:bg-green-600 text-white"
                    >
                      <Play className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => duplicateMutation.mutate(workflow.id)}
                      className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (window.confirm('Supprimer ce workflow ?')) {
                          deleteMutation.mutate(workflow.id);
                        }
                      }}
                      className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-red-500"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
