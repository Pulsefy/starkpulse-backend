import { HeadAndShouldersPattern } from './head-and-shoulders.pattern';

describe('HeadAndShouldersPattern', () => {
  const pattern = new HeadAndShouldersPattern();

  it('returns false for placeholder logic', () => {
    const data = [1, 2, 3, 2, 1];
    expect(pattern.detect(data)).toBe(false);
  });
}); 