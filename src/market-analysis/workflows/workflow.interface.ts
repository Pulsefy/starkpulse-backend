export interface AnalysisWorkflowStep {
  type: 'indicator' | 'pattern' | 'sentiment' | 'trend';
  name: string;
  input: string;
  options?: Record<string, any>;
  output: string;
}

export interface AnalysisWorkflow {
  name: string;
  steps: AnalysisWorkflowStep[];
} 