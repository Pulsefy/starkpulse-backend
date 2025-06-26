import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class CacheWarmupService {
  constructor(private readonly httpService: HttpService) {}

  @Cron('0 0 9 * * 1-5') // Weekdays at 9 AM
  async warmupMarketData() {
    try {
      // Warmup market data endpoints
      const endpoints = [
        '/api/market-data/prices',
        '/api/market-data/trending',
        '/api/market-data/volume',
      ];

      for (const endpoint of endpoints) {
        await this.httpService
          .get(`http://localhost:3000${endpoint}`)
          .toPromise();
      }
    } catch (error) {
      console.error('Market data warmup failed:', error);
    }
  }

  async warmupUserData() {
    try {
      // Warmup frequently accessed user data
      await this.httpService
        .get('http://localhost:3000/api/users/active')
        .toPromise();
    } catch (error) {
      console.error('User data warmup failed:', error);
    }
  }
}
