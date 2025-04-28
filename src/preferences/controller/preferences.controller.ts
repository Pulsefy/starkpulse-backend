import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { PreferencesService } from '../services/preferences.service';
import { CreatePreferencesDto } from '../dto/create-preferences.dto';
import { UpdatePreferencesDto } from '../dto/update-preferences.dto';

@Controller('preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Post(':userId')
  create(@Param('userId') userId: number, @Body() dto: CreatePreferencesDto) {
    return this.preferencesService.create(userId, dto);
  }

  @Get(':userId')
  findByUserId(@Param('userId') userId: number) {
    return this.preferencesService.findByUserId(userId);
  }

  @Patch(':userId')
  update(@Param('userId') userId: number, @Body() dto: UpdatePreferencesDto) {
    return this.preferencesService.update(userId, dto);
  }

  @Delete(':userId')
  delete(@Param('userId') userId: number) {
    return this.preferencesService.delete(userId);
  }
}
