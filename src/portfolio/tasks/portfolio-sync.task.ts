import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, FindOperator } from 'typeorm';
import { PortfolioService } from '../services/portfolio.service';
import { User } from '../../auth/entities/user.entity';

@Injectable()
export class PortfolioSyncTask {
  private readonly logger = new Logger(PortfolioSyncTask.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private portfolioService: PortfolioService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async syncAllUserPortfolios() {
    this.logger.log('Starting portfolio synchronization for all users');

    const users = await this.userRepository.find({
      where: { walletAddress: Not(null) as unknown as FindOperator<string> },
    });

    for (const user of users) {
      try {
        if (user.walletAddress) {
          await this.portfolioService.syncUserPortfolio(
            user.id,
            user.walletAddress,
          );
        } else {
          this.logger.warn(`User ${user.id} has no wallet address. Skipping.`);
        }
      } catch (error) {
        this.logger.error(
          `Failed to sync portfolio for user ${user.id}`,
          error,
        );
      }
    }

    this.logger.log('Portfolio synchronization completed');
  }
}
