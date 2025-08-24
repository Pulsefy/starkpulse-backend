import { Test, TestingModule } from '@nestjs/testing';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';

// Mock session service
const mockSessionService = {
  getUserSessions: jest.fn(),
  refreshToken: jest.fn(),
  revokeSession: jest.fn(),
  revokeAllOtherSessions: jest.fn(),
  logout: jest.fn(),
};

// Mock user
const mockUser = {
  id: '123',
  username: 'testuser',
  email: 'test@example.com',
};

// Mock sessions
const mockSessions = [
  {
    id: '1',
    deviceInfo: {
      browser: 'Chrome 91.0',
      os: 'Windows 10',
      deviceType: 'desktop',
      ip: '127.0.0.1',
    },
    lastActiveAt: new Date(),
    createdAt: new Date(),
  },
  {
    id: '2',
    deviceInfo: {
      browser: 'Safari 14.0',
      os: 'iOS 14',
      deviceType: 'mobile',
      ip: '192.168.1.1',
    },
    lastActiveAt: new Date(),
    createdAt: new Date(),
  },
];

describe('SessionController', () => {
  let controller: SessionController;
  let service: SessionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionController],
      providers: [
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
      ],
    }).compile();

    controller = module.get<SessionController>(SessionController);
    service = module.get<SessionService>(SessionService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUserSessions', () => {
    it('should return active sessions for the current user', async () => {
      // Arrange
      mockSessionService.getUserSessions.mockResolvedValue(mockSessions);

      // Act
      const result = await controller.getUserSessions(mockUser);

      // Assert
      expect(result.length).toBe(2);
      expect(mockSessionService.getUserSessions).toHaveBeenCalledWith(
        mockUser.id,
      );
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('deviceInfo');
      expect(result[0]).toHaveProperty('lastActiveAt');
    });
  });

  describe('refreshToken', () => {
    it('should use refresh token from body if not in cookies', async () => {
      // Arrange
      const mockRequest = {
        cookies: {},
        body: { refreshToken: 'valid-refresh-token' },
      };
      mockSessionService.refreshToken.mockResolvedValue({
        accessToken: 'new-access-token',
      });

      // Act
      const result = await controller.refreshToken(mockRequest as any);

      // Assert
      expect(mockSessionService.refreshToken).toHaveBeenCalledWith(
        'valid-refresh-token',
        mockRequest,
      );
    });

    it('should return error message if no refresh token provided', async () => {
      // Arrange
      const mockRequest = {
        cookies: {},
        body: {},
      };

      // Act
      const result = await controller.refreshToken(mockRequest as any);

      // Assert
      expect(result).toHaveProperty('message', 'Refresh token is required');
      expect(mockSessionService.refreshToken).not.toHaveBeenCalled();
    });
  });

  describe('revokeSession', () => {
    it('should revoke a specific session', async () => {
      // Arrange
      mockSessionService.revokeSession.mockResolvedValue(undefined);

      // Act
      await controller.revokeSession('1', mockUser);

      // Assert
      expect(mockSessionService.revokeSession).toHaveBeenCalledWith(
        '1',
        mockUser.id,
      );
    });
  });

  describe('revokeAllOtherSessions', () => {
    it('should revoke all other sessions', async () => {
      // Arrange
      mockSessionService.revokeAllOtherSessions.mockResolvedValue(undefined);

      // Act
      await controller.revokeAllOtherSessions('current-id', mockUser);

      // Assert
      expect(mockSessionService.revokeAllOtherSessions).toHaveBeenCalledWith(
        mockUser.id,
        'current-id',
      );
    });
  });
});
