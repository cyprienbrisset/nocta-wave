import { io, Socket } from 'socket.io-client';
import type {
  CollaborationServerEvents,
  CollaboratorInfo,
  CursorPosition,
  ViewportState,
  ChatMessageData,
  WorkflowChangeData,
  ChangeType,
  GraphUpdateData,
} from '@ws-flows/shared';

// Use a more permissive socket type to allow callbacks with emit
type AnySocket = Socket<CollaborationServerEvents, Record<string, (...args: any[]) => void>>;

class CollaborationSocket {
  private socket: AnySocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();
  private isGuest = false;

  /**
   * Connect to the collaboration namespace as an authenticated user
   */
  connect(token: string): Promise<void> {
    return this.connectWithAuth({ token });
  }

  /**
   * Connect to the collaboration namespace as a guest
   */
  connectAsGuest(guestSessionId: string): Promise<void> {
    this.isGuest = true;
    return this.connectWithAuth({ guestSessionId });
  }

  /**
   * Internal connection method
   */
  private connectWithAuth(auth: { token?: string; guestSessionId?: string }): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      // Remove /api suffix if present since socket namespace is at root
      let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
      apiUrl = apiUrl.replace(/\/api$/, '');

      console.log('[Collaboration] Connecting to:', `${apiUrl}/collaboration`);

      this.socket = io(`${apiUrl}/collaboration`, {
        auth,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      }) as AnySocket;

      this.socket.on('connect', () => {
        console.log('[Collaboration] Connected');
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[Collaboration] Disconnected:', reason);
      });

      this.socket.on('connect_error', (error) => {
        console.error('[Collaboration] Connection error:', error);
        this.reconnectAttempts++;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Failed to connect after maximum attempts'));
        }
      });

      this.socket.on('error', (data) => {
        console.error('[Collaboration] Socket error:', data.message);
      });

      // Re-emit all registered listeners on reconnect
      this.socket.on('connect', () => {
        this.reattachListeners();
      });
    });
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
    this.isGuest = false;
  }

  /**
   * Check if connected as guest
   */
  isGuestConnection(): boolean {
    return this.isGuest;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Join a workflow room
   */
  async joinWorkflow(workflowId: string): Promise<{
    collaborator: CollaboratorInfo;
    collaborators: CollaboratorInfo[];
  }> {
    return this.emit('join:workflow', { workflowId });
  }

  /**
   * Leave a workflow room
   */
  async leaveWorkflow(workflowId: string): Promise<void> {
    await this.emit('leave:workflow', { workflowId });
  }

  /**
   * Update cursor position
   */
  moveCursor(workflowId: string, position: CursorPosition): void {
    this.socket?.emit('cursor:move', { workflowId, position });
  }

  /**
   * Update viewport state
   */
  updateViewport(workflowId: string, viewport: ViewportState): void {
    this.socket?.emit('viewport:update', { workflowId, viewport });
  }

  /**
   * Send a chat message
   */
  async sendChatMessage(
    workflowId: string,
    content: string,
    options?: { parentId?: string; nodeId?: string }
  ): Promise<{ message: ChatMessageData }> {
    return this.emit('chat:message', {
      workflowId,
      content,
      parentId: options?.parentId,
      nodeId: options?.nodeId,
    });
  }

  /**
   * Update typing status
   */
  setTyping(workflowId: string, isTyping: boolean): void {
    this.socket?.emit('chat:typing', { workflowId, isTyping });
  }

  /**
   * Start following another user
   */
  async startFollowing(
    workflowId: string,
    targetUserId: string
  ): Promise<{ viewport: ViewportState | null }> {
    return this.emit('follow:start', { workflowId, targetUserId });
  }

  /**
   * Stop following
   */
  async stopFollowing(workflowId: string): Promise<void> {
    await this.emit('follow:stop', { workflowId });
  }

  /**
   * Broadcast a workflow change
   */
  async broadcastChange(
    workflowId: string,
    changeType: ChangeType,
    options?: {
      nodeId?: string;
      edgeId?: string;
      previousData?: Record<string, unknown>;
      newData?: Record<string, unknown>;
      description?: string;
    }
  ): Promise<{ change: WorkflowChangeData }> {
    return this.emit('change:broadcast', {
      workflowId,
      changeType,
      ...options,
    });
  }

  /**
   * Broadcast a graph update (nodes and edges)
   */
  broadcastGraphUpdate(
    workflowId: string,
    nodes: any[],
    edges: any[]
  ): void {
    this.socket?.emit('graph:update', { workflowId, nodes, edges });
  }

  /**
   * Send heartbeat
   */
  sendHeartbeat(workflowId: string): void {
    this.socket?.emit('heartbeat', { workflowId });
  }

  /**
   * Get current collaborators
   */
  async getCollaborators(workflowId: string): Promise<{
    collaborators: CollaboratorInfo[];
  }> {
    return this.emit('get:collaborators', { workflowId });
  }

  // Event listeners

  /**
   * Listen for user joined events
   */
  onUserJoined(
    callback: (data: { workflowId: string; collaborator: CollaboratorInfo }) => void
  ): () => void {
    return this.on('user:joined', callback);
  }

  /**
   * Listen for user left events
   */
  onUserLeft(
    callback: (data: { workflowId: string; collaborator: CollaboratorInfo }) => void
  ): () => void {
    return this.on('user:left', callback);
  }

  /**
   * Listen for cursor updates
   */
  onCursorUpdated(
    callback: (data: { workflowId: string; userId: string; position: CursorPosition }) => void
  ): () => void {
    return this.on('cursor:updated', callback);
  }

  /**
   * Listen for presence updates
   */
  onPresenceUpdate(
    callback: (data: { workflowId: string; collaborators: CollaboratorInfo[] }) => void
  ): () => void {
    return this.on('presence:update', callback);
  }

  /**
   * Listen for new chat messages
   */
  onChatMessage(
    callback: (data: { workflowId: string; message: ChatMessageData }) => void
  ): () => void {
    return this.on('chat:new', callback);
  }

  /**
   * Listen for typing indicators
   */
  onTyping(
    callback: (data: {
      workflowId: string;
      userId: string;
      userName: string;
      isTyping: boolean;
    }) => void
  ): () => void {
    return this.on('chat:typing', callback);
  }

  /**
   * Listen for viewport sync (follow mode)
   */
  onViewportSync(
    callback: (data: {
      workflowId: string;
      viewport: ViewportState;
      leaderId: string;
    }) => void
  ): () => void {
    return this.on('viewport:sync', callback);
  }

  /**
   * Listen for new changes
   */
  onChangeNew(
    callback: (data: { workflowId: string; change: WorkflowChangeData }) => void
  ): () => void {
    return this.on('change:new', callback);
  }

  /**
   * Listen for graph updates
   */
  onGraphUpdate(
    callback: (data: GraphUpdateData) => void
  ): () => void {
    return this.on('graph:update', callback);
  }

  /**
   * Listen for follow started events
   */
  onFollowStarted(
    callback: (data: {
      workflowId: string;
      followerId: string;
      followerName: string;
    }) => void
  ): () => void {
    return this.on('follow:started', callback);
  }

  /**
   * Listen for follow stopped events
   */
  onFollowStopped(
    callback: (data: { workflowId: string; followerId: string }) => void
  ): () => void {
    return this.on('follow:stopped', callback);
  }

  // Private helpers

  private emit<T>(event: string, data: any): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Not connected'));
        return;
      }

      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error('Request timeout'));
        }
      }, 10000);

      this.socket.emit(event, data, (response: any) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);

        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  private on<K extends keyof CollaborationServerEvents>(
    event: K,
    callback: CollaborationServerEvents[K]
  ): () => void {
    // Store listener for reconnection
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as any);

    // Attach to socket
    this.socket?.on(event, callback as any);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback as any);
      this.socket?.off(event, callback as any);
    };
  }

  private reattachListeners(): void {
    for (const [event, callbacks] of this.listeners) {
      for (const callback of callbacks) {
        this.socket?.on(event as any, callback);
      }
    }
  }
}

// Singleton instance
export const collaborationSocket = new CollaborationSocket();

// Export class for testing
export { CollaborationSocket };
