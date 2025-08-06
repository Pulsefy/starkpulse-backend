import { Pattern } from './pattern.interface';
import { PatternRegistry } from './pattern-registry';

export class DoubleTopPattern implements Pattern {
  name = 'DoubleTop';
  detect(data: number[], options?: Record<string, any>): boolean {
    // TODO: Implement actual detection logic
    return false;
  }
}

PatternRegistry.register(new DoubleTopPattern()); 