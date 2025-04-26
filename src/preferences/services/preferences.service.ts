import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Preferences } from '../entities/preferences.entity';
import { CreatePreferencesDto } from '../dto/create-preferences.dto';
import { UpdatePreferencesDto } from '../dto/update-preferences.dto';

@Injectable()
export class PreferencesService {
  constructor(
    @InjectRepository(Preferences)
    private readonly preferencesRepo: Repository<Preferences>,
  ) {}

  async create(userId: number, dto: CreatePreferencesDto) {
    const preferences = this.preferencesRepo.create({
      ...dto,
      user: { id: userId.toString() }, 
    });
    return this.preferencesRepo.save(preferences);
  }

  async findByUserId(userId: number) {
    const preferences = await this.preferencesRepo.findOne({
      where: { user: { id: userId.toString() } },
    });
    if (!preferences) throw new NotFoundException('Preferences not found');
    return preferences;
  }

  async update(userId: number, dto: UpdatePreferencesDto) {
    const preferences = await this.findByUserId(userId);
    Object.assign(preferences, dto);
    return this.preferencesRepo.save(preferences);
  }

  async delete(userId: number) {
    const preferences = await this.findByUserId(userId);
    return this.preferencesRepo.remove(preferences);
  }
}
