export interface StarkNetConfig {
  network: 'mainnet' | 'testnet' | 'devnet';
  providerUrl: string;
  chainId: string;
}
