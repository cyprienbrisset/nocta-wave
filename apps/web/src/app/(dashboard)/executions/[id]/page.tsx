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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { executionsApi } from '@/lib/api/executions';
import { formatDate, formatDuration } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

export default function ExecutionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const executionId = params.id as string;

  const { data: execution, isLoading, refetch } = useQuery({
    queryKey: ['execution', executionId],
    queryFn: () => executionsApi.get(executionId),
    refetchInterval: (query) =>
      query.state.data?.status === 'RUNNING' || query.state.data?.status === 'PENDING' ? 2000 : false,
  });

  const cancelMutation = useMutation({
    mutationFn: () => executionsApi.cancel(executionId),
    onSuccess: () => {
      refetch();
      toast({ title: 'Execution cancelled' });
    },
  });

  const retryMutation = useMutation({
    mutationFn: () => executionsApi.retry(executionId),
    onSuccess: (newExecution) => {
      toast({ title: 'Execution retried' });
      router.push(`/executions/${newExecution.id}`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!execution) {
    return <div>Execution not found</div>;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'FAILED':
      case 'TIMEOUT':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'RUNNING':
      case 'PENDING':
      case 'QUEUED':
        return <Clock className="h-5 w-5 text-blue-600 animate-pulse" />;
      case 'CANCELLED':
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{execution.workflow?.name}</h1>
            <p className="text-muted-foreground">
              Execution {execution.id.slice(0, 8)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {(execution.status === 'RUNNING' || execution.status === 'PENDING') && (
            <Button
              variant="outline"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          )}
          {execution.status === 'FAILED' && (
            <Button
              onClick={() => retryMutation.mutate()}
              disabled={retryMutation.isPending}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          )}
        </div>
      </div>

      {/* Status Card */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center space-x-4 p-4">
            {getStatusIcon(execution.status)}
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium">{execution.status}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Trigger</p>
            <p className="font-medium">{execution.triggerType}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Duration</p>
            <p className="font-medium">
              {execution.duration
                ? formatDuration(execution.duration)
                : execution.status === 'RUNNING'
                ? 'Running...'
                : '-'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Started At</p>
            <p className="font-medium">
              {execution.startedAt ? formatDate(execution.startedAt) : '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Error Message */}
      {execution.errorMessage && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm text-red-800">
              {execution.errorMessage}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Node Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Node Execution Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {execution.nodeLogs?.length === 0 && (
            <p className="text-muted-foreground">No node logs yet</p>
          )}
          <div className="space-y-4">
            {execution.nodeLogs?.map((log) => (
              <div
                key={log.id}
                className="flex items-start space-x-4 rounded-lg border p-4"
              >
                {getStatusIcon(log.status)}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">
                      {log.nodeName || log.nodeId}
                    </p>
                    <span className="text-sm text-muted-foreground">
                      {log.duration ? formatDuration(log.duration) : '-'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{log.nodeType}</p>
                  {log.error && (
                    <pre className="mt-2 whitespace-pre-wrap text-sm text-red-600">
                      {log.error}
                    </pre>
                  )}
                  {log.outputData && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-muted-foreground">
                        View output
                      </summary>
                      <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">
                        {JSON.stringify(log.outputData, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Output Data */}
      {execution.outputData && (
        <Card>
          <CardHeader>
            <CardTitle>Output Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded bg-muted p-4 text-sm">
              {JSON.stringify(execution.outputData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
