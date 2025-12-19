'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  RefreshCw,
  XCircle,
  CheckCircle,
  Clock,
  AlertCircle,
  Timer,
  Calendar,
  User,
  Play,
  Loader2,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Workflow,
  Zap,
  Terminal,
  Webhook,
  CalendarClock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { executionsApi } from '@/lib/api/executions';
import { formatDate, formatDuration, cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { useState } from 'react';

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string; bgColor: string; ringColor: string }> = {
  PENDING: {
    label: 'En attente',
    icon: <Clock className="h-5 w-5" />,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    ringColor: 'ring-yellow-500/30',
  },
  QUEUED: {
    label: 'En file',
    icon: <Clock className="h-5 w-5" />,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    ringColor: 'ring-orange-500/30',
  },
  RUNNING: {
    label: 'En cours',
    icon: <Loader2 className="h-5 w-5 animate-spin" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    ringColor: 'ring-blue-500/30',
  },
  COMPLETED: {
    label: 'Terminé',
    icon: <CheckCircle className="h-5 w-5" />,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    ringColor: 'ring-emerald-500/30',
  },
  FAILED: {
    label: 'Échoué',
    icon: <XCircle className="h-5 w-5" />,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    ringColor: 'ring-red-500/30',
  },
  CANCELLED: {
    label: 'Annulé',
    icon: <XCircle className="h-5 w-5" />,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    ringColor: 'ring-gray-500/30',
  },
  TIMEOUT: {
    label: 'Timeout',
    icon: <Timer className="h-5 w-5" />,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    ringColor: 'ring-orange-500/30',
  },
};

const defaultStatus = {
  label: 'En attente',
  icon: <Clock className="h-5 w-5" />,
  color: 'text-yellow-400',
  bgColor: 'bg-yellow-500/10',
  ringColor: 'ring-yellow-500/30',
};

const triggerConfig: Record<string, { label: string; icon: React.ReactNode }> = {
  MANUAL: { label: 'Déclenchement manuel', icon: <Play className="h-4 w-4" /> },
  WEBHOOK: { label: 'Webhook', icon: <Webhook className="h-4 w-4" /> },
  SCHEDULE: { label: 'Planifié', icon: <CalendarClock className="h-4 w-4" /> },
  CRON: { label: 'Cron', icon: <CalendarClock className="h-4 w-4" /> },
  API: { label: 'API', icon: <Terminal className="h-4 w-4" /> },
  POLL: { label: 'Poll', icon: <RefreshCw className="h-4 w-4" /> },
};

const defaultTrigger = { label: 'Inconnu', icon: <Zap className="h-4 w-4" /> };

export default function ExecutionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const executionId = params.id as string;
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const { data: execution, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['execution', executionId],
    queryFn: () => executionsApi.get(executionId),
    refetchInterval: (query) =>
      query.state.data?.status === 'RUNNING' || query.state.data?.status === 'PENDING' ? 2000 : false,
  });

  const cancelMutation = useMutation({
    mutationFn: () => executionsApi.cancel(executionId),
    onSuccess: () => {
      refetch();
      toast({ title: 'Exécution annulée' });
    },
  });

  const retryMutation = useMutation({
    mutationFn: () => executionsApi.retry(executionId),
    onSuccess: (newExecution) => {
      toast({ title: 'Exécution relancée' });
      router.push(`/executions/${newExecution.id}`);
    },
  });

  const toggleLog = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copié dans le presse-papier' });
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground animate-pulse">Chargement de l'exécution...</p>
        </div>
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <div className="rounded-full bg-red-500/10 p-4">
          <AlertCircle className="h-10 w-10 text-red-400" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Exécution introuvable</h2>
        <p className="text-muted-foreground">Cette exécution n'existe pas ou a été supprimée.</p>
        <Button onClick={() => router.push('/executions')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux exécutions
        </Button>
      </div>
    );
  }

  const status = statusConfig[execution.status] ?? defaultStatus;
  const trigger = triggerConfig[execution.triggerType] ?? defaultTrigger;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20">
                <Workflow className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                {execution.workflow?.name || 'Workflow'}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1 font-mono">
              Exécution #{execution.id.slice(0, 8)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="border-border hover:bg-muted"
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isRefetching && 'animate-spin')} />
            Actualiser
          </Button>
          {(execution.status === 'RUNNING' || execution.status === 'PENDING') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Annuler
            </Button>
          )}
          {execution.status === 'FAILED' && (
            <Button
              size="sm"
              onClick={() => retryMutation.mutate()}
              disabled={retryMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Relancer
            </Button>
          )}
        </div>
      </div>

      {/* Status Hero */}
      <div className={cn(
        'relative rounded-2xl border p-6 overflow-hidden',
        status.bgColor,
        'border-white/5'
      )}>
        {/* Background glow */}
        <div className={cn(
          'absolute inset-0 opacity-30',
          status.bgColor
        )} />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={cn(
              'p-4 rounded-2xl ring-2',
              status.bgColor,
              status.ringColor
            )}>
              <span className={status.color}>{status.icon}</span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Statut</p>
              <h2 className={cn('text-2xl font-bold', status.color)}>{status.label}</h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            {/* Trigger */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background/50 backdrop-blur-sm">
              <span className="text-muted-foreground">{trigger.icon}</span>
              <span className="text-foreground">{trigger.label}</span>
            </div>

            {/* Duration */}
            {(execution.duration || execution.status === 'RUNNING') && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background/50 backdrop-blur-sm">
                <Timer className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-foreground">
                  {execution.duration ? formatDuration(execution.duration) : 'En cours...'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border/50 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Créée le</p>
                <p className="text-sm font-medium text-foreground mt-0.5">
                  {formatDate(execution.createdAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-green-500/10">
                <Play className="h-4 w-4 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Démarrée le</p>
                <p className="text-sm font-medium text-foreground mt-0.5">
                  {execution.startedAt ? formatDate(execution.startedAt) : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10">
                <CheckCircle className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Terminée le</p>
                <p className="text-sm font-medium text-foreground mt-0.5">
                  {execution.finishedAt ? formatDate(execution.finishedAt) : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10">
                <User className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Déclenchée par</p>
                <p className="text-sm font-medium text-foreground mt-0.5">
                  {execution.user?.name || execution.user?.email || 'Système'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Message */}
      {execution.errorMessage && (
        <Card className="rounded-2xl border-red-500/30 bg-red-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-red-400 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Erreur d'exécution
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(execution.errorMessage!)}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm text-red-300 font-mono bg-red-500/10 rounded-xl p-4 overflow-auto max-h-48">
              {execution.errorMessage}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card className="rounded-2xl border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            Timeline d'exécution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(!execution.nodeLogs || execution.nodeLogs.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                {execution.status === 'PENDING' || execution.status === 'QUEUED'
                  ? 'En attente du démarrage...'
                  : 'Aucun log disponible'}
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

              <div className="space-y-4">
                {execution.nodeLogs.map((log, index) => {
                  const logStatus = statusConfig[log.status] ?? defaultStatus;
                  const isExpanded = expandedLogs.has(log.id);
                  const isLast = index === execution.nodeLogs!.length - 1;

                  return (
                    <div
                      key={log.id}
                      className={cn(
                        'relative pl-16 animate-fade-in-up',
                        isLast && 'pb-0'
                      )}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {/* Timeline dot */}
                      <div className={cn(
                        'absolute left-4 w-5 h-5 rounded-full ring-4 ring-background flex items-center justify-center',
                        logStatus.bgColor,
                        log.status === 'RUNNING' && 'animate-pulse'
                      )}>
                        <span className={cn('scale-75', logStatus.color)}>{logStatus.icon}</span>
                      </div>

                      <div
                        className={cn(
                          'rounded-xl border p-4 transition-all cursor-pointer hover:border-primary/30',
                          isExpanded ? 'bg-muted/30 border-primary/20' : 'border-border/50 bg-card'
                        )}
                        onClick={() => toggleLog(log.id)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">
                                {log.nodeName || log.nodeId}
                              </span>
                              <span className={cn(
                                'px-2 py-0.5 rounded-full text-xs font-medium',
                                logStatus.bgColor,
                                logStatus.color
                              )}>
                                {logStatus.label}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 font-mono">
                              {log.nodeType}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {log.duration && (
                              <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-1 rounded-lg">
                                {formatDuration(log.duration)}
                              </span>
                            )}
                            <button className="text-muted-foreground hover:text-foreground transition-colors">
                              {isExpanded ? (
                                <ChevronDown className="h-5 w-5" />
                              ) : (
                                <ChevronRight className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Error */}
                        {log.error && (
                          <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                            <p className="text-sm text-red-400 font-mono">
                              {log.error}
                            </p>
                          </div>
                        )}

                        {/* Expanded content */}
                        {isExpanded && (
                          <div className="mt-4 space-y-4 animate-fade-in">
                            {/* Input Data */}
                            {log.inputData && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-sm font-medium text-muted-foreground">Données d'entrée</h4>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard(JSON.stringify(log.inputData, null, 2));
                                    }}
                                    className="h-7 px-2 text-muted-foreground hover:text-foreground"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                <pre className="text-xs font-mono bg-background rounded-lg p-3 overflow-auto max-h-40 text-muted-foreground">
                                  {JSON.stringify(log.inputData, null, 2)}
                                </pre>
                              </div>
                            )}

                            {/* Output Data */}
                            {log.outputData && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-sm font-medium text-muted-foreground">Données de sortie</h4>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard(JSON.stringify(log.outputData, null, 2));
                                    }}
                                    className="h-7 px-2 text-muted-foreground hover:text-foreground"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                <pre className="text-xs font-mono bg-background rounded-lg p-3 overflow-auto max-h-40 text-muted-foreground">
                                  {JSON.stringify(log.outputData, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Input/Output Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Data */}
        {execution.inputData && Object.keys(execution.inputData).length > 0 && (
          <Card className="rounded-2xl border-border/50 bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="h-4 w-4 text-primary" />
                  Données d'entrée
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(JSON.stringify(execution.inputData, null, 2))}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="text-sm font-mono bg-muted/30 rounded-xl p-4 overflow-auto max-h-64 text-muted-foreground">
                {JSON.stringify(execution.inputData, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Output Data */}
        {execution.outputData && Object.keys(execution.outputData).length > 0 && (
          <Card className="rounded-2xl border-border/50 bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  Données de sortie
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(JSON.stringify(execution.outputData, null, 2))}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="text-sm font-mono bg-muted/30 rounded-xl p-4 overflow-auto max-h-64 text-muted-foreground">
                {JSON.stringify(execution.outputData, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
