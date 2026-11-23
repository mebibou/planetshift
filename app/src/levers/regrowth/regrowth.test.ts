import { describe, expect, it } from 'vitest';
import type { Land } from '../../data/types';
import { fullUptake } from './model';

describe('regrowth rates', () => {
  it('reads the range slow to fast whatever its order, none where a country has no rate', () => {
    const land = { regrowth: { FRA: { median: 3, low: 5, high: 1 } } } as unknown as Land;
    const freed = [
      { iso3: 'FRA', ha: 2 },
      { iso3: 'XXX', ha: 10 },
    ];
    expect(fullUptake(freed, land, 'p05')).toBe(2000);
    expect(fullUptake(freed, land, 'p95')).toBe(10000);
    expect(fullUptake(freed, land, 'median')).toBe(6000);
  });
});
