import { Module } from '@nestjs/common';
import { RpcService } from './provider/rpc.service';

@Module({
  providers: [RpcService]
})
export class RpcModule {}
