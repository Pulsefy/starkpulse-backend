import { Body, Controller, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('webhook/transactions')
export class TransactionWebhookController {
  constructor(private readonly notificationService: NotificationsService) {}

  @Post('status')
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
