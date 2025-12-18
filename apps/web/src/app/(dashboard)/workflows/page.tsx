'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Play, Trash, Copy, Workflow, Search, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { workflowsApi } from '@/lib/api/workflows';
import { executionsApi } from '@/lib/api/executions';
import { cn, formatDate, getStatusColor } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

const statusLabels: Record<string, string> = {
  active: 'Actif',
  inactive: 'Inactif',
  draft: 'Brouillon',
  ACTIVE: 'Actif',
  INACTIVE: 'Inactif',
  DRAFT: 'Brouillon',
};

export default function WorkflowsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

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

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Workflows
          </h1>
          <p className="text-gray-500 mt-1">
            Créez et gérez vos automatisations
          </p>
        </div>
        <Button onClick={createWorkflow} className="rounded-xl shadow-md">
          <Plus className="mr-2 h-4 w-4" />
          Nouveau workflow
        </Button>
      </div>

      {/* Barre de recherche */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Rechercher un workflow..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl bg-[#1a1a2e] border-gray-700 text-white placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-gray-500">Chargement des workflows...</p>
          </div>
        </div>
      )}

      {/* État vide */}
      {!isLoading && workflows?.data?.length === 0 && (
        <Card className="rounded-2xl border-dashed border-gray-700 bg-[#1a1a2e]">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-primary/20 p-4 mb-4">
              <Workflow className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-white">Aucun workflow</h3>
            <p className="text-gray-500 mt-2 text-center max-w-sm">
              Créez votre premier workflow pour automatiser vos tâches
            </p>
            <Button className="mt-6 rounded-xl" onClick={createWorkflow}>
              <Plus className="mr-2 h-4 w-4" />
              Créer un workflow
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Grille de workflows */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {workflows?.data?.map((workflow) => (
          <Card
            key={workflow.id}
            className="group overflow-hidden rounded-2xl border-gray-700 bg-[#1a1a2e] shadow-md transition-all hover:shadow-xl hover:border-gray-600"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1 min-w-0">
                  <Link href={`/workflows/${workflow.id}`}>
                    <CardTitle className="text-lg text-white hover:text-primary transition-colors truncate">
                      {workflow.name}
                    </CardTitle>
                  </Link>
                  <CardDescription className="line-clamp-2 text-sm text-gray-500">
                    {workflow.description || 'Pas de description'}
                  </CardDescription>
                </div>
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium ml-2 shrink-0',
                    getStatusColor(workflow.status),
                  )}
                >
                  {statusLabels[workflow.status] || workflow.status}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" />
                  <span>v{workflow.version}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{formatDate(workflow.updatedAt)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => triggerMutation.mutate(workflow.id)}
                  disabled={triggerMutation.isPending}
                  className="flex-1 rounded-lg bg-green-600 hover:bg-green-700"
                >
                  <Play className="mr-1.5 h-3.5 w-3.5" />
                  Exécuter
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => duplicateMutation.mutate(workflow.id)}
                  disabled={duplicateMutation.isPending}
                  className="rounded-lg border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (window.confirm('Supprimer ce workflow ?')) {
                      deleteMutation.mutate(workflow.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="rounded-lg border-gray-700 bg-gray-800/50 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                >
                  <Trash className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
