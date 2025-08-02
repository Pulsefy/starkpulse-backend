import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consent } from '../entities/consent.entity';
import { User } from '../../auth/entities/user.entity';

@Injectable()
export class ConsentManagementService {
  private readonly logger = new Logger(ConsentManagementService.name);

  constructor(
    @InjectRepository(Consent)
    private readonly consentRepository: Repository<Consent>,
  ) {}

  async giveConsent(
    user: User,
    purpose: string,
    details?: Record<string, any>, // details is ignored, not in entity
  ): Promise<Consent> {
    const consent = this.consentRepository.create({
      userId: user.id,
      consentType: purpose,
      granted: true,
    });
    return this.consentRepository.save(consent);
  }

  async revokeConsent(user: User, consentId: string): Promise<void> {
    await this.consentRepository.update(
      { id: consentId, userId: user.id },
      {
        granted: false,
      },
    );
  }

  async updateConsent(
    user: User,
    consentId: string,
    details: Record<string, any>, // details not in entity, so ignore
  ): Promise<Consent | null> {
    await this.consentRepository.update(
      { id: consentId, userId: user.id },
      {}, // nothing to update, as details is not in entity
    );
    return this.consentRepository.findOne({
      where: { id: consentId, userId: user.id },
    });
  }

  async getUserConsents(user: User): Promise<Consent[]> {
    return this.consentRepository.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });
  }

  async checkConsent(user: User, purpose: string): Promise<boolean> {
    const consent = await this.consentRepository.findOne({
      where: { userId: user.id, consentType: purpose, granted: true },
    });
    return !!consent;
  }

  async getActiveConsents(user: User): Promise<Consent[]> {
    return this.consentRepository.find({
      where: { userId: user.id, granted: true },
    });
  }
}
