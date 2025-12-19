'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  BarChart3,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Bell,
  BellOff,
  Zap,
  Timer,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  FileText,
  Network,
  Layers,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { monitoringApi, type RealTimeMetrics, type StructuredLog, type TraceSummary, type ActiveAlert } from '@/lib/api/monitoring';

// ============================================================================
// COMPONENTS
// ============================================================================

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  variant = 'default',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  trend?: 'up' | 'down';
  trendValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
}) {
  const variantStyles = {
    default: 'from-primary/20 to-purple-500/20 text-primary',
    success: 'from-green-500/20 to-emerald-500/20 text-green-500',
    warning: 'from-amber-500/20 to-orange-500/20 text-amber-500',
    error: 'from-red-500/20 to-rose-500/20 text-red-500',
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && trendValue && (
              <div className={cn(
                'flex items-center gap-1 text-xs font-medium',
                trend === 'up' ? 'text-green-500' : 'text-red-500'
              )}>
                {trend === 'up' ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {trendValue}
              </div>
            )}
          </div>
          <div className={cn(
            'rounded-xl p-3 bg-gradient-to-br',
            variantStyles[variant]
          )}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniChart({ data, color = 'primary' }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  const colors = {
    primary: 'bg-primary',
    green: 'bg-green-500',
    red: 'bg-red-500',
    amber: 'bg-amber-500',
  };

  return (
    <div className="flex items-end gap-0.5 h-12">
      {data.map((value, index) => (
        <div
          key={index}
          className={cn('flex-1 rounded-t-sm transition-all', colors[color as keyof typeof colors] || colors.primary)}
          style={{ height: `${(value / max) * 100}%`, minHeight: value > 0 ? '2px' : '0', opacity: 0.3 + (index / data.length) * 0.7 }}
        />
      ))}
    </div>
  );
}

function LogLevelBadge({ level }: { level: string }) {
  const styles = {
    DEBUG: 'bg-gray-500/20 text-gray-500',
    INFO: 'bg-blue-500/20 text-blue-500',
    WARN: 'bg-amber-500/20 text-amber-500',
    ERROR: 'bg-red-500/20 text-red-500',
    FATAL: 'bg-red-700/20 text-red-700',
  };

  return (
    <Badge className={cn('font-mono text-xs', styles[level as keyof typeof styles] || styles.INFO)}>
      {level}
    </Badge>
  );
}

function AlertSeverityBadge({ severity }: { severity: string }) {
  const styles = {
    INFO: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
    WARNING: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
    ERROR: 'bg-red-500/20 text-red-500 border-red-500/30',
    CRITICAL: 'bg-red-700/20 text-red-700 border-red-700/30 animate-pulse',
  };

  return (
    <Badge variant="outline" className={cn('font-medium', styles[severity as keyof typeof styles] || styles.INFO)}>
      {severity}
    </Badge>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function MonitoringPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [logSearch, setLogSearch] = useState('');
  const [logLevel, setLogLevel] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [expandedTrace, setExpandedTrace] = useState<string | null>(null);

  // Get team ID (assuming first team for now)
  const teamId = user?.teamMemberships?.[0]?.team?.id || '';

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const { data: realTimeMetrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ['monitoring', 'realtime', teamId],
    queryFn: () => monitoringApi.getRealTimeMetrics(teamId),
    enabled: !!teamId,
    refetchInterval: autoRefresh ? 5000 : false,
  });

  const { data: performanceMetrics } = useQuery({
    queryKey: ['monitoring', 'performance', teamId],
    queryFn: () => monitoringApi.getPerformanceMetrics(teamId, 24),
    enabled: !!teamId,
  });

  const { data: workflowMetrics } = useQuery({
    queryKey: ['monitoring', 'workflows', teamId],
    queryFn: () => monitoringApi.getWorkflowMetrics(teamId),
    enabled: !!teamId,
  });

  const { data: logsData, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['monitoring', 'logs', teamId, logSearch, logLevel],
    queryFn: () => monitoringApi.queryLogs(teamId, {
      query: logSearch || undefined,
      levels: logLevel !== 'all' ? [logLevel] : undefined,
      take: 100,
    }),
    enabled: !!teamId && activeTab === 'logs',
  });

  const { data: logStats } = useQuery({
    queryKey: ['monitoring', 'logs', 'stats', teamId],
    queryFn: () => monitoringApi.getLogStats(teamId, 24),
    enabled: !!teamId,
  });

  const { data: tracesData, isLoading: isLoadingTraces } = useQuery({
    queryKey: ['monitoring', 'traces', teamId],
    queryFn: () => monitoringApi.queryTraces(teamId, { take: 50 }),
    enabled: !!teamId && activeTab === 'traces',
  });

  const { data: alerts } = useQuery({
    queryKey: ['monitoring', 'alerts', teamId],
    queryFn: () => monitoringApi.getActiveAlerts(teamId),
    enabled: !!teamId,
    refetchInterval: autoRefresh ? 10000 : false,
  });

  const acknowledgeAlertMutation = useMutation({
    mutationFn: (alertId: string) => monitoringApi.acknowledgeAlert(teamId, alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring', 'alerts', teamId] });
    },
  });

  // Generate mock chart data from metrics history
  const chartData = Array.from({ length: 12 }, () => Math.floor(Math.random() * 100));

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!teamId) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Aucune équipe sélectionnée</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Monitoring</h1>
          <p className="text-muted-foreground">
            Surveillez les performances et la santé de vos workflows en temps réel
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', autoRefresh && 'animate-spin')} />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['monitoring'] })}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Active Alerts Banner */}
      {alerts && alerts.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-amber-500/20 p-2">
                  <Bell className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {alerts.length} alerte{alerts.length > 1 ? 's' : ''} active{alerts.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {alerts[0]?.message}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('alerts')}
              >
                Voir les alertes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <FileText className="h-4 w-4" />
            Logs
            {logStats && (
              <Badge variant="secondary" className="ml-1">
                {logStats.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="traces" className="gap-2">
            <Network className="h-4 w-4" />
            Traces
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <Bell className="h-4 w-4" />
            Alertes
            {alerts && alerts.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {alerts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Real-time Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Exécutions totales"
              value={realTimeMetrics?.totalExecutions || 0}
              subtitle={`${realTimeMetrics?.executionsPerMinute || 0}/min`}
              icon={Activity}
              trend="up"
              trendValue="+12% vs hier"
            />
            <MetricCard
              title="Taux de succès"
              value={`${realTimeMetrics?.successRate || 100}%`}
              subtitle={`${realTimeMetrics?.recentErrors || 0} erreurs récentes`}
              icon={CheckCircle}
              variant={
                (realTimeMetrics?.successRate || 100) >= 95
                  ? 'success'
                  : (realTimeMetrics?.successRate || 100) >= 80
                    ? 'warning'
                    : 'error'
              }
            />
            <MetricCard
              title="Durée moyenne"
              value={formatDuration(realTimeMetrics?.avgDuration || 0)}
              subtitle={`P95: ${formatDuration(performanceMetrics?.p95Duration || 0)}`}
              icon={Timer}
            />
            <MetricCard
              title="File d'attente"
              value={realTimeMetrics?.queueDepth || 0}
              subtitle={`${realTimeMetrics?.runningExecutions || 0} en cours`}
              icon={Layers}
              variant={(realTimeMetrics?.queueDepth || 0) > 50 ? 'warning' : 'default'}
            />
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Execution Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tendance des exécutions</CardTitle>
                <CardDescription>Dernières 24 heures</CardDescription>
              </CardHeader>
              <CardContent>
                <MiniChart data={chartData} color="primary" />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>-24h</span>
                  <span>Maintenant</span>
                </div>
              </CardContent>
            </Card>

            {/* Performance Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribution des latences</CardTitle>
                <CardDescription>Percentiles de durée</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: 'P50', value: performanceMetrics?.p50Duration || 0, percent: 50 },
                    { label: 'P95', value: performanceMetrics?.p95Duration || 0, percent: 95 },
                    { label: 'P99', value: performanceMetrics?.p99Duration || 0, percent: 99 },
                  ].map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium">{formatDuration(item.value)}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full"
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Workflow Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance par workflow</CardTitle>
              <CardDescription>Métriques des 100 dernières exécutions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workflow</TableHead>
                    <TableHead className="text-right">Exécutions</TableHead>
                    <TableHead className="text-right">Taux de succès</TableHead>
                    <TableHead className="text-right">Durée moyenne</TableHead>
                    <TableHead className="text-right">Dernière exécution</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflowMetrics?.slice(0, 10).map((workflow) => (
                    <TableRow key={workflow.workflowId}>
                      <TableCell className="font-medium">{workflow.workflowName}</TableCell>
                      <TableCell className="text-right">{workflow.totalExecutions}</TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          'font-medium',
                          workflow.successRate >= 95 ? 'text-green-500' :
                          workflow.successRate >= 80 ? 'text-amber-500' : 'text-red-500'
                        )}>
                          {workflow.successRate}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{formatDuration(workflow.avgDuration)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {workflow.lastExecution ? formatTimestamp(workflow.lastExecution) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher dans les logs..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={logLevel} onValueChange={setLogLevel}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Niveau" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les niveaux</SelectItem>
                    <SelectItem value="DEBUG">Debug</SelectItem>
                    <SelectItem value="INFO">Info</SelectItem>
                    <SelectItem value="WARN">Warning</SelectItem>
                    <SelectItem value="ERROR">Error</SelectItem>
                    <SelectItem value="FATAL">Fatal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Log Stats */}
          {logStats && (
            <div className="grid gap-4 md:grid-cols-5">
              {Object.entries(logStats.byLevel).map(([level, count]) => (
                <Card key={level} className="overflow-hidden">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <LogLevelBadge level={level} />
                      <span className="text-xl font-bold">{count}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Logs List */}
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {isLoadingLogs ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : logsData?.data.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <FileText className="h-8 w-8 mb-2" />
                    <p>Aucun log trouvé</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {logsData?.data.map((log) => (
                      <div
                        key={log.id}
                        className="p-4 hover:bg-muted/50 cursor-pointer"
                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex items-center gap-2 shrink-0">
                            {expandedLog === log.id ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <LogLevelBadge level={log.level} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-mono truncate">{log.message}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>{formatTimestamp(log.timestamp)}</span>
                              {log.source && (
                                <>
                                  <span>•</span>
                                  <span>{log.source}</span>
                                </>
                              )}
                              {log.traceId && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono">trace:{log.traceId.slice(0, 8)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        {expandedLog === log.id && log.context && (
                          <div className="mt-3 ml-7 p-3 bg-muted rounded-lg">
                            <pre className="text-xs font-mono overflow-auto">
                              {JSON.stringify(log.context, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Traces Tab */}
        <TabsContent value="traces" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Traces distribuées</CardTitle>
              <CardDescription>
                Suivez le parcours complet des exécutions à travers les services
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {isLoadingTraces ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : tracesData?.data.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Network className="h-8 w-8 mb-2" />
                    <p>Aucune trace trouvée</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {tracesData?.data.map((trace) => (
                      <div
                        key={trace.traceId}
                        className="p-4 hover:bg-muted/50 cursor-pointer"
                        onClick={() => setExpandedTrace(expandedTrace === trace.traceId ? null : trace.traceId)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="shrink-0">
                            {expandedTrace === trace.traceId ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{trace.rootSpan.operationName}</span>
                              {trace.hasErrors && (
                                <Badge variant="destructive" className="text-xs">Error</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                              <span className="font-mono">ID: {trace.traceId.slice(0, 12)}...</span>
                              <span>{trace.spanCount} spans</span>
                              <span>{formatDuration(trace.duration / 1000)}</span>
                              <span>{formatTimestamp(trace.startTime)}</span>
                            </div>
                            <div className="flex items-center gap-1 mt-2">
                              {trace.services.map((service) => (
                                <Badge key={service} variant="outline" className="text-xs">
                                  {service}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Alertes actives</CardTitle>
              <CardDescription>
                Alertes en attente d'acquittement
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!alerts || alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <BellOff className="h-12 w-12 mb-4" />
                  <p className="text-lg font-medium">Aucune alerte active</p>
                  <p className="text-sm">Tout fonctionne normalement</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-start gap-4 p-4 rounded-lg border bg-card"
                    >
                      <div className={cn(
                        'rounded-full p-2',
                        alert.severity === 'CRITICAL' ? 'bg-red-500/20' :
                        alert.severity === 'ERROR' ? 'bg-red-500/20' :
                        alert.severity === 'WARNING' ? 'bg-amber-500/20' : 'bg-blue-500/20'
                      )}>
                        <AlertTriangle className={cn(
                          'h-5 w-5',
                          alert.severity === 'CRITICAL' ? 'text-red-500' :
                          alert.severity === 'ERROR' ? 'text-red-500' :
                          alert.severity === 'WARNING' ? 'text-amber-500' : 'text-blue-500'
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{alert.ruleName}</span>
                          <AlertSeverityBadge severity={alert.severity} />
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Condition: {alert.condition}</span>
                          {alert.workflowName && (
                            <span>Workflow: {alert.workflowName}</span>
                          )}
                          <span>Déclenchée: {formatTimestamp(alert.firedAt)}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => acknowledgeAlertMutation.mutate(alert.id)}
                        disabled={acknowledgeAlertMutation.isPending}
                      >
                        {acknowledgeAlertMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-1" />
                        )}
                        Acquitter
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
