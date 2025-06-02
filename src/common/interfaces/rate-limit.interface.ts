export interface RateLimitConfig {
  windowMs: number; 
  max: number; 
  keyGenerator?: (req: any) => string;
  skipIf?: (req: any) => boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string | object;
  statusCode?: number;
  headers?: boolean;
  draft_polli_ratelimit_headers?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  totalHits: number;
  windowStart: Date;
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'X-RateLimit-Used': string;
  'Retry-After'?: string;
}

export interface AdaptiveRateLimitConfig {
  baseLimit: number;
  maxLimit: number;
  minLimit: number;
  increaseThreshold: number; 
  decreaseThreshold: number; 
  adjustmentFactor: number; 
}

export interface TrustedUserConfig {
  userIds: number[];
  roles: string[];
  ipAddresses: string[];
  bypassFactor: number; 
}
