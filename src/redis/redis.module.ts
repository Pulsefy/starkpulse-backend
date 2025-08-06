import { Module } from '@nestjs/common';
import { RedisModule as IoRedisModule } from '@nestjs-modules/ioredis';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    IoRedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        config: {
          host: configService.get('REDIS_HOST') || 'localhost',
          port: configService.get<number>('REDIS_PORT') || 6379,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [IoRedisModule],
})
export class RedisModule {}