export { ReportGenerator } from './reporting.interface';
export { ReportingRegistry } from './reporting-registry';
// Import all report generators to ensure registration
import './pdf-report.generator';
import './html-report.generator';
// TODO: Import more generators here 