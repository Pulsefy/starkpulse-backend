import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

interface LineageRecord {
  id: string;
  data: any;
  stage: string;
  timestamp: Date;
}

@Injectable()
export class DataLineageService {
  private lineage: LineageRecord[] = [];

  // Track and visualize data lineage
  async trackLineage(record: any, stage: string): Promise<void> {
    const id = record.id || uuidv4();
    this.lineage.push({
      id,
      data: record,
      stage,
      timestamp: new Date(),
    });
  }

  async getLineage(recordId: string): Promise<LineageRecord[]> {
    return this.lineage.filter((r) => r.id === recordId);
  }
}
