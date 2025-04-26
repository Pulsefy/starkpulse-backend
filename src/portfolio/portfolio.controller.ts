/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Get,
  Post,
  // Body,
  // Patch,
  // Param,
  // Delete,
  Query,
  Request,
} from '@nestjs/common';

// import { CreatePortfolioDto } from './dto/create-portfolio.dto';
// import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PortfolioQueryDto } from './dto/portfolio-query.dto';
import { PortfolioService } from './services/portfolio.service';

@ApiTags('portfolio')
@Controller('api/portfolio')
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  // @Post()
  // create(@Body() createPortfolioDto: CreatePortfolioDto) {
  //   return this.portfolioService.create(createPortfolioDto);
  // }

  // @Get()
  // findAll() {
  //   return this.portfolioService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.portfolioService.findOne(+id);
  // }

  // @Patch(':id')
  // update(
  //   @Param('id') id: string,
  //   @Body() updatePortfolioDto: UpdatePortfolioDto,
  // ) {
  //   return this.portfolioService.update(+id, updatePortfolioDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.portfolioService.remove(+id);
  // }

  @Get()
  @ApiOperation({ summary: 'Get user portfolio assets' })
  @ApiResponse({ status: 200, description: 'Returns the user portfolio' })
  async getUserPortfolio(@Request() req, @Query() query: PortfolioQueryDto) {
    const userId = req.user.id;
    return this.portfolioService.getUserPortfolio(userId, query);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Manually trigger portfolio sync' })
  @ApiResponse({
    status: 200,
    description: 'Portfolio synchronization started',
  })
  async syncPortfolio(@Request() req) {
    const userId = req.user.id;
    const walletAddress = req.user.walletAddress;

    await this.portfolioService.syncUserPortfolio(userId, walletAddress);
    return { message: 'Portfolio synchronization completed' };
  }

  @Get('history')
  @ApiOperation({ summary: 'Get portfolio value history' })
  @ApiResponse({ status: 200, description: 'Returns portfolio value history' })
  async getPortfolioHistory(@Request() req, @Query('days') days: number) {
    const userId = req.user.id;
    return this.portfolioService.getPortfolioHistory(userId, days);
  }
}
