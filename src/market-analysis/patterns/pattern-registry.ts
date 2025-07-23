import { Pattern } from './pattern.interface';

export class PatternRegistry {
  private static patterns: Record<string, Pattern> = {};

  static register(pattern: Pattern) {
    this.patterns[pattern.name] = pattern;
  }

  static get(name: string): Pattern | undefined {
    return this.patterns[name];
  }

  static list(): string[] {
    return Object.keys(this.patterns);
  }
} 