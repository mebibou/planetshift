import { describe, expect, it } from 'vitest';
import { data } from '../../../test/levers';
import { CURRENT_YEAR } from '../../../test/model/fixtures';
import { DEPARTURES } from '../../config';
import { DEFAULT_OPTIONS, type ScenarioResult } from '../../model/api';
import { runScenario } from '../../model/run';
import { BASE_SCENARIO } from '../../model/scenarios';
import { shippingForcing } from './model';

const withStep = (step: 'on' | 'off', levers = {}) =>
  runScenario(
    { ...data, departures: { ...DEPARTURES, shippingSulphur2020: step } },
    { ...BASE_SCENARIO, levers },
    DEFAULT_OPTIONS,
    CURRENT_YEAR,
  );
const at = (r: ScenarioResult, year: number, band: 'median' | 'p05' | 'p95' = 'median') =>
  r.temperature.baseline[band][year - r.temperature.years[0]!] as number;

describe('the 2020 shipping sulphur rule', () => {
  it('holds the forcing from 2020, its range in each band’s direction', () => {
    const s = data.climate.shippingSulphur2020!;
    const median = shippingForcing(s, 'ssp245', 'median', 2030);
    expect(median).toHaveLength(11);
    expect(median[0]).toBeCloseTo(0.12);
    expect(shippingForcing(s, 'ssp245', 'p05', 2030)[0]).toBeCloseTo(0.08);
    expect(shippingForcing(s, 'ssp245', 'p95', 2030)[0]).toBeCloseTo(0.14);
  });

  it('warms the baseline from 2020 only, and leaves what the levers avoid', () => {
    const on = withStep('on');
    const off = withStep('off');
    expect(at(on, 2019)).toBe(at(off, 2019));
    expect(at(on, 2025)).toBeGreaterThan(at(off, 2025) + 0.01);
    expect(at(on, 2025, 'p95') - at(off, 2025, 'p95')).toBeGreaterThan(
      at(on, 2025, 'p05') - at(off, 2025, 'p05'),
    );
    const levers = { electricCars: 1, renewableElectricity: 1 };
    expect(withStep('on', levers).temperature.avoided).toEqual(
      withStep('off', levers).temperature.avoided,
    );
  });
});
