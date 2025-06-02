export default () => ({
  starknet: {
    rpcUrl: process.env.STARKNET_RPC_URL || 'https://rpc.starknet.io',
    network: process.env.STARKNET_NETWORK || 'mainnet',
  },
});
