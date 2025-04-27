export const RpcConfig = {
    CONNECTION_POOL: {
      maxSockets: 100,
      keepAlive: true,
      timeoutMs: 10000,
    },
    BATCHING: {
      batchingWindowMs: 10, // milliseconds between batch sends
    },
    CACHE: {
      defaultTtlSeconds: 60, // cache lifetime
    },
    RATE_LIMITER: {
      minTimeMs: 100, // minimum time between requests
      reservoir: 50, // max requests per refresh interval
      reservoirRefreshIntervalMs: 1000, // refresh reservoir every 1 second
    },
    MONITORING: {
      enable: true,
      loggingIntervalMs: 60000, // log metrics every 1 min
    },
  };
  