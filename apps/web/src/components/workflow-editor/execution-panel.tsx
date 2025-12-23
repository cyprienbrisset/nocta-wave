'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Play,
  Square,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Bug,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { executionsApi, type Execution, type ExecutionLog } from '@/lib/api/executions';
import { collaborationLinksApi } from '@/lib/api/collaboration';
import { useWorkflowStore } from '@/stores/workflow.store';

export interface ExecutionStep {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  input?: unknown;
  output?: unknown;
  error?: {
    message: string;
    stack?: string;
  };
}

interface ExecutionPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  workflowId: string;
  nodes: Array<{ id: string; data: { label: string; nodeType: string } }>;
  onNodeHighlight?: (nodeId: string | null) => void;
  embedded?: boolean;
  className?: string;
  guestSessionId?: string;
}

export function ExecutionPanel({
  isOpen = true,
  onClose,
  workflowId,
  nodes,
  onNodeHighlight,
  embedded = false,
  className,
  guestSessionId,
}: ExecutionPanelProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<ExecutionStep[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [executionTime, setExecutionTime] = useState(0);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);

  // Zustand store for debug data sync
  const {
    setNodeDebugData,
    setCurrentDebugNode,
    addConsoleLog,
    clearDebugData,
    setDebugMode
  } = useWorkflowStore();

  // Timer pour le temps d'execution
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning) {
      interval = setInterval(() => {
        setExecutionTime((t) => t + 100);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Initialiser les steps depuis les nodes
  useEffect(() => {
    if (nodes.length > 0 && !isRunning && steps.length === 0) {
      const initialSteps: ExecutionStep[] = nodes.map((node) => ({
        nodeId: node.id,
        nodeName: node.data.label,
        nodeType: node.data.nodeType,
        status: 'pending',
      }));
      setSteps(initialSteps);
    }
  }, [nodes, isRunning, steps.length]);

  // Fonction pour mapper les logs d'execution vers les steps
  const mapExecutionLogsToSteps = useCallback((nodeLogs: ExecutionLog[], execution: Execution) => {
    const newSteps: ExecutionStep[] = nodes.map((node) => {
      const log = nodeLogs.find((l) => l.nodeId === node.id);
      if (log) {
        // Synchronize debug data to store for DataInspector
        setNodeDebugData(node.id, {
          input: log.inputData,
          output: log.outputData,
          error: log.error || undefined,
        });

        return {
          nodeId: node.id,
          nodeName: log.nodeName || node.data.label,
          nodeType: log.nodeType || node.data.nodeType,
          status: mapStatus(log.status),
          startTime: log.startedAt ? new Date(log.startedAt) : undefined,
          endTime: log.finishedAt ? new Date(log.finishedAt) : undefined,
          duration: log.duration || undefined,
          input: log.inputData,
          output: log.outputData,
          error: log.error ? { message: log.error } : undefined,
        };
      }
      return {
        nodeId: node.id,
        nodeName: node.data.label,
        nodeType: node.data.nodeType,
        status: execution.status === 'FAILED' || execution.status === 'CANCELLED' ? 'skipped' : 'pending',
      };
    });
    return newSteps;
  }, [nodes, setNodeDebugData]);

  const mapStatus = (status: ExecutionLog['status']): ExecutionStep['status'] => {
    switch (status) {
      case 'PENDING': return 'pending';
      case 'RUNNING': return 'running';
      case 'COMPLETED': return 'completed';
      case 'FAILED': return 'failed';
      case 'SKIPPED': return 'skipped';
      default: return 'pending';
    }
  };

  // Polling pour mettre à jour le statut de l'exécution
  const pollExecutionStatus = useCallback(async (executionId: string) => {
    try {
      // For guest mode, we need to fetch executions from the guest API
      let execution: Execution;
      if (guestSessionId) {
        const result = await collaborationLinksApi.getGuestExecutions(guestSessionId, 1);
        const execData = result.data.find((e: Execution) => e.id === executionId);
        if (!execData) {
          throw new Error('Execution not found');
        }
        execution = execData;
      } else {
        execution = await executionsApi.get(executionId);
      }

      // Mettre à jour les steps avec les logs réels
      if (execution.nodeLogs) {
        const newSteps = mapExecutionLogsToSteps(execution.nodeLogs, execution);
        setSteps(newSteps);

        // Trouver le step en cours d'exécution pour le highlight
        const runningIndex = newSteps.findIndex(s => s.status === 'running');
        if (runningIndex >= 0) {
          setCurrentStepIndex(runningIndex);
          const runningNode = newSteps[runningIndex];
          onNodeHighlight?.(runningNode?.nodeId || null);
          setCurrentDebugNode(runningNode?.nodeId || null);

          // Log node start to console
          addConsoleLog({
            level: 'info',
            nodeId: runningNode?.nodeId,
            message: `Exécution du node "${runningNode?.nodeName}"`,
          });
        }

        // Log completed/failed nodes
        newSteps.forEach((step, idx) => {
          const prevStep = steps[idx];
          if (prevStep && prevStep.status === 'running' && step.status === 'completed') {
            addConsoleLog({
              level: 'debug',
              nodeId: step.nodeId,
              message: `Node "${step.nodeName}" terminé en ${step.duration ? formatDuration(step.duration) : 'N/A'}`,
              data: step.output,
            });
          } else if (prevStep && prevStep.status === 'running' && step.status === 'failed') {
            addConsoleLog({
              level: 'error',
              nodeId: step.nodeId,
              message: `Node "${step.nodeName}" a échoué: ${step.error?.message || 'Erreur inconnue'}`,
              data: step.error,
            });
          }
        });
      }

      // Calculer la durée
      if (execution.startedAt) {
        const start = new Date(execution.startedAt).getTime();
        const end = execution.finishedAt ? new Date(execution.finishedAt).getTime() : Date.now();
        setExecutionTime(end - start);
      }

      // Vérifier si l'exécution est terminée
      if (['COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT'].includes(execution.status)) {
        setIsRunning(false);
        onNodeHighlight?.(null);
        setCurrentDebugNode(null);

        if (execution.status === 'COMPLETED') {
          addConsoleLog({
            level: 'info',
            message: `Workflow terminé avec succès en ${formatDuration(executionTime)}`,
          });
        } else if (execution.status === 'FAILED') {
          setExecutionError(execution.errorMessage || 'L\'exécution a échoué');
          addConsoleLog({
            level: 'error',
            message: `Workflow échoué: ${execution.errorMessage || 'Erreur inconnue'}`,
          });
        } else if (execution.status === 'CANCELLED') {
          setExecutionError('L\'exécution a été annulée');
          addConsoleLog({
            level: 'warn',
            message: 'Exécution annulée par l\'utilisateur',
          });
        } else if (execution.status === 'TIMEOUT') {
          setExecutionError('L\'exécution a expiré (timeout)');
          addConsoleLog({
            level: 'error',
            message: 'Exécution expirée (timeout)',
          });
        }
        return true; // Terminé
      }

      return false; // Pas encore terminé
    } catch (error) {
      console.error('Erreur lors du polling:', error);
      setExecutionError('Erreur lors de la récupération du statut');
      setIsRunning(false);
      addConsoleLog({
        level: 'error',
        message: `Erreur de polling: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      });
      return true;
    }
  }, [mapExecutionLogsToSteps, onNodeHighlight, setCurrentDebugNode, addConsoleLog, steps, executionTime, guestSessionId]);

  const handleStartExecution = async () => {
    setIsRunning(true);
    setExecutionTime(0);
    setExecutionError(null);
    setCurrentStepIndex(0);

    // Clear previous debug data and enable debug mode
    clearDebugData();
    setDebugMode(true);

    // Reset les steps
    const initialSteps: ExecutionStep[] = nodes.map((node) => ({
      nodeId: node.id,
      nodeName: node.data.label,
      nodeType: node.data.nodeType,
      status: 'pending',
    }));
    setSteps(initialSteps);

    // Log execution start
    addConsoleLog({
      level: 'info',
      message: `Démarrage de l'exécution du workflow (${nodes.length} nodes)`,
    });

    try {
      // Déclencher l'exécution via l'API (guest ou authentifié)
      let execution: { id: string };
      if (guestSessionId) {
        execution = await collaborationLinksApi.triggerAsGuest(guestSessionId);
      } else {
        execution = await executionsApi.trigger(workflowId);
      }
      setCurrentExecutionId(execution.id);

      addConsoleLog({
        level: 'info',
        message: `Exécution créée avec l'ID: ${execution.id}`,
      });

      // Marquer le premier node comme running si c'est pending/queued
      if (nodes.length > 0 && nodes[0]) {
        onNodeHighlight?.(nodes[0].id);
        setCurrentDebugNode(nodes[0].id);
      }

      // Polling pour les mises à jour
      const pollInterval = setInterval(async () => {
        const isFinished = await pollExecutionStatus(execution.id);
        if (isFinished) {
          clearInterval(pollInterval);
          setDebugMode(false);
        }
      }, 1000);

      // Cleanup après 5 minutes max
      setTimeout(() => {
        clearInterval(pollInterval);
        if (isRunning) {
          setIsRunning(false);
          setDebugMode(false);
          setExecutionError('L\'exécution a pris trop de temps');
          addConsoleLog({
            level: 'error',
            message: 'Timeout: L\'exécution a pris trop de temps (5 minutes max)',
          });
        }
      }, 5 * 60 * 1000);

    } catch (error) {
      console.error('Erreur lors du déclenchement:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors du déclenchement';
      setExecutionError(errorMessage);
      setIsRunning(false);
      setDebugMode(false);
      onNodeHighlight?.(null);
      addConsoleLog({
        level: 'error',
        message: `Erreur de déclenchement: ${errorMessage}`,
      });
    }
  };

  const handleStopExecution = async () => {
    addConsoleLog({
      level: 'warn',
      message: 'Arrêt de l\'exécution demandé...',
    });

    if (currentExecutionId) {
      try {
        await executionsApi.cancel(currentExecutionId);
        addConsoleLog({
          level: 'info',
          message: 'Exécution annulée avec succès',
        });
      } catch (error) {
        console.error('Erreur lors de l\'annulation:', error);
        addConsoleLog({
          level: 'error',
          message: `Erreur lors de l'annulation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        });
      }
    }
    setIsRunning(false);
    setDebugMode(false);
    setCurrentDebugNode(null);
    onNodeHighlight?.(null);
    setSteps((prev) =>
      prev.map((step) =>
        step.status === 'running' ? { ...step, status: 'failed' as const } : step
      )
    );
  };

  const handleRefresh = async () => {
    if (currentExecutionId) {
      await pollExecutionStatus(currentExecutionId);
    }
  };

  const toggleStepExpanded = (nodeId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedSteps(newExpanded);
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getStatusIcon = (status: ExecutionStep['status'], small = false) => {
    const size = small ? 'h-3 w-3' : 'h-4 w-4';
    switch (status) {
      case 'pending':
        return <Clock className={cn(size, 'text-gray-500')} />;
      case 'running':
        return <Loader2 className={cn(size, 'text-blue-400 animate-spin')} />;
      case 'completed':
        return <CheckCircle2 className={cn(size, 'text-green-400')} />;
      case 'failed':
        return <XCircle className={cn(size, 'text-red-400')} />;
      case 'skipped':
        return <AlertTriangle className={cn(size, 'text-amber-400')} />;
    }
  };

  const getStatusBg = (status: ExecutionStep['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-800/50 border-gray-700';
      case 'running':
        return 'bg-blue-900/30 border-blue-700';
      case 'completed':
        return 'bg-green-900/30 border-green-700';
      case 'failed':
        return 'bg-red-900/30 border-red-700';
      case 'skipped':
        return 'bg-amber-900/30 border-amber-700';
    }
  };

  const completedSteps = steps.filter((s) => s.status === 'completed').length;
  const failedSteps = steps.filter((s) => s.status === 'failed').length;

  if (!isOpen && !embedded) return null;

  // Embedded mode for panel layout
  if (embedded) {
    return (
      <div className={cn('flex h-full flex-col bg-[#0f0f1a]', className)}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 bg-[#1a1a2e] px-3 py-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-white">Exécution</span>
            </div>

            {/* Stats compact */}
            <div className="flex items-center gap-2 text-[10px]">
              <span className="flex items-center gap-1 text-gray-400">
                <Clock className="h-3 w-3" />
                {formatDuration(executionTime)}
              </span>
              <span className="flex items-center gap-1 text-green-400">
                <CheckCircle2 className="h-3 w-3" />
                {completedSteps}/{steps.length}
              </span>
              {failedSteps > 0 && (
                <span className="flex items-center gap-1 text-red-400">
                  <XCircle className="h-3 w-3" />
                  {failedSteps}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {currentExecutionId && !isRunning && (
              <Button
                size="icon"
                variant="ghost"
                onClick={handleRefresh}
                className="h-6 w-6 text-gray-400 hover:text-white"
                title="Rafraîchir"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
            {!isRunning ? (
              <Button
                size="sm"
                onClick={handleStartExecution}
                className="h-6 px-2 text-[10px] bg-green-600 hover:bg-green-700"
              >
                <Play className="mr-1 h-3 w-3" />
                Lancer
              </Button>
            ) : (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleStopExecution}
                className="h-6 px-2 text-[10px]"
              >
                <Square className="mr-1 h-3 w-3" />
                Stop
              </Button>
            )}
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-6 w-6 text-gray-400 hover:text-red-400"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Error banner */}
        {executionError && (
          <div className="flex items-center gap-2 bg-red-900/30 px-3 py-1.5 text-[10px] text-red-400 border-b border-red-700">
            <XCircle className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{executionError}</span>
          </div>
        )}

        {/* Steps list */}
        <div className="flex-1 overflow-auto">
          <div className="p-2 space-y-1">
            {steps.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Bug className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Aucun node</p>
              </div>
            ) : (
              steps.map((step, index) => (
                <div
                  key={step.nodeId}
                  className={cn(
                    'rounded border p-2 transition-all text-xs',
                    getStatusBg(step.status),
                    currentStepIndex === index && isRunning && 'ring-1 ring-blue-500'
                  )}
                >
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => toggleStepExpanded(step.nodeId)}
                    onMouseEnter={() => onNodeHighlight?.(step.nodeId)}
                    onMouseLeave={() => !isRunning && onNodeHighlight?.(null)}
                  >
                    {/* Expand icon */}
                    {step.status !== 'pending' && step.status !== 'skipped' ? (
                      expandedSteps.has(step.nodeId) ? (
                        <ChevronDown className="h-3 w-3 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-gray-500" />
                      )
                    ) : (
                      <div className="w-3" />
                    )}

                    {/* Step number */}
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-700 text-[9px] font-medium text-gray-300">
                      {index + 1}
                    </div>

                    {/* Status icon */}
                    {getStatusIcon(step.status, true)}

                    {/* Node info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate text-white text-[11px]">{step.nodeName}</div>
                    </div>

                    {/* Duration */}
                    {step.duration && (
                      <span className="text-[9px] text-gray-500">
                        {formatDuration(step.duration)}
                      </span>
                    )}
                  </div>

                  {/* Expanded details */}
                  {expandedSteps.has(step.nodeId) && (step.status === 'completed' || step.status === 'failed') ? (
                    <div className="mt-2 space-y-1.5 border-t border-gray-700 pt-2">
                      {step.error ? (
                        <div className="rounded bg-red-900/30 p-1.5 text-[10px] border border-red-800">
                          <div className="font-medium text-red-400 mb-0.5">Erreur:</div>
                          <div className="text-red-300 break-all">{step.error.message}</div>
                        </div>
                      ) : null}

                      {step.input ? (
                        <div className="rounded bg-gray-800/50 p-1.5 text-[10px] border border-gray-700">
                          <div className="font-medium text-blue-400 mb-0.5">Input:</div>
                          <pre className="overflow-x-auto font-mono text-gray-300 max-h-20 overflow-y-auto">
                            {JSON.stringify(step.input, null, 2)}
                          </pre>
                        </div>
                      ) : null}

                      {step.output ? (
                        <div className="rounded bg-green-900/20 p-1.5 text-[10px] border border-green-800">
                          <div className="font-medium text-green-400 mb-0.5">Output:</div>
                          <pre className="overflow-x-auto font-mono text-green-300 max-h-20 overflow-y-auto">
                            {JSON.stringify(step.output, null, 2)}
                          </pre>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Original absolute positioning mode
  return (
    <div className="absolute bottom-0 left-0 right-0 z-50 bg-[#1a1a2e] border-t border-gray-800 shadow-2xl animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-white">Test d'exécution</h3>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1 text-gray-400">
              <Clock className="h-4 w-4" />
              {formatDuration(executionTime)}
            </span>
            <span className="flex items-center gap-1 text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              {completedSteps}/{steps.length}
            </span>
            {failedSteps > 0 && (
              <span className="flex items-center gap-1 text-red-400">
                <XCircle className="h-4 w-4" />
                {failedSteps} erreur{failedSteps > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentExecutionId && !isRunning && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              className="h-8 border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Rafraîchir
            </Button>
          )}
          {!isRunning ? (
            <Button
              size="sm"
              onClick={handleStartExecution}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="mr-2 h-4 w-4" />
              Lancer le test
            </Button>
          ) : (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleStopExecution}
            >
              <Square className="mr-2 h-4 w-4" />
              Arrêter
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white hover:bg-gray-800">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Execution error banner */}
      {executionError && (
        <div className="flex items-center gap-2 bg-red-900/30 px-4 py-2 text-sm text-red-400 border-b border-red-700">
          <XCircle className="h-4 w-4 flex-shrink-0" />
          <span>{executionError}</span>
        </div>
      )}

      {/* Steps list */}
      <ScrollArea className="h-64">
        <div className="p-4 space-y-2">
          {steps.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bug className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Aucun node dans le workflow</p>
              <p className="text-xs">Ajoutez des nodes pour tester l'exécution</p>
            </div>
          ) : (
            steps.map((step, index) => (
              <div
                key={step.nodeId}
                className={cn(
                  'rounded-lg border p-3 transition-all',
                  getStatusBg(step.status),
                  currentStepIndex === index && isRunning && 'ring-2 ring-blue-500'
                )}
              >
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => toggleStepExpanded(step.nodeId)}
                  onMouseEnter={() => onNodeHighlight?.(step.nodeId)}
                  onMouseLeave={() => !isRunning && onNodeHighlight?.(null)}
                >
                  {/* Expand/collapse */}
                  {step.status !== 'pending' && step.status !== 'skipped' ? (
                    expandedSteps.has(step.nodeId) ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )
                  ) : (
                    <div className="w-4" />
                  )}

                  {/* Step number */}
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-700 text-xs font-medium text-gray-300">
                    {index + 1}
                  </div>

                  {/* Status icon */}
                  {getStatusIcon(step.status)}

                  {/* Node info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-white">{step.nodeName}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {step.nodeType}
                    </div>
                  </div>

                  {/* Duration */}
                  {step.duration && (
                    <span className="text-xs text-gray-500">
                      {formatDuration(step.duration)}
                    </span>
                  )}
                </div>

                {/* Expanded details */}
                {expandedSteps.has(step.nodeId) && (step.status === 'completed' || step.status === 'failed') ? (
                  <div className="mt-3 space-y-2 border-t border-gray-700 pt-3">
                    {/* Error details */}
                    {step.error ? (
                      <div className="rounded bg-red-900/30 p-2 text-sm border border-red-800">
                        <div className="font-medium text-red-400 mb-1">Erreur:</div>
                        <div className="text-red-300">{step.error.message}</div>
                        {step.error.stack ? (
                          <pre className="mt-2 overflow-x-auto text-xs text-red-400 font-mono whitespace-pre-wrap">
                            {step.error.stack}
                          </pre>
                        ) : null}
                      </div>
                    ) : null}

                    {/* Input/Output */}
                    {step.input ? (
                      <div className="rounded bg-gray-800/50 p-2 text-sm border border-gray-700">
                        <div className="font-medium text-gray-400 mb-1">Input:</div>
                        <pre className="overflow-x-auto text-xs font-mono text-gray-300">
                          {JSON.stringify(step.input, null, 2)}
                        </pre>
                      </div>
                    ) : null}
                    {step.output ? (
                      <div className="rounded bg-green-900/20 p-2 text-sm border border-green-800">
                        <div className="font-medium text-green-400 mb-1">Output:</div>
                        <pre className="overflow-x-auto text-xs font-mono text-green-300">
                          {JSON.stringify(step.output, null, 2)}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
