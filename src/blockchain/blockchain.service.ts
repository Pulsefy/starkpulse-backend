/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { CreateBlockchainDto } from './dto/create-blockchain.dto';
import { UpdateBlockchainDto } from './dto/update-blockchain.dto';
import { ContractService } from './services/contract.service';

@Injectable()
export class BlockchainService {
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

  callContractMethod(
    contractAddress: string,
    abiName: string,
    method: string,
    args: any[],
  ) {
    return this.contractService.callMethod(
      contractAddress,
      abiName,
      method,
      args,
    );
  }

  executeContractMethod(
    contractAddress: string,
    abiName: string,
    method: string,
    args: any[],
  ) {
    return this.contractService.executeMethod(
      contractAddress,
      abiName,
      method,
      args,
    );
  }
}
