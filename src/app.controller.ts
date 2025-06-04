import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Root')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Root hello endpoint', description: 'Returns a hello message from the API.' })
  @ApiResponse({ status: 200, description: 'Hello message', example: 'Hello World!' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  getHello(): string {
    return this.appService.getHello();
  }
}
