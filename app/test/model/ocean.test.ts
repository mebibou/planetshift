import { describe, expect, it } from 'vitest';
import type { Climate } from '../../src/data/types';
import { oceanPaths, ph } from '../../src/model/ocean';
import { loadRealData } from './realData';

describe('surface ocean pH', () => {
  // PyCO2SYS 1.8 with the same constants, at 18 °C, salinity 35 and alkalinity 2300 µmol/kg.
  it.each([
    [280, 8.181],
    [420, 8.036],
    [560, 7.929],
    [900, 7.745],
  ])('is %d ppm → %f', (ppm, expected) => {
    expect(ph(ppm)).toBeCloseTo(expected, 3);
  });

  it('falls by about 0.015 for 20 ppm more near 500 ppm', () => {
    expect(ph(490) - ph(510)).toBeCloseTo(0.015, 3);
  });

  it('follows the CO₂ less the emissions avoided, and lower CO₂ gives a higher pH', () => {
    const climate = {
      co2: {
        ssp245: {
          years: [2030, 2031, 2032],
          median: [450, 460, 470],
          p05: [440, 450, 460],
          p95: [460, 470, 480],
        },
      },
      co2PpmPerKg: { median: [1e-13, 1e-13, 1e-13], p05: [], p95: [] },
    } as unknown as Climate;
    const paths = oceanPaths(climate, 'ssp245', [-1e14, -1e14, -1e14], 2030);
    expect(paths?.baseline.median[0]).toBeCloseTo(ph(450), 9);
    expect(paths?.scenario.median[2]).toBeCloseTo(ph(470 - 30), 9);
    expect(paths?.baseline.low[0]).toBeLessThan(paths?.baseline.high[0] as number);
  });

  it('is absent without the CO₂ data', () => {
    expect(oceanPaths({} as Climate, 'ssp245', [0], 2030)).toBeUndefined();
  });
});

const real = loadRealData();

describe.skipIf(real === null)('surface ocean pH on the real data', () => {
  const co2 = (real as NonNullable<typeof real>).climate.co2;
  const at = (ssp: 'ssp126' | 'ssp245' | 'ssp370', a: number, b: number) => {
    const s = co2?.[ssp];
    const ys = s?.years ?? [];
    const v = (s?.median ?? []).filter((_, i) => (ys[i] as number) >= a && (ys[i] as number) <= b);
    return ph(v.reduce((x, y) => x + y, 0) / v.length);
  };

  it('is about 8.07 in 2000, as Jiang et al. (2019) find (8.07 ± 0.02)', () => {
    expect(Math.abs(at('ssp245', 2000, 2000) - 8.07)).toBeLessThan(0.03);
  });

  it('falls by 2080–2099 about as CMIP6 finds (Kwiatkowski et al. 2020)', () => {
    // Change against 1870–1899: −0.16, −0.26 and −0.35 for SSP1-2.6, SSP2-4.5 and SSP3-7.0.
    const fall = (ssp: 'ssp126' | 'ssp245' | 'ssp370') => at(ssp, 2080, 2099) - at(ssp, 1870, 1899);
    expect(fall('ssp126')).toBeCloseTo(-0.16, 1);
    expect(fall('ssp245')).toBeCloseTo(-0.26, 1);
    expect(fall('ssp370')).toBeCloseTo(-0.35, 1);
  });
});
