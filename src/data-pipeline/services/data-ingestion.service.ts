import { Injectable } from '@nestjs/common';
import { kafka } from '../kafka.config';

@Injectable()
export class DataIngestionService {
  // Ingest data from blockchain, market, or external sources
  async ingest(source: string, payload: any): Promise<any> {
    // Example: produce to Kafka for stream processing
    const producer = kafka.producer();
    await producer.connect();
    await producer.send({
      topic: 'blockchain-data',
      messages: [
        { value: JSON.stringify({ source, payload, timestamp: new Date() }) },
      ],
    });
    await producer.disconnect();
    return { source, payload };
  }
}
