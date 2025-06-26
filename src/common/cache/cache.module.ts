import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CacheWarmupService } from './cache-warmup.service';
import { RedisModule } from '../module/redis/redis.module';
import { CacheService } from './cahce.service';

@Module({
  imports: [HttpModule],
  providers: [CacheWarmupService],
  exports: [CacheWarmupService],
})
export class CacheWarmupModule {}

@Module({
  imports: [RedisModule],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
