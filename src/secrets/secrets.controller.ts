import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SecretsService } from './secrets.service';
import { CreateSecretDto } from './dto/create-secret.dto';
import { UpdateSecretDto } from './dto/update-secret.dto';

@Controller('secrets')
export class SecretsController {
  constructor(private readonly secretsService: SecretsService) {}

  @Post()
  create(@Body() createSecretDto: CreateSecretDto) {
    return this.secretsService.create(createSecretDto);
  }

  @Get()
  findAll() {
    return this.secretsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.secretsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSecretDto: UpdateSecretDto) {
    return this.secretsService.update(+id, updateSecretDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.secretsService.remove(+id);
  }
}
