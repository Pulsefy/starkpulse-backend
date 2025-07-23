import { ReportGenerator } from './reporting.interface';

export class ReportingRegistry {
  private static generators: Record<string, ReportGenerator> = {};

  static register(generator: ReportGenerator) {
    this.generators[generator.name] = generator;
  }

  static get(name: string): ReportGenerator | undefined {
    return this.generators[name];
  }

  static list(): string[] {
    return Object.keys(this.generators);
  }
} 