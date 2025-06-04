export enum RateLimitType {
  GLOBAL = 'global',
  PER_USER = 'per-user',
  PER_IP = 'per-ip',
  PER_ENDPOINT = 'per-endpoint',
  COMBINED = 'combined',
}

export enum RateLimitStrategy {
  FIXED_WINDOW = 'fixed-window',
  SLIDING_WINDOW = 'sliding-window',
  TOKEN_BUCKET = 'token-bucket',
  LEAKY_BUCKET = 'leaky-bucket',
}

export enum RateLimitAction {
  BLOCK = 'block',
  DELAY = 'delay',
  LOG_ONLY = 'log-only',
}
