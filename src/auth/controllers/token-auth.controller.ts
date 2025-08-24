import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { TokenAuthDto } from '../dto/token-auth.dto';
import { TokenAuthGuard } from '../guards/token-auth.guard';
import { BlockchainService } from '../../blockchain/services/blockchain.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('auth/token')
export class TokenAuthController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Post('login')
  @UseGuards(TokenAuthGuard)
  async login(@Request() req, @Body() tokenAuthDto: TokenAuthDto) {
    // The user is already validated by the TokenAuthGuard
    const user = req.user;
    
    // Get token balance for the user
    const tokenBalance = await this.blockchainService.getTokenBalance(user.walletAddress);
    
    // Get voting power for the user
    const votingPower = await this.blockchainService.getVotingPower(user.walletAddress);
    
    return {
      user: {
        id: user.id,
        username: user.username,
        walletAddress: user.walletAddress,
      },
      tokenBalance,
      votingPower,
      // Note: JWT token would be provided by the standard auth service
    };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    const user = req.user;
    
    // Get token balance for the user
    const tokenBalance = await this.blockchainService.getTokenBalance(user.walletAddress);
    
    // Get voting power for the user
    const votingPower = await this.blockchainService.getVotingPower(user.walletAddress);
    
    return {
      user: {
        id: user.id,
        username: user.username,
        walletAddress: user.walletAddress,
      },
      tokenBalance,
      votingPower,
    };
  }
}