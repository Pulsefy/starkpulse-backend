import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../../auth/entities/user.entity';
import { PrivacyRequest } from '../entities/privacy-request.entity';

@Injectable()
export class PrivacyService {
  private readonly logger = new Logger(PrivacyService.name);

  constructor(
    @InjectRepository(PrivacyRequest)
    private readonly privacyRequestRepository: Repository<PrivacyRequest>,
  ) {}

  async createDataAccessRequest(user: User): Promise<PrivacyRequest> {
    const request = this.privacyRequestRepository.create({
      user,
      type: 'ACCESS',
      status: 'PENDING',
    });
    return this.privacyRequestRepository.save(request);
  }

  async createDataDeletionRequest(user: User): Promise<PrivacyRequest> {
    const request = this.privacyRequestRepository.create({
      user,
      type: 'DELETION',
      status: 'PENDING',
    });
    return this.privacyRequestRepository.save(request);
  }

  async createDataRectificationRequest(
    user: User,
    data: Record<string, any>,
  ): Promise<PrivacyRequest> {
    const request = this.privacyRequestRepository.create({
      user,
      type: 'RECTIFICATION',
      status: 'PENDING',
      details: data,
    });
    return this.privacyRequestRepository.save(request);
  }

  async createDataPortabilityRequest(user: User): Promise<PrivacyRequest> {
    const request = this.privacyRequestRepository.create({
      user,
      type: 'PORTABILITY',
      status: 'PENDING',
    });
    return this.privacyRequestRepository.save(request);
  }

  async getRequestStatus(requestId: string): Promise<string> {
    const request = await this.privacyRequestRepository.findOne({
      where: { id: requestId },
    });
    return request?.status || 'NOT_FOUND';
  }

  async getUserRequests(userId: string): Promise<PrivacyRequest[]> {
    return this.privacyRequestRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
