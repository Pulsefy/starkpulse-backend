import { registerAs } from '@nestjs/config';
import { RateLimitStrategy } from '../common/enums/rate-limit.enum';


export const starknetConfig = () => ({
  starknet: {
    rpcUrl: process.env.STARKNET_RPC_URL || 'https://rpc.starknet.io',
    network: process.env.STARKNET_NETWORK || 'mainnet',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    directory: process.env.LOG_DIRECTORY || 'logs',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: process.env.LOG_MAX_FILES || '7d',
    environment: process.env.NODE_ENV || 'development',
  },
});


export default registerAs('rateLimit', () => ({
  default: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '', 10) || 60000, 
    max: parseInt(process.env.RATE_LIMIT_MAX || '', 10) || 100, 
    message:
      process.env.RATE_LIMIT_MESSAGE ||
      'Too many requests, please try again later.',
    statusCode: 429,
    headers: true,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  global: {
    windowMs: parseInt(process.env.GLOBAL_RATE_LIMIT_WINDOW_MS || '', 10) || 60000,
    max: parseInt(process.env.GLOBAL_RATE_LIMIT_MAX || '', 10) || 10000, 
    message: 'System is experiencing high load, please try again later.',
  },

  perUser: {
    windowMs:
      parseInt(process.env.USER_RATE_LIMIT_WINDOW_MS || '', 10) || 60000,
    max: parseInt(process.env.USER_RATE_LIMIT_MAX || '', 10) || 100,
  },

  perIp: {
    windowMs: parseInt(process.env.IP_RATE_LIMIT_WINDOW_MS || '', 10) || 60000,
    max: parseInt(process.env.IP_RATE_LIMIT_MAX || '', 10) || 50,
  },

  endpoints: {
    'POST:/api/v1/auth/login': {
      windowMs: 15 * 60 * 1000,
      max: 5,
      message: 'Too many login attempts, please try again later.',
    },
    'POST:/api/v1/auth/register': {
      windowMs: 60 * 60 * 1000,
      max: 3,
      message: 'Too many registration attempts, please try again later.',
    },
    'POST:/api/v1/auth/forgot-password': {
      windowMs: 60 * 60 * 1000,
      max: 3,
    },

    'POST:/api/v1/groups/*/messages': {
      windowMs: 60 * 1000,
      max: 30,
      message: 'You are sending messages too quickly.',
    },
    'POST:/api/v1/groups': {
      windowMs: 60 * 60 * 1000,
      max: 10,
    },
    'DELETE:/api/v1/groups/*': {
      windowMs: 60 * 60 * 1000,
      max: 5,
    },

    'POST:/api/v1/files/upload': {
      windowMs: 60 * 1000,
      max: 10,
      message: 'Too many file uploads, please wait before uploading again.',
    },

    'GET:/api/v1/search': {
      windowMs: 60 * 1000,
      max: 60,
    },
  },

  adaptive: {
    enabled: process.env.ADAPTIVE_RATE_LIMITING_ENABLED === 'true' || false,
    baseLimit: parseInt(process.env.ADAPTIVE_BASE_LIMIT || '', 10) || 100,
    maxLimit: parseInt(process.env.ADAPTIVE_MAX_LIMIT || '', 10) || 1000,
    minLimit: parseInt(process.env.ADAPTIVE_MIN_LIMIT || '', 10) || 10,
    increaseThreshold: parseFloat(process.env.ADAPTIVE_INCREASE_THRESHOLD || '') || 0.8,
    decreaseThreshold: parseFloat(process.env.ADAPTIVE_DECREASE_THRESHOLD || '') || 0.2,
    adjustmentFactor: parseFloat(process.env.ADAPTIVE_ADJUSTMENT_FACTOR || '') || 0.1,
    cpuThreshold: parseFloat(process.env.ADAPTIVE_CPU_THRESHOLD || '') || 85,
    memoryThreshold: parseFloat(process.env.ADAPTIVE_MEMORY_THRESHOLD || '') || 80,
    responseTimeThreshold: parseInt(process.env.ADAPTIVE_RESPONSE_TIME_THRESHOLD || '', 10) || 1000,
    minMultiplier: parseFloat(process.env.ADAPTIVE_MIN_MULTIPLIER || '') || 0.1,
    maxMultiplier: parseFloat(process.env.ADAPTIVE_MAX_MULTIPLIER || '') || 2.0,
  },

  trusted: {
    userIds:
      process.env.TRUSTED_USER_IDS?.split(',').map((id) => parseInt(id, 10)) ||
      [],
    roles: process.env.TRUSTED_ROLES?.split(',') || ['admin', 'moderator'],
    ipAddresses: process.env.TRUSTED_IPS?.split(',') || [],
    bypassFactor: parseFloat(process.env.TRUSTED_BYPASS_FACTOR || '') || 10,
  },

  store: {
    type: process.env.RATE_LIMIT_STORE_TYPE || 'memory',
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '', 10) || 6379,
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_RATE_LIMIT_DB || '', 10) || 1,
    },
  },

  strategy:
    (process.env.RATE_LIMIT_STRATEGY as RateLimitStrategy) ||
    RateLimitStrategy.FIXED_WINDOW,

  monitoring: {
    enabled: process.env.RATE_LIMIT_MONITORING_ENABLED === 'true',
    alertThreshold:
      parseFloat(process.env.RATE_LIMIT_ALERT_THRESHOLD || '0.8') || 0.8,
    logLevel: process.env.RATE_LIMIT_LOG_LEVEL || 'warn',
  },
}));
