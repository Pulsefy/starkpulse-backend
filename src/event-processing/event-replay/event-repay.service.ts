import { Injectable } from "@nestjs/common";
import { BlockchainService } from "../../blockchain/blockchain.service";
import { Queue } from "bull";
import { InjectQueue } from "@nestjs/bull";
import { BlockchainEvent } from "../../common/interfaces/BlockchainEvent";
import { InjectRedis } from "@nestjs-modules/ioredis";
import Redis from "ioredis";

@Injectable()
export class EventReplayService {
  constructor(
    private blockchainService: BlockchainService,
    @InjectQueue('event-queue') private eventQueue: Queue,
    @InjectRedis() private readonly redis: Redis,

  ) {}



async replayEvents(fromBlock: number, toBlock?: number) {
    const events = await this.blockchainService.getEvents(fromBlock, toBlock);
    
    // Deduplication (await since it's async)
    const uniqueEvents = await this.deduplicateEvents(events);
    
    // Batch processing (100 events at a time)
    const batchSize = 100;
    for (let i = 0; i < uniqueEvents.length; i += batchSize) {
        const batch = uniqueEvents.slice(i, i + batchSize);
        await this.eventQueue.addBulk(
            batch.map(event => ({ data: event }))
        );
    }
}



private async deduplicateEvents(events: BlockchainEvent[]): Promise<BlockchainEvent[]> {
    const uniqueEvents: BlockchainEvent[] = [];
    const pipeline = this.redis.pipeline();
    const dedupWindowMs = 24 * 60 * 60 * 1000; // 24 hour deduplication window
    
    // Process events in parallel but with controlled concurrency
    const batchSize = 100; // Process 100 events at a time
    for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        
        await Promise.all(
            batch.map(async event => {
                const key = `event:${event.transactionHash}:${event.logIndex}`;
                
                // Use Redis SET with NX flag for atomic check-and-set
                const setResult = await this.redis.set(
                    key, 
                    '1', 
                    'PX', 
                    dedupWindowMs,
                    'NX' // Only set if not exists
                );
                
                if (setResult === 'OK') {
                    uniqueEvents.push(event);
                }
            })
        );
    }
    
    if (pipeline.length > 0) {
        await pipeline.exec();
    }
    
    return uniqueEvents; 
}

}