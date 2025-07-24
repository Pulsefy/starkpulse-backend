import { WorkflowRunner } from './workflow-runner';
import { AnalysisWorkflow } from './workflow.interface';

jest.mock('../indicators', () => ({
  IndicatorRegistry: {
    get: (name: string) => ({ calculate: (data: number[]) => data.map((x) => x + 1) }),
  },
}));
jest.mock('../patterns', () => ({
  PatternRegistry: {
    get: (name: string) => ({ detect: (data: number[]) => true }),
  },
}));

const workflow: AnalysisWorkflow = {
  name: 'Test Workflow',
  steps: [
    { type: 'indicator', name: 'SMA', input: 'price', output: 'sma' },
    { type: 'pattern', name: 'HeadAndShoulders', input: 'sma', output: 'patternDetected' },
  ],
};

describe('WorkflowRunner', () => {
  it('runs a workflow and returns context', () => {
    const context = WorkflowRunner.run(workflow, { price: [1, 2, 3] });
    expect(context.sma).toEqual([2, 3, 4]);
    expect(context.patternDetected).toBe(true);
  });
}); 