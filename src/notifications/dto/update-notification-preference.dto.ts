export class UpdateNotificationPreferenceDto {
  inApp?: boolean;
  email?: boolean;
  push?: boolean;
  transactionStatusChanges?: boolean;
  transactionErrors?: boolean;
  transactionConfirmations?: boolean;
}
