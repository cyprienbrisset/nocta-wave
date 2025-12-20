'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  History,
  X,
  Maximize2,
  Minimize2,
  Download,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  ExecutionTimeline,
  ReplayControls,
  ReplaySpeed,
  TimelineStep,
  TimelineViewState,
} from '@/types/replay.types';
import {
  initialReplayControls,
  initialTimelineViewState,
  createTimelineFromExecution,
} from '@/types/replay.types';
import { Timeline } from './timeline';
import { StepInspector } from './step-inspector';
import { ReplayControlsBar } from './replay-controls';
import { ExportDialog } from './export-dialog';

interface ExecutionReplayPanelProps {
  execution: {
    id: string;
    workflowId: string;
    status: string;
    startedAt?: Date | string;
    finishedAt?: Date | string;
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    error?: string;
    logs?: Array<{
      id: string;
      nodeId: string;
      nodeName?: string;
      nodeType?: string;
      status: string;
      inputData?: unknown;
      outputData?: unknown;
      error?: string;
      startedAt?: Date | string;
      finishedAt?: Date | string;
      duration?: number;
      retryCount?: number;
    }>;
  };
  workflowName: string;
  isOpen: boolean;
  onClose: () => void;
  onNodeHighlight?: (nodeId: string | null) => void;
}

export function ExecutionReplayPanel({
  execution,
  workflowName,
  isOpen,
  onClose,
  onNodeHighlight,
}: ExecutionReplayPanelProps) {
  // State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedStepIds, setSelectedStepIds] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [controls, setControls] = useState<ReplayControls>(initialReplayControls);
  const [viewState, setViewState] = useState<TimelineViewState>(initialTimelineViewState);
  const [inspectorHeight, setInspectorHeight] = useState(300);

  // Refs
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Create timeline from execution
  const timeline: ExecutionTimeline = createTimelineFromExecution(execution, workflowName);

  // Get current and previous step
  const currentStep = timeline.steps[controls.currentStepIndex];
  const previousStep = controls.currentStepIndex > 0 ? timeline.steps[controls.currentStepIndex - 1] : undefined;

  // Get selected step for inspector
  const selectedStep = selectedStepId
    ? timeline.steps.find((s) => s.id === selectedStepId)
    : currentStep;
  const selectedStepIndex = selectedStep
    ? timeline.steps.findIndex((s) => s.id === selectedStep.id)
    : controls.currentStepIndex;
  const previousStepForInspector = selectedStepIndex > 0
    ? timeline.steps[selectedStepIndex - 1]
    : undefined;

  // Play logic
  const play = useCallback(() => {
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }

    setControls((prev) => ({ ...prev, state: 'playing' }));

    const intervalMs = 1000 / controls.speed;
    playIntervalRef.current = setInterval(() => {
      setControls((prev) => {
        if (prev.currentStepIndex >= timeline.steps.length - 1) {
          if (prev.isLooping) {
            return { ...prev, currentStepIndex: 0 };
          } else {
            if (playIntervalRef.current) {
              clearInterval(playIntervalRef.current);
              playIntervalRef.current = null;
            }
            return { ...prev, state: 'finished' };
          }
        }
        return { ...prev, currentStepIndex: prev.currentStepIndex + 1 };
      });
    }, intervalMs);
  }, [controls.speed, timeline.steps.length]);

  const pause = useCallback(() => {
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
    setControls((prev) => ({ ...prev, state: 'paused' }));
  }, []);

  const stop = useCallback(() => {
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
    setControls((prev) => ({ ...prev, state: 'idle', currentStepIndex: 0 }));
    setSelectedStepId(null);
  }, []);

  const stepForward = useCallback(() => {
    pause();
    setControls((prev) => ({
      ...prev,
      state: 'stepping',
      currentStepIndex: Math.min(prev.currentStepIndex + 1, timeline.steps.length - 1),
    }));
  }, [pause, timeline.steps.length]);

  const stepBackward = useCallback(() => {
    pause();
    setControls((prev) => ({
      ...prev,
      state: 'stepping',
      currentStepIndex: Math.max(prev.currentStepIndex - 1, 0),
    }));
  }, [pause]);

  const goToStart = useCallback(() => {
    pause();
    setControls((prev) => ({ ...prev, state: 'idle', currentStepIndex: 0 }));
  }, [pause]);

  const goToEnd = useCallback(() => {
    pause();
    setControls((prev) => ({
      ...prev,
      state: 'finished',
      currentStepIndex: timeline.steps.length - 1,
    }));
  }, [pause, timeline.steps.length]);

  const goToStep = useCallback(
    (index: number) => {
      pause();
      setControls((prev) => ({
        ...prev,
        state: prev.state === 'playing' ? 'paused' : prev.state,
        currentStepIndex: Math.max(0, Math.min(index, timeline.steps.length - 1)),
      }));
    },
    [pause, timeline.steps.length]
  );

  const setSpeed = useCallback((speed: ReplaySpeed) => {
    setControls((prev) => ({ ...prev, speed }));
  }, []);

  const toggleLoop = useCallback(() => {
    setControls((prev) => ({ ...prev, isLooping: !prev.isLooping }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, []);

  // Update speed while playing
  useEffect(() => {
    if (controls.state === 'playing') {
      play();
    }
  }, [controls.speed, play, controls.state]);

  // Highlight current node on canvas
  useEffect(() => {
    if (onNodeHighlight && currentStep) {
      onNodeHighlight(currentStep.nodeId);
    }
    return () => {
      if (onNodeHighlight) {
        onNodeHighlight(null);
      }
    };
  }, [currentStep, onNodeHighlight]);

  // Handle step selection from timeline
  const handleStepSelect = useCallback((step: TimelineStep) => {
    setSelectedStepId(step.id);
    goToStep(timeline.steps.findIndex((s) => s.id === step.id));
  }, [timeline.steps, goToStep]);

  // Handle range selection
  const handleRangeSelect = useCallback((start: number, end: number) => {
    const stepIds = timeline.steps
      .filter((_, i) => i >= start && i <= end)
      .map((s) => s.id);
    setSelectedStepIds(stepIds);
  }, [timeline.steps]);

  // Handle view state changes
  const handleViewStateChange = useCallback((updates: Partial<TimelineViewState>) => {
    setViewState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Resize handler for inspector
  const handleInspectorResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = inspectorHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY;
      setInspectorHeight(Math.max(150, Math.min(600, startHeight + deltaY)));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [inspectorHeight]);

  if (!isOpen) return null;

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          'flex flex-col bg-[#0a0a14] border-t border-gray-800 transition-all duration-200',
          isFullscreen
            ? 'fixed inset-0 z-50'
            : 'absolute bottom-0 left-0 right-0'
        )}
        style={!isFullscreen ? { height: `${inspectorHeight + 200}px` } : undefined}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a2e] border-b border-gray-800">
          <div className="flex items-center gap-3">
            <History className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-medium text-white">Execution Replay</span>
            <span className="text-xs text-gray-500">
              {workflowName} • {execution.id.slice(0, 8)}
            </span>
            <div
              className={cn(
                'px-2 py-0.5 rounded text-[10px] font-medium',
                timeline.status === 'completed' && 'bg-green-900/50 text-green-400',
                timeline.status === 'failed' && 'bg-red-900/50 text-red-400',
                timeline.status === 'running' && 'bg-blue-900/50 text-blue-400',
                timeline.status === 'cancelled' && 'bg-gray-700 text-gray-400'
              )}
            >
              {timeline.status}
            </div>
            {timeline.totalDuration && (
              <span className="text-xs text-gray-500">
                Duration: {(timeline.totalDuration / 1000).toFixed(2)}s
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowExportDialog(true)}
              className="h-7 gap-1 text-gray-400 hover:text-white"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="text-xs">Export</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-7 w-7 text-gray-400 hover:text-white"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7 text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Timeline */}
          <div className="h-32 border-b border-gray-800">
            <Timeline
              timeline={timeline}
              currentStepIndex={controls.currentStepIndex}
              viewState={viewState}
              onStepSelect={handleStepSelect}
              onViewStateChange={handleViewStateChange}
              onRangeSelect={handleRangeSelect}
              selectedStepId={selectedStepId}
            />
          </div>

          {/* Resize handle */}
          {!isFullscreen && (
            <div
              className="h-1 bg-gray-800 hover:bg-purple-600 cursor-ns-resize transition-colors"
              onMouseDown={handleInspectorResize}
            />
          )}

          {/* Step Inspector */}
          <div className="flex-1 overflow-hidden">
            {selectedStep ? (
              <StepInspector
                step={selectedStep}
                previousStep={previousStepForInspector}
                showComparison={showComparison}
                onToggleComparison={() => setShowComparison(!showComparison)}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                No step selected. Click on a step in the timeline to inspect.
              </div>
            )}
          </div>
        </div>

        {/* Replay controls */}
        <ReplayControlsBar
          controls={controls}
          totalSteps={timeline.steps.length}
          onPlay={play}
          onPause={pause}
          onStop={stop}
          onStepForward={stepForward}
          onStepBackward={stepBackward}
          onGoToStart={goToStart}
          onGoToEnd={goToEnd}
          onGoToStep={goToStep}
          onSpeedChange={setSpeed}
          onLoopToggle={toggleLoop}
        />
      </div>

      {/* Export dialog */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        timeline={timeline}
        selectedStepIds={selectedStepIds}
      />
    </>
  );
}

// Execution selector dropdown component
interface ExecutionSelectorProps {
  executions: Array<{
    id: string;
    status: string;
    startedAt?: Date | string;
  }>;
  selectedId: string;
  onSelect: (id: string) => void;
}

export function ExecutionSelector({
  executions,
  selectedId,
  onSelect,
}: ExecutionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selected = executions.find((e) => e.id === selectedId);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded hover:border-gray-600 transition-colors"
      >
        <span className="text-xs text-white">
          {selected?.id.slice(0, 8) || 'Select execution'}
        </span>
        <ChevronDown className="h-3 w-3 text-gray-400" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-64 max-h-60 overflow-auto bg-gray-800 border border-gray-700 rounded shadow-xl z-50">
            {executions.map((exec) => (
              <button
                key={exec.id}
                onClick={() => {
                  onSelect(exec.id);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-700 transition-colors',
                  exec.id === selectedId && 'bg-purple-900/30'
                )}
              >
                <div>
                  <div className="text-xs font-mono text-white">
                    {exec.id.slice(0, 12)}...
                  </div>
                  {exec.startedAt && (
                    <div className="text-[10px] text-gray-500">
                      {new Date(exec.startedAt).toLocaleString()}
                    </div>
                  )}
                </div>
                <div
                  className={cn(
                    'px-1.5 py-0.5 rounded text-[10px] font-medium',
                    exec.status === 'COMPLETED' && 'bg-green-900/50 text-green-400',
                    exec.status === 'FAILED' && 'bg-red-900/50 text-red-400',
                    exec.status === 'RUNNING' && 'bg-blue-900/50 text-blue-400'
                  )}
                >
                  {exec.status}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
