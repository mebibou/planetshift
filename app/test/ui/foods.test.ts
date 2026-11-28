import { describe, expect, it } from 'vitest';
import { foodRows } from '../../src/chart/foods';
import type { ScenarioResult } from '../../src/model/api';

const years = [2025, 2026, 2027, 2028];
const result = {
  temperature: {
    years,
    avoided: { median: [0, 0.1, 0.2, 0.3], p05: [], p95: [] },
    avoidedByFood: {
      diet: { ruminantMeat: [0, 0.05, 0.1, 0.15], eggs: [0, 0, 0.0001, 0.0001] },
      plantFoods: { rice: [0, 0.01, 0.02, 0.03] },
      waste: { cereals: [0, 0.02, 0.04, 0.06] },
    },
  },
} as unknown as ScenarioResult;

describe('foodRows', () => {
  it('stacks the foods the levers shift that show, and the rest of the total as the other levers', () => {
    const { bands, rows } = foodRows(result, 2026, 2028);
    expect(bands.map((b) => b.key)).toEqual(['diet.ruminantMeat', 'plantFoods.rice']);
    expect(rows.map((r) => r.year)).toEqual([2026, 2027, 2028]);
    expect(rows[2]?.['diet.ruminantMeat']).toBe(0.15);
    expect(rows[2]?.other).toBeCloseTo(0.3 - 0.15 - 0.03, 12);
    expect(rows[2]?.total).toBe(0.3);
  });
  it('has no band when no food shows', () => {
    expect(foodRows(result, 2025, 2025).bands).toEqual([]);
  });
});
