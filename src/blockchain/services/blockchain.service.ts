import { Injectable } from '@nestjs/common';
import { TokenContract } from '../contracts/token.contract';
import { ec, stark } from 'starknet';

@Injectable()
export class BlockchainService {
  constructor(private readonly tokenContract: TokenContract) {}

  async getTokenBalance(walletAddress: string): Promise<number> {
    try {
      const balance = await this.tokenContract.balanceOf(walletAddress);
      return Number(balance);
    } catch (error) {
      console.error('Error in getTokenBalance:', error);
      return 0;
    }
  }

  async transferTokens(fromAddress: string, toAddress: string, amount: number): Promise<string> {
    return this.tokenContract.transfer(fromAddress, toAddress, amount);
  }

  async mintTokens(toAddress: string, amount: number): Promise<string> {
    return this.tokenContract.mint(toAddress, amount);
  }

  async stakeTokens(walletAddress: string, amount: number, lockupPeriodDays: number): Promise<string> {
    return this.tokenContract.stake(walletAddress, amount, lockupPeriodDays);
  }

  async unstakeTokens(walletAddress: string, stakeId: string): Promise<string> {
    return this.tokenContract.unstake(walletAddress, stakeId);
  }

  async delegateVotingPower(delegator: string, delegate: string, amount: number): Promise<string> {
    return this.tokenContract.delegate(delegator, delegate, amount);
  }

  async getVotingPower(walletAddress: string): Promise<number> {
    try {
      const votingPower = await this.tokenContract.getVotingPower(walletAddress);
      return Number(votingPower);
    } catch (error) {
      console.error('Error in getVotingPower:', error);
      return 0;
    }
  }
  
  async verifySignature(walletAddress: string, message: string, signature: string): Promise<boolean> {
    try {
      // Convert message to hash
      const messageHash = stark.hashMessage(message);
      
      // Parse signature
      const { r, s } = this.parseSignature(signature);
      
      // Verify signature
      return stark.verifySignature(
        messageHash,
        r,
        s,
        walletAddress
      );
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }
  
  private parseSignature(signature: string): { r: string, s: string } {
    // Remove '0x' prefix if present
    const cleanSignature = signature.startsWith('0x') ? signature.slice(2) : signature;
    
    // Split signature into r and s components (each 64 characters)
    const r = '0x' + cleanSignature.slice(0, 64);
    const s = '0x' + cleanSignature.slice(64, 128);
    
    return { r, s };
  }
}