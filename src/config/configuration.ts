import { registerAs } from '@nestjs/config';
import { RateLimitStrategy } from '../common/enums/rate-limit.enum';


export const starknetConfig = () => ({
  starknet: {
    rpcUrl: process.env.STARKNET_RPC_URL || 'https://rpc.starknet.io',
    network: process.env.STARKNET_NETWORK || 'mainnet'
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
    baseLimit: 100,
    maxLimit: 200,
    minLimit: 20,
    increaseThreshold: 80,
    decreaseThreshold: 30,
    adjustmentFactor: 0.1,
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
