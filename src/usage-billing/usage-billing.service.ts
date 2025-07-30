import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UsageBilling } from './usageBilling.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UsageBillingService {
  constructor(
    @InjectRepository(UsageBilling)
    private readonly billingRepo: Repository<UsageBilling>,
  ) {}

  async calculateMonthlyBill(userId: number, requestCount: number) {
    const rate = 0.01; // e.g. 1 cent per request
    const amount = requestCount * rate;
    const record = this.billingRepo.create({ user: userId, requestCount, amount, period: '2025-07' });
    await this.billingRepo.save(record);
  }
}
