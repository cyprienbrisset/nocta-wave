import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RedisService } from '../../database/redis.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/executions',
})
export class ExecutionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private subscriber: any;

  constructor(private redis: RedisService) {
    this.setupRedisSubscriber();
  }

  private async setupRedisSubscriber() {
    this.subscriber = this.redis.createSubscriber();

    await this.subscriber.subscribe(
      'execution:started',
      'execution:progress',
      'execution:completed',
      'execution:failed',
      'execution:cancelled',
      'execution:node:started',
      'execution:node:completed',
      'execution:node:failed',
    );

    this.subscriber.on('message', (channel: string, message: string) => {
      const data = JSON.parse(message);
      this.handleRedisMessage(channel, data);
    });
  }

  private handleRedisMessage(channel: string, data: any) {
    const { executionId, teamId } = data;

    // Emit to execution room
    if (executionId) {
      this.server.to(`execution:${executionId}`).emit(channel, data);
    }

    // Emit to team room for dashboard updates
    if (teamId) {
      this.server.to(`team:${teamId}`).emit(channel, data);
    }
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:execution')
  handleSubscribeExecution(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { executionId: string },
  ) {
    client.join(`execution:${data.executionId}`);
    return { subscribed: true, executionId: data.executionId };
  }

  @SubscribeMessage('unsubscribe:execution')
  handleUnsubscribeExecution(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { executionId: string },
  ) {
    client.leave(`execution:${data.executionId}`);
    return { unsubscribed: true, executionId: data.executionId };
  }

  @SubscribeMessage('subscribe:team')
  handleSubscribeTeam(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { teamId: string },
  ) {
    client.join(`team:${data.teamId}`);
    return { subscribed: true, teamId: data.teamId };
  }

  @SubscribeMessage('unsubscribe:team')
  handleUnsubscribeTeam(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { teamId: string },
  ) {
    client.leave(`team:${data.teamId}`);
    return { unsubscribed: true, teamId: data.teamId };
  }
}
