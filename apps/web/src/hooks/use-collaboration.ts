import { useEffect, useCallback, useRef } from 'react';
import { useCollaborationStore, type CollaboratorState } from '@/stores/collaboration.store';
import { useAuthStore } from '@/stores/auth.store';
import type { CursorPosition, ViewportState } from '@ws-flows/shared';

interface UseCollaborationOptions {
  workflowId: string;
  enabled?: boolean;
  onViewportSync?: (viewport: ViewportState, leaderId: string) => void;
}

/**
 * Hook for managing real-time collaboration in a workflow
 */
export function useCollaboration({
  workflowId,
  enabled = true,
  onViewportSync,
}: UseCollaborationOptions) {
  const { isAuthenticated } = useAuthStore();
  const {
    isConnected,
    isConnecting,
    connectionError,
    currentUser,
    collaborators,
    followingUserId,
    followers,
    connect,
    disconnect,
    joinWorkflow,
    leaveWorkflow,
    updateCursor,
    updateViewport,
    startFollowing,
    stopFollowing,
    broadcastChange,
  } = useCollaborationStore();

  // Track if we've joined this workflow
  const joinedWorkflowRef = useRef<string | null>(null);

  // Track connection attempts to avoid infinite loops
  const hasAttemptedRef = useRef(false);
  const initializingRef = useRef(false);

  // Throttled cursor update
  const lastCursorUpdate = useRef<number>(0);
  const CURSOR_THROTTLE = 50; // 20 updates per second max

  // Debounced viewport update
  const viewportTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const VIEWPORT_DEBOUNCE = 100;

  // Reset attempt tracking when workflowId changes
  useEffect(() => {
    hasAttemptedRef.current = false;
  }, [workflowId]);

  // Connect and join workflow on mount
  useEffect(() => {
    if (!enabled || !isAuthenticated || !workflowId) return;

    // Prevent re-running if already initializing or has error
    if (initializingRef.current) return;
    if (connectionError && hasAttemptedRef.current) return;

    const initialize = async () => {
      initializingRef.current = true;

      try {
        // Connect if not already connected (token is sent via HTTP-only cookie)
        if (!isConnected && !isConnecting) {
          hasAttemptedRef.current = true;
          await connect();
        }

        // Join workflow if connected and not already in it
        if (isConnected && joinedWorkflowRef.current !== workflowId) {
          // Leave previous workflow if any
          if (joinedWorkflowRef.current) {
            await leaveWorkflow();
          }

          await joinWorkflow(workflowId);
          joinedWorkflowRef.current = workflowId;
        }
      } catch (error) {
        console.error('[Collaboration] Failed to initialize:', error);
      } finally {
        initializingRef.current = false;
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      if (joinedWorkflowRef.current === workflowId) {
        leaveWorkflow().catch(console.error);
        joinedWorkflowRef.current = null;
      }
    };
  }, [enabled, isAuthenticated, workflowId, isConnected, isConnecting, connectionError, connect, joinWorkflow, leaveWorkflow]);

  // Listen for viewport sync events
  useEffect(() => {
    if (!onViewportSync) return;

    const handler = (event: CustomEvent<{ viewport: ViewportState; leaderId: string }>) => {
      onViewportSync(event.detail.viewport, event.detail.leaderId);
    };

    window.addEventListener('collaboration:viewport-sync', handler as EventListener);

    return () => {
      window.removeEventListener('collaboration:viewport-sync', handler as EventListener);
    };
  }, [onViewportSync]);

  // Throttled cursor move
  const moveCursor = useCallback(
    (position: CursorPosition) => {
      const now = Date.now();
      if (now - lastCursorUpdate.current >= CURSOR_THROTTLE) {
        updateCursor(position);
        lastCursorUpdate.current = now;
      }
    },
    [updateCursor]
  );

  // Debounced viewport update
  const setViewport = useCallback(
    (viewport: ViewportState) => {
      if (viewportTimeoutRef.current) {
        clearTimeout(viewportTimeoutRef.current);
      }

      viewportTimeoutRef.current = setTimeout(() => {
        updateViewport(viewport);
      }, VIEWPORT_DEBOUNCE);
    },
    [updateViewport]
  );

  // Get collaborators as array (excluding self)
  const otherCollaborators = Array.from(collaborators.values()).filter(
    (c) => c.id !== currentUser?.id
  );

  // Find collaborator by ID
  const getCollaborator = useCallback(
    (userId: string) => collaborators.get(userId),
    [collaborators]
  );

  // Check if following someone
  const isFollowing = followingUserId !== null;

  // Get who current user is following
  const followingUser = followingUserId ? getCollaborator(followingUserId) : null;

  return {
    // Connection state
    isConnected,
    isConnecting,
    connectionError,

    // Current user
    currentUser,

    // Collaborators
    collaborators: otherCollaborators,
    getCollaborator,

    // Follow mode
    isFollowing,
    followingUser,
    followingUserId,
    followers,
    startFollowing,
    stopFollowing,

    // Actions
    moveCursor,
    setViewport,
    broadcastChange,

    // Manual controls
    disconnect,
  };
}

/**
 * Hook for cursor tracking on a React Flow canvas
 */
export function useCursorTracking(
  containerRef: React.RefObject<HTMLElement>,
  options: { enabled?: boolean; onMove?: (position: CursorPosition) => void } = {}
) {
  const { enabled = true, onMove } = options;
  const { updateCursor } = useCollaborationStore();

  const lastUpdate = useRef<number>(0);
  const THROTTLE = 50;

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;

    const handleMouseMove = (event: MouseEvent) => {
      const now = Date.now();
      if (now - lastUpdate.current < THROTTLE) return;

      const rect = container.getBoundingClientRect();
      const position: CursorPosition = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };

      updateCursor(position);
      onMove?.(position);
      lastUpdate.current = now;
    };

    container.addEventListener('mousemove', handleMouseMove);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
    };
  }, [enabled, containerRef, updateCursor, onMove]);
}

/**
 * Hook for viewport tracking in React Flow
 */
export function useViewportTracking(
  options: { enabled?: boolean; onUpdate?: (viewport: ViewportState) => void } = {}
) {
  const { enabled = true, onUpdate } = options;
  const { updateViewport } = useCollaborationStore();

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const DEBOUNCE = 100;

  const trackViewport = useCallback(
    (viewport: ViewportState) => {
      if (!enabled) return;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        updateViewport(viewport);
        onUpdate?.(viewport);
      }, DEBOUNCE);
    },
    [enabled, updateViewport, onUpdate]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { trackViewport };
}
