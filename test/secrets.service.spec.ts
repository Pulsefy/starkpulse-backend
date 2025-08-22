import { Test, TestingModule } from '@nestjs/testing';
import { SecretsService } from '../src/secrets/secrets.service';
import { VaultIntegrationService } from '../src/secrets/vault-integration.service';
import { UnauthorizedException } from '@nestjs/common';

// Mock the VaultIntegrationService to prevent actual HTTP calls to Vault
const mockVaultIntegrationService = {
  readSecret: jest.fn(),
  writeSecret: jest.fn(),
};

describe('SecretsService', () => {
  let service: SecretsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecretsService,
        {
          provide: VaultIntegrationService,
          useValue: mockVaultIntegrationService,
        },
      ],
    }).compile();

    service = module.get<SecretsService>(SecretsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSecret', () => {
    const userId = 'user-123';
    const path = 'test/secret';
    const role = 'admin';
    const mockSecret = { value: 'my-super-secret' };

    it('should successfully retrieve a secret when user has the required role', async () => {
      // Mock the successful read operation
      mockVaultIntegrationService.readSecret.mockResolvedValue(mockSecret);

      const secret = await service.getSecret(userId, path, role);

      expect(secret).toEqual(mockSecret);
      expect(mockVaultIntegrationService.readSecret).toHaveBeenCalledWith(path);
    });

    it('should throw UnauthorizedException when user does not have the required role', async () => {
      const unauthorizedUserId = 'unauthorized-user';
      const unauthorizedRole = 'guest';

      await expect(
        service.getSecret(unauthorizedUserId, path, unauthorizedRole),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockVaultIntegrationService.readSecret).not.toHaveBeenCalled();
    });
  });

  describe('SecretsRotationService Integration Test', () => {
    let rotationService: SecretsRotationService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SecretsRotationService,
          {
            provide: VaultIntegrationService,
            useValue: mockVaultIntegrationService,
          },
        ],
      }).compile();

      rotationService = module.get<SecretsRotationService>(
        SecretsRotationService,
      );
    });

    it('should rotate the secret by calling the writeSecret method', async () => {
      // Mock the successful write operation for rotation
      mockVaultIntegrationService.writeSecret.mockResolvedValue(undefined);

      await rotationService.handleCron();

      expect(mockVaultIntegrationService.writeSecret).toHaveBeenCalledTimes(1);
      // The first argument should be the path, and the second should be the new secret data.
      expect(mockVaultIntegrationService.writeSecret).toHaveBeenCalledWith(
        'api-keys/external-service',
        expect.objectContaining({ apiKey: expect.any(String) }),
      );
    });
  });
});
