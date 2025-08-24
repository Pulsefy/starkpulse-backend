import { Injectable, UnauthorizedException, Logger, BadRequestException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { BlockchainService } from '../../blockchain/services/blockchain.service';
import { UsersService } from '../../users/users.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TokenAuthStrategy extends PassportStrategy(Strategy, 'token-auth') {
  private readonly logger = new Logger(TokenAuthStrategy.name);
  private readonly minRequiredBalance: number;
  private readonly messagePrefix: string;
  private readonly messageExpiration: number; // in seconds

  constructor(
    private blockchainService: BlockchainService,
    private usersService: UsersService,
    private configService: ConfigService,
  ) {
    super();
    this.minRequiredBalance = this.configService.get<number>('AUTH_MIN_TOKEN_BALANCE') || 1;
    this.messagePrefix = this.configService.get<string>('AUTH_MESSAGE_PREFIX') || 'StarkPulse Authentication:';
    this.messageExpiration = this.configService.get<number>('AUTH_MESSAGE_EXPIRATION') || 300; // 5 minutes
  }

  async validate(request: Request): Promise<any> {
    // Extract wallet address and signature from request
    const { walletAddress, signature, message } = request.body;

    if (!walletAddress || !signature || !message) {
      this.logger.warn(`Authentication attempt with missing credentials: ${JSON.stringify({
        hasWalletAddress: !!walletAddress,
        hasSignature: !!signature,
        hasMessage: !!message
      })}`);
      throw new UnauthorizedException('Missing authentication credentials');
    }

    try {
      // Validate message format and expiration
      this.validateMessage(message);

      // Verify the signature using blockchain service
      const isValid = await this.blockchainService.verifySignature(
        walletAddress,
        message,
        signature,
      );

      if (!isValid) {
        this.logger.warn(`Invalid signature for wallet: ${walletAddress}`);
        throw new UnauthorizedException('Invalid signature');
      }

      // Find or create user based on wallet address
      let user = await this.usersService.findByWalletAddress(walletAddress);

      if (!user) {
        // Create new user if not exists
        this.logger.log(`Creating new user for wallet: ${walletAddress}`);
        user = await this.usersService.createWithWalletAddress(walletAddress);
      }

      // Check if user has minimum token balance for authentication
      const tokenBalance = await this.blockchainService.getTokenBalance(walletAddress);
      
      if (tokenBalance < this.minRequiredBalance) {
        this.logger.warn(`Insufficient token balance for wallet: ${walletAddress}, balance: ${tokenBalance}, required: ${this.minRequiredBalance}`);
        throw new UnauthorizedException(`Insufficient token balance for authentication. Required: ${this.minRequiredBalance}, Current: ${tokenBalance}`);
      }

      // Check if user is banned or suspended
      if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
        this.logger.warn(`Authentication attempt from ${user.status} user: ${user.id}`);
        throw new UnauthorizedException(`Your account has been ${user.status.toLowerCase()}. Please contact support.`);
      }

      // Update last login timestamp
      await this.usersService.updateLastLogin(user.id);

      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Authentication error for wallet ${walletAddress}: ${error.message}`, error.stack);
      throw new UnauthorizedException('Authentication failed: ' + error.message);
    }
  }

  private validateMessage(message: string): void {
    // Check if message starts with the required prefix
    if (!message.startsWith(this.messagePrefix)) {
      throw new BadRequestException(`Invalid message format. Message must start with "${this.messagePrefix}"`);
    }

    // Extract timestamp from message
    const parts = message.split(':');
    if (parts.length < 3) {
      throw new BadRequestException('Invalid message format. Expected format: "StarkPulse Authentication:timestamp:nonce"');
    }

    const timestamp = parseInt(parts[1].trim(), 10);
    if (isNaN(timestamp)) {
      throw new BadRequestException('Invalid timestamp in authentication message');
    }

    // Check if message has expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime - timestamp > this.messageExpiration) {
      throw new BadRequestException(`Authentication message has expired. Please generate a new one.`);
    }
  }
}