import { describe, expect, it } from 'vitest';
import { rateFor } from './model';

describe('regrowth rates', () => {
  it('reads the range slow to fast whatever its order', () => {
    const rate = { median: 3, low: 5, high: 1 };
    expect(rateFor(rate, 'p05')).toBe(1);
    expect(rateFor(rate, 'p95')).toBe(5);
    expect(rateFor(rate, 'median')).toBe(3);
    expect(rateFor(undefined, 'median')).toBe(0);
  });
});
