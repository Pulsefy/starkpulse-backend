import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { WalletAuthService } from '../services/wallet-auth.service';
import {
  WalletNonceRequestDto,
  WalletAuthRequestDto,
  WalletAuthResponseDto,
} from '../dto/wallet-auth.dto';

@ApiTags('Wallet Authentication')
@ApiBearerAuth()
@Controller('auth/wallet')
export class WalletAuthController {
  constructor(private readonly walletAuthService: WalletAuthService) {}

  @Get('connect')
  @ApiOperation({
    summary: 'Connect Argent X wallet',
    description: 'Connects an Argent X wallet and returns the address.',
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet connected',
    example: { address: '0x123...' },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async connectWallet(): Promise<{ address: string }> {
    const address = await this.walletAuthService.connectArgentX();
    return { address };
  }

  @Post('nonce')
  @ApiOperation({
    summary: 'Get nonce for wallet signature',
    description: 'Returns a nonce for signing with the wallet.',
  })
  @ApiBody({
    description: 'Wallet address payload',
    examples: {
      default: {
        value: { address: '0x123...' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Nonce returned',
    example: { nonce: 'random-nonce-string' },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
