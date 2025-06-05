import { Test, TestingModule } from '@nestjs/testing';
import { Pact } from '@pact-foundation/pact';
import { NotificationService, NotificationPayload } from '../../src/external/notification.service';
import { HttpException } from '@nestjs/common';
import * as path from 'path';

describe('NotificationService Contract Tests', () => {
  let service: NotificationService;
  let provider: Pact;

  beforeAll(async () => {
    provider = new Pact({
      consumer: 'user-service',
      provider: 'notification-service',
      port: 1234,
      log: path.resolve(process.cwd(), 'logs', 'pact.log'),
      dir: path.resolve(process.cwd(), 'pacts'),
      logLevel: 'INFO',
    });

    await provider.setup();

    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationService],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    
    // Override the base URL to use the mock server
    (service as any).baseUrl = `http://localhost:1234`;
  });

  afterAll(async () => {
    await provider.finalize();
  });

  afterEach(async () => {
    await provider.verify();
  });

  describe('sendNotification', () => {
    it('should send notification successfully', async () => {
      const notificationPayload: NotificationPayload = {
        userId: '123',
        email: 'test@example.com',
        message: 'Welcome to our service!',
        type: 'welcome',
      };

      const expectedResponse = {
        success: true,
        messageId: 'msg-123456',
        timestamp: '2024-01-01T12:00:00Z',
      };

      await provider
        .given('notification service is available')
        .uponReceiving('a valid notification request')
        .withRequest({
          method: 'POST',
          path: '/notifications',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'test-api-key',
          },
          body: notificationPayload,
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: expectedResponse,
        });

      process.env.NOTIFICATION_API_KEY = 'test-api-key';
      const result = await service.sendNotification(notificationPayload);

      expect(result).toEqual(expectedResponse);
    });

    it('should handle notification service errors', async () => {
      const notificationPayload: NotificationPayload = {
        userId: '456',
        email: 'invalid@example.com',
        message: 'Test message',
        type: 'update',
      };

      await provider
        .given('notification service returns error')
        .uponReceiving('an invalid notification request')
        .withRequest({
          method: 'POST',
          path: '/notifications',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'test-api-key',
          },
          body: notificationPayload,
        })
        .willRespondWith({
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            error: 'Invalid email address',
            code: 'INVALID_EMAIL',
          },
        });

      await expect(service.sendNotification(notificationPayload))
        .rejects.toThrow(HttpException);
    });
  });

  describe('getNotificationStatus', () => {
    it('should get notification status successfully', async () => {
      const messageId = 'msg-123456';
      const expectedResponse = {
        status: 'delivered',
        deliveredAt: '2024-01-01T12:05:00Z',
      };

      await provider
        .given('notification exists with given messageId')
        .uponReceiving('a request for notification status')
        .withRequest({
          method: 'GET',
          path: `/notifications/${messageId}/status`,
          headers: {
            'X-API-Key': 'test-api-key',
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: expectedResponse,
        });

      const result = await service.getNotificationStatus(messageId);

      expect(result).toEqual(expectedResponse);
    });

    it('should handle non-existent notification', async () => {
      const messageId = 'non-existent-id';

      await provider
        .given('notification does not exist')
        .uponReceiving('a request for non-existent notification status')
        .withRequest({
          method: 'GET',
          path: `/notifications/${messageId}/status`,
          headers: {
            'X-API-Key': 'test-api-key',
          },
        })
        .willRespondWith({
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            error: 'Notification not found',
            code: 'NOT_FOUND',
          },
        });

      await expect(service.getNotificationStatus(messageId))
        .rejects.toThrow(HttpException);
    });
  });
});
