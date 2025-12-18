'use client';

import { useState, useRef, useEffect } from 'react';
import { useWorkflowStore } from '@/stores/workflow.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Terminal,
  Trash2,
  ChevronDown,
  ChevronUp,
  Info,
  AlertTriangle,
  XCircle,
  Bug,
  Search,
  Filter,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DebugConsoleProps {
  isOpen: boolean;
  onClose?: () => void;
  onToggle?: () => void;
  onNodeClick?: (nodeId: string) => void;
}

export function DebugConsole({ isOpen, onClose, onToggle, onNodeClick }: DebugConsoleProps) {
  const handleToggle = onToggle || onClose || (() => {});
  const { consoleLogs, clearConsoleLogs, nodes } = useWorkflowStore();
  const [filter, setFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState<string[]>(['info', 'warn', 'error', 'debug']);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [consoleLogs, autoScroll]);

  const filteredLogs = consoleLogs.filter((log) => {
    if (!levelFilter.includes(log.level)) return false;
    if (filter && !log.message.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'info':
        return <Info className="h-3.5 w-3.5 text-blue-400" />;
      case 'warn':
        return <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />;
      case 'error':
        return <XCircle className="h-3.5 w-3.5 text-red-400" />;
      case 'debug':
        return <Bug className="h-3.5 w-3.5 text-purple-400" />;
      default:
        return <Terminal className="h-3.5 w-3.5 text-gray-400" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'info':
        return 'text-blue-400';
      case 'warn':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      case 'debug':
        return 'text-purple-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  const getNodeName = (nodeId?: string) => {
    if (!nodeId) return null;
    const node = nodes.find((n) => n.id === nodeId);
    return node?.data.label || nodeId;
  };

  const exportLogs = () => {
    const logText = filteredLogs
      .map((log) => `[${formatTimestamp(log.timestamp)}] [${log.level.toUpperCase()}] ${log.message}${log.data ? '\n' + JSON.stringify(log.data, null, 2) : ''}`)
      .join('\n\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleLevel = (level: string) => {
    setLevelFilter((prev) =>
      prev.includes(level)
        ? prev.filter((l) => l !== level)
        : [...prev, level]
    );
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-700 bg-[#0f0f1a] shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 bg-[#1a1a2e] px-3 py-2">
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggle}
            className="flex items-center gap-2 text-sm font-medium text-white"
          >
            <Terminal className="h-4 w-4 text-primary" />
            Console
            <ChevronDown className="h-3 w-3 text-gray-400" />
          </button>

          {/* Level filters */}
          <div className="flex items-center gap-1 ml-4">
            {['info', 'warn', 'error', 'debug'].map((level) => (
              <button
                key={level}
                onClick={() => toggleLevel(level)}
                className={cn(
                  'flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors',
                  levelFilter.includes(level)
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-500 hover:text-gray-300'
                )}
              >
                {getLevelIcon(level)}
                <span className="capitalize">{level}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter logs..."
              className="h-7 w-48 bg-gray-800 border-gray-700 pl-8 text-xs"
            />
          </div>

          {/* Actions */}
          <Button
            variant="ghost"
            size="sm"
            onClick={exportLogs}
            className="h-7 px-2 text-gray-400 hover:text-white"
            title="Export logs"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearConsoleLogs}
            className="h-7 px-2 text-gray-400 hover:text-white"
            title="Clear console"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Log entries */}
      <ScrollArea className="h-48" ref={scrollRef}>
        <div className="p-2 font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Terminal className="mr-2 h-4 w-4" />
              No logs to display
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className={cn(
                  'flex items-start gap-2 rounded px-2 py-1 hover:bg-gray-800/50',
                  log.level === 'error' && 'bg-red-900/10'
                )}
              >
                {/* Timestamp */}
                <span className="shrink-0 text-gray-600">
                  {formatTimestamp(log.timestamp)}
                </span>

                {/* Level icon */}
                <span className="shrink-0 mt-0.5">{getLevelIcon(log.level)}</span>

                {/* Node reference */}
                {log.nodeId && (
                  <button
                    onClick={() => onNodeClick?.(log.nodeId!)}
                    className="shrink-0 rounded bg-gray-800 px-1.5 py-0.5 text-[10px] font-medium text-primary hover:bg-gray-700"
                  >
                    {getNodeName(log.nodeId)}
                  </button>
                )}

                {/* Message */}
                <span className={cn('flex-1', getLevelColor(log.level))}>
                  {log.message}
                </span>

                {/* Data preview */}
                {log.data && (
                  <details className="group">
                    <summary className="cursor-pointer text-gray-500 hover:text-gray-300">
                      <span className="group-open:hidden">Show data</span>
                      <span className="hidden group-open:inline">Hide data</span>
                    </summary>
                    <pre className="mt-1 rounded bg-gray-900 p-2 text-[10px] text-gray-300 overflow-auto max-h-32">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
