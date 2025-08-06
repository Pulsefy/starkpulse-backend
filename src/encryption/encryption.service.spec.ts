import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from './encryption.service';
import { KeyManagementService } from './key-management.service';
import { createCipheriv, createDecipheriv } from 'crypto';

jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => Buffer.from('mockiv1234567890')), // 16 bytes IV
  createCipheriv: jest.fn(() => ({
    update: jest.fn((text, enc, format) => {
      if (text === 'testdata') return 'encryptedpart1';
      if (text === 'encryptedpart1') return 'decryptedpart1';
      return '';
    }),
    final: jest.fn(() => 'encryptedpart2'),
    getAuthTag: jest.fn(() => Buffer.from('mockauthtag123')), // 16 bytes auth tag
  })),
  createDecipheriv: jest.fn(() => ({
    update: jest.fn((text, enc, format) => {
      if (text === 'encryptedpart1') return 'decryptedpart1';
      return '';
    }),
    final: jest.fn(() => 'decryptedpart2'),
    setAuthTag: jest.fn(),
  })),
}));

describe('EncryptionService (Unit Tests)', () => {
  let encryptionService: EncryptionService;
  let keyManagementService: KeyManagementService;

  const MOCK_KEY = Buffer.from('k'.repeat(32)); // 32 bytes
  const MOCK_IV = Buffer.from('i'.repeat(16)); // 16 bytes
  const MOCK_ALGORITHM = 'aes-256-gcm';
  const MOCK_AUTH_TAG = Buffer.from('t'.repeat(16));

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: KeyManagementService,
          useValue: {
            getCurrentKey: jest.fn(() => MOCK_KEY),
            getCurrentIv: jest.fn(() => MOCK_IV),
            getAlgorithm: jest.fn(() => MOCK_ALGORITHM),
          },
        },
      ],
    }).compile();

    encryptionService = module.get<EncryptionService>(EncryptionService);
    keyManagementService =
      module.get<KeyManagementService>(KeyManagementService);
  });

  it('should be defined', () => {
    expect(encryptionService).toBeDefined();
  });

  describe('encrypt', () => {
    it('should encrypt a given string', () => {
      const plainText = 'sensitive data';
      const encrypted = encryptionService.encrypt(plainText);

      expect(encrypted).toMatch(/^[0-9a-fA-F]+:[0-9a-fA-F]+:[0-9a-fA-F]+$/);

      expect(keyManagementService.getCurrentKey).toHaveBeenCalled();
      expect(keyManagementService.getCurrentIv).toHaveBeenCalled();
      expect(keyManagementService.getAlgorithm).toHaveBeenCalled();
      expect(createCipheriv).toHaveBeenCalledWith(
        MOCK_ALGORITHM,
        MOCK_KEY,
        MOCK_IV,
      );
    });

    it('should throw an error if encryption fails', () => {
      (createCipheriv as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Cipher creation failed');
      });

      expect(() => encryptionService.encrypt('data')).toThrow(
        'Failed to encrypt data.',
      );
    });
  });

  describe('decrypt', () => {
    it('should decrypt a given encrypted string', () => {
      // Simulate an encrypted string from our mock
      const mockEncrypted = `${MOCK_IV.toString('hex')}:encryptedpart1encryptedpart2:${MOCK_AUTH_TAG.toString('hex')}`;
      const decrypted = encryptionService.decrypt(mockEncrypted);

      expect(decrypted).toBe('decryptedpart1decryptedpart2');

      // Verify that crypto functions were called
      expect(keyManagementService.getCurrentKey).toHaveBeenCalled();
      expect(keyManagementService.getCurrentIv).toHaveBeenCalled();
      expect(keyManagementService.getAlgorithm).toHaveBeenCalled();
      expect(createDecipheriv).toHaveBeenCalledWith(
        MOCK_ALGORITHM,
        MOCK_KEY,
        MOCK_IV,
      );
    });

    it('should throw an error for invalid encrypted data format', () => {
      expect(() => encryptionService.decrypt('invalid_format')).toThrow(
        'Invalid encrypted data format.',
      );
      expect(() => encryptionService.decrypt('iv:encrypted')).toThrow(
        'Invalid encrypted data format.',
      );
    });

    it('should throw an error if decryption fails', () => {
      const mockEncrypted = `${MOCK_IV.toString('hex')}:encryptedpart1encryptedpart2:${MOCK_AUTH_TAG.toString('hex')}`;
      // Force createDecipheriv to throw an error
      (createDecipheriv as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Decipher creation failed');
      });

      expect(() => encryptionService.decrypt(mockEncrypted)).toThrow(
        'Failed to decrypt data. Key mismatch or corrupted data.',
      );
    });
  });

  describe('encryptFileContent and decryptFileContent', () => {
    it('should simulate encrypting and decrypting file content', async () => {
      const content = 'This is content for a file.';
      const encrypted = await encryptionService.encryptFileContent(content);
      const decrypted = await encryptionService.decryptFileContent(encrypted);

      expect(decrypted).toBe('decryptedpart1decryptedpart2');
      expect(encrypted).toMatch(/^[0-9a-fA-F]+:[0-9a-fA-F]+:[0-9a-fA-F]+$/);
    });
  });
});
