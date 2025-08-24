import { BlockchainErrorCode } from './blockchain-error-codes.enum';

export { BlockchainErrorCode };

export interface BlockchainErrorContext {
  [key: string]: any;
}

export class BlockchainError extends Error {
  public readonly code: BlockchainErrorCode;
  public readonly context?: BlockchainErrorContext;

  constructor(code: BlockchainErrorCode, message: string, context?: BlockchainErrorContext) {
    super(message);
    this.name = 'BlockchainError';
    this.code = code;
    this.context = context;
    Error.captureStackTrace(this, this.constructor);
  }
}
