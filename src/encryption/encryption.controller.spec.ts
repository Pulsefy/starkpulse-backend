import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { EncryptionModule } from './encryption.module';
import { EncryptionService } from './encryption.service';
import { KeyManagementService } from './key-management.service';

class MockUser {
  constructor(
    public id: string,
    public username: string,
    public encryptedEmail: string,
    public encryptedCreditCard: string,
  ) {}
  getDecryptedEmail = jest.fn();
  getDecryptedCreditCard = jest.fn();
}

class MockTransaction {
  constructor(
    public id: string,
    public userId: string,
    public amount: number,
    public encryptedDetails: string,
  ) {}
  getDecryptedDetails = jest.fn();
}

describe('EncryptionController (Integration Tests)', () => {
  let app: INestApplication;
  let encryptionService: EncryptionService;
  let keyManagementService: KeyManagementService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [EncryptionModule],
    })
      .overrideProvider(EncryptionService)
      .useValue({
        encrypt: jest.fn(),
        decrypt: jest.fn(),
        encryptFileContent: jest.fn(),
        decryptFileContent: jest.fn(),
      })
      .overrideProvider(KeyManagementService)
      .useValue({
        rotateKeyManually: jest.fn(),

        getCurrentKey: jest.fn(() => Buffer.from('k'.repeat(32))),
        getCurrentIv: jest.fn(() => Buffer.from('i'.repeat(16))),
        getAlgorithm: jest.fn(() => 'aes-256-gcm'),
        scheduleKeyRotation: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    encryptionService = moduleFixture.get<EncryptionService>(EncryptionService);
    keyManagementService =
      moduleFixture.get<KeyManagementService>(KeyManagementService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /encryption/encrypt', () => {
    it('should encrypt data', async () => {
      const mockData = 'secret data';
      const mockEncrypted = 'mock_encrypted_data';
      jest.spyOn(encryptionService, 'encrypt').mockReturnValue(mockEncrypted);

      await request(app.getHttpServer())
        .post('/encryption/encrypt')
        .send({ data: mockData })
        .expect(HttpStatus.OK)
        .expect({ encryptedData: mockEncrypted });

      expect(encryptionService.encrypt).toHaveBeenCalledWith(mockData);
    });

    it('should return 400 if data is missing', () => {
      return request(app.getHttpServer())
        .post('/encryption/encrypt')
        .send({})
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('POST /encryption/decrypt', () => {
    it('should decrypt data', async () => {
      const mockEncrypted = 'mock_encrypted_data';
      const mockDecrypted = 'decrypted_secret';
      jest.spyOn(encryptionService, 'decrypt').mockReturnValue(mockDecrypted);

      await request(app.getHttpServer())
        .post('/encryption/decrypt')
        .send({ data: mockEncrypted })
        .expect(HttpStatus.OK)
        .expect({ decryptedData: mockDecrypted });

      expect(encryptionService.decrypt).toHaveBeenCalledWith(mockEncrypted);
    });

    it('should return 400 if data is missing', () => {
      return request(app.getHttpServer())
        .post('/encryption/decrypt')
        .send({})
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /encryption/user-data/decrypted', () => {
    it('should return decrypted user data', async () => {
      const mockUser = {
        id: 'user1',
        username: 'john_doe',
        createdAt: new Date(),
        getDecryptedEmail: jest.fn().mockReturnValue('john.doe@example.com'),
        getDecryptedCreditCard: jest
          .fn()
          .mockReturnValue('1234-5678-9012-3456'),
      };

      app.get(EncryptionController).mockUsers = [mockUser];

      await request(app.getHttpServer())
        .get('/encryption/user-data/decrypted')
        .expect(HttpStatus.OK)
        .then((response) => {
          expect(response.body.id).toBe('user1');
          expect(response.body.username).toBe('john_doe');
          expect(response.body.decryptedEmail).toBe('john.doe@example.com');
          expect(response.body.decryptedCreditCard).toBe('1234-5678-9012-3456');
          expect(mockUser.getDecryptedEmail).toHaveBeenCalled();
          expect(mockUser.getDecryptedCreditCard).toHaveBeenCalled();
        });
    });

    it('should return message if no mock users available', async () => {
      app.get(EncryptionController).mockUsers = [];

      await request(app.getHttpServer())
        .get('/encryption/user-data/decrypted')
        .expect(HttpStatus.OK)
        .expect({ message: 'No mock users available.' });
    });
  });

  describe('GET /encryption/transaction-data/decrypted', () => {
    it('should return decrypted transaction data', async () => {
      const mockTransaction = {
        id: 'txn1',
        userId: 'user1',
        amount: 100.5,
        timestamp: new Date(),
        getDecryptedDetails: jest
          .fn()
          .mockReturnValue('Card ending 3456, PayPal'),
      };
      // @ts-ignore
      app.get(EncryptionController).mockTransactions = [mockTransaction];

      await request(app.getHttpServer())
        .get('/encryption/transaction-data/decrypted')
        .expect(HttpStatus.OK)
        .then((response) => {
          expect(response.body.id).toBe('txn1');
          expect(response.body.userId).toBe('user1');
          expect(response.body.amount).toBe(100.5);
          expect(response.body.decryptedDetails).toBe(
            'Card ending 3456, PayPal',
          );
          expect(mockTransaction.getDecryptedDetails).toHaveBeenCalled();
        });
    });

    it('should return message if no mock transactions available', async () => {
      app.get(EncryptionController).mockTransactions = [];

      await request(app.getHttpServer())
        .get('/encryption/transaction-data/decrypted')
        .expect(HttpStatus.OK)
        .expect({ message: 'No mock transactions available.' });
    });
  });

  describe('GET /encryption/file-storage/decrypted', () => {
    it('should return decrypted file content', async () => {
      const mockEncryptedFileContent = 'mock_encrypted_file_content';
      const mockDecryptedFileContent = 'This is sensitive file content.';

      app.get(EncryptionController).mockEncryptedFile =
        mockEncryptedFileContent;
      jest
        .spyOn(encryptionService, 'decryptFileContent')
        .mockResolvedValue(mockDecryptedFileContent);

      await request(app.getHttpServer())
        .get('/encryption/file-storage/decrypted')
        .expect(HttpStatus.OK)
        .expect({ decryptedContent: mockDecryptedFileContent });

      expect(encryptionService.decryptFileContent).toHaveBeenCalledWith(
        mockEncryptedFileContent,
      );
    });

    it('should return message if no mock encrypted file content available', async () => {
      app.get(EncryptionController).mockEncryptedFile = null;

      await request(app.getHttpServer())
        .get('/encryption/file-storage/decrypted')
        .expect(HttpStatus.OK)
        .expect({
          decryptedContent: 'No mock encrypted file content available.',
        });
    });
  });

  describe('POST /encryption/key-management/rotate', () => {
    it('should rotate key if isAdmin is true', async () => {
      jest.spyOn(keyManagementService, 'rotateKeyManually').mockReturnValue({
        success: true,
        message: 'Key rotated successfully.',
      });

      await request(app.getHttpServer())
        .post('/encryption/key-management/rotate')
        .send({ isAdmin: true })
        .expect(HttpStatus.OK)
        .expect({ success: true, message: 'Key rotated successfully.' });

      expect(keyManagementService.rotateKeyManually).toHaveBeenCalledWith(true);
    });

    it('should return error if isAdmin is false', async () => {
      jest.spyOn(keyManagementService, 'rotateKeyManually').mockReturnValue({
        success: false,
        message: 'Unauthorized: Admin access required.',
      });

      await request(app.getHttpServer())
        .post('/encryption/key-management/rotate')
        .send({ isAdmin: false })
        .expect(HttpStatus.OK)
        .expect({
          success: false,
          message: 'Unauthorized: Admin access required.',
        });

      expect(keyManagementService.rotateKeyManually).toHaveBeenCalledWith(
        false,
      );
    });

    it('should return 400 if isAdmin is missing', () => {
      return request(app.getHttpServer())
        .post('/encryption/key-management/rotate')
        .send({})
        .expect(HttpStatus.BAD_REQUEST);
    });
  });
});
