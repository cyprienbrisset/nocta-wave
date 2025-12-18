'use client';

import type { ReactNode } from 'react';
import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Zap,
  Globe,
  Code,
  GitBranch,
  Database,
  MessageSquare,
  Wrench,
  Circle,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useWorkflowStore } from '@/stores/workflow.store';

export interface OutputDefinition {
  name: string;
  type: string;
  label?: string;
  description?: string;
  color?: string;
}

interface CustomNodeData extends Record<string, unknown> {
  label: string;
  nodeType: string;
  config?: Record<string, unknown>;
  category?: string;
  description?: string;
  status?: 'idle' | 'running' | 'completed' | 'failed';
  outputs?: OutputDefinition[];
}

type CustomNodeProps = {
  id: string;
  data: CustomNodeData;
  selected?: boolean;
};

// Category configuration with vibrant colors matching the dark theme
const categoryConfig: Record<string, {
  color: string;
  borderColor: string;
  handleColor: string;
  icon: ReactNode;
  label: string;
}> = {
  trigger: {
    color: '#22c55e',
    borderColor: '#22c55e',
    handleColor: '#22c55e',
    icon: <Zap className="h-3.5 w-3.5" />,
    label: 'Trigger',
  },
  http: {
    color: '#3b82f6',
    borderColor: '#3b82f6',
    handleColor: '#3b82f6',
    icon: <Globe className="h-3.5 w-3.5" />,
    label: 'HTTP',
  },
  transform: {
    color: '#a855f7',
    borderColor: '#a855f7',
    handleColor: '#a855f7',
    icon: <Code className="h-3.5 w-3.5" />,
    label: 'Transform',
  },
  logic: {
    color: '#f97316',
    borderColor: '#f97316',
    handleColor: '#f97316',
    icon: <GitBranch className="h-3.5 w-3.5" />,
    label: 'Logic',
  },
  database: {
    color: '#06b6d4',
    borderColor: '#06b6d4',
    handleColor: '#06b6d4',
    icon: <Database className="h-3.5 w-3.5" />,
    label: 'Database',
  },
  integration: {
    color: '#ec4899',
    borderColor: '#ec4899',
    handleColor: '#ec4899',
    icon: <MessageSquare className="h-3.5 w-3.5" />,
    label: 'Integration',
  },
  utility: {
    color: '#6b7280',
    borderColor: '#6b7280',
    handleColor: '#6b7280',
    icon: <Wrench className="h-3.5 w-3.5" />,
    label: 'Utility',
  },
};

const defaultConfig = categoryConfig.utility;

function CustomNodeComponent({ id, data, selected }: CustomNodeProps) {
  const category = data.nodeType?.split('.')[0] || 'utility';
  const config = categoryConfig[category] ?? defaultConfig;
  // Config is always defined because defaultConfig is always set
  const { color, borderColor, handleColor, icon, label: categoryLabel } = config!;

  // Debug state
  const { debug, toggleBreakpoint } = useWorkflowStore();
  const breakpoint = debug.breakpoints.find((b) => b.nodeId === id);
  const hasBreakpoint = !!breakpoint && breakpoint.enabled;
  const isCurrentDebugNode = debug.currentNodeId === id;
  const isPausedHere = debug.isPaused && isCurrentDebugNode;

  // Get outputs from node data, default to single output
  const outputs: OutputDefinition[] = data.outputs && data.outputs.length > 0
    ? data.outputs
    : [{ name: 'output', type: 'object', label: 'Sortie', color: handleColor }];

  // Calculate node height based on outputs
  const hasMultipleOutputs = outputs.length > 1;
  const nodeMinHeight = hasMultipleOutputs ? Math.max(80, outputs.length * 24 + 40) : 'auto';

  // Handle breakpoint toggle on double click of the breakpoint indicator
  const handleBreakpointClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleBreakpoint(id);
  };

  return (
    <div
      className={cn(
        'group relative rounded-lg transition-all duration-200',
        'bg-[#1e1e2e] border-2',
        selected ? 'shadow-lg shadow-white/10' : 'hover:shadow-md hover:shadow-white/5',
        isPausedHere && 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-[#0f0f1a]',
        isCurrentDebugNode && !isPausedHere && 'ring-2 ring-blue-500 ring-offset-1 ring-offset-[#0f0f1a]'
      )}
      style={{
        borderColor: isPausedHere ? '#eab308' : isCurrentDebugNode ? '#3b82f6' : borderColor,
        minWidth: hasMultipleOutputs ? 180 : 160,
        minHeight: nodeMinHeight,
      }}
    >
      {/* Breakpoint indicator */}
      <div
        className={cn(
          'absolute -left-3 top-1/2 -translate-y-1/2 cursor-pointer z-10',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          hasBreakpoint && 'opacity-100'
        )}
        onClick={handleBreakpointClick}
        title={hasBreakpoint ? 'Click to remove breakpoint' : 'Click to add breakpoint'}
      >
        <Circle
          className={cn(
            'h-4 w-4 transition-colors',
            hasBreakpoint ? 'fill-red-500 text-red-500' : 'text-gray-600 hover:text-red-400'
          )}
        />
      </div>
      {/* Node content */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="p-1 rounded"
            style={{ backgroundColor: `${color}20` }}
          >
            <span style={{ color }}>{icon}</span>
          </div>
          <h3
            className="font-semibold text-sm text-white leading-tight"
            style={{ color }}
          >
            {data.label}
          </h3>
        </div>
        {data.description && (
          <p className="text-[10px] text-gray-500 leading-tight ml-7">
            {data.description}
          </p>
        )}
      </div>

      {/* Input Handle (left side) with label */}
      <div
        className="absolute flex items-center gap-1"
        style={{
          left: -5,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      >
        <Handle
          type="target"
          position={Position.Left}
          className="!relative !w-3 !h-3 !rounded-full !border-2 !border-[#1e1e2e] !transform-none !top-0 !left-0"
          style={{
            backgroundColor: handleColor,
          }}
        />
        <span className="text-[9px] text-gray-500 ml-1 hidden group-hover:inline">
          entrée
        </span>
      </div>

      {/* Output Handles (right side) with labels */}
      {!hasMultipleOutputs ? (
        // Single output - center handle with label
        <div
          className="absolute flex items-center gap-1"
          style={{
            right: -5,
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        >
          <span className="text-[9px] text-gray-500 mr-1 hidden group-hover:inline">
            {outputs[0]?.label || 'sortie'}
          </span>
          <Handle
            type="source"
            position={Position.Right}
            id={outputs[0]?.name || 'output'}
            className="!relative !w-3 !h-3 !rounded-full !border-2 !border-[#1e1e2e] !transform-none !top-0 !right-0"
            style={{
              backgroundColor: outputs[0]?.color || handleColor,
            }}
          />
        </div>
      ) : (
        // Multiple outputs - stacked handles with labels
        <TooltipProvider delayDuration={100}>
          {outputs.map((out, index) => {
            const totalOutputs = outputs.length;
            const spacing = 100 / (totalOutputs + 1);
            const topPercent = spacing * (index + 1);

            return (
              <Tooltip key={out.name}>
                <TooltipTrigger asChild>
                  <div
                    className="absolute flex items-center gap-1"
                    style={{
                      right: -5,
                      top: `${topPercent}%`,
                      transform: 'translateY(-50%)',
                    }}
                  >
                    <span
                      className="text-[9px] mr-1"
                      style={{ color: out.color || handleColor }}
                    >
                      {out.label || out.name}
                    </span>
                    <Handle
                      type="source"
                      position={Position.Right}
                      id={out.name}
                      className="!relative !w-3 !h-3 !rounded-full !border-2 !border-[#1e1e2e] !transform-none !top-0 !right-0"
                      style={{
                        backgroundColor: out.color || handleColor,
                      }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="bg-[#2a2a3e] border-gray-700 text-white"
                >
                  <p className="font-medium text-xs" style={{ color: out.color }}>
                    {out.label || out.name}
                  </p>
                  {out.description && (
                    <p className="text-[10px] text-gray-400 mt-0.5">{out.description}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      )}

      {/* Status indicator */}
      {data.status && data.status !== 'idle' && (
        <div
          className={cn(
            'absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#1e1e2e]',
            data.status === 'running' && 'bg-blue-500 animate-pulse',
            data.status === 'completed' && 'bg-green-500',
            data.status === 'failed' && 'bg-red-500',
          )}
        />
      )}
    </div>
  );
}

export const CustomNode = memo(CustomNodeComponent);

// Export category config for use in edges
export { categoryConfig };

// Export des types de nodes pour React Flow
export const nodeTypes = {
  custom: CustomNode,
  default: CustomNode,
};
