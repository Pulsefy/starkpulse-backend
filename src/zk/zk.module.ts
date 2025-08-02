import { Module } from '@nestjs/common';
import { ZKService } from './zk.service';

@Module({
  providers: [ZKService],
  exports: [ZKService],
})
export class ZKModule {}
