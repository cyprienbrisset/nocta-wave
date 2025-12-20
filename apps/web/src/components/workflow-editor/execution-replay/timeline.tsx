'use client';

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Map,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ExecutionTimeline, TimelineStep, TimelineViewState } from '@/types/replay.types';

interface TimelineProps {
  timeline: ExecutionTimeline;
  currentStepIndex: number;
  selectedStepId: string | null;
  viewState: TimelineViewState;
  onStepSelect: (step: TimelineStep) => void;
  onViewStateChange: (state: Partial<TimelineViewState>) => void;
  onRangeSelect?: (start: number, end: number) => void;
}

// Colors for different node types
const NODE_TYPE_COLORS: Record<string, string> = {
  'trigger': '#8b5cf6',
  'http': '#3b82f6',
  'transform': '#10b981',
  'logic': '#f59e0b',
  'database': '#ef4444',
  'integration': '#ec4899',
  'utility': '#6b7280',
  'default': '#64748b',
};

// Status colors
const STATUS_COLORS: Record<string, string> = {
  completed: '#22c55e',
  failed: '#ef4444',
  running: '#3b82f6',
  pending: '#6b7280',
  skipped: '#9ca3af',
};

function getNodeColor(nodeType: string): string {
  const category = nodeType.split('.')[0] || 'default';
  return NODE_TYPE_COLORS[category] || NODE_TYPE_COLORS['default'] || '#64748b';
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatTime(timestamp: number, baseTime: number): string {
  const elapsed = timestamp - baseTime;
  if (elapsed < 1000) return `+${elapsed}ms`;
  if (elapsed < 60000) return `+${(elapsed / 1000).toFixed(1)}s`;
  return `+${(elapsed / 60000).toFixed(1)}m`;
}

export function Timeline({
  timeline,
  currentStepIndex,
  selectedStepId,
  viewState,
  onStepSelect,
  onViewStateChange,
  onRangeSelect,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [hoveredStepId, setHoveredStepId] = useState<string | null>(null);

  const { steps, startTime, endTime } = timeline;
  const totalDuration = (endTime || Date.now()) - startTime;
  const pixelsPerMs = (viewState.zoomLevel * 0.5) / 1000; // 0.5px per ms at zoom 1

  // Calculate timeline width
  const timelineWidth = useMemo(() => {
    return Math.max(totalDuration * pixelsPerMs, 800);
  }, [totalDuration, pixelsPerMs]);

  // Group steps by node if enabled
  const groupedSteps = useMemo(() => {
    if (!viewState.groupByNode) return { ungrouped: steps };

    const groups: Record<string, TimelineStep[]> = {};
    steps.forEach((step) => {
      const existing = groups[step.nodeId];
      if (!existing) {
        groups[step.nodeId] = [step];
      } else {
        existing.push(step);
      }
    });
    return groups;
  }, [steps, viewState.groupByNode]);

  // Handle zoom
  const handleZoom = useCallback(
    (delta: number) => {
      const newZoom = Math.min(10, Math.max(0.1, viewState.zoomLevel + delta));
      onViewStateChange({ zoomLevel: newZoom });
    },
    [viewState.zoomLevel, onViewStateChange]
  );

  // Handle fit to view
  const handleFitToView = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.offsetWidth - 100;
    const newZoom = containerWidth / (totalDuration * 0.0005);
    onViewStateChange({
      zoomLevel: Math.min(10, Math.max(0.1, newZoom)),
      panOffset: 0,
    });
  }, [totalDuration, onViewStateChange]);

  // Handle pan
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.shiftKey) {
        // Range selection
        setIsSelecting(true);
        const rect = timelineRef.current?.getBoundingClientRect();
        if (rect) {
          const x = e.clientX - rect.left + viewState.panOffset;
          setSelectionStart(startTime + x / pixelsPerMs);
        }
      } else {
        // Pan
        setIsDragging(true);
        setDragStart(e.clientX + viewState.panOffset);
      }
    },
    [viewState.panOffset, startTime, pixelsPerMs]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging && dragStart !== null) {
        const newOffset = Math.max(0, dragStart - e.clientX);
        onViewStateChange({ panOffset: newOffset });
      } else if (isSelecting && selectionStart !== null) {
        const rect = timelineRef.current?.getBoundingClientRect();
        if (rect) {
          const x = e.clientX - rect.left + viewState.panOffset;
          const currentTime = startTime + x / pixelsPerMs;
          onViewStateChange({
            selectedRange: {
              start: Math.min(selectionStart, currentTime),
              end: Math.max(selectionStart, currentTime),
            },
          });
        }
      }
    },
    [isDragging, dragStart, isSelecting, selectionStart, viewState.panOffset, startTime, pixelsPerMs, onViewStateChange]
  );

  const handleMouseUp = useCallback(() => {
    if (isSelecting && viewState.selectedRange && onRangeSelect) {
      onRangeSelect(viewState.selectedRange.start, viewState.selectedRange.end);
    }
    setIsDragging(false);
    setDragStart(null);
    setIsSelecting(false);
    setSelectionStart(null);
  }, [isSelecting, viewState.selectedRange, onRangeSelect]);

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.2 : 0.2;
        handleZoom(delta);
      }
    },
    [handleZoom]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const prevStep = steps[currentStepIndex - 1];
      const nextStep = steps[currentStepIndex + 1];
      if (e.key === 'ArrowLeft' && currentStepIndex > 0 && prevStep) {
        onStepSelect(prevStep);
      } else if (e.key === 'ArrowRight' && currentStepIndex < steps.length - 1 && nextStep) {
        onStepSelect(nextStep);
      } else if (e.key === '+' || e.key === '=') {
        handleZoom(0.2);
      } else if (e.key === '-') {
        handleZoom(-0.2);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStepIndex, steps, onStepSelect, handleZoom]);

  // Render time markers
  const timeMarkers = useMemo(() => {
    const markers: { time: number; label: string }[] = [];
    const markerInterval = Math.max(1000, Math.floor(50 / pixelsPerMs)); // At least 50px apart

    for (let t = 0; t <= totalDuration; t += markerInterval) {
      markers.push({
        time: startTime + t,
        label: formatTime(startTime + t, startTime),
      });
    }
    return markers;
  }, [startTime, totalDuration, pixelsPerMs]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a14]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 bg-[#1a1a2e]/50">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleZoom(-0.2)}
            className="h-7 w-7"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-gray-400 w-12 text-center">
            {Math.round(viewState.zoomLevel * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleZoom(0.2)}
            className="h-7 w-7"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFitToView}
            className="h-7 w-7"
            title="Fit to view"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewStateChange({ showMinimap: !viewState.showMinimap })}
            className={cn('h-7 gap-1', viewState.showMinimap && 'bg-purple-900/30 text-purple-400')}
          >
            <Map className="h-3.5 w-3.5" />
            <span className="text-xs">Minimap</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewStateChange({ groupByNode: !viewState.groupByNode })}
            className={cn('h-7 gap-1', viewState.groupByNode && 'bg-purple-900/30 text-purple-400')}
          >
            <Layers className="h-3.5 w-3.5" />
            <span className="text-xs">Group</span>
          </Button>
        </div>

        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span>Total: {formatDuration(totalDuration)}</span>
          <span className="mx-2">|</span>
          <span>{steps.length} steps</span>
        </div>
      </div>

      {/* Minimap */}
      {viewState.showMinimap && (
        <div className="h-8 border-b border-gray-800 bg-gray-900/50 relative overflow-hidden">
          {steps.map((step) => {
            const left = ((step.startTime - startTime) / totalDuration) * 100;
            const width = Math.max(
              1,
              (((step.endTime || step.startTime) - step.startTime) / totalDuration) * 100
            );
            return (
              <div
                key={step.id}
                className="absolute top-1 h-6 rounded-sm cursor-pointer hover:opacity-80"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  minWidth: 2,
                  backgroundColor: STATUS_COLORS[step.status],
                }}
                onClick={() => onStepSelect(step)}
              />
            );
          })}
          {/* Viewport indicator */}
          <div
            className="absolute top-0 h-full border-2 border-purple-500 bg-purple-500/10 pointer-events-none"
            style={{
              left: `${(viewState.panOffset / timelineWidth) * 100}%`,
              width: `${(containerRef.current?.offsetWidth || 0) / timelineWidth * 100}%`,
            }}
          />
        </div>
      )}

      {/* Main timeline */}
      <div
        ref={containerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden relative select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div
          ref={timelineRef}
          className="relative h-full"
          style={{
            width: timelineWidth,
            transform: `translateX(-${viewState.panOffset}px)`,
          }}
        >
          {/* Time markers */}
          <div className="absolute top-0 left-0 right-0 h-6 border-b border-gray-800">
            {timeMarkers.map((marker, i) => (
              <div
                key={i}
                className="absolute top-0 h-full flex items-center"
                style={{ left: (marker.time - startTime) * pixelsPerMs }}
              >
                <div className="w-px h-3 bg-gray-700" />
                <span className="text-[10px] text-gray-500 ml-1">{marker.label}</span>
              </div>
            ))}
          </div>

          {/* Current position indicator */}
          {currentStepIndex < steps.length && steps[currentStepIndex] && (
            <div
              className="absolute top-6 bottom-0 w-0.5 bg-purple-500 z-10 pointer-events-none"
              style={{
                left: (steps[currentStepIndex]!.startTime - startTime) * pixelsPerMs,
              }}
            >
              <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-purple-500 rounded-full" />
            </div>
          )}

          {/* Selection range */}
          {viewState.selectedRange && (
            <div
              className="absolute top-6 bottom-0 bg-blue-500/20 border-l border-r border-blue-500 pointer-events-none"
              style={{
                left: (viewState.selectedRange.start - startTime) * pixelsPerMs,
                width: (viewState.selectedRange.end - viewState.selectedRange.start) * pixelsPerMs,
              }}
            />
          )}

          {/* Steps */}
          {viewState.groupByNode ? (
            // Grouped view
            <div className="pt-8">
              {Object.entries(groupedSteps).map(([nodeId, nodeSteps], groupIndex) => (
                <div
                  key={nodeId}
                  className="relative h-12 border-b border-gray-800/50"
                  style={{ marginTop: groupIndex === 0 ? 0 : 4 }}
                >
                  {/* Node label */}
                  <div className="absolute left-2 top-1 text-[10px] text-gray-500 font-medium">
                    {nodeSteps[0]?.nodeName || 'Unknown'}
                  </div>
                  {/* Step blocks */}
                  {nodeSteps.map((step) => {
                    const left = (step.startTime - startTime) * pixelsPerMs;
                    const width = Math.max(
                      20,
                      ((step.endTime || step.startTime + 100) - step.startTime) * pixelsPerMs
                    );
                    const isSelected = step.id === selectedStepId;
                    const isHovered = step.id === hoveredStepId;
                    const isCurrent = steps.findIndex((s) => s.id === step.id) === currentStepIndex;

                    return (
                      <div
                        key={step.id}
                        className={cn(
                          'absolute top-6 h-5 rounded cursor-pointer transition-all',
                          'flex items-center px-1.5 text-[10px] text-white font-medium truncate',
                          isSelected && 'ring-2 ring-white',
                          isHovered && 'ring-2 ring-purple-400',
                          isCurrent && 'ring-2 ring-purple-500'
                        )}
                        style={{
                          left,
                          width,
                          backgroundColor: STATUS_COLORS[step.status],
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onStepSelect(step);
                        }}
                        onMouseEnter={() => setHoveredStepId(step.id)}
                        onMouseLeave={() => setHoveredStepId(null)}
                      >
                        {width > 50 && step.duration && formatDuration(step.duration)}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            // Sequential view
            <div className="pt-8 h-24 relative">
              {steps.map((step, index) => {
                const left = (step.startTime - startTime) * pixelsPerMs;
                const width = Math.max(
                  40,
                  ((step.endTime || step.startTime + 100) - step.startTime) * pixelsPerMs
                );
                const isSelected = step.id === selectedStepId;
                const isHovered = step.id === hoveredStepId;
                const isCurrent = index === currentStepIndex;

                return (
                  <div
                    key={step.id}
                    className={cn(
                      'absolute top-2 rounded cursor-pointer transition-all group',
                      isSelected && 'z-10',
                      isHovered && 'z-20'
                    )}
                    style={{
                      left,
                      width,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStepSelect(step);
                    }}
                    onMouseEnter={() => setHoveredStepId(step.id)}
                    onMouseLeave={() => setHoveredStepId(null)}
                  >
                    {/* Step block */}
                    <div
                      className={cn(
                        'h-12 rounded flex flex-col justify-center px-2 transition-all',
                        isSelected && 'ring-2 ring-white',
                        isHovered && 'ring-2 ring-purple-400',
                        isCurrent && 'ring-2 ring-purple-500'
                      )}
                      style={{
                        backgroundColor: STATUS_COLORS[step.status],
                        borderLeft: `3px solid ${getNodeColor(step.nodeType)}`,
                      }}
                    >
                      <div className="text-[10px] text-white font-medium truncate">
                        {step.nodeName}
                      </div>
                      {width > 60 && (
                        <div className="text-[9px] text-white/70 truncate">
                          {step.duration ? formatDuration(step.duration) : 'Running...'}
                        </div>
                      )}
                    </div>

                    {/* Connection line to next step */}
                    {index < steps.length - 1 && steps[index + 1] && (
                      <div className="absolute top-1/2 right-0 h-px bg-gray-600 pointer-events-none"
                        style={{
                          width: Math.max(0, (steps[index + 1]!.startTime - (step.endTime || step.startTime)) * pixelsPerMs - 4)
                        }}
                      />
                    )}

                    {/* Tooltip */}
                    {isHovered && (
                      <div className="absolute top-full left-0 mt-1 z-30 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-2 min-w-48 pointer-events-none">
                        <div className="text-xs font-medium text-white">{step.nodeName}</div>
                        <div className="text-[10px] text-gray-400">{step.nodeType}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: STATUS_COLORS[step.status] }}
                          />
                          <span className="text-[10px] text-gray-300 capitalize">{step.status}</span>
                        </div>
                        {step.duration && (
                          <div className="text-[10px] text-gray-400 mt-1">
                            Duration: {formatDuration(step.duration)}
                          </div>
                        )}
                        {step.error && (
                          <div className="text-[10px] text-red-400 mt-1 truncate max-w-64">
                            Error: {step.error.message}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-center gap-2 py-2 border-t border-gray-800">
        <Button
          variant="ghost"
          size="sm"
          disabled={currentStepIndex <= 0}
          onClick={() => {
            const prevStep = steps[currentStepIndex - 1];
            if (prevStep) onStepSelect(prevStep);
          }}
          className="h-7 gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="text-xs">Previous</span>
        </Button>
        <span className="text-xs text-gray-400 px-3">
          Step {currentStepIndex + 1} of {steps.length}
        </span>
        <Button
          variant="ghost"
          size="sm"
          disabled={currentStepIndex >= steps.length - 1}
          onClick={() => {
            const nextStep = steps[currentStepIndex + 1];
            if (nextStep) onStepSelect(nextStep);
          }}
          className="h-7 gap-1"
        >
          <span className="text-xs">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
