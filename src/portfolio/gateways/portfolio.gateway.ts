/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'portfolio',
})
export class PortfolioGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PortfolioGateway.name);
  private userSocketMap: Map<string, string[]> = new Map();

  constructor(private jwtService: JwtService) {}

  handleConnection(client: Socket): void {
    try {
      const token: string = client.handshake.auth.token as string;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload: { sub: string } = this.jwtService.verify(token);
      const userId = payload.sub;

      if (!this.userSocketMap.has(userId)) {
        this.userSocketMap.set(userId, []);
      }

      const sockets = this.userSocketMap.get(userId) || [];
      sockets.push(client.id);
      this.userSocketMap.set(userId, sockets);
      client.data.userId = userId;

      this.logger.log(`Client connected: ${client.id} for user ${userId}`);
    } catch (error) {
      this.logger.error('Connection error', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = (client.data as { userId?: string })?.userId;
    if (userId) {
      const sockets = this.userSocketMap.get(userId) || [];
      const index = sockets.indexOf(client.id);
      if (index !== -1) {
        sockets.splice(index, 1);
        if (sockets.length === 0) {
          this.userSocketMap.delete(userId);
        }
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribeToPortfolio')
  async handleSubscribeToPortfolio(client: Socket) {
    const userId = (client.data as { userId?: string })?.userId;
    if (userId) {
      await client.join(`portfolio:${userId}`);
      this.logger.log(`User ${userId} subscribed to portfolio updates`);
    }
  }

  notifyPortfolioUpdate(userId: string, data: any): void {
    this.server.to(`portfolio:${userId}`).emit('portfolioUpdate', data);
  }
}
