import { ReportGenerator } from './reporting.interface';
import { ReportingRegistry } from './reporting-registry';

export class PDFReportGenerator implements ReportGenerator {
  name = 'PDF';
  async generate(data: any, options?: Record<string, any>): Promise<Buffer> {
    // TODO: Use a real PDF library (e.g., pdfkit, puppeteer)
    const content = `PDF Report\nData: ${JSON.stringify(data)}`;
    return Buffer.from(content);
  }
}

ReportingRegistry.register(new PDFReportGenerator()); 