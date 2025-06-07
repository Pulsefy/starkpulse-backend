import { BlockchainError, BlockchainErrorCode } from './blockchain-error';

export interface RetryOptions {
  retries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    retries = 3,
    initialDelayMs = 200,
    maxDelayMs = 5000,
    factor = 2,
    onRetry,
  } = options;

  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt < retries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (onRetry) onRetry(error, attempt);
      if (attempt >= retries) {
        throw new BlockchainError(
          BlockchainErrorCode.RETRY_EXCEEDED,
          `Operation failed after ${retries} retries: ${error.message}`,
          { lastError: error }
        );
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * factor, maxDelayMs);
    }
  }
  throw new BlockchainError(
    BlockchainErrorCode.UNKNOWN,
    'Unexpected error in retryWithBackoff',
  );
}
