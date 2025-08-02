/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContractEntity } from './entities/contract.entity';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ContractFilterDto } from './dto/contract-filter.dto';
import { StarknetContractService } from '../../blockchain/services/starknet-contract.service';

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(ContractEntity)
    private readonly repo: Repository<ContractEntity>,
    private readonly starkService: StarknetContractService,
  ) {}

  create(dto: CreateContractDto) {
    const ent = this.repo.create({ ...dto, isActive: true });
    return this.repo.save(ent);
  }

  findAll(filter?: ContractFilterDto) {
    return this.repo.find({ where: filter });
  }

  findOne(id: string) {
    return this.repo.findOneBy({ id });
  }

  update(id: string, dto: UpdateContractDto) {
    return this.repo.update(id, dto);
  }

  remove(id: string) {
    return this.repo.delete(id);
  }

  // --- StarkNet calls ---
  async callOnChain(
    address: string,
    abiName: string,
    method: string,
    args: string[],
  ) {
    const result: unknown = await this.starkService.call(address, abiName, method, args);
    if (!result || result instanceof Error) {
      throw new Error('Failed to call on-chain method');
    }
    return result;
  }

  async executeOnChain(
    address: string,
    abiName: string,
    method: string,
    args: any[],
  ): Promise<unknown> {
    try {
      const result: unknown = await this.starkService.execute(address, abiName, method, args);
      if (!result || result instanceof Error) {
        throw new Error('Failed to execute on-chain method');
      }
      return result;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Execution failed: ${error.message}`);
      }
      throw new Error('Execution failed: Unknown error');
    }
  }
}
