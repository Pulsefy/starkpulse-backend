import { Test, TestingModule } from '@nestjs/testing';
import * as nock from 'nock';
import { NotificationService, NotificationPayload } from '../../src/external/notification.service';
import { HttpException } from '@nestjs/common';

describe('NotificationService Mock Contract Tests', () => {
  let service: NotificationService;
  const baseUrl = 'http://localhost:3001';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationService],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    process.env.NOTIFICATION_SERVICE_URL = baseUrl;
    process.env.NOTIFICATION_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('API Contract Validation', () => {
    it('should validate notification request schema', async () => {
      const payload: NotificationPayload = {
        userId: '123',
        email: 'test@example.com',
        message: 'Welcome!',
        type: 'welcome',
      };

      const mockResponse = {
        success: true,
        messageId: 'msg-123',
        timestamp: '2024-01-01T12:00:00Z',
      };

      nock(baseUrl)
        .post('/notifications', (body) => {
          // Validate request schema
          expect(body).toHaveProperty('userId');
          expect(body).toHaveProperty('email');
          expect(body).toHaveProperty('message');
          expect(body).toHaveProperty('type');
          expect(['welcome', 'update', 'deletion']).toContain(body.type);
          return true;
        })
        .matchHeader('Content-Type', 'application/json')
        .matchHeader('X-API-Key', 'test-api-key')
        .reply(200, mockResponse);

      const result = await service.sendNotification(payload);
      expect(result).toEqual(mockResponse);
    });

    it('should validate response schema', async () => {
      const payload: NotificationPayload = {
        userId: '123',
        email: 'test@example.com',
        message: 'Test',
        type: 'update',
      };

      nock(baseUrl)
        .post('/notifications')
        .reply(200, {
          success: true,
          messageId: 'msg-456',
          timestamp: '2024-01-01T12:00:00Z',
        });

      const result = await service.sendNotification(payload);

      // Validate response schema
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('messageId');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.messageId).toBe('string');
      expect(typeof result.timestamp).toBe('string');
    });

    it('should handle timeout scenarios', async () => {
      const payload: NotificationPayload = {
        userId: '123',
        email: 'test@example.com',
        message: 'Test',
        type: 'welcome',
      };

      nock(baseUrl)
        .post('/notifications')
        .delay(6000) // Longer than the 5 second timeout
        .reply(200, { success: true });

      await expect(service.sendNotification(payload))
        .rejects.toThrow('timeout');
    });

    it('should validate error response format', async () => {
      const payload: NotificationPayload = {
        userId: '123',
        email: 'invalid-email',
        message: 'Test',
        type: 'welcome',
      };

      nock(baseUrl)
        .post('/notifications')
        .reply(400, {
          error: 'Invalid email format',
          code: 'VALIDATION_ERROR',
        });

      await expect(service.sendNotification(payload))
        .rejects.toThrow(HttpException);
    });
  });

  describe('Status Endpoint Contract', () => {
    it('should validate status response schema', async () => {
      const messageId = 'msg-123';

      nock(baseUrl)
        .get(`/notifications/${messageId}/status`)
        .matchHeader('X-API-Key', 'test-api-key')
        .reply(200, {
          status: 'delivered',
          deliveredAt: '2024-01-01T12:05:00Z',
        });

      const result = await service.getNotificationStatus(messageId);

      expect(result).toHaveProperty('status');
      expect(['pending', 'delivered', 'failed']).toContain(result.status);
      if (result.deliveredAt) {
        expect(typeof result.deliveredAt).toBe('string');
      }
    });
  });
});
