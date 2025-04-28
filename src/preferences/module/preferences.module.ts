import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PreferencesController } from '../controller/preferences.controller';
import { PreferencesService } from '../services/preferences.service';
import { Preferences } from '../entities/preferences.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Preferences])],
  controllers: [PreferencesController],
  providers: [PreferencesService],
  exports: [PreferencesService],
})
export class PreferencesModule {}
