/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { CreateBlockchainDto } from './dto/create-blockchain.dto';
import { UpdateBlockchainDto } from './dto/update-blockchain.dto';
import { ContractService } from './services/contract.service';
import { retryWithBackoff } from '../common/errors/retry-with-backoff';
import { CircuitBreaker } from '../common/errors/circuit-breaker';
import { BlockchainError, BlockchainErrorCode } from '../common/errors/blockchain-error';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private readonly contractBreaker = new CircuitBreaker({ failureThreshold: 3, cooldownPeriodMs: 10000 });

  constructor(
    private readonly contractService: ContractService,
  ) {}

  create(createBlockchainDto: CreateBlockchainDto) {
    console.log('Creating blockchain with data:', createBlockchainDto);
    return 'This action adds a new blockchain';
  }

  findAll() {
    return `This action returns all blockchain`;
  }

  findOne(id: number) {
    return `This action returns a #${id} blockchain`;
  }

  update(id: number, updateBlockchainDto: UpdateBlockchainDto) {
    return `This action updates a #${id} blockchain`;
  }

  remove(id: number) {
    return `This action removes a #${id} blockchain`;
  }

  async callContractMethod(
    contractAddress: string,
    abiName: string,
    method: string,
    args: any[],
  ) {
    try {
      return await this.contractBreaker.exec(() =>
        retryWithBackoff(
          () => this.contractService.callMethod(contractAddress, abiName, method, args),
          {
            retries: 3,
            initialDelayMs: 500,
            maxDelayMs: 4000,
            onRetry: (error, attempt) => {
              this.logger.warn(`Retry ${attempt} for callContractMethod: ${method} @ ${contractAddress} due to error: ${error.message}`);
            },
          }
        )
      );
    } catch (error) {
      this.logger.error(`Failed to call contract method: ${method} @ ${contractAddress}`, error);
      throw new BlockchainError(
        BlockchainErrorCode.EXECUTION_FAILED,
        `Failed to call contract method: ${method} @ ${contractAddress}`,
        { contractAddress, abiName, method, args, originalError: error.message }
      );
    }
  }

  async executeContractMethod(
    contractAddress: string,
    abiName: string,
    method: string,
    args: any[],
  ) {
    try {
      return await this.contractBreaker.exec(() =>
        retryWithBackoff(
          () => this.contractService.executeMethod(contractAddress, abiName, method, args),
          {
            retries: 3,
            initialDelayMs: 500,
            maxDelayMs: 4000,
            onRetry: (error, attempt) => {
              this.logger.warn(`Retry ${attempt} for executeContractMethod: ${method} @ ${contractAddress} due to error: ${error.message}`);
            },
          }
        )
      );
    } catch (error) {
      this.logger.error(`Failed to execute contract method: ${method} @ ${contractAddress}`, error);
      throw new BlockchainError(
        BlockchainErrorCode.EXECUTION_FAILED,
        `Failed to execute contract method: ${method} @ ${contractAddress}`,
        { contractAddress, abiName, method, args, originalError: error.message }
      );
    }
  }
}
