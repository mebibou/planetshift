import { describe, expect, it } from 'vitest';
import { peoplePoints, withAxis } from '../../src/chart/populationArea';
import type { WorldPopulation } from '../../src/levers/population/model';

const population = {
  variant: 'low',
  history: { years: [2020, 2025], values: [7.8e9, 8.2e9] },
  variants: {
    low: { years: [2050], values: [8.9e9] },
    medium: { years: [2050], values: [9.7e9] },
    high: { years: [2050], values: [10.5e9] },
  },
} as unknown as WorldPopulation;
const margin = { top: 0, right: 16, bottom: 0, left: 0 };

describe('the population area', () => {
  it('gives billions in the range, the projection in use, or the people-on-Earth path', () => {
    expect(peoplePoints(population, 2025, 2100)).toEqual([
      { year: 2025, value: 8.2 },
      { year: 2050, value: 8.9 },
    ]);
    const people = { ...population, people: { years: [2050], values: [4e9] } };
    expect(peoplePoints(people, 2025, 2100).at(-1)).toEqual({ year: 2050, value: 4 });
    expect(peoplePoints(null, 2025, 2100)).toEqual([]);
  });

  it('makes room for the right axis only when there is an area, more past the policies band', () => {
    const points = peoplePoints(population, 2025, 2100);
    expect(withAxis(margin, [], true)).toBe(margin);
    expect(withAxis(margin, points, true).right).toBeGreaterThan(
      withAxis(margin, points, false).right,
    );
  });
});
