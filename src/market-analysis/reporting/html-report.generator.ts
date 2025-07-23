import { ReportGenerator } from './reporting.interface';
import { ReportingRegistry } from './reporting-registry';

export class HTMLReportGenerator implements ReportGenerator {
  name = 'HTML';
  async generate(data: any, options?: Record<string, any>): Promise<string> {
    // TODO: Use a real HTML template engine
    return `<html><body><h1>Market Analysis Report</h1><pre>${JSON.stringify(data, null, 2)}</pre></body></html>`;
  }
}

ReportingRegistry.register(new HTMLReportGenerator()); 