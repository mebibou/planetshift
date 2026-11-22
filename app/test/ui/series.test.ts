import { describe, expect, it } from 'vitest';
import type { BandSeries } from '../../src/data/types';
import {
  attributionRows,
  causesAt,
  causesBySize,
  causesIn,
  ensoMarks,
  type Attribution,
  gapAt,
  inRange,
  zipBand,
  zipSeries,
} from '../../src/chart/series';

const band = (median: number[]): BandSeries => ({
  years: [2000, 2001],
  median,
  p05: median,
  p95: median,
});
const attribution: Attribution = {
  fossilIndustry: band([0.8, 0.9]),
  agriculture: band([0.3, 0.3]),
  landUse: band([0.1, 0.1]),
  airPollution: band([-0.5, -0.6]),
  natural: band([0.05, -0.1]),
  other: band([0.25, 0.4]),
};
/** A build from before air pollution and the natural factors were split out of other. */
const older: Attribution = {
  fossilIndustry: band([0.8, 0.9]),
  agriculture: band([0.3, 0.3]),
  landUse: band([0.1, 0.1]),
  other: band([-0.2, -0.3]),
};

describe('series', () => {
  it('drops missing values', () => {
    expect(zipSeries([1, 2, 3], [1, null, 3])).toEqual([
      { year: 1, value: 1 },
      { year: 3, value: 3 },
    ]);
    expect(zipBand([1, 2], [0, 1], [2])).toEqual([{ year: 1, lo: 0, hi: 2 }]);
  });

  it('keeps a year range', () => {
    expect(inRange([{ year: 1 }, { year: 5 }, { year: 9 }], 2, 9)).toEqual([
      { year: 5 },
      { year: 9 },
    ]);
  });

  it('builds stack rows by year', () => {
    expect(attributionRows(attribution)[1]).toEqual({
      year: 2001,
      fossilIndustry: 0.9,
      agriculture: 0.3,
      landUse: 0.1,
      airPollution: -0.6,
      natural: -0.1,
      other: 0.4,
    });
    expect(causesIn(older)).toEqual(['fossilIndustry', 'agriculture', 'landUse', 'other']);
    expect(attributionRows(older)[0]?.airPollution).toBe(0);
  });

  it('takes off each lever cause what the levers avoid', () => {
    const rows = attributionRows(attribution, {
      years: [2001],
      byCause: { fossilIndustry: [0.2], agriculture: [0.05], landUse: [0] },
    });
    expect(rows[0]?.fossilIndustry).toBeCloseTo(0.8);
    expect(rows[1]?.fossilIndustry).toBeCloseTo(0.7);
    expect(rows[1]?.agriculture).toBeCloseTo(0.25);
    expect(rows[1]?.other).toBeCloseTo(0.4);
  });

  it('orders the causes by size and adds them up', () => {
    expect(causesBySize(attribution, 2001)).toEqual([
      'fossilIndustry',
      'airPollution',
      'other',
      'agriculture',
      'landUse',
      'natural',
    ]);
    const now = causesAt(attribution, 2000);
    expect(now?.total).toBeCloseTo(1.0);
    expect(now?.byCause.airPollution).toBeCloseTo(-0.5);
    expect(causesAt(attribution, 1990)).toBeNull();
  });

  it('measures the gap between two series in a year', () => {
    expect(gapAt([2049, 2050], [1, 2], [1, 1.9], 2050)).toBeCloseTo(-0.1);
    expect(gapAt([2049], [1], [1], 2050)).toBeNull();
  });
});

describe('El Niño and La Niña marks', () => {
  const enso = {
    years: [2022, 2023, 2024],
    oni: [-0.79, 0.14, 0.96],
    phase: ['laNina', 'neutral', 'elNino'] as const,
    threshold: 0.5,
    source: '',
  };
  const observed = [
    { year: 2021, value: 1.1 },
    { year: 2022, value: 1.15 },
    { year: 2023, value: 1.48 },
    { year: 2024, value: 1.55 },
  ];

  it('marks the observed El Niño and La Niña years, not the neutral ones', () => {
    expect(ensoMarks({ ...enso, phase: [...enso.phase] }, observed)).toEqual([
      { year: 2022, value: 1.15, phase: 'laNina', oni: -0.79 },
      { year: 2024, value: 1.55, phase: 'elNino', oni: 0.96 },
    ]);
  });

  it('marks nothing without the file', () => {
    expect(ensoMarks(undefined, observed)).toEqual([]);
  });
});
