import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { RateLimitService } from '../services/rate-limit.service';
import { SystemHealthService } from '../services/system-health.service';
import { TrustedUserService } from '../services/trusted-user.service';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { RateLimitMiddleware } from '../middleware/rate-limit.middleware';
import { RateLimitLoggingInterceptor } from '../interceptors/rate-limit-logging.interceptor';
import { MemoryRateLimitStore } from '../stores/memory-rate-limit.store';
import { RedisRateLimitStore } from '../stores/redis-rate-limit.store';
import { SlidingWindowRateLimitStore } from '../stores/sliding-window-rate-limit.store';
import { RateLimitStore } from '../stores/rate-limit-store.interface';

@Module({})
export class RateLimitModule {
  static forRoot(): DynamicModule {
    return {
      module: RateLimitModule,
      imports: [ConfigModule, CacheModule],
      providers: [
        {
          provide: 'RATE_LIMIT_STORE',
          useFactory: (configService: ConfigService, cache: any) => {
            const storeType = configService.get<string>('rateLimit.store.type');
            
            switch (storeType) {
              case 'redis':
                return new RedisRateLimitStore(cache); 
              case 'sliding-window':
                return new SlidingWindowRateLimitStore(cache); 
              case 'memory':
              default:
                return new MemoryRateLimitStore();
            }
          },
          inject: [ConfigService, 'CACHE_MANAGER'],
        },
        RateLimitService,
        SystemHealthService,
        TrustedUserService,
        RateLimitGuard,
        RateLimitMiddleware,
        RateLimitLoggingInterceptor,
      ],
      exports: [
        RateLimitService,
        SystemHealthService,
        TrustedUserService,
        RateLimitGuard,
        RateLimitMiddleware,
        RateLimitLoggingInterceptor,
      ],
      global: true,
    };
  }
}
