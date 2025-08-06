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
import { Logger, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { WsJwtAuthGuard } from 'src/auth/guards/ws-jwt-auth.guard';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@UseGuards(WsJwtAuthGuard) 
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);
  private userSocketMap = new Map<string, Set<string>>();
  private messageBuffer: Map<string, any[]> = new Map(); // userId -> messages[]
  private batchInterval = 1000; // 1 second

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly jwtService: JwtService,
  ) {
    this.startBatching();
  }

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
      client.data.userId = userId;

      if (!this.userSocketMap.has(userId)) {
        this.userSocketMap.set(userId, new Set());
      }

      const socketSet = this.userSocketMap.get(userId);
      socketSet?.add(client.id);

      client.join(`user-${userId}`);
      this.logger.log(`Client connected: ${client.id} for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Socket authentication error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
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
      const userId = this.extractUserId(client);
      const notifications = await this.notificationsService.findAll(
        userId,
        data,
      );
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
      const userId = this.extractUserId(client);
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
      await this.notificationsService.markAsRead(
        notificationId,
        client.data.userId,
      );
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
    // Queue batched message for the user
    this.queueBatchedMessage(payload.userId, {
      type: 'notification',
      data: payload,
    });
  }

  @OnEvent('transaction.notification')
  handleTransactionNotification(payload: any) {
    this.queueBatchedMessage(payload.userId, {
      type: 'transactionNotification',
      data: payload,
    });

    this.server
      .to(`transaction-${payload.transactionId}`)
      .emit('transactionUpdate', payload);
  }

  private queueBatchedMessage(userId: string, message: any) {
    if (!this.messageBuffer.has(userId)) {
      this.messageBuffer.set(userId, []);
    }
    this.messageBuffer.get(userId)?.push(message);
  }

  private startBatching() {
    setInterval(() => {
      this.messageBuffer.forEach((messages, userId) => {
        if (messages.length > 0) {
          this.server.to(`user-${userId}`).emit('batchedNotifications', messages);
          this.logger.log(
            `Sent ${messages.length} batched notifications to user-${userId}`,
          );
          this.messageBuffer.set(userId, []);
        }
      });
    }, this.batchInterval);
  }

  private extractUserId(client: Socket): string {
    const token =
      client.handshake.auth.token ||
      client.handshake.headers.authorization?.split(' ')[1];
    const payload = this.jwtService.verify(token);
    return payload.sub;
  }
}
