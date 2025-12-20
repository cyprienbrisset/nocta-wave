'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Repeat,
  ChevronFirst,
  ChevronLast,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ReplayControls, ReplaySpeed, ReplayState } from '@/types/replay.types';

interface ReplayControlsProps {
  controls: ReplayControls;
  totalSteps: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onGoToStart: () => void;
  onGoToEnd: () => void;
  onGoToStep: (index: number) => void;
  onSpeedChange: (speed: ReplaySpeed) => void;
  onLoopToggle: () => void;
}

const SPEED_OPTIONS: ReplaySpeed[] = [0.25, 0.5, 1, 2, 4];

export function ReplayControlsBar({
  controls,
  totalSteps,
  onPlay,
  onPause,
  onStop,
  onStepForward,
  onStepBackward,
  onGoToStart,
  onGoToEnd,
  onGoToStep,
  onSpeedChange,
  onLoopToggle,
}: ReplayControlsProps) {
  const progressRef = useRef<HTMLDivElement>(null);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (controls.state === 'playing') {
            onPause();
          } else {
            onPlay();
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onStepBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          onStepForward();
          break;
        case 'Home':
          e.preventDefault();
          onGoToStart();
          break;
        case 'End':
          e.preventDefault();
          onGoToEnd();
          break;
        case 'Escape':
          e.preventDefault();
          onStop();
          break;
        case 'l':
          e.preventDefault();
          onLoopToggle();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [controls.state, onPlay, onPause, onStepForward, onStepBackward, onGoToStart, onGoToEnd, onStop, onLoopToggle]);

  // Handle progress bar click
  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressRef.current) return;
      const rect = progressRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      const stepIndex = Math.round(percentage * (totalSteps - 1));
      onGoToStep(Math.max(0, Math.min(totalSteps - 1, stepIndex)));
    },
    [totalSteps, onGoToStep]
  );

  const progress = totalSteps > 0 ? ((controls.currentStepIndex + 1) / totalSteps) * 100 : 0;

  return (
    <div className="flex flex-col gap-2 px-4 py-3 bg-[#1a1a2e] border-t border-gray-800">
      {/* Progress bar */}
      <div
        ref={progressRef}
        className="h-2 bg-gray-700 rounded-full cursor-pointer group relative"
        onClick={handleProgressClick}
      >
        {/* Progress fill */}
        <div
          className="h-full bg-purple-500 rounded-full transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
        {/* Hover indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{ left: `calc(${progress}% - 8px)` }}
        />
        {/* Step markers */}
        {totalSteps <= 20 &&
          Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full transition-colors',
                i <= controls.currentStepIndex ? 'bg-purple-300' : 'bg-gray-600'
              )}
              style={{ left: `${(i / (totalSteps - 1)) * 100}%` }}
            />
          ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {/* Speed selector */}
          <div className="flex items-center gap-0.5 bg-gray-800 rounded p-0.5 mr-2">
            {SPEED_OPTIONS.map((speed) => (
              <button
                key={speed}
                onClick={() => onSpeedChange(speed)}
                className={cn(
                  'px-2 py-1 text-xs rounded transition-colors',
                  controls.speed === speed
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                )}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Loop toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onLoopToggle}
            className={cn(
              'h-8 w-8',
              controls.isLooping && 'text-purple-400 bg-purple-900/30'
            )}
            title="Loop (L)"
          >
            <Repeat className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          {/* Go to start */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onGoToStart}
            disabled={controls.currentStepIndex === 0}
            className="h-8 w-8"
            title="Go to start (Home)"
          >
            <ChevronFirst className="h-4 w-4" />
          </Button>

          {/* Step backward */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onStepBackward}
            disabled={controls.currentStepIndex === 0}
            className="h-8 w-8"
            title="Step backward (Left Arrow)"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          {/* Play/Pause */}
          <Button
            variant="default"
            size="icon"
            onClick={controls.state === 'playing' ? onPause : onPlay}
            className="h-10 w-10 bg-purple-600 hover:bg-purple-700"
            title={controls.state === 'playing' ? 'Pause (Space)' : 'Play (Space)'}
          >
            {controls.state === 'playing' ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>

          {/* Step forward */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onStepForward}
            disabled={controls.currentStepIndex >= totalSteps - 1}
            className="h-8 w-8"
            title="Step forward (Right Arrow)"
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          {/* Go to end */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onGoToEnd}
            disabled={controls.currentStepIndex >= totalSteps - 1}
            className="h-8 w-8"
            title="Go to end (End)"
          >
            <ChevronLast className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {/* Step counter */}
          <div className="text-sm text-gray-400 font-mono min-w-24 text-right">
            {controls.currentStepIndex + 1} / {totalSteps}
          </div>

          {/* Reset */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onStop}
            className="h-8 w-8"
            title="Reset (Escape)"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
        <span
          className={cn(
            'w-2 h-2 rounded-full',
            controls.state === 'playing' && 'bg-green-500 animate-pulse',
            controls.state === 'paused' && 'bg-yellow-500',
            controls.state === 'finished' && 'bg-blue-500',
            controls.state === 'idle' && 'bg-gray-500',
            controls.state === 'stepping' && 'bg-purple-500'
          )}
        />
        <span className="capitalize">{controls.state}</span>
        {controls.isLooping && <span className="text-purple-400">(looping)</span>}
      </div>
    </div>
  );
}
