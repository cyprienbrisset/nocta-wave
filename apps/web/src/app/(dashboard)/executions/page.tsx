'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  PlayCircle,
  Clock,
  Activity,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Timer,
  TrendingUp,
  Filter,
  ChevronRight,
  User,
  Zap,
  Calendar,
  BarChart3,
  RefreshCw,
  Search,
  Webhook,
  CalendarClock,
  Terminal,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { executionsApi } from '@/lib/api/executions';
import { cn, formatDate, formatDuration, getStatusColor } from '@/lib/utils';

type StatusFilter = 'all' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PENDING';

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  PENDING: {
    label: 'En attente',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10 border-yellow-500/20',
  },
  QUEUED: {
    label: 'En file',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10 border-orange-500/20',
  },
  RUNNING: {
    label: 'En cours',
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
  },
  COMPLETED: {
    label: 'Terminé',
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
  },
  FAILED: {
    label: 'Échoué',
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10 border-red-500/20',
  },
  CANCELLED: {
    label: 'Annulé',
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10 border-gray-500/20',
  },
  TIMEOUT: {
    label: 'Timeout',
    icon: <Timer className="h-4 w-4" />,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10 border-orange-500/20',
  },
};

const triggerConfig: Record<string, { label: string; icon: React.ReactNode }> = {
  MANUAL: { label: 'Manuel', icon: <PlayCircle className="h-3.5 w-3.5" /> },
  WEBHOOK: { label: 'Webhook', icon: <Webhook className="h-3.5 w-3.5" /> },
  SCHEDULE: { label: 'Planifié', icon: <CalendarClock className="h-3.5 w-3.5" /> },
  CRON: { label: 'Cron', icon: <CalendarClock className="h-3.5 w-3.5" /> },
  API: { label: 'API', icon: <Terminal className="h-3.5 w-3.5" /> },
  POLL: { label: 'Poll', icon: <RefreshCw className="h-3.5 w-3.5" /> },
};

const filterTabs: { value: StatusFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'Toutes', icon: <Activity className="h-4 w-4" /> },
  { value: 'RUNNING', label: 'En cours', icon: <Loader2 className="h-4 w-4" /> },
  { value: 'COMPLETED', label: 'Terminées', icon: <CheckCircle className="h-4 w-4" /> },
  { value: 'FAILED', label: 'Échouées', icon: <XCircle className="h-4 w-4" /> },
  { value: 'PENDING', label: 'En attente', icon: <Clock className="h-4 w-4" /> },
];

export default function ExecutionsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: executions, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['executions'],
    queryFn: () => executionsApi.list({ take: 100 }),
    refetchInterval: 10000, // Auto-refresh every 10s
  });

  // Compute statistics
  const stats = useMemo(() => {
    const data = executions?.data || [];
    const total = data.length;
    const completed = data.filter((e) => e.status === 'COMPLETED').length;
    const failed = data.filter((e) => e.status === 'FAILED').length;
    const running = data.filter((e) => e.status === 'RUNNING' || e.status === 'PENDING' || e.status === 'QUEUED').length;
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const avgDuration = data.filter((e) => e.duration).reduce((acc, e) => acc + (e.duration || 0), 0) / (data.filter((e) => e.duration).length || 1);

    return { total, completed, failed, running, successRate, avgDuration };
  }, [executions?.data]);

  // Filter executions
  const filteredExecutions = useMemo(() => {
    let filtered = executions?.data || [];

    // Filter by status
    if (statusFilter !== 'all') {
      if (statusFilter === 'RUNNING') {
        filtered = filtered.filter((e) => ['RUNNING', 'QUEUED'].includes(e.status));
      } else if (statusFilter === 'PENDING') {
        filtered = filtered.filter((e) => ['PENDING', 'QUEUED'].includes(e.status));
      } else {
        filtered = filtered.filter((e) => e.status === statusFilter);
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.workflow?.name?.toLowerCase().includes(query) ||
          e.id.toLowerCase().includes(query) ||
          e.user?.name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [executions?.data, statusFilter, searchQuery]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Exécutions
          </h1>
          <p className="text-gray-500 mt-1">
            Historique et monitoring de vos workflows
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="border-gray-700 hover:bg-gray-800"
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', isRefetching && 'animate-spin')} />
          Actualiser
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="rounded-2xl border-gray-700 bg-[#1a1a2e] shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Total</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-700 bg-[#1a1a2e] shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">En cours</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">{stats.running}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-700 bg-[#1a1a2e] shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Terminées</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.completed}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-700 bg-[#1a1a2e] shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Échouées</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{stats.failed}</p>
              </div>
              <div className="p-3 rounded-xl bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-700 bg-[#1a1a2e] shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Taux de succès</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.successRate}%</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Status Tabs */}
        <div className="flex gap-2 flex-wrap">
          {filterTabs.map((tab) => (
            <Button
              key={tab.value}
              variant={statusFilter === tab.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                'transition-all',
                statusFilter === tab.value
                  ? 'bg-primary hover:bg-primary/90'
                  : 'border-gray-700 hover:bg-gray-800 text-gray-400'
              )}
            >
              {tab.icon}
              <span className="ml-2">{tab.label}</span>
              {tab.value !== 'all' && (
                <span className="ml-2 text-xs opacity-70">
                  {tab.value === 'RUNNING'
                    ? stats.running
                    : tab.value === 'COMPLETED'
                    ? stats.completed
                    : tab.value === 'FAILED'
                    ? stats.failed
                    : executions?.data?.filter((e) => e.status === tab.value).length || 0}
                </span>
              )}
            </Button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-[#1a1a2e] border-gray-700 focus:border-primary"
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-gray-500">Chargement des exécutions...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredExecutions.length === 0 && (
        <Card className="rounded-2xl border-dashed border-gray-700 bg-[#1a1a2e]">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-primary/20 p-4 mb-4">
              <Activity className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-white">
              {searchQuery || statusFilter !== 'all' ? 'Aucun résultat' : 'Aucune exécution'}
            </h3>
            <p className="text-gray-500 mt-2 text-center max-w-sm">
              {searchQuery || statusFilter !== 'all'
                ? 'Aucune exécution ne correspond à vos critères de recherche'
                : 'Exécutez un workflow pour voir l\'historique ici'}
            </p>
            {(searchQuery || statusFilter !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="mt-4 border-gray-700"
              >
                Réinitialiser les filtres
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Executions List */}
      <div className="space-y-4">
        {filteredExecutions.map((execution) => {
          const status = statusConfig[execution.status] ?? statusConfig.PENDING!;
          const trigger = triggerConfig[execution.triggerType] ?? triggerConfig.MANUAL!;

          return (
            <Link key={execution.id} href={`/executions/${execution.id}`} className="block mb-4">
              <Card className="rounded-2xl border-gray-700 bg-[#1a1a2e] shadow-md transition-all hover:shadow-xl hover:border-gray-600 hover:scale-[1.01] cursor-pointer group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left Section */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {/* Status Badge */}
                      <div
                        className={cn(
                          'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border shrink-0',
                          status.bgColor,
                          status.color
                        )}
                      >
                        {status.icon}
                        <span>{status.label}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white truncate">
                            {execution.workflow?.name || 'Workflow inconnu'}
                          </p>
                          {execution.status === 'FAILED' && execution.errorMessage && (
                            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                          {/* Trigger Type */}
                          <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-800/50">
                            {trigger.icon}
                            <span>{trigger.label}</span>
                          </span>

                          {/* Date */}
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{formatDate(execution.createdAt)}</span>
                          </span>

                          {/* User */}
                          {execution.user && (
                            <span className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5" />
                              <span>{execution.user.name || execution.user.email}</span>
                            </span>
                          )}

                          {/* Execution ID */}
                          <span className="text-gray-600 font-mono text-[10px]">
                            #{execution.id.slice(0, 8)}
                          </span>
                        </div>

                        {/* Error Message Preview */}
                        {execution.status === 'FAILED' && execution.errorMessage && (
                          <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                            <p className="text-xs text-red-400 line-clamp-2">
                              {execution.errorMessage}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Section */}
                    <div className="flex items-center gap-4 shrink-0">
                      {/* Duration */}
                      {execution.duration !== null && execution.duration !== undefined && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800/50 text-sm text-gray-400">
                          <Timer className="h-4 w-4" />
                          <span className="font-mono">{formatDuration(execution.duration)}</span>
                        </div>
                      )}

                      {/* Arrow */}
                      <ChevronRight className="h-5 w-5 text-gray-600 group-hover:text-gray-400 transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Results Count */}
      {!isLoading && filteredExecutions.length > 0 && (
        <div className="text-center text-sm text-gray-500">
          {filteredExecutions.length === executions?.data?.length
            ? `${filteredExecutions.length} exécution${filteredExecutions.length > 1 ? 's' : ''}`
            : `${filteredExecutions.length} sur ${executions?.data?.length} exécution${(executions?.data?.length || 0) > 1 ? 's' : ''}`}
        </div>
      )}
    </div>
  );
}
