import { Controller, Get, Query } from '@nestjs/common';
import { MarketAnalysisService } from './market-analysis.service';
import { IndicatorRegistry } from './indicators';

@Controller('market-analysis')
export class MarketAnalysisController {
  constructor(private readonly marketAnalysisService: MarketAnalysisService) {}

  // Example endpoint: Calculate SMA
  @Get('sma')
  calculateSMA(@Query('data') data: string, @Query('period') period: string) {
    const dataArr = data.split(',').map(Number);
    const periodNum = parseInt(period, 10);
    const indicator = IndicatorRegistry.get('SMA');
    if (!indicator) return { error: 'SMA indicator not found' };
    return { result: indicator.calculate(dataArr, { period: periodNum }) };
  }

  // Example endpoint: Calculate EMA
  @Get('ema')
  calculateEMA(@Query('data') data: string, @Query('period') period: string) {
    const dataArr = data.split(',').map(Number);
    const periodNum = parseInt(period, 10);
    const indicator = IndicatorRegistry.get('EMA');
    if (!indicator) return { error: 'EMA indicator not found' };
    return { result: indicator.calculate(dataArr, { period: periodNum }) };
  }
} 