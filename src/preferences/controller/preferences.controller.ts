import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { PreferencesService } from '../services/preferences.service';
import { CreatePreferencesDto } from '../dto/create-preferences.dto';
import { UpdatePreferencesDto } from '../dto/update-preferences.dto';

@ApiTags('Preferences')
@ApiBearerAuth()
@Controller('preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Post(':userId')
  @ApiOperation({ summary: 'Create user preferences', description: 'Creates preferences for a specific user.' })
  @ApiParam({ name: 'userId', description: 'User ID (number)' })
  @ApiBody({ description: 'Preferences creation payload', type: CreatePreferencesDto, example: { theme: 'dark', notifications: true } })
  @ApiResponse({ status: 201, description: 'Preferences created', example: { id: 1, userId: 42, theme: 'dark', notifications: true } })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  create(@Param('userId') userId: number, @Body() dto: CreatePreferencesDto) {
    return this.preferencesService.create(userId, dto);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get user preferences', description: 'Returns preferences for a specific user.' })
  @ApiParam({ name: 'userId', description: 'User ID (number)' })
  @ApiResponse({ status: 200, description: 'User preferences', example: { id: 1, userId: 42, theme: 'dark', notifications: true } })
  @ApiResponse({ status: 404, description: 'Preferences not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findByUserId(@Param('userId') userId: number) {
    return this.preferencesService.findByUserId(userId);
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'Update user preferences', description: 'Updates preferences for a specific user.' })
  @ApiParam({ name: 'userId', description: 'User ID (number)' })
  @ApiBody({ description: 'Preferences update payload', type: UpdatePreferencesDto, example: { theme: 'light', notifications: false } })
  @ApiResponse({ status: 200, description: 'Preferences updated', example: { id: 1, userId: 42, theme: 'light', notifications: false } })
  @ApiResponse({ status: 404, description: 'Preferences not found' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  update(@Param('userId') userId: number, @Body() dto: UpdatePreferencesDto) {
    return this.preferencesService.update(userId, dto);
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'Delete user preferences', description: 'Deletes preferences for a specific user.' })
  @ApiParam({ name: 'userId', description: 'User ID (number)' })
  @ApiResponse({ status: 200, description: 'Preferences deleted', example: { success: true } })
  @ApiResponse({ status: 404, description: 'Preferences not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  delete(@Param('userId') userId: number) {
    return this.preferencesService.delete(userId);
  }
}
