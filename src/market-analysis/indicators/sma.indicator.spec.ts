import { SMAIndicator } from './sma.indicator';

describe('SMAIndicator', () => {
  const indicator = new SMAIndicator();

  it('calculates SMA correctly', () => {
    const data = [1, 2, 3, 4, 5, 6, 7];
    const result = indicator.calculate(data, { period: 3 });
    expect(result).toEqual([2, 3, 4, 5, 6]);
  });

  it('returns empty array if period is too large', () => {
    const data = [1, 2];
    const result = indicator.calculate(data, { period: 3 });
    expect(result).toEqual([]);
  });
}); 