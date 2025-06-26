import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { PriceService } from './price.service';
import { CreatePriceDto } from './dto/create-price.dto';
import { UpdatePriceDto } from './dto/update-price.dto';

@ApiTags('Price')
@ApiBearerAuth()
@Controller('price')
export class PriceController {
  constructor(private readonly priceService: PriceService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new price entry',
    description: 'Creates a new price record.',
  })
  @ApiBody({
    description: 'Price creation payload',
    type: CreatePriceDto,
    schema: {
      example: {
        symbol: 'ETH',
        value: 3500.25,
        timestamp: '2025-06-03T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Price created',
    example: {
      id: 1,
      symbol: 'ETH',
      value: 3500.25,
      timestamp: '2025-06-03T10:00:00.000Z',
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  create(@Body() createPriceDto: CreatePriceDto) {
    return this.priceService.create(createPriceDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all price entries',
    description: 'Returns all price records.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of prices',
    example: [
      {
        id: 1,
        symbol: 'ETH',
        value: 3500.25,
        timestamp: '2025-06-03T10:00:00.000Z',
      },
    ],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findAll() {
    return this.priceService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get price by ID',
    description: 'Returns a specific price record by its ID.',
  })
  @ApiParam({ name: 'id', description: 'Price record ID' })
  @ApiResponse({
    status: 200,
    description: 'Price record',
    example: {
      id: 1,
      symbol: 'ETH',
      value: 3500.25,
      timestamp: '2025-06-03T10:00:00.000Z',
    },
  })
  @ApiResponse({ status: 404, description: 'Price not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findOne(@Param('id') id: string) {
    return this.priceService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update price by ID',
    description: 'Updates a specific price record.',
  })
  @ApiParam({ name: 'id', description: 'Price record ID' })
  @ApiBody({
    description: 'Price update payload',
    type: UpdatePriceDto,
    schema: {
      example: { value: 3600.75 },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Price updated',
    example: {
      id: 1,
      symbol: 'ETH',
      value: 3600.75,
      timestamp: '2025-06-03T12:00:00.000Z',
    },
  })
  @ApiResponse({ status: 404, description: 'Price not found' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  update(@Param('id') id: string, @Body() updatePriceDto: UpdatePriceDto) {
    return this.priceService.update(+id, updatePriceDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete price by ID',
    description: 'Deletes a specific price record.',
  })
  @ApiParam({ name: 'id', description: 'Price record ID' })
  @ApiResponse({
    status: 200,
    description: 'Price deleted',
    example: { success: true },
  })
  @ApiResponse({ status: 404, description: 'Price not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  remove(@Param('id') id: string) {
    return this.priceService.remove(+id);
  }
}
