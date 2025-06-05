import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { UserModule } from '../src/user/user.module';
import { ValidationPipe } from '@nestjs/common';

describe('UserController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [UserModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/users (POST)', () => {
    it('should create a new user', () => {
      const createUserDto = {
        name: 'E2E Test User',
        email: 'e2e@test.com',
        phone: '1234567890',
      };

      return request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.statusCode).toBe(201);
          expect(res.body.message).toBe('User created successfully');
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data.name).toBe(createUserDto.name);
        });
    });

    it('should return 400 for invalid data', () => {
      const invalidUserDto = {
        name: '',
        email: 'invalid-email',
      };

      return request(app.getHttpServer())
        .post('/users')
        .send(invalidUserDto)
        .expect(400);
    });
  });

  describe('/users (GET)', () => {
    it('should return empty array initially', () => {
      return request(app.getHttpServer())
        .get('/users')
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
          expect(res.body.data).toEqual([]);
        });
    });

    it('should return users after creation', async () => {
      const createUserDto = {
        name: 'Test User',
        email: 'test@example.com',
        phone: '1234567890',
      };

      // Create user first
      await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201);

      // Then fetch all users
      return request(app.getHttpServer())
        .get('/users')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(1);
          expect(res.body.data[0].name).toBe(createUserDto.name);
        });
    });
  });

  describe('/users/:id (GET)', () => {
    it('should return 404 for non-existent user', () => {
      return request(app.getHttpServer())
        .get('/users/non-existent-id')
        .expect(404);
    });
  });

  describe('User Workflow', () => {
    it('should complete full user lifecycle', async () => {
      const createUserDto = {
        name: 'Lifecycle User',
        email: 'lifecycle@test.com',
        phone: '1234567890',
      };

      // Create user
      const createResponse = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201);

      const userId = createResponse.body.data.id;

      // Get user
      await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.name).toBe(createUserDto.name);
        });

      // Update user
      const updateUserDto = { name: 'Updated Lifecycle User' };
      await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .send(updateUserDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.name).toBe(updateUserDto.name);
        });

      // Delete user
      await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .expect(200);

      // Verify deletion
      await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .expect(404);
    });
  });
});
