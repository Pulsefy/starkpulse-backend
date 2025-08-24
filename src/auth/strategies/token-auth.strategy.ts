import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { BlockchainService } from '../../blockchain/services/blockchain.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class TokenAuthStrategy extends PassportStrategy(Strategy, 'token-auth') {
  constructor(
    private blockchainService: BlockchainService,
    private usersService: UsersService,
  ) {
    super();
  }

  async validate(request: Request): Promise<any> {
    // Extract wallet address and signature from request
    const { walletAddress, signature, message } = request.body;

    if (!walletAddress || !signature || !message) {
      throw new UnauthorizedException('Missing authentication credentials');
    }

    try {
      // Verify the signature using blockchain service
      const isValid = await this.blockchainService.verifySignature(
        walletAddress,
        message,
        signature,
      );

      if (!isValid) {
        throw new UnauthorizedException('Invalid signature');
      }

      // Find or create user based on wallet address
      let user = await this.usersService.findByWalletAddress(walletAddress);

      if (!user) {
        // Create new user if not exists
        user = await this.usersService.createWithWalletAddress(walletAddress);
      }

      // Check if user has minimum token balance for authentication
      const tokenBalance = await this.blockchainService.getTokenBalance(walletAddress);
      const minRequiredBalance = 1; // Minimum token balance required for authentication

      if (tokenBalance < minRequiredBalance) {
        throw new UnauthorizedException('Insufficient token balance for authentication');
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException('Authentication failed: ' + error.message);
    }
  }
}