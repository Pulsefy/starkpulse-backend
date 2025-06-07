import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

describe('User Service Integration', () => {
  let service: UserService;
  let repository: UserRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, UserRepository],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<UserRepository>(UserRepository);
  });

  afterEach(async () => {
    // Clear repository data between tests
    (repository as any).users = [];
  });

  describe('User CRUD Operations', () => {
    it('should create, read, update, and delete a user', async () => {
      const createUserDto: CreateUserDto = {
        name: 'Integration Test User',
        email: 'integration@test.com',
        phone: '1234567890',
      };

      // Create user
      const createdUser = await service.create(createUserDto);
      expect(createdUser).toHaveProperty('id');
      expect(createdUser.name).toBe(createUserDto.name);
      expect(createdUser.email).toBe(createUserDto.email);

      // Read user
      const foundUser = await service.findOne(createdUser.id);
      expect(foundUser).toEqual(createdUser);

      // Update user
      const updateUserDto: UpdateUserDto = { name: 'Updated Name' };
      const updatedUser = await service.update(createdUser.id, updateUserDto);
      expect(updatedUser.name).toBe(updateUserDto.name);
      expect(updatedUser.email).toBe(createUserDto.email);

      // List users
      const allUsers = await service.findAll();
      expect(allUsers).toHaveLength(1);
      expect(allUsers[0]).toEqual(updatedUser);

      // Delete user
      await service.remove(createdUser.id);
      await expect(service.findOne(createdUser.id)).rejects.toThrow(NotFoundException);
    });

    it('should prevent duplicate email registration', async () => {
      const createUserDto: CreateUserDto = {
        name: 'First User',
        email: 'duplicate@test.com',
        phone: '1234567890',
      };

      await service.create(createUserDto);

      const duplicateUserDto: CreateUserDto = {
        name: 'Second User',
        email: 'duplicate@test.com',
        phone: '9876543210',
      };

      await expect(service.create(duplicateUserDto)).rejects.toThrow(ConflictException);
    });
  });
});
