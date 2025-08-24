import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Delegation } from '../entities/delegation.entity';
import { BlockchainService } from '../../blockchain/services/blockchain.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class DelegationService {
  constructor(
    @InjectRepository(Delegation)
    private delegationRepository: Repository<Delegation>,
    private blockchainService: BlockchainService,
    private usersService: UsersService,
  ) {}

  async createDelegation(
    delegatorId: string,
    delegateAddress: string,
    amount: number,
  ) {
    // Get delegator user
    const delegator = await this.usersService.findOne(delegatorId);
    if (!delegator) {
      throw new NotFoundException('Delegator user not found');
    }

    // Get delegate user
    const delegate = await this.usersService.findByWalletAddress(delegateAddress);
    if (!delegate) {
      throw new NotFoundException('Delegate user not found');
    }

    // Check if delegator has enough tokens
    const tokenBalance = await this.blockchainService.getTokenBalance(delegator.walletAddress);
    if (tokenBalance < amount) {
      throw new BadRequestException('Insufficient token balance for delegation');
    }

    // Call blockchain service to delegate voting power
    const transactionHash = await this.blockchainService.delegateVotingPower(
      delegator.walletAddress,
      delegateAddress,
      amount,
    );

    // Create delegation record
    const delegation = this.delegationRepository.create({
      delegator: delegator,
      delegate: delegate,
      amount,
      isActive: true,
      transactionHash,
    });

    return this.delegationRepository.save(delegation);
  }

  async getUserDelegations(userId: string) {
    return this.delegationRepository.find({
      where: { delegator: { id: userId }, isActive: true },
      relations: ['delegate'],
    });
  }

  async getReceivedDelegations(userId: string) {
    return this.delegationRepository.find({
      where: { delegate: { id: userId }, isActive: true },
      relations: ['delegator'],
    });
  }

  async revokeDelegation(delegationId: string, userId: string) {
    const delegation = await this.delegationRepository.findOne({
      where: { id: delegationId, delegator: { id: userId }, isActive: true },
      relations: ['delegator', 'delegate'],
    });

    if (!delegation) {
      throw new NotFoundException('Active delegation not found');
    }

    // Call blockchain service to revoke delegation
    const revocationTransactionHash = await this.blockchainService.delegateVotingPower(
      delegation.delegator.walletAddress,
      delegation.delegate.walletAddress,
      0, // Setting amount to 0 revokes the delegation
    );

    // Update delegation record
    delegation.isActive = false;
    delegation.revocationTransactionHash = revocationTransactionHash;

    return this.delegationRepository.save(delegation);
  }

  async getTotalDelegatedPower(userId: string) {
    const delegations = await this.delegationRepository.find({
      where: { delegator: { id: userId }, isActive: true },
    });

    return delegations.reduce((total, delegation) => total + Number(delegation.amount), 0);
  }

  async getTotalReceivedPower(userId: string) {
    const delegations = await this.delegationRepository.find({
      where: { delegate: { id: userId }, isActive: true },
    });

    return delegations.reduce((total, delegation) => total + Number(delegation.amount), 0);
  }
}