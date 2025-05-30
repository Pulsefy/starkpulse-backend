import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { MarketService } from './market.service';
import { WsJwtAuthGuard } from '../auth/guards/ws-jwt-auth.guard';

@WebSocketGateway({ cors: true })
export class MarketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private logger = new Logger('MarketGateway');

  @WebSocketServer()
  server: Server;

  private clients = new Map<string, { socket: Socket; user: any; subscriptions: Set<string> }>();

  constructor(private readonly marketService: MarketService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Initialized');
  }

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      const user = this.marketService.verifyToken(token);
      this.clients.set(client.id, {
        socket: client,
        user,
        subscriptions: new Set(),
      });
      client.data.user = user;
      this.logger.log(`Client connected: ${client.id} (user ${user.id})`);
    } catch (err) {
      this.logger.warn(`Unauthorized client: ${client.id}`);
      client.emit('unauthorized', { message: 'Invalid or missing token' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.clients.delete(client.id);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(@MessageBody() channel: string, @ConnectedSocket() client: Socket) {
    const clientInfo = this.clients.get(client.id);
    if (clientInfo) {
      clientInfo.subscriptions.add(channel);
      this.logger.log(`Client ${client.id} subscribed to ${channel}`);
    }
    client.emit('subscribed', { channel });
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(@MessageBody() channel: string, @ConnectedSocket() client: Socket) {
    const clientInfo = this.clients.get(client.id);
    if (clientInfo) {
      clientInfo.subscriptions.delete(channel);
      this.logger.log(`Client ${client.id} unsubscribed from ${channel}`);
    }
    client.emit('unsubscribed', { channel });
  }

  broadcast(channel: string, data: any) {
    for (const [_, clientInfo] of this.clients.entries()) {
      if (clientInfo.subscriptions.has(channel)) {
        clientInfo.socket.emit(channel, data);
      }
    }
  }

  broadcastMarketUpdate(data: any) {
    this.broadcast('marketUpdate', data);
  }
}