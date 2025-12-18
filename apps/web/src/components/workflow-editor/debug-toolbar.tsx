'use client';

import { useWorkflowStore } from '@/stores/workflow.store';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Play,
  Pause,
  Square,
  SkipForward,
  ArrowDownToLine,
  Bug,
  Circle,
  RotateCcw,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DebugToolbarProps {
  onStartDebug?: () => void;
  onStopDebug?: () => void;
  className?: string;
}

export function DebugToolbar({ onStartDebug, onStopDebug, className }: DebugToolbarProps) {
  const {
    debug,
    setDebugMode,
    pauseExecution,
    resumeExecution,
    stepOver,
    stepInto,
    clearDebugData,
  } = useWorkflowStore();

  const { isDebugging, isPaused, currentNodeId, breakpoints } = debug;

  const handleToggleDebug = () => {
    if (isDebugging) {
      setDebugMode(false);
      onStopDebug?.();
    } else {
      setDebugMode(true);
      onStartDebug?.();
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          'flex items-center gap-1 rounded-lg bg-[#1a1a2e] border border-gray-700 p-1',
          className
        )}
      >
        {/* Debug toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleDebug}
              className={cn(
                'h-8 w-8 p-0',
                isDebugging
                  ? 'bg-amber-900/50 text-amber-400 hover:bg-amber-900/70'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              )}
            >
              <Bug className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {isDebugging ? 'Stop debugging' : 'Start debugging'}
          </TooltipContent>
        </Tooltip>

        {isDebugging && (
          <>
            <div className="h-4 w-px bg-gray-700 mx-1" />

            {/* Play/Pause */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={isPaused ? resumeExecution : pauseExecution}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  {isPaused ? (
                    <Play className="h-4 w-4 text-green-400" />
                  ) : (
                    <Pause className="h-4 w-4 text-yellow-400" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {isPaused ? 'Resume (F5)' : 'Pause'}
              </TooltipContent>
            </Tooltip>

            {/* Stop */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDebugMode(false);
                    onStopDebug?.();
                  }}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-gray-800"
                >
                  <Square className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Stop (Shift+F5)
              </TooltipContent>
            </Tooltip>

            <div className="h-4 w-px bg-gray-700 mx-1" />

            {/* Step Over */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={stepOver}
                  disabled={!isPaused}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Step Over (F10)
              </TooltipContent>
            </Tooltip>

            {/* Step Into */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={stepInto}
                  disabled={!isPaused}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  <ArrowDownToLine className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Step Into (F11)
              </TooltipContent>
            </Tooltip>

            <div className="h-4 w-px bg-gray-700 mx-1" />

            {/* Clear debug data */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearDebugData}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Clear debug data
              </TooltipContent>
            </Tooltip>

            {/* Breakpoints indicator */}
            {breakpoints.length > 0 && (
              <div className="flex items-center gap-1 ml-2 px-2 py-1 rounded bg-red-900/30 text-red-400 text-xs">
                <Circle className="h-2 w-2 fill-current" />
                {breakpoints.length}
              </div>
            )}

            {/* Current node indicator */}
            {currentNodeId && (
              <div className="flex items-center gap-1 ml-2 px-2 py-1 rounded bg-blue-900/30 text-blue-400 text-xs">
                <History className="h-3 w-3" />
                Running
              </div>
            )}
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
