import { Kafka, KafkaConfig } from 'kafkajs';

export const kafkaConfig: KafkaConfig = {
  clientId: 'starkpulse-data-pipeline',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
};

export const kafka = new Kafka(kafkaConfig);
