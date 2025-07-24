import { Injectable } from '@nestjs/common';
import { WorkflowRunner, AnalysisWorkflow } from './workflows';
import { MarketDataService } from '../market-data/market-data.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MarketAnalysisService {
  constructor(
    private readonly marketDataService: MarketDataService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Fetch real-time market data and run a workflow
  async runWorkflowWithMarketData(workflow: AnalysisWorkflow, symbol: string): Promise<any> {
    const allData = await this.marketDataService.getAllData();
    const symbolData = allData.filter((d) => d.symbol === symbol);
    const prices = symbolData.map((d) => d.priceUsd);
    const context = { price: prices };
    return WorkflowRunner.run(workflow, context);
  }

  // Send an analysis-based notification
  async sendAnalysisNotification(userId: string, title: string, content: string): Promise<void> {
    await this.notificationsService.send({
      userId,
      title,
      content,
      channel: 'in_app',
      type: 'ANALYSIS',
    });
  }
  // Placeholder for analysis logic
} 