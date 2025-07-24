export interface ReportGenerator {
  name: string;
  generate(data: any, options?: Record<string, any>): Promise<Buffer | string>;
} 