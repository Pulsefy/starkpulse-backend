import { Contract, Provider, Account, uint256, CallData } from 'starknet';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TokenContract {
  private contract: Contract;
  private provider: Provider;
  private account: Account;

  constructor(private configService: ConfigService) {
    // Initialize provider and account
    this.provider = new Provider({
      sequencer: {
        network: this.configService.get<string>('STARKNET_NETWORK', 'goerli'),
      },
    });

    // Initialize account using private key from config
    const privateKey = this.configService.get<string>('STARKNET_PRIVATE_KEY');
    const accountAddress = this.configService.get<string>('STARKNET_ACCOUNT_ADDRESS');
    
    if (privateKey && accountAddress) {
      this.account = new Account(
        this.provider,
        accountAddress,
        privateKey,
      );
    }

    // Initialize contract
    const tokenAddress = this.configService.get<string>('TOKEN_CONTRACT_ADDRESS');
    if (tokenAddress) {
      this.contract = new Contract(
        require('./abi/token-abi.json'),
        tokenAddress,
        this.provider,
      );
    }
  }

  async balanceOf(address: string): Promise<bigint> {
    try {
      const result = await this.contract.call('balanceOf', [address]);
      return BigInt(result.balance.low);
    } catch (error) {
      console.error('Error getting token balance:', error);
      throw new Error('Failed to get token balance');
    }
  }

  async transfer(from: string, to: string, amount: number): Promise<string> {
    try {
      // Convert amount to uint256
      const amountUint256 = uint256.bnToUint256(amount);
      
      // Execute transfer
      const { transaction_hash } = await this.account.execute({
        contractAddress: this.contract.address,
        entrypoint: 'transfer',
        calldata: CallData.compile({
          recipient: to,
          amount: amountUint256,
        }),
      });
      
      return transaction_hash;
    } catch (error) {
      console.error('Error transferring tokens:', error);
      throw new Error('Failed to transfer tokens');
    }
  }

  async mint(to: string, amount: number): Promise<string> {
    try {
      // Convert amount to uint256
      const amountUint256 = uint256.bnToUint256(amount);
      
      // Execute mint
      const { transaction_hash } = await this.account.execute({
        contractAddress: this.contract.address,
        entrypoint: 'mint',
        calldata: CallData.compile({
          recipient: to,
          amount: amountUint256,
        }),
      });
      
      return transaction_hash;
    } catch (error) {
      console.error('Error minting tokens:', error);
      throw new Error('Failed to mint tokens');
    }
  }

  async stake(address: string, amount: number, lockupPeriodDays: number): Promise<string> {
    try {
      // Convert amount to uint256
      const amountUint256 = uint256.bnToUint256(amount);
      
      // Execute stake
      const { transaction_hash } = await this.account.execute({
        contractAddress: this.contract.address,
        entrypoint: 'stake',
        calldata: CallData.compile({
          staker: address,
          amount: amountUint256,
          lockupPeriodDays,
        }),
      });
      
      return transaction_hash;
    } catch (error) {
      console.error('Error staking tokens:', error);
      throw new Error('Failed to stake tokens');
    }
  }

  async unstake(address: string, stakeId: string): Promise<string> {
    try {
      // Execute unstake
      const { transaction_hash } = await this.account.execute({
        contractAddress: this.contract.address,
        entrypoint: 'unstake',
        calldata: CallData.compile({
          staker: address,
          stakeId,
        }),
      });
      
      return transaction_hash;
    } catch (error) {
      console.error('Error unstaking tokens:', error);
      throw new Error('Failed to unstake tokens');
    }
  }

  async delegate(delegator: string, delegate: string, amount: number): Promise<string> {
    try {
      // Convert amount to uint256
      const amountUint256 = uint256.bnToUint256(amount);
      
      // Execute delegate
      const { transaction_hash } = await this.account.execute({
        contractAddress: this.contract.address,
        entrypoint: 'delegate',
        calldata: CallData.compile({
          delegator,
          delegate,
          amount: amountUint256,
        }),
      });
      
      return transaction_hash;
    } catch (error) {
      console.error('Error delegating tokens:', error);
      throw new Error('Failed to delegate tokens');
    }
  }

  async getVotingPower(address: string): Promise<bigint> {
    try {
      const result = await this.contract.call('getVotingPower', [address]);
      return BigInt(result.votingPower.low);
    } catch (error) {
      console.error('Error getting voting power:', error);
      throw new Error('Failed to get voting power');
    }
  }
}