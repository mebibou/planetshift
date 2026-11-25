import { describe, expect, it } from 'vitest';
import { netFreedHa } from '../../model/land';
import { data, run } from '../../../test/levers';
import { albedoForcingPath, countryRate, fullUptake, maturity, regrowthPaths } from './model';

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

  it('gives each country its own uptake, adding up to the world’s, and none with regrowth off', () => {
    const shift = { shift: 0.5 };
    const natural = run(shift, { regrowth: 'natural' });
    const total = natural.countries.reduce((a, c) => a + (c.regrowthCo2 ?? 0), 0);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeCloseTo(natural.summary.regrowthCo2.median, 0);
    expect(
      run(shift, { regrowth: 'none' }).countries.every((c) => c.regrowthCo2 === undefined),
    ).toBe(true);
  });
});

describe('the albedo of freed land growing back', () => {
  const ramp = (y: number) => Math.min(1, Math.max(0, (y - 2030) / 10));
  it('darkens land freed in a year over the regrowth years', () => {
    const step = (y: number) => (y >= 2030 ? 1 : 0);
    expect(maturity(2029, step, 10)).toBe(0);
    expect(maturity(2034, step, 10)).toBeCloseTo(0.5);
    expect(maturity(2039, step, 10)).toBe(1);
  });
  it('takes away the cooling of each freed hectare, and adds it for land newly used', () => {
    const net = [
      { iso3: 'FIN', ha: 100 },
      { iso3: 'BRA', ha: -50 },
    ];
    const perHa = { FIN: -6e-11, BRA: -2e-11 };
    const path = albedoForcingPath(net, perHa, [2020, 2060], ramp, 10);
    expect(path[0]).toBe(0);
    expect(path[1]).toBeCloseTo(100 * 6e-11 - 50 * 2e-11, 20);
  });
  it("warms, in land use's albedo, only when freed land regrows", () => {
    const shift = { shift: 1 };
    const regrowing = run(shift, { regrowth: 'natural' }).temperature.avoidedByCause.landAlbedo;
    const left = run(shift, { regrowth: 'none' }).temperature.avoidedByCause.landAlbedo;
    expect(Math.min(...regrowing)).toBeLessThan(0);
    expect(left.every((v) => v === 0)).toBe(true);
  });
});
