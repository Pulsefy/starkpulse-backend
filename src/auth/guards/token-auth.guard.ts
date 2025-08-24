import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class TokenAuthGuard extends AuthGuard('token-auth') {}