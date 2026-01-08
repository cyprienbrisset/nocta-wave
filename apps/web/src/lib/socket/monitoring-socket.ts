import { io, Socket } from 'socket.io-client';

interface MonitoringMetrics {
  totalExecutions: number;
  runningExecutions: number;
  queuedExecutions: number;
  successRate: number;
  avgDuration: number;
  executionsPerMinute: number;
  queueDepth: number;
  activeWorkflows: number;
  recentErrors: number;
}

interface LogEntry {
  id: string;
  level: string;
  message: string;
  timestamp: string;
  source?: string;
  traceId?: string;
  executionId?: string;
  context?: Record<string, unknown>;
}

interface SpanEntry {
  id: string;
  traceId: string;
  parentSpanId?: string;
  operationName: string;
  serviceName: string;
  status: string;
  startTime: string;
  endTime?: string;
  duration?: number;
}

interface AlertEvent {
  id: string;
  ruleName: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  condition?: string;
  metrics?: Record<string, number>;
  timestamp: Date;
}

type MonitoringServerEvents = {
  'metrics:update': (metrics: MonitoringMetrics) => void;
  'log:new': (log: LogEntry) => void;
  'span:new': (span: SpanEntry) => void;
  'alert:fired': (alert: AlertEvent) => void;
  'alert:global': (alert: AlertEvent) => void;
  error: (data: { message: string }) => void;
};

class MonitoringSocket {
  private socket: Socket<MonitoringServerEvents, Record<string, (...args: unknown[]) => void>> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private subscribedTeam: string | null = null;
  private subscribedExecutions: Set<string> = new Set();
  private subscribedTraces: Set<string> = new Set();

  /**
   * Connect to the monitoring namespace
   * Token is sent via HTTP-only cookie
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      // Disconnect existing socket if any
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }

      // Build WebSocket URL
      // Smart detection: if env points to localhost but user accesses via different IP, use that IP
      let wsUrl: string;
      const isClientSide = typeof window !== 'undefined';
      const clientHostname = isClientSide ? window.location.hostname : 'localhost';
      const isAccessingViaIP = clientHostname !== 'localhost' && clientHostname !== '127.0.0.1';

      if (process.env.NEXT_PUBLIC_WS_URL) {
        wsUrl = process.env.NEXT_PUBLIC_WS_URL;
        if (isAccessingViaIP && (wsUrl.includes('localhost') || wsUrl.includes('127.0.0.1'))) {
          wsUrl = wsUrl.replace(/localhost|127\.0\.0\.1/, clientHostname);
        }
      } else if (process.env.NEXT_PUBLIC_API_URL) {
        wsUrl = process.env.NEXT_PUBLIC_API_URL.replace(/\/api$/, '');
        if (isAccessingViaIP && (wsUrl.includes('localhost') || wsUrl.includes('127.0.0.1'))) {
          wsUrl = wsUrl.replace(/localhost|127\.0\.0\.1/, clientHostname);
        }
      } else if (isClientSide) {
        wsUrl = `${window.location.protocol}//${clientHostname}:4001`;
      } else {
        wsUrl = 'http://localhost:4001';
      }

      // Ensure we use http:// for socket.io (it handles upgrade internally)
      wsUrl = wsUrl.replace(/^ws:\/\//, 'http://').replace(/^wss:\/\//, 'https://');
      wsUrl = wsUrl.replace(/\/+$/, '');

      console.log('[Monitoring] Connecting to:', `${wsUrl}/monitoring`);

      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.error('[Monitoring] Connection timeout to:', `${wsUrl}/monitoring`);
          reject(new Error('Connection timeout'));
        }
      }, 10000);

      this.socket = io(`${wsUrl}/monitoring`, {
        transports: ['polling', 'websocket'], // Start with polling, then upgrade
        reconnection: false, // Disable auto-reconnect during initial connection
        timeout: 20000,
        forceNew: true,
        withCredentials: true, // Send cookies for HTTP-only JWT authentication
      }) as Socket<MonitoringServerEvents, Record<string, (...args: unknown[]) => void>>;

      this.socket.on('connect', () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        console.log('[Monitoring] Connected');
        this.reconnectAttempts = 0;

        // Enable reconnection after successful initial connect
        this.socket!.io.opts.reconnection = true;
        this.socket!.io.opts.reconnectionAttempts = this.maxReconnectAttempts;
        this.socket!.io.opts.reconnectionDelay = 1000;
        this.socket!.io.opts.reconnectionDelayMax = 5000;

        // Resubscribe to team if we had one
        if (this.subscribedTeam) {
          this.subscribeToTeam(this.subscribedTeam);
        }

        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[Monitoring] Disconnected:', reason);
      });

      this.socket.on('connect_error', (error) => {
        this.reconnectAttempts++;
        console.error('[Monitoring] Connection error:', error.message, `(attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        if (!resolved && this.reconnectAttempts >= this.maxReconnectAttempts) {
          resolved = true;
          clearTimeout(timeout);
          // Clean up socket to prevent further attempts
          this.socket?.disconnect();
          this.socket = null;
          reject(new Error(`Failed to connect after ${this.maxReconnectAttempts} attempts: ${error.message}`));
        }
      });

      this.socket.on('error', (data) => {
        console.error('[Monitoring] Socket error:', data.message);
      });

      // Re-subscribe on reconnect
      this.socket.io.on('reconnect', () => {
        console.log('[Monitoring] Reconnected');
        this.reattachListeners();

        // Resubscribe to team
        if (this.subscribedTeam) {
          this.subscribeToTeam(this.subscribedTeam);
        }

        // Resubscribe to executions
        this.subscribedExecutions.forEach(id => {
          this.socket?.emit('subscribe:execution', id);
        });

        // Resubscribe to traces
        this.subscribedTraces.forEach(id => {
          this.socket?.emit('subscribe:trace', id);
        });
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
    this.subscribedTeam = null;
    this.subscribedExecutions.clear();
    this.subscribedTraces.clear();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Subscribe to a team's monitoring events
   */
  subscribeToTeam(teamId: string): void {
    this.subscribedTeam = teamId;
    this.socket?.emit('subscribe:team', teamId);
  }

  /**
   * Unsubscribe from a team's monitoring events
   */
  unsubscribeFromTeam(teamId: string): void {
    if (this.subscribedTeam === teamId) {
      this.subscribedTeam = null;
    }
    this.socket?.emit('unsubscribe:team', teamId);
  }

  /**
   * Subscribe to a specific execution's logs
   */
  subscribeToExecution(executionId: string): void {
    this.subscribedExecutions.add(executionId);
    this.socket?.emit('subscribe:execution', executionId);
  }

  /**
   * Subscribe to a specific trace
   */
  subscribeToTrace(traceId: string): void {
    this.subscribedTraces.add(traceId);
    this.socket?.emit('subscribe:trace', traceId);
  }

  // Event listeners

  /**
   * Listen for metrics updates
   */
  onMetricsUpdate(callback: (metrics: MonitoringMetrics) => void): () => void {
    return this.on('metrics:update', callback);
  }

  /**
   * Listen for new log entries
   */
  onLogNew(callback: (log: LogEntry) => void): () => void {
    return this.on('log:new', callback);
  }

  /**
   * Listen for new spans
   */
  onSpanNew(callback: (span: SpanEntry) => void): () => void {
    return this.on('span:new', callback);
  }

  /**
   * Listen for fired alerts
   */
  onAlertFired(callback: (alert: AlertEvent) => void): () => void {
    return this.on('alert:fired', callback);
  }

  /**
   * Listen for global alerts
   */
  onGlobalAlert(callback: (alert: AlertEvent) => void): () => void {
    return this.on('alert:global', callback);
  }

  // Private helpers

  private on<K extends keyof MonitoringServerEvents>(
    event: K,
    callback: MonitoringServerEvents[K]
  ): () => void {
    // Store listener for reconnection
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as (...args: unknown[]) => void);

    // Attach to socket
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.socket?.on(event, callback as any);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback as (...args: unknown[]) => void);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.socket?.off(event, callback as any);
    };
  }

  private reattachListeners(): void {
    for (const [event, callbacks] of this.listeners) {
      for (const callback of callbacks) {
        this.socket?.on(event as keyof MonitoringServerEvents, callback);
      }
    }
  }
}

// Singleton instance
export const monitoringSocket = new MonitoringSocket();

// Export types
export type { MonitoringMetrics, LogEntry, SpanEntry, AlertEvent };

// Export class for testing
export { MonitoringSocket };
