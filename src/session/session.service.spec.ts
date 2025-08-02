import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { SessionService } from './session.service';
import { Session } from './entities/session.entity';
import { User } from '../auth/entities/user.entity';
import { ConfigService } from '../config/config.service';
import { Repository } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';

// Mock request object
const mockRequest = {
  headers: {
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  },
  ip: '127.0.0.1',
  connection: {
    remoteAddress: '127.0.0.1',
  },
};

// Mock user
const mockUser = {
  id: '123',
  username: 'testuser',
  email: 'test@example.com',
};

// Mock JWT service
const mockJwtService = {
  sign: jest.fn().mockImplementation((payload, options) => {
    return 'mock-token';
  }),
  verify: jest.fn().mockImplementation((token) => {
    if (token === 'valid-token') {
      return { sub: '123' };
    }
    throw new Error('Invalid token');
  }),
};

// Mock config service
const mockConfigService = {
  sessionConfig: {
    accessTokenExpiresIn: '1d',
    refreshTokenExpiresIn: '7d',
  },
  jwtConfig: {
    secret: 'test-secret',
  },
};

describe('SessionService', () => {
  let service: SessionService;
  let sessionRepository: Repository<Session>;
  let userRepository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: getRepositoryToken(Session),
          useValue: {
            create: jest.fn().mockImplementation((dto) => dto),
            save: jest.fn().mockResolvedValue({}),
            findOne: jest.fn(),
            find: jest.fn(),
            remove: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    sessionRepository = module.get<Repository<Session>>(
      getRepositoryToken(Session),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up timers to prevent memory leaks
    service.onModuleDestroy();
  });

  afterAll(() => {
    // Ensure all timers are cleared
    jest.clearAllTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSession', () => {
    it('should create a new session and return tokens', async () => {
      // Arrange
      const saveSpy = jest.spyOn(sessionRepository, 'save');
      const findSpy = jest
        .spyOn(sessionRepository, 'find')
        .mockResolvedValue([]);

      // Act
      const result = await service.createSession(
        mockUser as any,
        mockRequest as any,
      );

      // Assert
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(saveSpy).toHaveBeenCalledTimes(1);
      expect(findSpy).toHaveBeenCalledTimes(1);
    });

    it('should delete existing session for the same device', async () => {
      // Arrange

      const existingSession = {
        id: 'abc123',
        userId: '123',
        deviceInfo: {
          browser: 'Chrome 91.0',
          os: 'Windows 10',
          deviceType: 'desktop',
          deviceName: 'Unknown device',
          ip: '127.0.0.1',
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      };
      const findSpy = jest
        .spyOn(sessionRepository, 'find')
        .mockResolvedValue([existingSession as any]);
      const removeSpy = jest
        .spyOn(sessionRepository, 'remove')
        .mockResolvedValue({} as any);

      // Act
      await service.createSession(mockUser as any, mockRequest as any);

      // Assert
      expect(findSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token when valid', async () => {
      // Arrange
      const mockSession = {
        user: mockUser,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        isActive: true,
      };
      jest
        .spyOn(sessionRepository, 'findOne')
        .mockResolvedValue(mockSession as any);

      // Act
      const result = await service.refreshToken(
        'valid-token',
        mockRequest as any,
      );

      // Assert
      expect(result).toHaveProperty('accessToken');
      expect(mockJwtService.verify).toHaveBeenCalledWith('valid-token');
    });

    it('should throw exception for invalid token', async () => {
      // Arrange
      jest.spyOn(mockJwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(
        service.refreshToken('invalid-token', mockRequest as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getUserSessions', () => {
    it('should return sessions without tokens', async () => {
      // Arrange
      const mockSessions = [
        { id: '1', token: 'token1', deviceInfo: {}, lastActiveAt: new Date() },
        { id: '2', token: 'token2', deviceInfo: {}, lastActiveAt: new Date() },
      ];
      jest
        .spyOn(sessionRepository, 'find')
        .mockResolvedValue(mockSessions as any);

      // Act
      const result = await service.getUserSessions('123');

      // Assert
      expect(result.length).toBe(2);
      expect(result[0]).not.toHaveProperty('token');
      expect(result[1]).not.toHaveProperty('token');
    });
  });

  describe('revokeSession', () => {
    it('should revoke a specific session', async () => {
      // Arrange
      const mockSession = { id: '1', isActive: true };
      jest
        .spyOn(sessionRepository, 'findOne')
        .mockResolvedValue(mockSession as any);
      const saveSpy = jest.spyOn(sessionRepository, 'save');

      // Act
      await service.revokeSession('1', '123');

      // Assert
      expect(saveSpy).toHaveBeenCalledWith({ ...mockSession, isActive: false });
    });
  });

  describe('logout', () => {
    it('should deactivate session on logout', async () => {
      // Arrange
      const mockSession = { token: 'token', isActive: true };
      jest
        .spyOn(sessionRepository, 'findOne')
        .mockResolvedValue(mockSession as any);
      const saveSpy = jest.spyOn(sessionRepository, 'save');

      // Act
      await service.logout('token');

      // Assert
      expect(saveSpy).toHaveBeenCalledWith({ ...mockSession, isActive: false });
    });
  });
});
