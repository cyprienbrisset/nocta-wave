# Workflow Editor Development Guide

## Overview

The workflow editor is built with [React Flow](https://reactflow.dev/), providing a visual drag-and-drop interface for creating workflows.

## Architecture

```
apps/web/
├── app/
│   └── workflows/
│       └── [id]/
│           └── page.tsx           # Workflow editor page
├── components/
│   └── workflow-editor/
│       ├── index.tsx              # Main editor component
│       ├── canvas.tsx             # React Flow canvas
│       ├── node-panel.tsx         # Left panel with node library
│       ├── properties-panel.tsx   # Right panel for node config
│       ├── toolbar.tsx            # Top toolbar
│       ├── nodes/                 # Custom node components
│       │   ├── base-node.tsx
│       │   ├── trigger-node.tsx
│       │   ├── action-node.tsx
│       │   └── condition-node.tsx
│       └── edges/                 # Custom edge components
│           ├── default-edge.tsx
│           └── conditional-edge.tsx
├── hooks/
│   ├── use-workflow.ts            # Workflow state management
│   ├── use-nodes.ts               # Node operations
│   └── use-execution.ts           # Execution state
└── stores/
    └── workflow-store.ts          # Zustand store
```

## React Flow Setup

### Basic Configuration

```tsx
// components/workflow-editor/canvas.tsx

import { useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { nodeTypes } from './nodes';
import { edgeTypes } from './edges';

interface CanvasProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  onSave: (nodes: Node[], edges: Edge[]) => void;
}

export function Canvas({ initialNodes, initialEdges, onSave }: CanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      snapToGrid
      snapGrid={[15, 15]}
      defaultEdgeOptions={{
        type: 'smoothstep',
        animated: true,
      }}
    >
      <Background gap={15} size={1} />
      <Controls />
      <MiniMap />
      <Panel position="top-right">
        <button onClick={() => onSave(nodes, edges)}>Save</button>
      </Panel>
    </ReactFlow>
  );
}
```

## Custom Nodes

### Base Node Component

```tsx
// components/workflow-editor/nodes/base-node.tsx

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';

interface BaseNodeData {
  label: string;
  icon: string;
  config: Record<string, unknown>;
  status?: 'idle' | 'running' | 'success' | 'error';
}

export const BaseNode = memo(({ data, selected }: NodeProps<BaseNodeData>) => {
  const Icon = Icons[data.icon as keyof typeof Icons] || Icons.Box;

  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg border-2 bg-white shadow-sm min-w-[180px]',
        'transition-all duration-200',
        selected && 'border-blue-500 shadow-md',
        !selected && 'border-gray-200',
        data.status === 'running' && 'border-yellow-500 animate-pulse',
        data.status === 'success' && 'border-green-500',
        data.status === 'error' && 'border-red-500'
      )}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />

      {/* Content */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md bg-gray-100">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <p className="font-medium text-sm text-gray-900">{data.label}</p>
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />
    </div>
  );
});

BaseNode.displayName = 'BaseNode';
```

### Trigger Node

```tsx
// components/workflow-editor/nodes/trigger-node.tsx

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Play, Clock, Webhook, Globe } from 'lucide-react';

const triggerIcons = {
  manual: Play,
  cron: Clock,
  webhook: Webhook,
  http: Globe,
};

interface TriggerNodeData {
  label: string;
  triggerType: keyof typeof triggerIcons;
  config: Record<string, unknown>;
}

export const TriggerNode = memo(({ data, selected }: NodeProps<TriggerNodeData>) => {
  const Icon = triggerIcons[data.triggerType] || Play;

  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg border-2 bg-gradient-to-br from-green-50 to-green-100',
        'min-w-[180px]',
        selected ? 'border-green-500 shadow-md' : 'border-green-300'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md bg-green-200">
          <Icon className="w-5 h-5 text-green-700" />
        </div>
        <div>
          <p className="text-xs text-green-600 font-medium">Trigger</p>
          <p className="font-medium text-sm text-gray-900">{data.label}</p>
        </div>
      </div>

      {/* Only output handle for triggers */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-green-500 border-2 border-white"
      />
    </div>
  );
});

TriggerNode.displayName = 'TriggerNode';
```

### Condition Node

```tsx
// components/workflow-editor/nodes/condition-node.tsx

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GitBranch } from 'lucide-react';

interface ConditionNodeData {
  label: string;
  condition: string;
}

export const ConditionNode = memo(({ data, selected }: NodeProps<ConditionNodeData>) => {
  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg border-2 bg-gradient-to-br from-purple-50 to-purple-100',
        'min-w-[200px]',
        selected ? 'border-purple-500 shadow-md' : 'border-purple-300'
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-purple-400 border-2 border-white"
      />

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md bg-purple-200">
          <GitBranch className="w-5 h-5 text-purple-700" />
        </div>
        <div>
          <p className="text-xs text-purple-600 font-medium">Condition</p>
          <p className="font-medium text-sm text-gray-900">{data.label}</p>
        </div>
      </div>

      {/* True output (right) */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="w-3 h-3 bg-green-500 border-2 border-white"
        style={{ top: '50%' }}
      />

      {/* False output (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="w-3 h-3 bg-red-500 border-2 border-white"
      />
    </div>
  );
});

ConditionNode.displayName = 'ConditionNode';
```

### Register Node Types

```tsx
// components/workflow-editor/nodes/index.ts

import { BaseNode } from './base-node';
import { TriggerNode } from './trigger-node';
import { ConditionNode } from './condition-node';

export const nodeTypes = {
  default: BaseNode,
  trigger: TriggerNode,
  condition: ConditionNode,
  // Add more node types as needed
};
```

## Node Panel (Library)

```tsx
// components/workflow-editor/node-panel.tsx

import { DragEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

export function NodePanel() {
  const { data: nodeDefinitions } = useQuery({
    queryKey: ['nodes'],
    queryFn: () => fetch('/api/v1/nodes').then(r => r.json()),
  });

  const onDragStart = (event: DragEvent, nodeType: string, nodeData: any) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: nodeType,
      data: nodeData,
    }));
    event.dataTransfer.effectAllowed = 'move';
  };

  const categories = groupBy(nodeDefinitions?.data || [], 'category');

  return (
    <div className="w-64 border-r bg-gray-50 flex flex-col">
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search nodes..." className="pl-10" />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {Object.entries(categories).map(([category, nodes]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                {category}
              </h3>
              <div className="space-y-2">
                {nodes.map((node: any) => (
                  <div
                    key={node.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, node.type, {
                      label: node.name,
                      icon: node.icon,
                      config: {},
                    })}
                    className="flex items-center gap-3 p-3 bg-white rounded-lg border cursor-grab hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <div className="p-1.5 rounded bg-gray-100">
                      <Icon name={node.icon} className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{node.name}</p>
                      <p className="text-xs text-gray-500">{node.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
```

## Properties Panel

```tsx
// components/workflow-editor/properties-panel.tsx

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWorkflowStore } from '@/stores/workflow-store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

export function PropertiesPanel() {
  const selectedNode = useWorkflowStore((s) => s.selectedNode);
  const updateNode = useWorkflowStore((s) => s.updateNode);
  const nodeDefinition = useWorkflowStore((s) => s.getNodeDefinition(selectedNode?.type));

  const form = useForm({
    resolver: zodResolver(nodeDefinition?.schema),
    defaultValues: selectedNode?.data.config,
  });

  useEffect(() => {
    if (selectedNode) {
      form.reset(selectedNode.data.config);
    }
  }, [selectedNode?.id]);

  const onSubmit = (values: any) => {
    if (selectedNode) {
      updateNode(selectedNode.id, { config: values });
    }
  };

  if (!selectedNode) {
    return (
      <div className="w-80 border-l p-4 flex items-center justify-center text-gray-500">
        Select a node to configure
      </div>
    );
  }

  return (
    <div className="w-80 border-l bg-white flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-semibold">{selectedNode.data.label}</h2>
        <p className="text-sm text-gray-500">{nodeDefinition?.description}</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          {nodeDefinition?.inputs.map((input: any) => (
            <div key={input.name}>
              <Label htmlFor={input.name}>{input.label}</Label>
              {renderInput(input, form)}
              {form.formState.errors[input.name] && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors[input.name]?.message}
                </p>
              )}
            </div>
          ))}
        </div>

        <button type="submit" className="mt-4 w-full btn btn-primary">
          Apply Changes
        </button>
      </form>
    </div>
  );
}

function renderInput(input: InputDefinition, form: any) {
  switch (input.type) {
    case 'string':
      return (
        <Input
          {...form.register(input.name)}
          placeholder={input.placeholder}
        />
      );

    case 'select':
      return (
        <Select
          {...form.register(input.name)}
          options={input.options}
        />
      );

    case 'json':
      return (
        <CodeEditor
          {...form.register(input.name)}
          language="json"
        />
      );

    case 'keyValue':
      return (
        <KeyValueEditor
          value={form.watch(input.name) || []}
          onChange={(v) => form.setValue(input.name, v)}
        />
      );

    default:
      return <Input {...form.register(input.name)} />;
  }
}
```

## State Management (Zustand)

```typescript
// stores/workflow-store.ts

import { create } from 'zustand';
import { Node, Edge, applyNodeChanges, applyEdgeChanges } from 'reactflow';

interface WorkflowState {
  // Data
  workflow: Workflow | null;
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;

  // Computed
  selectedNode: Node | null;
  isDirty: boolean;

  // Actions
  setWorkflow: (workflow: Workflow) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  addNode: (node: Node) => void;
  updateNode: (id: string, data: Partial<Node['data']>) => void;
  deleteNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  save: () => Promise<void>;
  reset: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflow: null,
  nodes: [],
  edges: [],
  selectedNodeId: null,
  isDirty: false,

  get selectedNode() {
    const { nodes, selectedNodeId } = get();
    return nodes.find(n => n.id === selectedNodeId) || null;
  },

  setWorkflow: (workflow) => {
    set({
      workflow,
      nodes: workflow.graph.nodes,
      edges: workflow.graph.edges,
      isDirty: false,
    });
  },

  setNodes: (nodes) => set({ nodes, isDirty: true }),
  setEdges: (edges) => set({ edges, isDirty: true }),

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
      isDirty: true,
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
      isDirty: true,
    });
  },

  addNode: (node) => {
    set({
      nodes: [...get().nodes, node],
      isDirty: true,
    });
  },

  updateNode: (id, data) => {
    set({
      nodes: get().nodes.map(n =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n
      ),
      isDirty: true,
    });
  },

  deleteNode: (id) => {
    set({
      nodes: get().nodes.filter(n => n.id !== id),
      edges: get().edges.filter(e => e.source !== id && e.target !== id),
      selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
      isDirty: true,
    });
  },

  selectNode: (id) => set({ selectedNodeId: id }),

  save: async () => {
    const { workflow, nodes, edges } = get();
    if (!workflow) return;

    await fetch(`/api/v1/workflows/${workflow.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        graph: { nodes, edges },
      }),
    });

    set({ isDirty: false });
  },

  reset: () => {
    const { workflow } = get();
    if (workflow) {
      set({
        nodes: workflow.graph.nodes,
        edges: workflow.graph.edges,
        isDirty: false,
      });
    }
  },
}));
```

## Keyboard Shortcuts

```tsx
// hooks/use-keyboard-shortcuts.ts

import { useEffect } from 'react';
import { useWorkflowStore } from '@/stores/workflow-store';

export function useKeyboardShortcuts() {
  const { selectedNodeId, deleteNode, save, reset, isDirty } = useWorkflowStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected node
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        e.preventDefault();
        deleteNode(selectedNodeId);
      }

      // Save (Cmd/Ctrl + S)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        save();
      }

      // Undo (Cmd/Ctrl + Z)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && isDirty) {
        e.preventDefault();
        reset();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, deleteNode, save, reset, isDirty]);
}
```

## Validation

```typescript
// lib/workflow-validator.ts

import { Node, Edge } from 'reactflow';

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  nodeId?: string;
  field?: string;
  message: string;
}

export function validateWorkflow(nodes: Node[], edges: Edge[]): ValidationResult {
  const errors: ValidationError[] = [];

  // Must have at least one trigger
  const triggers = nodes.filter(n => n.type === 'trigger');
  if (triggers.length === 0) {
    errors.push({ message: 'Workflow must have at least one trigger node' });
  }

  // All nodes (except triggers) must have at least one input
  const nonTriggers = nodes.filter(n => n.type !== 'trigger');
  for (const node of nonTriggers) {
    const hasInput = edges.some(e => e.target === node.id);
    if (!hasInput) {
      errors.push({
        nodeId: node.id,
        message: `Node "${node.data.label}" has no input connection`,
      });
    }
  }

  // Check for cycles
  if (hasCycle(nodes, edges)) {
    errors.push({ message: 'Workflow contains a cycle' });
  }

  // Validate node configurations
  for (const node of nodes) {
    const nodeErrors = validateNodeConfig(node);
    errors.push(...nodeErrors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function hasCycle(nodes: Node[], edges: Edge[]): boolean {
  // Implementation of cycle detection
  // ...
}

function validateNodeConfig(node: Node): ValidationError[] {
  // Validate based on node type schema
  // ...
}
```

## Best Practices

1. **Performance** - Memoize custom node components
2. **Accessibility** - Add ARIA labels to interactive elements
3. **Validation** - Validate before save
4. **Auto-save** - Debounced auto-save for better UX
5. **Undo/Redo** - Implement history stack
6. **Snap to grid** - Better alignment
7. **Minimap** - For large workflows
8. **Zoom controls** - Fit to view, zoom in/out
