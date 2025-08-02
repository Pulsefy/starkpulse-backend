export function calculateROI(initial: number, final: number): number {
  if (initial === 0) return 0;
  return ((final - initial) / initial) * 100;
}

export function calculateVolatility(values: number[]): number {
  const mean = values.reduce((sum, val) => sum + val, 0) / (values.length || 1);
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  const variance =
    squaredDiffs.reduce((sum, val) => sum + val, 0) / (values.length || 1);
  return Math.sqrt(variance);
}

export function calculateTimeWeightedReturn(values: number[]): number {
  if (values.length < 2) return 0;

  let twr = 1;
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] === 0) continue;
    twr *= 1 + (values[i] - values[i - 1]) / values[i - 1];
  }

  return (twr - 1) * 100;
}
