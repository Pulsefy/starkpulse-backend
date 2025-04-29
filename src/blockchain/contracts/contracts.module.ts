/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { ContractEntity } from './entities/contract.entity';

import { StarknetContractService } from '../../blockchain/services/starknet-contract.service';
import { ConfigModule } from '../../config/config.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([ContractEntity]),
  ],
  controllers: [ContractsController],
  providers: [ContractsService, StarknetContractService],
  exports: [ContractsService],
})
export class ContractsModule {}
