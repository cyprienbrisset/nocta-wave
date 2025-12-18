'use client';

import { useState } from 'react';
import { useWorkflowStore } from '@/stores/workflow.store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronDown,
  ChevronRight,
  X,
  Eye,
  Code,
  Copy,
  Check,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId?: string | null;
}

function JsonTree({ data, depth = 0, path = '' }: { data: any; depth?: number; path?: string }) {
  const [expanded, setExpanded] = useState(depth < 2);

  if (data === null) {
    return <span className="text-gray-500">null</span>;
  }

  if (data === undefined) {
    return <span className="text-gray-500">undefined</span>;
  }

  if (typeof data === 'boolean') {
    return <span className="text-yellow-400">{String(data)}</span>;
  }

  if (typeof data === 'number') {
    return <span className="text-blue-400">{data}</span>;
  }

  if (typeof data === 'string') {
    return <span className="text-green-400">"{data}"</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="text-gray-500">[]</span>;
    }

    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1 text-gray-400 hover:text-white"
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span className="text-purple-400">Array</span>
          <span className="text-gray-500">[{data.length}]</span>
        </button>
        {expanded && (
          <div className="ml-4 border-l border-gray-700 pl-2">
            {data.map((item, index) => (
              <div key={index} className="py-0.5">
                <span className="text-gray-500">{index}: </span>
                <JsonTree data={item} depth={depth + 1} path={`${path}[${index}]`} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length === 0) {
      return <span className="text-gray-500">{'{}'}</span>;
    }

    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1 text-gray-400 hover:text-white"
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span className="text-cyan-400">Object</span>
          <span className="text-gray-500">{'{'}...{'}'}</span>
        </button>
        {expanded && (
          <div className="ml-4 border-l border-gray-700 pl-2">
            {keys.map((key) => (
              <div key={key} className="py-0.5">
                <span className="text-orange-400">{key}</span>
                <span className="text-gray-500">: </span>
                <JsonTree data={data[key]} depth={depth + 1} path={`${path}.${key}`} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <span className="text-gray-400">{String(data)}</span>;
}

export function DataInspector({ isOpen, onClose, nodeId }: DataInspectorProps) {
  const { debug, nodes } = useWorkflowStore();
  const [viewMode, setViewMode] = useState<'tree' | 'raw'>('tree');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const nodeData = nodeId ? debug.nodeData[nodeId] : null;
  const node = nodeId ? nodes.find((n) => n.id === nodeId) : null;

  const copyToClipboard = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed right-80 top-14 bottom-0 w-96 bg-[#0f0f1a] border-l border-gray-800 z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 bg-[#1a1a2e] px-4 py-3">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-white">Data Inspector</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-gray-800 p-0.5">
            <button
              onClick={() => setViewMode('tree')}
              className={cn(
                'px-2 py-1 text-xs rounded transition-colors',
                viewMode === 'tree'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              Tree
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={cn(
                'px-2 py-1 text-xs rounded transition-colors',
                viewMode === 'raw'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              Raw
            </button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 w-7 p-0 text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Node info */}
      {node && (
        <div className="px-4 py-2 border-b border-gray-800 bg-[#1a1a2e]/50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">{node.data.label}</span>
            <span className="text-xs text-gray-500">{node.data.nodeType}</span>
          </div>
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1">
        {!nodeData ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Eye className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No data to inspect</p>
            <p className="text-xs mt-1">Run the workflow to see node data</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Input data */}
            {nodeData.input !== undefined && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-xs font-medium text-blue-400 uppercase">
                      Input
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(nodeData.input)}
                    className="h-6 w-6 p-0 text-gray-500 hover:text-white"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
                <div className="rounded-lg bg-gray-900 p-3 text-xs font-mono">
                  {viewMode === 'tree' ? (
                    <JsonTree data={nodeData.input} />
                  ) : (
                    <pre className="whitespace-pre-wrap text-gray-300">
                      {JSON.stringify(nodeData.input, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            )}

            {/* Output data */}
            {nodeData.output !== undefined && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-3.5 w-3.5 text-green-400 rotate-180" />
                    <span className="text-xs font-medium text-green-400 uppercase">
                      Output
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(nodeData.output)}
                    className="h-6 w-6 p-0 text-gray-500 hover:text-white"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
                <div className="rounded-lg bg-gray-900 p-3 text-xs font-mono">
                  {viewMode === 'tree' ? (
                    <JsonTree data={nodeData.output} />
                  ) : (
                    <pre className="whitespace-pre-wrap text-gray-300">
                      {JSON.stringify(nodeData.output, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            )}

            {/* Error */}
            {nodeData.error && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                  <span className="text-xs font-medium text-red-400 uppercase">
                    Error
                  </span>
                </div>
                <div className="rounded-lg bg-red-900/20 border border-red-900/50 p-3 text-xs">
                  <pre className="whitespace-pre-wrap text-red-400">
                    {nodeData.error}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
