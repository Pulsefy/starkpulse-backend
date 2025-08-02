import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { WalletAuthService } from '../services/wallet-auth.service';

@Injectable()
export class WalletAuthGuard implements CanActivate {
  constructor(private readonly walletAuthService: WalletAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    const payload = await this.walletAuthService.validateToken(token);
    if (!payload) {
      throw new UnauthorizedException('Invalid token');
    }

    // Add user and wallet info to request object
    request.user = payload;
    request.wallet = payload.wallet;

    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
