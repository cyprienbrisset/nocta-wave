'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  Zap,
  Timer,
  Cpu,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { executionsApi } from '@/lib/api/executions';
import { workflowsApi } from '@/lib/api/workflows';
import { cn } from '@/lib/utils';

// Simple bar chart component
function SimpleBarChart({ data, maxValue }: { data: number[]; maxValue: number }) {
  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((value, index) => (
        <div
          key={index}
          className="flex-1 bg-gradient-to-t from-primary to-purple-500 rounded-t-sm transition-all duration-300 hover:from-primary/80 hover:to-purple-500/80"
          style={{ height: `${(value / maxValue) * 100}%`, minHeight: value > 0 ? '4px' : '0' }}
        />
      ))}
    </div>
  );
}

// Donut chart component
function DonutChart({ success, failed, pending }: { success: number; failed: number; pending: number }) {
  const total = success + failed + pending;
  if (total === 0) {
    return (
      <div className="relative w-32 h-32 mx-auto">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="50"
            stroke="currentColor"
            strokeWidth="12"
            fill="none"
            className="text-muted"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-muted-foreground">0%</span>
        </div>
      </div>
    );
  }

  const successPercent = (success / total) * 100;
  const failedPercent = (failed / total) * 100;
  const pendingPercent = (pending / total) * 100;

  const circumference = 2 * Math.PI * 50;
  const successDash = (successPercent / 100) * circumference;
  const failedDash = (failedPercent / 100) * circumference;
  const pendingDash = (pendingPercent / 100) * circumference;

  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg className="w-full h-full transform -rotate-90">
        {/* Background */}
        <circle
          cx="64"
          cy="64"
          r="50"
          stroke="currentColor"
          strokeWidth="12"
          fill="none"
          className="text-muted"
        />
        {/* Pending */}
        <circle
          cx="64"
          cy="64"
          r="50"
          stroke="currentColor"
          strokeWidth="12"
          fill="none"
          className="text-amber-500"
          strokeDasharray={`${pendingDash} ${circumference}`}
          strokeDashoffset={0}
        />
        {/* Failed */}
        <circle
          cx="64"
          cy="64"
          r="50"
          stroke="currentColor"
          strokeWidth="12"
          fill="none"
          className="text-red-500"
          strokeDasharray={`${failedDash} ${circumference}`}
          strokeDashoffset={-pendingDash}
        />
        {/* Success */}
        <circle
          cx="64"
          cy="64"
          r="50"
          stroke="currentColor"
          strokeWidth="12"
          fill="none"
          className="text-green-500"
          strokeDasharray={`${successDash} ${circumference}`}
          strokeDashoffset={-(pendingDash + failedDash)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-foreground">{Math.round(successPercent)}%</span>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['execution-stats'],
    queryFn: () => executionsApi.getStats(),
  });

  const { data: workflows, isLoading: isLoadingWorkflows } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => workflowsApi.list({ take: 100 }),
  });

  const { data: recentExecutions, isLoading: isLoadingExecutions } = useQuery({
    queryKey: ['executions-recent'],
    queryFn: () => executionsApi.list({ take: 50 }),
  });

  // Calculate metrics
  const totalExecutions = stats?.total || 0;
  const completedExecutions = stats?.completed || 0;
  const failedExecutions = stats?.failed || 0;
  const runningExecutions = stats?.running || 0;
  const pendingExecutions = totalExecutions - completedExecutions - failedExecutions - runningExecutions;

  const successRate = parseFloat(stats?.successRate || '0');
  const activeWorkflows = workflows?.data?.filter(
    (w) => (w.status as string) === 'ACTIVE' || (w.status as string) === 'active'
  ).length || 0;

  // Mock data for charts (in real app, this would come from API)
  const last7DaysData = [12, 19, 8, 25, 15, 22, 18];
  const maxExec = Math.max(...last7DaysData);

  // Calculate average execution time (mock data)
  const avgExecutionTime = '2.4s';
  const peakHour = '14:00';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
            Analytics
          </h1>
          <p className="text-muted-foreground text-lg">
            Suivez les performances de vos workflows en temps réel
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="btn-secondary">
            <Calendar className="h-4 w-4" />
            7 derniers jours
          </Button>
          <Button variant="outline" className="btn-secondary">
            <Filter className="h-4 w-4" />
            Filtrer
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Executions */}
        <div className="stat-card group">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Total Exécutions</p>
              {isLoadingStats ? (
                <div className="h-9 w-20 skeleton" />
              ) : (
                <p className="text-3xl font-bold text-foreground">{totalExecutions}</p>
              )}
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-500">
                  <ArrowUpRight className="h-3 w-3" />
                  +12%
                </span>
                <span className="text-xs text-muted-foreground">vs semaine dernière</span>
              </div>
            </div>
            <div className="rounded-2xl bg-primary/10 p-3 ring-1 ring-primary/20 transition-all duration-300 group-hover:bg-primary/20 group-hover:ring-primary/30">
              <Activity className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="stat-card group">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Taux de Réussite</p>
              {isLoadingStats ? (
                <div className="h-9 w-20 skeleton" />
              ) : (
                <p className="text-3xl font-bold text-foreground">{successRate}%</p>
              )}
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium",
                  successRate >= 80 ? "text-green-500" : "text-amber-500"
                )}>
                  {successRate >= 80 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {successRate >= 80 ? 'Excellent' : 'À améliorer'}
                </span>
              </div>
            </div>
            <div className={cn(
              "rounded-2xl p-3 ring-1 transition-all duration-300",
              successRate >= 80
                ? "bg-green-500/10 ring-green-500/20 group-hover:bg-green-500/20"
                : "bg-amber-500/10 ring-amber-500/20 group-hover:bg-amber-500/20"
            )}>
              <CheckCircle className={cn("h-6 w-6", successRate >= 80 ? "text-green-500" : "text-amber-500")} />
            </div>
          </div>
        </div>

        {/* Avg Execution Time */}
        <div className="stat-card group">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Temps Moyen</p>
              <p className="text-3xl font-bold text-foreground">{avgExecutionTime}</p>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-500">
                  <ArrowDownRight className="h-3 w-3" />
                  -0.3s
                </span>
                <span className="text-xs text-muted-foreground">vs hier</span>
              </div>
            </div>
            <div className="rounded-2xl bg-cyan-500/10 p-3 ring-1 ring-cyan-500/20 transition-all duration-300 group-hover:bg-cyan-500/20 group-hover:ring-cyan-500/30">
              <Timer className="h-6 w-6 text-cyan-500" />
            </div>
          </div>
        </div>

        {/* Active Workflows */}
        <div className="stat-card group">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Workflows Actifs</p>
              {isLoadingWorkflows ? (
                <div className="h-9 w-20 skeleton" />
              ) : (
                <p className="text-3xl font-bold text-foreground">{activeWorkflows}</p>
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">
                  sur {workflows?.total || 0} au total
                </span>
              </div>
            </div>
            <div className="rounded-2xl bg-purple-500/10 p-3 ring-1 ring-purple-500/20 transition-all duration-300 group-hover:bg-purple-500/20 group-hover:ring-purple-500/30">
              <Zap className="h-6 w-6 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Executions Chart */}
        <Card className="panel lg:col-span-2">
          <CardHeader className="panel-header">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5 ring-1 ring-primary/20">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Exécutions par jour</CardTitle>
                <CardDescription>Activité des 7 derniers jours</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="panel-content">
            <SimpleBarChart data={last7DaysData} maxValue={maxExec} />
            <div className="flex justify-between mt-3 text-xs text-muted-foreground">
              <span>Lun</span>
              <span>Mar</span>
              <span>Mer</span>
              <span>Jeu</span>
              <span>Ven</span>
              <span>Sam</span>
              <span>Dim</span>
            </div>

            {/* Stats below chart */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border/50">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">
                  {last7DaysData.reduce((a, b) => a + b, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Total cette semaine</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{Math.max(...last7DaysData)}</p>
                <p className="text-xs text-muted-foreground">Max journalier</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">
                  {Math.round(last7DaysData.reduce((a, b) => a + b, 0) / 7)}
                </p>
                <p className="text-xs text-muted-foreground">Moyenne / jour</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="panel">
          <CardHeader className="panel-header">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-accent/10 p-2.5 ring-1 ring-accent/20">
                <Cpu className="h-5 w-5 text-accent" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Distribution</CardTitle>
                <CardDescription>Statut des exécutions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="panel-content">
            <DonutChart
              success={completedExecutions}
              failed={failedExecutions}
              pending={pendingExecutions + runningExecutions}
            />

            {/* Legend */}
            <div className="space-y-3 mt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-sm text-muted-foreground">Réussies</span>
                </div>
                <span className="text-sm font-medium text-foreground">{completedExecutions}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-sm text-muted-foreground">Échouées</span>
                </div>
                <span className="text-sm font-medium text-foreground">{failedExecutions}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-amber-500" />
                  <span className="text-sm text-muted-foreground">En attente</span>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {pendingExecutions + runningExecutions}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="panel">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-green-500/10 p-3 ring-1 ring-green-500/20">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{completedExecutions}</p>
                <p className="text-sm text-muted-foreground">Exécutions réussies</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="panel">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-red-500/10 p-3 ring-1 ring-red-500/20">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{failedExecutions}</p>
                <p className="text-sm text-muted-foreground">Exécutions échouées</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="panel">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-blue-500/10 p-3 ring-1 ring-blue-500/20">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{peakHour}</p>
                <p className="text-sm text-muted-foreground">Heure de pointe</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="panel">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-purple-500/10 p-3 ring-1 ring-purple-500/20">
                <Activity className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{runningExecutions}</p>
                <p className="text-sm text-muted-foreground">En cours maintenant</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Workflows */}
      <Card className="panel">
        <CardHeader className="panel-header">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 ring-1 ring-primary/20">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Workflows les plus actifs</CardTitle>
              <CardDescription>Classement par nombre d'exécutions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="panel-content">
          {isLoadingWorkflows ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
                  <div className="h-8 w-8 rounded-lg skeleton" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 skeleton" />
                    <div className="h-3 w-24 skeleton" />
                  </div>
                  <div className="h-4 w-16 skeleton" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {(workflows?.data || []).slice(0, 5).map((workflow, index) => (
                <div
                  key={workflow.id}
                  className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:bg-muted/30"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl font-bold text-lg",
                      index === 0 ? "bg-amber-500/20 text-amber-500" :
                      index === 1 ? "bg-gray-400/20 text-gray-400" :
                      index === 2 ? "bg-orange-600/20 text-orange-600" :
                      "bg-muted text-muted-foreground"
                    )}>
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{workflow.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(workflow.status as string) === 'ACTIVE' || (workflow.status as string) === 'active' ? 'Actif' : 'Inactif'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">
                      {Math.floor(Math.random() * 100) + 10} exécutions
                    </p>
                    <p className="text-sm text-green-500">
                      {Math.floor(Math.random() * 20) + 80}% réussite
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
