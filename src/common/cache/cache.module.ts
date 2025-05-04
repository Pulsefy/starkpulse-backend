import { Module } from '@nestjs/common';
import { RedisModule } from '../module/redis/redis.module';
import { CacheService } from './cahce.service';

@Module({
  imports: [RedisModule],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
