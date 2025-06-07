import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

describe('UserController', () => {
  let controller: UserController;
  let service: jest.Mocked<UserService>;

  const mockUser: User = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '1234567890',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get(UserService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a user and return success response', async () => {
      const createUserDto: CreateUserDto = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
      };
      service.create.mockResolvedValue(mockUser);

      const result = await controller.create(createUserDto);

      expect(service.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual({
        statusCode: HttpStatus.CREATED,
        message: 'User created successfully',
        data: mockUser,
      });
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const users = [mockUser];
      service.findAll.mockResolvedValue(users);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        message: 'Users retrieved successfully',
        data: users,
      });
    });
  });

  describe('findOne', () => {
    it('should return a single user', async () => {
      service.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne('1');

      expect(service.findOne).toHaveBeenCalledWith('1');
      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        message: 'User retrieved successfully',
        data: mockUser,
      });
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updateUserDto: UpdateUserDto = { name: 'Jane Doe' };
      const updatedUser = { ...mockUser, name: 'Jane Doe' };
      service.update.mockResolvedValue(updatedUser);

      const result = await controller.update('1', updateUserDto);

      expect(service.update).toHaveBeenCalledWith('1', updateUserDto);
      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        message: 'User updated successfully',
        data: updatedUser,
      });
    });
  });

  describe('remove', () => {
    it('should delete a user', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove('1');

      expect(service.remove).toHaveBeenCalledWith('1');
      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        message: 'User deleted successfully',
      });
    });
  });
});
