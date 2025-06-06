/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { RpcProvider, Account, Contract, Calldata, Abi } from 'starknet';
import { getABI } from '../abi-manager';
import { retryWithBackoff } from '../../common/errors/retry-with-backoff';
import { CircuitBreaker } from '../../common/errors/circuit-breaker';
import { BlockchainError, BlockchainErrorCode } from '../../common/errors/blockchain-error';

@Injectable()
export class ContractService {
  private provider: RpcProvider;
  private account: Account;
  private readonly logger = new Logger(ContractService.name);
  private readonly contractBreaker = new CircuitBreaker({ failureThreshold: 3, cooldownPeriodMs: 10000 });

  constructor() {
    this.provider = new RpcProvider({
      nodeUrl: 'https://starknet-testnet.public.blastapi.io/rpc/v0_6',
    });
    
    this.account = new Account(
      this.provider,
      'YOUR_PUBLIC_ADDRESS',
      'YOUR_PRIVATE_KEY',
    );
  }

  async getContract(address: string, abiName: string): Promise<Contract> {
    try {
      return await this.contractBreaker.exec(() =>
        retryWithBackoff(
          async () => {
            const abi = await getABI(abiName) as unknown as Abi;
            return new Contract(abi, address, this.provider);
          },
          {
            retries: 3,
            initialDelayMs: 500,
            maxDelayMs: 4000,
            onRetry: (error, attempt) => {
              this.logger.warn(`Retry ${attempt} for getContract(${abiName}) @ ${address} due to error: ${error.message}`);
            },
          }
        )
      );
    } catch (error) {
      this.logger.error(`Failed to get contract: ${abiName} @ ${address}`, error);
      throw new BlockchainError(
        BlockchainErrorCode.CONTRACT_NOT_FOUND,
        `Failed to get contract: ${abiName} @ ${address}`,
        { address, abiName, originalError: error.message }
      );
    }
  }

  async callMethod(address: string, abiName: string, method: string, args: any[]) {
    try {
      return await this.contractBreaker.exec(() =>
        retryWithBackoff(
          async () => {
            const contract = await this.getContract(address, abiName);
            return contract.call(method, args);
          },
          {
            retries: 3,
            initialDelayMs: 500,
            maxDelayMs: 4000,
            onRetry: (error, attempt) => {
              this.logger.warn(`Retry ${attempt} for callMethod(${method}) @ ${address} due to error: ${error.message}`);
            },
          }
        )
      );
    } catch (error) {
      this.logger.error(`Failed to call contract method: ${method} @ ${address}`, error);
      throw new BlockchainError(
        BlockchainErrorCode.METHOD_NOT_FOUND,
        `Failed to call contract method: ${method} @ ${address}`,
        { address, abiName, method, args, originalError: error.message }
      );
    }
  }

  async executeMethod(
    address: string,
    abiName: string,
    method: string,
    args: any[],
  ): Promise<string> {
    try {
      return await this.contractBreaker.exec(() =>
        retryWithBackoff(
          async () => {
            const contract = new Contract(
              (await this.getContract(address, abiName)).abi,
              address,
              this.account
            );
            if (!contract.populateTransaction || typeof contract.populateTransaction[method] !== 'function') {
              throw new BlockchainError(
                BlockchainErrorCode.METHOD_NOT_FOUND,
                `Method ${method} does not exist on the contract's populateTransaction object.`,
                { address, abiName, method }
              );
            }
            const methodFunction = contract.populateTransaction[method] as (...args: unknown[]) => Promise<unknown>;
            const calldata = await methodFunction(...(args as unknown[])) as Calldata | undefined;
            const tx = await this.account.execute({
              contractAddress: address,
              entrypoint: method,
              calldata,
            });
            return tx.transaction_hash;
          },
          {
            retries: 3,
            initialDelayMs: 500,
            maxDelayMs: 4000,
            onRetry: (error, attempt) => {
              this.logger.warn(`Retry ${attempt} for executeMethod(${method}) @ ${address} due to error: ${error.message}`);
            },
          }
        )
      );
    } catch (error) {
      this.logger.error(`Failed to execute contract method: ${method} @ ${address}`, error);
      throw new BlockchainError(
        BlockchainErrorCode.EXECUTION_FAILED,
        `Failed to execute contract method: ${method} @ ${address}`,
        { address, abiName, method, args, originalError: error.message }
      );
    }
  }
}
