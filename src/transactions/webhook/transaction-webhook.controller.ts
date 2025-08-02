import { Controller, Post, Body, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { TransactionWebhookService } from './transaction-webhook.service';
import { TransactionEventDto } from './dto/transaction-event.dto';

@ApiTags('Transaction Webhooks')
@ApiBearerAuth()
@Controller('webhooks/transactions')
export class TransactionWebhookController {
  private readonly logger = new Logger(TransactionWebhookController.name);

  constructor(private readonly webhookService: TransactionWebhookService) {}

  @Post('transaction-event')
  @ApiOperation({
    summary: 'Handle transaction events',
    description:
      'Processes incoming transaction events from external services.',
  })
  @ApiBody({
    description: 'Transaction event payload',
    type: TransactionEventDto,
    schema: {
      example: { userId: 42, txHash: '0xabc...', status: 'confirmed' },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Event processed',
    example: { success: true },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async handleTransactionEvent(@Body() eventData: TransactionEventDto) {
    this.logger.log(`Received transaction event: ${JSON.stringify(eventData)}`);
    return this.webhookService.processTransactionEvent(eventData);
  }
}
