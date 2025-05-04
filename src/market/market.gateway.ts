// src/market/market.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ cors: true })
export class MarketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private logger = new Logger('MarketGateway');

  @WebSocketServer()
  server: Server;

  constructor(private readonly jwtService: JwtService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Initialized');
  }

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      const user = this.jwtService.verify(token);
      client.data.user = user;
      this.logger.log(`Client connected: ${client.id} as ${user?.id}`);
    } catch (error) {
      this.logger.warn(`Unauthorized client: ${client.id}`);
      client.emit('unauthorized', { message: 'Invalid or missing token' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * ✅ Broadcast market update to all connected clients
   */
  broadcastMarketUpdate(data: any) {
    this.server.emit('marketUpdate', data);
  }
}
