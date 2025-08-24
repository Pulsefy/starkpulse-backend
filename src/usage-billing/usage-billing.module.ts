import { Module } from '@nestjs/common';
import { UsageBillingService } from './usage-billing.service';

@Module({
  providers: [UsageBillingService]
})
export class UsageBillingModule {}
