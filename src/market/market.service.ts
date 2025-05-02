import { Injectable } from '@nestjs/common';

@Injectable()
export class MarketService {
  getInitialData() {
    return {
      timestamp: new Date(),
      price: Math.random() * 1000,
    };
  }

  simulateDataStream(callback: (data: any) => void) {
    setInterval(() => {
      const data = {
        timestamp: new Date(),
        price: +(Math.random() * 1000).toFixed(2),
      };
      callback(data);
    }, 2000); // Every 2 seconds
  }
}
