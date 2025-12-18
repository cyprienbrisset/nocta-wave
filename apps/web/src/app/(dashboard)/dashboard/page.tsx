'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Workflow,
  PlayCircle,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  TrendingUp,
  Activity,
  Zap,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { workflowsApi } from '@/lib/api/workflows';
import { executionsApi } from '@/lib/api/executions';
import { useAuthStore } from '@/stores/auth.store';
import { cn, formatDate, getStatusColor } from '@/lib/utils';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

const statusLabels: Record<string, string> = {
  active: 'Actif',
  inactive: 'Inactif',
  draft: 'Brouillon',
  ACTIVE: 'Actif',
  INACTIVE: 'Inactif',
  DRAFT: 'Brouillon',
  PENDING: 'En attente',
  RUNNING: 'En cours',
  COMPLETED: 'Terminé',
  FAILED: 'Échoué',
  pending: 'En attente',
  running: 'En cours',
  completed: 'Terminé',
  failed: 'Échoué',
};

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: workflows, isLoading: isLoadingWorkflows } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => workflowsApi.list({ take: 5 }),
  });

  const { data: executions, isLoading: isLoadingExecutions } = useQuery({
    queryKey: ['executions'],
    queryFn: () => executionsApi.list({ take: 5 }),
  });

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['execution-stats'],
    queryFn: () => executionsApi.getStats(),
  });

  const activeWorkflows = workflows?.data?.filter(
    (w) => (w.status as string) === 'ACTIVE' || (w.status as string) === 'active'
  ).length || 0;

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-purple-900/20 to-blue-900/20 border border-gray-700/50 p-8">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="rounded-full bg-primary/20 p-2">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-primary">WS Flows</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              {getGreeting()}, {user?.name?.split(' ')[0] || 'Utilisateur'}
            </h1>
            <p className="text-gray-400 text-lg max-w-xl">
              Gérez et automatisez vos workflows en toute simplicité
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-4 rounded-2xl bg-gray-800/50 border border-gray-700 px-5 py-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{activeWorkflows}</p>
                <p className="text-xs text-gray-400">Actifs</p>
              </div>
              <div className="w-px h-10 bg-gray-700" />
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{stats?.successRate || 0}%</p>
                <p className="text-xs text-gray-400">Réussite</p>
              </div>
            </div>
            <Link href="/workflows">
              <Button className="h-full rounded-xl shadow-lg hover:shadow-primary/25 transition-all">
                <Plus className="mr-2 h-4 w-4" />
                Nouveau workflow
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="group rounded-2xl border-gray-700 shadow-md bg-[#1a1a2e] hover:border-blue-500/50 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Total Workflows
            </CardTitle>
            <div className="rounded-xl bg-blue-900/50 p-2.5 group-hover:bg-blue-900/70 transition-colors">
              <Workflow className="h-5 w-5 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingWorkflows ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            ) : (
              <>
                <div className="text-3xl font-bold text-white">{workflows?.total || 0}</div>
                <p className="text-xs text-gray-500 mt-1">
                  Automatisations créées
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="group rounded-2xl border-gray-700 shadow-md bg-[#1a1a2e] hover:border-purple-500/50 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Total Exécutions
            </CardTitle>
            <div className="rounded-xl bg-purple-900/50 p-2.5 group-hover:bg-purple-900/70 transition-colors">
              <PlayCircle className="h-5 w-5 text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            ) : (
              <>
                <div className="text-3xl font-bold text-white">{stats?.total || 0}</div>
                <p className="text-xs text-gray-500 mt-1">
                  Workflows lancés
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="group rounded-2xl border-gray-700 shadow-md bg-[#1a1a2e] hover:border-green-500/50 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Réussies
            </CardTitle>
            <div className="rounded-xl bg-green-900/50 p-2.5 group-hover:bg-green-900/70 transition-colors">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            ) : (
              <>
                <div className="text-3xl font-bold text-white">{stats?.completed || 0}</div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-green-400" />
                  <span className="text-xs text-green-400 font-medium">
                    {stats?.successRate || 0}% de réussite
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="group rounded-2xl border-gray-700 shadow-md bg-[#1a1a2e] hover:border-red-500/50 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Échouées
            </CardTitle>
            <div className="rounded-xl bg-red-900/50 p-2.5 group-hover:bg-red-900/70 transition-colors">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            ) : (
              <>
                <div className="text-3xl font-bold text-white">{stats?.failed || 0}</div>
                <p className="text-xs text-gray-500 mt-1">
                  À vérifier
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Workflows récents */}
        <Card className="rounded-2xl border-gray-700 shadow-md bg-[#1a1a2e]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/20 p-2.5">
                  <Workflow className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg text-white">Workflows récents</CardTitle>
                  <CardDescription className="text-gray-500">Vos dernières automatisations</CardDescription>
                </div>
              </div>
              <Link href="/workflows" className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                Voir tout
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingWorkflows ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              </div>
            ) : (
              <div className="space-y-2">
                {workflows?.data?.length === 0 && (
                  <div className="text-center py-8">
                    <div className="rounded-full bg-gray-800 p-4 w-fit mx-auto mb-3">
                      <Workflow className="h-8 w-8 text-gray-600" />
                    </div>
                    <p className="text-sm text-gray-500">Aucun workflow</p>
                    <Link href="/workflows">
                      <Button variant="outline" className="mt-4 rounded-xl border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800">
                        <Plus className="mr-2 h-4 w-4" />
                        Créer un workflow
                      </Button>
                    </Link>
                  </div>
                )}
                {workflows?.data?.map((workflow) => (
                  <Link
                    key={workflow.id}
                    href={`/workflows/${workflow.id}`}
                    className="flex items-center justify-between rounded-xl border border-gray-700/50 bg-gray-800/30 p-3 transition-all hover:bg-gray-800/60 hover:border-gray-600"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-gray-700/50 p-2">
                        <Workflow className="h-4 w-4 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">{workflow.name}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {formatDate(workflow.updatedAt)}
                        </div>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-xs font-medium',
                        getStatusColor(workflow.status),
                      )}
                    >
                      {statusLabels[workflow.status] || workflow.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Exécutions récentes */}
        <Card className="rounded-2xl border-gray-700 shadow-md bg-[#1a1a2e]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-purple-900/50 p-2.5">
                  <Activity className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-lg text-white">Exécutions récentes</CardTitle>
                  <CardDescription className="text-gray-500">Derniers workflows lancés</CardDescription>
                </div>
              </div>
              <Link href="/executions" className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                Voir tout
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingExecutions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              </div>
            ) : (
              <div className="space-y-2">
                {executions?.data?.length === 0 && (
                  <div className="text-center py-8">
                    <div className="rounded-full bg-gray-800 p-4 w-fit mx-auto mb-3">
                      <Activity className="h-8 w-8 text-gray-600" />
                    </div>
                    <p className="text-sm text-gray-500">Aucune exécution</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Exécutez un workflow pour voir l'historique
                    </p>
                  </div>
                )}
                {executions?.data?.map((execution) => (
                  <Link
                    key={execution.id}
                    href={`/executions/${execution.id}`}
                    className="flex items-center justify-between rounded-xl border border-gray-700/50 bg-gray-800/30 p-3 transition-all hover:bg-gray-800/60 hover:border-gray-600"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-gray-700/50 p-2">
                        <PlayCircle className="h-4 w-4 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">{execution.workflow?.name}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {formatDate(execution.createdAt)}
                        </div>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-xs font-medium',
                        getStatusColor(execution.status),
                      )}
                    >
                      {statusLabels[execution.status] || execution.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
