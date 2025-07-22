import { Module } from '@nestjs/common';
import { ZKSecurityService } from './zk-security.service';
import { ZKModule } from '../zk/zk.module';

@Module({
  imports: [ZKModule],
  providers: [ZKSecurityService],
  exports: [ZKSecurityService],
})
export class ZKSecurityModule {}
