import { MomentumMetric } from './momentum.metric';

describe('MomentumMetric', () => {
  const metric = new MomentumMetric();

  it('returns empty array for placeholder logic', () => {
    expect(metric.calculate([1, 2, 3])).toEqual([]);
  });
}); 