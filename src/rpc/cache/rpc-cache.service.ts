import { Injectable } from "@nestjs/common";

// rpc/cache/rpc-cache.service.ts
@Injectable()
export class RpcCacheService {
  private cache = new Map<string, any>();

  get(key: string): any {
    return this.cache.get(key);
  }

  set(key: string, value: any, ttl = 60000) {
    this.cache.set(key, value);
    setTimeout(() => this.cache.delete(key), ttl);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }
}
