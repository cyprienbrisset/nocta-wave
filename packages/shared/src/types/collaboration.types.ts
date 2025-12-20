/**
 * Real-time collaboration types
 */

// Collaborator information
export interface CollaboratorInfo {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  socketId: string;
}

// Cursor position on canvas
export interface CursorPosition {
  x: number;
  y: number;
}

// Viewport state for follow mode
export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

// Chat message
export interface ChatMessageData {
  id: string;
  workflowId: string;
  content: string;
  parentId: string | null;
  nodeId: string | null;
  createdAt: string;
  editedAt: string | null;
  author: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
  mentions: {
    userId: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  }[];
  replyCount?: number;
}

// Workflow change types
export type ChangeType =
  | 'NODE_ADDED'
  | 'NODE_UPDATED'
  | 'NODE_DELETED'
  | 'NODE_MOVED'
  | 'EDGE_ADDED'
  | 'EDGE_DELETED'
  | 'CONFIG_CHANGED'
  | 'SETTINGS_CHANGED';

// Workflow change record
export interface WorkflowChangeData {
  id: string;
  workflowId: string;
  changeType: ChangeType;
  nodeId: string | null;
  edgeId: string | null;
  previousData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  description: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
}

// Graph update data for real-time sync
export interface GraphUpdateData {
  workflowId: string;
  nodes: unknown[];
  edges: unknown[];
}

// Socket events - Client to Server
export interface CollaborationClientEvents {
  'join:workflow': (data: { workflowId: string }) => void;
  'leave:workflow': (data: { workflowId: string }) => void;
  'cursor:move': (data: { workflowId: string; position: CursorPosition }) => void;
  'viewport:update': (data: { workflowId: string; viewport: ViewportState }) => void;
  'chat:message': (data: { workflowId: string; content: string; parentId?: string; nodeId?: string }) => void;
  'chat:typing': (data: { workflowId: string; isTyping: boolean }) => void;
  'follow:start': (data: { workflowId: string; targetUserId: string }) => void;
  'follow:stop': (data: { workflowId: string }) => void;
  'change:broadcast': (data: {
    workflowId: string;
    changeType: ChangeType;
    nodeId?: string;
    edgeId?: string;
    previousData?: Record<string, unknown>;
    newData?: Record<string, unknown>;
    description?: string;
  }) => void;
  'graph:update': (data: GraphUpdateData) => void;
  heartbeat: (data: { workflowId: string }) => void;
  'get:collaborators': (data: { workflowId: string }) => void;
}

// Socket events - Server to Client
export interface CollaborationServerEvents {
  'user:joined': (data: { workflowId: string; collaborator: CollaboratorInfo }) => void;
  'user:left': (data: { workflowId: string; collaborator: CollaboratorInfo }) => void;
  'cursor:updated': (data: { workflowId: string; userId: string; position: CursorPosition }) => void;
  'presence:update': (data: { workflowId: string; collaborators: CollaboratorInfo[] }) => void;
  'chat:new': (data: { workflowId: string; message: ChatMessageData }) => void;
  'chat:typing': (data: { workflowId: string; userId: string; userName: string; isTyping: boolean }) => void;
  'viewport:sync': (data: { workflowId: string; viewport: ViewportState; leaderId: string }) => void;
  'change:new': (data: { workflowId: string; change: WorkflowChangeData }) => void;
  'graph:update': (data: GraphUpdateData) => void;
  'follow:started': (data: { workflowId: string; followerId: string; followerName: string }) => void;
  'follow:stopped': (data: { workflowId: string; followerId: string }) => void;
  error: (data: { message: string }) => void;
}

// Collaboration colors
export const COLLABORATOR_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f43f5e', // rose
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
] as const;
