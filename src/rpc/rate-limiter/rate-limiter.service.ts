import { Injectable } from '@nestjs/common';
import Bottleneck from 'bottleneck';

@Injectable()
export class RateLimiterService {
  private readonly limiter = new Bottleneck({
    minTime: 100, // 10 requests per second max
    reservoir: 50, // initial tokens
    reservoirRefreshAmount: 50,
    reservoirRefreshInterval: 1000, // every second
  });

  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    return this.limiter.schedule(fn);
  }
}
