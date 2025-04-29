import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WalletAuthService } from '../services/wallet-auth.service';
import {
  WalletNonceRequestDto,
  WalletAuthRequestDto,
  WalletAuthResponseDto,
} from '../dto/wallet-auth.dto';

@ApiTags('Wallet Authentication')
@Controller('auth/wallet')
export class WalletAuthController {
  constructor(private readonly walletAuthService: WalletAuthService) {}

  @Get('connect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connect Argent X wallet' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns connected wallet address',
    type: String,
  })
  async connectWallet(): Promise<{ address: string }> {
    const address = await this.walletAuthService.connectArgentX();
    return { address };
  }

  @Post('nonce')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get nonce for wallet signature' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns a nonce for signing',
    type: String,
  })
  async getNonce(
    @Body() { address }: WalletNonceRequestDto,
  ): Promise<{ nonce: string }> {
    const nonce = await this.walletAuthService.generateNonce(address);
    return { nonce };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify wallet signature and authenticate' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns JWT tokens and user info',
    type: WalletAuthResponseDto,
  })
  async verifySignature(
    @Body() { address, signature, nonce }: WalletAuthRequestDto,
  ): Promise<WalletAuthResponseDto> {
    const isValid = await this.walletAuthService.verifySignature(
      address,
      signature,
      nonce,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    return this.walletAuthService.generateTokens(address);
  }
}
