import { AnalysisWorkflow } from './workflow.interface';

export const exampleWorkflow: AnalysisWorkflow = {
  name: 'SMA and HeadAndShoulders Detection',
  steps: [
    {
      type: 'indicator',
      name: 'SMA',
      input: 'price',
      options: { period: 14 },
      output: 'sma',
    },
    {
      type: 'pattern',
      name: 'HeadAndShoulders',
      input: 'sma',
      output: 'patternDetected',
    },
  ],
}; 