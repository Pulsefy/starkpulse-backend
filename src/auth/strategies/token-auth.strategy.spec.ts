import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { TokenAuthStrategy } from './token-auth.strategy';
import { BlockchainService } from '../../blockchain/services/blockchain.service';
import { UsersService } from '../../users/users.service';
import { ConfigService } from '@nestjs/config';

describe('TokenAuthStrategy', () => {
  let strategy: TokenAuthStrategy;
  let blockchainService: BlockchainService;
  let usersService: UsersService;
  let configService: ConfigService;

  const mockBlockchainService = {
    verifySignature: jest.fn(),
    getTokenBalance: jest.fn(),
  };

  const mockUsersService = {
    findByWalletAddress: jest.fn(),
    createWithWalletAddress: jest.fn(),
    updateLastLogin: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenAuthStrategy,
        {
          provide: BlockchainService,
          useValue: mockBlockchainService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<TokenAuthStrategy>(TokenAuthStrategy);
    blockchainService = module.get<BlockchainService>(BlockchainService);
    usersService = module.get<UsersService>(UsersService);
    configService = module.get<ConfigService>(ConfigService);

    // Default config values
    mockConfigService.get.mockImplementation((key) => {
      const config = {
        AUTH_MIN_TOKEN_BALANCE: 1,
        AUTH_MESSAGE_PREFIX: 'StarkPulse Authentication:',
        AUTH_MESSAGE_EXPIRATION: 300,
      };
      return config[key];
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    const mockRequest = {
      body: {
        walletAddress: '0x1234567890abcdef',
        signature: '0xsignature',
        message: 'StarkPulse Authentication:1634567890:randomnonce',
      },
    };

    const mockUser = {
      id: 'user-id',
      walletAddress: '0x1234567890abcdef',
      status: 'ACTIVE',
    };

    beforeEach(() => {
      // Mock Date.now to return a fixed timestamp for testing
      jest.spyOn(Date, 'now').mockImplementation(() => 1634567990000); // 100 seconds after the message timestamp
    });

    it('should authenticate a user with valid credentials', async () => {
      mockBlockchainService.verifySignature.mockResolvedValue(true);
      mockUsersService.findByWalletAddress.mockResolvedValue(mockUser);
      mockBlockchainService.getTokenBalance.mockResolvedValue(10);

      const result = await strategy.validate(mockRequest as any);

      expect(result).toEqual(mockUser);
      expect(mockBlockchainService.verifySignature).toHaveBeenCalledWith(
        mockRequest.body.walletAddress,
        mockRequest.body.message,
        mockRequest.body.signature,
      );
      expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
    });

    it('should create a new user if not found', async () => {
      mockBlockchainService.verifySignature.mockResolvedValue(true);
      mockUsersService.findByWalletAddress.mockResolvedValue(null);
      mockUsersService.createWithWalletAddress.mockResolvedValue(mockUser);
      mockBlockchainService.getTokenBalance.mockResolvedValue(10);

      const result = await strategy.validate(mockRequest as any);

      expect(result).toEqual(mockUser);
      expect(mockUsersService.createWithWalletAddress).toHaveBeenCalledWith(
        mockRequest.body.walletAddress,
      );
    });

    it('should throw UnauthorizedException if missing credentials', async () => {
      const invalidRequest = {
        body: {
          walletAddress: '0x1234567890abcdef',
          // Missing signature and message
        },
      };

      await expect(strategy.validate(invalidRequest as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if signature is invalid', async () => {
      mockBlockchainService.verifySignature.mockResolvedValue(false);

      await expect(strategy.validate(mockRequest as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if token balance is insufficient', async () => {
      mockBlockchainService.verifySignature.mockResolvedValue(true);
      mockUsersService.findByWalletAddress.mockResolvedValue(mockUser);
      mockBlockchainService.getTokenBalance.mockResolvedValue(0);

      await expect(strategy.validate(mockRequest as any)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockBlockchainService.getTokenBalance).toHaveBeenCalledWith(
        mockRequest.body.walletAddress,
      );
    });

    it('should throw UnauthorizedException if user is banned', async () => {
      const bannedUser = { ...mockUser, status: 'BANNED' };
      mockBlockchainService.verifySignature.mockResolvedValue(true);
      mockUsersService.findByWalletAddress.mockResolvedValue(bannedUser);
      mockBlockchainService.getTokenBalance.mockResolvedValue(10);

      await expect(strategy.validate(mockRequest as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw BadRequestException if message format is invalid', async () => {
      const invalidMessageRequest = {
        body: {
          walletAddress: '0x1234567890abcdef',
          signature: '0xsignature',
          message: 'InvalidPrefix:1634567890:randomnonce',
        },
      };

      await expect(strategy.validate(invalidMessageRequest as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if message has expired', async () => {
      // Mock Date.now to return a timestamp far in the future
      jest.spyOn(Date, 'now').mockImplementation(() => 1634567890000 + 600000); // 600 seconds after the message timestamp

      await expect(strategy.validate(mockRequest as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if timestamp is invalid', async () => {
      const invalidTimestampRequest = {
        body: {
          walletAddress: '0x1234567890abcdef',
          signature: '0xsignature',
          message: 'StarkPulse Authentication:invalid:randomnonce',
        },
      };

      await expect(strategy.validate(invalidTimestampRequest as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should use configurable minimum token balance', async () => {
      mockConfigService.get.mockImplementation((key) => {
        const config = {
          AUTH_MIN_TOKEN_BALANCE: 5,
          AUTH_MESSAGE_PREFIX: 'StarkPulse Authentication:',
          AUTH_MESSAGE_EXPIRATION: 300,
        };
        return config[key];
      });

      // Re-initialize strategy to use new config
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TokenAuthStrategy,
          {
            provide: BlockchainService,
            useValue: mockBlockchainService,
          },
          {
            provide: UsersService,
            useValue: mockUsersService,
          },
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const configuredStrategy = module.get<TokenAuthStrategy>(TokenAuthStrategy);

      mockBlockchainService.verifySignature.mockResolvedValue(true);
      mockUsersService.findByWalletAddress.mockResolvedValue(mockUser);
      mockBlockchainService.getTokenBalance.mockResolvedValue(3);

      await expect(configuredStrategy.validate(mockRequest as any)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockBlockchainService.getTokenBalance).toHaveBeenCalledWith(
        mockRequest.body.walletAddress,
      );
    });
  });
});