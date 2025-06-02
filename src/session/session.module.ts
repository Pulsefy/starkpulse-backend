import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { Session } from './entities/session.entity';
import { ConfigModule } from '../config/config.module';
import { ConfigService } from '../config/config.service';
import { User } from 'src/auth/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, User]),
    ConfigModule, // Import the ConfigModule here
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.jwtConfig.secret,
        signOptions: {
          expiresIn: configService.sessionConfig.accessTokenExpiresIn || '1d',
        },
      }),
    }),
  ],
  controllers: [SessionController],
  providers: [SessionService], // ConfigModule should not be here
  exports: [SessionService],
})
export class SessionModule {}
