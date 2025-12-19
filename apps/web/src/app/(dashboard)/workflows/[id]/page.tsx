'use client';

import { useState, useEffect, useCallback, DragEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  SelectionMode,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Save, Play, ArrowLeft, Variable, Workflow, Clock, Bug, Rocket, CheckCircle2, Terminal, Eye, PanelRight, PanelRightClose, BookOpen, X, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { workflowsApi, WorkflowGraph } from '@/lib/api/workflows';
import { executionsApi } from '@/lib/api/executions';
import { useWorkflowStore } from '@/stores/workflow.store';
import { toast } from '@/components/ui/use-toast';
import { LibraryPanel } from '@/components/workflow-editor/library-panel';
import { NodeEditModal } from '@/components/workflow-editor/node-edit-modal';
import { WorkflowVariablesPanel, WorkflowVariable } from '@/components/workflow-editor/workflow-variables-panel';
import { ExecutionPanel } from '@/components/workflow-editor/execution-panel';
import { nodeTypes } from '@/components/workflow-editor/custom-node';
import { nodesApi, NodeMetadata, NodeDefinition } from '@/lib/api/nodes';
import { cn } from '@/lib/utils';
import { EditorToolbar } from '@/components/workflow-editor/editor-toolbar';
import { DebugToolbar } from '@/components/workflow-editor/debug-toolbar';
import { DebugConsole } from '@/components/workflow-editor/debug-console';
import { DataInspector } from '@/components/workflow-editor/data-inspector';
import { NodeGroupOverlay } from '@/components/workflow-editor/node-group';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { BranchPanel } from '@/components/branches/branch-panel';
import { branchesApi } from '@/lib/api/branches';
import Link from 'next/link';

// Panel layout persistence
const PANEL_LAYOUT_KEY = 'ws-flows-editor-layout-v4';

interface PanelLayout {
  showConsole: boolean;
  showExecution: boolean;
  showInspector: boolean;
  showLibrary: boolean;
  showBranches: boolean;
  activeBottomTab: 'console' | 'execution';
}

const defaultLayout: PanelLayout = {
  showConsole: false,
  showExecution: false,
  showInspector: false,
  showLibrary: true,
  showBranches: false,
  activeBottomTab: 'console',
};

function loadLayout(): PanelLayout {
  if (typeof window === 'undefined') return defaultLayout;
  try {
    const saved = localStorage.getItem(PANEL_LAYOUT_KEY);
    return saved ? { ...defaultLayout, ...JSON.parse(saved) } : defaultLayout;
  } catch {
    return defaultLayout;
  }
}

function saveLayout(layout: Partial<PanelLayout>) {
  if (typeof window === 'undefined') return;
  try {
    const current = loadLayout();
    localStorage.setItem(PANEL_LAYOUT_KEY, JSON.stringify({ ...current, ...layout }));
  } catch {
    // Ignore
  }
}

export default function WorkflowEditorPage() {
  return (
    <ReactFlowProvider>
      <WorkflowEditorContent />
    </ReactFlowProvider>
  );
}

function WorkflowEditorContent() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const reactFlowInstance = useReactFlow();
  const workflowId = params.id as string;
  const [isVariablesPanelOpen, setIsVariablesPanelOpen] = useState(false);
  const [workflowVariables, setWorkflowVariables] = useState<WorkflowVariable[]>([]);
  const [isNodeEditModalOpen, setIsNodeEditModalOpen] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [currentBranchId, setCurrentBranchId] = useState<string | undefined>(undefined);
  const [currentBranchName, setCurrentBranchName] = useState<string | null>(null);

  // Panel state from localStorage
  const [layout, setLayout] = useState<PanelLayout>(defaultLayout);
  const [showMinimap, setShowMinimap] = useState(true);
  const [inspectedNodeId, setInspectedNodeId] = useState<string | null>(null);

  // Load layout on mount
  useEffect(() => {
    setLayout(loadLayout());
  }, []);

  // Computed panel visibility
  const hasBottomPanel = layout.showConsole || layout.showExecution;
  const hasRightPanel = layout.showLibrary || layout.showInspector;
  const hasLeftPanel = layout.showBranches;

  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    deleteNode,
    selectNode,
    selectedNodeId,
    isDirty,
    setIsDirty,
    resetWorkflow,
    groups,
    undo,
    redo,
    copySelectedNodes,
    cutSelectedNodes,
    pasteNodes,
    duplicateSelectedNodes,
    deleteSelectedNodes,
    selectNodes,
  } = useWorkflowStore();

  const { data: workflow, isLoading } = useQuery({
    queryKey: ['workflow', workflowId],
    queryFn: () => workflowsApi.get(workflowId),
  });

  // Charger le graphe du workflow
  useEffect(() => {
    if (workflow?.graph) {
      setNodes(workflow.graph.nodes as any);
      setEdges(workflow.graph.edges);
      setWorkflowVariables((workflow.graph as any).variables || []);
      setIsDirty(false);
    }
    return () => resetWorkflow();
  }, [workflow, setNodes, setEdges, setIsDirty, resetWorkflow]);

  // Mutation pour sauvegarder le workflow principal (quand pas sur une branche)
  const saveWorkflowMutation = useMutation({
    mutationFn: (data: { name?: string; graph: WorkflowGraph }) =>
      workflowsApi.update(workflowId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', workflowId] });
      setIsDirty(false);
      toast({ title: 'Workflow enregistré' });
    },
    onError: (error) => {
      toast({
        title: 'Erreur lors de l\'enregistrement',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
        variant: 'destructive',
      });
    },
  });

  // Mutation pour sauvegarder sur une branche
  const saveBranchMutation = useMutation({
    mutationFn: (data: { branchId: string; graph: Record<string, unknown>; settings?: Record<string, unknown>; commitMessage?: string }) =>
      branchesApi.updateBranchGraph(data.branchId, data.graph, data.settings, data.commitMessage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches', workflowId] });
      setIsDirty(false);
      toast({ title: 'Branche enregistrée' });
    },
    onError: (error) => {
      toast({
        title: 'Erreur lors de l\'enregistrement',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
        variant: 'destructive',
      });
    },
  });

  const saveMutation = {
    isPending: saveWorkflowMutation.isPending || saveBranchMutation.isPending
  };

  const triggerMutation = useMutation({
    mutationFn: () => executionsApi.trigger(workflowId),
    onSuccess: (execution) => {
      toast({ title: 'Workflow lancé' });
      router.push(`/executions/${execution.id}`);
    },
  });

  const deployMutation = useMutation({
    mutationFn: () => workflowsApi.activate(workflowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', workflowId] });
      toast({ title: 'Workflow déployé', description: 'Le workflow est maintenant actif' });
    },
    onError: (error) => {
      toast({
        title: 'Erreur lors du déploiement',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
        variant: 'destructive',
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: () => workflowsApi.deactivate(workflowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', workflowId] });
      toast({ title: 'Workflow désactivé' });
    },
  });

  const handleSave = useCallback(() => {
    const graphData = {
      nodes: nodes as any,
      edges: edges as any,
      viewport: { x: 0, y: 0, zoom: 1 },
      variables: workflowVariables,
    };

    if (currentBranchId) {
      // Save to branch
      saveBranchMutation.mutate({
        branchId: currentBranchId,
        graph: graphData,
      });
    } else {
      // Save to main workflow
      saveWorkflowMutation.mutate({ graph: graphData as any });
    }
  }, [nodes, edges, workflowVariables, currentBranchId, saveBranchMutation, saveWorkflowMutation]);

  const handleVariablesChange = useCallback((variables: WorkflowVariable[]) => {
    setWorkflowVariables(variables);
    setIsDirty(true);
  }, [setIsDirty]);

  const handleNameChange = (name: string) => {
    // Name changes always apply to the main workflow, not branches
    saveWorkflowMutation.mutate({ name, graph: workflow?.graph as any });
  };

  const handleAddNode = useCallback(async (nodeMetadata: NodeMetadata | NodeDefinition) => {
    const lastNode = nodes[nodes.length - 1];
    const position = lastNode
      ? { x: lastNode.position.x + 280, y: lastNode.position.y }
      : { x: 350, y: 150 };

    let outputs = 'outputs' in nodeMetadata ? nodeMetadata.outputs : undefined;
    if (!outputs) {
      try {
        const fullDef = await nodesApi.getByType(nodeMetadata.type);
        outputs = fullDef.outputs;
      } catch {
        outputs = [{ name: 'output', type: 'object' }];
      }
    }

    const newNode = {
      id: `node-${Date.now()}`,
      type: 'custom',
      position,
      data: {
        label: nodeMetadata.name,
        nodeType: nodeMetadata.type,
        description: nodeMetadata.description,
        config: {},
        outputs,
      },
    };

    addNode(newNode);
    selectNode(newNode.id);
    toast({ title: `Node "${nodeMetadata.name}" ajouté` });
  }, [nodes, addNode, selectNode]);

  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    selectNode(node.id);
  }, [selectNode]);

  const handleNodeDoubleClick: NodeMouseHandler = useCallback((_event, node) => {
    setEditingNodeId(node.id);
    setIsNodeEditModalOpen(true);
  }, []);

  const handlePaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    deleteNode(nodeId);
    toast({ title: 'Node supprimé' });
  }, [deleteNode]);

  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    async (event: DragEvent) => {
      event.preventDefault();

      const nodeDataStr = event.dataTransfer.getData('application/json');
      if (!nodeDataStr) return;

      try {
        const nodeMetadata: NodeMetadata = JSON.parse(nodeDataStr);
        const reactFlowBounds = event.currentTarget.getBoundingClientRect();
        const position = {
          x: event.clientX - reactFlowBounds.left - 100,
          y: event.clientY - reactFlowBounds.top - 30,
        };

        let outputs;
        try {
          const fullDef = await nodesApi.getByType(nodeMetadata.type);
          outputs = fullDef.outputs;
        } catch {
          outputs = [{ name: 'output', type: 'object' }];
        }

        const newNode = {
          id: `node-${Date.now()}`,
          type: 'custom',
          position,
          data: {
            label: nodeMetadata.name,
            nodeType: nodeMetadata.type,
            description: nodeMetadata.description,
            config: {},
            outputs,
          },
        };

        addNode(newNode);
        selectNode(newNode.id);
        toast({ title: `Node "${nodeMetadata.name}" ajouté` });
      } catch (e) {
        console.error('Erreur lors du drop:', e);
      }
    },
    [addNode, selectNode]
  );

  const handleNodeHighlight = useCallback((nodeId: string | null) => {
    setHighlightedNodeId(nodeId);
  }, []);

  const handleFitView = useCallback(() => {
    reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
  }, [reactFlowInstance]);

  const handleZoomIn = useCallback(() => {
    reactFlowInstance.zoomIn({ duration: 200 });
  }, [reactFlowInstance]);

  const handleZoomOut = useCallback(() => {
    reactFlowInstance.zoomOut({ duration: 200 });
  }, [reactFlowInstance]);

  const handleInspectNode = useCallback((nodeId: string) => {
    setInspectedNodeId(nodeId);
    setLayout(prev => {
      const newLayout = { ...prev, showInspector: true };
      saveLayout(newLayout);
      return newLayout;
    });
  }, []);

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: any) => {
    event.preventDefault();
    handleInspectNode(node.id);
  }, [handleInspectNode]);

  // Toggle panel functions with persistence
  const togglePanel = useCallback((panel: keyof Pick<PanelLayout, 'showConsole' | 'showExecution' | 'showInspector' | 'showLibrary' | 'showBranches'>) => {
    setLayout(prev => {
      const newLayout = { ...prev, [panel]: !prev[panel] };

      // Auto-switch activeBottomTab when toggling bottom panels
      if (panel === 'showConsole' && newLayout.showConsole) {
        newLayout.activeBottomTab = 'console';
      } else if (panel === 'showExecution' && newLayout.showExecution) {
        newLayout.activeBottomTab = 'execution';
      } else if (panel === 'showConsole' && !newLayout.showConsole && newLayout.showExecution) {
        newLayout.activeBottomTab = 'execution';
      } else if (panel === 'showExecution' && !newLayout.showExecution && newLayout.showConsole) {
        newLayout.activeBottomTab = 'console';
      }

      saveLayout(newLayout);
      return newLayout;
    });
  }, []);

  const setActiveBottomTab = useCallback((tab: 'console' | 'execution') => {
    setLayout(prev => {
      const newLayout = { ...prev, activeBottomTab: tab };
      saveLayout(newLayout);
      return newLayout;
    });
  }, []);

  useKeyboardShortcuts({
    onSave: handleSave,
    onUndo: undo,
    onRedo: redo,
    onCopy: copySelectedNodes,
    onCut: cutSelectedNodes,
    onPaste: () => pasteNodes(),
    onDuplicate: duplicateSelectedNodes,
    onDelete: deleteSelectedNodes,
    onSelectAll: () => selectNodes(nodes.map((n) => n.id)),
    onFitView: handleFitView,
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    onEscape: () => selectNode(null),
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Chargement du workflow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#0f0f1a]">
      {/* Top toolbar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-800 bg-[#1a1a2e] px-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-9 w-9 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/20 p-1.5">
              <Workflow className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <Input
                className="h-7 w-40 border-none bg-transparent p-0 text-sm font-semibold text-white focus-visible:ring-0"
                defaultValue={workflow?.name}
                onBlur={(e) => {
                  if (e.target.value !== workflow?.name) {
                    handleNameChange(e.target.value);
                  }
                }}
              />
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>
                  Modifié {workflow?.updatedAt ? new Date(workflow.updatedAt).toLocaleDateString('fr-FR') : ''}
                </span>
                {currentBranchName && (
                  <span className="flex items-center gap-1 rounded bg-blue-900/50 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
                    <GitBranch className="h-3 w-3" />
                    {currentBranchName}
                  </span>
                )}
                {isDirty && (
                  <span className="rounded bg-amber-900/50 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                    Non enregistré
                  </span>
                )}
                {workflow?.status === 'ACTIVE' && (
                  <span className="flex items-center gap-1 rounded bg-green-900/50 px-1.5 py-0.5 text-[10px] font-medium text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Déployé
                  </span>
                )}
                {workflow?.status === 'DRAFT' && (
                  <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
                    Brouillon
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DebugToolbar />

          <div className="h-6 w-px bg-gray-700" />

          {/* Panel toggles */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => togglePanel('showBranches')}
            className={cn(
              "h-8 rounded-lg text-xs border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700 hover:text-white",
              layout.showBranches && "bg-primary/20 border-primary/50 text-primary"
            )}
          >
            <GitBranch className="mr-1.5 h-3.5 w-3.5" />
            Branches
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => togglePanel('showConsole')}
            className={cn(
              "h-8 rounded-lg text-xs border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700 hover:text-white",
              layout.showConsole && "bg-primary/20 border-primary/50 text-primary"
            )}
          >
            <Terminal className="mr-1.5 h-3.5 w-3.5" />
            Console
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => togglePanel('showExecution')}
            className={cn(
              "h-8 rounded-lg text-xs border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700 hover:text-white",
              layout.showExecution && "bg-primary/20 border-primary/50 text-primary"
            )}
          >
            <Bug className="mr-1.5 h-3.5 w-3.5" />
            Test
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => togglePanel('showInspector')}
            className={cn(
              "h-8 rounded-lg text-xs border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700 hover:text-white",
              layout.showInspector && "bg-primary/20 border-primary/50 text-primary"
            )}
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            Inspecteur
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => togglePanel('showLibrary')}
            className={cn(
              "h-8 rounded-lg text-xs border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700 hover:text-white",
              layout.showLibrary && "bg-primary/20 border-primary/50 text-primary"
            )}
          >
            {layout.showLibrary ? <PanelRightClose className="mr-1.5 h-3.5 w-3.5" /> : <PanelRight className="mr-1.5 h-3.5 w-3.5" />}
            Nodes
          </Button>

          <div className="h-6 w-px bg-gray-700" />

          <Link href="/docs">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg text-xs border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <BookOpen className="mr-1.5 h-3.5 w-3.5" />
              Docs
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsVariablesPanelOpen(true)}
            className="h-8 rounded-lg text-xs border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            <Variable className="mr-1.5 h-3.5 w-3.5" />
            Variables
            {workflowVariables.length > 0 && (
              <span className="ml-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                {workflowVariables.length}
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={saveMutation.isPending || !isDirty}
            className="h-8 rounded-lg text-xs border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700 hover:text-white disabled:opacity-50"
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
          <Button
            size="sm"
            onClick={() => triggerMutation.mutate()}
            disabled={triggerMutation.isPending}
            className="h-8 rounded-lg text-xs bg-green-600 hover:bg-green-700"
          >
            <Play className="mr-1.5 h-3.5 w-3.5" />
            {triggerMutation.isPending ? 'Lancement...' : 'Exécuter'}
          </Button>

          {workflow?.status === 'ACTIVE' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => deactivateMutation.mutate()}
              disabled={deactivateMutation.isPending}
              className="h-8 rounded-lg text-xs border-orange-700 bg-orange-900/30 text-orange-400 hover:bg-orange-900/50"
            >
              <Rocket className="mr-1.5 h-3.5 w-3.5" />
              {deactivateMutation.isPending ? 'Désactivation...' : 'Désactiver'}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => deployMutation.mutate()}
              disabled={deployMutation.isPending || isDirty}
              className="h-8 rounded-lg text-xs bg-primary hover:bg-primary/90"
              title={isDirty ? 'Enregistrez d\'abord le workflow' : 'Déployer le workflow'}
            >
              <Rocket className="mr-1.5 h-3.5 w-3.5" />
              {deployMutation.isPending ? 'Déploiement...' : 'Déployer'}
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left panel - Branches */}
        {hasLeftPanel && (
          <div className="w-72 shrink-0 flex flex-col bg-[#1a1a2e] border-r border-gray-800">
            <div className="flex h-9 shrink-0 items-center justify-between border-b border-gray-800 px-3">
              <div className="flex items-center gap-2 text-white">
                <GitBranch className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Branches</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-gray-400 hover:text-white"
                onClick={() => togglePanel('showBranches')}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto min-h-0">
              <BranchPanel
                workflowId={workflowId}
                currentBranchId={currentBranchId}
                onBranchChange={async (branch) => {
                  setCurrentBranchId(branch.id);
                  setCurrentBranchName(branch.name);
                  setIsDirty(false); // Reset dirty state when switching branches
                  // Fetch full branch data including graph
                  try {
                    const fullBranch = await branchesApi.getBranch(branch.id);
                    if (fullBranch.graph) {
                      const branchGraph = fullBranch.graph as { nodes?: unknown[]; edges?: unknown[]; variables?: WorkflowVariable[] };
                      if (branchGraph.nodes) setNodes(branchGraph.nodes as any);
                      if (branchGraph.edges) setEdges(branchGraph.edges as any);
                      if (branchGraph.variables) setWorkflowVariables(branchGraph.variables);
                    }
                    toast({ title: `Branche "${branch.name}" chargée` });
                  } catch (error) {
                    console.error('Failed to load branch data:', error);
                    toast({ title: 'Erreur', description: 'Impossible de charger les données de la branche', variant: 'destructive' });
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Center: Canvas + Bottom panels */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Canvas */}
          <div
            className={cn("flex-1 min-h-0", hasBottomPanel && "h-[calc(100%-200px)]")}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
                <ReactFlow
                  nodes={nodes.map((node) => ({
                    ...node,
                    className: cn(
                      highlightedNodeId === node.id && 'ring-2 ring-blue-500 ring-offset-2'
                    ),
                  }))}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onNodeClick={handleNodeClick}
                  onNodeDoubleClick={handleNodeDoubleClick}
                  onNodeContextMenu={handleNodeContextMenu}
                  onPaneClick={handlePaneClick}
                  nodeTypes={nodeTypes}
                  fitView
                  snapToGrid
                  snapGrid={[16, 16]}
                  selectionOnDrag
                  selectionMode={SelectionMode.Partial}
                  multiSelectionKeyCode="Shift"
                  defaultEdgeOptions={{
                    type: 'smoothstep',
                    animated: true,
                    style: { stroke: '#4b5563', strokeWidth: 2 },
                  }}
                  style={{ backgroundColor: '#0f0f1a' }}
                >
                  <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#2a2a3e" />
                  <Controls className="rounded-lg bg-[#1a1a2e] border-gray-800 [&>button]:bg-[#1a1a2e] [&>button]:border-gray-700 [&>button]:text-gray-400 [&>button:hover]:bg-gray-800 [&>button:hover]:text-white" />

                  {showMinimap && (
                    <MiniMap
                      className="rounded-lg !bg-[#1a1a2e] border border-gray-800"
                      maskColor="rgba(15, 15, 26, 0.8)"
                      nodeColor={(node) => {
                        const nodeType = (node.data as { nodeType?: string })?.nodeType || '';
                        const category = nodeType.split('.')[0] || 'utility';
                        const colors: Record<string, string> = {
                          trigger: '#22c55e',
                          http: '#3b82f6',
                          transform: '#a855f7',
                          logic: '#f97316',
                          database: '#06b6d4',
                          integration: '#ec4899',
                          utility: '#6b7280',
                        };
                        return colors[category] || colors.utility || '#6b7280';
                      }}
                    />
                  )}

                  <Panel position="top-left" className="m-2">
                    <EditorToolbar
                      onFitView={handleFitView}
                      onZoomIn={handleZoomIn}
                      onZoomOut={handleZoomOut}
                      showMinimap={showMinimap}
                      onToggleMinimap={() => setShowMinimap(!showMinimap)}
                    />
                  </Panel>

                  {groups.map((group) => (
                    <NodeGroupOverlay key={group.id} group={group} nodes={nodes} />
                  ))}

                  {nodes.length === 0 && (
                    <Panel position="top-center" className="mt-16">
                      <div className="rounded-xl bg-[#1e1e2e] border border-gray-700 p-6 text-center shadow-lg">
                        <div className="mx-auto mb-3 rounded-full bg-primary/20 p-3 w-fit">
                          <Workflow className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-base font-semibold mb-1 text-white">Commencez votre workflow</h3>
                        <p className="text-sm text-gray-400 max-w-xs">
                          Glissez-déposez un node depuis la bibliothèque à droite pour démarrer
                        </p>
                      </div>
                    </Panel>
                  )}
                </ReactFlow>
          </div>

          {/* Bottom panels */}
          {hasBottomPanel && (
            <div className="h-52 shrink-0 flex flex-col bg-[#1a1a2e] border-t border-gray-800">
              {/* Tab header */}
              <div className="flex h-9 shrink-0 items-center justify-between border-b border-gray-800 px-2">
                <div className="flex items-center gap-1">
                  {layout.showConsole && (
                    <button
                      onClick={() => setActiveBottomTab('console')}
                      className={cn(
                        'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                        layout.activeBottomTab === 'console'
                          ? 'bg-gray-700 text-white'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'
                      )}
                    >
                      <Terminal className="h-3.5 w-3.5" />
                      Console
                    </button>
                  )}
                  {layout.showExecution && (
                    <button
                      onClick={() => setActiveBottomTab('execution')}
                      className={cn(
                        'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                        layout.activeBottomTab === 'execution'
                          ? 'bg-gray-700 text-white'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'
                      )}
                    >
                      <Bug className="h-3.5 w-3.5" />
                      Exécution
                    </button>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-gray-400 hover:text-white"
                  onClick={() => {
                    if (layout.activeBottomTab === 'console') {
                      togglePanel('showConsole');
                    } else {
                      togglePanel('showExecution');
                    }
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Panel content */}
              <div className="flex-1 overflow-hidden min-h-0">
                {layout.activeBottomTab === 'console' && layout.showConsole && (
                  <DebugConsole embedded className="h-full" />
                )}
                {layout.activeBottomTab === 'execution' && layout.showExecution && (
                  <ExecutionPanel
                    embedded
                    className="h-full"
                    workflowId={workflowId}
                    nodes={nodes}
                    onNodeHighlight={handleNodeHighlight}
                  />
                )}
                {/* Fallback: show first available panel if activeBottomTab doesn't match */}
                {layout.activeBottomTab === 'console' && !layout.showConsole && layout.showExecution && (
                  <ExecutionPanel
                    embedded
                    className="h-full"
                    workflowId={workflowId}
                    nodes={nodes}
                    onNodeHighlight={handleNodeHighlight}
                  />
                )}
                {layout.activeBottomTab === 'execution' && !layout.showExecution && layout.showConsole && (
                  <DebugConsole embedded className="h-full" />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right panels - fixed width sidebar */}
        {hasRightPanel && (
          <div className="w-72 shrink-0 flex flex-col bg-[#1a1a2e] border-l border-gray-800">
            {/* Library panel */}
            {layout.showLibrary && (
              <div className={cn(
                "flex flex-col overflow-hidden",
                layout.showInspector ? "flex-1 min-h-0" : "h-full"
              )}>
                <div className="flex h-9 shrink-0 items-center justify-between border-b border-gray-800 px-3">
                  <div className="flex items-center gap-2 text-white">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Nodes</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-gray-400 hover:text-white"
                    onClick={() => togglePanel('showLibrary')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex-1 overflow-auto min-h-0">
                  <LibraryPanel
                    onAddNode={handleAddNode}
                    embedded
                    className="h-full"
                  />
                </div>
              </div>
            )}

            {/* Separator between library and inspector */}
            {layout.showLibrary && layout.showInspector && (
              <div className="h-px bg-gray-700 shrink-0" />
            )}

            {/* Inspector panel */}
            {layout.showInspector && (
              <div className={cn(
                "flex flex-col overflow-hidden",
                layout.showLibrary ? "h-[280px] shrink-0" : "h-full"
              )}>
                <div className="flex h-9 shrink-0 items-center justify-between border-b border-gray-800 px-3">
                  <div className="flex items-center gap-2 text-white">
                    <Eye className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Inspecteur</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-gray-400 hover:text-white"
                    onClick={() => togglePanel('showInspector')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex-1 overflow-auto min-h-0">
                  <DataInspector
                    embedded
                    className="h-full"
                    nodeId={inspectedNodeId || selectedNodeId}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <WorkflowVariablesPanel
        isOpen={isVariablesPanelOpen}
        onClose={() => setIsVariablesPanelOpen(false)}
        variables={workflowVariables}
        onChange={handleVariablesChange}
      />

      <NodeEditModal
        nodeId={editingNodeId}
        isOpen={isNodeEditModalOpen}
        onClose={() => {
          setIsNodeEditModalOpen(false);
          setEditingNodeId(null);
        }}
        onDelete={handleDeleteNode}
        workflowVariables={workflowVariables}
      />
    </div>
  );
}
