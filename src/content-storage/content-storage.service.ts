import { Injectable, Logger } from '@nestjs/common';
import { create, IPFSHTTPClient } from 'ipfs-http-client';

@Injectable()
export class ContentStorageService {
  private readonly logger = new Logger(ContentStorageService.name);
  private ipfs: IPFSHTTPClient;

  constructor() {
    const ipfsHost = process.env.IPFS_HOST || 'localhost';
    const ipfsPort = process.env.IPFS_PORT || '5001';
    this.ipfs = create({ host: ipfsHost, port: ipfsPort, protocol: 'http' });
    this.logger.log(`Connected to IPFS node at ${ipfsHost}:${ipfsPort}`);
  }

  async uploadContent(content: Buffer | string): Promise<string> {
    try {
      const { cid } = await this.ipfs.add(content);
      this.logger.log(`Content uploaded to IPFS with CID: ${cid.toString()}`);
      // Pin the content to ensure it's not garbage-collected.
      await this.ipfs.pin.add(cid);
      this.logger.log(`Content pinned with CID: ${cid.toString()}`);
      return cid.toString();
    } catch (error) {
      this.logger.error('Failed to upload content to IPFS', error.stack);
      throw new Error('IPFS upload failed.');
    }
  }

  async getContent(cid: string): Promise<Buffer> {
    try {
      const chunks = [];
      for await (const chunk of this.ipfs.cat(cid)) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      this.logger.error(
        `Failed to retrieve content for CID: ${cid}`,
        error.stack,
      );
      throw new Error('IPFS retrieval failed.');
    }
  }
}
