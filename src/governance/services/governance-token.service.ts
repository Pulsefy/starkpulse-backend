import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GovernanceToken } from '../entities/governance-token.entity';
import { IGovernanceTokenService } from '../interfaces/governance.interface';
import { CreateGovernanceTokenDto, UpdateGovernanceTokenDto } from '../dto/governance-token.dto';

@Injectable()
export class GovernanceTokenService implements IGovernanceTokenService {
  constructor(
    @InjectRepository(GovernanceToken)
    private readonly tokenRepository: Repository<GovernanceToken>,
  ) {}

  async createToken(dto: CreateGovernanceTokenDto): Promise<GovernanceToken> {
    const token = this.tokenRepository.create(dto);
    return await this.tokenRepository.save(token);
  }

  async updateToken(id: string, dto: UpdateGovernanceTokenDto): Promise<GovernanceToken> {
    await this.tokenRepository.update(id, dto);
    return this.getTokenById(id);
  }

  async getTokenById(id: string): Promise<GovernanceToken> {
    return await this.tokenRepository.findOne({ where: { id } });
  }

  async getTokenByUserId(userId: string, tokenType?: string): Promise<GovernanceToken> {
    return await this.tokenRepository.findOne({ where: { userId, tokenType } });
  }

  async getTokenBalance(userId: string, tokenType?: string): Promise<number> {
    const token = await this.getTokenByUserId(userId, tokenType);
    return token ? token.balance : 0;
  }

  async transferTokens(fromUserId: string, toUserId: string, amount: number, tokenType?: string): Promise<boolean> {
    const fromToken = await this.getTokenByUserId(fromUserId, tokenType);
    const toToken = await this.getTokenByUserId(toUserId, tokenType);

    if (fromToken && (fromToken.balance >= amount)) {
      fromToken.balance -= amount;
      toToken.balance += amount;
      await this.tokenRepository.save([fromToken, toToken]);
      return true;
    }
    return false;
  }

  async delegateVotingPower(userId: string, delegateId: string, amount: number): Promise<boolean> {
    const token = await this.getTokenByUserId(userId);
    const delegateToken = await this.getTokenByUserId(delegateId);

    if (token && delegateToken && (token.votingPower >= amount)) {
      token.votingPower -= amount;
      delegateToken.delegatedPower += amount;
      delegateToken.delegatedTo = userId;
      await this.tokenRepository.save([token, delegateToken]);
      return true;
    }
    return false;
  }

  async undelegateVotingPower(userId: string, amount: number): Promise<boolean> {
    const token = await this.getTokenByUserId(userId);

    if (token && token.delegatedPower >= amount) {
      const delegateToken = await this.getTokenByUserId(token.delegatedTo);

      if (delegateToken) {
        token.delegatedPower -= amount;
        delegateToken.votingPower += amount;
        await this.tokenRepository.save([token, delegateToken]);
        return true;
      }
    }
    return false;
  }
}

