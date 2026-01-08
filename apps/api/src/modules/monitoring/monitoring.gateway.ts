import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { RedisService } from '../../database/redis.service';

@WebSocketGateway({
  namespace: '/monitoring',
  cors: {
    origin: true, // Allow all origins dynamically
    methods: ['GET', 'POST'],
    credentials: true, // Allow cookies
  },
  transports: ['polling', 'websocket'],
})
export class MonitoringGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MonitoringGateway.name);

  constructor(private redis: RedisService) {}

  afterInit() {
    this.logger.log('Monitoring WebSocket Gateway initialized');
    this.subscribeToRedisChannels();
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  /**
   * Subscribe to a team's monitoring events
   */
  @SubscribeMessage('subscribe:team')
  handleSubscribeTeam(client: Socket, teamId: string) {
    client.join(`team:${teamId}`);
    this.logger.debug(`Client ${client.id} subscribed to team ${teamId}`);
    return { success: true };
  }

  /**
   * Unsubscribe from a team's monitoring events
   */
  @SubscribeMessage('unsubscribe:team')
  handleUnsubscribeTeam(client: Socket, teamId: string) {
    client.leave(`team:${teamId}`);
    return { success: true };
  }

  /**
   * Subscribe to a specific execution's logs
   */
  @SubscribeMessage('subscribe:execution')
  handleSubscribeExecution(client: Socket, executionId: string) {
    client.join(`execution:${executionId}`);
    this.logger.debug(`Client ${client.id} subscribed to execution ${executionId}`);
    return { success: true };
  }

  /**
   * Subscribe to a specific trace
   */
  @SubscribeMessage('subscribe:trace')
  handleSubscribeTrace(client: Socket, traceId: string) {
    client.join(`trace:${traceId}`);
    return { success: true };
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  @OnEvent('log.created')
  handleLogCreated(payload: { teamId: string; log: any }) {
    this.server.to(`team:${payload.teamId}`).emit('log:new', payload.log);

    if (payload.log.executionId) {
      this.server
        .to(`execution:${payload.log.executionId}`)
        .emit('log:new', payload.log);
    }
  }

  @OnEvent('span.created')
  handleSpanCreated(payload: { teamId: string; span: any }) {
    this.server.to(`team:${payload.teamId}`).emit('span:new', payload.span);

    if (payload.span.traceId) {
      this.server
        .to(`trace:${payload.span.traceId}`)
        .emit('span:new', payload.span);
    }
  }

  @OnEvent('alert.fired')
  handleAlertFired(payload: { alert: any; rule: any; metrics: any }) {
    const teamId = payload.rule.teamId;
    this.server.to(`team:${teamId}`).emit('alert:fired', {
      id: payload.alert.id,
      ruleName: payload.rule.name,
      message: payload.alert.message,
      severity: payload.alert.severity,
      metrics: payload.metrics,
      timestamp: new Date(),
    });
  }

  @OnEvent('metrics.updated')
  handleMetricsUpdated(payload: { teamId: string; metrics: any }) {
    this.server.to(`team:${payload.teamId}`).emit('metrics:update', payload.metrics);
  }

  // ============================================================================
  // REDIS SUBSCRIPTION
  // ============================================================================

  private async subscribeToRedisChannels() {
    try {
      // Create a subscriber for monitoring channels
      const subscriber = this.redis.createSubscriber();

      subscriber.on('message', (channel: string, message: string) => {
        try {
          const data = JSON.parse(message);

          switch (channel) {
            case 'monitoring:log':
              this.server.to(`team:${data.teamId}`).emit('log:new', data.log);
              break;
            case 'monitoring:alert':
              this.server.emit('alert:global', {
                id: data.alertId,
                ruleName: data.ruleName,
                condition: data.condition,
                severity: data.severity,
                timestamp: new Date(),
              });
              break;
            case 'monitoring:metrics':
              this.server.to(`team:${data.teamId}`).emit('metrics:update', data.metrics);
              break;
          }
        } catch (error) {
          this.logger.error('Error parsing Redis message', error);
        }
      });

      await subscriber.subscribe('monitoring:log', 'monitoring:alert', 'monitoring:metrics');
      this.logger.log('Subscribed to Redis monitoring channels');
    } catch (error) {
      this.logger.error('Failed to subscribe to Redis channels', error);
    }
  }

  // ============================================================================
  // BROADCAST METHODS
  // ============================================================================

  /**
   * Broadcast real-time metrics to a team
   */
  broadcastMetrics(teamId: string, metrics: any) {
    this.server.to(`team:${teamId}`).emit('metrics:update', metrics);
  }

  /**
   * Broadcast a log entry
   */
  broadcastLog(teamId: string, log: any) {
    this.server.to(`team:${teamId}`).emit('log:new', log);
  }

  /**
   * Broadcast an alert
   */
  broadcastAlert(teamId: string, alert: any) {
    this.server.to(`team:${teamId}`).emit('alert:fired', alert);
  }
}
