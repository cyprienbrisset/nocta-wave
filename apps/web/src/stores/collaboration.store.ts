import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  CollaboratorInfo,
  CursorPosition,
  ViewportState,
  ChatMessageData,
  WorkflowChangeData,
} from '@ws-flows/shared';
import { collaborationSocket } from '@/lib/socket/collaboration-socket';

export interface CollaboratorState extends CollaboratorInfo {
  cursor?: CursorPosition;
  lastSeen: number;
}

interface TypingUser {
  userId: string;
  userName: string;
  timestamp: number;
}

interface CollaborationState {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  currentWorkflowId: string | null;

  // Current user info
  currentUser: CollaboratorInfo | null;

  // Collaborators
  collaborators: Map<string, CollaboratorState>;

  // Chat
  messages: ChatMessageData[];
  typingUsers: Map<string, TypingUser>;
  unreadCount: number;
  isChatOpen: boolean;

  // Changes
  recentChanges: WorkflowChangeData[];

  // Follow mode
  followingUserId: string | null;
  followers: string[];

  // Actions
  connect: (token: string) => Promise<void>;
  disconnect: () => void;
  joinWorkflow: (workflowId: string) => Promise<void>;
  leaveWorkflow: () => Promise<void>;

  // Cursor actions
  updateCursor: (position: CursorPosition) => void;

  // Viewport actions
  updateViewport: (viewport: ViewportState) => void;

  // Chat actions
  sendMessage: (content: string, parentId?: string, nodeId?: string) => Promise<void>;
  setTyping: (isTyping: boolean) => void;
  setChatOpen: (open: boolean) => void;
  clearUnread: () => void;

  // Follow mode actions
  startFollowing: (userId: string) => Promise<ViewportState | null>;
  stopFollowing: () => Promise<void>;

  // Change tracking
  broadcastChange: (
    changeType: WorkflowChangeData['changeType'],
    options?: {
      nodeId?: string;
      edgeId?: string;
      previousData?: Record<string, unknown>;
      newData?: Record<string, unknown>;
      description?: string;
    }
  ) => Promise<void>;
}

// Typing indicator timeout (3 seconds)
const TYPING_TIMEOUT = 3000;

export const useCollaborationStore = create<CollaborationState>()(
  subscribeWithSelector((set, get) => {
    // Cleanup typing users periodically
    let typingCleanupInterval: NodeJS.Timeout | null = null;

    const startTypingCleanup = () => {
      if (typingCleanupInterval) return;
      typingCleanupInterval = setInterval(() => {
        const now = Date.now();
        const typingUsers = get().typingUsers;
        let hasChanges = false;

        for (const [userId, user] of typingUsers) {
          if (now - user.timestamp > TYPING_TIMEOUT) {
            typingUsers.delete(userId);
            hasChanges = true;
          }
        }

        if (hasChanges) {
          set({ typingUsers: new Map(typingUsers) });
        }
      }, 1000);
    };

    const stopTypingCleanup = () => {
      if (typingCleanupInterval) {
        clearInterval(typingCleanupInterval);
        typingCleanupInterval = null;
      }
    };

    // Heartbeat interval
    let heartbeatInterval: NodeJS.Timeout | null = null;

    const startHeartbeat = (workflowId: string) => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      heartbeatInterval = setInterval(() => {
        collaborationSocket.sendHeartbeat(workflowId);
      }, 30000);
    };

    const stopHeartbeat = () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    };

    return {
      // Initial state
      isConnected: false,
      isConnecting: false,
      connectionError: null,
      currentWorkflowId: null,
      currentUser: null,
      collaborators: new Map(),
      messages: [],
      typingUsers: new Map(),
      unreadCount: 0,
      isChatOpen: false,
      recentChanges: [],
      followingUserId: null,
      followers: [],

      // Connect to server
      connect: async (token: string) => {
        set({ isConnecting: true, connectionError: null });

        try {
          await collaborationSocket.connect(token);

          // Set up event listeners
          collaborationSocket.onUserJoined(({ workflowId, collaborator }) => {
            if (workflowId !== get().currentWorkflowId) return;

            const collaborators = new Map(get().collaborators);
            collaborators.set(collaborator.id, {
              ...collaborator,
              lastSeen: Date.now(),
            });
            set({ collaborators });
          });

          collaborationSocket.onUserLeft(({ workflowId, collaborator }) => {
            if (workflowId !== get().currentWorkflowId) return;

            const collaborators = new Map(get().collaborators);
            collaborators.delete(collaborator.id);
            set({ collaborators });
          });

          collaborationSocket.onCursorUpdated(({ workflowId, userId, position }) => {
            if (workflowId !== get().currentWorkflowId) return;

            const collaborators = new Map(get().collaborators);
            const collaborator = collaborators.get(userId);
            if (collaborator) {
              collaborators.set(userId, {
                ...collaborator,
                cursor: position,
                lastSeen: Date.now(),
              });
              set({ collaborators });
            }
          });

          collaborationSocket.onPresenceUpdate(({ workflowId, collaborators: newCollaborators }) => {
            if (workflowId !== get().currentWorkflowId) return;

            const collaborators = new Map<string, CollaboratorState>();
            for (const c of newCollaborators) {
              collaborators.set(c.id, { ...c, lastSeen: Date.now() });
            }
            set({ collaborators });
          });

          collaborationSocket.onChatMessage(({ workflowId, message }) => {
            if (workflowId !== get().currentWorkflowId) return;

            set((state) => ({
              messages: [...state.messages, message],
              unreadCount: state.isChatOpen ? state.unreadCount : state.unreadCount + 1,
            }));
          });

          collaborationSocket.onTyping(({ workflowId, userId, userName, isTyping }) => {
            if (workflowId !== get().currentWorkflowId) return;

            const typingUsers = new Map(get().typingUsers);
            if (isTyping) {
              typingUsers.set(userId, { userId, userName, timestamp: Date.now() });
            } else {
              typingUsers.delete(userId);
            }
            set({ typingUsers });
          });

          collaborationSocket.onViewportSync(({ workflowId, viewport, leaderId }) => {
            if (workflowId !== get().currentWorkflowId) return;
            if (get().followingUserId !== leaderId) return;

            // This will be handled by the workflow store
            // We just emit an event that can be subscribed to
            window.dispatchEvent(
              new CustomEvent('collaboration:viewport-sync', { detail: { viewport, leaderId } })
            );
          });

          collaborationSocket.onChangeNew(({ workflowId, change }) => {
            if (workflowId !== get().currentWorkflowId) return;

            set((state) => ({
              recentChanges: [change, ...state.recentChanges.slice(0, 49)],
            }));
          });

          collaborationSocket.onFollowStarted(({ workflowId, followerId, followerName }) => {
            if (workflowId !== get().currentWorkflowId) return;

            set((state) => ({
              followers: [...state.followers, followerId],
            }));
          });

          collaborationSocket.onFollowStopped(({ workflowId, followerId }) => {
            if (workflowId !== get().currentWorkflowId) return;

            set((state) => ({
              followers: state.followers.filter((id) => id !== followerId),
            }));
          });

          set({ isConnected: true, isConnecting: false });
          startTypingCleanup();
        } catch (error) {
          set({
            isConnecting: false,
            connectionError: error instanceof Error ? error.message : 'Connection failed',
          });
          throw error;
        }
      },

      disconnect: () => {
        stopHeartbeat();
        stopTypingCleanup();
        collaborationSocket.disconnect();
        set({
          isConnected: false,
          currentWorkflowId: null,
          currentUser: null,
          collaborators: new Map(),
          messages: [],
          typingUsers: new Map(),
          recentChanges: [],
          followingUserId: null,
          followers: [],
        });
      },

      joinWorkflow: async (workflowId: string) => {
        const { collaborator, collaborators } = await collaborationSocket.joinWorkflow(workflowId);

        const collaboratorMap = new Map<string, CollaboratorState>();
        for (const c of collaborators) {
          collaboratorMap.set(c.id, { ...c, lastSeen: Date.now() });
        }

        set({
          currentWorkflowId: workflowId,
          currentUser: collaborator,
          collaborators: collaboratorMap,
          messages: [],
          typingUsers: new Map(),
          recentChanges: [],
          followingUserId: null,
          followers: [],
        });

        startHeartbeat(workflowId);
      },

      leaveWorkflow: async () => {
        const workflowId = get().currentWorkflowId;
        if (workflowId) {
          stopHeartbeat();
          await collaborationSocket.leaveWorkflow(workflowId);
        }

        set({
          currentWorkflowId: null,
          collaborators: new Map(),
          messages: [],
          typingUsers: new Map(),
          recentChanges: [],
          followingUserId: null,
          followers: [],
        });
      },

      updateCursor: (position: CursorPosition) => {
        const workflowId = get().currentWorkflowId;
        if (workflowId) {
          collaborationSocket.moveCursor(workflowId, position);
        }
      },

      updateViewport: (viewport: ViewportState) => {
        const workflowId = get().currentWorkflowId;
        if (workflowId) {
          collaborationSocket.updateViewport(workflowId, viewport);
        }
      },

      sendMessage: async (content: string, parentId?: string, nodeId?: string) => {
        const workflowId = get().currentWorkflowId;
        if (!workflowId) return;

        await collaborationSocket.sendChatMessage(workflowId, content, { parentId, nodeId });
      },

      setTyping: (isTyping: boolean) => {
        const workflowId = get().currentWorkflowId;
        if (workflowId) {
          collaborationSocket.setTyping(workflowId, isTyping);
        }
      },

      setChatOpen: (open: boolean) => {
        set({ isChatOpen: open });
        if (open) {
          set({ unreadCount: 0 });
        }
      },

      clearUnread: () => {
        set({ unreadCount: 0 });
      },

      startFollowing: async (userId: string) => {
        const workflowId = get().currentWorkflowId;
        if (!workflowId) return null;

        const result = await collaborationSocket.startFollowing(workflowId, userId);
        set({ followingUserId: userId });
        return result.viewport;
      },

      stopFollowing: async () => {
        const workflowId = get().currentWorkflowId;
        if (workflowId) {
          await collaborationSocket.stopFollowing(workflowId);
        }
        set({ followingUserId: null });
      },

      broadcastChange: async (changeType, options) => {
        const workflowId = get().currentWorkflowId;
        if (!workflowId) return;

        await collaborationSocket.broadcastChange(workflowId, changeType, options);
      },
    };
  })
);

// Selector hooks for optimized re-renders
// Note: These selectors return Maps/arrays that are stable references from the store
export const useCollaborators = () => {
  const collaboratorsMap = useCollaborationStore((state) => state.collaborators);
  // Convert to array - the Map reference is stable, so this only recalculates when Map changes
  return Array.from(collaboratorsMap.values());
};

export const useCollaboratorById = (userId: string) =>
  useCollaborationStore((state) => state.collaborators.get(userId));

export const useTypingUsers = () => {
  const typingUsersMap = useCollaborationStore((state) => state.typingUsers);
  return Array.from(typingUsersMap.values());
};

export const useUnreadCount = () =>
  useCollaborationStore((state) => state.unreadCount);

export const useIsFollowing = () =>
  useCollaborationStore((state) => state.followingUserId !== null);

export const useFollowers = () =>
  useCollaborationStore((state) => state.followers);
