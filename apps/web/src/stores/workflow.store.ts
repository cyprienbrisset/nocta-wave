import { create } from 'zustand';
import {
  type Node,
  type Edge,
  type Connection,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';

// History entry for undo/redo
interface HistoryEntry {
  nodes: WorkflowNode[];
  edges: Edge[];
  timestamp: number;
  action: string;
}

// Clipboard for copy/paste
interface ClipboardData {
  nodes: WorkflowNode[];
  edges: Edge[];
}

// Breakpoint for debugging
export interface Breakpoint {
  nodeId: string;
  enabled: boolean;
  condition?: string;
}

// Debug state
export interface DebugState {
  isDebugging: boolean;
  isPaused: boolean;
  currentNodeId: string | null;
  breakpoints: Breakpoint[];
  stepMode: 'continue' | 'step-over' | 'step-into';
  executionStack: string[];
  nodeData: Record<string, { input: any; output: any; error?: string }>;
}

// Node group for sub-workflows
export interface NodeGroup {
  id: string;
  label: string;
  nodeIds: string[];
  color: string;
  collapsed: boolean;
  position?: { x: number; y: number };
}

export interface WorkflowNode extends Node {
  data: {
    label: string;
    nodeType: string;
    config?: Record<string, any>;
    credentialId?: string;
    description?: string;
    outputs?: any[];
    groupId?: string;
  };
  parentId?: string;
}

interface WorkflowState {
  nodes: WorkflowNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  selectedNodeIds: string[]; // Multi-selection
  isDirty: boolean;

  // History for undo/redo
  history: HistoryEntry[];
  historyIndex: number;
  maxHistorySize: number;

  // Clipboard
  clipboard: ClipboardData | null;

  // Node groups
  groups: NodeGroup[];

  // Debug state
  debug: DebugState;

  // Console logs
  consoleLogs: Array<{
    id: string;
    timestamp: number;
    level: 'info' | 'warn' | 'error' | 'debug';
    nodeId?: string;
    message: string;
    data?: any;
  }>;

  // Actions
  setNodes: (nodes: WorkflowNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: WorkflowNode) => void;
  updateNode: (nodeId: string, data: Partial<WorkflowNode['data']>) => void;
  deleteNode: (nodeId: string) => void;
  deleteSelectedNodes: () => void;
  selectNode: (nodeId: string | null) => void;
  selectNodes: (nodeIds: string[]) => void;
  addToSelection: (nodeId: string) => void;
  resetWorkflow: () => void;
  setIsDirty: (isDirty: boolean) => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  pushHistory: (action: string) => void;

  // Copy/Paste
  copySelectedNodes: () => void;
  cutSelectedNodes: () => void;
  pasteNodes: (position?: { x: number; y: number }) => void;
  duplicateSelectedNodes: () => void;

  // Groups
  createGroup: (label: string, color?: string) => void;
  deleteGroup: (groupId: string) => void;
  toggleGroupCollapse: (groupId: string) => void;
  addNodesToGroup: (groupId: string, nodeIds: string[]) => void;
  removeNodesFromGroup: (nodeIds: string[]) => void;

  // Debug
  setDebugMode: (isDebugging: boolean) => void;
  toggleBreakpoint: (nodeId: string) => void;
  setBreakpointCondition: (nodeId: string, condition: string) => void;
  pauseExecution: () => void;
  resumeExecution: () => void;
  stepOver: () => void;
  stepInto: () => void;
  setCurrentDebugNode: (nodeId: string | null) => void;
  setNodeDebugData: (nodeId: string, data: { input?: any; output?: any; error?: string }) => void;
  clearDebugData: () => void;

  // Console
  addConsoleLog: (log: Omit<WorkflowState['consoleLogs'][0], 'id' | 'timestamp'>) => void;
  clearConsoleLogs: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedNodeIds: [],
  isDirty: false,
  history: [],
  historyIndex: -1,
  maxHistorySize: 50,
  clipboard: null,
  groups: [],
  debug: {
    isDebugging: false,
    isPaused: false,
    currentNodeId: null,
    breakpoints: [],
    stepMode: 'continue',
    executionStack: [],
    nodeData: {},
  },
  consoleLogs: [],

  setNodes: (nodes) => {
    get().pushHistory('Set nodes');
    set({ nodes, isDirty: true });
  },

  setEdges: (edges) => {
    get().pushHistory('Set edges');
    set({ edges, isDirty: true });
  },

  onNodesChange: (changes) => {
    const shouldPushHistory = changes.some(
      (c) => c.type === 'remove' || c.type === 'add'
    );
    if (shouldPushHistory) {
      get().pushHistory('Nodes changed');
    }
    set({
      nodes: applyNodeChanges(changes, get().nodes) as WorkflowNode[],
      isDirty: true,
    });
  },

  onEdgesChange: (changes) => {
    const shouldPushHistory = changes.some(
      (c) => c.type === 'remove' || c.type === 'add'
    );
    if (shouldPushHistory) {
      get().pushHistory('Edges changed');
    }
    set({
      edges: applyEdgeChanges(changes, get().edges),
      isDirty: true,
    });
  },

  onConnect: (connection) => {
    get().pushHistory('Connect nodes');
    set({
      edges: addEdge(connection, get().edges),
      isDirty: true,
    });
  },

  addNode: (node) => {
    get().pushHistory('Add node');
    set({
      nodes: [...get().nodes, node],
      isDirty: true,
    });
  },

  updateNode: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node,
      ),
      isDirty: true,
    });
  },

  deleteNode: (nodeId) => {
    get().pushHistory('Delete node');
    set({
      nodes: get().nodes.filter((node) => node.id !== nodeId),
      edges: get().edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId,
      ),
      selectedNodeId:
        get().selectedNodeId === nodeId ? null : get().selectedNodeId,
      selectedNodeIds: get().selectedNodeIds.filter((id) => id !== nodeId),
      isDirty: true,
    });
  },

  deleteSelectedNodes: () => {
    const { selectedNodeIds, selectedNodeId, nodes, edges } = get();
    const nodesToDelete = selectedNodeIds.length > 0
      ? selectedNodeIds
      : selectedNodeId ? [selectedNodeId] : [];

    if (nodesToDelete.length === 0) return;

    get().pushHistory('Delete selected nodes');
    set({
      nodes: nodes.filter((node) => !nodesToDelete.includes(node.id)),
      edges: edges.filter(
        (edge) => !nodesToDelete.includes(edge.source) && !nodesToDelete.includes(edge.target),
      ),
      selectedNodeId: null,
      selectedNodeIds: [],
      isDirty: true,
    });
  },

  selectNode: (nodeId) => {
    set({
      selectedNodeId: nodeId,
      selectedNodeIds: nodeId ? [nodeId] : [],
    });
  },

  selectNodes: (nodeIds) => {
    set({
      selectedNodeIds: nodeIds,
      selectedNodeId: nodeIds.length === 1 ? nodeIds[0] : null,
    });
  },

  addToSelection: (nodeId) => {
    const { selectedNodeIds } = get();
    if (!selectedNodeIds.includes(nodeId)) {
      set({
        selectedNodeIds: [...selectedNodeIds, nodeId],
        selectedNodeId: null,
      });
    }
  },

  resetWorkflow: () => {
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedNodeIds: [],
      isDirty: false,
      history: [],
      historyIndex: -1,
      groups: [],
      debug: {
        isDebugging: false,
        isPaused: false,
        currentNodeId: null,
        breakpoints: [],
        stepMode: 'continue',
        executionStack: [],
        nodeData: {},
      },
      consoleLogs: [],
    });
  },

  setIsDirty: (isDirty) => set({ isDirty }),

  // Undo/Redo implementation
  pushHistory: (action) => {
    const { nodes, edges, history, historyIndex, maxHistorySize } = get();
    const newEntry: HistoryEntry = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      timestamp: Date.now(),
      action,
    };

    // Remove any future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newEntry);

    // Limit history size
    if (newHistory.length > maxHistorySize) {
      newHistory.shift();
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      if (previousState) {
        set({
          nodes: JSON.parse(JSON.stringify(previousState.nodes)),
          edges: JSON.parse(JSON.stringify(previousState.edges)),
          historyIndex: historyIndex - 1,
          isDirty: true,
        });
      }
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      if (nextState) {
        set({
          nodes: JSON.parse(JSON.stringify(nextState.nodes)),
          edges: JSON.parse(JSON.stringify(nextState.edges)),
          historyIndex: historyIndex + 1,
          isDirty: true,
        });
      }
    }
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  // Copy/Paste implementation
  copySelectedNodes: () => {
    const { nodes, edges, selectedNodeIds, selectedNodeId } = get();
    const nodesToCopy = selectedNodeIds.length > 0
      ? selectedNodeIds
      : selectedNodeId ? [selectedNodeId] : [];

    if (nodesToCopy.length === 0) return;

    const copiedNodes = nodes.filter((n) => nodesToCopy.includes(n.id));
    const copiedEdges = edges.filter(
      (e) => nodesToCopy.includes(e.source) && nodesToCopy.includes(e.target)
    );

    set({
      clipboard: {
        nodes: JSON.parse(JSON.stringify(copiedNodes)),
        edges: JSON.parse(JSON.stringify(copiedEdges)),
      },
    });
  },

  cutSelectedNodes: () => {
    get().copySelectedNodes();
    get().deleteSelectedNodes();
  },

  pasteNodes: (position) => {
    const { clipboard, nodes } = get();
    if (!clipboard || clipboard.nodes.length === 0) return;

    get().pushHistory('Paste nodes');

    const now = Date.now();
    const idMap: Record<string, string> = {};
    const offset = position ? { x: 0, y: 0 } : { x: 50, y: 50 };

    // Calculate offset from original position
    const minX = Math.min(...clipboard.nodes.map((n) => n.position.x));
    const minY = Math.min(...clipboard.nodes.map((n) => n.position.y));

    const newNodes = clipboard.nodes.map((node, i) => {
      const newId = `node-${now}-${i}`;
      idMap[node.id] = newId;
      return {
        ...node,
        id: newId,
        position: position
          ? {
              x: position.x + (node.position.x - minX),
              y: position.y + (node.position.y - minY),
            }
          : {
              x: node.position.x + offset.x,
              y: node.position.y + offset.y,
            },
        data: {
          ...node.data,
          label: `${node.data.label} (copy)`,
        },
        selected: true,
      };
    });

    const newEdges = clipboard.edges
      .filter((edge) => idMap[edge.source] && idMap[edge.target])
      .map((edge, i) => ({
        ...edge,
        id: `edge-${now}-${i}`,
        source: idMap[edge.source]!,
        target: idMap[edge.target]!,
      }));

    set({
      nodes: [
        ...nodes.map((n) => ({ ...n, selected: false })),
        ...newNodes,
      ] as WorkflowNode[],
      edges: [...get().edges, ...newEdges] as Edge[],
      selectedNodeIds: newNodes.map((n) => n.id),
      selectedNodeId: newNodes.length === 1 ? newNodes[0]?.id ?? null : null,
      isDirty: true,
    });
  },

  duplicateSelectedNodes: () => {
    get().copySelectedNodes();
    get().pasteNodes();
  },

  // Groups implementation
  createGroup: (label, color = '#6366f1') => {
    const { selectedNodeIds, selectedNodeId, nodes } = get();
    const nodesToGroup = selectedNodeIds.length > 0
      ? selectedNodeIds
      : selectedNodeId ? [selectedNodeId] : [];

    if (nodesToGroup.length === 0) return;

    const groupId = `group-${Date.now()}`;
    const groupNodes = nodes.filter((n) => nodesToGroup.includes(n.id));
    const minX = Math.min(...groupNodes.map((n) => n.position.x));
    const minY = Math.min(...groupNodes.map((n) => n.position.y));

    const newGroup: NodeGroup = {
      id: groupId,
      label,
      nodeIds: nodesToGroup,
      color,
      collapsed: false,
      position: { x: minX - 20, y: minY - 40 },
    };

    // Update nodes with group reference
    const updatedNodes = nodes.map((node) =>
      nodesToGroup.includes(node.id)
        ? { ...node, data: { ...node.data, groupId } }
        : node
    );

    get().pushHistory('Create group');
    set({
      groups: [...get().groups, newGroup],
      nodes: updatedNodes,
      isDirty: true,
    });
  },

  deleteGroup: (groupId) => {
    const { groups, nodes } = get();
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    // Remove group reference from nodes
    const updatedNodes = nodes.map((node) =>
      node.data.groupId === groupId
        ? { ...node, data: { ...node.data, groupId: undefined } }
        : node
    );

    get().pushHistory('Delete group');
    set({
      groups: groups.filter((g) => g.id !== groupId),
      nodes: updatedNodes,
      isDirty: true,
    });
  },

  toggleGroupCollapse: (groupId) => {
    set({
      groups: get().groups.map((g) =>
        g.id === groupId ? { ...g, collapsed: !g.collapsed } : g
      ),
    });
  },

  addNodesToGroup: (groupId, nodeIds) => {
    const { groups, nodes } = get();
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    const updatedGroup = {
      ...group,
      nodeIds: [...new Set([...group.nodeIds, ...nodeIds])],
    };

    const updatedNodes = nodes.map((node) =>
      nodeIds.includes(node.id)
        ? { ...node, data: { ...node.data, groupId } }
        : node
    );

    set({
      groups: groups.map((g) => (g.id === groupId ? updatedGroup : g)),
      nodes: updatedNodes,
      isDirty: true,
    });
  },

  removeNodesFromGroup: (nodeIds) => {
    const { groups, nodes } = get();

    const updatedGroups = groups.map((g) => ({
      ...g,
      nodeIds: g.nodeIds.filter((id) => !nodeIds.includes(id)),
    })).filter((g) => g.nodeIds.length > 0);

    const updatedNodes = nodes.map((node) =>
      nodeIds.includes(node.id)
        ? { ...node, data: { ...node.data, groupId: undefined } }
        : node
    );

    set({
      groups: updatedGroups,
      nodes: updatedNodes,
      isDirty: true,
    });
  },

  // Debug implementation
  setDebugMode: (isDebugging) => {
    set({
      debug: {
        ...get().debug,
        isDebugging,
        isPaused: false,
        currentNodeId: null,
        nodeData: {},
      },
    });
    if (isDebugging) {
      get().addConsoleLog({
        level: 'info',
        message: 'Debug mode enabled',
      });
    }
  },

  toggleBreakpoint: (nodeId) => {
    const { debug } = get();
    const existingIndex = debug.breakpoints.findIndex((b) => b.nodeId === nodeId);

    let newBreakpoints: Breakpoint[];
    if (existingIndex >= 0) {
      newBreakpoints = debug.breakpoints.filter((b) => b.nodeId !== nodeId);
    } else {
      newBreakpoints = [...debug.breakpoints, { nodeId, enabled: true }];
    }

    set({
      debug: { ...debug, breakpoints: newBreakpoints },
    });
  },

  setBreakpointCondition: (nodeId, condition) => {
    const { debug } = get();
    set({
      debug: {
        ...debug,
        breakpoints: debug.breakpoints.map((b) =>
          b.nodeId === nodeId ? { ...b, condition } : b
        ),
      },
    });
  },

  pauseExecution: () => {
    set({
      debug: { ...get().debug, isPaused: true },
    });
    get().addConsoleLog({
      level: 'info',
      message: 'Execution paused',
    });
  },

  resumeExecution: () => {
    set({
      debug: { ...get().debug, isPaused: false, stepMode: 'continue' },
    });
    get().addConsoleLog({
      level: 'info',
      message: 'Execution resumed',
    });
  },

  stepOver: () => {
    set({
      debug: { ...get().debug, isPaused: false, stepMode: 'step-over' },
    });
  },

  stepInto: () => {
    set({
      debug: { ...get().debug, isPaused: false, stepMode: 'step-into' },
    });
  },

  setCurrentDebugNode: (nodeId) => {
    set({
      debug: { ...get().debug, currentNodeId: nodeId },
    });
  },

  setNodeDebugData: (nodeId, data) => {
    const { debug } = get();
    const existingData = debug.nodeData[nodeId] || { input: undefined, output: undefined };
    set({
      debug: {
        ...debug,
        nodeData: {
          ...debug.nodeData,
          [nodeId]: {
            input: data.input !== undefined ? data.input : existingData.input,
            output: data.output !== undefined ? data.output : existingData.output,
            error: data.error !== undefined ? data.error : existingData.error,
          },
        },
      },
    });

    // Log to console
    if (data.error) {
      get().addConsoleLog({
        level: 'error',
        nodeId,
        message: `Error in node: ${data.error}`,
        data: data.output,
      });
    } else if (data.output) {
      get().addConsoleLog({
        level: 'debug',
        nodeId,
        message: 'Node output',
        data: data.output,
      });
    }
  },

  clearDebugData: () => {
    set({
      debug: {
        ...get().debug,
        nodeData: {},
        currentNodeId: null,
        executionStack: [],
      },
    });
  },

  // Console implementation
  addConsoleLog: (log) => {
    const newLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    set({
      consoleLogs: [...get().consoleLogs, newLog].slice(-500), // Keep last 500 logs
    });
  },

  clearConsoleLogs: () => {
    set({ consoleLogs: [] });
  },
}));
