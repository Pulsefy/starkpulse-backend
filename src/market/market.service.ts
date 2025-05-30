// src/market/market.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MarketGateway } from './market.gateway';

@Injectable()
export class MarketService {
  private readonly logger = new Logger('MarketService');
  private messageBuffer: any[] = [];
  private batchInterval = 1000;

  constructor(
    private readonly gateway: MarketGateway,
    private readonly jwtService: JwtService,
  ) {
    this.startBatching();
  }

  /**
   * Verifies the JWT token and returns the decoded payload
   */
  verifyToken(token: string): any {
    try {
      return this.jwtService.verify(token);
    } catch (err) {
      this.logger.warn('Invalid token verification attempt');
      throw err;
    }
  }

  /**
   * Simulates real-time data stream by invoking the callback with random price data
   */
  simulateDataStream(callback: (data: any) => void) {
    setInterval(() => {
      const data = {
        timestamp: new Date(),
        price: +(Math.random() * 1000).toFixed(2),
      };
      callback(data);
    }, 2000); // Every 2 seconds
  }

  /**
   * Queues market updates for batching
   */
  queueMarketUpdate(update: any) {
    this.messageBuffer.push(update);
  }

  /**
   * Batches and broadcasts queued messages every `batchInterval` ms
   */
  private startBatching() {
    setInterval(() => {
      if (this.messageBuffer.length === 0) return;

      const batched = [...this.messageBuffer];
      this.messageBuffer = [];

      this.logger.log(`Broadcasting ${batched.length} batched updates`);
      this.gateway.broadcastMarketUpdate(batched);
    }, this.batchInterval);
  }
}
