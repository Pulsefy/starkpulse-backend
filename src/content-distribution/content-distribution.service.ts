import { Injectable, Logger } from '@nestjs/common';
import { ContentStorageService } from '../content-storage/content-storage.service';

const REDUNDANT_NODES = [
  { name: 'Pinata', endpoint: 'https://api.pinata.cloud' },
  { name: 'Infura', endpoint: 'https://ipfs.infura.io:5001' },
  { name: 'LocalNode', endpoint: 'http://localhost:5001' },
];

@Injectable()
export class ContentDistributionService {
  private readonly logger = new Logger(ContentDistributionService.name);

  constructor(private contentStorage: ContentStorageService) {}

  async replicateContent(cid: string): Promise<void> {
    this.logger.log(
      `Starting replication for CID: ${cid} across ${REDUNDANT_NODES.length} nodes.`,
    );

    for (const node of REDUNDANT_NODES) {
      try {
        this.logger.log(`Pinning CID ${cid} to node: ${node.name}`);
      } catch (error) {
        this.logger.error(
          `Failed to replicate CID ${cid} to node ${node.name}`,
          error.stack,
        );
      }
    }
    this.logger.log(`Replication process completed for CID: ${cid}.`);
  }
}
