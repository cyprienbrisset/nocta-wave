import { Socket } from 'socket.io';
import { CollaborationPermission } from '@prisma/client';

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  isGuest: false;
}

export interface GuestInfo {
  id: string;            // Guest session ID
  name: string;
  color: string;
  permission: CollaborationPermission;
  workflowId: string;
  isGuest: true;
}

export type SocketUser = UserInfo | GuestInfo;

export interface AuthenticatedSocket extends Socket {
  user?: UserInfo;
  guest?: GuestInfo;
}

export interface CollaboratorInfo {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  socketId: string;
}

export interface CursorPosition {
  x: number;
  y: number;
}

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

export interface WorkflowPresence {
  workflowId: string;
  collaborators: Map<string, CollaboratorInfo>;
}

export interface JoinWorkflowPayload {
  workflowId: string;
}

export interface LeaveWorkflowPayload {
  workflowId: string;
}

export interface CursorMovePayload {
  workflowId: string;
  position: CursorPosition;
}

export interface ViewportUpdatePayload {
  workflowId: string;
  viewport: ViewportState;
}

export interface ChatMessagePayload {
  workflowId: string;
  content: string;
  parentId?: string;
  nodeId?: string;
}

export interface TypingPayload {
  workflowId: string;
  isTyping: boolean;
}

export interface FollowPayload {
  workflowId: string;
  targetUserId: string;
}

export interface WorkflowChangePayload {
  workflowId: string;
  changeType: 'NODE_ADDED' | 'NODE_UPDATED' | 'NODE_DELETED' | 'NODE_MOVED' |
              'EDGE_ADDED' | 'EDGE_DELETED' | 'CONFIG_CHANGED' | 'SETTINGS_CHANGED';
  nodeId?: string;
  edgeId?: string;
  previousData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  description?: string;
}

// Redis keys
// NOTE: Cursor and viewport data is stored in Redis only (not PostgreSQL)
// This eliminates expensive DB writes on every mouse move
export const REDIS_KEYS = {
  workflowUsers: (workflowId: string) => `collab:workflow:${workflowId}:users`,
  workflowTyping: (workflowId: string) => `collab:workflow:${workflowId}:typing`,
  userFollowing: (userId: string) => `collab:follow:${userId}`,
  userSocket: (userId: string) => `collab:socket:${userId}`,
  // Ephemeral data - stored in Redis with TTL (no PostgreSQL writes)
  userCursor: (socketId: string) => `collab:cursor:${socketId}`,
  userViewport: (socketId: string) => `collab:viewport:${socketId}`,
  guestCursor: (sessionId: string) => `collab:guest:${sessionId}:cursor`,
  guestViewport: (sessionId: string) => `collab:guest:${sessionId}:viewport`,
} as const;

// TTL for ephemeral data (in seconds)
export const REDIS_TTL = {
  cursor: 60,      // Cursor position expires after 60s of inactivity
  viewport: 300,   // Viewport state expires after 5 minutes
  typing: 10,      // Typing indicator expires after 10 seconds
} as const;

// Collaboration colors for users
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

export function getCollaboratorColor(index: number): string {
  return COLLABORATOR_COLORS[index % COLLABORATOR_COLORS.length];
}
