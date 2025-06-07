export default () => ({
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
