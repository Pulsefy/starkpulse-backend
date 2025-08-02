import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { KeyManagementService } from './key-management.service';
import { IsString, IsBoolean, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

class EncryptDecryptDto {
  @IsNotEmpty()
  @IsString()
  data: string;
}

class AdminActionDto {
  @IsNotEmpty()
  @Type(() => Boolean)
  @IsBoolean()
  isAdmin: boolean;
}

// Mock User Entity (Conceptual)
class MockUser {
  id: string;
  username: string;
  encryptedEmail: string; // Sensitive field
  encryptedCreditCard: string; // Sensitive field
  createdAt: Date;

  constructor(
    id: string,
    username: string,
    email: string,
    creditCard: string,
    private encryptionService: EncryptionService,
  ) {
    this.id = id;
    this.username = username;
    this.createdAt = new Date();
    this.encryptedEmail = this.encryptionService.encrypt(email);
    this.encryptedCreditCard = this.encryptionService.encrypt(creditCard);
  }

  getDecryptedEmail(): string {
    return this.encryptionService.decrypt(this.encryptedEmail);
  }

  getDecryptedCreditCard(): string {
    return this.encryptionService.decrypt(this.encryptedCreditCard);
  }
}

// Mock Transaction Entity (Conceptual)
class MockTransaction {
  id: string;
  userId: string;
  amount: number;
  encryptedDetails: string; // Sensitive field (e.g., payment method details)
  timestamp: Date;

  constructor(
    id: string,
    userId: string,
    amount: number,
    details: string,
    private encryptionService: EncryptionService,
  ) {
    this.id = id;
    this.userId = userId;
    this.amount = amount;
    this.timestamp = new Date();
    this.encryptedDetails = this.encryptionService.encrypt(details);
  }

  getDecryptedDetails(): string {
    return this.encryptionService.decrypt(this.encryptedDetails);
  }
}

@Controller('encryption')
export class EncryptionController {
  private readonly logger = new Logger(EncryptionController.name);

  private mockUsers: MockUser[] = [];
  private mockTransactions: MockTransaction[] = [];
  private mockEncryptedFile: string | null = null;

  constructor(
    private readonly encryptionService: EncryptionService,
    private readonly keyManagementService: KeyManagementService,
  ) {
    this.seedMockData();
  }

  private seedMockData(): void {
    this.logger.log('Seeding mock encrypted data...');
    const user = new MockUser(
      'user1',
      'john_doe',
      'john.doe@example.com',
      '1234-5678-9012-3456',
      this.encryptionService,
    );
    this.mockUsers.push(user);

    const transaction = new MockTransaction(
      'txn1',
      'user1',
      100.5,
      'Card ending 3456, PayPal',
      this.encryptionService,
    );
    this.mockTransactions.push(transaction);

    this.encryptionService
      .encryptFileContent('This is sensitive file content.')
      .then((encrypted) => {
        this.mockEncryptedFile = encrypted;
        this.logger.log('Mock encrypted file content generated.');
      });

    this.logger.log('Mock encrypted data seeded.');
  }

  @Post('encrypt')
  @HttpCode(HttpStatus.OK)
  encryptData(@Body() body: EncryptDecryptDto): { encryptedData: string } {
    this.logger.log('API: Encrypting data.');
    const encrypted = this.encryptionService.encrypt(body.data);
    return { encryptedData: encrypted };
  }

  @Post('decrypt')
  @HttpCode(HttpStatus.OK)
  decryptData(@Body() body: EncryptDecryptDto): { decryptedData: string } {
    this.logger.log('API: Decrypting data.');
    const decrypted = this.encryptionService.decrypt(body.data);
    return { decryptedData: decrypted };
  }

  @Get('user-data/decrypted')
  @HttpCode(HttpStatus.OK)
  getDecryptedUserData(): any {
    this.logger.log('API: Getting decrypted user data.');
    if (this.mockUsers.length === 0) {
      return { message: 'No mock users available.' };
    }
    const user = this.mockUsers[0];
    return {
      id: user.id,
      username: user.username,
      decryptedEmail: user.getDecryptedEmail(),
      decryptedCreditCard: user.getDecryptedCreditCard(),
      createdAt: user.createdAt,
    };
  }

  @Get('transaction-data/decrypted')
  @HttpCode(HttpStatus.OK)
  getDecryptedTransactionData(): any {
    this.logger.log('API: Getting decrypted transaction data.');
    if (this.mockTransactions.length === 0) {
      return { message: 'No mock transactions available.' };
    }
    const transaction = this.mockTransactions[0];
    return {
      id: transaction.id,
      userId: transaction.userId,
      amount: transaction.amount,
      decryptedDetails: transaction.getDecryptedDetails(),
      timestamp: transaction.timestamp,
    };
  }

  @Get('file-storage/decrypted')
  @HttpCode(HttpStatus.OK)
  async getDecryptedFileContent(): Promise<{
    decryptedContent: string | null;
  }> {
    this.logger.log('API: Getting decrypted file content.');
    if (!this.mockEncryptedFile) {
      return { decryptedContent: 'No mock encrypted file content available.' };
    }
    const decrypted = await this.encryptionService.decryptFileContent(
      this.mockEncryptedFile,
    );
    return { decryptedContent: decrypted };
  }

  @Post('key-management/rotate')
  @HttpCode(HttpStatus.OK)
  rotateKey(@Body() body: AdminActionDto): {
    success: boolean;
    message?: string;
  } {
    this.logger.log(`API: Request to rotate key (isAdmin: ${body.isAdmin}).`);
    return this.keyManagementService.rotateKeyManually(body.isAdmin);
  }
}
