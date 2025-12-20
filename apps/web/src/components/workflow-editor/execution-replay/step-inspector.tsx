'use client';

import { useState, useMemo } from 'react';
import {
  ArrowRight,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Search,
  X,
  ArrowLeftRight,
  Diff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TimelineStep, DataDiff } from '@/types/replay.types';
import { computeDataDiff } from '@/types/replay.types';

interface StepInspectorProps {
  step: TimelineStep;
  previousStep?: TimelineStep;
  showComparison: boolean;
  onToggleComparison: () => void;
}

// JSON Tree component with syntax highlighting
function JsonTree({
  data,
  name,
  depth = 0,
  expanded = true,
  searchQuery = '',
  highlightPaths = [],
}: {
  data: unknown;
  name?: string;
  depth?: number;
  expanded?: boolean;
  searchQuery?: string;
  highlightPaths?: string[];
}) {
  const [isExpanded, setIsExpanded] = useState(expanded && depth < 2);

  const type = useMemo(() => {
    if (data === null) return 'null';
    if (Array.isArray(data)) return 'array';
    return typeof data;
  }, [data]);

  const hasChildren = type === 'object' || type === 'array';
  const childCount = hasChildren
    ? Object.keys(data as Record<string, unknown>).length
    : 0;

  const valueColor = useMemo(() => {
    switch (type) {
      case 'string':
        return 'text-green-400';
      case 'number':
        return 'text-blue-400';
      case 'boolean':
        return 'text-yellow-400';
      case 'null':
        return 'text-gray-500';
      default:
        return 'text-gray-300';
    }
  }, [type]);

  // Check if this value matches search
  const matchesSearch = useMemo(() => {
    if (!searchQuery) return false;
    const query = searchQuery.toLowerCase();
    if (name?.toLowerCase().includes(query)) return true;
    if (typeof data === 'string' && data.toLowerCase().includes(query)) return true;
    if (typeof data === 'number' && data.toString().includes(query)) return true;
    return false;
  }, [searchQuery, name, data]);

  // Check if path is highlighted (for diffs)
  const isHighlighted = useMemo(() => {
    return highlightPaths.some((p) => p === name || p.startsWith(name + '.'));
  }, [highlightPaths, name]);

  const renderValue = () => {
    if (type === 'null') return <span className="text-gray-500">null</span>;
    if (type === 'boolean') return <span className="text-yellow-400">{String(data)}</span>;
    if (type === 'number') return <span className="text-blue-400">{String(data)}</span>;
    if (type === 'string') {
      const str = data as string;
      if (str.length > 100) {
        return (
          <span className="text-green-400">
            "{str.slice(0, 100)}..."
          </span>
        );
      }
      return <span className="text-green-400">"{str}"</span>;
    }
    if (type === 'array') {
      if (!isExpanded) {
        return (
          <span className="text-gray-500">
            [{childCount} items]
          </span>
        );
      }
    }
    if (type === 'object') {
      if (!isExpanded) {
        return (
          <span className="text-gray-500">
            {`{${childCount} keys}`}
          </span>
        );
      }
    }
    return null;
  };

  return (
    <div
      className={cn(
        'font-mono text-xs',
        matchesSearch && 'bg-yellow-900/30 rounded',
        isHighlighted && 'bg-blue-900/30 rounded'
      )}
      style={{ paddingLeft: depth * 16 }}
    >
      <div className="flex items-start gap-1 py-0.5 hover:bg-gray-800/50 rounded px-1 -ml-1">
        {hasChildren ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-gray-500 hover:text-white"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {name !== undefined && (
          <>
            <span className="text-purple-400">{name}</span>
            <span className="text-gray-500">:</span>
          </>
        )}

        {renderValue()}
      </div>

      {hasChildren && isExpanded && (
        <div>
          {Object.entries(data as Record<string, unknown>).map(([key, value]) => (
            <JsonTree
              key={key}
              data={value}
              name={key}
              depth={depth + 1}
              expanded={depth < 1}
              searchQuery={searchQuery}
              highlightPaths={highlightPaths}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Diff view component
function DiffView({ diffs, basePath = '' }: { diffs: DataDiff[]; basePath?: string }) {
  return (
    <div className="space-y-0.5 font-mono text-xs">
      {diffs.map((diff, i) => {
        const path = diff.path || basePath;
        const hasNested = diff.children && diff.children.length > 0;

        if (hasNested) {
          return (
            <div key={i}>
              <div className="text-gray-400 py-0.5">{path}</div>
              <DiffView diffs={diff.children!} basePath={path} />
            </div>
          );
        }

        const bgColor =
          diff.type === 'added'
            ? 'bg-green-900/30 border-l-2 border-green-500'
            : diff.type === 'removed'
            ? 'bg-red-900/30 border-l-2 border-red-500'
            : diff.type === 'changed'
            ? 'bg-yellow-900/30 border-l-2 border-yellow-500'
            : 'bg-transparent';

        const prefix =
          diff.type === 'added'
            ? '+'
            : diff.type === 'removed'
            ? '-'
            : diff.type === 'changed'
            ? '~'
            : ' ';

        const prefixColor =
          diff.type === 'added'
            ? 'text-green-400'
            : diff.type === 'removed'
            ? 'text-red-400'
            : diff.type === 'changed'
            ? 'text-yellow-400'
            : 'text-gray-500';

        return (
          <div key={i} className={cn('py-0.5 px-2 rounded', bgColor)}>
            <span className={cn('font-bold mr-2', prefixColor)}>{prefix}</span>
            <span className="text-purple-400">{path}</span>
            {diff.type === 'changed' && (
              <>
                <span className="text-gray-500 mx-1">:</span>
                <span className="text-red-400 line-through mr-2">
                  {JSON.stringify(diff.oldValue)}
                </span>
                <ArrowRight className="inline h-3 w-3 text-gray-500 mx-1" />
                <span className="text-green-400">{JSON.stringify(diff.newValue)}</span>
              </>
            )}
            {diff.type === 'added' && (
              <>
                <span className="text-gray-500 mx-1">:</span>
                <span className="text-green-400">{JSON.stringify(diff.newValue)}</span>
              </>
            )}
            {diff.type === 'removed' && (
              <>
                <span className="text-gray-500 mx-1">:</span>
                <span className="text-red-400">{JSON.stringify(diff.oldValue)}</span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Data panel with copy and search
function DataPanel({
  title,
  data,
  color,
  searchQuery,
  highlightPaths = [],
}: {
  title: string;
  data: unknown;
  color: string;
  searchQuery: string;
  highlightPaths?: string[];
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: color + '40', backgroundColor: color + '10' }}
      >
        <span className="text-xs font-medium" style={{ color }}>
          {title}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          className="h-6 w-6"
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-400" />
          ) : (
            <Copy className="h-3 w-3 text-gray-400" />
          )}
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-3 bg-gray-900/50">
        {data !== undefined && data !== null ? (
          <JsonTree
            data={data}
            searchQuery={searchQuery}
            highlightPaths={highlightPaths}
          />
        ) : (
          <span className="text-gray-500 text-xs italic">No data</span>
        )}
      </div>
    </div>
  );
}

export function StepInspector({
  step,
  previousStep,
  showComparison,
  onToggleComparison,
}: StepInspectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'split' | 'diff'>('split');

  // Compute diffs when comparing
  const inputDiff = useMemo(() => {
    if (!showComparison || !previousStep) return [];
    return computeDataDiff(previousStep.outputData, step.inputData);
  }, [showComparison, previousStep, step]);

  const outputDiff = useMemo(() => {
    if (!showComparison) return [];
    return computeDataDiff(step.inputData, step.outputData);
  }, [showComparison, step]);

  // Get changed paths for highlighting
  const changedInputPaths = useMemo(() => {
    return inputDiff
      .filter((d) => d.type !== 'unchanged')
      .map((d) => d.path);
  }, [inputDiff]);

  const changedOutputPaths = useMemo(() => {
    return outputDiff
      .filter((d) => d.type !== 'unchanged')
      .map((d) => d.path);
  }, [outputDiff]);

  // Count changes
  const inputChanges = useMemo(() => {
    const counts = { added: 0, removed: 0, changed: 0 };
    inputDiff.forEach((d) => {
      if (d.type === 'added') counts.added++;
      else if (d.type === 'removed') counts.removed++;
      else if (d.type === 'changed') counts.changed++;
    });
    return counts;
  }, [inputDiff]);

  const outputChanges = useMemo(() => {
    const counts = { added: 0, removed: 0, changed: 0 };
    outputDiff.forEach((d) => {
      if (d.type === 'added') counts.added++;
      else if (d.type === 'removed') counts.removed++;
      else if (d.type === 'changed') counts.changed++;
    });
    return counts;
  }, [outputDiff]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a14]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 bg-[#1a1a2e]/50">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-sm font-medium text-white">{step.nodeName}</div>
            <div className="text-xs text-gray-500">{step.nodeType}</div>
          </div>
          <div
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-medium',
              step.status === 'completed' && 'bg-green-900/50 text-green-400',
              step.status === 'failed' && 'bg-red-900/50 text-red-400',
              step.status === 'running' && 'bg-blue-900/50 text-blue-400',
              step.status === 'pending' && 'bg-gray-700 text-gray-400',
              step.status === 'skipped' && 'bg-gray-700 text-gray-500'
            )}
          >
            {step.status}
          </div>
          {step.duration && (
            <span className="text-xs text-gray-500">
              {step.duration}ms
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="h-7 pl-7 pr-7 w-40 text-xs bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-white placeholder-gray-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Comparison toggle */}
          {previousStep && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleComparison}
              className={cn(
                'h-7 gap-1',
                showComparison && 'bg-purple-900/30 text-purple-400'
              )}
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              <span className="text-xs">Compare</span>
            </Button>
          )}

          {/* View mode toggle */}
          {showComparison && (
            <div className="flex items-center gap-1 bg-gray-800 rounded p-0.5">
              <button
                onClick={() => setViewMode('split')}
                className={cn(
                  'px-2 py-1 text-xs rounded transition-colors',
                  viewMode === 'split'
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white'
                )}
              >
                Split
              </button>
              <button
                onClick={() => setViewMode('diff')}
                className={cn(
                  'px-2 py-1 text-xs rounded transition-colors',
                  viewMode === 'diff'
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white'
                )}
              >
                <Diff className="h-3 w-3 inline mr-1" />
                Diff
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error message */}
      {step.error && (
        <div className="px-3 py-2 bg-red-900/20 border-b border-red-900/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-red-400">Error:</span>
            <span className="text-xs text-red-300">{step.error.message}</span>
          </div>
          {step.error.stack && (
            <pre className="mt-1 text-[10px] text-red-300/70 overflow-auto max-h-20">
              {step.error.stack}
            </pre>
          )}
        </div>
      )}

      {/* Comparison stats */}
      {showComparison && viewMode === 'split' && (
        <div className="flex items-center gap-4 px-3 py-2 border-b border-gray-800 bg-gray-900/50">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Input changes:</span>
            {inputChanges.added > 0 && (
              <span className="text-xs text-green-400">+{inputChanges.added}</span>
            )}
            {inputChanges.removed > 0 && (
              <span className="text-xs text-red-400">-{inputChanges.removed}</span>
            )}
            {inputChanges.changed > 0 && (
              <span className="text-xs text-yellow-400">~{inputChanges.changed}</span>
            )}
            {inputChanges.added === 0 && inputChanges.removed === 0 && inputChanges.changed === 0 && (
              <span className="text-xs text-gray-500">none</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Output changes:</span>
            {outputChanges.added > 0 && (
              <span className="text-xs text-green-400">+{outputChanges.added}</span>
            )}
            {outputChanges.removed > 0 && (
              <span className="text-xs text-red-400">-{outputChanges.removed}</span>
            )}
            {outputChanges.changed > 0 && (
              <span className="text-xs text-yellow-400">~{outputChanges.changed}</span>
            )}
            {outputChanges.added === 0 && outputChanges.removed === 0 && outputChanges.changed === 0 && (
              <span className="text-xs text-gray-500">none</span>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {viewMode === 'diff' && showComparison ? (
          <div className="flex-1 overflow-auto p-3">
            <div className="mb-4">
              <div className="text-xs font-medium text-blue-400 mb-2">
                Input Changes (from previous output)
              </div>
              <DiffView diffs={inputDiff.filter((d) => d.type !== 'unchanged')} />
            </div>
            <div>
              <div className="text-xs font-medium text-purple-400 mb-2">
                Output Changes (input → output)
              </div>
              <DiffView diffs={outputDiff.filter((d) => d.type !== 'unchanged')} />
            </div>
          </div>
        ) : (
          <>
            <DataPanel
              title="Input"
              data={step.inputData}
              color="#3b82f6"
              searchQuery={searchQuery}
              highlightPaths={showComparison ? changedInputPaths : []}
            />
            <div className="w-px bg-gray-800 flex-shrink-0" />
            <DataPanel
              title="Output"
              data={step.outputData}
              color="#a855f7"
              searchQuery={searchQuery}
              highlightPaths={showComparison ? changedOutputPaths : []}
            />
          </>
        )}
      </div>

      {/* Metadata footer */}
      {step.metadata && (
        <div className="flex items-center gap-4 px-3 py-1.5 border-t border-gray-800 bg-gray-900/50 text-[10px] text-gray-500">
          {step.metadata.retryCount !== undefined && step.metadata.retryCount > 0 && (
            <span>Retries: {step.metadata.retryCount}</span>
          )}
          {step.metadata.memoryUsage && (
            <span>Memory: {(step.metadata.memoryUsage / 1024 / 1024).toFixed(1)}MB</span>
          )}
          {step.metadata.cpuTime && (
            <span>CPU: {step.metadata.cpuTime}ms</span>
          )}
        </div>
      )}
    </div>
  );
}
