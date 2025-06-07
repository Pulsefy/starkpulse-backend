import { BlockchainError, BlockchainErrorCode } from './blockchain-error';

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Number of consecutive failures to open the circuit
  cooldownPeriodMs?: number; // Time to wait before allowing attempts again
  successThreshold?: number; // Number of successful calls to close the circuit
}

export class CircuitBreaker {
  private failureCount = 0;
  private successCount = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private nextAttempt = 0;

  constructor(private options: CircuitBreakerOptions = {}) {
    this.options.failureThreshold = this.options.failureThreshold ?? 5;
    this.options.cooldownPeriodMs = this.options.cooldownPeriodMs ?? 10000;
    this.options.successThreshold = this.options.successThreshold ?? 2;
  }

  public async exec<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() > this.nextAttempt) {
        this.state = 'HALF_OPEN';
      } else {
        throw new BlockchainError(
          BlockchainErrorCode.CIRCUIT_BREAKER_OPEN,
          'Circuit breaker is open. Try again later.'
        );
      }
    }
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= (this.options.successThreshold || 2)) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure() {
    this.failureCount++;
    if (this.failureCount >= (this.options.failureThreshold || 5)) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + (this.options.cooldownPeriodMs || 10000);
    }
  }
}
