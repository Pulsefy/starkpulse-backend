import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { BlockchainController } from './blockchain.controller';
import { StarknetService } from './services/starknet.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Blockchain } from './entities/blockchain.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Blockchain])],
  controllers: [BlockchainController],
  providers: [BlockchainService, StarknetService],
  exports: [StarknetService],
})
export class BlockchainModule {}
