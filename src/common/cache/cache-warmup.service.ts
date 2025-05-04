import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CacheWarmupService {
  constructor(private readonly httpService: HttpService) {}

  // Warm news cache before peak hours (9 AM)
  @Cron('0 0 9 * * 1-5') // Weekdays at 9 AM
  async warmNewsCache() {
    try {
      await firstValueFrom(
        this.httpService.get('http://localhost:3000/api/news'),
      );
      console.log('News cache warmed successfully');
    } catch (error) {
      console.error('Error warming news cache:', error);
    }
  }

  // Warm market cache before trading hours (8:30 AM)
  @Cron('0 30 8 * * 1-5') // Weekdays at 8:30 AM
  async warmMarketCache() {
    try {
      await firstValueFrom(
        this.httpService.get('http://localhost:3000/api/market/summary'),
      );
      console.log('Market cache warmed successfully');
    } catch (error) {
      console.error('Error warming market cache:', error);
    }
  }
}
