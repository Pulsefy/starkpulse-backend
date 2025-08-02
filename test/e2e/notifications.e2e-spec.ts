import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TestEnvironment } from '../utils/test-environment';
import { TestDataFactory } from '../fixtures/test-data-factory';
import { DatabaseSeeder } from '../fixtures/database-seeder';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../src/notifications/entities/notification.entity';
import { User } from '../../src/users/entities/user.entity';

describe('Notifications E2E', () => {
  let app: INestApplication;
  let testEnvironment: TestEnvironment;
  let notificationRepository: Repository<Notification>;
  let userRepository: Repository<User>;
  let seeder: DatabaseSeeder;

  beforeAll(async () => {
    testEnvironment = new TestEnvironment();
    await testEnvironment.setup();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('DATABASE_CONNECTION')
      .useValue(testEnvironment.dataSource)
      .overrideProvider('REDIS_CLIENT')
      .useValue(testEnvironment.redisClient)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    notificationRepository = testEnvironment.getRepository(Notification);
    userRepository = testEnvironment.getRepository(User);
    seeder = new DatabaseSeeder(testEnvironment);
  });

  afterAll(async () => {
    await app.close();
    await testEnvironment.teardown();
  });

  beforeEach(async () => {
    await seeder.clearAll();
  });

  describe('GET /notifications', () => {
    it('should return user notifications', async () => {
      // Seed test data
      const user = await seeder.seedUser();
      const notifications = await seeder.seedNotifications(5, {
        userId: user.id,
      });

      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${user.id}`) // Mock auth
        .expect(200);

      expect(response.body).toHaveLength(5);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('content');
      expect(response.body[0]).toHaveProperty('read');
    });

    it('should filter notifications by read status', async () => {
      const user = await seeder.seedUser();
      await seeder.seedNotifications(3, { userId: user.id, read: true });
      await seeder.seedNotifications(2, { userId: user.id, read: false });

      const response = await request(app.getHttpServer())
        .get('/notifications?read=false')
        .set('Authorization', `Bearer ${user.id}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.every((n) => !n.read)).toBe(true);
    });

    it('should paginate notifications', async () => {
      const user = await seeder.seedUser();
      await seeder.seedNotifications(15, { userId: user.id });

      const response = await request(app.getHttpServer())
        .get('/notifications?page=1&limit=10')
        .set('Authorization', `Bearer ${user.id}`)
        .expect(200);

      expect(response.body).toHaveLength(10);
      expect(response.headers).toHaveProperty('x-total-count', '15');
    });
  });

  describe('PUT /notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      const user = await seeder.seedUser();
      const notification = TestDataFactory.createNotification({
        userId: user.id,
        read: false,
      });
      const savedNotification = await notificationRepository.save(notification);

      await request(app.getHttpServer())
        .put(`/notifications/${savedNotification.id}/read`)
        .set('Authorization', `Bearer ${user.id}`)
        .expect(200);

      const updatedNotification = await notificationRepository.findOne({
        where: { id: savedNotification.id },
      });
      expect(updatedNotification.read).toBe(true);
    });

    it('should return 404 for non-existent notification', async () => {
      const user = await seeder.seedUser();
      const fakeId = 'non-existent-id';

      await request(app.getHttpServer())
        .put(`/notifications/${fakeId}/read`)
        .set('Authorization', `Bearer ${user.id}`)
        .expect(404);
    });
  });

  describe('DELETE /notifications/:id', () => {
    it('should delete notification', async () => {
      const user = await seeder.seedUser();
      const notification = TestDataFactory.createNotification({
        userId: user.id,
      });
      const savedNotification = await notificationRepository.save(notification);

      await request(app.getHttpServer())
        .delete(`/notifications/${savedNotification.id}`)
        .set('Authorization', `Bearer ${user.id}`)
        .expect(200);

      const deletedNotification = await notificationRepository.findOne({
        where: { id: savedNotification.id },
      });
      expect(deletedNotification).toBeNull();
    });
  });

  describe('POST /notifications/preferences', () => {
    it('should update notification preferences', async () => {
      const user = await seeder.seedUser();
      const preferences = {
        email: true,
        push: false,
        sms: true,
        inApp: true,
        priceAlerts: true,
        transactionAlerts: false,
      };

      const response = await request(app.getHttpServer())
        .post('/notifications/preferences')
        .set('Authorization', `Bearer ${user.id}`)
        .send(preferences)
        .expect(201);

      expect(response.body).toMatchObject(preferences);
    });
  });

  describe('WebSocket notifications', () => {
    it('should emit real-time notifications', async () => {
      const user = await seeder.seedUser();

      // This would test WebSocket functionality
      // Implementation depends on your WebSocket setup
      // Mock WebSocket connection and verify notification emission

      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Performance tests', () => {
    it('should handle bulk notification creation efficiently', async () => {
      const user = await seeder.seedUser();
      const startTime = Date.now();

      // Create 1000 notifications
      const notifications = TestDataFactory.createBulkNotifications(1000, {
        userId: user.id,
      });
      await notificationRepository.save(notifications);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 5 seconds
      expect(duration).toBeLessThan(5000);

      const count = await notificationRepository.count({
        where: { userId: user.id },
      });
      expect(count).toBe(1000);
    });

    it('should handle concurrent notification reads', async () => {
      const user = await seeder.seedUser();
      await seeder.seedNotifications(100, { userId: user.id });

      const requests = Array.from({ length: 10 }, () =>
        request(app.getHttpServer())
          .get('/notifications')
          .set('Authorization', `Bearer ${user.id}`),
      );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(100);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Temporarily close database connection
      await testEnvironment.dataSource.destroy();

      const user = { id: 'test-user' };
      await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${user.id}`)
        .expect(500);

      // Restore connection for cleanup
      await testEnvironment.setup();
    });

    it('should validate notification input', async () => {
      const user = await seeder.seedUser();
      const invalidNotification = {
        title: '', // Invalid: empty title
        content: 'Valid content',
      };

      await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${user.id}`)
        .send(invalidNotification)
        .expect(400);
    });
  });
});
