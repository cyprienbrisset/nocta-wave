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
  TrendingDown,
  Activity,
  Zap,
  ArrowRight,
  Loader2,
  BarChart3,
  Timer,
  Sparkles,
  ArrowUpRight,
  CircleDot,
  Calendar,
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

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'ce matin';
  if (hour < 18) return 'cet après-midi';
  return 'ce soir';
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

const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  PENDING: Clock,
  RUNNING: CircleDot,
  COMPLETED: CheckCircle,
  FAILED: XCircle,
  pending: Clock,
  running: CircleDot,
  completed: CheckCircle,
  failed: XCircle,
};

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: workflows, isLoading: isLoadingWorkflows } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => workflowsApi.list({ take: 5 }),
  });

  const { data: executions, isLoading: isLoadingExecutions } = useQuery({
    queryKey: ['executions'],
    queryFn: () => executionsApi.list({ take: 6 }),
  });

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['execution-stats'],
    queryFn: () => executionsApi.getStats(),
  });

  const activeWorkflows = workflows?.data?.filter(
    (w) => (w.status as string) === 'ACTIVE' || (w.status as string) === 'active'
  ).length || 0;

  const successRate = parseFloat(stats?.successRate || '0');
  const isGoodRate = successRate >= 80;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Calendar className="h-4 w-4" />
            <span>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
            {getGreeting()}, <span className="gradient-text">{user?.name?.split(' ')[0] || 'Utilisateur'}</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Voici un aperçu de vos automatisations {getTimeOfDay()}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/workflows">
            <Button className="btn-primary">
              <Plus className="h-4 w-4" />
              Nouveau workflow
            </Button>
          </Link>
          <Link href="/analytics">
            <Button variant="outline" className="btn-secondary">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Workflows */}
        <div className="stat-card group">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Total Workflows</p>
              {isLoadingWorkflows ? (
                <div className="h-9 w-16 skeleton" />
              ) : (
                <p className="text-3xl font-bold text-foreground">{workflows?.total || 0}</p>
              )}
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-500">
                  <TrendingUp className="h-3 w-3" />
                  +2
                </span>
                <span className="text-xs text-muted-foreground">cette semaine</span>
              </div>
            </div>
            <div className="rounded-2xl bg-blue-500/10 p-3 ring-1 ring-blue-500/20 transition-all duration-300 group-hover:bg-blue-500/20 group-hover:ring-blue-500/30">
              <Workflow className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Active Workflows */}
        <div className="stat-card group">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Workflows Actifs</p>
              {isLoadingWorkflows ? (
                <div className="h-9 w-16 skeleton" />
              ) : (
                <p className="text-3xl font-bold text-foreground">{activeWorkflows}</p>
              )}
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
                  <Sparkles className="h-3 w-3" />
                  En production
                </span>
              </div>
            </div>
            <div className="rounded-2xl bg-green-500/10 p-3 ring-1 ring-green-500/20 transition-all duration-300 group-hover:bg-green-500/20 group-hover:ring-green-500/30">
              <Zap className="h-6 w-6 text-green-500" />
            </div>
          </div>
        </div>

        {/* Executions */}
        <div className="stat-card group">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Exécutions Totales</p>
              {isLoadingStats ? (
                <div className="h-9 w-16 skeleton" />
              ) : (
                <p className="text-3xl font-bold text-foreground">{stats?.total || 0}</p>
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">
                  {stats?.running || 0} en cours
                </span>
                {(stats?.running || 0) > 0 && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                )}
              </div>
            </div>
            <div className="rounded-2xl bg-purple-500/10 p-3 ring-1 ring-purple-500/20 transition-all duration-300 group-hover:bg-purple-500/20 group-hover:ring-purple-500/30">
              <Activity className="h-6 w-6 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="stat-card group">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Taux de Réussite</p>
              {isLoadingStats ? (
                <div className="h-9 w-16 skeleton" />
              ) : (
                <p className="text-3xl font-bold text-foreground">{successRate}%</p>
              )}
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium",
                  isGoodRate ? "text-green-500" : "text-amber-500"
                )}>
                  {isGoodRate ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {isGoodRate ? 'Excellent' : 'À améliorer'}
                </span>
              </div>
            </div>
            <div className={cn(
              "rounded-2xl p-3 ring-1 transition-all duration-300",
              isGoodRate
                ? "bg-green-500/10 ring-green-500/20 group-hover:bg-green-500/20 group-hover:ring-green-500/30"
                : "bg-amber-500/10 ring-amber-500/20 group-hover:bg-amber-500/20 group-hover:ring-amber-500/30"
            )}>
              <CheckCircle className={cn("h-6 w-6", isGoodRate ? "text-green-500" : "text-amber-500")} />
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-4">
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${successRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Workflows - Takes 2 columns */}
        <div className="lg:col-span-2">
          <Card className="panel h-full">
            <CardHeader className="panel-header">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2.5 ring-1 ring-primary/20">
                  <Workflow className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Workflows Récents</CardTitle>
                  <CardDescription>Vos dernières automatisations créées</CardDescription>
                </div>
              </div>
              <Link
                href="/workflows"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Voir tout
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardHeader>
            <CardContent className="panel-content">
              {isLoadingWorkflows ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
                      <div className="h-10 w-10 rounded-xl skeleton" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 skeleton" />
                        <div className="h-3 w-24 skeleton" />
                      </div>
                      <div className="h-6 w-16 skeleton rounded-full" />
                    </div>
                  ))}
                </div>
              ) : workflows?.data?.length === 0 ? (
                <div className="empty-state py-12">
                  <div className="empty-state-icon">
                    <Workflow className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">Aucun workflow</h3>
                  <p className="text-muted-foreground mb-4">Créez votre premier workflow pour commencer</p>
                  <Link href="/workflows">
                    <Button className="btn-primary">
                      <Plus className="h-4 w-4" />
                      Créer un workflow
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {workflows?.data?.map((workflow, index) => (
                    <Link
                      key={workflow.id}
                      href={`/workflows/${workflow.id}`}
                      className="group flex items-center justify-between rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:bg-muted/30 hover:shadow-md"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 ring-1 ring-primary/10 transition-all duration-200 group-hover:ring-primary/30">
                          <Workflow className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                            {workflow.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">
                              v{workflow.version || 1}
                            </span>
                            <span className="text-muted-foreground/30">•</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(workflow.updatedAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'status-badge',
                            (workflow.status as string) === 'ACTIVE' || (workflow.status as string) === 'active'
                              ? 'status-badge-success'
                              : (workflow.status as string) === 'DRAFT' || (workflow.status as string) === 'draft'
                              ? 'status-badge-pending'
                              : 'status-badge-warning'
                          )}
                        >
                          {statusLabels[workflow.status] || workflow.status}
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Executions */}
        <div className="lg:col-span-1">
          <Card className="panel h-full">
            <CardHeader className="panel-header">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-accent/10 p-2.5 ring-1 ring-accent/20">
                  <Activity className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Exécutions</CardTitle>
                  <CardDescription>Activité récente</CardDescription>
                </div>
              </div>
              <Link
                href="/executions"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Tout voir
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardHeader>
            <CardContent className="panel-content">
              {isLoadingExecutions ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="h-8 w-8 rounded-lg skeleton" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 w-24 skeleton" />
                        <div className="h-2.5 w-16 skeleton" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : executions?.data?.length === 0 ? (
                <div className="empty-state py-8">
                  <div className="empty-state-icon h-12 w-12">
                    <Activity className="h-6 w-6" />
                  </div>
                  <p className="text-sm text-muted-foreground">Aucune exécution récente</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {executions?.data?.map((execution, index) => {
                    const StatusIcon = statusIcons[execution.status] || Clock;
                    return (
                      <Link
                        key={execution.id}
                        href={`/executions/${execution.id}`}
                        className="group flex items-center gap-3 rounded-lg p-3 transition-all duration-200 hover:bg-muted/50"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                          (execution.status as string) === 'COMPLETED' || (execution.status as string) === 'completed'
                            ? "bg-green-500/10 text-green-500"
                            : (execution.status as string) === 'FAILED' || (execution.status as string) === 'failed'
                            ? "bg-red-500/10 text-red-500"
                            : (execution.status as string) === 'RUNNING' || (execution.status as string) === 'running'
                            ? "bg-blue-500/10 text-blue-500"
                            : "bg-muted text-muted-foreground"
                        )}>
                          <StatusIcon className={cn(
                            "h-4 w-4",
                            ((execution.status as string) === 'RUNNING' || (execution.status as string) === 'running') && "animate-pulse"
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {execution.workflow?.name || 'Workflow'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={cn(
                              "text-xs font-medium",
                              (execution.status as string) === 'COMPLETED' || (execution.status as string) === 'completed'
                                ? "text-green-500"
                                : (execution.status as string) === 'FAILED' || (execution.status as string) === 'failed'
                                ? "text-red-500"
                                : (execution.status as string) === 'RUNNING' || (execution.status as string) === 'running'
                                ? "text-blue-500"
                                : "text-muted-foreground"
                            )}>
                              {statusLabels[execution.status] || execution.status}
                            </span>
                            <span className="text-muted-foreground/30">•</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(execution.createdAt)}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/workflows" className="group">
          <div className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:-translate-y-1">
            <div className="rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-3 ring-1 ring-blue-500/20 transition-all group-hover:ring-blue-500/40">
              <Plus className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                Créer un workflow
              </p>
              <p className="text-sm text-muted-foreground">
                Nouvelle automatisation
              </p>
            </div>
          </div>
        </Link>

        <Link href="/executions" className="group">
          <div className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:-translate-y-1">
            <div className="rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-3 ring-1 ring-purple-500/20 transition-all group-hover:ring-purple-500/40">
              <PlayCircle className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                Voir les exécutions
              </p>
              <p className="text-sm text-muted-foreground">
                Historique complet
              </p>
            </div>
          </div>
        </Link>

        <Link href="/credentials" className="group">
          <div className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:-translate-y-1">
            <div className="rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 p-3 ring-1 ring-amber-500/20 transition-all group-hover:ring-amber-500/40">
              <Timer className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                Gérer les credentials
              </p>
              <p className="text-sm text-muted-foreground">
                Clés et tokens API
              </p>
            </div>
          </div>
        </Link>

        <Link href="/docs" className="group">
          <div className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:-translate-y-1">
            <div className="rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-3 ring-1 ring-green-500/20 transition-all group-hover:ring-green-500/40">
              <Sparkles className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                Documentation
              </p>
              <p className="text-sm text-muted-foreground">
                Guides et tutoriels
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
