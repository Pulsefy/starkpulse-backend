import { RateLimitResult } from '../interfaces/rate-limit.interface';

export interface RateLimitStore {
  hit(key: string, windowMs: number, max: number): Promise<RateLimitResult>;
  get(key: string): Promise<RateLimitResult | null>;
  reset(key: string): Promise<void>;
  increment(key: string, windowMs: number): Promise<number>;
}
