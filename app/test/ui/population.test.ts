import { describe, expect, it } from 'vitest';
import { populationLines, populationNotes } from '../../src/chart/population';
import type { WorldPopulation } from '../../src/levers/population/model';

const series = (from: number, to: number, f: (y: number) => number) => {
  const years = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  return { years, values: years.map(f) };
};
const world = (over: Partial<WorldPopulation> = {}): WorldPopulation => ({
  variant: 'medium',
  ssp: 'ssp245',
  history: series(1850, 2023, (y) => 1e9 + (y - 1850) * 4e7),
  variants: {
    medium: series(2024, 2100, () => 10e9),
    low: series(2024, 2100, () => 7e9),
    high: series(2024, 2100, () => 14e9),
  },
  inconsistent: false,
  applies: true,
  ...over,
});
const t = (key: string, params: Record<string, string | number> = {}) =>
  `${key}${Object.keys(params).length ? JSON.stringify(params) : ''}`;

describe('population chart', () => {
  it('draws the history and each variant from the last estimate, in billions, the chosen last', () => {
    const lines = populationLines(world({ variant: 'low' }), 2000, 2100);
    expect(lines.history[0]).toEqual({ year: 2000, value: 1 + 150 * 0.04 });
    expect(lines.history.at(-1)?.year).toBe(2023);
    expect(lines.variants.map((v) => v.variant)).toEqual(['medium', 'high', 'low']);
    expect(lines.variants.map((v) => v.chosen)).toEqual([false, false, true]);
    const low = lines.variants[2]!.points;
    expect(low[0]).toEqual(lines.history.at(-1));
    expect(low.at(-1)).toEqual({ year: 2100, value: 7 });
  });

  it('keeps to the years shown', () => {
    const lines = populationLines(world(), 1850, 2050);
    expect(lines.history[0]?.year).toBe(1850);
    lines.variants.forEach((v) => expect(v.points.at(-1)?.year).toBe(2050));
  });

  it('notes an inconsistent pairing and a population that changes nothing', () => {
    expect(populationNotes(world(), t)).toEqual([]);
    const [note] = populationNotes(world({ variant: 'low', ssp: 'ssp370', inconsistent: true }), t);
    expect(note).toContain('SSP3-7.0');
    expect(note).toContain('levers.population.chart.larger');
    expect(populationNotes(world({ applies: false }), t)).toEqual([
      'levers.population.chart.notApplied',
    ]);
  });
});
