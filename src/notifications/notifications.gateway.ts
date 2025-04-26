import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);
  private userSocketMap = new Map<string, Set<string>>();

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly jwtService: JwtService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.split(' ')[1] ||
        '';

      if (!token) {
        this.logger.warn('Client attempted connection without token');
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      // Store the connection in our map
      if (!this.userSocketMap.has(userId)) {
        this.userSocketMap.set(userId, new Set());
      }

      // Using optional chaining and nullish coalescing to handle potential undefined
      const socketSet = this.userSocketMap.get(userId);
      if (socketSet) {
        socketSet.add(client.id);
      } else {
        this.userSocketMap.set(userId, new Set([client.id]));
      }

      client.join(`user-${userId}`);
      this.logger.log(`Client connected: ${client.id} for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Socket authentication error: ${error.message}`);
      client.disconnect();
    }
  }
  handleDisconnect(client: Socket) {
    // Remove socket from our mapping
    this.userSocketMap.forEach((socketIds, userId) => {
      if (socketIds.has(client.id)) {
        socketIds.delete(client.id);
        if (socketIds.size === 0) {
          this.userSocketMap.delete(userId);
        }
      }
    });

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribeToTransactions')
  handleSubscribeToTransactions(
    @ConnectedSocket() client: Socket,
    @MessageBody() transactionId: string,
  ) {
    client.join(`transaction-${transactionId}`);
    this.logger.log(
      `Client ${client.id} subscribed to transaction ${transactionId}`,
    );
    return { success: true };
  }

  @SubscribeMessage('unsubscribeFromTransactions')
  handleUnsubscribeFromTransactions(
    @ConnectedSocket() client: Socket,
    @MessageBody() transactionId: string,
  ) {
    client.leave(`transaction-${transactionId}`);
    this.logger.log(
      `Client ${client.id} unsubscribed from transaction ${transactionId}`,
    );
    return { success: true };
  }

  @SubscribeMessage('getNotifications')
  async handleGetNotifications(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { limit?: number; offset?: number },
  ) {
    try {
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.split(' ')[1];
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      const notifications =
        await this.notificationsService.getNotifications(userId);
      return { notifications };
    } catch (error) {
      this.logger.error(`Error getting notifications: ${error.message}`);
      return { error: 'Failed to get notifications' };
    }
  }

  @SubscribeMessage('getTransactionNotifications')
  async handleGetTransactionNotifications(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { transactionId?: string; limit?: number; offset?: number },
  ) {
    try {
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.split(' ')[1];
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      const notifications =
        await this.notificationsService.getTransactionNotifications(
          userId,
          data.transactionId,
        );
      return { notifications };
    } catch (error) {
      this.logger.error(
        `Error getting transaction notifications: ${error.message}`,
      );
      return { error: 'Failed to get transaction notifications' };
    }
  }

  @SubscribeMessage('markNotificationRead')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() notificationId: string,
  ) {
    try {
      await this.notificationsService.markRead(notificationId);
      return { success: true };
    } catch (error) {
      this.logger.error(`Error marking notification read: ${error.message}`);
      return { error: 'Failed to mark notification as read' };
    }
  }

  @SubscribeMessage('markTransactionNotificationRead')
  async handleMarkTransactionNotificationRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() notificationId: string,
  ) {
    try {
      await this.notificationsService.markTransactionNotificationRead(
        notificationId,
      );
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Error marking transaction notification read: ${error.message}`,
      );
      return { error: 'Failed to mark transaction notification as read' };
    }
  }

  @OnEvent('notification.created')
  handleNotificationCreated(payload: any) {
    this.server.to(`user-${payload.userId}`).emit('notification', payload);
  }

  @OnEvent('transaction.notification')
  handleTransactionNotification(payload: any) {
    // Emit to specific user
    this.server
      .to(`user-${payload.userId}`)
      .emit('transactionNotification', payload);

    // Also emit to anyone subscribed to this transaction
    this.server
      .to(`transaction-${payload.transactionId}`)
      .emit('transactionUpdate', payload);
  }
}
