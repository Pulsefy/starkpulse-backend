import { Injectable } from "@nestjs/common";

// rpc/rate-limiter/rate-limiter.service.ts
@Injectable()
export class RateLimiterService {
  private readonly limit = 100; // per minute
  private count = 0;
  private resetInterval: NodeJS.Timeout;

  constructor() {
    this.resetInterval = setInterval(() => (this.count = 0), 60000);
  }

  canProceed(): boolean {
    if (this.count >= this.limit) return false;
    this.count++;
    return true;
  }
}
