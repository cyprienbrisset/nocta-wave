'use client';

import { useState, useEffect, useCallback, useRef, DragEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Eye,
  MessageSquare,
  Edit3,
  AlertCircle,
  Workflow,
  Users,
  LogOut,
  BookOpen,
  X,
  PanelRight,
  PanelRightClose,
  Play,
  Terminal,
  Bug,
  Variable,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { nodeTypes } from '@/components/workflow-editor/custom-node';
import { LibraryPanel } from '@/components/workflow-editor/library-panel';
import { NodeEditModal } from '@/components/workflow-editor/node-edit-modal';
import { EditorToolbar } from '@/components/workflow-editor/editor-toolbar';
import { ExecutionPanel } from '@/components/workflow-editor/execution-panel';
import { DebugConsole } from '@/components/workflow-editor/debug-console';
import { DataInspector } from '@/components/workflow-editor/data-inspector';
import { WorkflowVariablesPanel, WorkflowVariable } from '@/components/workflow-editor/workflow-variables-panel';
import {
  collaborationLinksApi,
  CollaborationPermission,
  JoinAsGuestResponse,
} from '@/lib/api/collaboration';
import { nodesApi, NodeMetadata, NodeDefinition } from '@/lib/api/nodes';
import { collaborationSocket } from '@/lib/socket/collaboration-socket';
import { cn } from '@/lib/utils';
import type { WorkflowNode } from '@/stores/workflow.store';
import { CollaboratorCursors, useCursorTracking } from '@/components/collaboration';
import type { CursorPosition } from '@ws-flows/shared';

const permissionLabels: Record<CollaborationPermission, { label: string; icon: typeof Eye }> = {
  VIEW: { label: 'Lecture seule', icon: Eye },
  COMMENT: { label: 'Commentaires', icon: MessageSquare },
  EDIT: { label: 'Édition', icon: Edit3 },
};

interface CollaboratorInfo {
  id: string;
  name: string;
  color: string;
  isGuest?: boolean;
  cursor?: CursorPosition;
}

interface PanelLayout {
  showConsole: boolean;
  showExecution: boolean;
  showInspector: boolean;
  showLibrary: boolean;
  activeBottomTab: 'console' | 'execution';
}

const defaultLayout: PanelLayout = {
  showConsole: false,
  showExecution: false,
  showInspector: false,
  showLibrary: true,
  activeBottomTab: 'execution',
};

export default function GuestEditorPage() {
  return (
    <ReactFlowProvider>
      <GuestEditorContent />
    </ReactFlowProvider>
  );
}

function GuestEditorContent() {
  const params = useParams();
  const router = useRouter();
  const reactFlowInstance = useReactFlow();
  const token = params.token as string;

  const [guestSession, setGuestSession] = useState<JoinAsGuestResponse | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowVariables, setWorkflowVariables] = useState<WorkflowVariable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([]);

  // Panel state
  const [layout, setLayout] = useState<PanelLayout>(defaultLayout);
  const [showMinimap, setShowMinimap] = useState(true);
  const [isVariablesPanelOpen, setIsVariablesPanelOpen] = useState(false);
  const [inspectedNodeId, setInspectedNodeId] = useState<string | null>(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);

  // Editor state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isNodeEditModalOpen, setIsNodeEditModalOpen] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  // Execution state
  const [isRunning, setIsRunning] = useState(false);

  // Track if we're receiving updates from collaboration to avoid broadcast loops
  const isReceivingUpdateRef = useRef(false);
  const broadcastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastBroadcastRef = useRef<string>('');

  // Toggle panel helper
  const togglePanel = useCallback((panel: keyof PanelLayout) => {
    setLayout((prev) => {
      const newLayout = { ...prev };
      if (panel === 'showConsole' || panel === 'showExecution') {
        newLayout[panel] = !prev[panel];
        if (newLayout[panel]) {
          newLayout.activeBottomTab = panel === 'showConsole' ? 'console' : 'execution';
        }
      } else if (panel !== 'activeBottomTab') {
        newLayout[panel] = !prev[panel];
      }
      return newLayout;
    });
  }, []);

  const setActiveBottomTab = useCallback((tab: 'console' | 'execution') => {
    setLayout((prev) => ({ ...prev, activeBottomTab: tab }));
  }, []);

  const hasBottomPanel = layout.showConsole || layout.showExecution;
  const hasRightPanel = layout.showLibrary || layout.showInspector;

  // Load guest session and workflow data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Get guest session from sessionStorage
        const sessionData = sessionStorage.getItem('guestSession');
        if (!sessionData) {
          router.push(`/collaborate/${token}`);
          return;
        }

        const session: JoinAsGuestResponse = JSON.parse(sessionData);
        setGuestSession(session);

        // Load workflow data
        const data = await collaborationLinksApi.getWorkflowForGuest(session.id);
        setWorkflowName(data.workflow.name);

        if (data.workflow.graph) {
          setNodes(data.workflow.graph.nodes || []);
          setEdges(data.workflow.graph.edges || []);
          setWorkflowVariables(data.workflow.graph.variables || []);
        }

        // Set loading to false once we have the workflow data
        setIsLoading(false);

        // Connect to collaboration socket as guest (non-blocking)
        try {
          await collaborationSocket.connectAsGuest(session.id);
          setIsConnected(true);

          // Join the workflow room
          const joinResult = await collaborationSocket.joinWorkflow(session.workflowId);
          if (joinResult?.collaborators) {
            setCollaborators(joinResult.collaborators);
          }
        } catch (socketErr) {
          console.warn('Failed to connect to collaboration socket:', socketErr);
          // Continue without real-time collaboration
        }
      } catch (err) {
        console.error('Failed to load guest editor:', err);
        setError(err instanceof Error ? err.message : 'Impossible de charger le workflow');
        setIsLoading(false);
      }
    };

    loadData();

    return () => {
      collaborationSocket.disconnect();
    };
  }, [token, router]);

  // Socket event listeners
  useEffect(() => {
    if (!isConnected || !guestSession) return;

    const unsubUserJoined = collaborationSocket.onUserJoined(({ collaborator }) => {
      setCollaborators((prev) => {
        if (prev.find((c) => c.id === collaborator.id)) return prev;
        return [...prev, collaborator];
      });
    });

    const unsubUserLeft = collaborationSocket.onUserLeft(({ collaborator }) => {
      setCollaborators((prev) => prev.filter((c) => c.id !== collaborator.id));
    });

    const unsubPresence = collaborationSocket.onPresenceUpdate(({ collaborators: updated }) => {
      setCollaborators(updated);
    });

    const unsubCursor = collaborationSocket.onCursorUpdated(({ userId, position }) => {
      setCollaborators((prev) =>
        prev.map((c) => (c.id === userId ? { ...c, cursor: position } : c))
      );
    });

    // Listen for graph updates from other collaborators
    const unsubGraphUpdate = collaborationSocket.onGraphUpdate(({ nodes: newNodes, edges: newEdges }) => {
      console.log('[Guest] Received graph update:', { nodes: newNodes.length, edges: newEdges.length });
      isReceivingUpdateRef.current = true;
      setNodes(newNodes as Node[]);
      setEdges(newEdges as Edge[]);
      setTimeout(() => {
        isReceivingUpdateRef.current = false;
      }, 150);
    });

    return () => {
      unsubUserJoined();
      unsubUserLeft();
      unsubPresence();
      unsubCursor();
      unsubGraphUpdate();
    };
  }, [isConnected, guestSession]);

  const handleLeave = useCallback(() => {
    collaborationSocket.disconnect();
    sessionStorage.removeItem('guestSession');
    router.push('/');
  }, [router]);

  // Handlers for node/edge changes (only for EDIT permission)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (!guestSession || guestSession.permission !== 'EDIT') return;
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [guestSession]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (!guestSession || guestSession.permission !== 'EDIT') return;
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [guestSession]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!guestSession || guestSession.permission !== 'EDIT') return;
      setEdges((eds) => addEdge(connection, eds));
    },
    [guestSession]
  );

  // Broadcast changes to other collaborators
  useEffect(() => {
    if (!isConnected || !guestSession || guestSession.permission !== 'EDIT') return;
    if (isReceivingUpdateRef.current) return;

    const currentHash = JSON.stringify({ nodes, edges });
    if (currentHash === lastBroadcastRef.current) return;

    if (broadcastTimeoutRef.current) {
      clearTimeout(broadcastTimeoutRef.current);
    }

    broadcastTimeoutRef.current = setTimeout(() => {
      lastBroadcastRef.current = currentHash;
      collaborationSocket.broadcastGraphUpdate(guestSession.workflowId, nodes, edges);
      console.log('[Guest] Broadcasting graph update');
    }, 100);

    return () => {
      if (broadcastTimeoutRef.current) {
        clearTimeout(broadcastTimeoutRef.current);
      }
    };
  }, [nodes, edges, isConnected, guestSession]);

  // Node handlers for EDIT mode
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

    const newNode: Node = {
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

    setNodes((nds) => [...nds, newNode]);
    setSelectedNodeId(newNode.id);
    toast({ title: `Node "${nodeMetadata.name}" ajouté` });
  }, [nodes]);

  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedNodeId(node.id);
    setInspectedNodeId(node.id);
  }, []);

  const handleNodeDoubleClick: NodeMouseHandler = useCallback((_event, node) => {
    setEditingNodeId(node.id);
    setIsNodeEditModalOpen(true);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    toast({ title: 'Node supprimé' });
  }, [selectedNodeId]);

  // Drag and drop
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
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });

        let outputs;
        try {
          const fullDef = await nodesApi.getByType(nodeMetadata.type);
          outputs = fullDef.outputs;
        } catch {
          outputs = [{ name: 'output', type: 'object' }];
        }

        const newNode: Node = {
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

        setNodes((nds) => [...nds, newNode]);
        setSelectedNodeId(newNode.id);
        toast({ title: `Node "${nodeMetadata.name}" ajouté` });
      } catch (e) {
        console.error('Erreur lors du drop:', e);
      }
    },
    [reactFlowInstance]
  );

  // Zoom controls
  const handleFitView = useCallback(() => {
    reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
  }, [reactFlowInstance]);

  const handleZoomIn = useCallback(() => {
    reactFlowInstance.zoomIn({ duration: 200 });
  }, [reactFlowInstance]);

  const handleZoomOut = useCallback(() => {
    reactFlowInstance.zoomOut({ duration: 200 });
  }, [reactFlowInstance]);

  // Cursor tracking for collaboration
  const handleCursorMove = useCallback(
    (position: CursorPosition) => {
      if (isConnected && guestSession) {
        collaborationSocket.moveCursor(guestSession.workflowId, position);
      }
    },
    [isConnected, guestSession]
  );

  const trackCursor = useCursorTracking(handleCursorMove, isConnected);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!isConnected) return;
      try {
        const bounds = event.currentTarget.getBoundingClientRect();
        const viewport = reactFlowInstance.getViewport();
        const x = (event.clientX - bounds.left - viewport.x) / viewport.zoom;
        const y = (event.clientY - bounds.top - viewport.y) / viewport.zoom;
        trackCursor({ x, y });
      } catch {
        // Ignore if viewport is not ready
      }
    },
    [reactFlowInstance, trackCursor, isConnected]
  );

  // Update node from modal
  const handleUpdateNode = useCallback((nodeId: string, data: Partial<Node['data']>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      )
    );
  }, []);

  // Handle node highlight from execution panel
  const handleNodeHighlight = useCallback((nodeId: string | null) => {
    setHighlightedNodeId(nodeId);
    if (nodeId) {
      setInspectedNodeId(nodeId);
    }
  }, []);

  // Run test execution
  const handleRunTest = useCallback(async () => {
    if (!guestSession || isRunning) return;

    setIsRunning(true);
    try {
      await collaborationLinksApi.triggerAsGuest(guestSession.id);
      toast({ title: 'Exécution lancée' });
      // Open execution panel
      setLayout((prev) => ({ ...prev, showExecution: true, activeBottomTab: 'execution' }));
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Impossible de lancer l\'exécution',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  }, [guestSession, isRunning]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f0f1a]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-gray-400">Chargement du workflow...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f0f1a] p-6">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="mx-auto rounded-full bg-red-500/10 p-4 w-fit">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">Erreur</h1>
            <p className="text-gray-400">{error}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(`/collaborate/${token}`)}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            Retour
          </Button>
        </div>
      </div>
    );
  }

  if (!guestSession) return null;

  const PermissionIcon = permissionLabels[guestSession.permission].icon;
  const canEdit = guestSession.permission === 'EDIT';

  return (
    <div className="flex h-screen flex-col bg-[#0f0f1a]">
      {/* Top toolbar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-800 bg-[#1a1a2e] px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/20 p-1.5">
              <Workflow className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">{workflowName}</span>
              <span className="text-xs text-gray-500">Mode collaboration</span>
            </div>
          </div>

          {/* Permission badge */}
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
            <PermissionIcon className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">
              {permissionLabels[guestSession.permission].label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Panel toggles for EDIT mode */}
          {canEdit && (
            <>
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
                size="sm"
                onClick={handleRunTest}
                disabled={isRunning}
                className="h-8 rounded-lg text-xs bg-green-600 hover:bg-green-700 text-white"
              >
                {isRunning ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="mr-1.5 h-3.5 w-3.5" />
                )}
                Tester
              </Button>

              <div className="h-6 w-px bg-gray-700" />
            </>
          )}

          {/* Collaborators */}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <div className="flex -space-x-2">
              {collaborators.slice(0, 5).map((collab) => (
                <div
                  key={collab.id}
                  className="h-7 w-7 rounded-full border-2 border-[#1a1a2e] flex items-center justify-center text-xs font-medium text-white"
                  style={{ backgroundColor: collab.color }}
                  title={collab.name}
                >
                  {collab.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {collaborators.length > 5 && (
                <div className="h-7 w-7 rounded-full border-2 border-[#1a1a2e] bg-gray-700 flex items-center justify-center text-xs font-medium text-white">
                  +{collaborators.length - 5}
                </div>
              )}
            </div>
          </div>

          {/* Guest info */}
          <div className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-1.5">
            <div
              className="h-5 w-5 rounded-full flex items-center justify-center text-xs font-medium text-white"
              style={{ backgroundColor: guestSession.color }}
            >
              {guestSession.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-gray-300">{guestSession.name}</span>
            <span className="text-xs text-gray-500">(invité)</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLeave}
            className="h-8 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Quitter
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Center: Canvas + Bottom panels */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Canvas */}
          <div
            className={cn("flex-1 min-h-0", hasBottomPanel && "h-[calc(100%-200px)]")}
            onDragOver={canEdit ? handleDragOver : undefined}
            onDrop={canEdit ? handleDrop : undefined}
            onMouseMove={handleMouseMove}
          >
            <ReactFlow
              nodes={nodes.map((node) => ({
                ...node,
                className: cn(
                  highlightedNodeId === node.id && 'ring-2 ring-blue-500 ring-offset-2'
                ),
              }))}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={canEdit ? onNodesChange : undefined}
              onEdgesChange={canEdit ? onEdgesChange : undefined}
              onConnect={canEdit ? onConnect : undefined}
              onNodeClick={canEdit ? handleNodeClick : undefined}
              onNodeDoubleClick={canEdit ? handleNodeDoubleClick : undefined}
              onPaneClick={canEdit ? handlePaneClick : undefined}
              fitView
              snapToGrid
              snapGrid={[16, 16]}
              nodesDraggable={canEdit}
              nodesConnectable={canEdit}
              elementsSelectable={canEdit}
              panOnDrag
              zoomOnScroll
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

              {/* Editor toolbar */}
              {canEdit && (
                <Panel position="top-left" className="m-2">
                  <EditorToolbar
                    onFitView={handleFitView}
                    onZoomIn={handleZoomIn}
                    onZoomOut={handleZoomOut}
                    showMinimap={showMinimap}
                    onToggleMinimap={() => setShowMinimap(!showMinimap)}
                  />
                </Panel>
              )}

              {/* Empty state */}
              {nodes.length === 0 && (
                <Panel position="top-center" className="mt-16">
                  <div className="rounded-xl bg-[#1e1e2e] border border-gray-700 p-6 text-center shadow-lg">
                    <div className="mx-auto mb-3 rounded-full bg-primary/20 p-3 w-fit">
                      <Workflow className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-base font-semibold mb-1 text-white">
                      {canEdit ? 'Commencez votre workflow' : 'Workflow vide'}
                    </h3>
                    <p className="text-sm text-gray-400 max-w-xs">
                      {canEdit
                        ? 'Glissez-déposez un node depuis la bibliothèque à droite pour démarrer'
                        : 'Ce workflow ne contient pas encore de nodes'}
                    </p>
                  </div>
                </Panel>
              )}

              {/* Read-only notice */}
              {!canEdit && (
                <Panel position="bottom-center" className="mb-4">
                  <div className="flex items-center gap-2 rounded-lg bg-amber-900/50 border border-amber-700/50 px-4 py-2">
                    <Eye className="h-4 w-4 text-amber-400" />
                    <span className="text-sm text-amber-200">
                      Vous consultez ce workflow en mode {guestSession.permission === 'VIEW' ? 'lecture seule' : 'commentaire'}
                    </span>
                  </div>
                </Panel>
              )}

              {/* Collaborator cursors */}
              {isConnected && (
                <CollaboratorCursors
                  currentUserId={guestSession.id}
                  externalCursors={collaborators
                    .filter((c) => c.cursor && c.id !== guestSession.id)
                    .map((c) => ({
                      userId: c.id,
                      name: c.name,
                      color: c.color,
                      position: c.cursor!,
                    }))}
                />
              )}
            </ReactFlow>
          </div>

          {/* Bottom panels */}
          {hasBottomPanel && canEdit && (
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
                {layout.activeBottomTab === 'execution' && layout.showExecution && guestSession && (
                  <ExecutionPanel
                    embedded
                    className="h-full"
                    workflowId={guestSession.workflowId}
                    nodes={nodes.map(n => ({ id: n.id, data: { label: String((n.data as Record<string, unknown>).label || ''), nodeType: String((n.data as Record<string, unknown>).nodeType || '') } }))}
                    onNodeHighlight={handleNodeHighlight}
                    guestSessionId={guestSession.id}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right panels */}
        {hasRightPanel && canEdit && (
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

            {/* Separator */}
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
                    nodeId={inspectedNodeId}
                    embedded
                    className="h-full"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Node Edit Modal */}
      {canEdit && (
        <NodeEditModal
          nodeId={editingNodeId}
          isOpen={isNodeEditModalOpen}
          onClose={() => {
            setIsNodeEditModalOpen(false);
            setEditingNodeId(null);
          }}
          onDelete={handleDeleteNode}
          workflowVariables={workflowVariables}
          externalNodes={nodes as WorkflowNode[]}
          externalEdges={edges}
          onExternalUpdateNode={handleUpdateNode}
        />
      )}

      {/* Variables Panel */}
      {canEdit && (
        <WorkflowVariablesPanel
          isOpen={isVariablesPanelOpen}
          onClose={() => setIsVariablesPanelOpen(false)}
          variables={workflowVariables}
          readOnly
        />
      )}
    </div>
  );
}
