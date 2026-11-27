import { describe, expect, it } from 'vitest';
import { data, lever, run, w2100 } from '../../../test/levers';
import { gridAt } from '../energy/model';
import {
  DAC,
  DAC_LEVER,
  dacCo2In,
  embodiedIn,
  kwhPerTonne,
  kwhPerTonneIn,
  netShare,
  storedAt,
} from './model';

const GT = 1e12;
const ctx = { dac: DAC, sectors: data.sectors, ssp: 'ssp245' as const, band: 'median' as const };

describe('the path', () => {
  it('stores the IEA Net Zero capture times the share stored, then 3.3 Gt in 2100', () => {
    expect(storedAt(DAC, 2030) / GT).toBeCloseTo(0.08 * 0.643, 6);
    expect(storedAt(DAC, 2035) / GT).toBeCloseTo(0.203 * 0.643, 6);
    expect(storedAt(DAC, 2050) / GT).toBeCloseTo(0.669, 3);
    expect(storedAt(DAC, 2100) / GT).toBeCloseTo(3.3, 6);
    expect(storedAt(DAC, 2075)).toBeCloseTo((storedAt(DAC, 2050) + storedAt(DAC, 2100)) / 2, -3);
  });

  it('does not follow the shared ramp', () => {
    const at = (rampEnd: number) => lever(DAC_LEVER, 1, { rampEnd }).summary.avoidedWarming2100;
    expect(at(2030)).toEqual(at(2050));
  });
});

describe('the energy', () => {
  it('draws about 1 MWh a tonne, less in the band that avoids the most', () => {
    expect(kwhPerTonne(DAC.energy.median)).toBeCloseTo(500 + 1500 / 2.9, 6);
    expect(kwhPerTonneIn(DAC, 'p95')).toBeLessThan(kwhPerTonneIn(DAC, 'median'));
    expect(kwhPerTonneIn(DAC, 'p05')).toBeGreaterThan(kwhPerTonneIn(DAC, 'median'));
    expect(embodiedIn(DAC, 'median')).toBe(0.05);
  });

  it('emits the grid’s CO₂ for its electricity, none once the grid is clean', () => {
    const stored = storedAt(DAC, 2050);
    const dirty = dacCo2In(ctx, 2050, 1, 0);
    expect(dirty.captured).toBeCloseTo(-stored, -3);
    expect(dirty.electricity).toBeCloseTo(
      (stored / 1000) * kwhPerTonneIn(DAC, 'median') * gridAt(data.sectors, 'ssp245', 2050),
      -3,
    );
    expect(dirty.embodied).toBeCloseTo(0.05 * stored, -3);
    const clean = dacCo2In(ctx, 2050, 1, 1);
    expect(clean.electricity).toBe(0);
    expect(netShare(clean)).toBeCloseTo(0.95, 9);
    expect(netShare(dirty)).toBeLessThan(netShare(clean));
    expect(netShare(dacCo2In(ctx, 2050, 0, 0))).toBe(0);
  });
});

describe('the lever', () => {
  it('avoids warming, counted in its own family', () => {
    const r = lever(DAC_LEVER);
    expect(w2100(r)).toBeGreaterThan(0);
    expect(r.summary.byFamily.avoidedWarming2100.dac).toBeCloseTo(w2100(r), 12);
    expect(r.summary.byFamily.avoidedWarming2100.energy).toBe(0);
    expect(r.summary.avoided.co2).toBeGreaterThan(0);
  });

  it('reports the CO₂ removed in 2050 net of its energy', () => {
    const s = lever(DAC_LEVER).summary.dacCo2;
    expect(s.median).toBeGreaterThan(0);
    expect(s.median).toBeLessThan(0.95 * storedAt(DAC, 2050));
    expect(s.p05).toBeLessThan(s.p95);
  });

  it('removes more on the grid renewable electricity cleans', () => {
    const co2 = (levers: Record<string, number>) => run({ levers }).summary.avoided.co2;
    const both = co2({ [DAC_LEVER]: 1, renewableElectricity: 1 });
    const apart = co2({ [DAC_LEVER]: 1 }) + co2({ renewableElectricity: 1 });
    expect(both).toBeGreaterThan(apart);
  });
});
