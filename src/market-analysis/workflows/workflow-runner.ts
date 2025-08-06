import { AnalysisWorkflow, AnalysisWorkflowStep } from './workflow.interface';
import { IndicatorRegistry } from '../indicators';
import { PatternRegistry } from '../patterns';
import { SentimentRegistry } from '../sentiment';
import { TrendRegistry } from '../trend';

export class WorkflowRunner {
  static run(workflow: AnalysisWorkflow, data: Record<string, any>): Record<string, any> {
    const context = { ...data };
    for (const step of workflow.steps) {
      switch (step.type) {
        case 'indicator': {
          const indicator = IndicatorRegistry.get(step.name);
          if (indicator) {
            context[step.output] = indicator.calculate(context[step.input], step.options);
          }
          break;
        }
        case 'pattern': {
          const pattern = PatternRegistry.get(step.name);
          if (pattern) {
            context[step.output] = pattern.detect(context[step.input], step.options);
          }
          break;
        }
        case 'sentiment': {
          const sentiment = SentimentRegistry.get(step.name);
          if (sentiment) {
            context[step.output] = sentiment.analyze(context[step.input], step.options);
          }
          break;
        }
        case 'trend': {
          const trend = TrendRegistry.get(step.name);
          if (trend) {
            context[step.output] = trend.calculate(context[step.input], step.options);
          }
          break;
        }
      }
    }
    return context;
  }
} 