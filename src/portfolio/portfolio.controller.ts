/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
} from '@nestjs/common';

// import { CreatePortfolioDto } from './dto/create-portfolio.dto';
// import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PortfolioQueryDto } from './dto/portfolio-query.dto';
import { PortfolioService } from './services/portfolio.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';

@ApiTags('portfolio')
@Controller('api/portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

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

  @Get('analytics/:userId')
  getAnalytics(@Param('userId') userId: string) {
    // return this.portfolioService.getUserAnalytics(userId);
  }
}
