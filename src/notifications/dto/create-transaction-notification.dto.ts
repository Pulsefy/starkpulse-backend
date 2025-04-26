export class CreateTransactionNotificationDto {
  userId: string;
  transactionId: string;
  title: string;
  message: string;
  metadata?: any;
  eventType: 'status_change' | 'error' | 'confirmation' | 'other';
}
