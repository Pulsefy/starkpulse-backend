/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { getABI } from '../abi-manager';
import { RpcProvider, Account, Contract, Calldata, Abi, hash } from 'starknet';
import { retryWithBackoff } from '../../common/errors/retry-with-backoff';
import { CircuitBreaker } from '../../common/errors/circuit-breaker';
import { BlockchainError, BlockchainErrorCode } from '../../common/errors/blockchain-error';
import { StarkNetEvent } from '../../types/starknet-types';

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


  // Add to ContractService class
async getContractEvents(
  contractAddress: string,
  abiName: string,
  eventName: string,
  options: { fromBlock: number; toBlock?: number }
): Promise<StarkNetEvent[]> {
  try {
    return await this.contractBreaker.exec(() =>
      retryWithBackoff(
        async () => {
          const contract = await this.getContract(contractAddress, abiName);
          const abi = contract.abi;
          
          // Get events using StarkNet RPC
          const response = await this.provider.getEvents({
            address: contractAddress,
            from_block: { block_number: options.fromBlock },
            to_block: options.toBlock ? { block_number: options.toBlock } : 'latest',
            keys: [],
            chunk_size: 100
          });

          // Convert EMITTED_EVENT to StarkNetEvent
          return response.events.map(emittedEvent => {
            const eventSelector = emittedEvent.keys[0];
            const eventAbi = abi.find(
              (item: any) => item.type === 'event' && 
              BigInt(hash.getSelectorFromName(item.name)) === BigInt(eventSelector)
            );
            
            return {
              event_name: eventAbi?.name || 'UnknownEvent',
              transaction_hash: emittedEvent.transaction_hash,
              block_number: emittedEvent.block_number,
              block_hash: emittedEvent.block_hash,
              data: emittedEvent.data,
              keys: emittedEvent.keys,
              address: contractAddress
            } as StarkNetEvent;
          }).filter(event => 
            eventName === 'AllEvents' || 
            event.event_name === eventName
          );
        },
        {
          retries: 3,
          initialDelayMs: 500,
          maxDelayMs: 4000,
          onRetry: (error, attempt) => {
            this.logger.warn(`Retry ${attempt} for getContractEvents due to error: ${error.message}`);
          },
        }
      )
    );
  } catch (error) {
    this.logger.error('Failed to get contract events', {
      contractAddress,
      eventName,
      options,
      error: error.message
    });
    throw new BlockchainError(
      BlockchainErrorCode.EXECUTION_FAILED,
      'Failed to fetch contract events',
      {
        contractAddress,
        eventName,
        fromBlock: options.fromBlock,
        toBlock: options.toBlock,
        originalError: error.message
      }
    );
  }
}
}
