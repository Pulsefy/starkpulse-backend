import { Module } from '@nestjs/common';
import { ZKTransactionService } from './zk-transaction.service';
import { ZKModule } from '../zk/zk.module';

@Module({
  imports: [ZKModule],
  providers: [ZKTransactionService],
  exports: [ZKTransactionService],
})
export class ZKTransactionModule {}
