import { describe, expect, it } from 'vitest';
import { netFreedHa } from '../../model/land';
import { data, run } from '../../../test/levers';
import { countryRate, fullUptake, regrowthPaths } from './model';

describe('regrowth rates', () => {
  it('gives a country missing from the table the median of the table, not zero', () => {
    expect(countryRate(data.land, 'XXX', 'median')).toBe(4);
    expect(countryRate(data.land, 'XXX', 'p05')).toBe(1.5);
    expect(countryRate(data.land, 'BRA', 'median')).toBe(6);
  });
});

describe('net uptake of freed and newly used land', () => {
  it('charges a country that gains land the uptake it forgoes', () => {
    expect(fullUptake([{ iso3: 'BRA', ha: -100 }], data.land, 'median')).toBe(-600_000);
    expect(
      fullUptake(
        [
          { iso3: 'FRA', ha: 100 },
          { iso3: 'BRA', ha: -100 },
        ],
        data.land,
        'median',
      ),
    ).toBe(350_000 - 600_000);
  });

  it('nets the cropland a country gains against the pasture it frees', () => {
    expect(netFreedHa({ cropland: 30, pasture: -100 })).toBe(70);
    expect(netFreedHa({ cropland: 130, pasture: -100 })).toBe(-30);
    expect(
      fullUptake(
        [{ iso3: 'FRA', ha: netFreedHa({ cropland: 30, pasture: -100 }) }],
        data.land,
        'median',
      ),
    ).toBe(70 * 3.5 * 1000);
  });

  it('counts nothing with regrowth off', () => {
    const years = [2030, 2040];
    const paths = regrowthPaths(false, [{ iso3: 'BRA', ha: -100 }], data.land, years, () => 1);
    expect(paths).toEqual({ median: [0, 0], p05: [0, 0], p95: [0, 0] });
  });

  it('charges the land a swap newly uses only with regrowth on', () => {
    const swap = { groupShifts: { seafood: 0.5 }, replacement: 'legumes' as const };
    const none = run(swap, { regrowth: 'none' });
    const natural = run(swap, { regrowth: 'natural' });
    const gained = natural.countries.filter(
      (c) => c.landChange.cropland + c.landChange.pasture > 0,
    );
    expect(gained.length).toBeGreaterThan(0);
    expect(none.summary.regrowthCo2).toEqual({ median: 0, p05: 0, p95: 0 });
    const expected = fullUptake(
      natural.countries.map((c) => ({ iso3: c.iso3, ha: netFreedHa(c.landChange) })),
      data.land,
      'median',
    );
    expect(natural.summary.regrowthCo2.median).toBeCloseTo(expected, 0);
    expect(natural.summary.regrowthCo2.median).toBeLessThan(
      fullUptake(
        natural.countries.map((c) => ({ iso3: c.iso3, ha: Math.max(0, netFreedHa(c.landChange)) })),
        data.land,
        'median',
      ),
    );
  });
});
