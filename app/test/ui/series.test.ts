import { describe, expect, it } from 'vitest';
import type { BandSeries, Climate } from '../../src/data/types';
import {
  attributionOf,
  attributionRows,
  causesAt,
  causesBySize,
  causesIn,
  changeOf,
  ensoMarks,
  type Attribution,
  gapAt,
  inRange,
  shiftedBy,
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

  it('stacks one gas without the causes that do not emit it, and its levers on those that do', () => {
    const methane: Attribution = { agriculture: band([0.2, 0.25]), other: band([0.1, 0.1]) };
    expect(causesIn(methane)).toEqual(['agriculture', 'other']);
    const rows = attributionRows(methane, { years: [2001], byCause: { agriculture: [0.05] } });
    expect(rows[1]).toMatchObject({ year: 2001, agriculture: 0.2, other: 0.1, fossilIndustry: 0 });
    expect(causesAt(methane, 2000)?.total).toBeCloseTo(0.3);
  });

  it("reads a gas's attribution, or every cause's for all gases and for a build without the split", () => {
    const climate = {
      attribution: { ssp245: attribution },
      attributionByGas: {
        ssp245: { co2: { landUse: band([1, 1]) }, ch4: older, n2o: older },
      },
    } as unknown as Climate;
    expect(attributionOf(climate, 'ssp245', 'co2')).toEqual({ landUse: band([1, 1]) });
    expect(attributionOf(climate, 'ssp245', 'all')).toBe(attribution);
    const before = { ...climate, attributionByGas: undefined };
    expect(attributionOf(before as Climate, 'ssp245', 'ch4')).toBe(attribution);
  });

  it('measures the gap between two series in a year', () => {
    expect(gapAt([2049, 2050], [1, 2], [1, 1.9], 2050)).toBeCloseTo(-0.1);
    expect(gapAt([2049], [1], [1], 2050)).toBeNull();
  });
});

describe('the baseline’s change by cause', () => {
  const change = { years: [2001, 2002], byCause: { fossilIndustry: [-0.2, -0.3] } };

  it('moves a cause’s band by the change in its year, and leaves the others', () => {
    const shifted = shiftedBy(attribution, change);
    expect(shifted.fossilIndustry?.median).toEqual([0.8, 0.7]);
    expect(shifted.fossilIndustry?.p95).toEqual([0.8, 0.7]);
    expect(shifted.agriculture).toBe(attribution.agriculture);
  });

  it('leaves the attribution as it is without a change', () => {
    expect(shiftedBy(attribution, null)).toBe(attribution);
  });

  it('reads every cause’s change, or one gas’s', () => {
    const temperature = {
      years: [2001],
      baselineChange: {
        byCause: { fossilIndustry: [-0.2] },
        byGas: { ch4: { agriculture: [-0.1] } },
      },
    };
    expect(changeOf(temperature, 'all')?.byCause).toEqual({ fossilIndustry: [-0.2] });
    expect(changeOf(temperature, 'ch4')?.byCause).toEqual({ agriculture: [-0.1] });
    expect(changeOf(temperature, 'n2o')?.byCause).toEqual({});
    expect(changeOf({ years: [2001] }, 'all')).toBeNull();
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
