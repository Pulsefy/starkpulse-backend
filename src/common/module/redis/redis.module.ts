import { Global, Module } from '@nestjs/common';
import { createClient } from 'redis';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async () => {
        const client = createClient({
          url: process.env.REDIS_URL,
        });
        await client.connect();
        return client;
      },
    },
    RedisService,
  ],
  exports: ['REDIS_CLIENT', RedisService],
})
export class RedisModule {}
