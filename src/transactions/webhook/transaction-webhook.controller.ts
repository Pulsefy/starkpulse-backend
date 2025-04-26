import { Controller, Post, Body, Logger } from '@nestjs/common';
import { TransactionWebhookService } from './transaction-webhook.service';
import { TransactionEventDto } from './dto/transaction-event.dto';

@Controller('webhooks/transactions')
export class TransactionWebhookController {
  private readonly logger = new Logger(TransactionWebhookController.name);

  constructor(private readonly webhookService: TransactionWebhookService) {}

  @Post('event')
  async handleTransactionEvent(@Body() eventData: TransactionEventDto) {
    this.logger.log(`Received transaction event: ${JSON.stringify(eventData)}`);
    return this.webhookService.processTransactionEvent(eventData);
  }
}
