import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { kafka } from '../kafka.config';
import { StreamProcessingService } from './stream-processing.service';

@Injectable()
export class KafkaStreamService implements OnModuleInit {
  private readonly logger = new Logger(KafkaStreamService.name);
  private consumer = kafka.consumer({ groupId: 'data-pipeline-group' });

  constructor(private readonly streamProcessing: StreamProcessingService) {}

  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'blockchain-data', fromBeginning: true });
    this.logger.log('Kafka consumer connected and subscribed to blockchain-data');
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        this.logger.debug(`Received message: ${message.value?.toString()}`);
        if (message.value) {
          try {
            const parsed = JSON.parse(message.value.toString());
            await this.streamProcessing.processStream(parsed);
          } catch (err) {
            this.logger.error('Failed to process stream message', err);
          }
        }
      },
    });
  }
}
