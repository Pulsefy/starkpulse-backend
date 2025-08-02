import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '../config/config.module';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { WalletAuthService } from './services/wallet-auth.service';
import { WalletAuthController } from './controllers/wallet-auth.controller';
import { WalletAuthGuard } from './guards/wallet-auth.guard';
import { ConfigService } from '../config/config.service';
import { RedisModule } from '../common/module/redis/redis.module';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    RedisModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.jwtSecret,
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, WalletAuthController],
  providers: [AuthService, WalletAuthService, WalletAuthGuard],
  exports: [AuthService, WalletAuthService, WalletAuthGuard],
})
export class AuthModule {}
