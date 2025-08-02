import { Body, Controller, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Transaction Webhooks')
@ApiBearerAuth()
@Controller('webhook/transactions')
export class TransactionWebhookController {
  constructor(private readonly notificationService: NotificationsService) {}

  @Post('status')
  @ApiOperation({
    summary: 'Handle transaction status update',
    description: 'Receives and processes a transaction status update webhook.',
  })
  @ApiBody({
    description: 'Transaction status payload',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'number', example: 42 },
        txHash: { type: 'string', example: '0xabc...' },
        status: { type: 'string', example: 'confirmed' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Status processed',
    schema: { example: { success: true } },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async handleTxStatus(@Body() body: any) {
    // body should contain userId and transaction status
    const { userId, txHash, status } = body;

    await this.notificationService.dispatch(userId, {
      title: 'Transaction Status Changed',
      message: `Your transaction ${txHash} is now ${status}`,
      metadata: body,
    });

    return { success: true };
  }
}
