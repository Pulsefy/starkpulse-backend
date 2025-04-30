import { Injectable } from "@nestjs/common";

// rpc/connection-pool/connection-pool.service.ts
@Injectable()
export class ConnectionPoolService {
  private pool: Map<string, any> = new Map();

  getConnection(id: string): any {
    if (!this.pool.has(id)) {
      const conn = this.createRpcConnection(id);
      this.pool.set(id, conn);
    }
    return this.pool.get(id);
  }

  private createRpcConnection(id: string) {
    // Mock RPC connection
    return { id, status: 'active', timestamp: Date.now() };
  }
}
