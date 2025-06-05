import { Injectable, HttpException } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';

export interface NotificationPayload {
  userId: string;
  email: string;
  message: string;
  type: 'welcome' | 'update' | 'deletion';
}

export interface NotificationResponse {
  success: boolean;
  messageId: string;
  timestamp: string;
}

@Injectable()
export class NotificationService {
  private readonly baseUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3001';

  async sendNotification(payload: NotificationPayload): Promise<NotificationResponse> {
    try {
      const response: AxiosResponse<NotificationResponse> = await axios.post(
        `${this.baseUrl}/notifications`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': process.env.NOTIFICATION_API_KEY,
          },
          timeout: 5000,
        }
      );

      return response.data;
    } catch (error) {
      throw new HttpException(
        `Failed to send notification: ${error.message}`,
        error.response?.status || 500
      );
    }
  }

  async getNotificationStatus(messageId: string): Promise<{ status: string; deliveredAt?: string }> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/notifications/${messageId}/status`,
        {
          headers: {
            'X-API-Key': process.env.NOTIFICATION_API_KEY,
          },
          timeout: 3000,
        }
      );

      return response.data;
    } catch (error) {
      throw new HttpException(
        `Failed to get notification status: ${error.message}`,
        error.response?.status || 500
      );
    }
  }
}
